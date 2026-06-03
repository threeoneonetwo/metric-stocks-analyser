import type { Result } from "@/services/result";
import { getPeerComparisonLabels } from "@/domain/competitors";
import { getKnownIsin } from "@/domain/isin-directory";
import { getUpstoxFundamentalsForTicker } from "@/services/fundamentals/upstox";
import type { MarketDataService, MarketSnapshot, MarketSymbol } from "./types";

type YahooSearchResponse = {
  quotes?: Array<{
    symbol?: string;
    quoteType?: string;
    longname?: string;
    shortname?: string;
    exchange?: string;
    exchDisp?: string;
    sector?: string;
    sectorDisp?: string;
    industry?: string;
    industryDisp?: string;
  }>;
};

type YahooQuoteSummaryResponse = {
  quoteSummary?: {
    result?: Array<{
      defaultKeyStatistics?: {
        trailingPE?: { raw?: number };
        forwardPE?: { raw?: number };
        priceToBook?: { raw?: number };
        enterpriseToEbitda?: { raw?: number };
        trailingEps?: { raw?: number };
        dividendYield?: { raw?: number };
      };
      financialData?: {
        returnOnEquity?: { raw?: number };
        returnOnAssets?: { raw?: number };
        profitMargins?: { raw?: number };
        grossMargins?: { raw?: number };
        operatingMargins?: { raw?: number };
        revenueGrowth?: { raw?: number };
        earningsGrowth?: { raw?: number };
        debtToEquity?: { raw?: number };
        currentRatio?: { raw?: number };
        quickRatio?: { raw?: number };
        totalDebt?: { raw?: number };
        freeCashflow?: { raw?: number };
      };
    }>;
  };
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        currency?: string;
        symbol?: string;
        exchangeName?: string;
        fullExchangeName?: string;
        regularMarketTime?: number;
        regularMarketPrice?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketVolume?: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
        chartPreviousClose?: number;
        longName?: string;
        shortName?: string;
      };
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: {
      code?: string;
      description?: string;
    } | null;
  };
};

const YAHOO_BASE_URL = "https://query2.finance.yahoo.com";

export const yahooMarketData: MarketDataService = {
  resolveTicker: resolveYahooSymbol,

  async getSnapshot(ticker) {
    const resolved = await resolveYahooSymbol(ticker);
    if (!resolved.ok) {
      return resolved;
    }

    const chart = await getYahooChart(resolved.data.symbol);
    if (!chart.ok) {
      return chart;
    }

    const meta = chart.data.chart?.result?.[0]?.meta;
    const quote = chart.data.chart?.result?.[0]?.indicators?.quote?.[0];
    if (!meta) {
      return {
        ok: false,
        code: "UPSTREAM",
        error: `Yahoo Finance did not return chart metadata for ${resolved.data.symbol}.`,
      };
    }

    const price = numberOrNull(meta.regularMarketPrice ?? lastNumber(quote?.close));
    const previousClose = numberOrNull(meta.chartPreviousClose);
    const dayChangePercent =
      price !== null && previousClose !== null && previousClose !== 0
        ? ((price - previousClose) / previousClose) * 100
        : null;

    const priceMetrics = buildMetrics({
      open: lastNumber(quote?.open),
      high: meta.regularMarketDayHigh ?? lastNumber(quote?.high),
      low: meta.regularMarketDayLow ?? lastNumber(quote?.low),
      previousClose,
      volume: meta.regularMarketVolume ?? lastNumber(quote?.volume),
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    });

    const [upstoxFundamentals, yahooSummary] = await Promise.all([
      getUpstoxFundamentalsForTicker(resolved.data.ticker),
      getYahooQuoteSummary(resolved.data.symbol),
    ]);

    const fundamentalMetrics = upstoxFundamentals.ok
      ? upstoxFundamentals.data.metrics
      : buildYahooFundamentalMetrics(yahooSummary);

    return {
      ok: true,
      data: {
        ticker,
        symbol: resolved.data.symbol,
        companyName: meta.longName ?? meta.shortName ?? resolved.data.companyName,
        exchange: resolved.data.exchange,
        currency: meta.currency ?? "INR",
        price,
        dayChangePercent,
        sector: resolved.data.sector,
        industry: resolved.data.industry,
        marketCap: null,
        volume: numberOrNull(meta.regularMarketVolume ?? lastNumber(quote?.volume)),
        dayHigh: numberOrNull(meta.regularMarketDayHigh ?? lastNumber(quote?.high)),
        dayLow: numberOrNull(meta.regularMarketDayLow ?? lastNumber(quote?.low)),
        fiftyTwoWeekHigh: numberOrNull(meta.fiftyTwoWeekHigh),
        fiftyTwoWeekLow: numberOrNull(meta.fiftyTwoWeekLow),
        asOf: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
        source: "yahoo",
        sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(resolved.data.symbol)}`,
        peers: getPeerComparisonLabels({
          ticker,
          sector: resolved.data.sector,
          industry: resolved.data.industry,
        }),
        metrics: [...fundamentalMetrics, ...priceMetrics],
      },
    };
  },
};

export async function resolveYahooSymbol(query: string): Promise<Result<MarketSymbol>> {
  const requestedExchange = process.env.YAHOO_FINANCE_DEFAULT_EXCHANGE === "BSE" ? "BSE" : "NSE";
  const requestedSuffix = requestedExchange === "BSE" ? ".BO" : ".NS";
  const trimmedQuery = query.trim();
  const upperQuery = trimmedQuery.toUpperCase();
  const normalizedTicker = upperQuery.replace(/[^A-Z0-9]/g, "");
  const hasYahooSuffix = upperQuery.endsWith(".NS") || upperQuery.endsWith(".BO");
  const candidates = hasYahooSuffix
    ? [upperQuery]
    : [`${normalizedTicker}${requestedSuffix}`, `${normalizedTicker}.NS`, `${normalizedTicker}.BO`, trimmedQuery];

  const uniqueCandidates = [...new Set(candidates)];
  for (const candidate of uniqueCandidates) {
    const search = await getYahooSearch(candidate);
    if (!search.ok) {
      continue;
    }

    const exactMatch = search.data.quotes?.find(
      (quote) => quote.quoteType === "EQUITY" && quote.symbol?.toUpperCase() === candidate,
    );
    const preferredIndianMatch = search.data.quotes?.find((quote) => isIndianEquity(quote));
    const match = exactMatch ?? preferredIndianMatch;

    if (match?.symbol) {
      return {
        ok: true,
        data: {
          ticker: tickerFromYahooSymbol(match.symbol),
          symbol: match.symbol,
          companyName: match.longname ?? match.shortname ?? normalizedTicker,
          exchange: match.symbol.endsWith(".BO") ? "BSE" : "NSE",
          sector: match.sectorDisp ?? match.sector ?? null,
          industry: match.industryDisp ?? match.industry ?? null,
          isin: getKnownIsin(tickerFromYahooSymbol(match.symbol)),
        },
      };
    }
  }

  return {
    ok: false,
    code: "NOT_FOUND",
    error: `Yahoo Finance could not resolve ${query} on NSE/BSE.`,
  };
}

export async function searchYahooSymbols(query: string, limit = 8): Promise<Result<MarketSymbol[]>> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { ok: true, data: [] };
  }

  const search = await getYahooSearch(trimmedQuery);
  if (!search.ok) {
    return search;
  }

  const seen = new Set<string>();
  const matches = (search.data.quotes ?? [])
    .filter(isIndianEquity)
    .filter((quote) => {
      if (!quote.symbol || seen.has(quote.symbol)) {
        return false;
      }
      seen.add(quote.symbol);
      return true;
    })
    .slice(0, limit)
    .map((quote) => ({
      ticker: tickerFromYahooSymbol(quote.symbol ?? ""),
      symbol: quote.symbol ?? "",
      companyName: quote.longname ?? quote.shortname ?? tickerFromYahooSymbol(quote.symbol ?? ""),
      exchange: quote.symbol?.endsWith(".BO") ? ("BSE" as const) : ("NSE" as const),
      sector: quote.sectorDisp ?? quote.sector ?? null,
      industry: quote.industryDisp ?? quote.industry ?? null,
      isin: getKnownIsin(tickerFromYahooSymbol(quote.symbol ?? "")),
    }));

  return { ok: true, data: matches };
}

function isIndianEquity(quote: NonNullable<YahooSearchResponse["quotes"]>[number]) {
  return (
    quote.quoteType === "EQUITY" &&
    Boolean(quote.symbol) &&
    (quote.symbol?.endsWith(".NS") || quote.symbol?.endsWith(".BO") || quote.exchange === "NSI" || quote.exchange === "BSE")
  );
}

function tickerFromYahooSymbol(symbol: string) {
  return symbol.replace(/\.(NS|BO)$/i, "").toUpperCase();
}

async function getYahooSearch(query: string): Promise<Result<YahooSearchResponse>> {
  return getYahooJson<YahooSearchResponse>(
    `${YAHOO_BASE_URL}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`,
    "Yahoo Finance search request failed.",
  );
}

async function getYahooChart(symbol: string): Promise<Result<YahooChartResponse>> {
  const result = await getYahooJson<YahooChartResponse>(
    `${YAHOO_BASE_URL}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
    "Yahoo Finance chart request failed.",
  );

  if (!result.ok) {
    return result;
  }

  const error = result.data.chart?.error;
  if (error) {
    return {
      ok: false,
      code: "UPSTREAM",
      error: error.description ?? error.code ?? "Yahoo Finance chart returned an error.",
    };
  }

  return result;
}

async function getYahooJson<T>(url: string, fallbackError: string): Promise<Result<T>> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "MetricFinance/0.1",
      },
      cache: "no-store",
    });
    const payload = (await response.json()) as T;

    if (!response.ok) {
      return {
        ok: false,
        code: response.status === 404 ? "NOT_FOUND" : "UPSTREAM",
        error: fallbackError,
      };
    }

    return { ok: true, data: payload };
  } catch (error) {
    return {
      ok: false,
      code: "UPSTREAM",
      error: error instanceof Error ? error.message : fallbackError,
    };
  }
}

async function getYahooQuoteSummary(symbol: string): Promise<YahooQuoteSummaryResponse | null> {
  const result = await getYahooJson<YahooQuoteSummaryResponse>(
    `${YAHOO_BASE_URL}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=defaultKeyStatistics,financialData`,
    "Yahoo quoteSummary failed.",
  );
  return result.ok ? result.data : null;
}

function buildYahooFundamentalMetrics(summary: YahooQuoteSummaryResponse | null): MarketSnapshot["metrics"] {
  if (!summary) return [];
  const stats = summary.quoteSummary?.result?.[0]?.defaultKeyStatistics;
  const fin = summary.quoteSummary?.result?.[0]?.financialData;
  if (!stats && !fin) return [];

  const entries: Array<[string, number | undefined, string?]> = [
    ["P/E Ratio", stats?.trailingPE?.raw],
    ["P/B Ratio", stats?.priceToBook?.raw],
    ["EV/EBITDA", stats?.enterpriseToEbitda?.raw],
    ["ROE", fin?.returnOnEquity?.raw !== undefined ? fin.returnOnEquity.raw * 100 : undefined, "%"],
    ["ROA", fin?.returnOnAssets?.raw !== undefined ? fin.returnOnAssets.raw * 100 : undefined, "%"],
    ["Net Margin", fin?.profitMargins?.raw !== undefined ? fin.profitMargins.raw * 100 : undefined, "%"],
    ["Gross Margin", fin?.grossMargins?.raw !== undefined ? fin.grossMargins.raw * 100 : undefined, "%"],
    ["Revenue Growth", fin?.revenueGrowth?.raw !== undefined ? fin.revenueGrowth.raw * 100 : undefined, "% YoY"],
    ["Debt/Equity", fin?.debtToEquity?.raw],
    ["Current Ratio", fin?.currentRatio?.raw],
    ["Quick Ratio", fin?.quickRatio?.raw],
  ];

  return entries
    .filter(([, val]) => val !== undefined && val !== null && Number.isFinite(val))
    .map(([label, val, suffix]) => ({
      label: label as string,
      value: suffix ? `${(val as number).toFixed(2)}${suffix}` : `${(val as number).toFixed(2)}x`,
      median: "N/A",
    }));
}

function buildMetrics(input: {
  open?: number | null;
  high?: number | null;
  low?: number | null;
  previousClose?: number | null;
  volume?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
}): MarketSnapshot["metrics"] {
  return [
    ["Open", input.open],
    ["High", input.high],
    ["Low", input.low],
    ["Prev Close", input.previousClose],
    ["Volume", input.volume],
    ["52W High", input.fiftyTwoWeekHigh],
    ["52W Low", input.fiftyTwoWeekLow],
  ]
    .map(([label, value]) => ({
      label: label as string,
      value: formatMetricValue(label as string, numberOrNull(value as number | null | undefined)),
    }))
    .filter((metric) => metric.value !== "N/A");
}

function formatMetricValue(label: string, value: number | null) {
  if (value === null) {
    return "N/A";
  }

  if (label === "Volume") {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
  }

  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)}`;
}

function lastNumber(values: Array<number | null> | undefined) {
  if (!values) {
    return null;
  }

  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = numberOrNull(values[index]);
    if (value !== null) {
      return value;
    }
  }

  return null;
}

function numberOrNull(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
