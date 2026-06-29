import { Router } from "express";
import yf from "../yf.js";
import { cached } from "../cache.js";

const router = Router();

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

// GET /api/search?q=appl
router.get("/", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (q.length < 1) return res.json([]);

  try {
    const results = await cached(`search:${q.toLowerCase()}`, async () => {
      const r = await yf.search(q, { newsCount: 0, quotesCount: 8 });
      return (r.quotes ?? [])
        .filter((x: any) => x.symbol)
        .map((x: any) => ({
          symbol: x.symbol,
          name: x.shortname ?? x.longname ?? x.symbol,
          exchange: x.exchDisp ?? x.exchange ?? "",
          type: x.typeDisp ?? x.quoteType ?? "",
        })) as SearchResult[];
    }, 300);
    res.json(results);
  } catch (err: any) {
    res.status(502).json({ error: "SEARCH_UNAVAILABLE", message: err?.message ?? "Failed" });
  }
});

export default router;
