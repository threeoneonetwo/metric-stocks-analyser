import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";
import type { ReportPayload, ReportSourceData } from "@/db/types";
import { getMockReport } from "@/domain/mock-report";
import type { MarketSnapshot } from "@/services/marketData/types";

export const REPORT_PROMPT_VERSION = 8;

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
  return Boolean(process.env.ANTHROPIC_API_KEY);
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
    `Generate a Metric Finance equity intelligence brief for ticker ${ticker}.`,
    `Use analyzedAt exactly as: ${analyzedAt}.`,
    marketData
      ? `Market data (treat as ground truth, do not contradict): ${JSON.stringify(marketData)}`
      : "No market data available. Use N/A for unavailable market fields.",
    "",
    "CRITICAL RULE: The reader can already see every number on screen. Do NOT restate data points. Your only job is to interpret what the data means — causes, implications, risks, trade-offs, what would change the view.",
    "Wrong: 'The stock is up +0.92% today.' Right: 'The move is too small to distinguish from noise unless volume confirms conviction — it does not yet.'",
    "Wrong: 'The 52-week position is 33%.' Right: 'Sitting in the lower third of its range tells you the stock has not recovered from whatever drove the prior selloff — the question is whether that overhang has cleared.'",
    "Wrong: 'EBITDA Margin is ~11.5% vs sector median 10.8%.' Right: 'Above-median margins suggest pricing power or cost discipline is holding, but the YoY direction matters more — expanding margins compound, contracting ones don\\'t.'",
    "",
    "overview: Explain the business model in one sentence, then where the real operating leverage or fragility sits — not what the company does generically, but what drives or kills the profit line. Do not repeat market data.",
    "summary: One analyst paragraph. Interpret the full picture: what the price position relative to its range implies about sentiment, whether volume gives that move credibility, what peer behaviour reveals about sector vs company-specific drivers, and what the fundamentals confirm or leave unresolved. Every sentence must add a new interpretive point. No sentence should restate a number the reader already sees.",
    "Use six metric rows. Prioritize Upstox key ratios and sector benchmark medians where available. Each row needs label, value, yoy, median.",
    "Use exactly three peer labels: this ticker plus the top two direct competitors from the peers field.",
    "Avoid buy, sell, hold, accumulate, avoid, target price, stop loss, multibagger, guaranteed, recommendation language, and disclaimers.",
    "Never use dashes in any text field — no em dashes, en dashes, or hyphens used as sentence punctuation. Use commas, semicolons, or full stops instead.",
  ].join("\n");

  const { object, modelId, provider } = await generateWithModelFallback(prompt);

  return {
    payload: applyMarketData(
      {
        ...object,
        ticker,
        analyzedAt,
        overview: stripDashes(object.overview),
        summary: stripDashes(object.summary),
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
      provider,
      generatedReason: "cache-miss",
      ticker,
      aiModel: modelId,
      promptVersion: REPORT_PROMPT_VERSION,
      marketData,
    },
  };
}

const SYSTEM_PROMPT =
  "You are a senior Indian equities analyst writing for a smart investor who can already see all the numbers. Never describe or restate data — only interpret it. Every sentence must answer 'so what?' or 'why does this matter?'. Anchor reasoning to supplied data, surface trade-offs and missing evidence, and write in direct, commercial prose. Do not invent live prices. Use 'N/A' for unavailable fields. Avoid buy, sell, hold, target price, stop loss, and recommendation language. Never use dashes (em dashes, en dashes, or hyphens used as punctuation) in prose — use commas, semicolons, or full stops instead.";

async function generateWithModelFallback(prompt: string) {
  const errors: string[] = [];

  if (process.env.ANTHROPIC_API_KEY) {
    const claudeModelId = process.env.CLAUDE_MODEL ?? "claude-haiku-4-5";
    try {
      const result = await withTimeout(
        generateObject({
          model: anthropic(claudeModelId),
          schema: reportPayloadSchema,
          schemaName: "MetricFinanceEquityReport",
          temperature: 0.45,
          system: SYSTEM_PROMPT,
          prompt,
        }),
        30000,
      );
      if (!result) {
        throw new Error("Timed out");
      }
      return { object: result.object, modelId: claudeModelId, provider: "claude" as const };
    } catch (error) {
      errors.push(`${claudeModelId}: ${error instanceof Error ? error.message : "Unknown Claude error"}`);
    }
  }

  throw new Error(`Claude report generation failed. ${errors.join(" | ")}`);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
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

function stripDashes(text: string): string {
  return text
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s*–\s*/g, ", ")
    .replace(/(\w)\s*-\s*(\w)/g, "$1 $2")
    .replace(/,\s*,/g, ",")
    .trim();
}
