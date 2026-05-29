import type { Result } from "@/services/result";

const TRADIENT_BASE_URL = "https://api.tradient.org/v1/api";

type TradientNewsResponse = {
  data?: {
    latest_news?: TradientNewsItem[];
  };
};

type TradientNewsItem = {
  news_object?: {
    title?: string;
    text?: string;
    overall_sentiment?: string;
  };
  publish_date?: number;
  stock_name?: string;
  sm_symbol?: string;
  display_symbol?: string;
  category?: string;
  sub_category?: string;
};

export type TradientSignal = {
  news: Array<{
    title: string;
    summary: string;
    sentiment: string;
    publishedAt: string | null;
    symbol: string | null;
  }>;
  technicals: Array<{
    label: string;
    value: string;
    meaning: string;
  }>;
  source: "tradient";
};

export async function getTradientSignals(input: {
  ticker: string;
  companyName: string;
}): Promise<Result<TradientSignal>> {
  try {
    const [news, technicals] = await Promise.all([
      getTradientNews(input),
      getTradientTechnicals(input.ticker),
    ]);

    return {
      ok: true,
      data: {
        news: news.ok ? news.data : [],
        technicals: technicals.ok ? technicals.data : [],
        source: "tradient",
      },
    };
  } catch (error) {
    return {
      ok: false,
      code: "UPSTREAM",
      error: error instanceof Error ? error.message : "Tradient request failed.",
    };
  }
}

async function getTradientNews(input: { ticker: string; companyName: string }) {
  const response = await getTradientJson<TradientNewsResponse>(`${TRADIENT_BASE_URL}/market/news`);
  if (!response.ok) {
    return response;
  }

  const queryTerms = buildTickerTerms(input);
  const news = (response.data.data?.latest_news ?? [])
    .filter((item) => matchesTicker(item, queryTerms))
    .slice(0, 3)
    .map((item) => ({
      title: item.news_object?.title?.trim() || "Untitled market update",
      summary: item.news_object?.text?.trim() || "No summary available.",
      sentiment: item.news_object?.overall_sentiment?.trim() || "neutral",
      publishedAt: formatTradientDate(item.publish_date),
      symbol: item.sm_symbol ?? item.display_symbol ?? null,
    }));

  return { ok: true as const, data: news };
}

async function getTradientTechnicals(ticker: string) {
  const response = await getTradientJson<Record<string, number>>(
    `${TRADIENT_BASE_URL}/market/technicals?symbol=${encodeURIComponent(ticker)}&duration=1`,
  );
  if (!response.ok) {
    return response;
  }

  return {
    ok: true as const,
    data: buildTechnicalReads(response.data),
  };
}

function buildTechnicalReads(values: Record<string, number>) {
  const rsi = values["RSI|1"];
  const macd = values["MACD.macd|1"];
  const macdSignal = values["MACD.signal|1"];
  const ema20 = values["EMA20|1"];
  const ema50 = values["EMA50|1"];
  const adx = values["ADX|1"];

  return [
    read("RSI", rsi, getRsiMeaning(rsi)),
    read("MACD", macd, getMacdMeaning(macd, macdSignal)),
    read("EMA 20 / 50", ema20 && ema50 ? ema20 - ema50 : undefined, getEmaMeaning(ema20, ema50)),
    read("ADX", adx, getAdxMeaning(adx)),
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function read(label: string, value: number | undefined, meaning: string) {
  if (value === undefined || Number.isNaN(value)) {
    return null;
  }

  return {
    label,
    value: value.toFixed(2),
    meaning,
  };
}

function getRsiMeaning(value: number | undefined) {
  if (value === undefined) return "RSI is unavailable.";
  if (value >= 70) return "Momentum is extended on the upside, so price action may be more sensitive to profit-taking.";
  if (value <= 30) return "Momentum is stretched on the downside, so the stock may be in a weak or oversold zone.";
  return "Momentum is in a neutral band, so the broader setup needs price, volume, and peer confirmation.";
}

function getMacdMeaning(macd: number | undefined, signal: number | undefined) {
  if (macd === undefined || signal === undefined) return "MACD context is unavailable.";
  if (macd > signal) return "MACD is above its signal line, which points to improving short-term momentum.";
  return "MACD is below its signal line, which points to weaker short-term momentum.";
}

function getEmaMeaning(ema20: number | undefined, ema50: number | undefined) {
  if (ema20 === undefined || ema50 === undefined) return "EMA trend context is unavailable.";
  if (ema20 > ema50) return "The 20-period EMA is above the 50-period EMA, which keeps the short-term trend constructive.";
  return "The 20-period EMA is below the 50-period EMA, so short-term trend confirmation is weaker.";
}

function getAdxMeaning(value: number | undefined) {
  if (value === undefined) return "ADX is unavailable.";
  if (value >= 25) return "ADX is above 25, which suggests a more defined trend rather than random movement.";
  return "ADX is below 25, which suggests trend strength is limited or still developing.";
}

function buildTickerTerms(input: { ticker: string; companyName: string }) {
  const normalizedCompany = normalizeTerm(input.companyName)
    .replace(/\b(limited|ltd|company|co)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return new Set(
    [
      input.ticker,
      normalizedCompany,
      normalizedCompany.split(" ").slice(0, 3).join(" "),
    ].map(normalizeTerm),
  );
}

function matchesTicker(item: TradientNewsItem, terms: Set<string>) {
  const haystack = [
    item.sm_symbol,
    item.display_symbol,
    item.stock_name,
    item.news_object?.title,
    item.news_object?.text,
  ]
    .map((value) => normalizeTerm(value ?? ""))
    .join(" ");

  return [...terms].some((term) => term.length > 2 && haystack.includes(term));
}

function normalizeTerm(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function formatTradientDate(value: number | undefined) {
  if (!value) {
    return null;
  }

  const milliseconds = value > 10_000_000_000 ? value : value * 1000;
  return new Date(milliseconds).toISOString();
}

async function getTradientJson<T>(url: string): Promise<Result<T>> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        ...(process.env.TRADIENT_API_KEY ? { Authorization: `Bearer ${process.env.TRADIENT_API_KEY}` } : {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        code: response.status === 404 ? "NOT_FOUND" : "UPSTREAM",
        error: `Tradient request failed with ${response.status}.`,
      };
    }

    return { ok: true, data: (await response.json()) as T };
  } catch (error) {
    return {
      ok: false,
      code: "UPSTREAM",
      error: error instanceof Error ? error.message : "Tradient request failed.",
    };
  }
}
