import { Router } from "express";
import { aiEnabled, aiModel, callAI, callAIChat, compactJson, AiDisabledError, type ChatMessage, type ToolDef } from "../ai.js";
import { queryNews, fetchSymbolNews, type Article } from "../newsEngine.js";

const router = Router();

// Function codes the AI is allowed to navigate the terminal to. Kept as a
// curated allow-list (rather than every code in the client's function
// catalogue) so the model can't send the UI to a code that doesn't exist.
const NAV_CODES = [
  "DASH", "DES", "FA", "AR", "CF", "EE", "OWN", "COMP", "GP", "SIG", "N", "CN",
  "DVD", "BRC", "SI", "ESG", "ETF", "HVG", "BETA", "GF", "HP", "PORT", "RISK",
  "TRADE", "YCRV", "ECO", "MKT", "WEI", "ALRT", "QUANT",
] as const;

const NAVIGATE_TOOL: ToolDef = {
  type: "function",
  function: {
    name: "navigate",
    description:
      "Switch the trading terminal's main screen to show a specific function, optionally for a specific ticker. " +
      "Use this whenever the user asks to see, open, pull up, or go to something — e.g. a company's annual report, " +
      "financials, chart, news, ownership, dividends, ESG, or a general market screen. Only call this when the user " +
      "is clearly asking to be shown or navigated somewhere, not for plain questions you can just answer in text.",
    parameters: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Ticker symbol, e.g. AAPL. Omit for symbol-independent codes like N, MKT, ECO, YCRV, WEI, QUANT.",
        },
        code: {
          type: "string",
          description: "Terminal function code to switch to.",
          enum: NAV_CODES as unknown as string[],
        },
      },
      required: ["code"],
    },
  },
};

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
// This is an open-ended chat endpoint — it is NOT locked to one ticker. `symbol`
// / `context` (when present) are just a soft "here's what the user is
// currently looking at" hint; the assistant is free to discuss any company or
// topic the user brings up, and can call the `navigate` tool to move the
// terminal's main screen to a ticker/function on the user's behalf.
router.post("/chat", async (req, res) => {
  try {
    const { symbol, context, messages } = req.body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "BAD_REQUEST", message: "messages required" });
      return;
    }
    const system =
      "You are an open-ended markets & investing assistant embedded in a trading terminal, similar to a general " +
      "chatbot — you are not restricted to a single ticker and can discuss any company, sector, or market topic the " +
      "user raises. " +
      (symbol ? `For reference, the user currently has ${String(symbol).toUpperCase()} loaded in the terminal, and some data about it is attached below — use it when relevant, but feel free to discuss other tickers too. ` : "") +
      "You have a `navigate` tool that switches the terminal's screen to a given function/ticker — call it whenever " +
      "the user asks to see, open, or go to something (a report, chart, financials, news, etc.), then briefly confirm " +
      "in your reply what you opened. Otherwise just answer directly and concisely. If you don't have real data for a " +
      "claim, say so rather than guessing. " +
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

    const result = await callAIChat({ system, maxTokens: 3000, messages: msgs, tools: [NAVIGATE_TOOL] });

    let navigate: { symbol?: string; code: string } | undefined;
    let text = result.text;
    if (result.toolCall?.name === "navigate") {
      const code = String(result.toolCall.arguments.code ?? "").toUpperCase();
      const sym = result.toolCall.arguments.symbol ? String(result.toolCall.arguments.symbol).toUpperCase() : undefined;
      if (NAV_CODES.includes(code as (typeof NAV_CODES)[number])) {
        navigate = { symbol: sym, code };
        if (!text) text = `Opening ${code}${sym ? ` for ${sym}` : ""}…`;
      }
    }

    res.json({ text, navigate });
  } catch (err: any) {
    handleErr(res, err);
  }
});

export default router;
