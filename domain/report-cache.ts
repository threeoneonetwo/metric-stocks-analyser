import { getStoredReport, logGenerationJob, saveReport } from "@/db/reports";
import type { ReportPayload } from "@/db/types";
import { generateReportPayload } from "@/services/ai/report-generator";
import { getMarketDataService } from "@/services/marketData";
import { getMockReport } from "./mock-report";

const REPORT_TTL_MS = 24 * 60 * 60 * 1000;

export async function getReportForTicker(ticker: string): Promise<ReportPayload> {
  const storedReport = await getStoredReport(ticker);
  return storedReport?.payload ?? getMockReport(ticker);
}

export async function ensureReportForTicker(
  ticker: string,
  options: { refresh?: boolean } = {},
): Promise<ReportPayload> {
  const startedAt = new Date();
  const storedReport = await getStoredReport(ticker);

  if (storedReport && !options.refresh && isFresh(storedReport.generatedAt)) {
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
    const marketSnapshot = marketData.ok && marketData.data.source !== "mock" ? marketData.data : undefined;
    const generatedReport = await generateReportPayload(ticker, marketSnapshot);
    const savedReport = await saveReport(generatedReport.payload, {
      ...generatedReport.sourceData,
      generatedReason: options.refresh ? "refresh" : "cache-miss",
      marketDataError: marketData.ok ? undefined : marketData.error,
    });

    await logGenerationJob({
      ticker,
      startedAt,
      cacheHit: false,
      outcome: savedReport ? "ready" : "skipped_no_database",
    });

    return savedReport?.payload ?? generatedReport.payload;
  } catch (error) {
    await logGenerationJob({
      ticker,
      startedAt,
      cacheHit: false,
      outcome: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown report generation error",
    });

    if (storedReport) {
      return storedReport.payload;
    }

    return getMockReport(ticker);
  }
}

function isFresh(generatedAt: Date) {
  return Date.now() - generatedAt.getTime() < REPORT_TTL_MS;
}
