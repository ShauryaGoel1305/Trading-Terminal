/**
 * Broker Research route (BRC)
 * Surfaces named-firm sell-side research actions for any covered ticker:
 * upgrades, downgrades, initiations, rating reiterations and price-target
 * revisions from Goldman Sachs, Morgan Stanley, JP Morgan, Jefferies, UBS,
 * Barclays, Citigroup, etc.
 *
 * Source: Yahoo's quoteSummary `upgradeDowngradeHistory` + `financialData` +
 * `recommendationTrend` modules. The proprietary full-text PDFs sit behind each
 * broker's paywall, but the rating/target ACTIONS themselves are public and are
 * what this view aggregates.
 */
import { Router } from "express";
import yf from "../yf.js";
import { cached } from "../cache.js";

const router = Router();

const OPT = { validateResult: false } as const;

// Map Yahoo's terse action codes to readable labels + a normalized kind.
function normAction(action: string, from: string, to: string): { label: string; kind: BrokerAction["kind"] } {
  switch ((action ?? "").toLowerCase()) {
    case "up":   return { label: "Upgrade", kind: "upgrade" };
    case "down": return { label: "Downgrade", kind: "downgrade" };
    case "init": return { label: "Initiated", kind: "initiate" };
    case "reit": return { label: "Reiterated", kind: "maintain" };
    case "main": return { label: "Maintained", kind: "maintain" };
    default:
      // Fall back to comparing grades when the code is missing/unknown.
      if (from && to && from !== to) return { label: "Rearranged", kind: "maintain" };
      return { label: action || "Update", kind: "maintain" };
  }
}

export interface BrokerAction {
  firm: string;
  fromGrade: string;
  toGrade: string;
  action: string;        // readable label e.g. "Upgrade"
  kind: "upgrade" | "downgrade" | "initiate" | "maintain";
  date: string | null;   // ISO date
}

router.get("/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const data = await cached(`broker:${symbol}`, async () => {
      const r: any = await yf.quoteSummary(
        symbol,
        { modules: ["upgradeDowngradeHistory", "financialData", "recommendationTrend", "price"] },
        OPT
      );

      const rawHist: any[] = r.upgradeDowngradeHistory?.history ?? [];
      const actions: BrokerAction[] = rawHist
        .map((h) => {
          const from = h.fromGrade ?? "";
          const to = h.toGrade ?? "";
          const { label, kind } = normAction(h.action, from, to);
          const d = h.epochGradeDate;
          return {
            firm: h.firm ?? "—",
            fromGrade: from,
            toGrade: to,
            action: label,
            kind,
            date: d ? new Date(d).toISOString() : null,
          } as BrokerAction;
        })
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

      // Per-firm latest rating: who covers the stock and their current call.
      const byFirm = new Map<string, BrokerAction>();
      for (const a of actions) {
        if (!byFirm.has(a.firm)) byFirm.set(a.firm, a); // actions already newest-first
      }
      const coverage = [...byFirm.values()].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

      // Activity counts over the trailing 90 days.
      const cutoff = Date.now() - 90 * 86400_000;
      const recent = actions.filter((a) => a.date && new Date(a.date).getTime() >= cutoff);
      const summary = {
        totalActions: actions.length,
        coveringFirms: coverage.length,
        upgrades90d: recent.filter((a) => a.kind === "upgrade").length,
        downgrades90d: recent.filter((a) => a.kind === "downgrade").length,
        initiations90d: recent.filter((a) => a.kind === "initiate").length,
        actions90d: recent.length,
      };

      const fd = r.financialData ?? {};
      const price = r.price ?? {};
      const targets = {
        current: fd.currentPrice ?? price.regularMarketPrice ?? null,
        mean: fd.targetMeanPrice ?? null,
        median: fd.targetMedianPrice ?? null,
        high: fd.targetHighPrice ?? null,
        low: fd.targetLowPrice ?? null,
        recommendationKey: fd.recommendationKey ?? null,
        recommendationMean: fd.recommendationMean ?? null,
        numberOfAnalysts: fd.numberOfAnalystOpinions ?? null,
      };

      const trend = (r.recommendationTrend?.trend ?? []).map((t: any) => ({
        period: t.period,
        strongBuy: t.strongBuy ?? 0,
        buy: t.buy ?? 0,
        hold: t.hold ?? 0,
        sell: t.sell ?? 0,
        strongSell: t.strongSell ?? 0,
      }));

      return {
        symbol,
        companyName: price.longName ?? price.shortName ?? symbol,
        summary,
        targets,
        coverage,
        actions,
        recommendationTrend: trend,
      };
    });

    res.json(data);
  } catch (err: any) {
    console.error("[broker]", err?.message);
    res.status(502).json({ error: "BROKER_ERROR", message: err?.message ?? "Broker research lookup failed" });
  }
});

export default router;
