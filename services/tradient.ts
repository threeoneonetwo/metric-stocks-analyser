import type { Result } from "@/services/result";
import { XMLParser } from "fast-xml-parser";

const TRADIENT_BASE_URL = "https://api.tradient.org/v1/api";
const GOOGLE_NEWS_RSS_URL = "https://news.google.com/rss/search";

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
    source: string;
    url: string | null;
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
      getStockNews(input),
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

async function getStockNews(input: { ticker: string; companyName: string }) {
  const tradientNews = await getTradientNews(input);
  const webNews = await getWebNews(input);
  const combinedNews = [
    ...(tradientNews.ok ? tradientNews.data : []),
    ...(webNews.ok ? webNews.data : []),
  ];

  return {
    ok: true as const,
    data: dedupeNews(combinedNews).slice(0, 5),
  };
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
      source: "Tradient",
      url: null,
    }));

  return { ok: true as const, data: news };
}

async function getWebNews(input: { ticker: string; companyName: string }) {
  const response = await getGoogleNewsRss(input);
  if (!response.ok) {
    return response;
  }

  const news = response.data
    .slice(0, 5)
    .map((item) => ({
      title: item.title,
      summary: buildWebNewsSummary(item.source, item.title),
      sentiment: inferHeadlineSentiment(item.title),
      publishedAt: item.publishedAt,
      symbol: input.ticker,
      source: item.source,
      url: item.url,
    }));

  return { ok: true as const, data: news };
}

function buildWebNewsSummary(source: string, title: string) {
  const lowerTitle = title.toLowerCase();
  if (/result|profit|revenue|earnings|margin|quarter|q[1-4]/i.test(lowerTitle)) {
    return `${source} is pointing to an earnings update, so the useful read is margin direction, revenue quality, and whether management commentary supports the market reaction.`;
  }

  if (/deal|order|contract|client|wins?/i.test(lowerTitle)) {
    return `${source} is highlighting business momentum. The key question is whether the announcement can move revenue visibility, not just sentiment.`;
  }

  if (/falls?|drops?|declines?|lost|weak|cut|downgrade/i.test(lowerTitle)) {
    return `${source} is flagging pressure around the stock or business. Read it against peers and volume before treating it as a company-only signal.`;
  }

  if (/rises?|gains?|surges?|beats?|upgrade/i.test(lowerTitle)) {
    return `${source} is flagging a constructive development. The important check is whether price, volume, and fundamentals are confirming the same story.`;
  }

  return `${source} adds a relevant business signal. The headline is useful, but the report should weigh it alongside price action, peers, and technicals.`;
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

type GoogleNewsRss = {
  rss?: {
    channel?: {
      item?: GoogleNewsItem | GoogleNewsItem[];
    };
  };
};

type GoogleNewsItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  source?: string | { "#text"?: string };
};

async function getGoogleNewsRss(input: { ticker: string; companyName: string }) {
  const company = cleanCompanyName(input.companyName);
  const searchTerms = [`"${company}"`];
  const shortName = company.split(" ").slice(0, 2).join(" ");
  if (shortName && shortName !== company) {
    searchTerms.push(`"${shortName}"`);
  }
  if (input.ticker.length >= 4 && input.ticker.length <= 12) {
    searchTerms.push(input.ticker);
  }

  const query = `${searchTerms.join(" OR ")} stock business earnings market`;
  const url = `${GOOGLE_NEWS_RSS_URL}?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
  const response = await getRssXml(url);
  if (!response.ok) {
    return response;
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    trimValues: true,
  });
  const parsed = parser.parse(response.data) as GoogleNewsRss;
  const rawItems = parsed.rss?.channel?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
  const matchTerms = buildWebMatchTerms(input);
  const news = items
    .map(normalizeGoogleNewsItem)
    .filter((item) => item.title && item.url && matchesWebArticle(item, matchTerms));

  return { ok: true as const, data: news };
}

function buildWebMatchTerms(input: { ticker: string; companyName: string }) {
  const company = cleanCompanyName(input.companyName);
  const shortName = company.split(" ").slice(0, 2).join(" ");
  return new Set([company, shortName, input.ticker].map(normalizeTerm).filter((term) => term.length > 2));
}

function normalizeGoogleNewsItem(item: GoogleNewsItem) {
  const titleParts = (item.title ?? "Untitled web article").split(" - ");
  const source =
    typeof item.source === "string"
      ? item.source
      : item.source?.["#text"] ?? titleParts.at(-1) ?? "Google News";
  const title = titleParts.length > 1 ? titleParts.slice(0, -1).join(" - ") : titleParts[0];
  return {
    title: decodeHtml(title),
    source: decodeHtml(source),
    url: item.link ?? null,
    publishedAt: parseDate(item.pubDate),
  };
}

function matchesWebArticle(
  item: { title: string; source: string; url: string | null },
  terms: Set<string>,
) {
  const haystack = normalizeTerm(`${item.title} ${item.source} ${item.url ?? ""}`);
  return [...terms].some((term) => haystack.includes(term));
}

function cleanCompanyName(value: string) {
  return value
    .replace(/\b(limited|ltd|company|co)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeNews<T extends { title: string; url: string | null }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalizeTerm(item.url ?? item.title);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function inferHeadlineSentiment(title: string) {
  const normalizedTitle = normalizeTerm(title);
  if (/\b(gain|gains|rally|surge|surges|rise|rises|growth|profit|upgrade|beats|wins|launch|expands|record)\b/.test(normalizedTitle)) {
    return "positive";
  }
  if (/\b(fall|falls|drop|drops|loss|miss|downgrade|cuts|cut|crash|probe|penalty|fine|weak|decline)\b/.test(normalizedTitle)) {
    return "negative";
  }
  return "neutral";
}

function parseDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
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

async function getRssXml(url: string): Promise<Result<string>> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml",
        "User-Agent": "MetricFinance/0.1",
      },
      next: { revalidate: 15 * 60 },
    });

    if (!response.ok) {
      return {
        ok: false,
        code: response.status === 404 ? "NOT_FOUND" : "UPSTREAM",
        error: `News RSS request failed with ${response.status}.`,
      };
    }

    return { ok: true, data: await response.text() };
  } catch (error) {
    return {
      ok: false,
      code: "UPSTREAM",
      error: error instanceof Error ? error.message : "News RSS request failed.",
    };
  }
}
