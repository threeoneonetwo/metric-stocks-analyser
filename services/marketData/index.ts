import { mockMarketData } from "./mock";
import { hasOpenAlgoConfig, openAlgoMarketData } from "./openalgo";
import type { MarketDataService } from "./types";

export function getMarketDataService(): MarketDataService {
  if (process.env.MARKET_DATA_PROVIDER === "openalgo" || hasOpenAlgoConfig()) {
    return openAlgoMarketData;
  }

  return mockMarketData;
}
