import { Router } from "express";
import yf from "../yf.js";
import { cached } from "../cache.js";

const router = Router();

export interface OptionRow {
  contractSymbol: string;
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  inTheMoney: boolean;
}

function mapRow(o: any): OptionRow {
  return {
    contractSymbol: o.contractSymbol,
    strike: o.strike,
    lastPrice: o.lastPrice ?? 0,
    bid: o.bid ?? 0,
    ask: o.ask ?? 0,
    volume: o.volume ?? 0,
    openInterest: o.openInterest ?? 0,
    impliedVolatility: o.impliedVolatility ?? 0,
    inTheMoney: !!o.inTheMoney,
  };
}

// GET /api/options/:symbol?date=<unix seconds expiration>
router.get("/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const date = req.query.date ? new Date(Number(req.query.date) * 1000) : undefined;

  try {
    const payload = await cached(`options:${symbol}:${req.query.date ?? "near"}`, async () => {
      const r = await yf.options(symbol, date ? { date } : {});
      const chain = r.options?.[0];
      return {
        symbol,
        underlyingPrice: r.quote?.regularMarketPrice ?? null,
        expirationDates: (r.expirationDates ?? []).map((d: Date) =>
          Math.floor(new Date(d).getTime() / 1000)
        ),
        selectedExpiration: chain ? Math.floor(new Date(chain.expirationDate).getTime() / 1000) : null,
        calls: (chain?.calls ?? []).map(mapRow),
        puts: (chain?.puts ?? []).map(mapRow),
      };
    });
    res.json(payload);
  } catch (err: any) {
    res.status(502).json({ error: "OPTIONS_UNAVAILABLE", message: err?.message ?? "Failed" });
  }
});

export default router;
