import type { MarketDataService } from "./types";
import { normalizeTicker } from "@/lib/utils";

export const mockMarketData: MarketDataService = {
  async resolveTicker(query) {
    const ticker = normalizeTicker(query);
    return {
      ok: true,
      data: {
        ticker,
        symbol: `${ticker}.NS`,
        companyName: `${ticker} Ltd`,
        exchange: "NSE",
        sector: null,
        industry: null,
      },
    };
  },

  async getSnapshot(ticker) {
    return {
      ok: true,
      data: {
        ticker,
        symbol: `${ticker}.NS`,
        companyName: `${ticker} Ltd`,
        exchange: "NSE",
        currency: "INR",
        price: null,
        dayChangePercent: null,
        sector: null,
        industry: null,
        marketCap: null,
        volume: null,
        dayHigh: null,
        dayLow: null,
        fiftyTwoWeekHigh: null,
        fiftyTwoWeekLow: null,
        asOf: null,
        source: "mock",
        sourceUrl: null,
        peers: ["Target", "Peer A", "Peer B", "Peer C"],
        metrics: [],
      },
    };
  },
};
