import { getKnownIsin } from "@/domain/isin-directory";
import { normalizeTicker } from "@/lib/utils";
import type { Result } from "@/services/result";

const UPSTOX_BASE_URL = "https://api.upstox.com/v2";

type UpstoxKeyRatiosResponse = {
  status?: string;
  data?: Array<{
    name?: string;
    company_value?: string;
    sector_value?: string;
  }>;
};

type UpstoxInstrumentSearchResponse = {
  status?: string;
  data?: Array<{
    isin?: string;
    trading_symbol?: string;
    instrument_type?: string;
    exchange?: string;
    name?: string;
    short_name?: string;
  }>;
};

export type UpstoxFundamentalMetric = {
  label: string;
  value: string;
  median: string;
};

export type UpstoxFundamentals = {
  isin: string;
  metrics: UpstoxFundamentalMetric[];
};

export function hasUpstoxConfig() {
  return Boolean(process.env.UPSTOX_ACCESS_TOKEN);
}

export async function getUpstoxFundamentalsForTicker(ticker: string): Promise<Result<UpstoxFundamentals>> {
  if (!hasUpstoxConfig()) {
    return {
      ok: false,
      code: "CONFIG",
      error: "Upstox access token is not configured.",
    };
  }

  const isin = getKnownIsin(ticker) ?? (await resolveIsinFromUpstox(ticker));
  if (!isin) {
    return {
      ok: false,
      code: "NOT_FOUND",
      error: `No ISIN found for ${ticker}.`,
    };
  }

  const ratios = await getUpstoxJson<UpstoxKeyRatiosResponse>(
    `${UPSTOX_BASE_URL}/fundamentals/${encodeURIComponent(isin)}/key-ratios`,
  );
  if (!ratios.ok) {
    return ratios;
  }

  const metrics = (ratios.data.data ?? [])
    .map((ratio) => ({
      label: normalizeRatioLabel(ratio.name),
      value: cleanRatioValue(ratio.company_value),
      median: cleanRatioValue(ratio.sector_value),
    }))
    .filter((metric) => metric.label && metric.value !== "N/A");

  if (!metrics.length) {
    return {
      ok: false,
      code: "UPSTREAM",
      error: `Upstox returned no key ratios for ${ticker}.`,
    };
  }

  return {
    ok: true,
    data: {
      isin,
      metrics,
    },
  };
}

async function resolveIsinFromUpstox(ticker: string) {
  const search = await getUpstoxJson<UpstoxInstrumentSearchResponse>(
    `${UPSTOX_BASE_URL}/instruments/search?query=${encodeURIComponent(ticker)}&segment=EQ&exchange=NSE`,
  );
  if (!search.ok) {
    return null;
  }

  const normalized = normalizeTicker(ticker);
  const match = (search.data.data ?? []).find(
    (instrument) =>
      instrument.instrument_type === "EQ" &&
      instrument.exchange === "NSE" &&
      normalizeTicker(instrument.trading_symbol ?? "") === normalized &&
      instrument.isin,
  );

  return match?.isin ?? null;
}

async function getUpstoxJson<T>(url: string): Promise<Result<T>> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${process.env.UPSTOX_ACCESS_TOKEN}`,
      },
      cache: "no-store",
    });
    const payload = (await response.json()) as T;

    if (!response.ok) {
      return {
        ok: false,
        code: response.status === 404 ? "NOT_FOUND" : response.status === 401 ? "CONFIG" : "UPSTREAM",
        error: `Upstox fundamentals request failed with HTTP ${response.status}.`,
      };
    }

    return { ok: true, data: payload };
  } catch (error) {
    return {
      ok: false,
      code: "UPSTREAM",
      error: error instanceof Error ? error.message : "Upstox fundamentals request failed.",
    };
  }
}

function normalizeRatioLabel(name: string | undefined) {
  if (!name) {
    return "";
  }

  if (name === "P/E") return "P/E Ratio";
  if (name === "P/B") return "P/B Ratio";
  return name;
}

function cleanRatioValue(value: string | undefined) {
  const cleaned = value?.trim();
  return cleaned || "N/A";
}
