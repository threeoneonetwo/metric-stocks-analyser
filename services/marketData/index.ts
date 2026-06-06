import { mockMarketData } from "./mock";
import { hasOpenAlgoConfig, openAlgoMarketData } from "./openalgo";
import type { MarketDataService } from "./types";
import { hasUpstoxConfig, upstoxMarketData } from "./upstox";

export function getMarketDataService(): MarketDataService {
  if (process.env.MARKET_DATA_PROVIDER === "mock") {
    return mockMarketData;
  }

  if (process.env.MARKET_DATA_PROVIDER === "openalgo" || hasOpenAlgoConfig()) {
    return openAlgoMarketData;
  }

  if (hasUpstoxConfig()) {
    return upstoxMarketData;
  }

  return mockMarketData;
}
