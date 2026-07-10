import type {
  FilingsResponse,
  BrokerResearchResponse,
  DividendsResponse,
  EtfResponse,
  VolatilityResponse,
  BetaResponse,
} from "../types";
import type {
  Quote,
  ChartResponse,
  NewsItem,
  SearchResult,
  OptionsResponse,
  CalendarEvent,
  Timeframe,
  Fundamentals,
  Financials,
  Ownership,
  PeerQuote,
  ScreenResult,
  YieldCurve,
  NewsStatus,
} from "../types";

const BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.error ?? body.message ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const b = await res.json();
      detail = b.message ?? b.error ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  quote: (symbol: string) => get<Quote>(`/quote/${encodeURIComponent(symbol)}`),
  quotes: (symbols: string[]) =>
    get<Quote[]>(`/quote?symbols=${encodeURIComponent(symbols.join(","))}`),
  chart: (symbol: string, timeframe: Timeframe) =>
    get<ChartResponse>(`/chart/${encodeURIComponent(symbol)}?timeframe=${timeframe}`),
  news: (opts: { category?: string; type?: string; topic?: string; symbol?: string; limit?: number } = {}) => {
    const p = new URLSearchParams();
    if (opts.category) p.set("category", opts.category);
    if (opts.type) p.set("type", opts.type);
    if (opts.topic) p.set("topic", opts.topic);
    if (opts.symbol) p.set("symbol", opts.symbol);
    if (opts.limit) p.set("limit", String(opts.limit));
    const qs = p.toString();
    return get<NewsItem[]>(`/news${qs ? `?${qs}` : ""}`);
  },
  newsStatus: () => get<NewsStatus>("/news/status"),
  newsPlayers: () => get<string[]>("/news/players"),
  search: (q: string) => get<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`),
  options: (symbol: string, date?: number) =>
    get<OptionsResponse>(
      `/options/${encodeURIComponent(symbol)}${date ? `?date=${date}` : ""}`
    ),
  calendar: (symbol?: string) =>
    get<CalendarEvent[]>(`/calendar${symbol ? `?symbol=${encodeURIComponent(symbol)}` : ""}`),
  fundamentals: (symbol: string) =>
    get<Fundamentals>(`/fundamentals/${encodeURIComponent(symbol)}`),
  financials: (symbol: string, type: "annual" | "quarterly") =>
    get<Financials>(`/financials/${encodeURIComponent(symbol)}?type=${type}`),
  ownership: (symbol: string) => get<Ownership>(`/ownership/${encodeURIComponent(symbol)}`),
  peers: (symbol: string) => get<{ symbol: string; peers: PeerQuote[] }>(`/peers/${encodeURIComponent(symbol)}`),
  screens: () => get<{ id: string; label: string }[]>("/screens"),
  screen: (id: string) =>
    get<{ id: string; title: string; results: ScreenResult[] }>(`/screen/${encodeURIComponent(id)}`),
  curve: () => get<YieldCurve>("/curve"),
  health: () => get<{ ok: boolean; finnhub: boolean; alphaVantage: boolean; ai: boolean }>("/health"),

  // ── AI (DeepSeek) ────────────────────────────────────────────────────
  aiStatus: () => get<{ enabled: boolean; model: string }>("/ai/status"),
  aiNewsSummary: (opts: { symbol?: string; category?: string; type?: string; topic?: string }) =>
    post<{ text: string }>("/ai/news-summary", opts),
  aiAnalyze: (symbol: string, data: unknown) => post<{ text: string }>("/ai/analyze", { symbol, data }),
  aiChat: (opts: { symbol?: string; context?: unknown; messages: { role: "user" | "assistant"; content: string }[] }) =>
    post<{ text: string }>("/ai/chat", opts),

  // ── SEC EDGAR filings ────────────────────────────────────────────────
  filings: (symbol: string) => get<FilingsResponse>(`/filings/${symbol}`),

  // ── Broker research (sell-side actions) ──────────────────────────────
  brokerResearch: (symbol: string) =>
    get<BrokerResearchResponse>(`/broker-research/${encodeURIComponent(symbol)}`),

  // ── Dividends & splits (DVD / CACS) ──────────────────────────────────
  dividends: (symbol: string) =>
    get<DividendsResponse>(`/dividends/${encodeURIComponent(symbol)}`),

  // ── Analytics (ETF / HVG / BETA) ─────────────────────────────────────
  etf: (symbol: string) => get<EtfResponse>(`/etf/${encodeURIComponent(symbol)}`),
  volatility: (symbol: string) => get<VolatilityResponse>(`/volatility/${encodeURIComponent(symbol)}`),
  beta: (symbol: string) => get<BetaResponse>(`/beta/${encodeURIComponent(symbol)}`),
};
