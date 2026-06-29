import { Router } from "express";
import yf from "../yf.js";
import { cached } from "../cache.js";

const router = Router();

export interface CalendarEvent {
  date: string; // yyyy-mm-dd
  time?: string;
  event: string;
  category: "FOMC" | "CPI" | "NFP" | "EARNINGS" | "GDP";
  impact: "high" | "medium" | "low";
}

// First Friday of a given month → Non-Farm Payrolls release day.
function firstFriday(year: number, month: number): Date {
  const d = new Date(Date.UTC(year, month, 1));
  const day = d.getUTCDay(); // 0=Sun .. 5=Fri
  const offset = (5 - day + 7) % 7;
  d.setUTCDate(1 + offset);
  return d;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Recurring US macro events generated for the next ~4 months. These are
// the regular monthly releases; exact CPI/FOMC dates vary, so they are
// approximate placeholders meant to give the panel realistic structure.
function macroEvents(): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  const now = new Date();
  for (let i = 0; i < 4; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();

    const nfp = firstFriday(y, m);
    if (nfp >= startOfToday())
      out.push({ date: iso(nfp), time: "08:30 ET", event: "Non-Farm Payrolls", category: "NFP", impact: "high" });

    const cpi = new Date(Date.UTC(y, m, 12));
    if (cpi >= startOfToday())
      out.push({ date: iso(cpi), time: "08:30 ET", event: "CPI (Inflation) Report", category: "CPI", impact: "high" });

    // FOMC meetings roughly every 6 weeks — approximate to mid-month bi-monthly.
    if (m % 2 === 1) {
      const fomc = new Date(Date.UTC(y, m, 18));
      if (fomc >= startOfToday())
        out.push({ date: iso(fomc), time: "14:00 ET", event: "FOMC Rate Decision", category: "FOMC", impact: "high" });
    }
  }
  return out;
}

function startOfToday(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

async function earnings(symbol: string): Promise<CalendarEvent[]> {
  try {
    const r = await yf.quoteSummary(symbol, { modules: ["calendarEvents"] });
    const dates = r.calendarEvents?.earnings?.earningsDate ?? [];
    return dates
      .map((d: Date) => new Date(d))
      .filter((d: Date) => d >= startOfToday())
      .map((d: Date) => ({
        date: iso(d),
        event: `${symbol} Earnings`,
        category: "EARNINGS" as const,
        impact: "medium" as const,
      }));
  } catch {
    return [];
  }
}

// GET /api/calendar?symbol=AAPL
router.get("/", async (req, res) => {
  const symbol = req.query.symbol ? String(req.query.symbol).toUpperCase() : "";
  try {
    const events = await cached(`calendar:${symbol}`, async () => {
      const merged = [...macroEvents(), ...(symbol ? await earnings(symbol) : [])];
      return merged.sort((a, b) => a.date.localeCompare(b.date));
    }, 3600);
    res.json(events);
  } catch (err: any) {
    res.status(502).json({ error: "CALENDAR_UNAVAILABLE", message: err?.message ?? "Failed" });
  }
});

export default router;
