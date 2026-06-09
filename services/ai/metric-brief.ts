import { anthropic } from "@ai-sdk/anthropic";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import type { MarketSnapshot } from "@/services/marketData/types";
import type { TradientSignal } from "@/services/tradient";

// ─── shared helper ────────────────────────────────────────────────────────────

function getModel() {
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic(process.env.CLAUDE_INSIGHTS_MODEL ?? process.env.CLAUDE_MODEL ?? "claude-haiku-4-5");
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
  return Boolean(process.env.ANTHROPIC_API_KEY);
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
      ? clampPercent(Math.round(((p - l52) / (h52 - l52)) * 100))
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
      25000,
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
    "You are a senior Indian equities analyst. Write one natural 90 to 120 word paragraph that explains what the peer setup means. Do not follow a fixed order. Start with the most useful contrast between the company and peers. Avoid generic lines about alignment, confirmation, or single data points. No bullet points. No headers. No dashes. No financial advice. Only reference numbers present in the data.";

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
    "You are a senior Indian equities analyst writing for a serious investor. Write like a person, not like a report template. Interpret what the data means, not what it says. Take a clear point of view, but do not recommend buying, selling, or holding. Be specific to this company and this exact data. Avoid generic scaffolding that could apply to any stock. Never use these phrases or close variants: sellers are setting the tone, current price sits, on fundamentals, technically, news flow is, the cleaner conclusion, alignment matters, read together. No dashes of any kind. No bullet points. Only reference numbers present in the provided data.";

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
- whatThisMeans: One natural paragraph of 110-150 words, written like an analyst explaining the setup to a colleague. Do not follow the field order above. Start with the most interesting tension in the data, not with the daily price move unless that is genuinely the main story. Blend price action, range, fundamentals, technicals, and news into a single view. Use the company name or business context where possible. Avoid formulaic transitions such as "on fundamentals", "technically", or "news flow". End with the one thing that would most change the read.`;

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
      30000,
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

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}
