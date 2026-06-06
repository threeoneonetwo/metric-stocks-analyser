import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import type { MarketSnapshot } from "@/services/marketData/types";
import type { TradientSignal } from "@/services/tradient";

// ─── shared helper ────────────────────────────────────────────────────────────

function getModel() {
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic(process.env.CLAUDE_INSIGHTS_MODEL ?? process.env.CLAUDE_MODEL ?? "claude-haiku-4-5");
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google(process.env.GEMINI_MODEL ?? "gemini-2.0-flash");
  }
  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

function hasAiConfig() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

function buildMarketPayload(
  companyName: string,
  marketData: MarketSnapshot | undefined,
  metrics: Array<[string, string, string, string]>,
  signals: TradientSignal | null,
  extras?: Record<string, unknown>,
) {
  const p = marketData?.price;
  const h52 = marketData?.fiftyTwoWeekHigh;
  const l52 = marketData?.fiftyTwoWeekLow;
  const rangePercent =
    p != null && h52 != null && l52 != null && h52 !== l52
      ? Math.round(((p - l52) / (h52 - l52)) * 100)
      : null;

  return {
    company: companyName,
    price: marketData?.price ?? null,
    dayChangePercent: marketData?.dayChangePercent ?? null,
    volume: marketData?.volume ?? null,
    dayHigh: marketData?.dayHigh ?? null,
    dayLow: marketData?.dayLow ?? null,
    fiftyTwoWeekHigh: h52 ?? null,
    fiftyTwoWeekLow: l52 ?? null,
    rangePercentile: rangePercent,
    metrics: metrics.map(([label, value, yoy, median]) => ({ label, value, yoy, median })),
    rsi: signals?.technicals.find((t) => /rsi/i.test(t.label)) ?? null,
    technicals: signals?.technicals ?? [],
    news: signals?.news ?? [],
    ...extras,
  };
}

// ─── metric brief ─────────────────────────────────────────────────────────────

export async function generateMetricBrief(input: {
  companyName: string;
  marketData: MarketSnapshot | undefined;
  metrics: Array<[string, string, string, string]>;
  signals: TradientSignal | null;
}): Promise<string | null> {
  if (!hasAiConfig()) return null;
  const model = getModel();
  if (!model) return null;

  const data = buildMarketPayload(input.companyName, input.marketData, input.metrics, input.signals);

  const system =
    "You are a senior Indian equities analyst writing a live market commentary. Write one fluid paragraph of 90 to 130 words specifically about this stock right now. Do not follow a template. Start with the most meaningful thing about the current setup, then weave together the signals that matter most. Every sentence must add interpretive value the reader cannot get by just reading the numbers. Be specific to this company and this data. Never say 'the stock' generically when you can say what the move implies. No bullet points. No headers. No dashes of any kind. No financial advice. ONLY use numbers that appear in the provided data.";

  try {
    const result = await withTimeout(
      generateText({
        model,
        system,
        prompt: `Write a metric brief for ${input.companyName} using only this data:\n${JSON.stringify(data, null, 2)}`,
        maxOutputTokens: 400,
        temperature: 0.35,
      }),
      12000,
    );
    if (!result) return null;
    return stripBriefDashes(result.text.trim()) || null;
  } catch {
    return null;
  }
}

// ─── peer insight ─────────────────────────────────────────────────────────────

export async function generatePeerInsight(input: {
  companyName: string;
  marketData: MarketSnapshot | undefined;
  peerLabels: string[];
  peerSnapshots: Array<MarketSnapshot | null>;
  metrics: Array<[string, string, string, string]>;
  signals: TradientSignal | null;
}): Promise<string | null> {
  if (!hasAiConfig()) return null;
  const model = getModel();
  if (!model) return null;

  const newsCounts = { positive: 0, neutral: 0, negative: 0 };
  for (const item of input.signals?.news ?? []) {
    const s = item.sentiment.toLowerCase();
    if (s === "positive") newsCounts.positive++;
    else if (s === "negative") newsCounts.negative++;
    else newsCounts.neutral++;
  }

  const data = buildMarketPayload(input.companyName, input.marketData, input.metrics, input.signals, {
    peers: input.peerLabels.map((label, i) => ({
      label,
      price: input.peerSnapshots[i]?.price ?? null,
      dayChangePercent: input.peerSnapshots[i]?.dayChangePercent ?? null,
      volume: input.peerSnapshots[i]?.volume ?? null,
    })),
    newsSentimentCounts: newsCounts,
    totalNewsItems: input.signals?.news.length ?? 0,
  });

  const system =
    "You are a financial data summarizer. Given market data for a stock and its peers, write a 100 to 120 word 'what this means' summary in one paragraph. Follow this exact structure: open with the day move and whether it is worth reading into based on volume and peer behavior, then reference the 52-week range position and what it implies, then bring in the valuation and quality metrics versus peer medians and what the gap suggests, then summarize the RSI reading and what it says about momentum, then close with the news sentiment score and a one-sentence conclusion about why alignment across all signals matters more than any single data point. Rules: ONLY reference exact numbers from the provided data. If a value is null, say it is not available. Write in plain, simple language. No bullet points. No headers. No dashes. No financial advice. Keep sentences short and direct.";

  try {
    const { text } = await generateText({
      model,
      system,
      prompt: `Market data:\n${JSON.stringify(data, null, 2)}`,
      maxOutputTokens: 400,
      temperature: 0.2,
    });
    return text.trim() || null;
  } catch {
    return null;
  }
}

// ─── report section insights ──────────────────────────────────────────────────

export type ReportInsights = {
  priceAction: string;
  rangePosition: string;
  volume: string;
  valuationRisk: string;
  earningsRisk: string;
  marketTiming: string;
  newsContext: string;
  whatThisMeans: string;
};

const reportInsightsSchema = z.object({
  priceAction: z.string().min(20),
  rangePosition: z.string().min(30),
  volume: z.string().min(20),
  valuationRisk: z.string().min(40),
  earningsRisk: z.string().min(40),
  marketTiming: z.string().min(40),
  newsContext: z.string().min(30),
  whatThisMeans: z.string().min(80),
});

export async function generateReportInsights(input: {
  companyName: string;
  marketData: MarketSnapshot | undefined;
  metrics: Array<[string, string, string, string]>;
  signals: TradientSignal | null;
}): Promise<ReportInsights | null> {
  if (!hasAiConfig()) return null;
  const model = getModel();
  if (!model) return null;

  const data = buildMarketPayload(input.companyName, input.marketData, input.metrics, input.signals);

  const system =
    "You are a senior Indian equities analyst. Write sharp, specific, contextual analysis for each section. Interpret what the data means, not what it says. Take a clear point of view. Be specific to this company and this data. Never use generic language that could apply to any stock. No dashes of any kind (no em dashes, en dashes, or hyphens as punctuation). No bullet points. No financial advice. Only reference numbers present in the provided data.";

  const prompt = `Analyse ${input.companyName} using ONLY this data:

${JSON.stringify(data, null, 2)}

Generate each field:
- priceAction: 1-2 sentences. What does the ${data.dayChangePercent !== null ? data.dayChangePercent + "%" : "N/A"} day move actually signal about near-term momentum? Be specific, not generic.
- rangePosition: 2 sentences. The stock is at ${data.rangePercentile !== null ? data.rangePercentile + "%" : "N/A"} of its 52-week range. What does this specific position tell you about the sentiment backdrop and the key question an investor should be asking right now?
- volume: 1-2 sentences. Volume is ${data.volume !== null ? data.volume.toLocaleString() : "N/A"} shares. What does this say about whether the move has real participation behind it?
- valuationRisk: 2-3 sentences. Use the valuation metrics vs peer medians. What is the specific valuation risk or opportunity here and what would change your view?
- earningsRisk: 2-3 sentences. Use the quality and profitability metrics. What does the earnings quality data reveal about the durability of the business performance?
- marketTiming: 2-3 sentences. Using the technical signals and news tone, what does the timing setup look like? Is the entry window compelling, cautious, or neutral?
- newsContext: 1-2 sentences. What does the overall news tone and the top headline signal about market perception of this company right now?
- whatThisMeans: 4-5 sentences. A decisive analyst verdict. Bring together price position, range, fundamentals, technicals, and news into one clear read. Take a position on what the setup means. Identify the key catalyst or risk that will determine whether the thesis plays out. End with what a disciplined investor should be monitoring.`;

  try {
    const result = await withTimeout(
      generateObject({
        model,
        schema: reportInsightsSchema,
        schemaName: "ReportInsights",
        system,
        prompt,
        temperature: 0.35,
      }),
      15000,
    );
    if (!result) return null;
    return stripInsightDashes(result.object);
  } catch {
    return null;
  }
}

function stripInsightDashes(obj: ReportInsights): ReportInsights {
  const clean = (s: string) => s.replace(/\s*[—–]\s*/g, ", ").replace(/(\w)-(\w)/g, "$1 $2").replace(/,\s*,/g, ",").trim();
  return {
    priceAction: clean(obj.priceAction),
    rangePosition: clean(obj.rangePosition),
    volume: clean(obj.volume),
    valuationRisk: clean(obj.valuationRisk),
    earningsRisk: clean(obj.earningsRisk),
    marketTiming: clean(obj.marketTiming),
    newsContext: clean(obj.newsContext),
    whatThisMeans: clean(obj.whatThisMeans),
  };
}

function stripBriefDashes(s: string) {
  return s.replace(/\s*[—–]\s*/g, ", ").replace(/(\w)-(\w)/g, "$1 $2").replace(/,\s*,/g, ",").trim();
}
