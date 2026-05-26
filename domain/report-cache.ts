import { getStoredReport, logGenerationJob, saveReport } from "@/db/reports";
import type { ReportPayload, ReportSourceData } from "@/db/types";
import { getMockReport } from "./mock-report";

export async function getReportForTicker(ticker: string): Promise<ReportPayload> {
  const storedReport = await getStoredReport(ticker);
  return storedReport?.payload ?? getMockReport(ticker);
}

export async function ensureReportForTicker(ticker: string): Promise<ReportPayload> {
  const startedAt = new Date();
  const storedReport = await getStoredReport(ticker);

  if (storedReport) {
    await logGenerationJob({
      ticker,
      startedAt,
      cacheHit: true,
      outcome: "cache_hit",
    });
    return storedReport.payload;
  }

  const payload = getMockReport(ticker);
  const sourceData: ReportSourceData = {
    provider: "mock",
    generatedReason: "cache-miss",
    ticker,
  };

  const savedReport = await saveReport(payload, sourceData);

  await logGenerationJob({
    ticker,
    startedAt,
    cacheHit: false,
    outcome: savedReport ? "ready" : "skipped_no_database",
  });

  return savedReport?.payload ?? payload;
}
