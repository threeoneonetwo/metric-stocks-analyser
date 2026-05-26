import { getMarketDataService } from "@/services/marketData";
import type { MarketSymbol } from "@/services/marketData/types";
import type { Result } from "@/services/result";
import { resolveKnownCompany } from "./company-directory";

export async function resolveTickerQuery(query: string): Promise<Result<MarketSymbol>> {
  const cleanedQuery = query.trim();
  if (!cleanedQuery) {
    return {
      ok: false,
      code: "VALIDATION",
      error: "Enter a company name or ticker.",
    };
  }

  const knownCompany = resolveKnownCompany(cleanedQuery);
  if (knownCompany) {
    return { ok: true, data: knownCompany };
  }

  const resolved = await getMarketDataService().resolveTicker(cleanedQuery);
  if (resolved.ok) {
    return resolved;
  }

  return resolved;
}
