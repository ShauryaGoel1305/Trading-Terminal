/**
 * Analytics routes — all computed from free Yahoo data.
 *   GET /api/etf/:symbol         ETF holdings, sector weights, allocation (ETF)
 *   GET /api/volatility/:symbol  Realized (historical) volatility windows + series (HVG)
 *   GET /api/beta/:symbol        Beta / correlation vs major benchmarks (BETA)
 */
import { Router } from "express";
import yf from "../yf.js";
import { cached } from "../cache.js";

const router = Router();
const OPT = { validateResult: false } as const;

// ── helpers ────────────────────────────────────────────────────────────
async function dailyCloses(symbol: string, sinceISO: string): Promise<{ date: string; close: number }[]> {
  const r: any = await yf.chart(symbol, { period1: new Date(sinceISO), interval: "1d" } as any, OPT);
  const out: { date: string; close: number }[] = [];
  for (const q of r.quotes ?? []) {
    if (q.close == null) continue;
    out.push({ date: new Date(q.date).toISOString().slice(0, 10), close: q.close });
  }
  return out;
}

// log returns from a close series
function logReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0 && closes[i] > 0) out.push(Math.log(closes[i] / closes[i - 1]));
  }
  return out;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

const ANN = Math.sqrt(252); // annualization factor for daily vol

// ── ETF analytics ──────────────────────────────────────────────────────
router.get("/etf/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const data = await cached(`etf:${symbol}`, async () => {
      const r: any = await yf.quoteSummary(
        symbol,
        { modules: ["topHoldings", "fundProfile", "price", "summaryDetail", "defaultKeyStatistics", "quoteType"] },
        OPT
      );
      const th = r.topHoldings ?? {};
      const fp = r.fundProfile ?? {};
      const price = r.price ?? {};
      const qt = r.quoteType ?? {};
      const sd = r.summaryDetail ?? {};

      const isEtf =
        (qt.quoteType ?? price.quoteType) === "ETF" ||
        (qt.quoteType ?? price.quoteType) === "MUTUALFUND" ||
        (th.holdings?.length ?? 0) > 0;

      // sectorWeightings is an array of single-key objects: [{technology: 0.3}, ...]
      const sectors = (th.sectorWeightings ?? [])
        .map((o: any) => {
          const [k, v] = Object.entries(o)[0] ?? [];
          return { sector: String(k), weight: Number(v) };
        })
        .filter((s: any) => Number.isFinite(s.weight) && s.weight > 0)
        .sort((a: any, b: any) => b.weight - a.weight);

      return {
        symbol,
        name: price.longName ?? price.shortName ?? symbol,
        isEtf,
        category: fp.categoryName ?? null,
        family: fp.family ?? null,
        legalType: fp.legalType ?? qt.legalType ?? null,
        expenseRatio: fp.feesExpensesInvestment?.annualReportExpenseRatio ?? null,
        netAssets: sd.totalAssets ?? price.netAssets ?? null,
        yield: sd.yield ?? null,
        ytdReturn: fp.feesExpensesInvestment?.totalNetAssets ?? null,
        allocation: {
          stock: th.stockPosition ?? null,
          bond: th.bondPosition ?? null,
          cash: th.cashPosition ?? null,
          preferred: th.preferredPosition ?? null,
          convertible: th.convertiblePosition ?? null,
          other: th.otherPosition ?? null,
        },
        holdings: (th.holdings ?? []).map((h: any) => ({
          symbol: h.symbol,
          name: h.holdingName,
          weight: h.holdingPercent,
        })),
        sectors,
      };
    }, 3600);
    res.json(data);
  } catch (err: any) {
    console.error("[etf]", err?.message);
    res.status(502).json({ error: "ETF_UNAVAILABLE", message: err?.message ?? "ETF lookup failed" });
  }
});

// ── Historical (realized) volatility ───────────────────────────────────
router.get("/volatility/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const data = await cached(`vol:${symbol}`, async () => {
      const since = new Date(Date.now() - 2.2 * 365 * 86400_000).toISOString().slice(0, 10);
      const series = await dailyCloses(symbol, since);
      if (series.length < 30) throw new Error(`Insufficient price history for ${symbol}`);

      const closes = series.map((s) => s.close);
      const dates = series.map((s) => s.date);
      const rets = logReturns(closes); // length = closes-1, aligned to dates[1..]

      const windowVol = (n: number): number | null => {
        if (rets.length < n) return null;
        return stdev(rets.slice(-n)) * ANN * 100;
      };
      const windows = [10, 20, 30, 60, 90, 120, 252]
        .map((d) => ({ days: d, vol: windowVol(d) }))
        .filter((w) => w.vol != null);

      // Rolling 30-day annualized vol series (for the graph).
      const W = 30;
      const roll: { date: string; vol: number }[] = [];
      for (let i = W; i < rets.length; i++) {
        const v = stdev(rets.slice(i - W, i)) * ANN * 100;
        roll.push({ date: dates[i + 1] ?? dates[i], vol: v });
      }

      const last = closes[closes.length - 1];
      const hi = Math.max(...closes);
      const lo = Math.min(...closes);
      const current30 = roll.length ? roll[roll.length - 1].vol : null;
      const vols = roll.map((r) => r.vol);

      return {
        symbol,
        current: last,
        windows,
        current30,
        min30: vols.length ? Math.min(...vols) : null,
        max30: vols.length ? Math.max(...vols) : null,
        avg30: vols.length ? vols.reduce((a, b) => a + b, 0) / vols.length : null,
        priceHigh: hi,
        priceLow: lo,
        series: roll,
      };
    }, 1800);
    res.json(data);
  } catch (err: any) {
    console.error("[volatility]", err?.message);
    res.status(502).json({ error: "VOL_UNAVAILABLE", message: err?.message ?? "Volatility calc failed" });
  }
});

// ── Beta / correlation vs benchmarks ───────────────────────────────────
const BENCHMARKS = [
  { symbol: "SPY", label: "S&P 500" },
  { symbol: "QQQ", label: "Nasdaq 100" },
  { symbol: "DIA", label: "Dow Jones" },
  { symbol: "IWM", label: "Russell 2000" },
];

router.get("/beta/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const data = await cached(`beta:${symbol}`, async () => {
      const since = new Date(Date.now() - 3.1 * 365 * 86400_000).toISOString().slice(0, 10);
      const [stock, ...benchSeries] = await Promise.all([
        dailyCloses(symbol, since),
        ...BENCHMARKS.map((b) => dailyCloses(b.symbol, since)),
      ]);
      if (stock.length < 60) throw new Error(`Insufficient price history for ${symbol}`);

      const stockMap = new Map(stock.map((s) => [s.date, s.close]));

      function statsVs(bench: { date: string; close: number }[], lookbackDays: number) {
        // Align on common dates within the lookback window.
        const cutoff = new Date(Date.now() - lookbackDays * 86400_000).toISOString().slice(0, 10);
        const aS: number[] = [];
        const aB: number[] = [];
        for (const b of bench) {
          if (b.date < cutoff) continue;
          const sc = stockMap.get(b.date);
          if (sc != null) { aS.push(sc); aB.push(b.close); }
        }
        const rS = logReturns(aS);
        const rB = logReturns(aB);
        const n = Math.min(rS.length, rB.length);
        if (n < 20) return { beta: null, corr: null, r2: null, n };
        const sS = rS.slice(-n), sB = rB.slice(-n);
        const mS = sS.reduce((a, b) => a + b, 0) / n;
        const mB = sB.reduce((a, b) => a + b, 0) / n;
        let cov = 0, varB = 0, varS = 0;
        for (let i = 0; i < n; i++) {
          cov += (sS[i] - mS) * (sB[i] - mB);
          varB += (sB[i] - mB) ** 2;
          varS += (sS[i] - mS) ** 2;
        }
        const beta = varB ? cov / varB : null;
        const corr = varB && varS ? cov / Math.sqrt(varB * varS) : null;
        return { beta, corr, r2: corr != null ? corr * corr : null, n };
      }

      const benchmarks = BENCHMARKS.map((b, i) => {
        const bench = benchSeries[i];
        const y1 = statsVs(bench, 365);
        const y3 = statsVs(bench, 3 * 365);
        return {
          symbol: b.symbol,
          label: b.label,
          beta1y: y1.beta, corr1y: y1.corr, r2_1y: y1.r2,
          beta3y: y3.beta, corr3y: y3.corr,
        };
      });

      return { symbol, benchmarks, observations1y: benchmarks[0] ? statsVs(benchSeries[0], 365).n : 0 };
    }, 1800);
    res.json(data);
  } catch (err: any) {
    console.error("[beta]", err?.message);
    res.status(502).json({ error: "BETA_UNAVAILABLE", message: err?.message ?? "Beta calc failed" });
  }
});

export default router;
