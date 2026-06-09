import { eq } from "drizzle-orm";
import { getDb } from "./client";
import { generationJobs, reports } from "./schema";
import type { ReportPayload, ReportSourceData } from "./types";

export type StoredReport = {
  ticker: string;
  payload: ReportPayload;
  sourceData: ReportSourceData;
  generatedAt: Date;
  status: string;
  version: number;
};

export async function getStoredReport(ticker: string): Promise<StoredReport | null> {
  const db = getDb();

  if (!db) {
    return null;
  }

  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.ticker, ticker))
    .limit(1);

  return report ?? null;
}

export async function saveReport(
  payload: ReportPayload,
  sourceData: ReportSourceData,
): Promise<StoredReport | null> {
  const db = getDb();

  if (!db) {
    return null;
  }

  const [report] = await db
    .insert(reports)
    .values({
      ticker: payload.ticker,
      payload,
      sourceData,
      status: "ready",
      version: 1,
    })
    .onConflictDoUpdate({
      target: reports.ticker,
      set: {
        payload,
        sourceData,
        generatedAt: new Date(),
        status: "ready",
        version: 1,
      },
    })
    .returning();

  return report ?? null;
}

export async function logGenerationJob(input: {
  ticker: string;
  startedAt: Date;
  completedAt?: Date;
  ipHash?: string;
  visitorCountry?: string;
  visitorRegion?: string;
  visitorCity?: string;
  visitorTimezone?: string;
  cacheHit: boolean;
  outcome: "ready" | "cache_hit" | "skipped_no_database" | "error";
  errorMessage?: string;
}) {
  const db = getDb();

  if (!db) {
    return null;
  }

  const completedAt = input.completedAt ?? new Date();
  const durationMs = completedAt.getTime() - input.startedAt.getTime();

  const [job] = await db
    .insert(generationJobs)
    .values({
      ticker: input.ticker,
      ipHash: input.ipHash,
      visitorCountry: input.visitorCountry,
      visitorRegion: input.visitorRegion,
      visitorCity: input.visitorCity,
      visitorTimezone: input.visitorTimezone,
      startedAt: input.startedAt,
      completedAt,
      durationMs,
      cacheHit: input.cacheHit,
      outcome: input.outcome,
      errorMessage: input.errorMessage,
    })
    .returning();

  return job ?? null;
}
