import { useCallback, useRef, useState } from "react";
import { api } from "../lib/api";
import { buildAiBundle } from "../lib/aiBundle";
import { FUNCTION_MAP, type FunctionCode } from "../functions";

export type ChatMsg = { role: "user" | "assistant"; content: string };

// Words that are all-caps but are essentially never what the user means when
// they type them mid-sentence — kept short and terminal-specific rather than
// trying to be an exhaustive dictionary.
const CAPS_BLOCKLIST = new Set([
  "I", "A", "THE", "IS", "IT", "OK", "AI", "ESG", "ETF", "CEO", "CFO", "IPO",
  "GDP", "CPI", "EPS", "USD", "EUR", "GBP", "PE", "Q1", "Q2", "Q3", "Q4",
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
  const bundleCache = useRef<Map<string, Record<string, unknown>>>(new Map());

  const ensureBundle = useCallback(async (symbol: string) => {
    const key = symbol.toUpperCase();
    const cached = bundleCache.current.get(key);
    if (cached) return cached;
    const data = await buildAiBundle(key);
    bundleCache.current.set(key, data);
    return data;
  }, []);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || busy) return;
      const next = [...messages, { role: "user" as const, content: q }];
      setMessages(next);
      setBusy(true);
      try {
        const sym = detectSymbol(q) ?? activeSymbol;
        const context = sym ? await ensureBundle(sym).catch(() => undefined) : undefined;
        const res = await api.aiChat({ symbol: sym, context, messages: next });
        let replyText = res.text || "";
        if (res.navigate?.code && res.navigate.code in FUNCTION_MAP) {
          onNavigate(res.navigate.symbol, res.navigate.code as FunctionCode);
          if (!replyText) {
            replyText = `Opened ${res.navigate.code}${res.navigate.symbol ? ` for ${res.navigate.symbol}` : ""}.`;
          }
        }
        setMessages([...next, { role: "assistant", content: replyText || "…" }]);
      } catch (e: any) {
        setMessages([...next, { role: "assistant", content: `⚠ ${e?.message ?? "Request failed"}` }]);
      } finally {
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
      try {
        const data = await ensureBundle(sym);
        const { text } = await api.aiAnalyze(sym, data);
        setMessages([...next, { role: "assistant", content: text }]);
      } catch (e: any) {
        setMessages([...next, { role: "assistant", content: `⚠ ${e?.message ?? "Analysis failed"}` }]);
      } finally {
        setBusy(false);
      }
    },
    [messages, busy, ensureBundle]
  );

  const clear = useCallback(() => setMessages([]), []);

  return { messages, busy, send, sendFullBrief, clear };
}
