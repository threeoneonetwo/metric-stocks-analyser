import { getPeerComparisonLabels } from "@/domain/competitors";
import { getKnownIsin } from "@/domain/isin-directory";
import { normalizeTicker } from "@/lib/utils";
import { getFmpFundamentalsForTicker } from "@/services/fundamentals/fmp";
import { getUpstoxFundamentalsForTicker } from "@/services/fundamentals/upstox";
import type { Result } from "@/services/result";
import type { MarketDataService, MarketSnapshot, MarketSymbol } from "./types";

const UPSTOX_BASE_URL = "https://api.upstox.com/v2";

type UpstoxInstrumentSearchResponse = {
  status?: string;
  data?: Array<{
    isin?: string;
    instrument_key?: string;
    trading_symbol?: string;
    instrument_type?: string;
    exchange?: string;
    name?: string;
    short_name?: string;
  }>;
};

type UpstoxQuoteEntry = {
  symbol?: string;
  last_price?: number;
  ohlc?: {
    open?: number;
    high?: number;
    low?: number;
    close?: number;
  };
  net_change?: number;
  volume?: number;
  average_price?: number;
  "52_week_high"?: number;
  "52_week_low"?: number;
};

type UpstoxMarketQuoteResponse = {
  status?: string;
  data?: Record<string, UpstoxQuoteEntry>;
};

export function hasUpstoxConfig() {
  return Boolean(process.env.UPSTOX_ACCESS_TOKEN);
}

export const upstoxMarketData: MarketDataService = {
  resolveTicker: resolveUpstoxSymbol,

  async getSnapshot(ticker) {
    const resolved = await resolveUpstoxSymbol(ticker);
    if (!resolved.ok) return resolved;

    const instrumentKey = resolved.data.instrumentKey ?? `NSE_EQ|${resolved.data.isin}`;
    const quoteResult = await getUpstoxMarketQuote(instrumentKey);
    if (!quoteResult.ok) return quoteResult;

    // Upstox returns the key as "NSE_EQ:SYMBOL" regardless of how we queried
    const entry = quoteResult.data.data
      ? Object.values(quoteResult.data.data)[0]
      : undefined;
    const price = numberOrNull(entry?.last_price);
    const netChange = numberOrNull(entry?.net_change);
    // After market close Upstox sets ohlc.close = last_price, so derive prev close from net_change
    const previousClose =
      price !== null && netChange !== null ? price - netChange : numberOrNull(entry?.ohlc?.close);
    const dayChangePercent =
      price !== null && previousClose !== null && previousClose !== 0
        ? ((price - previousClose) / previousClose) * 100
        : null;

    const [fmpFundamentals, upstoxFundamentals, fiftyTwoWeekRange] = await Promise.all([
      getFmpFundamentalsForTicker(resolved.data.ticker),
      getUpstoxFundamentalsForTicker(resolved.data.ticker),
      get52WeekRange(instrumentKey),
    ]);
    const fundamentals = fmpFundamentals.ok ? fmpFundamentals : upstoxFundamentals;

    const priceMetrics = buildPriceMetrics({
      open: entry?.ohlc?.open,
      high: entry?.ohlc?.high,
      low: entry?.ohlc?.low,
      previousClose,
      volume: entry?.volume,
      fiftyTwoWeekHigh: fiftyTwoWeekRange?.high,
      fiftyTwoWeekLow: fiftyTwoWeekRange?.low,
    });

    return {
      ok: true,
      data: {
        ticker,
        symbol: resolved.data.symbol,
        companyName: resolved.data.companyName,
        exchange: resolved.data.exchange,
        currency: "INR",
        price,
        dayChangePercent,
        sector: resolved.data.sector,
        industry: resolved.data.industry,
        marketCap: null,
        volume: numberOrNull(entry?.volume),
        dayHigh: numberOrNull(entry?.ohlc?.high),
        dayLow: numberOrNull(entry?.ohlc?.low),
        fiftyTwoWeekHigh: fiftyTwoWeekRange?.high ?? null,
        fiftyTwoWeekLow: fiftyTwoWeekRange?.low ?? null,
        asOf: new Date().toISOString(),
        source: "upstox",
        sourceUrl: null,
        peers: getPeerComparisonLabels({
          ticker,
          sector: null,
          industry: null,
        }),
        metrics: fundamentals.ok ? fundamentals.data.metrics : priceMetrics,
      },
    };
  },
};

// Some tickers have been renamed on NSE (e.g. ZOMATO → ETERNAL).
// This map lets us resolve a legacy ticker to its current trading symbol.
const TICKER_ALIAS: Record<string, string> = {
  ZOMATO: "ETERNAL",
};

export async function resolveUpstoxSymbol(query: string): Promise<Result<MarketSymbol>> {
  const trimmed = query.trim();
  const normalized = normalizeTicker(trimmed);
  const knownIsin = getKnownIsin(normalized);

  // Resolve the actual NSE trading symbol (handles renamed tickers)
  const searchQuery = TICKER_ALIAS[normalized] ?? normalized;

  const search = await getUpstoxJson<UpstoxInstrumentSearchResponse>(
    `${UPSTOX_BASE_URL}/instruments/search?query=${encodeURIComponent(searchQuery)}&segment=EQ&exchange=NSE`,
  );

  if (!search.ok) return search;

  const instruments = search.data.data ?? [];

  // Prefer exact trading_symbol match; fall back to ISIN match for renamed tickers
  const match =
    instruments.find(
      (i) =>
        i.instrument_type === "EQ" &&
        i.exchange === "NSE" &&
        normalizeTicker(i.trading_symbol ?? "") === searchQuery,
    ) ??
    (knownIsin
      ? instruments.find((i) => i.exchange === "NSE" && i.isin === knownIsin)
      : undefined);

  if (!match?.trading_symbol) {
    return {
      ok: false,
      code: "NOT_FOUND",
      error: `Upstox could not resolve ${query} on NSE.`,
    };
  }

  return {
    ok: true,
    data: {
      // Always expose the user-facing ticker (e.g. ZOMATO), not the renamed symbol
      ticker: normalized,
      symbol: match.trading_symbol,
      companyName: match.name ?? match.short_name ?? normalized,
      exchange: "NSE",
      sector: null,
      industry: null,
      isin: knownIsin ?? match.isin ?? null,
      instrumentKey: match.instrument_key ?? null,
    },
  };
}

async function get52WeekRange(instrumentKey: string): Promise<{ high: number; low: number } | null> {
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const result = await getUpstoxJson<{ status?: string; data?: { candles?: number[][] } }>(
    `${UPSTOX_BASE_URL}/historical-candle/${encodeURIComponent(instrumentKey)}/month/${fmt(today)}/${fmt(oneYearAgo)}`,
  );

  if (!result.ok || !result.data.data?.candles?.length) return null;

  // candle format: [timestamp, open, high, low, close, volume, oi]
  let high = -Infinity;
  let low = Infinity;
  for (const candle of result.data.data.candles) {
    if (typeof candle[2] === "number") high = Math.max(high, candle[2]);
    if (typeof candle[3] === "number") low = Math.min(low, candle[3]);
  }

  return high > low ? { high, low } : null;
}

async function getUpstoxMarketQuote(instrumentKey: string): Promise<Result<UpstoxMarketQuoteResponse>> {
  return getUpstoxJson<UpstoxMarketQuoteResponse>(
    `${UPSTOX_BASE_URL}/market-quote/quotes?symbol=${encodeURIComponent(instrumentKey)}`,
  );
}

async function getUpstoxJson<T>(url: string): Promise<Result<T>> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.UPSTOX_ACCESS_TOKEN}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const payload = (await response.json()) as T;

    if (!response.ok) {
      return {
        ok: false,
        code: response.status === 404 ? "NOT_FOUND" : response.status === 401 ? "CONFIG" : "UPSTREAM",
        error: `Upstox request failed with HTTP ${response.status}.`,
      };
    }

    return { ok: true, data: payload };
  } catch (error) {
    return {
      ok: false,
      code: "UPSTREAM",
      error: error instanceof Error ? error.message : "Upstox request failed.",
    };
  }
}

function buildPriceMetrics(input: {
  open?: number | null;
  high?: number | null;
  low?: number | null;
  previousClose?: number | null;
  volume?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
}): MarketSnapshot["metrics"] {
  return (
    [
      ["Open", input.open],
      ["High", input.high],
      ["Low", input.low],
      ["Prev Close", input.previousClose],
      ["Volume", input.volume],
      ["52W High", input.fiftyTwoWeekHigh],
      ["52W Low", input.fiftyTwoWeekLow],
    ] as Array<[string, number | null | undefined]>
  )
    .map(([label, value]) => ({
      label: label as string,
      value: formatMetricValue(label as string, numberOrNull(value)),
    }))
    .filter((m) => m.value !== "N/A");
}

function formatMetricValue(label: string, value: number | null) {
  if (value === null) return "N/A";
  if (label === "Volume") {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
  }
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)}`;
}

function numberOrNull(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
