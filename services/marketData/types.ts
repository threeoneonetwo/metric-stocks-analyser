import type { Result } from "@/services/result";

export type MarketSymbol = {
  ticker: string;
  symbol: string;
  companyName: string;
  exchange: "NSE" | "BSE";
  sector: string | null;
  industry: string | null;
  isin?: string | null;
};

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
  source: "openalgo" | "yahoo" | "mock";
  sourceUrl: string | null;
  peers: string[];
  metrics: Array<{
    label: string;
    value: string;
    median?: string;
  }>;
};

export type MarketDataService = {
  resolveTicker(query: string): Promise<Result<MarketSymbol>>;
  getSnapshot(ticker: string): Promise<Result<MarketSnapshot>>;
};
