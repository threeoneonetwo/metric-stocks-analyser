import { getMarketDataService } from "@/services/marketData";
import type { MarketSymbol } from "@/services/marketData/types";
import { searchYahooSymbols } from "@/services/marketData/yahoo";
import type { Result } from "@/services/result";
import { resolveKnownCompany, searchKnownCompanies } from "./company-directory";

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

export async function resolveTickerSuggestions(query: string): Promise<Result<MarketSymbol[]>> {
  const cleanedQuery = query.trim();
  if (!cleanedQuery) {
    return { ok: true, data: [] };
  }

  const knownMatches = searchKnownCompanies(cleanedQuery, 8);
  const yahooMatches = await searchYahooSymbols(cleanedQuery, 12);
  const merged = new Map<string, MarketSymbol>();

  for (const match of knownMatches) {
    merged.set(match.symbol, match);
  }

  if (yahooMatches.ok) {
    for (const match of yahooMatches.data) {
      if (!merged.has(match.symbol)) {
        merged.set(match.symbol, match);
      }
    }
  }

  return { ok: true, data: [...merged.values()].slice(0, 10) };
}
