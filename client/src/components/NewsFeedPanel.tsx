import { Panel } from "./Panel";
import { SkeletonRows } from "./Skeleton";
import { usePolling } from "../hooks/usePolling";
import { api } from "../lib/api";
import { fmtTimeAgo } from "../lib/format";

export function NewsFeedPanel() {
  // News doesn't need 20s freshness — 60s cuts request volume by 3x with no
  // perceptible staleness for a headlines feed.
  const { data, loading, error } = usePolling(() => api.news({ limit: 30 }), 60_000, []);

  return (
    <Panel title="News" subtitle="GENERAL" error={!!error && !data}>
      {loading && !data ? (
        <SkeletonRows rows={8} cols={1} />
      ) : (
        <ul className="divide-y divide-term-border/40">
          {(data ?? []).map((n) => (
            <li key={n.id}>
              <a
                href={n.url}
                target="_blank"
                rel="noreferrer"
                className="block px-2 py-1.5 transition-colors duration-150 hover:bg-white/[0.04] border-l-2 border-transparent hover:border-accent-orange"
              >
                <div className="text-xs text-term-white leading-snug">{n.headline}</div>
                <div className="flex justify-between text-2xs text-term-gray mt-0.5">
                  <span className="text-accent-amber">{n.source}</span>
                  <span>{fmtTimeAgo(n.datetime)}</span>
                </div>
              </a>
            </li>
          ))}
          {data && data.length === 0 && (
            <li className="p-3 text-2xs text-term-gray">No headlines available.</li>
          )}
        </ul>
      )}
    </Panel>
  );
}
