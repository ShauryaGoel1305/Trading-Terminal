import "dotenv/config";
import express from "express";
import cors from "cors";

import quote from "./routes/quote.js";
import chart from "./routes/chart.js";
import news from "./routes/news.js";
import search from "./routes/search.js";
import options from "./routes/options.js";
import calendar from "./routes/calendar.js";
import fundamentals from "./routes/fundamentals.js";
import markets from "./routes/markets.js";
import ai from "./routes/ai.js";
import filings from "./routes/filings.js";
import broker from "./routes/broker.js";
import dividends from "./routes/dividends.js";
import analytics from "./routes/analytics.js";
import { startNews } from "./newsEngine.js";
import { aiEnabled } from "./ai.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(cors());
app.use(express.json());

// Light request logging
app.use((req, _res, next) => {
  if (req.path.startsWith("/api")) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    finnhub: Boolean(process.env.FINNHUB_API_KEY),
    alphaVantage: Boolean(process.env.ALPHA_VANTAGE_API_KEY),
    ai: aiEnabled(),
  });
});

app.use("/api/quote", quote);
app.use("/api/chart", chart);
app.use("/api/news", news);
app.use("/api/search", search);
app.use("/api/options", options);
app.use("/api/calendar", calendar);
app.use("/api", fundamentals);
app.use("/api", markets);
app.use("/api/ai", ai);
app.use("/api/filings", filings);
app.use("/api/broker-research", broker);
app.use("/api/dividends", dividends);
app.use("/api", analytics);

app.use("/api", (_req, res) => res.status(404).json({ error: "NOT_FOUND" }));

app.listen(PORT, () => {
  console.log(`\n  ▌ Bloomberg Terminal API listening on http://localhost:${PORT}`);
  console.log(`  ▌ Finnhub key: ${process.env.FINNHUB_API_KEY ? "set" : "NOT set (using multi-source RSS for news)"}`);
  console.log(`  ▌ Alpha Vantage key: ${process.env.ALPHA_VANTAGE_API_KEY ? "set" : "NOT set (Yahoo only)"}`);
  console.log(`  ▌ Anthropic key: ${process.env.ANTHROPIC_API_KEY ? `set (AI enabled, model ${process.env.ANTHROPIC_MODEL || "claude-opus-4-8"})` : "NOT set (AI features disabled)"}\n`);
  // Start the background news aggregator (multi-source, 90s cadence).
  startNews().catch((e) => console.error("News engine failed to start:", e?.message));
});
