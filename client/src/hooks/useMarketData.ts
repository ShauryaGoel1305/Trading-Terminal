import { api } from "../lib/api";
import { usePolling } from "./usePolling";
import type { Quote } from "../types";

/** Poll a batch of symbols every `intervalMs` (default 30s). */
export function useMarketData(symbols: string[], intervalMs = 30_000) {
  const key = symbols.join(",");
  return usePolling<Quote[]>(
    () => (symbols.length ? api.quotes(symbols) : Promise.resolve([])),
    intervalMs,
    [key]
  );
}
