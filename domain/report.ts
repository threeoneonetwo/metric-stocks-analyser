import type { MarketDataService } from "@/services/marketData/types";

export type GenerateReportInput = {
  ticker: string;
  refresh?: boolean;
};

export async function generateReport(
  input: GenerateReportInput,
  services: { marketData: MarketDataService },
) {
  const marketData = await services.marketData.getSnapshot(input.ticker);

  if (!marketData.ok) {
    return marketData;
  }

  return {
    ok: true as const,
    data: {
      ticker: input.ticker,
      sourceData: marketData.data,
    },
  };
}
