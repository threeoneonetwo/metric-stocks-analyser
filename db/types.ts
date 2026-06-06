import type { MarketSnapshot } from "@/services/marketData/types";

export type ReportMetric = [label: string, value: string, yoy: string, median: string];

export type ReportInsightsPayload = {
  priceAction: string;
  rangePosition: string;
  volume: string;
  valuationRisk: string;
  earningsRisk: string;
  marketTiming: string;
  newsContext: string;
  whatThisMeans: string;
};

export type ReportPayload = {
  ticker: string;
  companyName: string;
  price: string;
  dayChange: string;
  analyzedAt: string;
  verdict: string;
  sentiment: string;
  confidence: string;
  overview: string;
  summary: string;
  metrics: ReportMetric[];
  peers: string[];
  metricBrief?: string | null;
  insights?: ReportInsightsPayload | null;
  insightsGeneratedAt?: string | null;
};

export type ReportSourceData = {
  provider: "mock" | "claude" | "gemini" | "market-data";
  generatedReason: "cache-miss" | "refresh" | "seed";
  ticker: string;
  aiModel?: string;
  promptVersion?: number;
  marketData?: MarketSnapshot;
  marketDataError?: string;
};
