import { getPeerComparisonLabels } from "@/domain/competitors";
import { getFmpFundamentalsForTicker } from "@/services/fundamentals/fmp";
import type { MarketDataService, MarketSnapshot, MarketSymbol } from "./types";

const FMP_BASE_URL = "https://financialmodelingprep.com/stable";

type FmpQuote = {
  symbol?: string;
  name?: string;
  price?: number | null;
  changesPercentage?: number | null;
  change?: number | null;
  dayLow?: number | null;
  dayHigh?: number | null;
  yearHigh?: number | null;
  yearLow?: number | null;
  marketCap?: number | null;
  volume?: number | null;
  open?: number | null;
  previousClose?: number | null;
  exchange?: string;
  timestamp?: number | null;
};

type FmpProfile = {
  symbol?: string;
  companyName?: string;
  currency?: string;
  exchange?: string;
  exchangeShortName?: string;
  sector?: string;
  industry?: string;
  marketCap?: number | null;
};

export const fmpMarketData: MarketDataService = {
  async resolveTicker(query) {
    const ticker = query.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    const symbol = `${ticker}.NS`;
    const profile = await fetchFmp<FmpProfile[]>(`/profile?symbol=${encodeURIComponent(symbol)}`);
    const data = profile?.[0];
    if (!data?.symbol) {
      return { ok: false, code: "NOT_FOUND", error: `FMP could not resolve ${query} on NSE.` };
    }
    return {
      ok: true,
      data: {
        ticker,
        symbol: data.symbol,
        companyName: data.companyName ?? ticker,
        exchange: "NSE",
        sector: data.sector ?? null,
        industry: data.industry ?? null,
      },
    };
  },

  async getSnapshot(ticker) {
    const symbol = `${ticker.trim().toUpperCase()}.NS`;

    const [quoteArr, profileArr, fundamentals] = await Promise.all([
      fetchFmp<FmpQuote[]>(`/quote?symbol=${encodeURIComponent(symbol)}`),
      fetchFmp<FmpProfile[]>(`/profile?symbol=${encodeURIComponent(symbol)}`),
      getFmpFundamentalsForTicker(ticker),
    ]);

    const quote = quoteArr?.[0];
    const profile = profileArr?.[0];

    if (!quote?.price) {
      return { ok: false, code: "NOT_FOUND", error: `FMP returned no quote for ${ticker}.` };
    }

    const price = numberOrNull(quote.price);
    const previousClose = numberOrNull(quote.previousClose);
    const dayChangePercent =
      quote.changesPercentage !== null && quote.changesPercentage !== undefined
        ? numberOrNull(quote.changesPercentage)
        : price !== null && previousClose !== null && previousClose !== 0
          ? ((price - previousClose) / previousClose) * 100
          : null;

    const snapshot: MarketSnapshot = {
      ticker,
      symbol,
      companyName: profile?.companyName ?? quote.name ?? ticker,
      exchange: "NSE",
      currency: profile?.currency ?? "INR",
      price,
      dayChangePercent,
      sector: profile?.sector ?? null,
      industry: profile?.industry ?? null,
      marketCap: numberOrNull(profile?.marketCap ?? quote.marketCap),
      volume: numberOrNull(quote.volume),
      dayHigh: numberOrNull(quote.dayHigh),
      dayLow: numberOrNull(quote.dayLow),
      fiftyTwoWeekHigh: numberOrNull(quote.yearHigh),
      fiftyTwoWeekLow: numberOrNull(quote.yearLow),
      asOf: quote.timestamp ? new Date(quote.timestamp * 1000).toISOString() : new Date().toISOString(),
      source: "fmp",
      sourceUrl: `https://financialmodelingprep.com/financial-summary/${encodeURIComponent(symbol)}`,
      peers: getPeerComparisonLabels({ ticker, sector: profile?.sector ?? null, industry: profile?.industry ?? null }),
      metrics: fundamentals.ok ? fundamentals.data.metrics : [],
    };

    return { ok: true, data: snapshot };
  },
};

async function fetchFmp<T>(path: string): Promise<T | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;
  try {
    const response = await fetch(`${FMP_BASE_URL}${path}&apikey=${apiKey}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function numberOrNull(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
