import { Panel } from "../components/Panel";
import { AiChatPanel } from "../components/AiChatPanel";
import { SkeletonRows } from "../components/Skeleton";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import type { ChatMsg } from "../hooks/useAiChat";

// Thin Panel-wrapped shell around the shared AiChatPanel body. This is one of
// two "shells" for the same conversation — the other is AiFloatingWindow.
// Message state is NOT local here; it's lifted into a single useAiChat()
// instance in App.tsx and passed down as props, so the tab and the floating
// window always show the same conversation regardless of which is open.
interface Props {
  messages: ChatMsg[];
  busy: boolean;
  onSend: (text: string) => void;
  onClear: () => void;
  activeSymbol?: string;
}

export function AiAnalysisView({ messages, busy, onSend, onClear, activeSymbol }: Props) {
  const status = usePolling(() => api.aiStatus(), 0, []);
  const enabled = status.data?.enabled;

  if (status.loading) {
    return <div className="h-full"><SkeletonRows rows={10} cols={1} /></div>;
  }

  if (!enabled) {
    return (
      <Panel title="AI Analyst" subtitle="DISABLED">
        <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-full border border-accent-orange/50 bg-accent-orange/[0.06] flex items-center justify-center text-accent-orange text-lg mb-3">
            ✦
          </div>
          <div className="border border-accent-orange/60 rounded-full px-3 py-1 text-accent-amber text-2xs uppercase tracking-widest mb-5">
            AI Features Disabled
          </div>
          <div className="max-w-md w-full space-y-2.5 text-left">
            <div className="panel-glass !border-t-term-border/60 p-3 rounded-md">
              <div className="text-2xs text-accent-amber uppercase tracking-wide font-semibold">What this is</div>
              <p className="text-xs text-term-white mt-1 leading-relaxed">
                An open-ended AI markets assistant (powered by DeepSeek) that can discuss any company or topic, pull
                in live terminal data for grounded analysis, and navigate the terminal to reports/charts/screens on
                your behalf.
              </p>
            </div>
            <div className="panel-glass !border-t-term-border/60 p-3 rounded-md">
              <div className="text-2xs text-accent-amber uppercase tracking-wide font-semibold">How to enable</div>
              <p className="text-xs text-term-gray mt-1 leading-relaxed">
                Add <span className="text-term-white">DEEPSEEK_API_KEY</span> to your <span className="text-term-white">.env</span> and restart the server. Get a key at <span className="text-accent-orange">platform.deepseek.com</span>. AI calls bill against your DeepSeek account.
              </p>
            </div>
            <div className="panel-glass !border-t-term-green/50 p-3 rounded-md">
              <div className="text-2xs text-term-green uppercase tracking-wide font-semibold">Meanwhile</div>
              <p className="text-xs text-term-green/90 mt-1 leading-relaxed">All non-AI data — DES, FA, EE, OWN, COMP, SIG — works without a key.</p>
            </div>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="AI Analyst"
      subtitle={status.data?.model}
      right={
        messages.length > 0 ? (
          <button
            onClick={onClear}
            disabled={busy}
            className="text-2xs px-2 py-0.5 rounded-full border border-term-border text-term-gray hover:border-accent-orange hover:text-accent-orange disabled:opacity-40 transition-colors duration-150"
          >
            ↻ New chat
          </button>
        ) : undefined
      }
      className="h-full"
      bodyClassName="flex flex-col p-0 min-h-0"
    >
      <AiChatPanel messages={messages} busy={busy} onSend={onSend} activeSymbol={activeSymbol} />
    </Panel>
  );
}
