import { Router } from "express";
import { fredSeries } from "../fred.js";
import { cached } from "../cache.js";

const router = Router();

// Cache FRED series for a day — macro releases update at most monthly/quarterly
// (policy rates can move intra-day but a 24h cache is fine for a teaching tool).
const FRED_TTL = 24 * 60 * 60;

function pctChange(a: number, b: number): number | null {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0) return null;
  return (b / a - 1) * 100;
}

// GET /api/macro/gdp — real & nominal GDP, QoQ and YoY growth
router.get("/gdp", async (_req, res) => {
  try {
    const data = await cached("macro:gdp", async () => {
      const [real, nominal] = await Promise.all([fredSeries("GDPC1"), fredSeries("GDP")]);
      const withGrowth = real.map((p, i) => ({
        date: p.date,
        value: p.value,
        qoqAnnualized: i > 0 ? (Math.pow(p.value / real[i - 1].value, 4) - 1) * 100 : null,
        yoy: i >= 4 ? pctChange(real[i - 4].value, p.value) : null,
      }));
      return { real: withGrowth.slice(-40), nominal: nominal.slice(-40) };
    }, FRED_TTL);
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: "GDP_UNAVAILABLE", message: err?.message });
  }
});

// GET /api/macro/cpi — CPI level + YoY inflation
router.get("/cpi", async (_req, res) => {
  try {
    const data = await cached("macro:cpi", async () => {
      const series = await fredSeries("CPIAUCSL");
      const withYoy = series.map((p, i) => ({
        date: p.date,
        value: p.value,
        yoy: i >= 12 ? pctChange(series[i - 12].value, p.value) : null,
      }));
      return { series: withYoy.slice(-120) };
    }, FRED_TTL);
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: "CPI_UNAVAILABLE", message: err?.message });
  }
});

// GET /api/macro/fomc — effective fed funds rate history + latest change
router.get("/fomc", async (_req, res) => {
  try {
    const data = await cached("macro:fomc", async () => {
      const series = await fredSeries("FEDFUNDS");
      const latest = series[series.length - 1];
      const prior = series[series.length - 2];
      return {
        series: series.slice(-180),
        latest: latest?.value ?? null,
        latestDate: latest?.date ?? null,
        changeVsPriorMonth: latest && prior ? latest.value - prior.value : null,
      };
    }, FRED_TTL);
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: "FOMC_UNAVAILABLE", message: err?.message });
  }
});

// GET /api/macro/cenb — major central bank policy-adjacent rates side by side
router.get("/cenb", async (_req, res) => {
  try {
    const data = await cached("macro:cenb", async () => {
      const [us, ea, uk, jp] = await Promise.all([
        fredSeries("FEDFUNDS"),
        fredSeries("ECBDFR"),
        fredSeries("IUDSOIA"),
        fredSeries("IRSTCI01JPM156N"),
      ]);
      const last = (s: typeof us) => s[s.length - 1] ?? null;
      return {
        banks: [
          { bank: "US Federal Reserve", proxy: "Effective Fed Funds Rate", exact: true, latest: last(us) },
          { bank: "European Central Bank", proxy: "Deposit Facility Rate", exact: true, latest: last(ea) },
          { bank: "Bank of England", proxy: "SONIA (tracks Bank Rate)", exact: false, latest: last(uk) },
          { bank: "Bank of Japan", proxy: "Overnight Call Rate (tracks policy rate)", exact: false, latest: last(jp) },
        ],
      };
    }, FRED_TTL);
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: "CENB_UNAVAILABLE", message: err?.message });
  }
});

export default router;
