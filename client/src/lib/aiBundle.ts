import { api } from "./api";

// Assemble a compact data bundle for the AI from the existing endpoints.
// Extracted out of the old per-symbol AI view so the shared chat hook can
// build/cache a bundle for *any* ticker mentioned in the conversation, not
// just whatever the dashboard currently has loaded.
export async function buildAiBundle(symbol: string): Promise<Record<string, unknown>> {
  const [fund, fin, own, peers, news] = await Promise.allSettled([
    api.fundamentals(symbol),
    api.financials(symbol, "annual"),
    api.ownership(symbol),
    api.peers(symbol),
    api.news({ symbol, limit: 15 }),
  ]);
  const bundle: Record<string, unknown> = { symbol };
  if (fund.status === "fulfilled") {
    bundle.profile = { ...fund.value.profile, summary: (fund.value.profile.summary ?? "").slice(0, 1200) };
    bundle.stats = fund.value.stats;
    bundle.analyst = fund.value.analyst;
    bundle.earningsHistory = fund.value.earningsHistory;
    bundle.nextEarningsDate = fund.value.nextEarningsDate;
  }
  if (fin.status === "fulfilled") {
    bundle.financials = { periods: fin.value.periods, income: fin.value.income, balance: fin.value.balance, cashflow: fin.value.cashflow };
  }
  if (own.status === "fulfilled") {
    bundle.ownership = {
      breakdown: own.value.breakdown,
      topHolders: own.value.institutions.slice(0, 10).map((h) => ({ org: h.organization, pct: h.pctHeld, value: h.value, change: h.pctChange })),
      insiders: own.value.insiders.slice(0, 8).map((i) => ({ name: i.name, relation: i.relation, action: i.text, shares: i.shares, date: i.date })),
    };
  }
  if (peers.status === "fulfilled") bundle.peers = peers.value.peers;
  if (news.status === "fulfilled") bundle.news = news.value.map((n) => ({ headline: n.headline, source: n.source, sentiment: n.sentiment, date: n.datetime }));
  return bundle;
}
