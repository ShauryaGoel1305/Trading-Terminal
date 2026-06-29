import { type ReactNode } from "react";

// Render inline **bold** within a line.
function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="text-term-white font-semibold">{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

// Minimal markdown for AI responses: #/##/### headings, - bullets, paragraphs,
// **bold**. Good enough for the terminal; no external dependency.
export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = (key: string) => {
    if (bullets.length === 0) return;
    out.push(
      <ul key={key} className="list-disc pl-5 space-y-0.5 my-1">
        {bullets.map((b, i) => (
          <li key={i} className="text-xs text-term-gray leading-snug">{inline(b)}</li>
        ))}
      </ul>
    );
    bullets = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (/^#{1,6}\s/.test(line)) {
      flushBullets(`bl-${idx}`);
      const level = line.match(/^#+/)![0].length;
      const content = line.replace(/^#+\s/, "");
      out.push(
        <div
          key={idx}
          className={`uppercase tracking-wider text-accent-amber border-b border-term-border/60 mt-3 mb-1 ${level <= 2 ? "text-2xs font-bold" : "text-2xs"}`}
        >
          {inline(content)}
        </div>
      );
    } else if (/^\s*[-*]\s+/.test(line)) {
      bullets.push(line.replace(/^\s*[-*]\s+/, ""));
    } else if (line.trim() === "") {
      flushBullets(`bl-${idx}`);
    } else {
      flushBullets(`bl-${idx}`);
      out.push(
        <p key={idx} className="text-xs text-term-gray leading-relaxed my-1">{inline(line)}</p>
      );
    }
  });
  flushBullets("bl-end");

  return <div>{out}</div>;
}
