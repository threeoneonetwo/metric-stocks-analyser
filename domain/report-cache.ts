import { getStoredReport, logGenerationJob, saveReport } from "@/db/reports";
import type { ReportPayload, ReportSourceData } from "@/db/types";
import { generateReportPayload, REPORT_PROMPT_VERSION } from "@/services/ai/report-generator";
import { getMarketDataService } from "@/services/marketData";
import type { MarketSnapshot } from "@/services/marketData/types";
import { getMockReport } from "./mock-report";

const REPORT_TTL_MS = 24 * 60 * 60 * 1000;
const MARKET_DATA_FALLBACK_TTL_MS = 5 * 60 * 1000;

export async function getReportForTicker(ticker: string): Promise<ReportPayload> {
  return (await getReportViewForTicker(ticker)).payload;
}

export async function getReportViewForTicker(
  ticker: string,
): Promise<{ payload: ReportPayload; sourceData?: ReportSourceData }> {
  const storedReport = await getStoredReport(ticker);
  if (storedReport && isUsableStoredReport(storedReport)) {
    return {
      payload: storedReport.payload,
      sourceData: storedReport.sourceData,
    };
  }

  const payload = await ensureReportForTicker(ticker, { refresh: Boolean(storedReport) });
  const refreshedReport = await getStoredReport(ticker);

  return {
    payload,
    sourceData: refreshedReport?.sourceData,
  };
}

export async function ensureReportForTicker(
  ticker: string,
  options: { refresh?: boolean } = {},
): Promise<ReportPayload> {
  const startedAt = new Date();
  const storedReport = await getStoredReport(ticker);
  let marketSnapshot: MarketSnapshot | undefined;
  let marketDataError: string | undefined;

  if (storedReport && !options.refresh && isUsableStoredReport(storedReport)) {
    await logGenerationJob({
      ticker,
      startedAt,
      cacheHit: true,
      outcome: "cache_hit",
    });
    return storedReport.payload;
  }

  try {
    const marketData = await getMarketDataService().getSnapshot(ticker);
    marketSnapshot = marketData.ok && marketData.data.source !== "mock" ? marketData.data : undefined;
    marketDataError = marketData.ok ? undefined : marketData.error;
    const generatedReport = await generateReportPayload(ticker, marketSnapshot);
    const savedReport = await saveReport(generatedReport.payload, {
      ...generatedReport.sourceData,
      generatedReason: options.refresh ? "refresh" : "cache-miss",
      marketDataError,
    });

    await logGenerationJob({
      ticker,
      startedAt,
      cacheHit: false,
      outcome: savedReport ? "ready" : "skipped_no_database",
    });

    return savedReport?.payload ?? generatedReport.payload;
  } catch (error) {
    if (marketSnapshot) {
      const fallbackReport = buildMarketDataReport(ticker, marketSnapshot);
      const savedReport = await saveReport(fallbackReport, {
        provider: "market-data",
        generatedReason: options.refresh ? "refresh" : "cache-miss",
        ticker,
        marketData: marketSnapshot,
        marketDataError,
      });

      await logGenerationJob({
        ticker,
        startedAt,
        cacheHit: false,
        outcome: savedReport ? "ready" : "skipped_no_database",
        errorMessage: error instanceof Error ? error.message : "AI generation failed; saved market-data fallback.",
      });

      return savedReport?.payload ?? fallbackReport;
    }

    await logGenerationJob({
      ticker,
      startedAt,
      cacheHit: false,
      outcome: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown report generation error",
    });

    if (storedReport && isUsableStoredReport(storedReport)) {
      return storedReport.payload;
    }

    return getMockReport(ticker);
  }
}

function isFresh(generatedAt: Date) {
  return Date.now() - generatedAt.getTime() < REPORT_TTL_MS;
}

function isUsableStoredReport(report: {
  payload: ReportPayload;
  sourceData: ReportSourceData;
  generatedAt: Date;
}) {
  if (report.sourceData.provider === "mock" || isMockPayload(report.payload)) {
    return false;
  }

  if (!report.sourceData.marketData) {
    return false;
  }

  if (report.sourceData.provider === "gemini" && report.sourceData.promptVersion !== REPORT_PROMPT_VERSION) {
    return false;
  }

  if (report.sourceData.provider === "market-data") {
    return Date.now() - report.generatedAt.getTime() < MARKET_DATA_FALLBACK_TTL_MS;
  }

  return isFresh(report.generatedAt);
}

function isMockPayload(payload: ReportPayload) {
  const combinedText = `${payload.summary} ${payload.overview}`.toLowerCase();
  return (
    combinedText.includes("mocked report shell") ||
    combinedText.includes("placeholder fundamentals") ||
    combinedText.includes("layout fixtures")
  );
}

function buildMarketDataReport(ticker: string, marketData: MarketSnapshot): ReportPayload {
  const metricRows = marketData.metrics.map<ReportPayload["metrics"][number]>((metric) => [
    metric.label,
    metric.value,
    "Current",
    metric.median ?? "N/A",
  ]);
  const paddedMetrics = [
    ...metricRows,
    ["Sector", marketData.sector ?? "N/A", "N/A", "N/A"],
    ["Industry", marketData.industry ?? "N/A", "N/A", "N/A"],
    ["52W High", formatPrice(marketData.fiftyTwoWeekHigh), "N/A", "N/A"],
    ["52W Low", formatPrice(marketData.fiftyTwoWeekLow), "N/A", "N/A"],
  ].slice(0, 6) as ReportPayload["metrics"];

  return {
    ticker,
    companyName: marketData.companyName,
    price: formatPrice(marketData.price),
    dayChange: formatPercent(marketData.dayChangePercent),
    analyzedAt: new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    }).format(new Date()),
    verdict: "Data snapshot",
    sentiment: getFallbackSentiment(marketData),
    confidence: "Market data",
    overview: buildFallbackOverview(marketData),
    summary: buildFallbackSummary(marketData),
    metrics: paddedMetrics,
    peers: marketData.peers.length === 3 ? marketData.peers : [ticker, "NIFTY 50", "Sector Median"],
  };
}

function buildFallbackOverview(marketData: MarketSnapshot) {
  const sectorLine =
    marketData.sector || marketData.industry
      ? `${marketData.sector ?? "Sector not classified"} / ${marketData.industry ?? "industry not classified"}`
      : "sector and industry classification are not available from the current feed";

  return `${marketData.companyName} trades on ${marketData.exchange} under ${marketData.symbol}. The current feed places it in ${sectorLine}. For this read, the useful checks are simple: what the price is doing today, where it sits inside the 52-week band, and whether the available data is strong enough to say anything meaningful about valuation or balance-sheet quality.`;
}

function buildFallbackSummary(marketData: MarketSnapshot) {
  const price = formatPrice(marketData.price);
  const change = formatPercent(marketData.dayChangePercent);
  const volume = formatNumber(marketData.volume);
  const range = formatRangePosition(marketData);
  const marketCap = marketData.marketCap ? `Market cap is ${formatLargeCurrency(marketData.marketCap)},` : "Market cap is unavailable,";

  return `${marketData.companyName} is at ${price}, moving ${change}, with ${volume} shares reported in volume. ${marketCap} and the stock is ${range}. That is enough to read the market tape, but not enough to fully judge business quality. The stronger interpretation comes from whether volume and the top two listed peers confirm the move, while audited fundamentals, margins, leverage, and peer-normalized valuation fill in the durability check.`;
}

function getFallbackSentiment(marketData: MarketSnapshot) {
  const change = marketData.dayChangePercent;
  if (change === null || change === undefined) {
    return "Incomplete";
  }

  if (change >= 1) {
    return "Constructive";
  }

  if (change <= -1) {
    return "Pressured";
  }

  return "Neutral";
}

function formatRangePosition(marketData: MarketSnapshot) {
  const price = marketData.price;
  const high = marketData.fiftyTwoWeekHigh;
  const low = marketData.fiftyTwoWeekLow;
  if (price === null || high === null || low === null || high === low) {
    return "missing 52-week range context";
  }

  const position = Math.round(((price - low) / (high - low)) * 100);
  if (position >= 75) {
    return `near the upper end of its 52-week band at roughly ${position}% of the range`;
  }

  if (position <= 25) {
    return `near the lower end of its 52-week band at roughly ${position}% of the range`;
  }

  return `around the middle of its 52-week band at roughly ${position}% of the range`;
}

function formatLargeCurrency(value: number) {
  if (value >= 1_00_000_00_00_000) {
    return `₹${(value / 1_00_000_00_00_000).toFixed(2)}T`;
  }

  if (value >= 1_00_00_000) {
    return `₹${(value / 1_00_00_000).toFixed(2)}Cr`;
  }

  return formatPrice(value);
}

function formatPrice(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)}`;
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function formatNumber(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);
}
