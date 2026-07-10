import { useCallback, useEffect, useState } from "react";
import { CommandBar } from "./components/CommandBar";
import { FunctionBar } from "./components/FunctionBar";
import { MarketOverviewBar } from "./components/MarketOverviewBar";
import { StoreProvider, useStore } from "./store";
import { useAlertMonitor } from "./hooks/useAlertMonitor";
import { api } from "./lib/api";
import { FUNCTION_MAP, isStub, type FunctionCode } from "./functions";

import { LaunchpadView } from "./views/LaunchpadView";
import { MarketsView } from "./views/MarketsView";
import { NewsView } from "./views/NewsView";
import { AlertsView } from "./views/AlertsView";
import { DescriptionView } from "./views/DescriptionView";
import { ChartView } from "./views/ChartView";
import { FinancialsView } from "./views/FinancialsView";
import { EstimatesView } from "./views/EstimatesView";
import { OwnershipView } from "./views/OwnershipView";
import { PeersView } from "./views/PeersView";
import { EsgView } from "./views/EsgView";
import { ScreenerView } from "./views/ScreenerView";
import { YieldCurveView } from "./views/YieldCurveView";
import { EconomicView } from "./views/EconomicView";
import { PortfolioView } from "./views/PortfolioView";
import { RiskView } from "./views/RiskView";
import { TradeView } from "./views/TradeView";
import { SignalsView } from "./views/SignalsView";
import { AiAnalysisView } from "./views/AiAnalysisView";
import { FilingsView } from "./views/FilingsView";
import { BrokerResearchView } from "./views/BrokerResearchView";
import { DividendsView } from "./views/DividendsView";
import { ShortInterestView } from "./views/ShortInterestView";
import { EtfView } from "./views/EtfView";
import { VolatilityView } from "./views/VolatilityView";
import { BetaView } from "./views/BetaView";
import { FundamentalGraphView } from "./views/FundamentalGraphView";
import { StubView } from "./views/StubView";
import { HistoricalPricesView } from "./views/HistoricalPricesView";
import { IndicesView } from "./views/IndicesView";
import { CurrenciesView } from "./views/CurrenciesView";
import { FunctionDirectoryView } from "./views/FunctionDirectoryView";

function StatusBar({ symbol, view }: { symbol: string; view: FunctionCode }) {
  const [clock, setClock] = useState(() => new Date());
  const [health, setHealth] = useState<{ finnhub: boolean; alphaVantage: boolean } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  return (
    <footer className="flex items-center justify-between h-6 bg-bg-secondary border-t border-accent-orange px-2 text-2xs text-term-gray">
      <div className="flex items-center gap-3">
        <span className="text-accent-orange font-bold">BLOOMBERG TERMINAL</span>
        <span className="text-accent-amber">{symbol}</span>
        <span className="text-accent-amber">{view} · {FUNCTION_MAP[view]?.label}</span>
        <span>News: {health?.finnhub ? "FINNHUB" : "RSS"}</span>
        <span>Quotes: YAHOO{health?.alphaVantage ? "+AV" : ""}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden lg:inline">type "AAPL FA" · "/" command · ↑/↓ navigate</span>
        <span className="num text-term-white">{clock.toLocaleTimeString("en-US")}</span>
      </div>
    </footer>
  );
}

const VIEW_STATE_KEYS = { symbol: "bbg.lastSymbol", view: "bbg.lastView" };

function Terminal() {
  const { addToWatchlist } = useStore();
  const [symbol, setSymbol] = useState(() => {
    try {
      return localStorage.getItem(VIEW_STATE_KEYS.symbol) || "AAPL";
    } catch {
      return "AAPL";
    }
  });
  const [view, setView] = useState<FunctionCode>(() => {
    try {
      const saved = localStorage.getItem(VIEW_STATE_KEYS.view);
      // Only restore it if it's still a real function code (guards against
      // stale localStorage from an older build removing/renaming a code).
      return saved && saved in FUNCTION_MAP ? saved : "DASH";
    } catch {
      return "DASH";
    }
  });
  useAlertMonitor();

  // Persist the current symbol/view so a page refresh lands back where the
  // user left off instead of resetting to the dashboard.
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STATE_KEYS.symbol, symbol);
    } catch {
      /* ignore (e.g. private browsing storage quota) */
    }
  }, [symbol]);
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STATE_KEYS.view, view);
    } catch {
      /* ignore */
    }
  }, [view]);

  // Load a symbol and stay on the current view (used by watchlist/markets).
  const loadSymbol = useCallback((s: string) => {
    const sym = s.trim().toUpperCase();
    if (!sym) return;
    setSymbol(sym);
    addToWatchlist(sym);
  }, [addToWatchlist]);

  // Load a symbol and jump to its description (used by screener/peers/portfolio).
  const inspect = useCallback((s: string) => {
    loadSymbol(s);
    setView("DES");
  }, [loadSymbol]);

  const execute = useCallback(
    (sym: string | undefined, code: FunctionCode | undefined) => {
      if (sym) loadSymbol(sym);
      if (code) setView(code);
      else if (sym && !FUNCTION_MAP[view]?.security && view !== "DASH") setView("DES");
    },
    [loadSymbol, view]
  );

  function renderView() {
    // Anything without a live data source renders an honest stub.
    if (isStub(view)) return <StubView code={view} />;
    switch (view) {
      case "DASH": return <LaunchpadView symbol={symbol} onSelect={loadSymbol} />;
      case "MKT":
      case "WB":
      case "FIW":
      case "BTMM":
      case "CMDTY":
      case "GLCO": return <MarketsView onSelect={inspect} />;
      case "N":
      case "TOP": return <NewsView />;
      case "CN": return <NewsView symbol={symbol} />;
      case "ALRT": return <AlertsView symbol={symbol} />;
      case "WEI": return <IndicesView />;
      case "FXC":
      case "WCRS": return <CurrenciesView />;
      case "FUNC":
      case "MENU": return <FunctionDirectoryView onSelect={setView} />;
      case "DES":
      case "MGMT": return <DescriptionView symbol={symbol} />;
      case "HP": return <HistoricalPricesView symbol={symbol} />;
      case "GP":
      case "GIP": return <ChartView symbol={symbol} />;
      case "SIG": return <SignalsView symbol={symbol} />;
      case "AI": return <AiAnalysisView symbol={symbol} />;
      case "AR":
      case "CF": return <FilingsView symbol={symbol} />;
      case "BRC": return <BrokerResearchView symbol={symbol} />;
      case "DVD":
      case "CACS": return <DividendsView symbol={symbol} />;
      case "SI": return <ShortInterestView symbol={symbol} />;
      case "INSD":
      case "HDS": return <OwnershipView symbol={symbol} />;
      case "ETF": return <EtfView symbol={symbol} />;
      case "HVG": return <VolatilityView symbol={symbol} />;
      case "BETA": return <BetaView symbol={symbol} />;
      case "GF": return <FundamentalGraphView symbol={symbol} />;
      case "RV": return <PeersView symbol={symbol} onSelect={inspect} />;
      case "G":
      case "TECH": return <ChartView symbol={symbol} />;
      case "FA": return <FinancialsView symbol={symbol} />;
      case "EE":
      case "ERN":
      case "ANR":
      case "SURP": return <EstimatesView symbol={symbol} />;
      case "OWN": return <OwnershipView symbol={symbol} />;
      case "COMP": return <PeersView symbol={symbol} onSelect={inspect} />;
      case "ESG": return <EsgView symbol={symbol} />;
      case "EQS":
      case "MOST": return <ScreenerView onSelect={inspect} />;
      case "YCRV": return <YieldCurveView />;
      case "ECO": return <EconomicView symbol={symbol} />;
      case "PORT": return <PortfolioView onSelect={inspect} />;
      case "RISK": return <RiskView />;
      case "TRADE": return <TradeView symbol={symbol} />;
      default: return <LaunchpadView symbol={symbol} onSelect={loadSymbol} />;
    }
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-black">
      <CommandBar onExecute={execute} />
      <FunctionBar active={view} onSelect={setView} />
      <MarketOverviewBar />
      <div className="flex-1 min-h-0">{renderView()}</div>
      <StatusBar symbol={symbol} view={view} />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Terminal />
    </StoreProvider>
  );
}
