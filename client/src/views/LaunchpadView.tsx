import { useEffect, useRef, useState } from "react";
import { WatchlistPanel } from "../components/WatchlistPanel";
import { ChartPanel } from "../components/ChartPanel";
import { QuoteDetailPanel } from "../components/QuoteDetailPanel";
import { NewsFeedPanel } from "../components/NewsFeedPanel";
import { OptionsChainPanel } from "../components/OptionsChainPanel";
import { EconomicCalendarPanel } from "../components/EconomicCalendarPanel";
import { useStore } from "../store";
import { api } from "../lib/api";
import type { SearchResult } from "../types";

interface Props {
  symbol: string;
  onSelect: (s: string) => void;
}

// A few widely-recognized tickers as one-click starting points — the "you
// don't have to know a mnemonic to get going" affordance for newcomers.
const QUICK_PICKS = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "TSLA", "SPY"];

function SearchHero({ symbol, onSelect }: { symbol: string; onSelect: (s: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 1) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const r = await api.search(q);
        if (!cancelled) setResults(r);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 180);
    return () => { cancelled = true; clearTimeout(id); };
  }, [q]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pick(sym: string) {
    onSelect(sym);
    setQ("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="px-4 pt-4 pb-2 shrink-0">
      <div className="text-sm text-term-gray mb-2">
        Currently viewing <span className="text-term-white font-semibold">{symbol}</span> — search any company,
        ETF or index to switch, or use the command bar above for a specific function (e.g. "AAPL FA").
      </div>
      <div ref={boxRef} className="relative max-w-xl">
        <div className="flex items-center h-11 rounded-full border border-term-border bg-bg-panel/95 px-4 focus-within:border-accent-orange focus-within:shadow-glow-orange transition-all duration-200">
          <span className="text-term-gray mr-2">🔍</span>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search a stock, ETF, or index (e.g. Apple, SPY, Tesla)…"
            spellCheck={false}
            autoComplete="off"
            className="flex-1 bg-transparent text-term-white text-sm placeholder:text-term-gray focus:outline-none"
          />
        </div>
        {open && results.length > 0 && (
          <ul className="absolute left-0 top-[calc(100%+6px)] z-30 w-full max-h-72 overflow-auto rounded-lg bg-bg-panel/95 backdrop-blur-md border border-accent-orange shadow-glow-orange">
            {results.slice(0, 8).map((r) => (
              <li
                key={r.symbol}
                onMouseDown={(e) => { e.preventDefault(); pick(r.symbol); }}
                className="flex items-center justify-between px-3 py-1.5 cursor-pointer text-xs hover:bg-bg-header"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-accent-amber font-semibold w-16 shrink-0">{r.symbol}</span>
                  <span className="text-term-gray truncate">{r.name}</span>
                </span>
                <span className="text-2xs text-term-gray shrink-0 ml-2">{[r.exchange, r.type].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
        <span className="text-2xs text-term-gray uppercase tracking-wider mr-1">Quick picks</span>
        {QUICK_PICKS.map((s) => (
          <button
            key={s}
            onClick={() => pick(s)}
            className={`text-2xs px-2.5 py-1 rounded-full border transition-colors duration-150 ${
              s === symbol
                ? "border-accent-orange text-accent-orange bg-accent-orange/10"
                : "border-term-border text-term-gray hover:text-term-white hover:border-term-gray"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// The original multi-panel dashboard, now one of many functions (DASH) —
// with a friendly search hero on top so a newcomer can get going without
// knowing any mnemonics first.
export function LaunchpadView({ symbol, onSelect }: Props) {
  const { watchlist, addToWatchlist, removeFromWatchlist } = useStore();

  return (
    <div className="h-full flex flex-col overflow-auto">
      <SearchHero symbol={symbol} onSelect={onSelect} />
      <main
        className="flex-1 grid gap-3 p-3 pt-1 bg-transparent min-h-[640px]"
        style={{
          gridTemplateColumns: "240px minmax(0, 1fr) 340px",
          gridTemplateRows: "repeat(4, minmax(0, 1fr))",
          gridTemplateAreas: `
            "watch chart   quote"
            "watch chart   news"
            "watch options news"
            "watch options calendar"
          `,
        }}
      >
        <div style={{ gridArea: "watch" }} className="min-h-0 [&>*]:h-full [&>*]:[animation-delay:0ms]">
          <WatchlistPanel
            symbols={watchlist}
            selected={symbol}
            onSelect={onSelect}
            onAdd={addToWatchlist}
            onRemove={removeFromWatchlist}
          />
        </div>
        <div style={{ gridArea: "chart" }} className="min-h-0 [&>*]:h-full [&>*]:[animation-delay:60ms]"><ChartPanel symbol={symbol} /></div>
        <div style={{ gridArea: "options" }} className="min-h-0 [&>*]:h-full [&>*]:[animation-delay:180ms]"><OptionsChainPanel symbol={symbol} /></div>
        <div style={{ gridArea: "quote" }} className="min-h-0 [&>*]:h-full [&>*]:[animation-delay:120ms]"><QuoteDetailPanel symbol={symbol} /></div>
        <div style={{ gridArea: "news" }} className="min-h-0 [&>*]:h-full [&>*]:[animation-delay:150ms]"><NewsFeedPanel /></div>
        <div style={{ gridArea: "calendar" }} className="min-h-0 [&>*]:h-full [&>*]:[animation-delay:210ms]"><EconomicCalendarPanel symbol={symbol} /></div>
      </main>
    </div>
  );
}
