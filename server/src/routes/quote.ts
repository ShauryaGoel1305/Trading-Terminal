import { Router } from "express";
import axios from "axios";
import yf from "../yf.js";
import { cached } from "../cache.js";

const router = Router();

export interface Quote {
  symbol: string;
  name: string;
  exchange: string;
  currency: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  previousClose: number | null;
  volume: number | null;
  marketCap: number | null;
  peRatio: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  marketState: string | null;
  source: "yahoo" | "alphavantage";
}

async function fromYahoo(symbol: string): Promise<Quote> {
  const q = await yf.quote(symbol);
  return {
    symbol: q.symbol ?? symbol,
    name: q.longName ?? q.shortName ?? q.symbol ?? symbol,
    exchange: q.fullExchangeName ?? q.exchange ?? "",
    currency: q.currency ?? "USD",
    price: q.regularMarketPrice ?? null,
    change: q.regularMarketChange ?? null,
    changePercent: q.regularMarketChangePercent ?? null,
    open: q.regularMarketOpen ?? null,
    high: q.regularMarketDayHigh ?? null,
    low: q.regularMarketDayLow ?? null,
    previousClose: q.regularMarketPreviousClose ?? null,
    volume: q.regularMarketVolume ?? null,
    marketCap: q.marketCap ?? null,
    peRatio: q.trailingPE ?? null,
    fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? null,
    marketState: q.marketState ?? null,
    source: "yahoo",
  };
}

async function fromAlphaVantage(symbol: string): Promise<Quote> {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) throw new Error("No Alpha Vantage key configured");

  const { data } = await axios.get("https://www.alphavantage.co/query", {
    params: { function: "GLOBAL_QUOTE", symbol, apikey: key },
    timeout: 10_000,
  });
  const g = data?.["Global Quote"];
  if (!g || !g["05. price"]) throw new Error("Alpha Vantage returned no data");

  const price = Number(g["05. price"]);
  const prev = Number(g["08. previous close"]);
  return {
    symbol,
    name: symbol,
    exchange: "",
    currency: "USD",
    price,
    change: Number(g["09. change"]),
    changePercent: Number(String(g["10. change percent"]).replace("%", "")),
    open: Number(g["02. open"]),
    high: Number(g["03. high"]),
    low: Number(g["04. low"]),
    previousClose: prev,
    volume: Number(g["06. volume"]),
    marketCap: null,
    peRatio: null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    marketState: null,
    source: "alphavantage",
  };
}

// GET /api/quote/:symbol
router.get("/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const quote = await cached(`quote:${symbol}`, async () => {
      try {
        return await fromYahoo(symbol);
      } catch (err) {
        return await fromAlphaVantage(symbol);
      }
    });
    res.json(quote);
  } catch (err: any) {
    res.status(502).json({ error: "QUOTE_UNAVAILABLE", message: err?.message ?? "Failed" });
  }
});

// GET /api/quote?symbols=SPY,QQQ,...  (batch, used by market overview + watchlist)
router.get("/", async (req, res) => {
  const raw = String(req.query.symbols ?? "");
  const symbols = raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  if (symbols.length === 0) return res.json([]);

  const results = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        return await cached(`quote:${symbol}`, () => fromYahoo(symbol));
      } catch {
        return { symbol, error: true } as any;
      }
    })
  );
  res.json(results);
});

export default router;
