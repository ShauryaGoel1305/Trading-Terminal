import { Router } from "express";
import axios from "axios";
import { cached } from "../cache.js";
import {
  fetchSymbolNews,
  queryNews,
  newsStatus,
  listPlayers,
  type Article,
} from "../newsEngine.js";

const router = Router();

// Optional Finnhub enrichment (only if a key is configured).
async function fromFinnhub(category: string): Promise<Article[]> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return [];
  try {
    const { data } = await axios.get("https://finnhub.io/api/v1/news", {
      params: { category: category === "all" ? "general" : category, token: key },
      timeout: 8_000,
    });
    if (!Array.isArray(data)) return [];
    const now = Math.floor(Date.now() / 1000);
    return data.slice(0, 40).map((n: any) => ({
      id: `finnhub-${n.id ?? n.url}`,
      headline: n.headline,
      source: n.source || "Finnhub",
      url: n.url,
      datetime: Number(n.datetime) || now,
      summary: n.summary,
      type: "article" as const,
      category: "markets",
      sentiment: "neutral" as const,
      tickers: n.related ? String(n.related).split(",").filter(Boolean).slice(0, 5) : [],
      thumbnail: n.image || undefined,
      firstSeen: now,
      lastSeen: now,
      seenCount: 1,
      sources: [n.source || "Finnhub"],
    }));
  } catch {
    return [];
  }
}

// GET /api/news?category=&type=&symbol=&limit=
router.get("/", async (req, res) => {
  const category = String(req.query.category ?? "all");
  const type = String(req.query.type ?? "all");
  const topic = req.query.topic ? String(req.query.topic) : undefined;
  const symbol = req.query.symbol ? String(req.query.symbol).toUpperCase() : "";
  const limit = Math.min(400, Number(req.query.limit ?? 150));

  try {
    if (symbol) {
      // Per-stock: live fetch (cached 60s to protect sources).
      const items = await cached(`news:sym:${symbol}`, () => fetchSymbolNews(symbol), 60);
      res.json(items);
      return;
    }

    let items = queryNews({ category, type, topic, limit });
    // If the store is still warming up, fold in a Finnhub pull (when keyed).
    if (items.length < 10) {
      const extra = await cached(`news:finnhub:${category}`, () => fromFinnhub(category), 60);
      const seen = new Set(items.map((i) => i.id));
      items = [...items, ...extra.filter((e) => !seen.has(e.id))].sort((a, b) => b.datetime - a.datetime);
    }
    res.json(items);
  } catch (err: any) {
    res.status(502).json({ error: "NEWS_UNAVAILABLE", message: err?.message ?? "Failed" });
  }
});

// GET /api/news/status — store diagnostics for the UI footer.
router.get("/status", (_req, res) => {
  res.json(newsStatus());
});

// GET /api/news/players — the specialized "big players" list.
router.get("/players", (_req, res) => {
  res.json(listPlayers());
});

export default router;
