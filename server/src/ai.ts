import Anthropic from "@anthropic-ai/sdk";

// Default to the most capable model; override with ANTHROPIC_MODEL if desired.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  return client;
}

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function aiModel(): string {
  return MODEL;
}

export class AiDisabledError extends Error {
  constructor() {
    super("AI is disabled — set ANTHROPIC_API_KEY in the server environment.");
    this.name = "AiDisabledError";
  }
}

interface CallOpts {
  system: string;
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  /** Adaptive thinking helps on analysis; turn off for short summaries. */
  think?: boolean;
}

// Single entry point. Streams server-side (via .finalMessage()) so large
// outputs don't hit the SDK's non-streaming HTTP timeout, then returns the
// concatenated text. Caches the (stable) system prompt prefix.
export async function callClaude({ system, messages, maxTokens = 8000, think = true }: CallOpts): Promise<string> {
  const c = getClient();
  if (!c) throw new AiDisabledError();

  const stream = c.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    ...(think ? { thinking: { type: "adaptive" } } : {}),
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages,
  });

  const final = await stream.finalMessage();
  return final.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// Trim a JSON context payload so we don't blow the token budget on huge inputs.
export function compactJson(data: unknown, maxChars = 22000): string {
  let s: string;
  try {
    s = JSON.stringify(data);
  } catch {
    s = String(data);
  }
  return s.length > maxChars ? s.slice(0, maxChars) + " …[truncated]" : s;
}
