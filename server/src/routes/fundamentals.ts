import { Router } from "express";
import yf from "../yf.js";
import { cached } from "../cache.js";

const router = Router();

// Yahoo's quoteSummary result schema drifts often; disable result validation
// so a single changed field can't crash an entire panel.
const OPT = { validateResult: false } as const;

// ── Company profile + key stats + estimates bundle (DES, EE views) ──────
router.get("/fundamentals/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const data = await cached(`fund:${symbol}`, async () => {
      const r: any = await yf.quoteSummary(
        symbol,
        {
          modules: [
            "assetProfile",
            "summaryDetail",
            "defaultKeyStatistics",
            "financialData",
            "price",
            "earnings",
            "earningsHistory",
            "earningsTrend",
            "recommendationTrend",
            "calendarEvents",
          ],
        },
        OPT
      );

      const p = r.assetProfile ?? {};
      const sd = r.summaryDetail ?? {};
      const ks = r.defaultKeyStatistics ?? {};
      const fd = r.financialData ?? {};
      const price = r.price ?? {};

      return {
        symbol,
        profile: {
          name: price.longName ?? price.shortName ?? symbol,
          sector: p.sector ?? null,
          industry: p.industry ?? null,
          website: p.website ?? null,
          country: p.country ?? null,
          city: p.city ?? null,
          state: p.state ?? null,
          employees: p.fullTimeEmployees ?? null,
          summary: p.longBusinessSummary ?? null,
          officers: (p.companyOfficers ?? []).slice(0, 6).map((o: any) => ({
            name: o.name,
            title: o.title,
            pay: o.totalPay ?? null,
            age: o.age ?? null,
          })),
        },
        stats: {
          marketCap: price.marketCap ?? sd.marketCap ?? null,
          trailingPE: sd.trailingPE ?? null,
          forwardPE: sd.forwardPE ?? ks.forwardPE ?? null,
          pegRatio: ks.pegRatio ?? null,
          priceToBook: ks.priceToBook ?? null,
          priceToSales: sd.priceToSalesTrailing12Months ?? null,
          beta: sd.beta ?? ks.beta ?? null,
          eps: ks.trailingEps ?? null,
          dividendYield: sd.dividendYield ?? null,
          payoutRatio: sd.payoutRatio ?? null,
          profitMargin: fd.profitMargins ?? null,
          operatingMargin: fd.operatingMargins ?? null,
          grossMargin: fd.grossMargins ?? null,
          roe: fd.returnOnEquity ?? null,
          roa: fd.returnOnAssets ?? null,
          revenue: fd.totalRevenue ?? null,
          revenueGrowth: fd.revenueGrowth ?? null,
          earningsGrowth: fd.earningsGrowth ?? null,
          totalCash: fd.totalCash ?? null,
          totalDebt: fd.totalDebt ?? null,
          debtToEquity: fd.debtToEquity ?? null,
          currentRatio: fd.currentRatio ?? null,
          fiftyTwoWeekHigh: sd.fiftyTwoWeekHigh ?? null,
          fiftyTwoWeekLow: sd.fiftyTwoWeekLow ?? null,
          sharesOutstanding: ks.sharesOutstanding ?? null,
          floatShares: ks.floatShares ?? null,
          // Short interest (SI) — exchange-reported, bi-monthly, public.
          sharesShort: typeof ks.sharesShort === "number" ? ks.sharesShort : null,
          // Yahoo sometimes returns a date here instead of a count — keep numbers only.
          sharesShortPriorMonth: typeof ks.sharesShortPriorMonth === "number" ? ks.sharesShortPriorMonth : null,
          shortRatio: typeof ks.shortRatio === "number" ? ks.shortRatio : null,
          shortPercentOfFloat: ks.shortPercentOfFloat ?? null,
          shortPercentOfShares: ks.sharesPercentSharesOut ?? null,
          // epoch ms (kept numeric so `stats` stays a number map); view formats it
          shortInterestDate: ks.dateShortInterest ? new Date(ks.dateShortInterest).getTime() : null,
        },
        analyst: {
          targetMean: fd.targetMeanPrice ?? null,
          targetHigh: fd.targetHighPrice ?? null,
          targetLow: fd.targetLowPrice ?? null,
          recommendationKey: fd.recommendationKey ?? null,
          numberOfAnalysts: fd.numberOfAnalystOpinions ?? null,
          currentPrice: fd.currentPrice ?? price.regularMarketPrice ?? null,
        },
        recommendationTrend: (r.recommendationTrend?.trend ?? []).map((t: any) => ({
          period: t.period,
          strongBuy: t.strongBuy,
          buy: t.buy,
          hold: t.hold,
          sell: t.sell,
          strongSell: t.strongSell,
        })),
        earningsHistory: (r.earningsHistory?.history ?? []).map((h: any) => ({
          quarter: h.quarter,
          period: h.period,
          epsActual: h.epsActual,
          epsEstimate: h.epsEstimate,
          surprisePercent: h.surprisePercent,
        })),
        earningsTrend: (r.earningsTrend?.trend ?? [])
          .filter((t: any) => t.earningsEstimate?.avg != null || t.revenueEstimate?.avg != null)
          .map((t: any) => ({
            period: t.period,
            endDate: t.endDate,
            growth: t.growth,
            epsAvg: t.earningsEstimate?.avg ?? null,
            epsLow: t.earningsEstimate?.low ?? null,
            epsHigh: t.earningsEstimate?.high ?? null,
            epsAnalysts: t.earningsEstimate?.numberOfAnalysts ?? null,
            revenueAvg: t.revenueEstimate?.avg ?? null,
          })),
        nextEarningsDate:
          r.calendarEvents?.earnings?.earningsDate?.[0] ?? null,
      };
    }, 300);
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: "FUNDAMENTALS_UNAVAILABLE", message: err?.message });
  }
});

// ── Full financial statements via fundamentalsTimeSeries (FA view) ──────
const INCOME_ITEMS = [
  ["totalRevenue", "Total Revenue"],
  ["costOfRevenue", "Cost of Revenue"],
  ["grossProfit", "Gross Profit"],
  ["researchAndDevelopment", "R&D Expense"],
  ["sellingGeneralAndAdministration", "SG&A Expense"],
  ["operatingExpense", "Operating Expense"],
  ["operatingIncome", "Operating Income"],
  ["interestExpense", "Interest Expense"],
  ["pretaxIncome", "Pretax Income"],
  ["taxProvision", "Tax Provision"],
  ["netIncome", "Net Income"],
  ["dilutedEPS", "Diluted EPS"],
  ["EBITDA", "EBITDA"],
];
const BALANCE_ITEMS = [
  ["cashAndCashEquivalents", "Cash & Equivalents"],
  ["currentAssets", "Total Current Assets"],
  ["totalNonCurrentAssets", "Non-Current Assets"],
  ["totalAssets", "Total Assets"],
  ["currentLiabilities", "Current Liabilities"],
  ["totalNonCurrentLiabilitiesNetMinorityInterest", "Non-Current Liabilities"],
  ["totalLiabilitiesNetMinorityInterest", "Total Liabilities"],
  ["totalDebt", "Total Debt"],
  ["longTermDebt", "Long-Term Debt"],
  ["retainedEarnings", "Retained Earnings"],
  ["stockholdersEquity", "Stockholders Equity"],
];
const CASHFLOW_ITEMS = [
  ["operatingCashFlow", "Operating Cash Flow"],
  ["investingCashFlow", "Investing Cash Flow"],
  ["financingCashFlow", "Financing Cash Flow"],
  ["capitalExpenditure", "Capital Expenditure"],
  ["freeCashFlow", "Free Cash Flow"],
  ["repurchaseOfCapitalStock", "Stock Buybacks"],
  ["cashDividendsPaid", "Dividends Paid"],
  ["netIncome", "Net Income"],
];

function buildStatement(rows: any[], items: string[][]) {
  return items.map(([key, label]) => ({
    key,
    label,
    values: rows.map((r) => (r[key] ?? null) as number | null),
  }));
}

router.get("/financials/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const type = req.query.type === "quarterly" ? "quarterly" : "annual";
  try {
    const data = await cached(`fin:${symbol}:${type}`, async () => {
      const lookback = type === "quarterly" ? "2022-01-01" : "2019-01-01";
      const rows: any[] = await yf.fundamentalsTimeSeries(
        symbol,
        { period1: lookback, type, module: "all" },
        OPT
      );
      // Oldest → newest; keep the most recent 8 periods.
      const sorted = rows
        .slice()
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-8);
      return {
        symbol,
        type,
        periods: sorted.map((r) => new Date(r.date).toISOString().slice(0, 10)),
        income: buildStatement(sorted, INCOME_ITEMS),
        balance: buildStatement(sorted, BALANCE_ITEMS),
        cashflow: buildStatement(sorted, CASHFLOW_ITEMS),
      };
    }, 600);
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: "FINANCIALS_UNAVAILABLE", message: err?.message });
  }
});

// ── Ownership: institutions, insiders (OWN view) ────────────────────────
router.get("/ownership/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const data = await cached(`own:${symbol}`, async () => {
      const r: any = await yf.quoteSummary(
        symbol,
        {
          modules: [
            "institutionOwnership",
            "fundOwnership",
            "majorHoldersBreakdown",
            "insiderTransactions",
            "insiderHolders",
            "netSharePurchaseActivity",
          ],
        },
        OPT
      );
      const mb = r.majorHoldersBreakdown ?? {};
      return {
        symbol,
        breakdown: {
          insidersPercentHeld: mb.insidersPercentHeld ?? null,
          institutionsPercentHeld: mb.institutionsPercentHeld ?? null,
          institutionsFloatPercentHeld: mb.institutionsFloatPercentHeld ?? null,
          institutionsCount: mb.institutionsCount ?? null,
        },
        institutions: (r.institutionOwnership?.ownershipList ?? []).slice(0, 15).map((o: any) => ({
          organization: o.organization,
          pctHeld: o.pctHeld,
          position: o.position,
          value: o.value,
          pctChange: o.pctChange,
          reportDate: o.reportDate,
        })),
        funds: (r.fundOwnership?.ownershipList ?? []).slice(0, 10).map((o: any) => ({
          organization: o.organization,
          pctHeld: o.pctHeld,
          position: o.position,
          value: o.value,
        })),
        insiders: (r.insiderTransactions?.transactions ?? []).slice(0, 20).map((t: any) => ({
          name: t.filerName,
          relation: t.filerRelation,
          text: t.transactionText,
          shares: t.shares,
          value: t.value,
          date: t.startDate,
        })),
      };
    }, 600);
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: "OWNERSHIP_UNAVAILABLE", message: err?.message });
  }
});

// ── Peers / relative valuation (COMP view) ──────────────────────────────
router.get("/peers/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  try {
    const data = await cached(`peers:${symbol}`, async () => {
      // Yahoo's recommendations endpoint is prone to intermittent failures
      // independent of the symbol's validity. Rather than fail the whole
      // panel with a 502, degrade to an empty peer list so the panel still
      // renders the base symbol's own quote.
      let peerSymbols: string[] = [];
      try {
        const rec: any = await yf.recommendationsBySymbol(symbol);
        peerSymbols = (rec?.recommendedSymbols ?? []).map((r: any) => r.symbol).slice(0, 8);
      } catch {
        peerSymbols = [];
      }

      const all = [symbol, ...peerSymbols.filter((s) => s !== symbol)];
      const quotes: any[] = await yf.quote(all);
      const list = (Array.isArray(quotes) ? quotes : [quotes]).map((q: any) => ({
        symbol: q.symbol,
        name: q.shortName ?? q.longName ?? q.symbol,
        price: q.regularMarketPrice ?? null,
        changePercent: q.regularMarketChangePercent ?? null,
        marketCap: q.marketCap ?? null,
        trailingPE: q.trailingPE ?? null,
        forwardPE: q.forwardPE ?? null,
        priceToBook: q.priceToBook ?? null,
        isBase: q.symbol === symbol,
      }));
      return { symbol, peers: list, peersUnavailable: peerSymbols.length === 0 };
    }, 300);
    res.json(data);
  } catch (err: any) {
    // The base symbol's own quote failed too (bad ticker, or Yahoo fully
    // down) — this is a genuine failure worth surfacing as an error.
    res.status(502).json({ error: "PEERS_UNAVAILABLE", message: err?.message });
  }
});

export default router;
