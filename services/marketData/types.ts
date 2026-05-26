import type { Result } from "@/services/result";

export type MarketSnapshot = {
  ticker: string;
  symbol: string;
  companyName: string;
  exchange: "NSE" | "BSE";
  currency: string;
  price: number | null;
  dayChangePercent: number | null;
  sector: string | null;
  industry: string | null;
  marketCap: number | null;
  volume: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  asOf: string | null;
  source: "openalgo" | "mock";
  sourceUrl: string | null;
  peers: string[];
  metrics: Array<{
    label: string;
    value: string;
  }>;
};

export type MarketDataService = {
  getSnapshot(ticker: string): Promise<Result<MarketSnapshot>>;
};
