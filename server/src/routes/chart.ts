import { Router } from "express";
import yf from "../yf.js";
import { cached } from "../cache.js";

const router = Router();

type Timeframe = "1D" | "5D" | "1M" | "3M" | "6M" | "1Y" | "5Y";

interface RangeSpec {
  interval: "5m" | "15m" | "1h" | "1d" | "1wk";
  // milliseconds to subtract from now for period1
  lookbackMs: number;
}

const DAY = 24 * 60 * 60 * 1000;

const SPECS: Record<Timeframe, RangeSpec> = {
  "1D": { interval: "5m", lookbackMs: 1 * DAY },
  "5D": { interval: "15m", lookbackMs: 5 * DAY },
  "1M": { interval: "1d", lookbackMs: 31 * DAY },
  "3M": { interval: "1d", lookbackMs: 93 * DAY },
  "6M": { interval: "1d", lookbackMs: 186 * DAY },
  "1Y": { interval: "1d", lookbackMs: 366 * DAY },
  "5Y": { interval: "1wk", lookbackMs: 5 * 366 * DAY },
};

export interface Candle {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// GET /api/chart/:symbol?timeframe=1M
router.get("/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const timeframe = (String(req.query.timeframe ?? "1M").toUpperCase() as Timeframe);
  const spec = SPECS[timeframe] ?? SPECS["1M"];

  try {
    const candles = await cached(`chart:${symbol}:${timeframe}`, async () => {
      const period1 = new Date(Date.now() - spec.lookbackMs);
      const result = await yf.chart(symbol, {
        period1,
        interval: spec.interval,
      });

      const out: Candle[] = [];
      for (const q of result.quotes) {
        if (
          q.open == null ||
          q.high == null ||
          q.low == null ||
          q.close == null
        ) {
          continue; // skip gaps Yahoo returns as nulls
        }
        out.push({
          time: Math.floor(new Date(q.date).getTime() / 1000),
          open: q.open,
          high: q.high,
          low: q.low,
          close: q.close,
          volume: q.volume ?? 0,
        });
      }
      return out;
    });

    res.json({ symbol, timeframe, candles });
  } catch (err: any) {
    res
      .status(502)
      .json({ error: "CHART_UNAVAILABLE", message: err?.message ?? "Failed" });
  }
});

export default router;
