import { mockMarketData } from "./mock";
import { hasOpenAlgoConfig, openAlgoMarketData } from "./openalgo";
import type { MarketDataService } from "./types";
import { yahooMarketData } from "./yahoo";

export function getMarketDataService(): MarketDataService {
  if (process.env.MARKET_DATA_PROVIDER === "mock") {
    return mockMarketData;
  }

  if (process.env.MARKET_DATA_PROVIDER === "openalgo" || hasOpenAlgoConfig()) {
    return openAlgoMarketData;
  }

  return yahooMarketData;
}
