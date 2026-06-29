/**
 * SEC EDGAR filings route
 * Surfaces 10-K, 10-Q, DEF 14A, 8-K and ESG filings for any US-listed ticker.
 * All data comes from the free EDGAR API at data.sec.gov — no key required.
 *
 * Rate-limit note: SEC asks for a polite User-Agent and no more than 10 req/s.
 * We cache aggressively (CIK 24h, filings 1h) so real-world load is tiny.
 */
import { Router } from "express";
import axios from "axios";

const router = Router();

const UA = "Bloomberg Terminal (educational) admin@local.dev";

// ── tiny in-process cache ─────────────────────────────────────────────────
const _cache = new Map<string, { data: unknown; expiry: number }>();
function cacheGet<T>(key: string): T | undefined {
  const e = _cache.get(key);
  if (!e) return undefined;
  if (Date.now() > e.expiry) { _cache.delete(key); return undefined; }
  return e.data as T;
}
function cacheSet(key: string, data: unknown, ttlMs: number) {
  _cache.set(key, { data, expiry: Date.now() + ttlMs });
}
async function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return hit;
  const v = await fn();
  cacheSet(key, v, ttlMs);
  return v;
}

// ── SEC helpers ───────────────────────────────────────────────────────────
const secAxios = axios.create({
  headers: { "User-Agent": UA, "Accept": "application/json" },
  timeout: 20_000,
});

async function secJson(url: string): Promise<any> {
  const res = await secAxios.get(url);
  return res.data;
}

type TickerMap = Record<string, { cik_str: number; ticker: string; title: string }>;

async function getTickerMap(): Promise<TickerMap> {
  return withCache("ticker_map", 24 * 3600_000, () =>
    secJson("https://www.sec.gov/files/company_tickers.json")
  );
}

async function getCIK(ticker: string): Promise<{ cik: number; name: string } | null> {
  return withCache(`cik:${ticker.toUpperCase()}`, 24 * 3600_000, async () => {
    const map = await getTickerMap();
    const up = ticker.toUpperCase();
    for (const v of Object.values(map)) {
      if (v.ticker === up) return { cik: v.cik_str, name: v.title };
    }
    return null;
  });
}

export interface FilingItem {
  form: string;
  filingDate: string;
  reportDate: string;
  accessionNumber: string;
  description: string;
  primaryDocument: string;
  url: string | null;       // direct link to the primary document
  indexUrl: string;         // filing index (shows all docs in the filing)
  isPdf: boolean;
  isHtml: boolean;
}

function buildUrls(cik: number, accessionNumber: string, primaryDocument: string) {
  const acc = accessionNumber.replace(/-/g, "");
  const base = `https://www.sec.gov/Archives/edgar/data/${cik}/${acc}`;
  return {
    url: primaryDocument ? `${base}/${primaryDocument}` : null,
    indexUrl: `${base}/`,
  };
}

function zipFilings(r: any, cik: number): FilingItem[] {
  const forms: string[] = r.form ?? [];
  const dates: string[] = r.filingDate ?? [];
  const accessions: string[] = r.accessionNumber ?? [];
  const primaryDocs: string[] = r.primaryDocument ?? [];
  const descs: string[] = r.primaryDocDescription ?? [];
  const reports: string[] = r.reportDate ?? [];

  return forms.map((form, i) => {
    const doc = primaryDocs[i] ?? "";
    const { url, indexUrl } = buildUrls(cik, accessions[i] ?? "", doc);
    return {
      form,
      filingDate: dates[i] ?? "",
      reportDate: reports[i] ?? "",
      accessionNumber: accessions[i] ?? "",
      description: descs[i] || form,
      primaryDocument: doc,
      url,
      indexUrl,
      isPdf: doc.toLowerCase().endsWith(".pdf"),
      isHtml: /\.(htm|html)$/i.test(doc),
    };
  });
}

async function getAllFilings(cik: number): Promise<FilingItem[]> {
  return withCache(`filings:${cik}`, 3600_000, async () => {
    const padded = String(cik).padStart(10, "0");
    const sub = await secJson(`https://data.sec.gov/submissions/CIK${padded}.json`);

    const items: FilingItem[] = zipFilings(sub.filings?.recent ?? {}, cik);

    // Fetch older pages until we have 10+ years of 10-K history (max 5 extra pages).
    // p.name is the bare filename, e.g. "CIK0000320193-submissions-001.json"
    const pages: Array<{ name: string; filingFrom: string }> = sub.filings?.files ?? [];
    let fetched = 0;
    for (const p of pages) {
      if (fetched >= 5) break;
      const path = p.name.startsWith("/") ? p.name : `/submissions/${p.name}`;
      const older = await secJson(`https://data.sec.gov${path}`);
      items.push(...zipFilings(older, cik));
      fetched++;
      // Stop once we have data going back >12 years
      const oldest = items.filter(f => f.form === "10-K").sort((a, b) => a.filingDate.localeCompare(b.filingDate))[0];
      if (oldest) {
        const years = (Date.now() - new Date(oldest.filingDate).getTime()) / (365.25 * 86400_000);
        if (years > 12) break;
      }
    }

    return items.sort((a, b) => b.filingDate.localeCompare(a.filingDate));
  });
}

// ── Route ─────────────────────────────────────────────────────────────────

// GET /api/filings/:symbol
router.get("/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();

  try {
    const info = await getCIK(symbol);
    if (!info) {
      res.status(404).json({ error: "NOT_FOUND", message: `No SEC record found for ${symbol}. Non-US companies may not be on EDGAR.` });
      return;
    }
    const { cik, name } = info;

    const all = await getAllFilings(cik);

    // Group by category
    const ANNUAL   = ["10-K", "10-K/A", "10-KT", "20-F", "40-F", "20-F/A"];
    const QUARTERLY = ["10-Q", "10-Q/A"];
    const PROXY     = ["DEF 14A", "DEFA14A", "DEFM14A", "DEF 14C", "PRE 14A", "PRE 14C"];
    const EVENTS    = ["8-K", "8-K/A"];
    const ESG_FORMS = ["SD", "SD/A"]; // Conflict-minerals / specialized disclosure

    function filter(types: string[]) {
      return all.filter(f => types.some(t => f.form.toUpperCase().startsWith(t)));
    }

    res.json({
      symbol,
      cik,
      companyName: name,
      edgarPage: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=&dateb=&owner=include&count=40&search_text=`,
      annual:    filter(ANNUAL),
      quarterly: filter(QUARTERLY),
      proxy:     filter(PROXY),
      events:    filter(EVENTS).slice(0, 200), // cap 8-Ks at 200; there can be thousands
      esgForms:  filter(ESG_FORMS),
    });
  } catch (err: any) {
    console.error("[filings]", err?.message);
    res.status(502).json({ error: "SEC_ERROR", message: err?.message ?? "SEC lookup failed" });
  }
});

export default router;
