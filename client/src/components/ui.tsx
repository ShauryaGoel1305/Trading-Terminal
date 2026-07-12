import { useEffect, useState, type ReactNode } from "react";
import { SkeletonRows } from "./Skeleton";

// A pulsing "LIVE" dot with a self-ticking "updated Xs ago" age. Goes grey if
// the last successful update is stale (older than `staleAfter` seconds).
export function LiveIndicator({
  lastUpdated,
  label = "LIVE",
  staleAfter = 120,
}: {
  lastUpdated: number | null;
  label?: string;
  staleAfter?: number;
}) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const ageSec = lastUpdated == null ? null : Math.max(0, Math.floor((Date.now() - lastUpdated) / 1000));
  const stale = ageSec != null && ageSec > staleAfter;

  return (
    <span className="flex items-center gap-1 text-2xs whitespace-nowrap" title={lastUpdated ? `Last updated ${new Date(lastUpdated).toLocaleTimeString()}` : "Awaiting data"}>
      <span className={`live-dot ${stale ? "stale" : ""}`} />
      <span className={stale ? "text-term-gray" : "text-term-green"}>{label}</span>
      {ageSec != null && <span className="text-term-gray">{ageSec < 2 ? "now" : `${ageSec}s ago`}</span>}
    </span>
  );
}

// Wraps a panel body: shows skeleton while loading, an error message on
// failure, an empty hint when there's no data, otherwise the children.
export function DataState({
  loading,
  error,
  empty,
  children,
  rows = 8,
  cols = 3,
}: {
  loading: boolean;
  error?: string | null;
  empty?: boolean;
  children: ReactNode;
  rows?: number;
  cols?: number;
}) {
  if (loading) return <SkeletonRows rows={rows} cols={cols} />;
  if (error) return <div className="p-3 text-2xs text-term-red uppercase">⚠ {error}</div>;
  if (empty) return <div className="p-3 text-2xs text-term-gray">No data available.</div>;
  return <>{children}</>;
}

// A label/value metric cell used throughout the security views.
export function Metric({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-baseline justify-between px-2 py-1 border-b border-term-border/40 gap-2 transition-colors duration-200 hover:bg-white/[0.03]">
      <span className="text-2xs text-term-gray uppercase truncate">{label}</span>
      <span className={`num text-xs text-term-white ${valueClass}`}>{value}</span>
    </div>
  );
}

// A section header bar inside a panel body.
export function SectionHead({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-2 py-1 bg-bg-secondary/90 backdrop-blur-sm text-2xs uppercase tracking-wider text-accent-amber border-b border-term-border sticky top-0 z-10">
      <span>{title}</span>
      {right}
    </div>
  );
}
