export type ReportMetric = [label: string, value: string, yoy: string, median: string];

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
};

export type ReportSourceData = {
  provider: "mock" | "gemini" | "market-data";
  generatedReason: "cache-miss" | "refresh" | "seed";
  ticker: string;
};
