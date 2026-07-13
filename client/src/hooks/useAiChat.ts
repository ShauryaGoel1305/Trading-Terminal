import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { buildAiBundle } from "../lib/aiBundle";
import { FUNCTION_CODES, FUNCTION_MAP, type FunctionCode } from "../functions";

export type ChatMsg = { role: "user" | "assistant"; content: string };

// Words that are all-caps but are essentially never what the user means when
// they type them mid-sentence — kept short and terminal-specific rather than
// trying to be an exhaustive dictionary. Also excludes every terminal
// function code (AR, CF, FA, DES, GP, ...) — without this, a message like
// "show me the AR for MSFT" would misdetect "AR" as the ticker (since it's
// the first all-caps token) instead of "MSFT".
const CAPS_BLOCKLIST = new Set([
  "I", "A", "THE", "IS", "IT", "OK", "AI", "ESG", "ETF", "CEO", "CFO", "IPO",
  "GDP", "CPI", "EPS", "USD", "EUR", "GBP", "PE", "Q1", "Q2", "Q3", "Q4",
  // Common all-caps abbreviations that read as tickers to the regex below
  // but are almost never what the user means (geography, market slang).
  "US", "UK", "EU", "UAE", "USA", "NYSE", "SEC", "FED", "ATH", "ATL",
  "YOY", "QOQ", "ROI", "ROE", "ASAP", "FYI", "TBD", "TLDR",
  ...FUNCTION_CODES,
]);

// Very lightweight ticker sniffing: look for a 1-5 letter all-caps token in
// the raw (un-uppercased) message. Good enough to catch "show me AAPL" or
// "what about TSLA vs GM" without a full NLP pass.
function detectSymbol(text: string): string | undefined {
  const matches = text.match(/\b[A-Z]{1,5}\b/g);
  if (!matches) return undefined;
  const candidate = matches.find((m) => !CAPS_BLOCKLIST.has(m));
  return candidate;
}

// How long a per-symbol data bundle stays fresh before ensureBundle refetches
// it. Long enough that a single conversation about a ticker doesn't refetch
// on every message; short enough that revisiting a ticker later in the same
// session doesn't hand the model stale financials/news as "current" context.
const BUNDLE_TTL_MS = 5 * 60 * 1000;

interface UseAiChatOpts {
  /** Whatever ticker the dashboard currently has loaded — used as a fallback
   *  hint only, never a hard requirement. */
  activeSymbol?: string;
  /** Called when the AI's `navigate` tool fires with a validated function code. */
  onNavigate: (symbol: string | undefined, code: FunctionCode) => void;
}

export function useAiChat({ activeSymbol, onNavigate }: UseAiChatOpts) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [busy, setBusy] = useState(false);
  const bundleCache = useRef<Map<string, { data: Record<string, unknown>; ts: number }>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  // Abort whatever's in flight if the whole hook instance ever goes away
  // (e.g. a future refactor that no longer lifts it to the app root).
  useEffect(() => () => abortRef.current?.abort(), []);

  const ensureBundle = useCallback(async (symbol: string) => {
    const key = symbol.toUpperCase();
    const cached = bundleCache.current.get(key);
    if (cached && Date.now() - cached.ts < BUNDLE_TTL_MS) return cached.data;
    const data = await buildAiBundle(key);
    bundleCache.current.set(key, { data, ts: Date.now() });
    return data;
  }, []);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || busy) return;
      const next = [...messages, { role: "user" as const, content: q }];
      setMessages(next);
      setBusy(true);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const sym = detectSymbol(q) ?? activeSymbol;
        const context = sym ? await ensureBundle(sym).catch(() => undefined) : undefined;
        const res = await api.aiChat({ symbol: sym, context, messages: next }, { signal: controller.signal });
        let replyText = res.text || "";
        if (res.navigate?.code && res.navigate.code in FUNCTION_MAP) {
          onNavigate(res.navigate.symbol, res.navigate.code as FunctionCode);
          if (!replyText) {
            replyText = `Opened ${res.navigate.code}${res.navigate.symbol ? ` for ${res.navigate.symbol}` : ""}.`;
          }
        }
        setMessages([...next, { role: "assistant", content: replyText || "…" }]);
      } catch (e: any) {
        if (e?.name === "AbortError") {
          setMessages([...next, { role: "assistant", content: "⚠ Stopped." }]);
        } else {
          setMessages([...next, { role: "assistant", content: `⚠ ${e?.message ?? "Request failed"}` }]);
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setBusy(false);
      }
    },
    [messages, busy, activeSymbol, ensureBundle, onNavigate]
  );

  // The "full brief" quick action uses the dedicated /ai/analyze endpoint
  // (structured investment-brief prompt) instead of the general chat prompt,
  // but still renders into the same conversation feed.
  const sendFullBrief = useCallback(
    async (symbol: string) => {
      if (busy) return;
      const sym = symbol.toUpperCase();
      const next = [...messages, { role: "user" as const, content: `Give me a full investment brief on ${sym}.` }];
      setMessages(next);
      setBusy(true);
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const data = await ensureBundle(sym);
        const { text } = await api.aiAnalyze(sym, data, { signal: controller.signal });
        setMessages([...next, { role: "assistant", content: text }]);
      } catch (e: any) {
        if (e?.name === "AbortError") {
          setMessages([...next, { role: "assistant", content: "⚠ Stopped." }]);
        } else {
          setMessages([...next, { role: "assistant", content: `⚠ ${e?.message ?? "Analysis failed"}` }]);
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setBusy(false);
      }
    },
    [messages, busy, ensureBundle]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    bundleCache.current.clear();
  }, []);

  return { messages, busy, send, sendFullBrief, stop, clear };
}
