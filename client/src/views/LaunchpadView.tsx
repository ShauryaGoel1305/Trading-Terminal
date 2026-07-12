import { WatchlistPanel } from "../components/WatchlistPanel";
import { ChartPanel } from "../components/ChartPanel";
import { QuoteDetailPanel } from "../components/QuoteDetailPanel";
import { NewsFeedPanel } from "../components/NewsFeedPanel";
import { OptionsChainPanel } from "../components/OptionsChainPanel";
import { EconomicCalendarPanel } from "../components/EconomicCalendarPanel";
import { useStore } from "../store";

interface Props {
  symbol: string;
  onSelect: (s: string) => void;
}

// The original multi-panel dashboard, now one of many functions (DASH).
export function LaunchpadView({ symbol, onSelect }: Props) {
  const { watchlist, addToWatchlist, removeFromWatchlist } = useStore();

  return (
    <main
      className="h-full grid gap-3 p-3 bg-transparent overflow-auto"
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
  );
}
