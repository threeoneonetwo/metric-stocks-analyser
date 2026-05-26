import { getMarketDataService } from "@/services/marketData";
import type { MarketSymbol } from "@/services/marketData/types";
import type { Result } from "@/services/result";
import { normalizeTicker } from "@/lib/utils";

export async function resolveTickerQuery(query: string): Promise<Result<MarketSymbol>> {
  const cleanedQuery = query.trim();
  if (!cleanedQuery) {
    return {
      ok: false,
      code: "VALIDATION",
      error: "Enter a company name or ticker.",
    };
  }

  const resolved = await getMarketDataService().resolveTicker(cleanedQuery);
  if (resolved.ok) {
    return resolved;
  }

  const fallbackTicker = normalizeTicker(cleanedQuery);
  if (!fallbackTicker) {
    return resolved;
  }

  return {
    ok: true,
    data: {
      ticker: fallbackTicker,
      symbol: `${fallbackTicker}.NS`,
      companyName: `${fallbackTicker} Ltd`,
      exchange: "NSE",
      sector: null,
      industry: null,
    },
  };
}
