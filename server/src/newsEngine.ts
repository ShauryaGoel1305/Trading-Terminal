import axios from "axios";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── Types ────────────────────────────────────────────────────────────────
export type ArticleType = "article" | "research" | "video" | "specialized";
export type Sentiment = "bullish" | "bearish" | "neutral";

export interface Article {
  id: string;
  headline: string;
  source: string;
  url: string;
  datetime: number; // unix seconds (publish time)
  summary?: string;
  type: ArticleType;
  category: string; // markets | crypto | economy | funds | research | video | specialized | general
  topic?: string; // for specialized: the person/theme (e.g. "Warren Buffett")
  sentiment: Sentiment;
  tickers: string[];
  thumbnail?: string;
  firstSeen: number; // unix seconds we first ingested it
  lastSeen: number;
  seenCount: number; // total appearances across polls — info only
  sources: string[]; // DISTINCT outlets carrying this story — the traction signal
}

interface FeedSource {
  name: string;
  url: string;
  type: ArticleType;
  category: string;
  topic?: string;
}

// ── Feed catalogue ─────────────────────────────────────────────────────────
const gnews = (q: string, category: string, name = "Google News"): FeedSource => ({
  name,
  url: `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`,
  type: "article",
  category,
});

const yt = (channelId: string, name: string): FeedSource => ({
  name,
  url: `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
  type: "video",
  category: "video",
});

// Specialized: statements / interviews / quotes from a notable industry figure.
const person = (name: string, extra?: string): FeedSource => ({
  name: "Google News",
  url: `https://news.google.com/rss/search?q=${encodeURIComponent(`"${name}" ${extra ?? "(says OR interview OR statement OR comments OR warns OR predicts OR testimony)"}`)}&hl=en-US&gl=US&ceid=US:en`,
  type: "specialized",
  category: "specialized",
  topic: name,
});

// The "biggest players" whose remarks move markets.
export const PLAYERS = [
  "Warren Buffett", "Elon Musk", "Jamie Dimon", "Jerome Powell", "Jensen Huang",
  "Tim Cook", "Cathie Wood", "Ray Dalio", "Bill Ackman", "Carl Icahn",
  "Michael Burry", "Ken Griffin", "Larry Fink", "Satya Nadella", "Mark Zuckerberg",
  "Sundar Pichai", "Christine Lagarde", "Janet Yellen", "Stanley Druckenmiller", "David Tepper",
  "Howard Marks", "Mary Barra", "Sam Altman", "Mark Cuban",
];

const FEEDS: FeedSource[] = [
  // Markets / general business
  { name: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", type: "article", category: "markets" },
  { name: "CNBC Markets", url: "https://www.cnbc.com/id/20910258/device/rss/rss.html", type: "article", category: "markets" },
  { name: "CNBC Finance", url: "https://www.cnbc.com/id/10000664/device/rss/rss.html", type: "article", category: "markets" },
  { name: "MarketWatch", url: "http://feeds.marketwatch.com/marketwatch/topstories/", type: "article", category: "markets" },
  { name: "MarketWatch RT", url: "http://feeds.marketwatch.com/marketwatch/realtimeheadlines/", type: "article", category: "markets" },
  { name: "MarketWatch Pulse", url: "http://feeds.marketwatch.com/marketwatch/marketpulse/", type: "article", category: "markets" },
  { name: "Investing.com", url: "https://www.investing.com/rss/news.rss", type: "article", category: "markets" },
  { name: "Investing.com Mkts", url: "https://www.investing.com/rss/market_overview.rss", type: "article", category: "markets" },
  { name: "Nasdaq", url: "https://www.nasdaq.com/feed/rssoutbound?category=Markets", type: "article", category: "markets" },
  { name: "Business Insider", url: "https://markets.businessinsider.com/rss/news", type: "article", category: "markets" },
  { name: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex", type: "article", category: "markets" },
  { name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", type: "article", category: "general" },
  { name: "Guardian Business", url: "https://www.theguardian.com/business/rss", type: "article", category: "general" },
  { name: "Fortune", url: "https://fortune.com/feed/", type: "article", category: "general" },
  { name: "Seeking Alpha", url: "https://seekingalpha.com/market_currents.xml", type: "article", category: "markets" },
  { name: "Forbes Money", url: "https://www.forbes.com/money/feed/", type: "article", category: "markets" },
  { name: "The Economist", url: "https://www.economist.com/finance-and-economics/rss.xml", type: "article", category: "general" },
  { name: "NYT Business", url: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", type: "article", category: "general" },
  gnews("stock market trading earnings", "markets", "Reuters/AP Web"),
  gnews("S&P 500 Nasdaq Dow market today", "markets"),
  gnews("breaking financial markets news", "markets"),
  // Broader sector/topic coverage — same "markets" category, different slice
  // of the economy each poll, so the capped store holds a wider variety of
  // stories rather than more near-duplicate top-of-market headlines.
  gnews("semiconductor chip industry news", "markets"),
  gnews("artificial intelligence AI industry business", "markets"),
  gnews("energy oil gas OPEC market", "markets"),
  gnews("biotech pharmaceutical FDA drug approval", "markets"),
  gnews("retail consumer spending earnings", "markets"),
  gnews("bank financial sector regulation", "markets"),
  gnews("IPO merger acquisition deal", "markets"),
  gnews("real estate REIT housing market", "markets"),
  gnews("airline travel industry earnings", "markets"),
  gnews("automaker EV industry earnings", "markets"),

  // Crypto
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/", type: "article", category: "crypto" },
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss", type: "article", category: "crypto" },
  gnews("cryptocurrency bitcoin ethereum market", "crypto"),

  // Economy & central banks / economist statements
  { name: "Federal Reserve", url: "https://www.federalreserve.gov/feeds/press_all.xml", type: "article", category: "economy" },
  gnews("Federal Reserve economist statement interest rates", "economy"),
  gnews("ECB central bank monetary policy", "economy"),
  gnews("inflation CPI jobs report economy", "economy"),

  // Funds / hedge funds / big investors
  gnews("hedge fund move bet position", "funds"),
  gnews("activist investor stake company", "funds"),
  gnews("13F filing institutional investor", "funds"),
  gnews("billionaire investor bet portfolio", "funds"),
  gnews("private equity venture capital deal", "funds"),

  // Research papers / studies
  { name: "arXiv q-fin", url: "http://export.arxiv.org/api/query?search_query=cat:q-fin*&sortBy=submittedDate&sortOrder=descending&max_results=60", type: "research", category: "research" },
  { name: "arXiv econ", url: "http://export.arxiv.org/api/query?search_query=cat:econ*&sortBy=submittedDate&sortOrder=descending&max_results=40", type: "research", category: "research" },
  { name: "NBER", url: "https://www2.nber.org/rss/new.xml", type: "research", category: "research" },
  gnews("finance economics working paper study", "research", "Research Web"),
  gnews("market study report findings analysis", "research", "Research Web"),

  // Video
  yt("UCIALMKvObZNtJ6AmdCLP7Lg", "Bloomberg TV"),
  yt("UCEAZeUIeJs0IjQiqTCdVSIg", "Yahoo Finance"),
  yt("UCvJJ_dt2ZPg3TunHq0gd0wA", "CNBC"),
  yt("UCrp_UI8XtuYfpiqluWLD7Lw", "CNBC Television"),

  // Specialized: statements / interviews / quotes from the biggest players.
  ...PLAYERS.map((p) => person(p)),
];

// ── XML / RSS / Atom parsing (no extra deps) ─────────────────────────────────
const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'", "&#x27;": "'", "&nbsp;": " ", "&hellip;": "…",
};
function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&[a-z]+;|&#\d+;/g, (m) => ENTITIES[m] ?? m);
}
function clean(value: string): string {
  const m = value.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return decode((m ? m[1] : value)).trim();
}
function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? clean(m[1]) : "";
}
function stripHtml(s: string): string {
  return decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

interface RawItem { headline: string; url: string; datetime: number; summary: string; thumbnail?: string; source?: string }

function parseFeed(xml: string): RawItem[] {
  const isAtom = /<entry[\s>]/.test(xml) && !/<item[\s>]/.test(xml);
  const splitter = isAtom ? /<entry[\s>]/ : /<item[\s>]/;
  const blocks = xml.split(splitter).slice(1);
  const items: RawItem[] = [];

  for (const block of blocks.slice(0, 35)) {
    let headline = tag(block, "title");
    if (!headline) continue;

    // Link: RSS <link>…</link>, Atom <link href="…"/>
    let url = tag(block, "link");
    if (!url) {
      const href = block.match(/<link[^>]*href="([^"]+)"/i);
      if (href) url = decode(href[1]);
    }

    const pub = tag(block, "pubDate") || tag(block, "published") || tag(block, "updated") || tag(block, "dc:date");
    const datetime = pub ? Math.floor(new Date(pub).getTime() / 1000) : Math.floor(Date.now() / 1000);

    const rawSummary = tag(block, "description") || tag(block, "summary") || tag(block, "media:description") || tag(block, "content");
    const summary = stripHtml(rawSummary).slice(0, 200);

    // Thumbnail (YouTube / media RSS)
    const thumb = block.match(/<media:thumbnail[^>]*url="([^"]+)"/i) || block.match(/<media:content[^>]*url="([^"]+)"/i);
    const thumbnail = thumb ? decode(thumb[1]) : undefined;

    // Google News embeds the real publisher in <source>
    const srcMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    const source = srcMatch ? clean(srcMatch[1]) : undefined;

    // Google News appends " - Publisher" to titles — strip it so the same
    // story dedupes/merges across feeds (and powers cross-source traction).
    if (source && headline.toLowerCase().endsWith(` - ${source.toLowerCase()}`)) {
      headline = headline.slice(0, headline.length - (source.length + 3)).trim();
    }

    if (url) items.push({ headline, url, datetime, summary, thumbnail, source });
  }
  return items;
}

// ── Sentiment & ticker tagging ───────────────────────────────────────────────
const POS = ["beat", "beats", "surge", "surges", "jump", "jumps", "rise", "rises", "gain", "gains", "soar", "soars", "record", "upgrade", "growth", "profit", "rally", "rallies", "tops", "strong", "boost", "wins", "high", "bullish", "outperform", "raises", "approval", "breakthrough"];
const NEG = ["miss", "misses", "fall", "falls", "drop", "drops", "plunge", "plunges", "cut", "cuts", "loss", "losses", "decline", "slump", "downgrade", "lawsuit", "probe", "warn", "warns", "weak", "sink", "sinks", "fraud", "halt", "bearish", "underperform", "layoff", "layoffs", "bankruptcy", "selloff", "tumble", "crash", "default", "recall"];

function sentiment(text: string): Sentiment {
  const t = text.toLowerCase();
  let score = 0;
  for (const w of POS) if (t.includes(w)) score++;
  for (const w of NEG) if (t.includes(w)) score--;
  return score > 0 ? "bullish" : score < 0 ? "bearish" : "neutral";
}

const NAME_TO_TICKER: Record<string, string> = {
  apple: "AAPL", microsoft: "MSFT", nvidia: "NVDA", tesla: "TSLA", amazon: "AMZN", alphabet: "GOOGL", google: "GOOGL",
  "meta platforms": "META", facebook: "META", netflix: "NFLX", "berkshire": "BRK-B", "jpmorgan": "JPM", "goldman sachs": "GS",
  "bank of america": "BAC", "wells fargo": "WFC", walmart: "WMT", "exxon": "XOM", chevron: "CVX", boeing: "BA", disney: "DIS",
  intel: "INTC", "advanced micro": "AMD", amd: "AMD", "coinbase": "COIN", "palantir": "PLTR", "broadcom": "AVGO", oracle: "ORCL",
  pfizer: "PFE", "eli lilly": "LLY", visa: "V", mastercard: "MA", "ford motor": "F", "general motors": "GM", starbucks: "SBUX",
  "micron": "MU", "qualcomm": "QCOM", "salesforce": "CRM", "uber": "UBER", "airbnb": "ABNB", "paypal": "PYPL", bitcoin: "BTC-USD", ethereum: "ETH-USD",
};

function detectTickers(text: string): string[] {
  const set = new Set<string>();
  for (const m of text.matchAll(/\$([A-Z]{1,5})\b/g)) set.add(m[1]);
  const lower = text.toLowerCase();
  for (const [name, ticker] of Object.entries(NAME_TO_TICKER)) {
    if (lower.includes(name)) set.add(ticker);
  }
  return [...set].slice(0, 5);
}

// ── Store ────────────────────────────────────────────────────────────────
const DAY = 86_400;
// Per-type retention: plain news articles kept 3 months; every other form
// (research, video, specialized) kept up to 5 years.
const ARTICLE_RETENTION = 45 * DAY; // 1.5 months — was 3mo; MAX_ARTICLES cap still applies on top
const LONG_RETENTION = 1825 * DAY; // 5 years (low-volume research/video/specialized feeds)
const MAJOR_ARTICLE_RETENTION = 180 * DAY; // high-traction articles kept 6 months (was 1yr)
const MAJOR_THRESHOLD = 3; // carried by ≥3 distinct outlets
// Lowered from 25000 — the dominant server RAM consumer was this in-memory
// store; a smaller hard cap plus the trimmed summary length below (260→200
// chars) meaningfully cuts steady-state memory on a RAM-constrained host.
const MAX_ARTICLES = 8000;
// Resolve relative to this file (like env.ts does), NOT process.cwd() — cwd
// differs between `npm run dev` (repo root) and running inside the `server`
// workspace, which previously produced two divergent snapshot files.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_FILE = path.resolve(__dirname, "../news-cache.json");

const store = new Map<string, Article>();
let lastRefresh = 0;
let refreshing = false;

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 120);
}

function toArticle(raw: RawItem, feed: FeedSource): Article {
  const now = Math.floor(Date.now() / 1000);
  const text = `${raw.headline} ${raw.summary ?? ""}`;
  return {
    id: normalizeTitle(raw.headline) || raw.url,
    headline: raw.headline,
    source: raw.source || feed.name,
    url: raw.url,
    datetime: raw.datetime || now,
    summary: raw.summary,
    type: feed.type,
    category: feed.category,
    topic: feed.topic,
    sentiment: sentiment(text),
    tickers: detectTickers(text),
    thumbnail: raw.thumbnail,
    firstSeen: now,
    lastSeen: now,
    seenCount: 1,
    sources: [raw.source || feed.name],
  };
}

function upsert(articles: Article[]) {
  for (const a of articles) {
    const existing = store.get(a.id);
    if (existing) {
      existing.lastSeen = a.lastSeen;
      existing.seenCount += 1;
      // Merge newly-detected tickers, thumbnail and any NEW distinct source.
      for (const t of a.tickers) if (!existing.tickers.includes(t)) existing.tickers.push(t);
      for (const s of a.sources) if (!existing.sources.includes(s)) existing.sources.push(s);
      if (!existing.thumbnail && a.thumbnail) existing.thumbnail = a.thumbnail;
    } else {
      store.set(a.id, a);
    }
  }
}

// A story is "major" when several DISTINCT outlets carry near-identical
// headlines — genuine cross-source traction, not just poll persistence.
function isMajor(a: Article): boolean {
  return (a.sources?.length ?? 1) >= MAJOR_THRESHOLD;
}

function retentionFor(a: Article): number {
  if (a.type !== "article") return LONG_RETENTION; // research / video / specialized
  return isMajor(a) ? MAJOR_ARTICLE_RETENTION : ARTICLE_RETENTION;
}

function prune() {
  const now = Math.floor(Date.now() / 1000);
  for (const [id, a] of store) {
    const horizon = retentionFor(a);
    if (now - a.datetime > horizon && now - a.firstSeen > horizon) store.delete(id);
  }
  // Hard cap: drop the oldest beyond MAX_ARTICLES.
  if (store.size > MAX_ARTICLES) {
    const sorted = [...store.values()].sort((x, y) => x.datetime - y.datetime);
    for (const a of sorted.slice(0, store.size - MAX_ARTICLES)) store.delete(a.id);
  }
}

// ── Disk snapshot ────────────────────────────────────────────────────────
async function snapshot() {
  try {
    const arr = [...store.values()].sort((a, b) => b.datetime - a.datetime).slice(0, MAX_ARTICLES);
    await fs.writeFile(SNAPSHOT_FILE, JSON.stringify(arr), "utf8");
  } catch {
    /* best-effort */
  }
}
async function loadSnapshot() {
  try {
    const text = await fs.readFile(SNAPSHOT_FILE, "utf8");
    const arr = JSON.parse(text) as Article[];
    for (const a of arr) {
      if (!a?.id) continue;
      if (!Array.isArray(a.sources)) a.sources = [a.source].filter(Boolean);
      if (!Array.isArray(a.tickers)) a.tickers = [];
      store.set(a.id, a);
    }
    prune();
    console.log(`  ▌ News: restored ${store.size} articles from snapshot`);
  } catch {
    /* no snapshot yet */
  }
}

// ── Fetching ─────────────────────────────────────────────────────────────
async function fetchFeed(feed: FeedSource): Promise<Article[]> {
  const { data } = await axios.get<string>(feed.url, {
    timeout: 9_000,
    responseType: "text",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; BBGTerminalClone/1.0)" },
  });
  return parseFeed(data).map((raw) => toArticle(raw, feed));
}

export async function refreshAll(): Promise<void> {
  if (refreshing) return;
  refreshing = true;
  try {
    const results = await Promise.allSettled(FEEDS.map((f) => fetchFeed(f)));
    let ok = 0;
    for (const r of results) {
      if (r.status === "fulfilled") {
        upsert(r.value);
        ok++;
      }
    }
    prune();
    lastRefresh = Date.now();
    await snapshot();
    console.log(`  ▌ News: refreshed ${ok}/${FEEDS.length} feeds · ${store.size} stored`);
  } finally {
    refreshing = false;
  }
}

// ── Per-symbol live fetch (not stored — fetched on demand, cached by route) ──
export async function fetchSymbolNews(symbol: string): Promise<Article[]> {
  const sym = symbol.toUpperCase();
  const sources: FeedSource[] = [
    { name: "Yahoo Finance", url: `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(sym)}&region=US&lang=en-US`, type: "article", category: "markets" },
    gnews(`${sym} stock`, "markets"),
    gnews(`${sym} earnings analyst`, "markets"),
  ];
  const results = await Promise.allSettled(sources.map((f) => fetchFeed(f)));
  const merged = new Map<string, Article>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const a of r.value) {
      if (!a.tickers.includes(sym)) a.tickers.unshift(sym);
      const ex = merged.get(a.id);
      if (ex) {
        ex.seenCount++;
        for (const s of a.sources) if (!ex.sources.includes(s)) ex.sources.push(s);
      } else merged.set(a.id, a);
    }
  }
  // Also include anything already in the store tagged with this ticker.
  for (const a of store.values()) if (a.tickers.includes(sym) && !merged.has(a.id)) merged.set(a.id, a);
  return [...merged.values()].sort((a, b) => b.datetime - a.datetime).slice(0, 60);
}

// ── Query ──────────────────────────────────────────────────────────────────
export interface QueryOpts { category?: string; type?: string; topic?: string; limit?: number }

export function queryNews({ category, type, topic, limit = 120 }: QueryOpts): Article[] {
  let arr = [...store.values()];
  if (type && type !== "all") arr = arr.filter((a) => a.type === type);
  if (category && category !== "all" && category !== "general") arr = arr.filter((a) => a.category === category);
  if (topic) arr = arr.filter((a) => a.topic === topic);
  arr.sort((a, b) => b.datetime - a.datetime);
  return arr.slice(0, limit);
}

// The list of specialized "big players" available for filtering.
export function listPlayers(): string[] {
  return [...PLAYERS];
}

export function newsStatus() {
  const bySource: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  let major = 0;
  for (const a of store.values()) {
    bySource[a.source] = (bySource[a.source] ?? 0) + 1;
    byCategory[a.category] = (byCategory[a.category] ?? 0) + 1;
    if (isMajor(a)) major++;
  }
  return {
    total: store.size,
    major,
    lastRefresh,
    feeds: FEEDS.length,
    sources: Object.keys(bySource).length,
    bySource,
    byCategory,
  };
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
const INTERVAL_MS = 90_000; // gentle 90s aggregation

export async function startNews() {
  await loadSnapshot();
  refreshAll().catch((e) => console.error("News refresh failed:", e?.message));
  setInterval(() => refreshAll().catch((e) => console.error("News refresh failed:", e?.message)), INTERVAL_MS);
}
