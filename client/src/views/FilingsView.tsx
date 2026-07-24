import { useEffect, useState } from "react";
import { Panel } from "../components/Panel";
import { SkeletonRows } from "../components/Skeleton";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import type { FilingItem, FilingsResponse } from "../types";

// ── helpers ───────────────────────────────────────────────────────────────

function formatDate(d: string) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
}

function periodLabel(item: FilingItem) {
  const d = item.reportDate || item.filingDate;
  if (!d) return "—";
  const dt = new Date(d);
  const form = item.form.toUpperCase();
  if (form.startsWith("10-K") || form.startsWith("20-F") || form.startsWith("40-F")) {
    return `FY ${dt.getFullYear()}`;
  }
  if (form.startsWith("10-Q")) {
    const m = dt.getMonth() + 1;
    const q = m <= 3 ? "Q1" : m <= 6 ? "Q2" : m <= 9 ? "Q3" : "Q4";
    return `${q} ${dt.getFullYear()}`;
  }
  return formatDate(d);
}

function DocLink({ item }: { item: FilingItem }) {
  if (item.url) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-2xs hover:brightness-125 ${
          item.isPdf ? "border-accent-orange text-accent-orange" : "border-term-green text-term-green"
        }`}
        title={`Open ${item.form} document`}
      >
        {item.isPdf ? "📄 PDF" : "🌐 HTML"}
      </a>
    );
  }
  return (
    <a
      href={item.indexUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-term-gray text-term-gray text-2xs hover:text-term-white hover:border-term-white"
      title="Open filing index on SEC EDGAR"
    >
      📑 Index
    </a>
  );
}

function FilingsTable({ items, showPeriod = true }: { items: FilingItem[]; showPeriod?: boolean }) {
  const [search, setSearch] = useState("");
  const filtered = items.filter(
    (i) =>
      !search ||
      i.form.toLowerCase().includes(search.toLowerCase()) ||
      (i.description || "").toLowerCase().includes(search.toLowerCase()) ||
      i.filingDate.includes(search)
  );

  return (
    <div>
      <div className="px-2 py-1 border-b border-term-border">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by form, description or date…"
          className="bg-black border border-term-border px-2 py-0.5 text-2xs text-term-white focus:outline-none focus:ring-1 focus:ring-accent-orange w-64"
        />
        <span className="text-2xs text-term-gray ml-2">{filtered.length} filings</span>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-2xs">
          <thead>
            <tr className="bg-bg-header text-accent-amber uppercase tracking-wider">
              <th className="px-2 py-1 text-left w-28">Filed</th>
              {showPeriod && <th className="px-2 py-1 text-left w-20">Period</th>}
              <th className="px-2 py-1 text-left w-24">Form</th>
              <th className="px-2 py-1 text-left">Description</th>
              <th className="px-2 py-1 text-right w-20">Open</th>
              <th className="px-2 py-1 text-right w-20">Index</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 300).map((item, i) => (
              <tr
                key={item.accessionNumber + i}
                className="border-b border-term-border/30 hover:bg-bg-secondary"
              >
                <td className="px-2 py-1 text-term-gray num">{formatDate(item.filingDate)}</td>
                {showPeriod && <td className="px-2 py-1 text-term-white">{periodLabel(item)}</td>}
                <td className="px-2 py-1">
                  <span className="px-1 border border-term-border text-accent-amber">{item.form}</span>
                </td>
                <td className="px-2 py-1 text-term-gray truncate max-w-xs">{item.description || "—"}</td>
                <td className="px-2 py-1 text-right">
                  <DocLink item={item} />
                </td>
                <td className="px-2 py-1 text-right">
                  <a
                    href={item.indexUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-term-gray hover:text-term-white underline"
                    title="All documents in this filing"
                  >
                    ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-2xs text-term-gray px-2 py-4">No filings match the filter.</div>
        )}
      </div>
    </div>
  );
}

// ── ESG tab ───────────────────────────────────────────────────────────────

const ESG_RESOURCES = [
  {
    category: "Global Databases",
    links: [
      { label: "CDP (Carbon Disclosure Project)", url: "https://www.cdp.net/en/search#query=" },
      { label: "GRI Standards Disclosure Database", url: "https://www.globalreporting.org/reporting-support/reporting-tools/search-database/" },
      { label: "MSCI ESG Ratings", url: "https://www.msci.com/our-solutions/esg-investing/esg-ratings-climate-search-tool" },
      { label: "Sustainalytics ESG Ratings", url: "https://www.sustainalytics.com/esg-ratings/" },
      { label: "LSEG ESG Data (Refinitiv)", url: "https://www.lseg.com/en/data-analytics/sustainable-finance/esg-scores" },
      { label: "ISS ESG Corporate Rating", url: "https://www.issgovernance.com/esg/ratings/" },
    ],
  },
  {
    category: "Regulatory Filings (SEC)",
    links: [
      { label: "Form SD – Conflict Minerals / Supply Chain", url: "" }, // filled dynamically
      { label: "DEF 14A – Annual Proxy (governance, exec comp)", url: "" },
      { label: "10-K – Annual Report (contains ESG disclosures)", url: "" },
    ],
  },
  {
    category: "Frameworks & Standards",
    links: [
      { label: "TCFD Recommendations (Climate)", url: "https://www.tcfdhub.org/" },
      { label: "ISSB / IFRS Sustainability Standards", url: "https://www.ifrs.org/groups/international-sustainability-standards-board/" },
      { label: "SASB Standards by Industry", url: "https://sasb.ifrs.org/standards/download/" },
      { label: "UN Global Compact Disclosures", url: "https://unglobalcompact.org/what-is-gc/participants" },
    ],
  },
];

function EsgTab({ data }: { data: FilingsResponse }) {
  // outer scroll is handled by the parent flex-1 overflow-auto wrapper in FilingsView
  const sdFilings = data.esgForms;
  const proxyFilings = data.proxy.slice(0, 5);
  const annualFilings = data.annual.slice(0, 5);

  return (
    <div className="p-3 space-y-4">
      {/* Company EDGAR page */}
      <div className="border border-term-border p-2 flex items-center justify-between">
        <div>
          <div className="text-2xs text-accent-amber uppercase tracking-wider">{data.companyName} — SEC EDGAR</div>
          <div className="text-2xs text-term-gray mt-0.5">All official regulatory filings including any climate/ESG disclosures</div>
        </div>
        <a href={data.edgarPage} target="_blank" rel="noreferrer"
           className="px-2 py-1 border border-accent-orange text-accent-orange text-2xs hover:bg-accent-orange hover:text-black">
          Open EDGAR ↗
        </a>
      </div>

      {/* SD / Conflict-minerals filings */}
      {sdFilings.length > 0 && (
        <div>
          <div className="text-2xs text-accent-amber uppercase tracking-wider mb-1">Form SD — Specialized Disclosures (Conflict Minerals, Supply Chain)</div>
          <table className="w-full text-2xs">
            <thead>
              <tr className="bg-bg-header">
                <th className="px-2 py-1 text-left text-accent-amber">Filed</th>
                <th className="px-2 py-1 text-left text-accent-amber">Form</th>
                <th className="px-2 py-1 text-right text-accent-amber">Document</th>
              </tr>
            </thead>
            <tbody>
              {sdFilings.map((f, i) => (
                <tr key={i} className="border-b border-term-border/30 hover:bg-bg-secondary">
                  <td className="px-2 py-1 text-term-gray">{formatDate(f.filingDate)}</td>
                  <td className="px-2 py-1"><span className="px-1 border border-term-border text-accent-amber">{f.form}</span></td>
                  <td className="px-2 py-1 text-right"><DocLink item={f} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Proxy statements (governance) */}
      <div>
        <div className="text-2xs text-accent-amber uppercase tracking-wider mb-1">Proxy Statements — Governance, Exec Compensation, ESG Votes (recent 5)</div>
        <table className="w-full text-2xs">
          <thead>
            <tr className="bg-bg-header">
              <th className="px-2 py-1 text-left text-accent-amber">Filed</th>
              <th className="px-2 py-1 text-left text-accent-amber">Form</th>
              <th className="px-2 py-1 text-right text-accent-amber">Document</th>
            </tr>
          </thead>
          <tbody>
            {proxyFilings.map((f, i) => (
              <tr key={i} className="border-b border-term-border/30 hover:bg-bg-secondary">
                <td className="px-2 py-1 text-term-gray">{formatDate(f.filingDate)}</td>
                <td className="px-2 py-1"><span className="px-1 border border-term-border text-accent-amber">{f.form}</span></td>
                <td className="px-2 py-1 text-right"><DocLink item={f} /></td>
              </tr>
            ))}
            {proxyFilings.length === 0 && (
              <tr><td colSpan={3} className="px-2 py-2 text-term-gray">No proxy filings found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 10-K links (contain integrated ESG disclosures) */}
      <div>
        <div className="text-2xs text-accent-amber uppercase tracking-wider mb-1">Annual Reports 10-K — Include Integrated ESG/Climate Disclosures (recent 5)</div>
        <table className="w-full text-2xs">
          <thead>
            <tr className="bg-bg-header">
              <th className="px-2 py-1 text-left text-accent-amber">Filed</th>
              <th className="px-2 py-1 text-left text-accent-amber">Period</th>
              <th className="px-2 py-1 text-right text-accent-amber">Document</th>
            </tr>
          </thead>
          <tbody>
            {annualFilings.map((f, i) => (
              <tr key={i} className="border-b border-term-border/30 hover:bg-bg-secondary">
                <td className="px-2 py-1 text-term-gray">{formatDate(f.filingDate)}</td>
                <td className="px-2 py-1 text-term-white">{periodLabel(f)}</td>
                <td className="px-2 py-1 text-right"><DocLink item={f} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* External databases */}
      {ESG_RESOURCES.map((section) => (
        <div key={section.category}>
          <div className="text-2xs text-accent-amber uppercase tracking-wider mb-1">{section.category}</div>
          <div className="grid grid-cols-2 gap-1">
            {section.links.filter(l => l.url).map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-2 py-1 border border-term-border text-2xs text-term-gray hover:text-term-white hover:border-term-white"
              >
                <span className="text-accent-orange">↗</span>
                {link.label}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Summary header ────────────────────────────────────────────────────────

function FilingSummary({ data }: { data: FilingsResponse }) {
  const annuals = data.annual;
  const oldest = annuals[annuals.length - 1];
  const newest = annuals[0];
  const years = annuals.length;

  return (
    <div className="flex flex-wrap gap-4 px-3 py-2 border-b border-term-border bg-bg-secondary text-2xs">
      <div>
        <span className="text-term-gray">CIK </span>
        <a href={data.edgarPage} target="_blank" rel="noreferrer" className="text-accent-orange hover:underline num">
          {data.cik}
        </a>
      </div>
      <div><span className="text-term-gray">Annual reports </span><span className="text-term-white num">{years}</span></div>
      <div><span className="text-term-gray">Oldest annual </span><span className="text-term-white">{oldest ? formatDate(oldest.filingDate) : "—"}</span></div>
      <div><span className="text-term-gray">Latest annual </span><span className="text-term-white">{newest ? formatDate(newest.filingDate) : "—"}</span></div>
      <div><span className="text-term-gray">Quarterly </span><span className="text-term-white num">{data.quarterly.length}</span></div>
      <div><span className="text-term-gray">8-K events </span><span className="text-term-white num">{data.events.length}</span></div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────

const TABS = [
  { key: "annual",    label: "10-K Annual",     badge: (d: FilingsResponse) => d.annual.length },
  { key: "quarterly", label: "10-Q Quarterly",  badge: (d: FilingsResponse) => d.quarterly.length },
  { key: "proxy",     label: "Proxy / DEF 14A", badge: (d: FilingsResponse) => d.proxy.length },
  { key: "events",    label: "8-K Events",      badge: (d: FilingsResponse) => d.events.length },
  { key: "esg",       label: "ESG & IR",        badge: () => null },
] as const;

type TabKey = typeof TABS[number]["key"];

export function FilingsView({ symbol, defaultTab = "annual" }: { symbol: string; defaultTab?: TabKey }) {
  const [tab, setTab] = useState<TabKey>(defaultTab);
  // AR ("Annual Reports") and CF ("Company Filings") share this view but
  // land on different tabs by default — resync when the code (not the
  // symbol) changes so switching AR <-> CF actually shows something different.
  useEffect(() => setTab(defaultTab), [defaultTab]);
  const { data, loading, error } = usePolling(() => api.filings(symbol), 0, [symbol]);

  return (
    <Panel
      title={`Annual Reports & Filings · ${symbol}`}
      subtitle="SEC EDGAR"
      className="h-full"
      right={
        data ? (
          <a href={data.edgarPage} target="_blank" rel="noreferrer"
             className="text-2xs px-2 py-0.5 border border-accent-orange text-accent-orange hover:bg-accent-orange hover:text-black">
            Open EDGAR ↗
          </a>
        ) : undefined
      }
      bodyClassName="flex flex-col min-h-0"
    >
      {loading && !data && <SkeletonRows rows={15} cols={5} />}

      {error && (
        <div className="p-4">
          <div className="badge-error mb-2">{error}</div>
          <p className="text-2xs text-term-gray">
            {error.includes("NOT_FOUND") || error.includes("No SEC")
              ? "This ticker may not be registered on SEC EDGAR. Non-US companies typically file with their home-country regulator instead."
              : "Could not reach SEC EDGAR. Try again in a moment."}
          </p>
          <p className="text-2xs text-term-gray mt-1">
            Search EDGAR directly:{" "}
            <a
              href={`https://efts.sec.gov/LATEST/search-index?q=%22${symbol}%22&forms=10-K`}
              target="_blank" rel="noreferrer"
              className="text-accent-orange hover:underline"
            >
              Full-text EDGAR search for {symbol} ↗
            </a>
          </p>
        </div>
      )}

      {data && (
        <>
          <FilingSummary data={data} />

          {/* Tab bar */}
          <div className="flex gap-px border-b border-term-border bg-bg-secondary overflow-x-auto shrink-0">
            {TABS.map((t) => {
              const count = t.badge(data);
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`text-2xs px-3 py-1.5 uppercase whitespace-nowrap flex items-center gap-1 ${
                    t.key === tab
                      ? "bg-accent-orange text-black font-bold"
                      : "text-term-gray hover:text-term-white"
                  }`}
                >
                  {t.label}
                  {count !== null && count > 0 && (
                    <span className={`px-1 rounded-sm ${t.key === tab ? "bg-black/30" : "bg-bg-header"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto">
            {tab === "annual" && (
              <div>
                <div className="text-2xs text-term-gray px-3 py-1.5 border-b border-term-border bg-bg-panel">
                  10-K annual reports contain full <strong className="text-term-white">Balance Sheet</strong>,{" "}
                  <strong className="text-term-white">Income Statement</strong>,{" "}
                  <strong className="text-term-white">P&L</strong>,{" "}
                  <strong className="text-term-white">Cash Flow</strong>, MD&A, and audited notes.
                  Click <span className="text-accent-orange">📄 PDF</span> or{" "}
                  <span className="text-term-green">🌐 HTML</span> to open the full filing.
                </div>
                <FilingsTable items={data.annual} />
              </div>
            )}
            {tab === "quarterly" && <FilingsTable items={data.quarterly} />}
            {tab === "proxy" && (
              <div>
                <div className="text-2xs text-term-gray px-3 py-1.5 border-b border-term-border bg-bg-panel">
                  Proxy statements (DEF 14A) contain{" "}
                  <strong className="text-term-white">executive compensation</strong>,{" "}
                  <strong className="text-term-white">board governance</strong>,{" "}
                  <strong className="text-term-white">shareholder vote items</strong>, and increasingly{" "}
                  <strong className="text-term-white">ESG/sustainability proposals</strong>.
                </div>
                <FilingsTable items={data.proxy} />
              </div>
            )}
            {tab === "events" && (
              <div>
                <div className="text-2xs text-term-gray px-3 py-1.5 border-b border-term-border bg-bg-panel">
                  8-K current reports cover material events:{" "}
                  <strong className="text-term-white">earnings releases</strong>,{" "}
                  <strong className="text-term-white">M&A announcements</strong>,{" "}
                  <strong className="text-term-white">leadership changes</strong>, and other market-moving disclosures.
                </div>
                <FilingsTable items={data.events} showPeriod={false} />
              </div>
            )}
            {tab === "esg" && <EsgTab data={data} />}
          </div>
        </>
      )}
    </Panel>
  );
}
