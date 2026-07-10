import { useEffect, useRef, useState } from "react";
import { Panel } from "../components/Panel";
import { Markdown } from "../components/Markdown";
import { SkeletonRows } from "../components/Skeleton";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";

type ChatMsg = { role: "user" | "assistant"; content: string };

// Assemble a compact data bundle for the AI from the existing endpoints.
async function buildBundle(symbol: string) {
  const [fund, fin, own, peers, news] = await Promise.allSettled([
    api.fundamentals(symbol),
    api.financials(symbol, "annual"),
    api.ownership(symbol),
    api.peers(symbol),
    api.news({ symbol, limit: 15 }),
  ]);
  const bundle: Record<string, unknown> = { symbol };
  if (fund.status === "fulfilled") {
    bundle.profile = { ...fund.value.profile, summary: (fund.value.profile.summary ?? "").slice(0, 1200) };
    bundle.stats = fund.value.stats;
    bundle.analyst = fund.value.analyst;
    bundle.earningsHistory = fund.value.earningsHistory;
    bundle.nextEarningsDate = fund.value.nextEarningsDate;
  }
  if (fin.status === "fulfilled") {
    bundle.financials = { periods: fin.value.periods, income: fin.value.income, balance: fin.value.balance, cashflow: fin.value.cashflow };
  }
  if (own.status === "fulfilled") {
    bundle.ownership = {
      breakdown: own.value.breakdown,
      topHolders: own.value.institutions.slice(0, 10).map((h) => ({ org: h.organization, pct: h.pctHeld, value: h.value, change: h.pctChange })),
      insiders: own.value.insiders.slice(0, 8).map((i) => ({ name: i.name, relation: i.relation, action: i.text, shares: i.shares, date: i.date })),
    };
  }
  if (peers.status === "fulfilled") bundle.peers = peers.value.peers;
  if (news.status === "fulfilled") bundle.news = news.value.map((n) => ({ headline: n.headline, source: n.source, sentiment: n.sentiment, date: n.datetime }));
  return bundle;
}

const SUGGESTIONS = (symbol: string) => [
  { label: "📊 Full investment brief", isBrief: true, prompt: "" },
  { label: "💰 Is the balance sheet healthy?", isBrief: false, prompt: `Is ${symbol}'s balance sheet healthy? Walk through leverage, liquidity and any red flags.` },
  { label: "⚖️ Bull case vs bear case", isBrief: false, prompt: `Give me the strongest bull case and bear case for ${symbol}.` },
  { label: "🏁 How does it compare to peers?", isBrief: false, prompt: `How does ${symbol} compare to its closest peers on valuation and growth?` },
];

export function AiAnalysisView({ symbol }: { symbol: string }) {
  const status = usePolling(() => api.aiStatus(), 0, []);
  const enabled = status.data?.enabled;

  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bundleRef = useRef<{ symbol: string; data: Record<string, unknown> } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset the conversation when the symbol changes.
  useEffect(() => {
    setChat([]);
    bundleRef.current = null;
  }, [symbol]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, busy]);

  // Auto-grow the input up to a max height, then scroll internally.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input]);

  async function ensureBundle() {
    if (bundleRef.current?.symbol === symbol) return bundleRef.current.data;
    const data = await buildBundle(symbol);
    bundleRef.current = { symbol, data };
    return data;
  }

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    const next = [...chat, { role: "user" as const, content: q }];
    setChat(next);
    setBusy(true);
    try {
      const data = await ensureBundle();
      const { text: reply } = await api.aiChat({ symbol, context: data, messages: next });
      setChat([...next, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setChat([...next, { role: "assistant", content: `⚠ ${e?.message ?? "Request failed"}` }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  // The "full brief" quick action uses the dedicated /ai/analyze endpoint
  // (structured investment-brief prompt) instead of the general chat prompt,
  // but still renders into the same conversation feed.
  async function sendFullBrief() {
    if (busy) return;
    const next = [...chat, { role: "user" as const, content: `Give me a full investment brief on ${symbol}.` }];
    setChat(next);
    setBusy(true);
    try {
      const data = await ensureBundle();
      const { text } = await api.aiAnalyze(symbol, data);
      setChat([...next, { role: "assistant", content: text }]);
    } catch (e: any) {
      setChat([...next, { role: "assistant", content: `⚠ ${e?.message ?? "Analysis failed"}` }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  if (status.loading) {
    return <div className="h-full"><SkeletonRows rows={10} cols={1} /></div>;
  }

  if (!enabled) {
    return (
      <Panel title={`AI Analyst · ${symbol}`} subtitle="DISABLED">
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="border border-accent-orange px-3 py-1 text-accent-amber text-xs uppercase tracking-widest mb-4">
            ✦ AI Features Disabled
          </div>
          <div className="max-w-md space-y-3 text-left">
            <div>
              <div className="text-2xs text-accent-amber uppercase">What this is</div>
              <p className="text-xs text-term-white">An AI equity analyst (powered by DeepSeek) that explains what the company does, its strategy, 5-year financial trajectory, who's buying it, valuation vs peers, bull/bear case and risks — through a chat interface.</p>
            </div>
            <div>
              <div className="text-2xs text-accent-amber uppercase">How to enable</div>
              <p className="text-xs text-term-gray">Add <span className="text-term-white">DEEPSEEK_API_KEY</span> to your <span className="text-term-white">.env</span> and restart the server. Get a key at <span className="text-accent-orange">platform.deepseek.com</span>. AI calls bill against your DeepSeek account.</p>
            </div>
            <div>
              <div className="text-2xs text-accent-amber uppercase">Meanwhile</div>
              <p className="text-xs text-term-green">All non-AI data — DES, FA, EE, OWN, COMP, SIG — works without a key.</p>
            </div>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title={`AI Analyst · ${symbol}`}
      subtitle={status.data?.model}
      right={
        chat.length > 0 ? (
          <button
            onClick={() => setChat([])}
            disabled={busy}
            className="text-2xs px-2 py-0.5 border border-term-border text-term-gray hover:border-accent-orange hover:text-accent-orange disabled:opacity-40"
          >
            ↻ New chat
          </button>
        ) : undefined
      }
      className="h-full"
      bodyClassName="flex flex-col p-0 min-h-0"
    >
      <div className="flex-1 overflow-auto px-3 sm:px-6 py-4 space-y-4">
        {chat.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-5 py-8">
            <div className="w-12 h-12 rounded-full border border-accent-orange flex items-center justify-center text-accent-orange text-xl">✦</div>
            <div>
              <div className="text-term-white text-sm tracking-wide">AI Analyst · {symbol}</div>
              <p className="text-xs text-term-gray max-w-md mt-2">
                Ask anything about {symbol} — fundamentals, financials, ownership, valuation vs peers, or recent news.
                Answers are grounded in live terminal data where available.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
              {SUGGESTIONS(symbol).map((s) => (
                <button
                  key={s.label}
                  onClick={() => (s.isBrief ? sendFullBrief() : send(s.prompt))}
                  className="text-left text-2xs px-3 py-2 border border-term-border bg-bg-secondary hover:border-accent-orange hover:text-accent-orange transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {chat.map((m, i) => (
          <ChatBubble key={i} role={m.role} content={m.content} />
        ))}

        {busy && <TypingBubble />}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-term-border p-2 flex items-end gap-2 bg-bg-panel">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={`Message the AI analyst about ${symbol}… (Enter to send, Shift+Enter for newline)`}
          className="flex-1 resize-none bg-black border border-term-border focus-ring px-3 py-2 text-xs text-term-white placeholder:text-term-gray max-h-32 overflow-auto"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="px-4 py-2 text-2xs uppercase tracking-wide border border-accent-orange text-accent-orange hover:bg-accent-orange hover:text-black disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-accent-orange transition-colors"
        >
          Send
        </button>
      </form>
    </Panel>
  );
}

function ChatBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex gap-2 max-w-[90%] sm:max-w-[75%] ${isUser ? "flex-row-reverse" : ""}`}>
        <div
          className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-2xs font-bold ${
            isUser ? "bg-accent-orange text-black" : "bg-bg-header text-accent-amber border border-term-border"
          }`}
        >
          {isUser ? "U" : "✦"}
        </div>
        <div
          className={`px-3 py-2 rounded-md text-left ${
            isUser ? "bg-bg-header text-term-white text-xs" : "bg-bg-secondary border border-term-border"
          }`}
        >
          {isUser ? <span className="whitespace-pre-wrap">{content}</span> : <Markdown text={content} />}
        </div>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex gap-2 max-w-[75%]">
        <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-2xs font-bold bg-bg-header text-accent-amber border border-term-border">✦</div>
        <div className="px-3 py-2.5 rounded-md bg-bg-secondary border border-term-border flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-term-gray animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-term-gray animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-term-gray animate-bounce" />
        </div>
      </div>
    </div>
  );
}
