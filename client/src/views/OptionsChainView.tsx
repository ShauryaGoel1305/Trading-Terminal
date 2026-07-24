import { OptionsChainPanel } from "../components/OptionsChainPanel";

// OMON — the same options chain already used inside DASH, given its own
// full-page home so it's reachable as a dedicated function too.
export function OptionsChainView({ symbol }: { symbol: string }) {
  return (
    <div className="h-full p-3">
      <OptionsChainPanel symbol={symbol} />
    </div>
  );
}
