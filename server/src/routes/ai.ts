import { Router } from "express";
import { aiEnabled, aiModel, callAI, compactJson, AiDisabledError, type ChatMessage } from "../ai.js";
import { queryNews, fetchSymbolNews, type Article } from "../newsEngine.js";

const router = Router();

const DISCLAIMER =
  "End with a one-line disclaimer: this is AI-generated analysis from public data, not financial advice.";

function handleErr(res: any, err: any) {
  if (err instanceof AiDisabledError) {
    res.status(503).json({ error: "AI_DISABLED", message: err.message });
  } else {
    res.status(502).json({ error: "AI_ERROR", message: err?.message ?? "AI request failed" });
  }
}

// GET /api/ai/status
router.get("/status", (_req, res) => {
  res.json({ enabled: aiEnabled(), model: aiModel() });
});

// POST /api/ai/news-summary { symbol?, category?, type?, topic? }
// Summarises the relevant slice of the news store.
router.post("/news-summary", async (req, res) => {
  try {
    const { symbol, category, type, topic } = req.body ?? {};
    let articles: Article[];
    let scope: string;
    if (symbol) {
      articles = await fetchSymbolNews(String(symbol));
      scope = `news about ${String(symbol).toUpperCase()}`;
    } else {
      articles = queryNews({ category, type, topic, limit: 50 });
      scope = topic ? `statements & coverage of ${topic}` : `${category && category !== "all" ? category + " " : ""}market news`;
    }
    if (articles.length === 0) {
      res.json({ text: "No articles available to summarise yet — the feed is still warming up." });
      return;
    }

    const feed = articles
      .slice(0, 45)
      .map((a) => `- [${a.sentiment}] ${a.headline} (${a.source}${a.tickers.length ? ", tickers: " + a.tickers.join(",") : ""})`)
      .join("\n");

    const system =
      "You are a sharp markets news analyst for a Bloomberg-style terminal. " +
      "Given a list of recent headlines, produce a tight, scannable brief. Use short markdown sections: " +
      "**TL;DR** (2-3 sentences), **Key themes** (3-5 bullets), **Notable movers / names** (bullets with tickers when present), " +
      "and **Overall tone** (bullish/bearish/mixed with one-line why). Be specific and concrete; do not invent facts beyond the headlines. " +
      DISCLAIMER;

    const text = await callAI({
      system,
      maxTokens: 4000,
      think: false,
      messages: [{ role: "user", content: `Summarise these ${articles.length} recent items (${scope}):\n\n${feed}` }],
    });
    res.json({ text });
  } catch (err: any) {
    handleErr(res, err);
  }
});

// POST /api/ai/analyze { symbol, data }
// data is a curated bundle assembled by the client (profile, stats, analyst,
// financials, ownership, peers, recent news).
router.post("/analyze", async (req, res) => {
  try {
    const { symbol, data } = req.body ?? {};
    if (!symbol) {
      res.status(400).json({ error: "BAD_REQUEST", message: "symbol required" });
      return;
    }
    const system =
      "You are an experienced equity research analyst writing for a professional trading terminal. " +
      "You are given structured public data about a company (profile, key statistics, analyst consensus, up to 5 years of financial statements, ownership, peers, and recent news). " +
      "Write a rigorous, concrete investment brief in markdown with these sections:\n" +
      "## What the company does\n## Strategy & goals\n## Financial trajectory (last ~5 years)\n## Ownership & who's buying\n## Valuation vs peers\n## Recent catalysts (news)\n## Bull case\n## Bear case\n## Key risks\n## Bottom line\n" +
      "Ground every claim in the supplied data; cite concrete numbers (revenue/margin/EPS trends, P/E vs peers, holder %s). " +
      "Do not fabricate data not present. Be decisive but balanced. Keep it skimmable. " +
      DISCLAIMER;

    const text = await callAI({
      system,
      maxTokens: 9000,
      think: true,
      messages: [
        { role: "user", content: `Analyse ${String(symbol).toUpperCase()} as a potential investment. Data:\n\n${compactJson(data)}` },
      ],
    });
    res.json({ text });
  } catch (err: any) {
    handleErr(res, err);
  }
});

// POST /api/ai/chat { symbol?, context?, messages: [{role,content}] }
router.post("/chat", async (req, res) => {
  try {
    const { symbol, context, messages } = req.body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "BAD_REQUEST", message: "messages required" });
      return;
    }
    const system =
      "You are a knowledgeable markets & investing assistant inside a trading terminal. " +
      (symbol ? `The user is currently looking at ${String(symbol).toUpperCase()}. ` : "") +
      "Answer concisely and concretely. When the user asks about the current stock, use the supplied context data. " +
      "If you don't have the data, say so rather than guessing. " +
      DISCLAIMER;

    const msgs: ChatMessage[] = [];
    if (context) {
      msgs.push({ role: "user", content: `Context data for ${String(symbol ?? "the security").toUpperCase()}:\n${compactJson(context, 16000)}` });
      msgs.push({ role: "assistant", content: "Understood — I have the context. What would you like to know?" });
    }
    for (const m of messages.slice(-10)) {
      if (m?.role === "user" || m?.role === "assistant") {
        msgs.push({ role: m.role, content: String(m.content ?? "") });
      }
    }

    const text = await callAI({ system, maxTokens: 4000, think: true, messages: msgs });
    res.json({ text });
  } catch (err: any) {
    handleErr(res, err);
  }
});

export default router;
