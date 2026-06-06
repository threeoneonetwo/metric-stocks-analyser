import type { Result } from "@/services/result";
import type { UpstoxFundamentals } from "./upstox";

const FMP_BASE_URL = "https://financialmodelingprep.com/stable";

type FmpRatios = {
  symbol?: string;
  peRatioTTM?: number | null;
  priceToBookRatioTTM?: number | null;
  enterpriseValueMultipleTTM?: number | null;
  returnOnEquityTTM?: number | null;
  returnOnAssetsTTM?: number | null;
  netProfitMarginTTM?: number | null;
  grossProfitMarginTTM?: number | null;
  operatingProfitMarginTTM?: number | null;
  revenueGrowthTTM?: number | null;
  debtEquityRatioTTM?: number | null;
  currentRatioTTM?: number | null;
  quickRatioTTM?: number | null;
  dividendYieldTTM?: number | null;
  freeCashFlowPerShareTTM?: number | null;
};

export function hasFmpConfig() {
  return Boolean(process.env.FMP_API_KEY);
}

export async function getFmpFundamentalsForTicker(ticker: string): Promise<Result<UpstoxFundamentals>> {
  if (!hasFmpConfig()) {
    return { ok: false, code: "CONFIG", error: "FMP_API_KEY is not configured." };
  }

  const symbol = `${ticker}.NS`;
  const url = `${FMP_BASE_URL}/ratios?symbol=${encodeURIComponent(symbol)}&apikey=${process.env.FMP_API_KEY}`;

  let ratios: FmpRatios | null = null;
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return { ok: false, code: "UPSTREAM", error: `FMP returned HTTP ${response.status} for ${ticker}.` };
    }
    const payload = (await response.json()) as FmpRatios[] | FmpRatios;
    ratios = Array.isArray(payload) ? (payload[0] ?? null) : payload;
  } catch (error) {
    return { ok: false, code: "UPSTREAM", error: error instanceof Error ? error.message : "FMP request failed." };
  }

  if (!ratios) {
    return { ok: false, code: "NOT_FOUND", error: `FMP has no data for ${ticker}.` };
  }

  const entries: Array<[string, number | null | undefined, boolean]> = [
    ["P/E Ratio", ratios.peRatioTTM, false],
    ["P/B Ratio", ratios.priceToBookRatioTTM, false],
    ["EV/EBITDA", ratios.enterpriseValueMultipleTTM, false],
    ["ROE", ratios.returnOnEquityTTM, true],
    ["ROA", ratios.returnOnAssetsTTM, true],
    ["Net Margin", ratios.netProfitMarginTTM, true],
    ["Gross Margin", ratios.grossProfitMarginTTM, true],
    ["Operating Margin", ratios.operatingProfitMarginTTM, true],
    ["Revenue Growth", ratios.revenueGrowthTTM, true],
    ["Debt/Equity", ratios.debtEquityRatioTTM, false],
    ["Current Ratio", ratios.currentRatioTTM, false],
    ["Quick Ratio", ratios.quickRatioTTM, false],
    ["Dividend Yield", ratios.dividendYieldTTM, true],
  ];

  const metrics = entries
    .filter(([, val]) => val !== null && val !== undefined && Number.isFinite(val))
    .map(([label, val, isPercent]) => ({
      label: label as string,
      value: isPercent
        ? `${((val as number) * 100).toFixed(2)}%`
        : `${(val as number).toFixed(2)}x`,
      median: "N/A",
    }));

  if (!metrics.length) {
    return { ok: false, code: "UPSTREAM", error: `FMP returned no ratio data for ${ticker}.` };
  }

  return { ok: true, data: { isin: symbol, metrics } };
}
