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

  const run = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
      setLastUpdated(Date.now());
    } catch (err: any) {
      setError(err?.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (intervalMs > 0 && id === undefined) id = setInterval(run, intervalMs);
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
