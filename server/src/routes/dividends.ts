/**
 * Dividends & Splits route (DVD / CACS)
 * Full dividend and stock-split history plus current dividend metrics — all
 * from Yahoo's free chart events feed and quoteSummary. This is public corporate
 * actions data; nothing here is licensed.
 */
import { Router } from "express";
import yf from "../yf.js";
import { cached } from "../cache.js";

const router = Router();

const OPT = { validateResult: false } as const;

export interface DividendItem {
  date: string;   // ISO date
  amount: number;
}
export interface SplitItem {
  date: string;
  numerator: number;
  denominator: number;
  ratio: string;  // e.g. "4:1"
}

// Yahoo returns chart events either as arrays (v3) or keyed objects; normalize.
function toArray(events: any): any[] {
  if (!events) return [];
  if (Array.isArray(events)) return events;
  return Object.values(events);
}

function isoDate(d: any): string | null {
  if (d == null) return null;
  // Yahoo gives Date objects, ISO strings, or epoch seconds.
  const ms = d instanceof Date ? d.getTime() : typeof d === "number" ? d * 1000 : Date.parse(d);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString().slice(0, 10);
}

router.get("/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const data = await cached(`dividends:${symbol}`, async () => {
      // 1. Full-history chart, monthly interval (small payload) + corporate events.
      const chart: any = await yf.chart(
        symbol,
        { period1: new Date("1970-01-01"), interval: "1mo", events: "div|split" } as any,
        OPT
      );

      const dividends: DividendItem[] = toArray(chart.events?.dividends)
        .map((d: any) => ({ date: isoDate(d.date) ?? "", amount: Number(d.amount) }))
        .filter((d) => d.date && Number.isFinite(d.amount))
        .sort((a, b) => b.date.localeCompare(a.date));

      const splits: SplitItem[] = toArray(chart.events?.splits)
        .map((s: any) => {
          const num = Number(s.numerator);
          const den = Number(s.denominator);
          return {
            date: isoDate(s.date) ?? "",
            numerator: num,
            denominator: den,
            ratio: s.splitRatio ?? (num && den ? `${num}:${den}` : "—"),
          };
        })
        .filter((s) => s.date)
        .sort((a, b) => b.date.localeCompare(a.date));

      // 2. Current dividend metrics.
      const r: any = await yf.quoteSummary(
        symbol,
        { modules: ["summaryDetail", "defaultKeyStatistics", "price", "calendarEvents"] },
        OPT
      );
      const sd = r.summaryDetail ?? {};
      const ks = r.defaultKeyStatistics ?? {};
      const price = r.price ?? {};
      const cal = r.calendarEvents ?? {};

      // Trailing-12-month dividend total + simple YoY / 5y CAGR from annual sums.
      const now = Date.now();
      const ttmDividend = dividends
        .filter((d) => now - Date.parse(d.date) <= 366 * 86400_000)
        .reduce((s, d) => s + d.amount, 0);

      // Group dividends by calendar year for growth math.
      const byYear = new Map<number, number>();
      for (const d of dividends) {
        const y = Number(d.date.slice(0, 4));
        byYear.set(y, (byYear.get(y) ?? 0) + d.amount);
      }
      const years = [...byYear.keys()].sort((a, b) => a - b);
      // Use last *complete* year as reference (current year may be partial).
      const thisYear = new Date().getFullYear();
      const complete = years.filter((y) => y < thisYear);
      const last = complete[complete.length - 1];
      const prev = complete[complete.length - 2];
      const fiveAgo = complete[complete.length - 6];
      const growth1y =
        last != null && prev != null && byYear.get(prev)
          ? (byYear.get(last)! / byYear.get(prev)! - 1) * 100
          : null;
      const cagr5y =
        last != null && fiveAgo != null && byYear.get(fiveAgo)
          ? (Math.pow(byYear.get(last)! / byYear.get(fiveAgo)!, 1 / 5) - 1) * 100
          : null;

      return {
        symbol,
        companyName: price.longName ?? price.shortName ?? symbol,
        summary: {
          dividendRate: sd.dividendRate ?? sd.trailingAnnualDividendRate ?? null,
          dividendYield: sd.dividendYield ?? sd.trailingAnnualDividendYield ?? null,
          payoutRatio: sd.payoutRatio ?? null,
          fiveYearAvgYield: sd.fiveYearAvgDividendYield ?? null,
          exDividendDate: isoDate(sd.exDividendDate ?? cal.exDividendDate),
          lastDividendValue: ks.lastDividendValue ?? (dividends[0]?.amount ?? null),
          lastDividendDate: dividends[0]?.date ?? isoDate(ks.lastDividendDate),
          ttmDividend: ttmDividend || null,
          growth1y,
          cagr5y,
          totalDividends: dividends.length,
          totalSplits: splits.length,
          firstDividendDate: dividends[dividends.length - 1]?.date ?? null,
        },
        dividends,
        splits,
      };
    });

    res.json(data);
  } catch (err: any) {
    console.error("[dividends]", err?.message);
    res.status(502).json({ error: "DIVIDENDS_UNAVAILABLE", message: err?.message ?? "Dividend lookup failed" });
  }
});

export default router;
