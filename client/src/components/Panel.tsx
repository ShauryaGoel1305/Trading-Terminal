import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  subtitle?: string;
  error?: boolean;
  right?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  className?: string;
}

export function Panel({
  title,
  subtitle,
  error,
  right,
  children,
  bodyClassName = "",
  className = "",
}: PanelProps) {
  return (
    <section className={`panel-glass animate-fade-in-up ${className}`}>
      <header className="panel-header">
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">{title}</span>
          {subtitle && <span className="text-term-gray normal-case">{subtitle}</span>}
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="badge-error">Data Unavailable</span>}
          {right}
        </div>
      </header>
      <div className={`panel-body ${bodyClassName}`}>{children}</div>
    </section>
  );
}
