import type { Result } from "@/services/result";
import type { MarketDataService, MarketSnapshot } from "./types";

type OpenAlgoSearchItem = {
  symbol?: string;
  name?: string;
  exchange?: string;
  instrumenttype?: string;
};

type OpenAlgoQuoteData = {
  ltp?: number;
  open?: number;
  high?: number;
  low?: number;
  prev_close?: number;
  volume?: number;
  oi?: number;
};

type OpenAlgoResponse<T> = {
  status?: string;
  message?: string;
  data?: T;
};

export function hasOpenAlgoConfig() {
  return Boolean(process.env.OPENALGO_BASE_URL && process.env.OPENALGO_API_KEY);
}

export const openAlgoMarketData: MarketDataService = {
  async getSnapshot(ticker) {
    const baseUrl = process.env.OPENALGO_BASE_URL?.replace(/\/+$/, "");
    const apiKey = process.env.OPENALGO_API_KEY;
    const exchange = normalizeExchange(process.env.OPENALGO_DEFAULT_EXCHANGE);

    if (!baseUrl || !apiKey) {
      return {
        ok: false,
        code: "VALIDATION",
        error: "OpenAlgo is not configured. Set OPENALGO_BASE_URL and OPENALGO_API_KEY.",
      };
    }

    const symbol = await resolveSymbol({ baseUrl, apiKey, exchange, ticker });
    if (!symbol.ok) {
      return symbol;
    }

    const quote = await postOpenAlgo<OpenAlgoQuoteData>(`${baseUrl}/api/v1/quotes`, {
      apikey: apiKey,
      symbol: symbol.data.symbol,
      exchange: symbol.data.exchange,
    });

    if (!quote.ok) {
      return quote;
    }

    const data = quote.data.data;
    if (!data) {
      return {
        ok: false,
        code: "UPSTREAM",
        error: "OpenAlgo quote response did not include data.",
      };
    }

    const dayChangePercent =
      numberOrNull(data.ltp) !== null && numberOrNull(data.prev_close) !== null && data.prev_close
        ? ((data.ltp! - data.prev_close) / data.prev_close) * 100
        : null;

    return {
      ok: true,
      data: {
        ticker,
        symbol: symbol.data.symbol,
        companyName: symbol.data.name ?? `${symbol.data.symbol} Ltd`,
        exchange: symbol.data.exchange,
        currency: "INR",
        price: numberOrNull(data.ltp),
        dayChangePercent,
        sector: null,
        industry: null,
        marketCap: null,
        volume: numberOrNull(data.volume),
        dayHigh: numberOrNull(data.high),
        dayLow: numberOrNull(data.low),
        fiftyTwoWeekHigh: null,
        fiftyTwoWeekLow: null,
        asOf: new Date().toISOString(),
        source: "openalgo",
        sourceUrl: `${baseUrl}/api/v1/quotes`,
        peers: ["Target", "NIFTY 50", "Sector Median", "Peer Median"],
        metrics: buildMetrics(data),
      },
    };
  },
};

async function resolveSymbol(input: {
  baseUrl: string;
  apiKey: string;
  exchange: "NSE" | "BSE";
  ticker: string;
}): Promise<Result<{ symbol: string; name: string | null; exchange: "NSE" | "BSE" }>> {
  const search = await postOpenAlgo<OpenAlgoSearchItem[]>(`${input.baseUrl}/api/v1/search`, {
    apikey: input.apiKey,
    query: input.ticker,
    exchange: input.exchange,
  });

  if (!search.ok) {
    return search;
  }

  const matches = search.data.data ?? [];
  const exactEquity = matches.find(
    (item) =>
      item.symbol?.toUpperCase() === input.ticker.toUpperCase() &&
      item.exchange === input.exchange &&
      item.instrumenttype === "EQ",
  );
  const firstEquity = matches.find(
    (item) => item.exchange === input.exchange && item.instrumenttype === "EQ" && item.symbol,
  );
  const match = exactEquity ?? firstEquity;

  if (!match?.symbol) {
    return {
      ok: false,
      code: "NOT_FOUND",
      error: `OpenAlgo could not resolve ${input.exchange}:${input.ticker}.`,
    };
  }

  return {
    ok: true,
    data: {
      symbol: match.symbol,
      name: match.name ?? null,
      exchange: input.exchange,
    },
  };
}

async function postOpenAlgo<T>(
  url: string,
  body: Record<string, string>,
): Promise<Result<OpenAlgoResponse<T>>> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const payload = (await response.json()) as OpenAlgoResponse<T>;

    if (!response.ok || payload.status === "error") {
      return {
        ok: false,
        code: response.status === 403 ? "VALIDATION" : "UPSTREAM",
        error: payload.message ?? `OpenAlgo request failed with HTTP ${response.status}.`,
      };
    }

    return { ok: true, data: payload };
  } catch (error) {
    return {
      ok: false,
      code: "UPSTREAM",
      error: error instanceof Error ? error.message : "OpenAlgo request failed.",
    };
  }
}

function buildMetrics(data: OpenAlgoQuoteData): MarketSnapshot["metrics"] {
  return [
    ["Open", data.open],
    ["High", data.high],
    ["Low", data.low],
    ["Prev Close", data.prev_close],
    ["Volume", data.volume],
    ["Open Interest", data.oi],
  ]
    .map(([label, value]) => ({
      label: label as string,
      value: formatMetricValue(label as string, numberOrNull(value as number | undefined)),
    }))
    .filter((metric) => metric.value !== "N/A");
}

function formatMetricValue(label: string, value: number | null) {
  if (value === null) {
    return "N/A";
  }

  if (label === "Volume" || label === "Open Interest") {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
  }

  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)}`;
}

function numberOrNull(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeExchange(value: string | undefined): "NSE" | "BSE" {
  return value === "BSE" ? "BSE" : "NSE";
}
