import type { MarketDataService } from "./types";

export const mockMarketData: MarketDataService = {
  async getSnapshot(ticker) {
    return {
      ok: true,
      data: {
        ticker,
        companyName: `${ticker} Ltd`,
        exchange: "NSE",
        price: null,
        dayChangePercent: null,
      },
    };
  },
};
