import { Panel } from "./Panel";
import { SkeletonRows } from "./Skeleton";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import type { CalendarEvent } from "../types";

const CATEGORY_COLOR: Record<CalendarEvent["category"], string> = {
  FOMC: "#ff6600",
  CPI: "#ffaa00",
  NFP: "#00b3ff",
  EARNINGS: "#00ff41",
  GDP: "#ff66cc",
};

interface Props {
  symbol: string;
}

export function EconomicCalendarPanel({ symbol }: Props) {
  const { data, loading, error } = usePolling(
    () => api.calendar(symbol),
    3_600_000,
    [symbol]
  );

  return (
    <Panel title="Economic Calendar" subtitle={symbol} error={!!error && !data}>
      {loading && !data ? (
        <SkeletonRows rows={6} cols={2} />
      ) : (
        <ul className="divide-y divide-term-border/40">
          {(data ?? []).map((e, i) => (
            <li key={i} className="flex items-center gap-2 px-2 py-1">
              <span
                className="text-2xs font-bold w-14 shrink-0 text-center border"
                style={{ color: CATEGORY_COLOR[e.category], borderColor: CATEGORY_COLOR[e.category] }}
              >
                {e.category}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-term-white truncate">{e.event}</div>
                <div className="text-2xs text-term-gray">
                  {e.date}
                  {e.time && ` · ${e.time}`}
                </div>
              </div>
              {e.impact === "high" && <span className="text-2xs text-term-red">HIGH</span>}
            </li>
          ))}
          {data && data.length === 0 && (
            <li className="p-3 text-2xs text-term-gray">No upcoming events.</li>
          )}
        </ul>
      )}
    </Panel>
  );
}
