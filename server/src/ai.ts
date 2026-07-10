import OpenAI from "openai";

// DeepSeek exposes an OpenAI-compatible Chat Completions API at api.deepseek.com.
// "deepseek-chat" (V3) is the fast/cheap default; "deepseek-reasoner" (R1) adds
// native chain-of-thought reasoning and is used automatically for calls that
// request `think: true` (deeper analysis / chat), mirroring the old
// think-on/off toggle from the Anthropic version of this file.
const CHAT_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const REASONER_MODEL = process.env.DEEPSEEK_REASONER_MODEL || "deepseek-reasoner";

let client: OpenAI | null = null;
function getClient(): OpenAI | null {
  if (!process.env.DEEPSEEK_API_KEY) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: "https://api.deepseek.com",
    });
  }
  return client;
}

export function aiEnabled(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

export function aiModel(): string {
  return CHAT_MODEL;
}

export class AiDisabledError extends Error {
  constructor() {
    super("AI is disabled — set DEEPSEEK_API_KEY in the server environment.");
    this.name = "AiDisabledError";
  }
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface CallOpts {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
  /** Route to DeepSeek's reasoning model (deepseek-reasoner) for deeper analysis. */
  think?: boolean;
}

// Single entry point. Keeps the same name/shape as the old Anthropic-backed
// helper so the route handlers barely had to change.
export async function callAI({ system, messages, maxTokens = 8000, think = true }: CallOpts): Promise<string> {
  const c = getClient();
  if (!c) throw new AiDisabledError();

  const model = think ? REASONER_MODEL : CHAT_MODEL;

  const completion = await c.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: "system", content: system }, ...messages],
  });

  return (completion.choices[0]?.message?.content ?? "").trim();
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
