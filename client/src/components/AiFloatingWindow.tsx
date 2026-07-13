import { useCallback, useRef, useState } from "react";
import { AiChatPanel } from "./AiChatPanel";
import type { ChatMsg } from "../hooks/useAiChat";

interface Props {
  open: boolean;
  onClose: () => void;
  messages: ChatMsg[];
  busy: boolean;
  onSend: (text: string) => void;
  onQuickBrief: (symbol: string) => void;
  onStop: () => void;
  onClear: () => void;
  enabled: boolean;
  model?: string;
  activeSymbol?: string;
}

const MIN_W = 320;
const MIN_H = 360;

// If max ends up below min (e.g. the window was dragged close enough to the
// viewport edge that the remaining space is under the minimum size), floor
// at min instead of collapsing to that too-small max.
function clamp(v: number, min: number, max: number) {
  if (max < min) return min;
  return Math.min(Math.max(v, min), max);
}

// A draggable, resizable chat window that floats above the Dashboard or Quant
// section so the user can chat with the AI while looking at data underneath,
// without leaving whatever screen they're on. Shares the exact same
// conversation as the AI tab (AiAnalysisView) via lifted props — opening this
// mid-conversation picks up right where the tab left off.
export function AiFloatingWindow({ open, onClose, messages, busy, onSend, onQuickBrief, onStop, onClear, enabled, model, activeSymbol }: Props) {
  const [pos, setPos] = useState(() => ({ x: Math.max(24, window.innerWidth - 420), y: 90 }));
  const [size, setSize] = useState({ w: 380, h: 520 });
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeState = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  const onDragStart = useCallback((e: React.PointerEvent) => {
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);
  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPos({
      x: clamp(dragState.current.origX + dx, 0, window.innerWidth - 120),
      y: clamp(dragState.current.origY + dy, 0, window.innerHeight - 60),
    });
  }, []);
  const onDragEnd = useCallback(() => { dragState.current = null; }, []);

  const onResizeStart = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    resizeState.current = { startX: e.clientX, startY: e.clientY, origW: size.w, origH: size.h };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [size]);
  const onResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizeState.current) return;
    e.stopPropagation();
    const dw = e.clientX - resizeState.current.startX;
    const dh = e.clientY - resizeState.current.startY;
    setSize({
      w: clamp(resizeState.current.origW + dw, MIN_W, Math.min(720, window.innerWidth - pos.x - 8)),
      h: clamp(resizeState.current.origH + dh, MIN_H, Math.min(860, window.innerHeight - pos.y - 8)),
    });
  }, [pos]);
  const onResizeEnd = useCallback(() => { resizeState.current = null; }, []);

  if (!open) return null;

  return (
    <div
      className="fixed z-[100] flex flex-col panel-glass !border-t-accent-orange shadow-glow-orange animate-scale-in origin-top-right"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      <div
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        className="flex items-center justify-between px-3 py-2 border-b border-term-border/60 cursor-move select-none bg-bg-header/80 backdrop-blur-md rounded-t-md"
      >
        <span className="text-2xs font-bold text-accent-orange uppercase tracking-wide flex items-center gap-1.5">
          <span className="live-dot" />
          ✦ AI Analyst{model ? <span className="text-term-gray font-normal normal-case ml-1">· {model}</span> : null}
        </span>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={onClear}
              disabled={busy}
              title="New chat"
              className="text-2xs text-term-gray hover:text-accent-orange px-1.5 disabled:opacity-40 transition-colors duration-150"
            >
              ↻
            </button>
          )}
          <button onClick={onClose} title="Close" className="text-term-gray hover:text-term-red text-sm px-1.5 transition-colors duration-150">
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {enabled ? (
          <AiChatPanel
            messages={messages}
            busy={busy}
            onSend={onSend}
            onQuickBrief={onQuickBrief}
            onStop={onStop}
            activeSymbol={activeSymbol}
            compact
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center gap-2">
            <span className="text-2xl text-accent-orange">✦</span>
            <p className="text-2xs text-term-gray max-w-[220px]">
              AI is disabled — add <span className="text-term-white">DEEPSEEK_API_KEY</span> on the server to enable it.
            </p>
          </div>
        )}
      </div>

      <div
        onPointerDown={onResizeStart}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeEnd}
        title="Resize"
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-60 hover:opacity-100 transition-opacity duration-150"
        style={{ background: "linear-gradient(135deg, transparent 50%, rgba(255,102,0,0.65) 50%)" }}
      />
    </div>
  );
}
