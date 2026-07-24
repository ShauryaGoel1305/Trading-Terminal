import { useEffect, useMemo, useState } from "react";
import { DataState, LiveIndicator } from "../components/ui";
import { Markdown } from "../components/Markdown";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtTimeAgo } from "../lib/format";
import type { NewsItem, NewsSentiment } from "../types";

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "markets", label: "Markets" },
  { key: "crypto", label: "Crypto" },
  { key: "economy", label: "Economy" },
  { key: "funds", label: "Funds & Investors" },
  { key: "research", label: "Research" },
  { key: "video", label: "Video" },
  { key: "specialized", label: "Specialized" },
];

function paramsFor(filter: string): { category?: string; type?: string } {
  if (filter === "all") return {};
  if (filter === "research") return { type: "research" };
  if (filter === "video") return { type: "video" };
  if (filter === "specialized") return { type: "specialized" };
  return { category: filter };
}

const SENT_CLASS: Record<NewsSentiment, string> = { bullish: "up", bearish: "down", neutral: "flat" };
const SENT_ICON: Record<NewsSentiment, string> = { bullish: "▲", bearish: "▼", neutral: "●" };
const TYPE_ICON: Record<string, string> = { article: "📰", research: "🎓", video: "▶", specialized: "🎤" };
const TYPE_LABEL: Record<string, string> = { article: "ARTICLE", research: "RESEARCH", video: "VIDEO", specialized: "STATEMENT" };

export function NewsView({ symbol, headlinesOnly }: { symbol?: string; headlinesOnly?: boolean }) {
  const [filter, setFilter] = useState("all");
  const [activeSymbol, setActiveSymbol] = useState(symbol ?? "");
  const [searchInput, setSearchInput] = useState("");
  const [activePerson, setActivePerson] = useState("");

  // When navigated via "TICKER CN", follow the loaded symbol.
  useEffect(() => {
    if (symbol) setActiveSymbol(symbol.toUpperCase());
  }, [symbol]);

  const { data, loading, error, lastUpdated } = usePolling<NewsItem[]>(
    () =>
      activeSymbol
        ? api.news({ symbol: activeSymbol, limit: 60 })
        : api.news({
            ...paramsFor(filter),
            topic: filter === "specialized" && activePerson ? activePerson : undefined,
            limit: 200,
          }),
    12_000,
    [activeSymbol, filter, activePerson]
  );

  const status = usePolling(() => api.newsStatus(), 30_000, []);
  const players = usePolling(() => api.newsPlayers(), 0, []);
  const aiStatus = usePolling(() => api.aiStatus(), 0, []);

  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  async function summarize() {
    setAiOpen(true);
    setAiBusy(true);
    setAiText("");
    try {
      const opts = activeSymbol
        ? { symbol: activeSymbol }
        : { ...paramsFor(filter), topic: filter === "specialized" && activePerson ? activePerson : undefined };
      const { text } = await api.aiNewsSummary(opts);
      setAiText(text);
    } catch (e: any) {
      setAiText(`⚠ ${e?.message ?? "AI summary failed"}`);
    } finally {
      setAiBusy(false);
    }
  }

  // TOP ("Top Headlines") shows only high-traction, multi-sourced stories;
  // N shows the full feed. Same data, a narrower lens.
  const items = useMemo(() => {
    const all = data ?? [];
    return headlinesOnly ? all.filter((n) => (n.sources?.length ?? 1) >= 3) : all;
  }, [data, headlinesOnly]);
  const counts = useMemo(() => {
    const c = { bullish: 0, bearish: 0, neutral: 0 };
    for (const i of items) c[(i.sentiment ?? "neutral") as NewsSentiment]++;
    return c;
  }, [items]);

  const now = Date.now() / 1000;

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setActiveSymbol(searchInput.trim().toUpperCase());
    setSearchInput("");
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-2 py-1 bg-bg-header border-b border-term-border text-2xs">
        <span className="text-accent-amber font-semibold uppercase whitespace-nowrap">
          {headlinesOnly ? "Top Headlines" : "News & Intelligence"}{activeSymbol ? ` · ${activeSymbol}` : ""}
        </span>
        <form onSubmit={submitSearch} className="flex items-center gap-1">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="SEARCH SYMBOL (e.g. AAPL)"
            spellCheck={false}
            autoComplete="off"
            className="bg-black border border-term-border px-1 w-44 text-term-white uppercase focus:outline-none focus:ring-1 focus:ring-accent-orange"
          />
          {activeSymbol && (
            <button
              type="button"
              onClick={() => setActiveSymbol("")}
              className="text-term-red px-1 border border-term-border hover:bg-bg-secondary"
              title="Clear symbol — back to all news"
            >
              ✕ {activeSymbol}
            </button>
          )}
        </form>
        <span className="flex-1" />
        <span className="flex items-center gap-2">
          <span className="up">▲ {counts.bullish}</span>
          <span className="down">▼ {counts.bearish}</span>
          <span className="flat">● {counts.neutral}</span>
        </span>
        {status.data && (
          <span className="text-term-gray hidden lg:inline">
            {status.data.sources} sources · {status.data.total} stored
          </span>
        )}
        {aiStatus.data?.enabled && (
          <button
            onClick={summarize}
            disabled={aiBusy}
            className="px-2 py-0.5 border border-accent-orange text-accent-orange hover:bg-accent-orange hover:text-black disabled:opacity-50 uppercase"
            title="Summarise the current feed with AI"
          >
            {aiBusy ? "Summarising…" : "✦ AI Summary"}
          </button>
        )}
        {error && <span className="badge-error">Data Unavailable</span>}
        <LiveIndicator lastUpdated={lastUpdated} staleAfter={45} />
      </div>

      {/* AI summary panel */}
      {aiOpen && (
        <div className="border-b border-accent-orange bg-bg-panel px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-2xs uppercase tracking-wider text-accent-orange">
              ✦ AI Brief{activeSymbol ? ` · ${activeSymbol}` : filter !== "all" ? ` · ${filter}` : ""}
            </span>
            <button onClick={() => setAiOpen(false)} className="text-2xs text-term-gray hover:text-term-white">✕ close</button>
          </div>
          {aiBusy ? (
            <div className="text-2xs text-term-gray">Reading the latest headlines and writing a brief…</div>
          ) : (
            <Markdown text={aiText} />
          )}
        </div>
      )}

      {/* Filter bar (hidden in symbol mode) */}
      {!activeSymbol && (
        <div className="flex gap-px p-1 border-b border-term-border bg-bg-secondary overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setActivePerson(""); }}
              className={`text-2xs px-2 py-0.5 uppercase whitespace-nowrap ${
                f.key === filter ? "bg-accent-orange text-black font-bold" : "text-term-gray hover:text-term-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Big-player chips (Specialized tab) */}
      {!activeSymbol && filter === "specialized" && (
        <div className="flex gap-1 p-1 border-b border-term-border bg-bg-panel overflow-x-auto">
          <button
            onClick={() => setActivePerson("")}
            className={`text-2xs px-1.5 py-0.5 border whitespace-nowrap ${
              activePerson === "" ? "border-accent-orange text-accent-orange" : "border-term-border text-term-gray hover:text-term-white"
            }`}
          >
            ALL PLAYERS
          </button>
          {(players.data ?? []).map((p) => (
            <button
              key={p}
              onClick={() => setActivePerson(p)}
              className={`text-2xs px-1.5 py-0.5 border whitespace-nowrap ${
                activePerson === p ? "border-accent-orange text-accent-orange" : "border-term-border text-term-gray hover:text-term-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Feed */}
      <div className="flex-1 overflow-auto">
        <DataState loading={loading && items.length === 0} error={error} empty={items.length === 0} rows={14} cols={1}>
          <ul className="divide-y divide-term-border/40">
            {items.map((n) => {
              const sent = (n.sentiment ?? "neutral") as NewsSentiment;
              const type = n.type ?? "article";
              const isNew = n.firstSeen != null && now - n.firstSeen < 150;
              const isMajor = (n.sources?.length ?? 1) >= 3;
              return (
                <li key={n.id}>
                  <a href={n.url} target="_blank" rel="noreferrer" className="flex gap-2 px-2 py-1.5 hover:bg-bg-secondary">
                    <span className={`text-2xs w-4 shrink-0 text-center ${SENT_CLASS[sent]}`} title={`Sentiment: ${sent}`}>
                      {SENT_ICON[sent]}
                    </span>
                    {n.thumbnail && type === "video" ? (
                      <img src={n.thumbnail} alt="" className="w-20 h-12 object-cover shrink-0 border border-term-border" loading="lazy" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-term-white leading-snug">
                        {isNew && <span className="text-2xs text-accent-orange font-bold mr-1">NEW</span>}
                        {isMajor && <span className="text-2xs mr-1" title="High-traction / major story">🔥</span>}
                        {n.headline}
                      </div>
                      {n.summary && !n.summary.toLowerCase().startsWith(n.headline.slice(0, 40).toLowerCase()) && (
                        <div className="text-2xs text-term-gray truncate mt-0.5">{n.summary}</div>
                      )}
                      <div className="flex items-center gap-2 text-2xs mt-0.5 flex-wrap">
                        <span title={TYPE_LABEL[type]}>{TYPE_ICON[type]}</span>
                        <span className="text-accent-amber">{n.source}</span>
                        {n.topic && (
                          <button
                            onClick={(e) => { e.preventDefault(); setFilter("specialized"); setActivePerson(n.topic!); setActiveSymbol(""); }}
                            className="px-1 border border-accent-amber/60 text-accent-amber hover:bg-bg-header"
                            title={`See more from ${n.topic}`}
                          >
                            🎤 {n.topic}
                          </button>
                        )}
                        {(n.tickers ?? []).slice(0, 4).map((t) => (
                          <button
                            key={t}
                            onClick={(e) => { e.preventDefault(); setActiveSymbol(t); }}
                            className="px-1 border border-term-border text-term-green hover:bg-bg-header"
                            title={`See news for ${t}`}
                          >
                            {t}
                          </button>
                        ))}
                        <span className="flex-1" />
                        <span className="text-term-gray">{fmtTimeAgo(n.datetime)}</span>
                      </div>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        </DataState>
      </div>
    </div>
  );
}
