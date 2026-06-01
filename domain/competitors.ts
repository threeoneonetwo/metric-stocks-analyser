import { normalizeTicker } from "@/lib/utils";

const competitorMap: Record<string, [string, string]> = {
  RELIANCE: ["ONGC", "IOC"],
  TCS: ["INFY", "HCLTECH"],
  INFY: ["TCS", "HCLTECH"],
  HCLTECH: ["TCS", "INFY"],
  WIPRO: ["INFY", "HCLTECH"],
  HDFCBANK: ["ICICIBANK", "KOTAKBANK"],
  ICICIBANK: ["HDFCBANK", "AXISBANK"],
  SBIN: ["HDFCBANK", "ICICIBANK"],
  KOTAKBANK: ["HDFCBANK", "ICICIBANK"],
  AXISBANK: ["ICICIBANK", "HDFCBANK"],
  BHARTIARTL: ["RELIANCE", "IDEA"],
  TATAMOTORS: ["MARUTI", "M&M"],
  TMCV: ["MARUTI", "M&M"],
  MARUTI: ["TATAMOTORS", "M&M"],
  "M&M": ["TATAMOTORS", "MARUTI"],
  ZOMATO: ["SWIGGY", "NYKAA"],
  TITAN: ["KALYANKJIL", "TRENT"],
  ITC: ["HINDUNILVR", "NESTLEIND"],
  LT: ["SIEMENS", "ABB"],
};

const sectorFallbacks: Record<string, [string, string]> = {
  banks: ["HDFCBANK", "ICICIBANK"],
  "financial services": ["HDFCBANK", "ICICIBANK"],
  technology: ["TCS", "INFY"],
  "information technology services": ["TCS", "INFY"],
  energy: ["RELIANCE", "ONGC"],
  "telecom services": ["BHARTIARTL", "IDEA"],
  "auto manufacturers": ["MARUTI", "M&M"],
  "consumer cyclical": ["TATAMOTORS", "MARUTI"],
  "consumer defensive": ["ITC", "HINDUNILVR"],
  industrials: ["LT", "SIEMENS"],
};

const genericPeerLabels = new Set([
  "TARGET",
  "PEER A",
  "PEER B",
  "PEER C",
  "NIFTY 50",
  "SECTOR MEDIAN",
  "PEER MEDIAN",
]);

export function getPeerComparisonLabels(input: {
  ticker: string;
  sector?: string | null;
  industry?: string | null;
}) {
  const ticker = normalizeTicker(input.ticker);
  const competitors = competitorMap[ticker] ?? findSectorFallback(input.industry) ?? findSectorFallback(input.sector);
  return [ticker, ...(competitors ?? ["NIFTY 50", "Sector Median"])];
}

export function shouldReplacePeerLabels(peers: string[] | undefined) {
  if (!peers?.length) {
    return true;
  }

  return peers.some((peer) => genericPeerLabels.has(peer.toUpperCase()));
}

function findSectorFallback(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return sectorFallbacks[value.trim().toLowerCase()] ?? null;
}
