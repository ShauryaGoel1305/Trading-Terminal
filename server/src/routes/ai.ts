import { Router } from "express";
import { aiEnabled, aiModel, callAI, callAIChat, compactJson, AiDisabledError, type ChatMessage, type ToolDef } from "../ai.js";
import { queryNews, fetchSymbolNews, type Article } from "../newsEngine.js";

const router = Router();

// Function codes the AI is allowed to navigate the terminal to, with a short
// human-readable legend for each. Kept as a curated allow-list (rather than
// every code in the client's function catalogue) so the model can't send the
// UI to a code that doesn't exist, AND so it has explicit grounding in what
// each code actually contains — without this, the model tends to guess from
// generic Bloomberg-terminal knowledge and gets close-sounding codes wrong
// (e.g. sending "FA" for a 10-K request when 10-Ks live under "AR"/"CF").
const NAV_CODE_INFO: { code: string; label: string; use: string }[] = [
  { code: "DASH", label: "Launchpad", use: "the main multi-panel dashboard (watchlist, chart, quote, news, options, calendar)" },
  { code: "DES", label: "Description", use: "company profile, business summary & key stats" },
  { code: "FA", label: "Financials", use: "structured financial STATEMENTS ONLY — income statement, balance sheet, cash flow as a data table. This is NOT the actual filing document — do not use this for 10-K / annual report / 10-Q / proxy requests." },
  { code: "AR", label: "Annual Reports", use: "the actual SEC filings — 10-K annual report, 10-Q quarterly report, proxy statement, 8-K, and other EDGAR documents. Use this (not FA) whenever the user asks for a 10-K, annual report, quarterly report, or proxy statement." },
  { code: "CF", label: "Company Filings", use: "same SEC filings as AR (10-K/10-Q/proxy/8-K) — an alias of AR, equally correct for filing requests" },
  { code: "EE", label: "Estimates", use: "analyst estimates & consensus price targets" },
  { code: "OWN", label: "Ownership", use: "institutional, fund & insider ownership / holders" },
  { code: "COMP", label: "Comparables", use: "peer relative valuation table" },
  { code: "GP", label: "Price Chart", use: "candlestick price chart with technical overlays" },
  { code: "SIG", label: "Trade Signals", use: "technical/valuation/analyst signal dashboard" },
  { code: "N", label: "News", use: "top market news with sentiment (symbol-independent)" },
  { code: "CN", label: "Company News", use: "news filtered to one company" },
  { code: "DVD", label: "Dividends", use: "dividend & split history, yield, payout" },
  { code: "BRC", label: "Broker Research", use: "sell-side ratings actions, upgrades/downgrades, price targets" },
  { code: "SI", label: "Short Interest", use: "short interest, % of float, days-to-cover" },
  { code: "ESG", label: "ESG", use: "ESG & governance overview" },
  { code: "ETF", label: "ETF Analytics", use: "ETF holdings, sector weights, expense ratio" },
  { code: "HVG", label: "Historical Volatility", use: "realized volatility windows & rolling graph" },
  { code: "BETA", label: "Beta / Correlation", use: "beta, correlation & R² vs benchmarks" },
  { code: "GF", label: "Fundamental Graph", use: "revenue/income/margin/EPS/cash-flow trend charts" },
  { code: "HP", label: "Historical Prices", use: "daily OHLCV price history table" },
  { code: "PORT", label: "Portfolio", use: "simulated portfolio positions & P&L (symbol-independent)" },
  { code: "RISK", label: "Risk", use: "VaR, beta, drawdown & stress tests (symbol-independent)" },
  { code: "TRADE", label: "Paper Trading", use: "simulated order entry & blotter" },
  { code: "YCRV", label: "Yield Curve", use: "Treasury yield curve & bond calculator (symbol-independent)" },
  { code: "ECO", label: "Economic Calendar", use: "macro releases & calendar (symbol-independent)" },
  { code: "MKT", label: "Markets", use: "multi-asset market monitor (symbol-independent)" },
  { code: "WEI", label: "World Equity Indices", use: "global stock index board (symbol-independent)" },
  { code: "ALRT", label: "Alerts", use: "price alerts" },
  { code: "QUANT", label: "Quant Lab", use: "systematic research / backtesting roadmap (symbol-independent)" },
];
const NAV_CODES = NAV_CODE_INFO.map((c) => c.code) as unknown as readonly string[];
const NAV_CODE_MAP: Record<string, { label: string; use: string }> = Object.fromEntries(
  NAV_CODE_INFO.map((c) => [c.code, { label: c.label, use: c.use }])
);
const NAV_LEGEND = NAV_CODE_INFO.map((c) => `${c.code} = ${c.label}: ${c.use}`).join("\n");

// Common phrasings the model might emit that aren't exact enum values —
// enum constraints on function-calling args aren't always strictly enforced
// by every provider, so this gives a second chance instead of silently
// dropping the navigation.
const CODE_SYNONYMS: Record<string, string> = {
  "10-K": "AR", "10K": "AR", "10-Q": "AR", "10Q": "AR", "ANNUAL REPORT": "AR",
  "ANNUAL REPORTS": "AR", "QUARTERLY REPORT": "AR", "PROXY": "AR", "PROXY STATEMENT": "AR",
  "8-K": "AR", "8K": "AR", "FILING": "AR", "FILINGS": "AR", "SEC FILINGS": "AR", "SEC": "AR",
  "FINANCIAL STATEMENTS": "FA", "FINANCIALS": "FA", "INCOME STATEMENT": "FA", "BALANCE SHEET": "FA",
  "CASH FLOW": "FA", "CHART": "GP", "PRICE CHART": "GP", "NEWS": "N", "DIVIDENDS": "DVD",
  "OWNERSHIP": "OWN", "HOLDERS": "OWN", "ESTIMATES": "EE", "PEERS": "COMP", "COMPARABLES": "COMP",
  "SHORT INTEREST": "SI", "PORTFOLIO": "PORT", "YIELD CURVE": "YCRV", "ECONOMIC CALENDAR": "ECO",
  "MARKETS": "MKT", "INDICES": "WEI", "ALERTS": "ALRT", "DASHBOARD": "DASH", "LAUNCHPAD": "DASH",
};

const NAVIGATE_TOOL: ToolDef = {
  type: "function",
  function: {
    name: "navigate",
    description:
      "Switch the trading terminal's main screen to show a specific function, optionally for a specific ticker. " +
      "Call this whenever the user asks to see, open, pull up, or go to something, AND whenever the user asks a " +
      "'where can I find X' / 'where is X' / 'how do I see X' style question that maps to a specific screen — for " +
      "those, navigate them there directly instead of just describing it in words. Pick the code using the legend " +
      "below; pay special attention to AR/CF vs FA, which are commonly confused:\n" + NAV_LEGEND,
    parameters: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Ticker symbol, e.g. AAPL. Omit for symbol-independent codes like N, MKT, ECO, YCRV, WEI, QUANT, PORT, RISK.",
        },
        code: {
          type: "string",
          description: "Terminal function code to switch to — see the legend in the tool description.",
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
      "You have a `navigate` tool that switches the terminal's screen to a given function/ticker. Call it whenever " +
      "the user asks to see, open, or go to something (a report, chart, financials, news, etc.) — AND whenever they " +
      "ask a locational question like 'where can I find X', 'where is X', or 'how do I see X' that maps to a " +
      "specific screen; for those, navigate them there rather than only describing it in words. Read the tool's code " +
      "legend carefully — codes that sound similar (like AR vs FA) mean different things in this app, and picking the " +
      "wrong one sends the user to an empty or wrong screen. Otherwise just answer directly and concisely. If you " +
      "don't have real data for a claim, say so rather than guessing. " +
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
      const rawCode = String(result.toolCall.arguments.code ?? "").toUpperCase().trim();
      const sym = result.toolCall.arguments.symbol ? String(result.toolCall.arguments.symbol).toUpperCase().trim() : undefined;
      // Accept exact matches; fall back to a synonym table for near-misses
      // (models don't always respect the enum strictly) before giving up.
      const code = NAV_CODES.includes(rawCode) ? rawCode : CODE_SYNONYMS[rawCode];
      if (code && NAV_CODES.includes(code)) {
        navigate = { symbol: sym, code };
        // Always construct the confirmation deterministically from our own
        // code legend rather than trusting the model's freeform prose — this
        // guarantees the text the user reads can never contradict (or be
        // wrong about) the screen that actually opens.
        const info = NAV_CODE_MAP[code];
        text = `Opened **${code}**${info ? ` (${info.label})` : ""}${sym ? ` for ${sym}` : ""}${info ? ` — ${info.use}.` : "."}`;
      }
    }
    if (!text) text = "Sorry, I couldn't work out how to help with that — could you rephrase?";

    res.json({ text, navigate });
  } catch (err: any) {
    handleErr(res, err);
  }
});

export default router;
