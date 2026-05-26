import { getStoredReport, logGenerationJob, saveReport } from "@/db/reports";
import type { ReportPayload, ReportSourceData } from "@/db/types";
import { generateReportPayload } from "@/services/ai/report-generator";
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
    "N/A",
    "N/A",
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
    sentiment: "Market data only",
    confidence: "Market data",
    overview: [
      `${marketData.companyName} is listed on ${marketData.exchange} as ${marketData.symbol}.`,
      marketData.sector ? `Sector: ${marketData.sector}.` : "Sector data is unavailable from the current provider.",
      marketData.industry ? `Industry: ${marketData.industry}.` : "Industry data is unavailable from the current provider.",
      `The latest available price is ${formatPrice(marketData.price)} with a day change of ${formatPercent(marketData.dayChangePercent)}.`,
    ].join(" "),
    summary:
      "This report is grounded in the latest Yahoo Finance market snapshot because AI report generation is temporarily unavailable. It uses real quote, volume, range, sector, and industry fields where Yahoo provides them. Full company fundamentals, peer medians, and news sentiment still require a licensed fundamentals/news provider.",
    metrics: paddedMetrics,
    peers: marketData.peers.length === 4 ? marketData.peers : ["Target", "NIFTY 50", "Sector Median", "Peer Median"],
  };
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
