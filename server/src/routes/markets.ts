import { Router } from "express";
import yf from "../yf.js";
import { cached } from "../cache.js";

const router = Router();
const OPT = { validateResult: false } as const;

// Predefined Yahoo screens exposed in the EQS view.
export const SCREENS: { id: string; label: string }[] = [
  { id: "day_gainers", label: "Day Gainers" },
  { id: "day_losers", label: "Day Losers" },
  { id: "most_actives", label: "Most Active" },
  { id: "undervalued_growth_stocks", label: "Undervalued Growth" },
  { id: "growth_technology_stocks", label: "Growth Tech" },
  { id: "undervalued_large_caps", label: "Undervalued Large Cap" },
  { id: "aggressive_small_caps", label: "Aggressive Small Cap" },
  { id: "small_cap_gainers", label: "Small Cap Gainers" },
  { id: "most_shorted_stocks", label: "Most Shorted" },
  { id: "high_yield_bond", label: "High Yield Bond" },
];

router.get("/screens", (_req, res) => res.json(SCREENS));

router.get("/screen/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const data = await cached(`screen:${id}`, async () => {
      const r: any = await yf.screener({ scrIds: id as any, count: 25 }, undefined, OPT);
      return {
        id,
        title: r.title ?? id,
        results: (r.quotes ?? []).map((q: any) => ({
          symbol: q.symbol,
          name: q.shortName ?? q.longName ?? q.symbol,
          price: q.regularMarketPrice ?? null,
          changePercent: q.regularMarketChangePercent ?? null,
          volume: q.regularMarketVolume ?? null,
          marketCap: q.marketCap ?? null,
          trailingPE: q.trailingPE ?? null,
        })),
      };
    }, 120);
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: "SCREEN_UNAVAILABLE", message: err?.message });
  }
});

// US Treasury yield curve from Yahoo's CBOE tenor indices.
const TENORS = [
  { symbol: "^IRX", label: "13W", months: 3 },
  { symbol: "^FVX", label: "5Y", months: 60 },
  { symbol: "^TNX", label: "10Y", months: 120 },
  { symbol: "^TYX", label: "30Y", months: 360 },
];

router.get("/curve", async (_req, res) => {
  try {
    const data = await cached("curve", async () => {
      const quotes: any[] = await yf.quote(TENORS.map((t) => t.symbol));
      const bySym = new Map(
        (Array.isArray(quotes) ? quotes : [quotes]).map((q: any) => [q.symbol, q])
      );
      return {
        asOf: Math.floor(Date.now() / 1000),
        points: TENORS.map((t) => {
          const q = bySym.get(t.symbol);
          return {
            label: t.label,
            months: t.months,
            yield: q?.regularMarketPrice ?? null,
            change: q?.regularMarketChange ?? null,
          };
        }),
      };
    }, 60);
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: "CURVE_UNAVAILABLE", message: err?.message });
  }
});

export default router;
