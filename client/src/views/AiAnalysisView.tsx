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

export function AiAnalysisView({ symbol }: { symbol: string }) {
  const status = usePolling(() => api.aiStatus(), 0, []);
  const enabled = status.data?.enabled;

  const [analysis, setAnalysis] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const bundleRef = useRef<{ symbol: string; data: Record<string, unknown> } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Reset when the symbol changes.
  useEffect(() => {
    setAnalysis("");
    setError(null);
    setChat([]);
    bundleRef.current = null;
  }, [symbol]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, chatBusy]);

  async function ensureBundle() {
    if (bundleRef.current?.symbol === symbol) return bundleRef.current.data;
    const data = await buildBundle(symbol);
    bundleRef.current = { symbol, data };
    return data;
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const data = await ensureBundle();
      const { text } = await api.aiAnalyze(symbol, data);
      setAnalysis(text);
    } catch (e: any) {
      setError(e?.message ?? "Analysis failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendChat(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || chatBusy) return;
    setInput("");
    const next = [...chat, { role: "user" as const, content: q }];
    setChat(next);
    setChatBusy(true);
    try {
      const data = await ensureBundle();
      const { text } = await api.aiChat({ symbol, context: data, messages: next });
      setChat([...next, { role: "assistant", content: text }]);
    } catch (e: any) {
      setChat([...next, { role: "assistant", content: `⚠ ${e?.message ?? "Request failed"}` }]);
    } finally {
      setChatBusy(false);
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
              <p className="text-xs text-term-white">An AI equity analyst (powered by DeepSeek) that explains what the company does, its strategy, 5-year financial trajectory, who's buying it, valuation vs peers, bull/bear case and risks — plus a chat box to ask follow-ups.</p>
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
    <div className="h-full grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-px bg-term-border">
      {/* Analysis */}
      <Panel
        title={`AI Analyst · ${symbol}`}
        subtitle={status.data?.model}
        right={
          <button
            onClick={generate}
            disabled={busy}
            className="text-2xs px-2 py-0.5 border border-accent-orange text-accent-orange hover:bg-accent-orange hover:text-black disabled:opacity-50"
          >
            {busy ? "Analysing…" : analysis ? "↻ Regenerate" : "✦ Generate Analysis"}
          </button>
        }
        className="min-h-0"
      >
        <div className="p-2">
          {error && <div className="badge-error mb-2">{error}</div>}
          {busy && !analysis && (
            <div className="text-2xs text-term-gray mb-2">Reading fundamentals, 5y financials, ownership, peers & news, then reasoning… (this can take ~20-40s)</div>
          )}
          {busy && !analysis && <SkeletonRows rows={12} cols={1} />}
          {!busy && !analysis && !error && (
            <div className="text-xs text-term-gray">
              Click <span className="text-accent-orange">✦ Generate Analysis</span> for an AI investment brief on {symbol}: what it does, strategy, 5-year financials, who's buying, valuation vs peers, bull/bear case, risks and a bottom line.
            </div>
          )}
          {analysis && <Markdown text={analysis} />}
        </div>
      </Panel>

      {/* Chat */}
      <Panel title="Ask the Analyst" subtitle={symbol} className="min-h-0" bodyClassName="flex flex-col">
        <div className="flex-1 overflow-auto p-2 space-y-2">
          {chat.length === 0 && (
            <div className="text-2xs text-term-gray">
              Ask anything about {symbol} — e.g. "Is the balance sheet healthy?", "Why did revenue grow?", "What are the biggest risks?", "How does it compare to peers?"
            </div>
          )}
          {chat.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <div className={`inline-block max-w-[95%] text-left px-2 py-1 ${m.role === "user" ? "bg-bg-header text-term-white" : "bg-bg-secondary"}`}>
                {m.role === "user" ? <span className="text-xs">{m.content}</span> : <Markdown text={m.content} />}
              </div>
            </div>
          ))}
          {chatBusy && <div className="text-2xs text-term-gray">Thinking…</div>}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={sendChat} className="flex border-t border-term-border">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${symbol}…`}
            className="flex-1 bg-black px-2 py-1.5 text-xs text-term-white focus:outline-none"
          />
          <button type="submit" disabled={chatBusy} className="px-3 text-2xs text-accent-orange hover:bg-bg-secondary disabled:opacity-50 uppercase">
            Send
          </button>
        </form>
      </Panel>
    </div>
  );
}
