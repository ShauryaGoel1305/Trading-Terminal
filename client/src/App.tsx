import { useCallback, useEffect, useState } from "react";
import { CommandBar } from "./components/CommandBar";
import { FunctionBar } from "./components/FunctionBar";
import { MarketOverviewBar } from "./components/MarketOverviewBar";
import { SectionSwitcher, type Section } from "./components/SectionSwitcher";
import { AiFloatingWindow } from "./components/AiFloatingWindow";
import { StoreProvider, useStore } from "./store";
import { useAlertMonitor } from "./hooks/useAlertMonitor";
import { useAiChat } from "./hooks/useAiChat";
import { usePolling } from "./hooks/usePolling";
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
import { QuantView } from "./views/QuantView";

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
    <footer className="flex items-center justify-between h-7 bg-bg-header/80 backdrop-blur-md border-t border-term-border/60 px-3 text-2xs text-term-gray shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-accent-orange font-bold tracking-wide">◢ TRADING TERMINAL</span>
        <span className="w-px h-3 bg-term-border" />
        <span className="text-accent-amber font-semibold">{symbol}</span>
        <span className="text-term-gray">{view} · {FUNCTION_MAP[view]?.label}</span>
        <span className="w-px h-3 bg-term-border hidden md:inline-block" />
        <span className="hidden md:inline">News: {health?.finnhub ? "FINNHUB" : "RSS"}</span>
        <span className="hidden md:inline">Quotes: YAHOO{health?.alphaVantage ? "+AV" : ""}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden lg:inline text-term-gray/80">type "AAPL FA" · "/" command · ↑/↓ navigate</span>
        <span className="num text-term-white font-medium">{clock.toLocaleTimeString("en-US")}</span>
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

  // The terminal has three top-level workspaces: Dashboard (everything the
  // function bar / command bar reaches), Quant Lab (systematic research
  // tooling), and AI Analyst (full-page chat). Which one is "active" is
  // derived from the current function's group, so any future Quant/AI
  // function automatically routes there.
  const section: Section =
    FUNCTION_MAP[view]?.group === "Quant" ? "quant" : FUNCTION_MAP[view]?.group === "AI" ? "ai" : "dashboard";
  // Clicking a section tab always jumps to that section's home screen — it's
  // a "go to Dashboard" action, not "restore whatever I was last looking at"
  // (that's what the localStorage refresh-persistence above is for).
  const selectSection = useCallback(
    (s: Section) => setView(s === "quant" ? "QUANT" : s === "ai" ? "AI" : "DASH"),
    []
  );

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

  // Single shared conversation, used by both the AI tab and the floating
  // window — navigation (the AI's `navigate` tool) reuses the same `execute`
  // the command bar uses, so the AI can drive the terminal exactly like a user.
  const aiStatus = usePolling(() => api.aiStatus(), 0, []);
  const { messages: aiMessages, busy: aiBusy, send: aiSend, clear: aiClear } = useAiChat({
    activeSymbol: symbol,
    onNavigate: execute,
  });
  const [aiFloatingOpen, setAiFloatingOpen] = useState(false);

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
      case "AI":
        return (
          <AiAnalysisView
            messages={aiMessages}
            busy={aiBusy}
            onSend={aiSend}
            onClear={aiClear}
            activeSymbol={symbol}
          />
        );
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
      case "QUANT": return <QuantView />;
      default: return <LaunchpadView symbol={symbol} onSelect={loadSymbol} />;
    }
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-transparent overflow-hidden">
      <header className="grid grid-cols-3 items-center h-14 px-4 border-b border-term-border/60 bg-bg-header/70 backdrop-blur-md shrink-0">
        <div className="justify-self-start flex items-center gap-2">
          <span className="text-accent-orange font-black text-base tracking-tighter select-none">◢ TRADING TERMINAL</span>
        </div>
        <div className="justify-self-center">
          <SectionSwitcher section={section} onSelect={selectSection} />
        </div>
        <div className="justify-self-end">
          {section !== "ai" && (
            <button
              onClick={() => setAiFloatingOpen((o) => !o)}
              title="Chat with the AI while staying on this screen"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-2xs font-bold uppercase tracking-wider border transition-all duration-200 ${
                aiFloatingOpen
                  ? "border-cyan-400 text-cyan-300 bg-cyan-400/10 shadow-glow-cyan"
                  : "border-term-border text-term-gray hover:text-cyan-300 hover:border-cyan-400/60"
              }`}
            >
              ✦ {aiFloatingOpen ? "Close AI" : "Ask AI"}
            </button>
          )}
        </div>
      </header>

      {section === "dashboard" && (
        <>
          <CommandBar onExecute={execute} />
          <FunctionBar active={view} onSelect={setView} />
          <MarketOverviewBar />
        </>
      )}

      <div className="flex-1 min-h-0">
        <div key={view} className="h-full animate-fade-in">
          {renderView()}
        </div>
      </div>
      <StatusBar symbol={symbol} view={view} />

      {aiFloatingOpen && section !== "ai" && (
        <AiFloatingWindow
          open={aiFloatingOpen}
          onClose={() => setAiFloatingOpen(false)}
          messages={aiMessages}
          busy={aiBusy}
          onSend={aiSend}
          onClear={aiClear}
          enabled={!!aiStatus.data?.enabled}
          model={aiStatus.data?.model}
          activeSymbol={symbol}
        />
      )}
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
