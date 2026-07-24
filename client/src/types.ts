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
  source: string;
  error?: boolean;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartResponse {
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
}

export type Timeframe = "1D" | "5D" | "1M" | "3M" | "6M" | "1Y" | "5Y";

export type ArticleType = "article" | "research" | "video" | "specialized";
export type NewsSentiment = "bullish" | "bearish" | "neutral";

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  url: string;
  datetime: number;
  summary?: string;
  type?: ArticleType;
  category?: string;
  topic?: string;
  sentiment?: NewsSentiment;
  tickers?: string[];
  thumbnail?: string;
  firstSeen?: number;
  seenCount?: number;
  sources?: string[];
}

export interface NewsStatus {
  total: number;
  major: number;
  lastRefresh: number;
  feeds: number;
  sources: number;
  bySource: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export interface OptionRow {
  contractSymbol: string;
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  inTheMoney: boolean;
}

export interface OptionsResponse {
  symbol: string;
  underlyingPrice: number | null;
  expirationDates: number[];
  selectedExpiration: number | null;
  calls: OptionRow[];
  puts: OptionRow[];
}

export interface CalendarEvent {
  date: string;
  time?: string;
  event: string;
  category: "FOMC" | "CPI" | "NFP" | "EARNINGS" | "GDP";
  impact: "high" | "medium" | "low";
}

export interface Fundamentals {
  symbol: string;
  profile: {
    name: string;
    sector: string | null;
    industry: string | null;
    website: string | null;
    country: string | null;
    city: string | null;
    state: string | null;
    employees: number | null;
    summary: string | null;
    officers: { name: string; title: string; pay: number | null; age: number | null }[];
  };
  stats: Record<string, number | null>;
  analyst: {
    targetMean: number | null;
    targetHigh: number | null;
    targetLow: number | null;
    recommendationKey: string | null;
    numberOfAnalysts: number | null;
    currentPrice: number | null;
  };
  recommendationTrend: {
    period: string;
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
  }[];
  earningsHistory: {
    quarter: string;
    period: string;
    epsActual: number | null;
    epsEstimate: number | null;
    surprisePercent: number | null;
  }[];
  earningsTrend: {
    period: string;
    endDate: string;
    growth: number | null;
    epsAvg: number | null;
    epsLow: number | null;
    epsHigh: number | null;
    epsAnalysts: number | null;
    revenueAvg: number | null;
  }[];
  nextEarningsDate: string | null;
}

export interface StatementLine {
  key: string;
  label: string;
  values: (number | null)[];
}

export interface Financials {
  symbol: string;
  type: "annual" | "quarterly";
  periods: string[];
  income: StatementLine[];
  balance: StatementLine[];
  cashflow: StatementLine[];
}

export interface Ownership {
  symbol: string;
  breakdown: {
    insidersPercentHeld: number | null;
    institutionsPercentHeld: number | null;
    institutionsFloatPercentHeld: number | null;
    institutionsCount: number | null;
  };
  institutions: {
    organization: string;
    pctHeld: number;
    position: number;
    value: number;
    pctChange: number;
    reportDate: string;
  }[];
  funds: { organization: string; pctHeld: number; position: number; value: number }[];
  insiders: {
    name: string;
    relation: string;
    text: string;
    shares: number;
    value: number;
    date: string;
  }[];
}

export interface PeerQuote {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  marketCap: number | null;
  trailingPE: number | null;
  forwardPE: number | null;
  priceToBook: number | null;
  isBase: boolean;
}

export interface ScreenResult {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  volume: number | null;
  marketCap: number | null;
  trailingPE: number | null;
}

export interface CurvePoint {
  label: string;
  months: number;
  yield: number | null;
  change: number | null;
}

export interface YieldCurve {
  asOf: number;
  points: CurvePoint[];
}

// ── SEC EDGAR Filings ────────────────────────────────────────────────────
export interface FilingItem {
  form: string;
  filingDate: string;
  reportDate: string;
  accessionNumber: string;
  description: string;
  primaryDocument: string;
  url: string | null;
  indexUrl: string;
  isPdf: boolean;
  isHtml: boolean;
}

export interface FilingsResponse {
  symbol: string;
  cik: number;
  companyName: string;
  edgarPage: string;
  annual: FilingItem[];
  quarterly: FilingItem[];
  proxy: FilingItem[];
  events: FilingItem[];
  esgForms: FilingItem[];
}

// ── Broker Research (BRC) ───────────────────────────────────────────────
export interface BrokerAction {
  firm: string;
  fromGrade: string;
  toGrade: string;
  action: string;
  kind: "upgrade" | "downgrade" | "initiate" | "maintain";
  date: string | null;
}

export interface BrokerResearchResponse {
  symbol: string;
  companyName: string;
  summary: {
    totalActions: number;
    coveringFirms: number;
    upgrades90d: number;
    downgrades90d: number;
    initiations90d: number;
    actions90d: number;
  };
  targets: {
    current: number | null;
    mean: number | null;
    median: number | null;
    high: number | null;
    low: number | null;
    recommendationKey: string | null;
    recommendationMean: number | null;
    numberOfAnalysts: number | null;
  };
  coverage: BrokerAction[];
  actions: BrokerAction[];
  recommendationTrend: {
    period: string;
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
  }[];
}

// ── Dividends & Splits (DVD / CACS) ─────────────────────────────────────
export interface DividendItem {
  date: string;
  amount: number;
}
export interface SplitItem {
  date: string;
  numerator: number;
  denominator: number;
  ratio: string;
}
export interface DividendsResponse {
  symbol: string;
  companyName: string;
  summary: {
    dividendRate: number | null;
    dividendYield: number | null;
    payoutRatio: number | null;
    fiveYearAvgYield: number | null;
    exDividendDate: string | null;
    lastDividendValue: number | null;
    lastDividendDate: string | null;
    ttmDividend: number | null;
    growth1y: number | null;
    cagr5y: number | null;
    totalDividends: number;
    totalSplits: number;
    firstDividendDate: string | null;
  };
  dividends: DividendItem[];
  splits: SplitItem[];
}

// ── ETF analytics (ETF) ─────────────────────────────────────────────────
export interface EtfResponse {
  symbol: string;
  name: string;
  isEtf: boolean;
  category: string | null;
  family: string | null;
  legalType: string | null;
  expenseRatio: number | null;
  netAssets: number | null;
  yield: number | null;
  allocation: {
    stock: number | null;
    bond: number | null;
    cash: number | null;
    preferred: number | null;
    convertible: number | null;
    other: number | null;
  };
  holdings: { symbol: string; name: string; weight: number }[];
  sectors: { sector: string; weight: number }[];
}

// ── Historical volatility (HVG) ─────────────────────────────────────────
export interface VolatilityResponse {
  symbol: string;
  current: number;
  windows: { days: number; vol: number }[];
  current30: number | null;
  min30: number | null;
  max30: number | null;
  avg30: number | null;
  priceHigh: number;
  priceLow: number;
  series: { date: string; vol: number }[];
}

// ── Beta / correlation (BETA) ───────────────────────────────────────────
export interface BetaResponse {
  symbol: string;
  observations1y: number;
  benchmarks: {
    symbol: string;
    label: string;
    beta1y: number | null;
    corr1y: number | null;
    r2_1y: number | null;
    beta3y: number | null;
    corr3y: number | null;
  }[];
}

// ── 13F Filings (F13) ────────────────────────────────────────────────────
export interface ThirteenFResponse {
  symbol: string;
  companyName: string;
  managers: { manager: string; cik: number; filingDate: string; periodEnding: string; indexUrl: string }[];
}

// ── Macro data (GDP / CPI / FOMC / CENB via FRED) ───────────────────────
export interface FredPoint { date: string; value: number }
export interface GdpResponse {
  real: (FredPoint & { qoqAnnualized: number | null; yoy: number | null })[];
  nominal: FredPoint[];
}
export interface CpiResponse {
  series: (FredPoint & { yoy: number | null })[];
}
export interface FomcResponse {
  series: FredPoint[];
  latest: number | null;
  latestDate: string | null;
  changeVsPriorMonth: number | null;
}
export interface CenbResponse {
  banks: { bank: string; proxy: string; exact: boolean; latest: FredPoint | null }[];
}

// ── Client-side persisted state (portfolio, alerts, watchlists) ─────────
export interface Position {
  symbol: string;
  qty: number;
  costBasis: number; // average price paid
}

export interface Alert {
  id: string;
  symbol: string;
  condition: "above" | "below";
  value: number;
  triggered: boolean;
  createdAt: number;
}

export interface PaperOrder {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  price: number; // fill price
  ts: number;
}
