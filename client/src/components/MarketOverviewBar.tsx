import { useEffect, useRef, useState } from "react";
import { useMarketData } from "../hooks/useMarketData";
import { LiveIndicator } from "./ui";
import { fmtPrice, fmtPct, trendClass } from "../lib/format";
import type { Quote } from "../types";

const TICKERS: { symbol: string; label: string }[] = [
  { symbol: "SPY", label: "S&P 500" },
  { symbol: "QQQ", label: "NASDAQ" },
  { symbol: "BTC-USD", label: "BITCOIN" },
  { symbol: "EURUSD=X", label: "EUR/USD" },
  { symbol: "GC=F", label: "GOLD" },
  { symbol: "^TNX", label: "US 10Y" },
];

function Cell({ label, quote }: { label: string; quote?: Quote }) {
  const cls = trendClass(quote?.changePercent);
  const arrow = quote?.changePercent == null ? "" : quote.changePercent > 0 ? "▲" : quote.changePercent < 0 ? "▼" : "";

  // Flash the price briefly whenever it actually changes, so the strip feels
  // alive rather than just silently repainting on each poll.
  const prevPrice = useRef(quote?.price);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (quote?.price != null && prevPrice.current != null && quote.price !== prevPrice.current) {
      setFlash(quote.price > prevPrice.current ? "up" : "down");
      const id = setTimeout(() => setFlash(null), 900);
      prevPrice.current = quote.price;
      return () => clearTimeout(id);
    }
    prevPrice.current = quote?.price;
  }, [quote?.price]);

  return (
    <div
      className={`flex items-baseline gap-2 px-3 border-r border-term-border whitespace-nowrap transition-colors ${
        flash === "up" ? "animate-flash-up" : flash === "down" ? "animate-flash-down" : ""
      }`}
    >
      <span className="text-2xs text-accent-amber font-semibold">{label}</span>
      {quote && !quote.error ? (
        <>
          <span className="num text-term-white text-xs">{fmtPrice(quote.price)}</span>
          <span className={`num text-2xs ${cls}`}>
            {arrow} {fmtPct(quote.changePercent)}
          </span>
        </>
      ) : (
        <span className="text-2xs text-term-red">N/A</span>
      )}
    </div>
  );
}

export function MarketOverviewBar() {
  const symbols = TICKERS.map((t) => t.symbol);
  const { data, lastUpdated } = useMarketData(symbols, 30_000);
  const bySymbol = new Map((data ?? []).map((q) => [q.symbol, q]));

  return (
    <div className="flex items-center h-7 bg-bg-secondary border-b border-accent-orange overflow-x-auto">
      <span className="px-3 text-2xs font-bold text-accent-orange border-r border-term-border whitespace-nowrap">
        MARKETS
      </span>
      {TICKERS.map((t) => (
        <Cell key={t.symbol} label={t.label} quote={bySymbol.get(t.symbol)} />
      ))}
      <span className="flex-1" />
      <span className="px-3 border-l border-term-border">
        <LiveIndicator lastUpdated={lastUpdated} staleAfter={90} />
      </span>
    </div>
  );
}
