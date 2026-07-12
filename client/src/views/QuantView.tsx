import type { ReactNode } from "react";

// Roadmap-teaser only. No strategy, backtest, or signal logic lives here —
// this view exists purely to preview what the Quant Lab will become once the
// algorithmic layer is built. Every card below is explicitly "in development."

interface RoadmapItem {
  icon: string;
  title: string;
  blurb: string;
  tags: string[];
}

const ROADMAP: RoadmapItem[] = [
  {
    icon: "⟳",
    title: "Strategy Backtester",
    blurb: "Run rules-based strategies against historical price data and see equity curves, drawdown, and trade-by-trade P&L before risking a dollar.",
    tags: ["Historical sim", "Equity curve", "Drawdown"],
  },
  {
    icon: "◎",
    title: "Signal Screener",
    blurb: "Scan the full universe for technical, fundamental, and momentum signals — surface setups the moment they cross your thresholds.",
    tags: ["Multi-factor", "Alerts", "Universe scan"],
  },
  {
    icon: "◈",
    title: "Portfolio Optimizer",
    blurb: "Mean-variance and risk-parity allocation across your holdings, with efficient-frontier visualization and rebalancing suggestions.",
    tags: ["Efficient frontier", "Risk parity", "Rebalancing"],
  },
  {
    icon: "▲",
    title: "Risk Models",
    blurb: "VaR, factor exposure, and stress-test scenarios layered on top of live positions — know your tail risk before the market shows you.",
    tags: ["VaR", "Factor exposure", "Stress test"],
  },
  {
    icon: "▦",
    title: "Factor Analysis",
    blurb: "Decompose returns into style factors (value, momentum, quality, size) to understand what's actually driving performance.",
    tags: ["Style factors", "Attribution"],
  },
  {
    icon: "◇",
    title: "Paper Trading Bots",
    blurb: "Deploy systematic strategies against a simulated book, track live performance, and iterate before any capital is at stake.",
    tags: ["Automation", "Simulated fills", "Live tracking"],
  },
];

function RoadmapCard({ item, delay }: { item: RoadmapItem; delay: number }) {
  return (
    <div
      className="panel-glass p-4 flex flex-col gap-3 animate-fade-in-up hover:border-purple-500/50 transition-colors duration-300 group"
      style={{ animationDelay: `${delay}ms`, borderTopColor: "rgba(168,85,247,0.55)" }}
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl text-purple-400 group-hover:scale-110 transition-transform duration-300">{item.icon}</span>
        <span className="text-2xs uppercase tracking-wider text-term-gray border border-term-border px-1.5 py-0.5 rounded-sm">
          In development
        </span>
      </div>
      <div>
        <div className="text-sm font-semibold text-term-white uppercase tracking-wide">{item.title}</div>
        <p className="text-xs text-term-gray mt-1.5 leading-relaxed">{item.blurb}</p>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
        {item.tags.map((t) => (
          <span key={t} className="text-2xs text-purple-300 bg-purple-500/10 border border-purple-500/25 px-1.5 py-0.5 rounded-sm">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatChip({ children }: { children: ReactNode }) {
  return (
    <span className="text-2xs text-term-gray border border-term-border px-2 py-1 rounded-sm whitespace-nowrap">
      {children}
    </span>
  );
}

export function QuantView() {
  return (
    <main className="h-full overflow-auto bg-transparent">
      <div className="max-w-5xl mx-auto p-6 md:p-10">
        {/* Hero */}
        <div className="animate-fade-in-up mb-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="live-dot" style={{ background: "#a855f7", boxShadow: "0 0 0 0 rgba(168,85,247,0.5)" }} />
            <span className="text-2xs uppercase tracking-widest text-purple-400 font-semibold">Roadmap · Coming Soon</span>
          </div>
          <h1
            className="text-3xl md:text-4xl font-bold text-term-white tracking-tight animate-gradient-shift"
            style={{
              backgroundImage: "linear-gradient(90deg, #ffffff, #a855f7, #ff6600, #ffffff)",
              backgroundSize: "300% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Quant Lab
          </h1>
          <p className="text-sm text-term-gray mt-3 max-w-2xl leading-relaxed">
            The next evolution of this terminal: systematic research and algorithmic tooling built directly on top of
            the same live market data already powering every other function. This is a preview of what's on the
            roadmap — nothing below is wired to real strategy logic yet.
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            <StatChip>6 modules planned</StatChip>
            <StatChip>0 live yet</StatChip>
            <StatChip>Built on existing data layer</StatChip>
          </div>
        </div>

        {/* Roadmap grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROADMAP.map((item, i) => (
            <RoadmapCard key={item.title} item={item} delay={i * 70} />
          ))}
        </div>

        {/* Footer note */}
        <div
          className="mt-10 panel-glass p-4 text-xs text-term-gray animate-fade-in-up"
          style={{ animationDelay: `${ROADMAP.length * 70 + 100}ms` }}
        >
          <span className="text-purple-400 font-semibold uppercase tracking-wide text-2xs">Status</span>
          <p className="mt-1.5 leading-relaxed">
            This section is UI scaffolding only. Backtesting, screening, optimization, and risk-model logic will be
            built and shipped module by module — each will go live here the moment it has a working engine behind it.
          </p>
        </div>
      </div>
    </main>
  );
}
