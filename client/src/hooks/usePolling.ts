import { useCallback, useEffect, useRef, useState } from "react";

interface PollingState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refresh: () => void;
  lastUpdated: number | null; // epoch ms of the last successful fetch
}

/**
 * Fetch `fetcher()` on mount and then every `intervalMs`. Re-runs whenever a
 * value in `deps` changes. Keeps the previous `data` visible while refreshing
 * so the UI doesn't flash empty between polls.
 *
 * Polling pauses while the tab is hidden (saving API calls and sidestepping
 * background-timer throttling) and fires an immediate refresh when the tab
 * becomes visible again, so returning to the terminal always shows fresh data.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  deps: unknown[] = []
): PollingState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  // Monotonically increasing request id — lets us discard responses from
  // stale/superseded requests (e.g. a slow first-load fetch that resolves
  // after a newer one), which previously could flash "N/A" over good data.
  const requestIdRef = useRef(0);

  const run = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const result = await fetcherRef.current();
      if (requestId !== requestIdRef.current) return; // superseded — ignore
      setData(result);
      setError(null);
      setLastUpdated(Date.now());
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return; // superseded — ignore
      setError(err?.message ?? "Request failed");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    // Small random jitter (±10%) so panels mounted at the same time (e.g. the
    // 5-6 dashboard widgets that all poll on load) don't all re-fetch in the
    // same tick forever — spreads request bursts out over time.
    const jitteredInterval = intervalMs > 0 ? intervalMs + (Math.random() - 0.5) * 0.2 * intervalMs : intervalMs;
    const start = () => {
      if (jitteredInterval > 0 && id === undefined) id = setInterval(run, jitteredInterval);
    };
    const stop = () => {
      if (id !== undefined) {
        clearInterval(id);
        id = undefined;
      }
    };

    setLoading(true);
    run();
    start();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        run(); // refresh immediately on return
        start();
      } else {
        stop(); // pause while hidden
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, refresh: run, lastUpdated };
}
