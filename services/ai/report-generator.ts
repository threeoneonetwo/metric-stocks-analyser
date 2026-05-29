import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import type { ReportPayload, ReportSourceData } from "@/db/types";
import { getMockReport } from "@/domain/mock-report";
import type { MarketSnapshot } from "@/services/marketData/types";

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
  peers: z.array(z.string().min(1)).length(3),
});

export type GeneratedReportResult = {
  payload: ReportPayload;
  sourceData: ReportSourceData;
};

export function canGenerateAiReport() {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

export async function generateReportPayload(
  ticker: string,
  marketData?: MarketSnapshot,
): Promise<GeneratedReportResult> {
  if (!canGenerateAiReport()) {
    const mockReport = getMockReport(ticker);
    return {
      payload: marketData ? applyMarketData(mockReport, marketData) : mockReport,
      sourceData: {
        provider: "mock",
        generatedReason: "cache-miss",
        ticker,
        marketData,
      },
    };
  }

  const analyzedAt = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  const prompt = [
    `Generate a Metric Finance equity research report for ticker ${ticker}.`,
    `Use analyzedAt exactly as: ${analyzedAt}.`,
    marketData
      ? `Use this market data as the factual source. Do not contradict it: ${JSON.stringify(marketData)}`
      : "No market data provider response is available. Use N/A for unavailable market fields.",
    "The report must be useful for a mobile UI and must fit the provided schema.",
    "Use six financial metric rows. Each metric row must include label, value, yoy, and median.",
    "Use exactly three peer labels: 'Target' followed by the top two direct listed competitors from the market data peers field.",
    "The executive summary should cover business quality, valuation context, contrarian signal, sentiment, and risks.",
    "Keep wording direct and avoid promises, ratings, or buy/sell recommendations.",
  ].join("\n");
  const { object, modelId } = await generateWithModelFallback(prompt);

  return {
    payload: applyMarketData(
      {
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
      marketData,
    ),
    sourceData: {
      provider: "gemini",
      generatedReason: "cache-miss",
      ticker,
      aiModel: modelId,
      marketData,
    },
  };
}

async function generateWithModelFallback(prompt: string) {
  const modelIds = getGeminiModelIds();
  const errors: string[] = [];

  for (const modelId of modelIds) {
    try {
      const { object } = await generateObject({
        model: google(modelId),
        schema: reportPayloadSchema,
        schemaName: "MetricFinanceEquityReport",
        temperature: 0.35,
        system:
          "You write concise equity research for Indian NSE and BSE listed stocks. Return only grounded, cautious analysis. Do not invent live prices. If exact live market data is unavailable, use 'N/A' for price and dayChange. This is not financial advice.",
        prompt,
      });

      return { object, modelId };
    } catch (error) {
      errors.push(`${modelId}: ${error instanceof Error ? error.message : "Unknown Gemini error"}`);
    }
  }

  throw new Error(`Gemini generation failed for all configured models. ${errors.join(" | ")}`);
}

function getGeminiModelIds() {
  const configuredModels = [
    process.env.GEMINI_MODEL,
    ...(process.env.GEMINI_FALLBACK_MODELS?.split(",") ?? []),
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
  ]
    .map((model) => model?.trim())
    .filter((model): model is string => Boolean(model));

  return [...new Set(configuredModels)];
}

function applyMarketData(report: ReportPayload, marketData: MarketSnapshot | undefined): ReportPayload {
  if (!marketData) {
    return report;
  }

  return {
    ...report,
    companyName: marketData.companyName,
    price: formatPrice(marketData.price),
    dayChange: formatPercent(marketData.dayChangePercent),
    peers: marketData.peers.length === 3 ? marketData.peers : report.peers,
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
