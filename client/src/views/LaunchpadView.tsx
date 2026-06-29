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
      className="h-full grid gap-px bg-term-border"
      style={{
        gridTemplateColumns: "230px minmax(0, 1fr) 340px",
        gridTemplateRows: "repeat(4, minmax(0, 1fr))",
        gridTemplateAreas: `
          "watch chart   quote"
          "watch chart   news"
          "watch options news"
          "watch options calendar"
        `,
      }}
    >
      <div style={{ gridArea: "watch" }} className="min-h-0 [&>*]:h-full">
        <WatchlistPanel
          symbols={watchlist}
          selected={symbol}
          onSelect={onSelect}
          onAdd={addToWatchlist}
          onRemove={removeFromWatchlist}
        />
      </div>
      <div style={{ gridArea: "chart" }} className="min-h-0 [&>*]:h-full"><ChartPanel symbol={symbol} /></div>
      <div style={{ gridArea: "options" }} className="min-h-0 [&>*]:h-full"><OptionsChainPanel symbol={symbol} /></div>
      <div style={{ gridArea: "quote" }} className="min-h-0 [&>*]:h-full"><QuoteDetailPanel symbol={symbol} /></div>
      <div style={{ gridArea: "news" }} className="min-h-0 [&>*]:h-full"><NewsFeedPanel /></div>
      <div style={{ gridArea: "calendar" }} className="min-h-0 [&>*]:h-full"><EconomicCalendarPanel symbol={symbol} /></div>
    </main>
  );
}
