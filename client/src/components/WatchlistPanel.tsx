import { useEffect, useRef, useState } from "react";
import { Panel } from "./Panel";
import { SkeletonRows } from "./Skeleton";
import { useMarketData } from "../hooks/useMarketData";
import { fmtPrice, fmtPct, fmtChange, trendClass } from "../lib/format";
import type { Quote } from "../types";

interface Props {
  symbols: string[];
  selected: string;
  onSelect: (symbol: string) => void;
  onAdd: (symbol: string) => void;
  onRemove: (symbol: string) => void;
}

export function WatchlistPanel({ symbols, selected, onSelect, onAdd, onRemove }: Props) {
  const { data, loading, error } = useMarketData(symbols, 30_000);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const bySymbol = new Map((data ?? []).map((q) => [q.symbol, q]));

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    const s = input.trim().toUpperCase();
    if (s) {
      onAdd(s);
      onSelect(s);
      setInput("");
    }
  }

  // Arrow-key navigation between watchlist rows.
  function onKeyDown(e: React.KeyboardEvent) {
    const idx = symbols.indexOf(selected);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = symbols[Math.min(idx + 1, symbols.length - 1)];
      if (next) onSelect(next);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = symbols[Math.max(idx - 1, 0)];
      if (prev) onSelect(prev);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      if (selected) onRemove(selected);
    }
  }

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-symbol="${selected}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <Panel
      title="Watchlist"
      subtitle={`${symbols.length}`}
      error={!!error && !data}
      bodyClassName="flex flex-col"
    >
      <form onSubmit={submitAdd} className="flex border-b border-term-border/70 bg-black/20">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="+ ADD TICKER"
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent px-2 py-1.5 text-xs text-term-white uppercase
                     placeholder:text-term-gray focus:outline-none"
        />
        <button
          type="submit"
          className="px-2.5 text-2xs font-bold text-accent-orange hover:bg-accent-orange/10 border-l border-term-border/70 transition-colors duration-150"
        >
          ADD
        </button>
      </form>

      <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 px-2 py-1 text-2xs text-term-gray uppercase border-b border-term-border/70">
        <span>Symbol</span>
        <span className="text-right">Last</span>
        <span className="text-right">Chg%</span>
      </div>

      <div
        ref={listRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="flex-1 overflow-auto focus:outline-none"
      >
        {loading && !data ? (
          <SkeletonRows rows={8} cols={3} />
        ) : (
          symbols.map((symbol) => (
            <Row
              key={symbol}
              symbol={symbol}
              quote={bySymbol.get(symbol)}
              selected={symbol === selected}
              onSelect={() => onSelect(symbol)}
              onRemove={() => onRemove(symbol)}
            />
          ))
        )}
        {symbols.length === 0 && (
          <div className="p-3 text-2xs text-term-gray">Watchlist empty — add a ticker above.</div>
        )}
      </div>
    </Panel>
  );
}

function Row({
  symbol,
  quote,
  selected,
  onSelect,
  onRemove,
}: {
  symbol: string;
  quote?: Quote;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const cls = trendClass(quote?.changePercent);
  const failed = !quote || quote.error;
  return (
    <div
      data-symbol={symbol}
      onClick={onSelect}
      className={`group grid grid-cols-[1fr_auto_auto] items-center gap-x-2 px-2 py-1.5 cursor-pointer
        border-l-2 transition-colors duration-150 ${
          selected
            ? "border-accent-orange bg-accent-orange/[0.08]"
            : "border-transparent hover:bg-white/[0.04]"
        }`}
    >
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-xs font-semibold text-term-white truncate">{symbol}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Remove"
          className="opacity-0 group-hover:opacity-100 text-term-red text-2xs px-1 leading-none"
        >
          ✕
        </button>
      </div>
      {failed ? (
        <span className="col-span-2 text-right text-2xs text-term-red">N/A</span>
      ) : (
        <>
          <span className="num text-xs text-term-white">{fmtPrice(quote!.price)}</span>
          <div className="text-right leading-tight">
            <div className={`num text-xs ${cls}`}>{fmtPct(quote!.changePercent)}</div>
            <div className={`num text-2xs ${cls}`}>{fmtChange(quote!.change)}</div>
          </div>
        </>
      )}
    </div>
  );
}
