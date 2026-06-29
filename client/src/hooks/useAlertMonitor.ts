import { useEffect } from "react";
import { useMarketData } from "./useMarketData";
import { useStore } from "../store";

// Polls all armed-alert symbols and triggers them when the condition is met,
// raising a browser notification. Runs globally regardless of the active view.
export function useAlertMonitor() {
  const { alerts, markAlertTriggered } = useStore();
  const symbols = [...new Set(alerts.filter((a) => !a.triggered).map((a) => a.symbol))];
  const { data } = useMarketData(symbols, 30_000);

  // Ask for notification permission once.
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!data) return;
    const priceOf = new Map(data.map((q) => [q.symbol, q.price]));
    for (const a of alerts) {
      if (a.triggered) continue;
      const price = priceOf.get(a.symbol);
      if (price == null) continue;
      const hit = a.condition === "above" ? price >= a.value : price <= a.value;
      if (hit) {
        markAlertTriggered(a.id);
        const msg = `${a.symbol} is ${a.condition} ${a.value} (last ${price.toFixed(2)})`;
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Bloomberg Terminal · Alert", { body: msg });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
}
