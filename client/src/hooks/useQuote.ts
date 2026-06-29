import { api } from "../lib/api";
import { usePolling } from "./usePolling";
import type { Quote } from "../types";

/** Poll a single symbol's full quote every `intervalMs` (default 30s). */
export function useQuote(symbol: string, intervalMs = 30_000) {
  return usePolling<Quote>(() => api.quote(symbol), intervalMs, [symbol]);
}
