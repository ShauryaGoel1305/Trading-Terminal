import { useEffect, useRef } from "react";
import { Markdown } from "./Markdown";
import type { ChatMsg } from "../hooks/useAiChat";

// The shared chat body — message feed + composer — with no outer chrome of
// its own. AiAnalysisView (the AI tab) wraps this in <Panel>; AiFloatingWindow
// wraps it in its own compact draggable header. Both render the exact same
// conversation, since the message state is lifted into a single useAiChat()
// instance in App.tsx.
interface Props {
  messages: ChatMsg[];
  busy: boolean;
  onSend: (text: string) => void;
  onQuickBrief?: (symbol: string) => void;
  activeSymbol?: string;
  compact?: boolean;
}

const GENERIC_SUGGESTIONS = (symbol?: string) => [
  { label: symbol ? `📊 Full brief on ${symbol}` : "📊 Full brief on a ticker", prompt: symbol ? `Give me a full investment brief on ${symbol}.` : "Give me a full investment brief on NVDA." },
  { label: "📄 Pull up an annual report", prompt: `Show me ${symbol ?? "Apple"}'s annual report.` },
  { label: "🌍 What's moving markets today?", prompt: "What's moving markets today?" },
  { label: "⚖️ Compare two stocks", prompt: "Compare AMD and NVDA on valuation and growth." },
];

export function AiChatPanel({ messages, busy, onSend, activeSymbol, compact }: Props) {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  function autoGrow() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, compact ? 84 : 128)}px`;
  }

  function submit() {
    const text = inputRef.current?.value ?? "";
    if (!text.trim() || busy) return;
    onSend(text);
    if (inputRef.current) inputRef.current.value = "";
    autoGrow();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className={`flex-1 overflow-auto ${compact ? "px-2.5 py-3 space-y-3" : "px-3 sm:px-6 py-4 space-y-4"}`}>
        {messages.length === 0 && (
          <div className={`h-full flex flex-col items-center justify-center text-center gap-4 ${compact ? "py-3" : "py-8 gap-5"}`}>
            <div className={`rounded-full border border-accent-orange flex items-center justify-center text-accent-orange animate-pulse ${compact ? "w-9 h-9 text-base" : "w-12 h-12 text-xl"}`}>
              ✦
            </div>
            <div>
              <div className="text-term-white text-sm tracking-wide">AI Analyst</div>
              <p className={`text-term-gray max-w-md mt-2 ${compact ? "text-2xs" : "text-xs"}`}>
                Ask about any stock, sector, or the market in general — or ask me to open a chart, report, or screen
                for you.
              </p>
            </div>
            <div className={`grid grid-cols-1 ${compact ? "" : "sm:grid-cols-2"} gap-2 max-w-lg w-full`}>
              {GENERIC_SUGGESTIONS(activeSymbol).map((s) => (
                <button
                  key={s.label}
                  onClick={() => onSend(s.prompt)}
                  className="text-left text-2xs px-3 py-2 rounded-md border border-term-border bg-white/[0.02] hover:border-accent-orange hover:bg-accent-orange/[0.06] hover:text-accent-orange transition-all duration-200"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role} content={m.content} />
        ))}

        {busy && <TypingBubble />}
        <div ref={chatEndRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="border-t border-term-border/60 p-2 flex items-end gap-2 bg-bg-panel/60 backdrop-blur-md"
      >
        <textarea
          ref={inputRef}
          onChange={autoGrow}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={compact ? "Ask the AI…" : "Ask about any ticker, or say \"show me AAPL's financials\"… (Enter to send)"}
          className={`flex-1 resize-none bg-black/40 rounded-lg border border-term-border focus-ring px-3 py-2 text-term-white placeholder:text-term-gray overflow-auto ${compact ? "text-2xs max-h-20" : "text-xs max-h-32"}`}
        />
        <button
          type="submit"
          disabled={busy}
          className="px-3 py-2 text-2xs uppercase tracking-wide rounded-lg border border-accent-orange text-accent-orange hover:bg-accent-orange hover:text-black hover:shadow-glow-orange disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-accent-orange transition-all duration-200"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function ChatBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in-up`}>
      <div className={`flex gap-2 max-w-[92%] sm:max-w-[80%] ${isUser ? "flex-row-reverse" : ""}`}>
        <div
          className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-2xs font-bold ${
            isUser ? "bg-accent-orange text-black" : "bg-bg-header text-accent-amber border border-term-border"
          }`}
        >
          {isUser ? "U" : "✦"}
        </div>
        <div
          className={`px-3 py-2 rounded-xl text-left ${
            isUser ? "bg-accent-orange/15 border border-accent-orange/30 text-term-white text-xs" : "panel-glass !border-t-term-border/60 rounded-tl-sm"
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
    <div className="flex justify-start animate-fade-in">
      <div className="flex gap-2 max-w-[75%]">
        <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-2xs font-bold bg-bg-header text-accent-amber border border-term-border">✦</div>
        <div className="px-3 py-2.5 rounded-xl panel-glass !border-t-term-border/60 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-term-gray animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-term-gray animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-term-gray animate-bounce" />
        </div>
      </div>
    </div>
  );
}
