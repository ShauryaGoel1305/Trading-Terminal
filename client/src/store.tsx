import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Position, Alert, PaperOrder } from "./types";

const KEYS = {
  watchlist: "bbg.watchlist",
  positions: "bbg.positions",
  orders: "bbg.orders",
  alerts: "bbg.alerts",
};

const DEFAULT_WATCHLIST = ["AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META"];

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface Store {
  watchlist: string[];
  addToWatchlist: (s: string) => void;
  removeFromWatchlist: (s: string) => void;

  positions: Position[];
  orders: PaperOrder[];
  placeOrder: (symbol: string, side: "BUY" | "SELL", qty: number, price: number) => string | null;
  removePosition: (symbol: string) => void;

  alerts: Alert[];
  addAlert: (symbol: string, condition: "above" | "below", value: number) => void;
  removeAlert: (id: string) => void;
  markAlertTriggered: (id: string) => void;
}

const StoreCtx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const w = load<string[]>(KEYS.watchlist, DEFAULT_WATCHLIST);
    return Array.isArray(w) && w.length ? w : DEFAULT_WATCHLIST;
  });
  const [positions, setPositions] = useState<Position[]>(() => load(KEYS.positions, []));
  const [orders, setOrders] = useState<PaperOrder[]>(() => load(KEYS.orders, []));
  const [alerts, setAlerts] = useState<Alert[]>(() => load(KEYS.alerts, []));

  useEffect(() => localStorage.setItem(KEYS.watchlist, JSON.stringify(watchlist)), [watchlist]);
  useEffect(() => localStorage.setItem(KEYS.positions, JSON.stringify(positions)), [positions]);
  useEffect(() => localStorage.setItem(KEYS.orders, JSON.stringify(orders)), [orders]);
  useEffect(() => localStorage.setItem(KEYS.alerts, JSON.stringify(alerts)), [alerts]);

  const addToWatchlist = useCallback((s: string) => {
    const sym = s.trim().toUpperCase();
    if (sym) setWatchlist((p) => (p.includes(sym) ? p : [...p, sym]));
  }, []);
  const removeFromWatchlist = useCallback(
    (s: string) => setWatchlist((p) => p.filter((x) => x !== s)),
    []
  );

  // Simulated fill: BUY adds shares and re-averages cost; SELL reduces shares.
  const placeOrder = useCallback(
    (symbol: string, side: "BUY" | "SELL", qty: number, price: number): string | null => {
      const sym = symbol.trim().toUpperCase();
      if (!sym || qty <= 0 || price <= 0) return "Invalid order";
      let error: string | null = null;
      setPositions((prev) => {
        const existing = prev.find((p) => p.symbol === sym);
        if (side === "BUY") {
          if (!existing) return [...prev, { symbol: sym, qty, costBasis: price }];
          const newQty = existing.qty + qty;
          const newCost = (existing.costBasis * existing.qty + price * qty) / newQty;
          return prev.map((p) => (p.symbol === sym ? { ...p, qty: newQty, costBasis: newCost } : p));
        } else {
          if (!existing || existing.qty < qty) {
            error = "Insufficient shares to sell";
            return prev;
          }
          const newQty = existing.qty - qty;
          if (newQty === 0) return prev.filter((p) => p.symbol !== sym);
          return prev.map((p) => (p.symbol === sym ? { ...p, qty: newQty } : p));
        }
      });
      if (!error) {
        setOrders((prev) => [
          { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, symbol: sym, side, qty, price, ts: Date.now() },
          ...prev,
        ].slice(0, 100));
      }
      return error;
    },
    []
  );

  const removePosition = useCallback(
    (symbol: string) => setPositions((p) => p.filter((x) => x.symbol !== symbol)),
    []
  );

  const addAlert = useCallback((symbol: string, condition: "above" | "below", value: number) => {
    const sym = symbol.trim().toUpperCase();
    if (!sym || !(value > 0)) return;
    setAlerts((p) => [
      { id: `${Date.now()}`, symbol: sym, condition, value, triggered: false, createdAt: Date.now() },
      ...p,
    ]);
  }, []);
  const removeAlert = useCallback((id: string) => setAlerts((p) => p.filter((a) => a.id !== id)), []);
  const markAlertTriggered = useCallback(
    (id: string) => setAlerts((p) => p.map((a) => (a.id === id ? { ...a, triggered: true } : a))),
    []
  );

  return (
    <StoreCtx.Provider
      value={{
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
        positions,
        orders,
        placeOrder,
        removePosition,
        alerts,
        addAlert,
        removeAlert,
        markAlertTriggered,
      }}
    >
      {children}
    </StoreCtx.Provider>
  );
}

export function useStore(): Store {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
