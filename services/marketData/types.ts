import type { Result } from "@/services/result";

export type MarketSnapshot = {
  ticker: string;
  companyName: string;
  exchange: "NSE" | "BSE";
  price: number | null;
  dayChangePercent: number | null;
};

export type MarketDataService = {
  getSnapshot(ticker: string): Promise<Result<MarketSnapshot>>;
};
