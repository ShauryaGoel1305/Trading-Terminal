import axios from "axios";

/**
 * FRED (Federal Reserve Economic Data) client.
 *
 * Uses the public `fredgraph.csv` export, NOT the `/fred/series/observations`
 * JSON API — the CSV export needs no API key, while the JSON API does.
 * Verified series IDs (curl'd against fred.stlouisfed.org before wiring in):
 *   GDPC1     Real Gross Domestic Product (chained 2017 $, quarterly)
 *   GDP       Nominal Gross Domestic Product (quarterly)
 *   CPIAUCSL  Consumer Price Index, All Urban Consumers (monthly)
 *   FEDFUNDS  Effective Federal Funds Rate (monthly)
 *   ECBDFR    ECB Deposit Facility Rate — the ECB's operative policy rate since 2022 (daily)
 *   IUDSOIA   SONIA (UK overnight rate) — tracks the BoE Bank Rate; FRED has no
 *             continuously-updated Bank Rate series itself (daily)
 *   IRSTCI01JPM156N  Japan overnight call rate — tracks the BoJ policy rate (monthly)
 */
const fredAxios = axios.create({ timeout: 20_000 });

export interface FredPoint {
  date: string;
  value: number;
}

export async function fredSeries(seriesId: string): Promise<FredPoint[]> {
  const { data } = await fredAxios.get<string>("https://fred.stlouisfed.org/graph/fredgraph.csv", {
    params: { id: seriesId },
    responseType: "text",
  });
  if (typeof data !== "string" || !data.includes(",")) {
    throw new Error(`FRED_SERIES_UNAVAILABLE:${seriesId}`);
  }
  return data
    .trim()
    .split("\n")
    .slice(1) // header row: observation_date,<seriesId>
    .map((line) => {
      const [date, raw] = line.split(",");
      const value = Number(raw);
      return { date, value };
    })
    .filter((p) => p.date && Number.isFinite(p.value));
}
