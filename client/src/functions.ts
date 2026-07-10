// Bloomberg-style "function" registry. This is a broad catalogue of the real
// terminal's mnemonics. Each entry is tagged with a `status`:
//   live  — backed by a real (free) data source and rendered as a working view
//   none  — proprietary / licensed Bloomberg data with no public feed; rendered
//           as an honest "NO PUBLIC DATA AVAILABLE" stub with the closest free
//           alternative noted.
// `security` functions act on the currently loaded ticker. `pinned` functions
// appear in the top function bar; everything else is reachable via FUNC (the
// function directory) or the command bar.
export type FunctionCode = string;
export type FuncStatus = "live" | "none";
export type FuncGroup = "Monitor" | "Security" | "Markets" | "Portfolio" | "Restricted";

export interface FunctionDef {
  code: FunctionCode;
  label: string;
  group: FuncGroup;
  category: string;
  desc: string;
  status: FuncStatus;
  security?: boolean;
  pinned?: boolean;
  alt?: string; // free alternative shown on the stub
}

// Order the directory renders categories in.
export const CATEGORY_ORDER: string[] = [
  "Core & Navigation",
  "AI & Assistant",
  "Equity Analysis",
  "Estimates & Earnings",
  "Ownership & Holders",
  "Comparables & Screening",
  "Charting & Technicals",
  "Options & Derivatives",
  "Fixed Income & Rates",
  "Credit & CDS",
  "FX & Money Markets",
  "Commodities & Energy",
  "Economics & Government",
  "News & Research",
  "Market Monitors",
  "Funds & ETFs",
  "Portfolio & Risk",
  "Trading & Execution",
  "Mortgages & Structured",
  "M&A & Corporate Actions",
  "Industry & Sectors",
  "Tools & Messaging",
];

export const FUNCTIONS: FunctionDef[] = [
  // ── Core & Navigation ────────────────────────────────────────────────
  { code: "FUNC", label: "Function Finder", group: "Monitor", category: "Core & Navigation", status: "live", pinned: true, desc: "Browse every terminal function" },
  { code: "MENU", label: "Menu", group: "Monitor", category: "Core & Navigation", status: "live", desc: "Full function directory" },
  { code: "HELP", label: "Help", group: "Monitor", category: "Core & Navigation", status: "none", desc: "Help & function documentation", alt: "Hover any code in the bar for a tooltip; FUNC describes each one." },
  { code: "BU", label: "Bloomberg University", group: "Monitor", category: "Core & Navigation", status: "none", desc: "Training & tutorials", alt: "Not reproducible from market data." },
  { code: "DFLT", label: "Defaults & Settings", group: "Monitor", category: "Core & Navigation", status: "none", desc: "User preferences & terminal settings" },

  // ── AI & Assistant ───────────────────────────────────────────────────
  { code: "AI", label: "AI Analyst", group: "Security", category: "AI & Assistant", security: true, status: "live", pinned: true, desc: "AI equity analysis & chat — what it does, financials, who's buying, bull/bear (DeepSeek)" },

  // ── Equity Analysis ─────────────────────────────────────────────────
  { code: "DES", label: "Description", group: "Security", category: "Equity Analysis", security: true, status: "live", pinned: true, desc: "Company profile, business & key stats" },
  { code: "HP", label: "Historical Prices", group: "Security", category: "Equity Analysis", security: true, status: "live", pinned: true, desc: "Daily OHLCV price history table" },
  { code: "DVD", label: "Dividends", group: "Security", category: "Equity Analysis", security: true, status: "live", pinned: true, desc: "Full dividend & stock-split history, yield, payout, growth & CAGR" },
  { code: "CF", label: "Company Filings", group: "Security", category: "Equity Analysis", security: true, status: "live", pinned: true, desc: "SEC annual reports, 10-K/10-Q/proxy/8-K/ESG filings — 10+ years via EDGAR" },
  { code: "AR", label: "Annual Reports", group: "Security", category: "Equity Analysis", security: true, status: "live", pinned: true, desc: "Annual reports & all SEC filings (10-K BS/IS/PL, 10-Q, proxy, 8-K, ESG) — 10+ years via EDGAR" },
  { code: "SPLC", label: "Supply Chain", group: "Security", category: "Equity Analysis", security: true, status: "none", desc: "Suppliers, customers & competitors graph" },
  { code: "MGMT", label: "Management", group: "Security", category: "Equity Analysis", security: true, status: "live", desc: "Key executives, titles, pay & age (with company profile)" },
  { code: "BIO", label: "Biographies", group: "Security", category: "Equity Analysis", security: true, status: "none", desc: "Executive & director biographies" },
  { code: "CACS", label: "Corporate Actions", group: "Security", category: "Equity Analysis", security: true, status: "live", desc: "Splits & dividends history (corporate actions)" },
  { code: "GEOR", label: "Geographic Revenue", group: "Security", category: "Equity Analysis", security: true, status: "none", desc: "Revenue by geography & segment" },
  { code: "RELS", label: "Related Securities", group: "Security", category: "Equity Analysis", security: true, status: "none", desc: "Share classes, ADRs, linked instruments" },
  { code: "SI", label: "Short Interest", group: "Security", category: "Equity Analysis", security: true, status: "live", desc: "Short interest, % of float, days-to-cover & MoM change" },
  { code: "WACC", label: "Cost of Capital", group: "Security", category: "Equity Analysis", security: true, status: "none", desc: "Weighted average cost of capital model" },
  { code: "ESG", label: "ESG", group: "Security", category: "Equity Analysis", security: true, status: "live", pinned: true, desc: "ESG & governance overview" },

  // ── Estimates & Earnings ────────────────────────────────────────────
  { code: "EE", label: "Estimates", group: "Security", category: "Estimates & Earnings", security: true, status: "live", pinned: true, desc: "Analyst estimates & consensus targets" },
  { code: "ERN", label: "Earnings Summary", group: "Security", category: "Estimates & Earnings", security: true, status: "live", desc: "Earnings history, surprises & trend" },
  { code: "ANR", label: "Analyst Recommendations", group: "Security", category: "Estimates & Earnings", security: true, status: "live", desc: "Buy/hold/sell ratings distribution" },
  { code: "EM", label: "Earnings & Estimates", group: "Security", category: "Estimates & Earnings", security: true, status: "none", desc: "Detailed estimate breakdown by metric" },
  { code: "SURP", label: "Earnings Surprise", group: "Security", category: "Estimates & Earnings", security: true, status: "live", desc: "Historical EPS surprise vs estimate" },
  { code: "BEST", label: "Consensus Estimates", group: "Security", category: "Estimates & Earnings", security: true, status: "none", desc: "Bloomberg BEST consensus dataset", alt: "Aggregated consensus EPS/revenue is shown in EE." },
  { code: "EEB", label: "Estimates by Broker", group: "Security", category: "Estimates & Earnings", security: true, status: "none", desc: "Individual broker estimate detail" },
  { code: "BRC", label: "Broker Research", group: "Security", category: "Estimates & Earnings", security: true, status: "live", pinned: true, desc: "Sell-side ratings actions by named firm (Goldman, MS, JPM, Jefferies…), upgrades/downgrades, price targets & consensus" },
  { code: "RES", label: "Research Library", group: "Security", category: "Estimates & Earnings", security: true, status: "none", desc: "Sell-side & internal research archive" },
  { code: "GUID", label: "Company Guidance", group: "Security", category: "Estimates & Earnings", security: true, status: "none", desc: "Management forward guidance history" },

  // ── Ownership & Holders ─────────────────────────────────────────────
  { code: "OWN", label: "Ownership", group: "Security", category: "Ownership & Holders", security: true, status: "live", pinned: true, desc: "Institutional, fund & insider ownership" },
  { code: "HDS", label: "Holders", group: "Security", category: "Ownership & Holders", security: true, status: "live", desc: "Institutional, fund & insider holders (with ownership)" },
  { code: "INSD", label: "Insider Transactions", group: "Security", category: "Ownership & Holders", security: true, status: "live", desc: "Insider buy/sell filings (shown with ownership)" },
  { code: "F13", label: "13F Filings", group: "Security", category: "Ownership & Holders", security: true, status: "none", desc: "13F institutional position filings", alt: "Search the manager on SEC EDGAR (13F-HR)." },
  { code: "PHDC", label: "Portfolio Holdings", group: "Security", category: "Ownership & Holders", security: true, status: "none", desc: "Holder portfolio composition" },

  // ── Comparables & Screening ─────────────────────────────────────────
  { code: "COMP", label: "Comparables", group: "Security", category: "Comparables & Screening", security: true, status: "live", pinned: true, desc: "Peer relative valuation table" },
  { code: "EQS", label: "Equity Screener", group: "Markets", category: "Comparables & Screening", status: "live", pinned: true, desc: "Multi-factor equity screening" },
  { code: "MOST", label: "Most Active", group: "Markets", category: "Comparables & Screening", status: "live", desc: "Most active / biggest movers" },
  { code: "RV", label: "Relative Value", group: "Security", category: "Comparables & Screening", security: true, status: "live", desc: "Peer relative valuation multiples" },
  { code: "SECF", label: "Security Finder", group: "Markets", category: "Comparables & Screening", status: "none", desc: "Cross-asset security search", alt: "Use the command bar's symbol search." },
  { code: "RANK", label: "Ranked Returns", group: "Markets", category: "Comparables & Screening", status: "none", desc: "Sector / peer performance ranking" },

  // ── Charting & Technicals ───────────────────────────────────────────
  { code: "GP", label: "Price Chart", group: "Security", category: "Charting & Technicals", security: true, status: "live", pinned: true, desc: "Candles + SMA/EMA/Bollinger/RSI/MACD" },
  { code: "SIG", label: "Trade Signals", group: "Security", category: "Charting & Technicals", security: true, status: "live", pinned: true, desc: "Signal dashboard: technicals, valuation, analyst, R:R & position sizing" },
  { code: "GIP", label: "Intraday Chart", group: "Security", category: "Charting & Technicals", security: true, status: "live", desc: "Intraday price/volume chart" },
  { code: "G", label: "Custom Charts", group: "Security", category: "Charting & Technicals", security: true, status: "live", desc: "Candle chart with overlays & oscillators" },
  { code: "TECH", label: "Technical Study", group: "Security", category: "Charting & Technicals", security: true, status: "live", desc: "Candles + SMA/EMA/Bollinger/RSI/MACD" },
  { code: "GF", label: "Fundamental Graph", group: "Security", category: "Charting & Technicals", security: true, status: "live", desc: "Revenue, income, margins, EPS & cash flow trends" },
  { code: "HVG", label: "Historical Volatility", group: "Security", category: "Charting & Technicals", security: true, status: "live", desc: "Realized volatility windows + 30-day rolling graph" },

  // ── Options & Derivatives ───────────────────────────────────────────
  { code: "OMON", label: "Option Monitor", group: "Security", category: "Options & Derivatives", security: true, status: "none", desc: "Full option chain monitor", alt: "A live calls/puts chain by strike is in the DASH launchpad." },
  { code: "OV", label: "Option Valuation", group: "Security", category: "Options & Derivatives", security: true, status: "none", desc: "Theoretical option pricing & greeks" },
  { code: "OSA", label: "Option Scenario", group: "Security", category: "Options & Derivatives", security: true, status: "none", desc: "Position scenario / P&L analysis" },
  { code: "OVME", label: "Option Pricing", group: "Security", category: "Options & Derivatives", security: true, status: "none", desc: "Exotic / vanilla pricer" },
  { code: "SKEW", label: "Volatility Skew", group: "Security", category: "Options & Derivatives", security: true, status: "none", desc: "Implied vol smile / skew surface" },
  { code: "GV", label: "Vol Surface", group: "Security", category: "Options & Derivatives", security: true, status: "none", desc: "3-D implied volatility surface" },

  // ── Fixed Income & Rates ────────────────────────────────────────────
  { code: "YCRV", label: "Yield Curve", group: "Markets", category: "Fixed Income & Rates", status: "live", pinned: true, desc: "Treasury curve + bond analytics calc" },
  { code: "WB", label: "World Bonds", group: "Markets", category: "Fixed Income & Rates", status: "live", desc: "Global government bond yields" },
  { code: "FIW", label: "Fixed Income World", group: "Markets", category: "Fixed Income & Rates", status: "live", desc: "Cross-market fixed income monitor" },
  { code: "BTMM", label: "Treasury / Money Mkt", group: "Markets", category: "Fixed Income & Rates", status: "live", desc: "US Treasury & money-market dashboard" },
  { code: "SOVR", label: "Sovereign Debt", group: "Markets", category: "Fixed Income & Rates", status: "none", desc: "Sovereign yields & spreads monitor", alt: "US Treasury yields and 10Y are in YCRV / MKT." },
  { code: "YAS", label: "Yield & Spread", group: "Security", category: "Fixed Income & Rates", security: true, status: "none", desc: "Bond yield & spread analysis", alt: "Generic bond price/yield/duration math is in YCRV's calculator." },
  { code: "DDIS", label: "Debt Distribution", group: "Security", category: "Fixed Income & Rates", security: true, status: "none", desc: "Issuer debt maturity ladder", alt: "Total debt is in FA's balance sheet." },
  { code: "CRVF", label: "Curve Finder", group: "Markets", category: "Fixed Income & Rates", status: "none", desc: "Search & build yield curves" },
  { code: "SWPM", label: "Swap Manager", group: "Markets", category: "Fixed Income & Rates", status: "none", desc: "Interest-rate swap pricing & risk" },
  { code: "USSW", label: "USD Swaps", group: "Markets", category: "Fixed Income & Rates", status: "none", desc: "USD swap rate monitor" },
  { code: "RATC", label: "Rating Changes", group: "Markets", category: "Fixed Income & Rates", status: "none", desc: "Credit rating actions feed" },

  // ── Credit & CDS ────────────────────────────────────────────────────
  { code: "CDS", label: "Credit Default Swaps", group: "Restricted", category: "Credit & CDS", security: true, status: "none", desc: "CDS spreads & issuer credit curves", alt: "IG/HY credit ETFs (LQD, HYG) are tracked under MKT as a proxy." },
  { code: "WCDS", label: "World CDS", group: "Restricted", category: "Credit & CDS", status: "none", desc: "Global CDS / CDX / iTraxx monitor" },
  { code: "CDSW", label: "CDS Valuation", group: "Restricted", category: "Credit & CDS", security: true, status: "none", desc: "CDS pricing & hazard rates" },
  { code: "CRPR", label: "Credit Profile", group: "Restricted", category: "Credit & CDS", security: true, status: "none", desc: "Issuer credit profile & ratings" },
  { code: "DRSK", label: "Default Risk", group: "Restricted", category: "Credit & CDS", security: true, status: "none", desc: "Default probability model", alt: "Leverage ratios (debt/equity) are in DES & FA." },

  // ── FX & Money Markets ──────────────────────────────────────────────
  { code: "FXC", label: "Currency Monitor", group: "Monitor", category: "FX & Money Markets", status: "live", pinned: true, desc: "Live FX rates & crosses" },
  { code: "WCRS", label: "Currency Returns", group: "Monitor", category: "FX & Money Markets", status: "live", desc: "Currencies ranked by return" },
  { code: "FRD", label: "FX Forwards", group: "Markets", category: "FX & Money Markets", status: "none", desc: "Forward points & outright rates" },
  { code: "FXFC", label: "FX Forecasts", group: "Markets", category: "FX & Money Markets", status: "none", desc: "Consensus currency forecasts" },
  { code: "BFIX", label: "Benchmark Fixings", group: "Markets", category: "FX & Money Markets", status: "none", desc: "Bloomberg FX fixing rates" },
  { code: "WIRP", label: "Rate Probability", group: "Markets", category: "FX & Money Markets", status: "none", desc: "Market-implied central-bank rate odds" },

  // ── Commodities & Energy ────────────────────────────────────────────
  { code: "CMDTY", label: "Commodities", group: "Markets", category: "Commodities & Energy", status: "live", desc: "Commodity & futures monitor" },
  { code: "GLCO", label: "Global Commodities", group: "Markets", category: "Commodities & Energy", status: "live", desc: "Global commodity price board" },
  { code: "FTRA", label: "Futures Table", group: "Markets", category: "Commodities & Energy", status: "none", desc: "Futures curve & term structure" },
  { code: "BOIL", label: "Crude Oil", group: "Markets", category: "Commodities & Energy", status: "none", desc: "Crude oil market dashboard", alt: "Front-month crude (CL=F) appears in MKT commodities." },
  { code: "NRG", label: "Energy Dashboard", group: "Markets", category: "Commodities & Energy", status: "none", desc: "Energy complex overview" },
  { code: "AGRI", label: "Agriculture", group: "Markets", category: "Commodities & Energy", status: "none", desc: "Agricultural commodity monitor" },

  // ── Economics & Government ──────────────────────────────────────────
  { code: "ECO", label: "Economic Calendar", group: "Markets", category: "Economics & Government", status: "live", pinned: true, desc: "Releases, calendar & macro grid" },
  { code: "ECST", label: "Economic Statistics", group: "Markets", category: "Economics & Government", status: "none", desc: "Economic statistics browser", alt: "Key macro indicators are summarised in ECO." },
  { code: "ECFC", label: "Economic Forecasts", group: "Markets", category: "Economics & Government", status: "none", desc: "Consensus economic forecasts" },
  { code: "ECOW", label: "World Economy", group: "Markets", category: "Economics & Government", status: "none", desc: "Global economic monitor", alt: "ECO shows a global macro grid + calendar." },
  { code: "GDP", label: "GDP", group: "Markets", category: "Economics & Government", status: "none", desc: "Gross domestic product series" },
  { code: "CPI", label: "Inflation (CPI)", group: "Markets", category: "Economics & Government", status: "none", desc: "Consumer price inflation series", alt: "CPI release dates are flagged in ECO." },
  { code: "FOMC", label: "FOMC", group: "Markets", category: "Economics & Government", status: "none", desc: "Fed decisions, dots & minutes", alt: "FOMC meeting dates are in the ECO calendar." },
  { code: "CENB", label: "Central Banks", group: "Markets", category: "Economics & Government", status: "none", desc: "Global central-bank monitor" },

  // ── News & Research ─────────────────────────────────────────────────
  { code: "N", label: "News", group: "Monitor", category: "News & Research", status: "live", pinned: true, desc: "Top news with sentiment" },
  { code: "TOP", label: "Top Headlines", group: "Monitor", category: "News & Research", status: "live", desc: "Front-page market headlines" },
  { code: "CN", label: "Company News", group: "Security", category: "News & Research", security: true, status: "live", desc: "News feed (company filter when available)" },
  { code: "NI", label: "News by Topic", group: "Monitor", category: "News & Research", status: "none", desc: "Topic-coded news streams", alt: "Category tabs are available in N." },
  { code: "READ", label: "Top Reads", group: "Monitor", category: "News & Research", status: "none", desc: "Most-read stories" },
  { code: "BRIEF", label: "Newsletters", group: "Monitor", category: "News & Research", status: "none", desc: "Bloomberg briefings & newsletters" },
  { code: "TWTR", label: "Social Sentiment", group: "Monitor", category: "News & Research", status: "none", desc: "Curated social / tweet feed" },
  { code: "BI", label: "Bloomberg Intelligence", group: "Restricted", category: "News & Research", status: "none", desc: "Proprietary industry research", alt: "Data-driven equivalents: FA, EE, OWN, COMP and N." },

  // ── Market Monitors ─────────────────────────────────────────────────
  { code: "DASH", label: "Launchpad", group: "Monitor", category: "Market Monitors", status: "live", pinned: true, desc: "Multi-panel dashboard" },
  { code: "MKT", label: "Markets", group: "Monitor", category: "Market Monitors", status: "live", pinned: true, desc: "Multi-asset monitor (eq/FI/FX/cmdty)" },
  { code: "WEI", label: "World Equity Indices", group: "Monitor", category: "Market Monitors", status: "live", pinned: true, desc: "Global stock index board" },
  { code: "IMAP", label: "Market Map", group: "Monitor", category: "Market Monitors", status: "none", desc: "Sector/industry heat map", alt: "Sector ETFs and movers are listed in MKT." },
  { code: "MOV", label: "Index Movers", group: "Monitor", category: "Market Monitors", status: "none", desc: "Index point contributors", alt: "Index levels are in WEI / MKT." },
  { code: "ALRT", label: "Alerts", group: "Monitor", category: "Market Monitors", status: "live", pinned: true, desc: "Price alerts with notifications" },

  // ── Funds & ETFs ────────────────────────────────────────────────────
  { code: "FSRC", label: "Fund Screener", group: "Markets", category: "Funds & ETFs", status: "none", desc: "Mutual fund / ETF screening", alt: "Equity screening is available in EQS." },
  { code: "ETF", label: "ETF Analytics", group: "Markets", category: "Funds & ETFs", security: true, status: "live", desc: "ETF holdings, sector weights, allocation & expense ratio" },
  { code: "FMAP", label: "Fund Map", group: "Markets", category: "Funds & ETFs", status: "none", desc: "Fund category landscape" },
  { code: "MHD", label: "Fund Holdings", group: "Markets", category: "Funds & ETFs", status: "none", desc: "Mutual fund holdings detail" },
  { code: "MMF", label: "Money Market Funds", group: "Markets", category: "Funds & ETFs", status: "none", desc: "Money-market fund monitor" },

  // ── Portfolio & Risk ────────────────────────────────────────────────
  { code: "PORT", label: "Portfolio", group: "Portfolio", category: "Portfolio & Risk", status: "live", pinned: true, desc: "Positions, market value & P&L" },
  { code: "RISK", label: "Risk", group: "Portfolio", category: "Portfolio & Risk", status: "live", pinned: true, desc: "VaR, beta, drawdown & stress tests" },
  { code: "MARS", label: "Multi-Asset Risk", group: "Portfolio", category: "Portfolio & Risk", status: "none", desc: "Cross-asset scenario risk engine", alt: "Equity VaR & beta stress are in RISK." },
  { code: "PRTU", label: "Portfolio Upload", group: "Portfolio", category: "Portfolio & Risk", status: "none", desc: "Bulk portfolio import", alt: "Positions are built by paper trading in TRADE." },
  { code: "TRA", label: "Total Return", group: "Portfolio", category: "Portfolio & Risk", status: "none", desc: "Total-return attribution" },
  { code: "BETA", label: "Beta / Correlation", group: "Security", category: "Portfolio & Risk", security: true, status: "live", desc: "Beta, correlation & R² vs major benchmarks (1Y & 3Y)" },

  // ── Trading & Execution ─────────────────────────────────────────────
  { code: "TRADE", label: "Paper Trading", group: "Portfolio", category: "Trading & Execution", security: true, status: "live", pinned: true, desc: "Simulated order entry & blotter" },
  { code: "DEPTH", label: "Market Depth", group: "Restricted", category: "Trading & Execution", security: true, status: "none", desc: "Level-2 order book / market-by-order", alt: "Top-of-book last/quote is in QUOTE & the watchlist." },
  { code: "EXEC", label: "Execution / OMS", group: "Restricted", category: "Trading & Execution", status: "none", desc: "Live order routing & execution", alt: "TRADE simulates fills at the live market price." },
  { code: "EMSX", label: "Equity Trading (EMS)", group: "Restricted", category: "Trading & Execution", status: "none", desc: "Broker-neutral equity execution" },
  { code: "TSOX", label: "Trade Order Mgmt", group: "Restricted", category: "Trading & Execution", status: "none", desc: "Fixed-income order management" },
  { code: "AIM", label: "Investment Manager", group: "Restricted", category: "Trading & Execution", status: "none", desc: "Order & investment management system" },
  { code: "TACT", label: "Transaction Cost", group: "Restricted", category: "Trading & Execution", status: "none", desc: "Transaction cost analysis (TCA)" },
  { code: "ALLQ", label: "All Quotes", group: "Restricted", category: "Trading & Execution", security: true, status: "none", desc: "Dealer runs & all-quotes montage" },

  // ── Mortgages & Structured ──────────────────────────────────────────
  { code: "MBS", label: "Mortgage Analytics", group: "Restricted", category: "Mortgages & Structured", status: "none", desc: "MBS prepayment, OAS & TBA pricing", alt: "Treasury curve + duration/convexity math is in YCRV." },
  { code: "MTGE", label: "Mortgage Dashboard", group: "Restricted", category: "Mortgages & Structured", status: "none", desc: "Agency mortgage market monitor" },
  { code: "CLO", label: "CLO Analytics", group: "Restricted", category: "Mortgages & Structured", status: "none", desc: "Collateralised loan obligation tools" },
  { code: "ABS", label: "Asset-Backed", group: "Restricted", category: "Mortgages & Structured", status: "none", desc: "ABS structuring & cashflows" },
  { code: "SF", label: "Structured Finance", group: "Restricted", category: "Mortgages & Structured", status: "none", desc: "Structured product cashflow engine" },

  // ── M&A & Corporate Actions ─────────────────────────────────────────
  { code: "MA", label: "Mergers & Acquisitions", group: "Markets", category: "M&A & Corporate Actions", status: "none", desc: "Deal search & analytics" },
  { code: "LEAG", label: "League Tables", group: "Markets", category: "M&A & Corporate Actions", status: "none", desc: "Underwriter / advisor rankings" },
  { code: "ECDR", label: "Equity Calendar", group: "Markets", category: "M&A & Corporate Actions", status: "none", desc: "IPO / equity issuance calendar", alt: "Earnings dates are flagged in the ECO calendar." },
  { code: "NICA", label: "New Issues", group: "Markets", category: "M&A & Corporate Actions", status: "none", desc: "New issue / primary market calendar" },

  // ── Industry & Sectors ──────────────────────────────────────────────
  { code: "INDU", label: "Industry Monitor", group: "Markets", category: "Industry & Sectors", status: "none", desc: "Industry-level dashboards", alt: "Sector ETFs are tracked in MKT." },
  { code: "RANKI", label: "Industry Ranking", group: "Markets", category: "Industry & Sectors", status: "none", desc: "Companies ranked within an industry", alt: "Compare peers head-to-head in COMP." },
  { code: "ALTD", label: "Alternative Data", group: "Restricted", category: "Industry & Sectors", status: "none", desc: "Satellite / card-spend / web alt-data", alt: "Not available from free sources; FA & N are closest." },

  // ── Tools & Messaging ───────────────────────────────────────────────
  { code: "MSG", label: "Messages", group: "Monitor", category: "Tools & Messaging", status: "none", desc: "Bloomberg mail / messaging" },
  { code: "IB", label: "Instant Bloomberg", group: "Monitor", category: "Tools & Messaging", status: "none", desc: "Instant messaging chat" },
  { code: "PEOP", label: "People", group: "Monitor", category: "Tools & Messaging", status: "none", desc: "Contacts & people directory" },
  { code: "GRAB", label: "Screen Grab", group: "Monitor", category: "Tools & Messaging", status: "none", desc: "Capture & share a screen" },
  { code: "CALC", label: "Calculators", group: "Monitor", category: "Tools & Messaging", status: "none", desc: "Financial calculators", alt: "A bond price/yield/duration calculator is in YCRV." },
];

export const FUNCTION_CODES = FUNCTIONS.map((f) => f.code);
export const FUNCTION_MAP: Record<string, FunctionDef> = Object.fromEntries(
  FUNCTIONS.map((f) => [f.code, f])
);

export function isFunctionCode(token: string): boolean {
  return token.toUpperCase() in FUNCTION_MAP;
}

// A function renders an honest stub when it has no live data source.
export function isStub(code: string): boolean {
  const def = FUNCTION_MAP[code.toUpperCase()];
  return !def || def.status !== "live";
}

// Kept for backwards-compat: the originally "restricted" licensed-data codes.
export const RESTRICTED: FunctionCode[] = FUNCTIONS.filter((f) => f.group === "Restricted").map((f) => f.code);
