# Trading Terminal (Local Bloomberg Terminal Clone)

A terminal-style financial dashboard you run locally on **macOS or Windows**.
React + TypeScript + Vite front end, a small Express proxy back end, live market
data from Yahoo Finance (no key required), plus optional Finnhub / Alpha Vantage.

![functions](https://img.shields.io/badge/functions-23-ff6600) ![node](https://img.shields.io/badge/node-18%2B-ffaa00)

## The function/command system

Like the real terminal, the app is driven by **function codes**. Type into the
command bar (press `/` to focus it) and hit `Enter`:

- `AAPL` — load a ticker into the current security function
- `AAPL FA` — load Apple and jump to its financial statements
- `GP`, `EQS`, `PORT`, `YCRV` … — jump to a function (keeps the current ticker)

You can also click any code in the **function bar** below the command line.
Autocomplete suggests both tickers and functions with arrow-key selection.

### FUNC — the function directory

The bar only pins functions that have live data. The full catalogue of
**~140 real Bloomberg mnemonics** (DES, HP, EE, ERN, ANR, WEI, FXC, YAS, CDSW,
SWPM, EMSX, MBS, BI, ALTD, …) lives behind **`FUNC`** (the ☰ button) — a
searchable directory where every function is tagged:

- **LIVE** — backed by a real free data source and rendered as a working view
  (~34 functions).
- **NO PUBLIC DATA** — proprietary/licensed Bloomberg content (broker research,
  Level-2 depth, CDS marks, BI research, alt-data, …). These render an honest
  stub explaining *what it is*, *why it isn't available here*, and the *closest
  free alternative* — never fabricated numbers.

Type any code (e.g. `BRC`, `CDS`, `SWPM`) into the command bar to jump to it.
The pinned, always-live functions are:

### News engine (`N` / `CN`)

A background aggregator on the server polls **~30 free sources every 90 seconds**
and keeps a deduped, in-memory store (snapshotted to `news-cache.json` so it
survives restarts). The UI pulls from that store every ~12s, so new stories
surface within seconds.

- **Sources** — ~66 feeds: CNBC, MarketWatch, Investing.com, Yahoo Finance,
  Nasdaq, BBC, Guardian, Fortune, Business Insider, Seeking Alpha, Forbes, NYT,
  The Economist; CoinDesk/Cointelegraph (crypto); Federal Reserve & ECB
  (economist statements); arXiv q-fin/econ & NBER (research); Bloomberg/CNBC/
  Yahoo YouTube (video); plus targeted Google News queries for hedge-fund moves,
  activist investors, 13F filings and broad-web coverage — in practice
  **300+ distinct outlets** flow through.
- **Content types** — articles, research papers, videos (with thumbnails), and
  **specialized** statements, filterable by All / Markets / Crypto / Economy /
  Funds & Investors / Research / Video / Specialized.
- **Specialized tab** — statements, interviews and quotes from the biggest
  players (Buffett, Musk, Dimon, Powell, Huang, Cook, Wood, Dalio, Ackman, Icahn,
  Burry, Griffin, Fink, Altman, …). A row of player chips filters to one person;
  every specialized item carries a clickable 🎤 name chip.
- **Per-stock search** — type a ticker into the search box (or use `AAPL CN`, or
  click a ticker chip on any story) to pull that symbol's news live from Yahoo's
  per-symbol feed + Google News.
- **Categorisation** — each item shows a sentiment arrow (▲ bullish / ▼ bearish /
  ● neutral, a keyword heuristic), a type icon (📰/🎓/▶/🎤), detected ticker chips,
  source and time. A `NEW` badge flags just-ingested items; 🔥 marks stories
  carried by **3+ distinct outlets** (cross-source traction).
- **Retention** — plain news articles are kept **3 months** (high-traction ones
  ~1 year); research, video and specialized content are kept up to **5 years**.
  (RSS feeds only surface recent items, so the long-tail back-catalogue fills in
  as the terminal runs.)

> Note: "every second" isn't used — it would get the free sources rate-limited.
> 90s server aggregation + 12s client polling gives a near-live feel safely.
> The cadence is tunable in `server/src/newsEngine.ts` (`INTERVAL_MS`).

### AI features (Claude)

Two AI surfaces, both powered by the Anthropic API (Claude, default
`claude-opus-4-8` with adaptive thinking) and **gated on `ANTHROPIC_API_KEY`**:

- **`AI` — AI analyst** (per stock): assembles the company's fundamentals, 5-year
  financial statements, ownership, peers and recent news, then generates a
  structured investment brief — what it does, strategy, financial trajectory,
  who's buying, valuation vs peers, catalysts, bull/bear case, risks, bottom
  line — plus a **chat box** to ask follow-ups grounded in that data.
- **`N` → ✦ AI Summary**: summarises the currently-displayed news feed (or a
  per-stock / per-player slice) into TL;DR, key themes, notable movers and tone.

Without a key, both show a clear "AI disabled — set `ANTHROPIC_API_KEY`" notice
and **every other feature works unchanged**. The server streams responses
internally (so long analyses don't time out) and caches the system prompt.
AI calls bill against your Anthropic account; set `ANTHROPIC_MODEL=claude-sonnet-4-6`
(or `claude-haiku-4-5`) in `.env` for lower cost. Output is AI-generated from
public data, **not financial advice**.

### Functions

| Group | Code | What it shows |
| --- | --- | --- |
| **Monitor** | `FUNC` | Function directory — browse/search all ~140 functions |
| | `DASH` | Launchpad — the multi-panel dashboard (watchlist, chart, quote, options, news, calendar) |
| | `MKT` | Multi-asset monitor: equity/sector ETFs, fixed income, FX, commodities & futures, crypto |
| | `WEI` | World equity indices board (S&P, Dow, FTSE, DAX, Nikkei, Hang Seng, …) |
| | `FXC` | Currency monitor — major FX crosses + dollar index |
| | `N` | News & intelligence — ~30 live sources, per-stock search, sentiment & type icons (see below) |
| | `ALRT` | Price alerts (browser notifications) checked against live quotes |
| **Security** | `DES` | Company description, profile, executives, key statistics |
| | `HP` | Historical daily prices (OHLCV) with day-over-day % change |
| | `GP` | Advanced charting: candles, volume, SMA/EMA/Bollinger, RSI & MACD panes, multi-security compare |
| | `SIG` | **Trade signals dashboard** — composite buy/sell verdict from technicals (trend, MA crosses, RSI, MACD, Bollinger, 52W position) + analyst consensus, valuation/quality stats, key levels (ATR stop), and an interactive risk/reward + position-size calculator |
| | `AI` | **AI analyst (Claude)** — generated investment brief (business, strategy, 5-yr financials, who's buying, valuation vs peers, bull/bear, risks) + a chat box to ask follow-ups. Requires `ANTHROPIC_API_KEY` |
| | `FA` | Financial statements (income, balance sheet, cash flow) — annual & quarterly |
| | `EE` | Analyst ratings, price targets, earnings history & forward estimates |
| | `OWN` | Institutional holders, ownership breakdown, insider transactions |
| | `COMP` | Relative valuation vs peers |
| | `ESG` | ESG scores (honest "data source unavailable" state — see limitations) |
| **Markets** | `EQS` | Equity screener (Yahoo predefined screens + client-side factor filters) |
| | `YCRV` | US Treasury yield curve + bond analytics calculator (price/YTM/duration/convexity/DV01) |
| | `ECO` | Global macro monitor + economic calendar |
| **Portfolio** | `PORT` | Positions, market value, P&L, allocation |
| | `RISK` | VaR (95/99%), beta, volatility, max drawdown, Sharpe, stress scenarios |
| | `TRADE` | Paper-trading order entry & blotter (simulated fills at the live price) |
| **Restricted** | `DEPTH` `EXEC` `CDS` `MBS` `BI` `ALTD` | Honest stubs — features that need a licensed data feed (see below) |

Portfolio, watchlists, paper orders and alerts persist to `localStorage`.
Failed requests show a red `DATA UNAVAILABLE` badge instead of crashing, and the
server caches upstream responses for 60s to protect free API tiers.

## What's real vs. what's a stub

Everything is backed by **real data from Yahoo Finance** (quotes, charts,
options, fundamentals, financial statements, ownership, peers, screener, treasury
yields) and Finnhub/CNBC for news. Risk analytics and paper-trading P&L are
computed from real price history (paper fills are clearly labelled SIMULATED).

The following require a **licensed data feed** and render an honest stub
explaining what they are and the closest available alternative — no fabricated
numbers: Level-2 market depth/order book, live order routing & execution,
CDS/credit, MBS analytics, Bloomberg Intelligence research, and satellite/alt
data. ESG scores are unavailable because the data provider's `esgScores` module
is not exposed in this build.

## Prerequisites

- **Node.js 18 or newer** (`node --version`)
- npm 9+ (ships with Node)

## Setup

```bash
# 1. Install all dependencies (root + client + server workspaces)
npm install

# 2. Create your env file (optional — the app works without keys)
cp .env.example .env        # macOS / Linux
copy .env.example .env      # Windows (cmd)
```

### Getting free API keys (optional)

The app runs with **no keys** — quotes, charts and options come from Yahoo
Finance, and news falls back to a public RSS feed. For better news (and a quote
fallback), add free keys to `.env`:

| Service           | Free tier            | Get a key                                            |
| ----------------- | -------------------- | ---------------------------------------------------- |
| **Finnhub**       | No credit card       | <https://finnhub.io> → dashboard → API key           |
| **Alpha Vantage** | 25 requests/day      | <https://www.alphavantage.co/support/#api-key>       |

```dotenv
# .env
PORT=3001
FINNHUB_API_KEY=your_finnhub_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
CACHE_TTL_SECONDS=60
```

> The `.env` file lives in the project root and is read by the Express server.

## Run

```bash
npm run dev
```

This uses `concurrently` to start **both** processes:

- Express API  → <http://localhost:3001>
- Vite client  → <http://localhost:5173>  ← open this in your browser

The Vite dev server proxies `/api/*` to the Express server, so there are no CORS
issues. All scripts use `cross-env` and contain no platform-specific shell
commands, so the exact same `npm run dev` works on macOS and Windows.

## Build for production

```bash
npm run build       # compiles the server (tsc) and bundles the client (vite)
npm run start       # runs the compiled Express server on $PORT
npm run preview     # preview the built client bundle
```

## Project structure

```
bloomberg-terminal/
├── client/                 # React + Vite front end
│   ├── src/
│   │   ├── components/      # CommandBar, FunctionBar, MarketOverviewBar, Panel,
│   │   │                    # WatchlistPanel, ChartPanel, QuoteDetailPanel,
│   │   │                    # NewsFeedPanel, OptionsChainPanel, EconomicCalendarPanel, ui
│   │   ├── views/           # one component per function: Launchpad, Markets, News,
│   │   │                    # Alerts, Description, Chart, Financials, Estimates,
│   │   │                    # Ownership, Peers, Esg, Screener, YieldCurve, Economic,
│   │   │                    # Portfolio, Risk, Trade, Restricted
│   │   ├── hooks/           # useQuote, useMarketData, usePolling, useAlertMonitor
│   │   ├── lib/             # api.ts (all API calls), format.ts, indicators.ts
│   │   ├── store.tsx        # shared portfolio / orders / alerts / watchlist state
│   │   ├── functions.ts     # function-code registry
│   │   ├── App.tsx          # command parser + view router
│   │   └── main.tsx
│   ├── index.html
│   └── vite.config.ts
├── server/                 # Express proxy + 60s in-memory cache
│   └── src/
│       ├── index.ts
│       ├── cache.ts
│       ├── yf.ts           # shared yahoo-finance2 v3 instance
│       └── routes/         # quote, chart, news, search, options, calendar,
│                           # fundamentals (+financials/ownership/peers), markets (screen/curve)
├── package.json            # npm workspaces + concurrently
├── .env.example
└── README.md
```

## Keyboard shortcuts

| Key            | Action                                    |
| -------------- | ----------------------------------------- |
| `/`            | Focus the command bar                     |
| `Enter`        | Load the typed / highlighted ticker       |
| `↑` / `↓`      | Move between watchlist rows (or suggestions) |
| `⌫` / `Delete` | Remove the selected watchlist ticker      |
| `Esc`          | Close the command-bar autocomplete        |

## Notes & limitations

- Data is "live-ish": quotes refresh every 30s and are cached server-side for
  60s. Yahoo Finance is unofficial and rate-limited — heavy use may throttle.
- The economic calendar generates the regular monthly US releases (NFP/CPI/FOMC)
  as approximate placeholders and merges real earnings dates from Yahoo; it is
  not an authoritative schedule.
- This project is for educational/personal use and is not affiliated with
  Bloomberg L.P.
