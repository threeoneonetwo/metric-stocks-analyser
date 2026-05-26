import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import type { ReportPayload, ReportSourceData } from "@/db/types";
import { getMockReport } from "@/domain/mock-report";

const generatedMetricSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  yoy: z.string().min(1),
  median: z.string().min(1),
});

const reportPayloadSchema = z.object({
  ticker: z.string().min(1).max(20),
  companyName: z.string().min(1),
  price: z.string().min(1),
  dayChange: z.string().min(1),
  analyzedAt: z.string().min(1),
  verdict: z.string().min(1),
  sentiment: z.string().min(1),
  confidence: z.string().min(1),
  overview: z.string().min(120),
  summary: z.string().min(160),
  metrics: z.array(generatedMetricSchema).length(6),
  peers: z.array(z.string().min(1)).length(4),
});

export type GeneratedReportResult = {
  payload: ReportPayload;
  sourceData: ReportSourceData;
};

export function canGenerateAiReport() {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

export async function generateReportPayload(ticker: string): Promise<GeneratedReportResult> {
  if (!canGenerateAiReport()) {
    return {
      payload: getMockReport(ticker),
      sourceData: {
        provider: "mock",
        generatedReason: "cache-miss",
        ticker,
      },
    };
  }

  const analyzedAt = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  const { object } = await generateObject({
    model: google(process.env.GEMINI_MODEL ?? "gemini-2.5-flash"),
    schema: reportPayloadSchema,
    schemaName: "MetricFinanceEquityReport",
    temperature: 0.35,
    system:
      "You write concise equity research for Indian NSE and BSE listed stocks. Return only grounded, cautious analysis. Do not invent live prices. If exact live market data is unavailable, use 'N/A' for price and dayChange. This is not financial advice.",
    prompt: [
      `Generate a Metric Finance equity research report for ticker ${ticker}.`,
      `Use analyzedAt exactly as: ${analyzedAt}.`,
      "The report must be useful for a mobile UI and must fit the provided schema.",
      "Use six financial metric rows. Each metric row must include label, value, yoy, and median.",
      "Use four peer labels. The first peer must be 'Target'.",
      "The executive summary should cover business quality, valuation context, contrarian signal, sentiment, and risks.",
      "Keep wording direct and avoid promises, ratings, or buy/sell recommendations.",
    ].join("\n"),
  });

  return {
    payload: {
      ...object,
      ticker,
      analyzedAt,
      metrics: object.metrics.map((metric) => [
        metric.label,
        metric.value,
        metric.yoy,
        metric.median,
      ]),
    },
    sourceData: {
      provider: "gemini",
      generatedReason: "cache-miss",
      ticker,
    },
  };
}
