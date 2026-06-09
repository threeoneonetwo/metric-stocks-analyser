import { normalizeTicker } from "@/lib/utils";

const competitorMap: Record<string, [string, string]> = {
  // Energy
  RELIANCE: ["ONGC", "IOC"],
  ONGC: ["RELIANCE", "IOC"],
  IOC: ["ONGC", "BPCL"],
  BPCL: ["IOC", "HPCL"],
  HPCL: ["BPCL", "IOC"],

  // IT
  TCS: ["INFY", "HCLTECH"],
  INFY: ["TCS", "HCLTECH"],
  HCLTECH: ["TCS", "INFY"],
  WIPRO: ["INFY", "HCLTECH"],
  TECHM: ["WIPRO", "HCLTECH"],
  LTIM: ["TCS", "INFY"],
  MPHASIS: ["LTIM", "WIPRO"],
  PERSISTENT: ["LTIM", "MPHASIS"],
  COFORGE: ["PERSISTENT", "LTIM"],

  // Banks
  HDFCBANK: ["ICICIBANK", "KOTAKBANK"],
  ICICIBANK: ["HDFCBANK", "AXISBANK"],
  SBIN: ["HDFCBANK", "ICICIBANK"],
  KOTAKBANK: ["HDFCBANK", "ICICIBANK"],
  AXISBANK: ["ICICIBANK", "HDFCBANK"],
  INDUSINDBK: ["AXISBANK", "FEDERALBNK"],
  FEDERALBNK: ["INDUSINDBK", "AXISBANK"],
  BANDHANBNK: ["INDUSINDBK", "FEDERALBNK"],
  YESBANK: ["INDUSINDBK", "FEDERALBNK"],
  IDFCFIRSTB: ["INDUSINDBK", "FEDERALBNK"],

  // NBFCs / Fintech
  BAJFINANCE: ["CHOLAFIN", "MUTHOOTFIN"],
  BAJAJFINSV: ["BAJFINANCE", "CHOLAFIN"],
  CHOLAFIN: ["BAJFINANCE", "MUTHOOTFIN"],
  MUTHOOTFIN: ["MANAPPURAM", "CHOLAFIN"],
  MANAPPURAM: ["MUTHOOTFIN", "CHOLAFIN"],

  // Telecom
  BHARTIARTL: ["IDEA", "TTML"],
  IDEA: ["BHARTIARTL", "TTML"],

  // Auto
  TATAMOTORS: ["MARUTI", "M&M"],
  TMCV: ["MARUTI", "M&M"],
  MARUTI: ["TATAMOTORS", "M&M"],
  "M&M": ["TATAMOTORS", "MARUTI"],
  BAJAJ_AUTO: ["HEROMOTOCO", "TVSMOTORS"],
  HEROMOTOCO: ["BAJAJ-AUTO", "TVSMOTORS"],
  TVSMOTORS: ["HEROMOTOCO", "BAJAJ-AUTO"],
  EICHERMOT: ["BAJAJ-AUTO", "TVSMOTORS"],
  HYUNDAI: ["MARUTI", "TATAMOTORS"],

  // Consumer / FMCG
  HINDUNILVR: ["ITC", "NESTLEIND"],
  ITC: ["HINDUNILVR", "NESTLEIND"],
  NESTLEIND: ["HINDUNILVR", "BRITANNIA"],
  BRITANNIA: ["NESTLEIND", "HINDUNILVR"],
  MARICO: ["HINDUNILVR", "DABUR"],
  DABUR: ["MARICO", "HINDUNILVR"],
  GODREJCP: ["HINDUNILVR", "MARICO"],
  COLPAL: ["HINDUNILVR", "DABUR"],
  EMAMILTD: ["MARICO", "DABUR"],
  VBL: ["BRITANNIA", "MARICO"],

  // Beverages / Food
  ETERNAL: ["SWIGGY", "NYKAA"],
  ZOMATO: ["SWIGGY", "NYKAA"],
  SWIGGY: ["ETERNAL", "NYKAA"],

  // Retail / Lifestyle
  TITAN: ["KALYANKJIL", "TRENT"],
  TRENT: ["TITAN", "ABFRL"],
  ABFRL: ["TRENT", "PAGEIND"],
  KALYANKJIL: ["TITAN", "THANGAMAYL"],
  NYKAA: ["MARICO", "GODREJCP"],
  DMART: ["TRENT", "VMART"],

  // Pharma
  SUNPHARMA: ["DRREDDY", "CIPLA"],
  DRREDDY: ["SUNPHARMA", "CIPLA"],
  CIPLA: ["SUNPHARMA", "DRREDDY"],
  DIVISLAB: ["SUNPHARMA", "DRREDDY"],
  AUROPHARMA: ["CIPLA", "DRREDDY"],
  LUPIN: ["CIPLA", "SUNPHARMA"],
  BIOCON: ["SUNPHARMA", "CIPLA"],
  ALKEM: ["LUPIN", "CIPLA"],
  TORNTPHARM: ["CIPLA", "LUPIN"],

  // Cement
  ULTRACEMCO: ["AMBUJACEM", "ACC"],
  AMBUJACEM: ["ULTRACEMCO", "ACC"],
  ACC: ["AMBUJACEM", "ULTRACEMCO"],
  SHREECEM: ["ULTRACEMCO", "AMBUJACEM"],
  RAMCOCEM: ["SHREECEM", "ACC"],

  // Steel / Metals
  TATASTEEL: ["JSWSTEEL", "SAIL"],
  JSWSTEEL: ["TATASTEEL", "SAIL"],
  SAIL: ["TATASTEEL", "JSWSTEEL"],
  HINDALCO: ["NALCO", "VEDL"],
  VEDL: ["HINDALCO", "NALCO"],
  NATIONALUM: ["HINDALCO", "VEDL"],

  // Capital Goods / Infra
  LT: ["SIEMENS", "ABB"],
  SIEMENS: ["LT", "ABB"],
  ABB: ["SIEMENS", "LT"],
  BHEL: ["LT", "SIEMENS"],
  ADANIPORTS: ["CONCOR", "GATEWAY"],

  // Insurance
  HDFCLIFE: ["SBILIFE", "ICICIPRU"],
  SBILIFE: ["HDFCLIFE", "ICICIPRU"],
  ICICIPRU: ["HDFCLIFE", "SBILIFE"],
  LICI: ["HDFCLIFE", "SBILIFE"],

  // Real Estate
  DLF: ["GODREJPROP", "OBEROIRLTY"],
  GODREJPROP: ["DLF", "OBEROIRLTY"],
  OBEROIRLTY: ["DLF", "GODREJPROP"],
  PRESTIGE: ["DLF", "GODREJPROP"],

  // Power
  NTPC: ["POWERGRID", "TATAPOWER"],
  POWERGRID: ["NTPC", "TATAPOWER"],
  TATAPOWER: ["NTPC", "ADANIGREEN"],
  ADANIGREEN: ["TATAPOWER", "NTPC"],
  ADANIENSOL: ["ADANIGREEN", "TATAPOWER"],
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
