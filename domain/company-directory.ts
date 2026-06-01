import type { MarketSymbol } from "@/services/marketData/types";
import { normalizeTicker } from "@/lib/utils";
import { getKnownIsin } from "./isin-directory";

type CompanyAlias = {
  ticker: string;
  symbol?: string;
  companyName: string;
  aliases: string[];
  sector?: string;
  industry?: string;
};

const companies: CompanyAlias[] = [
  {
    ticker: "RELIANCE",
    companyName: "Reliance Industries Limited",
    aliases: ["reliance", "reliance industries", "reliance industries limited", "ril"],
    sector: "Energy",
    industry: "Oil & Gas Refining & Marketing",
  },
  {
    ticker: "TCS",
    companyName: "Tata Consultancy Services Limited",
    aliases: ["tcs", "tata consultancy services", "tata consultancy services limited"],
    sector: "Technology",
    industry: "Information Technology Services",
  },
  {
    ticker: "HDFCBANK",
    companyName: "HDFC Bank Limited",
    aliases: ["hdfc", "hdfc bank", "hdfc bank limited", "housing development finance bank"],
    sector: "Financial Services",
    industry: "Banks",
  },
  {
    ticker: "ICICIBANK",
    companyName: "ICICI Bank Limited",
    aliases: ["icici", "icici bank", "icici bank limited", "icici bankl"],
    sector: "Financial Services",
    industry: "Banks",
  },
  {
    ticker: "SBIN",
    companyName: "State Bank of India",
    aliases: ["sbi", "state bank", "state bank of india", "state bank india"],
    sector: "Financial Services",
    industry: "Banks",
  },
  {
    ticker: "KOTAKBANK",
    companyName: "Kotak Mahindra Bank Limited",
    aliases: ["kotak", "kotak bank", "kotak mahindra bank", "kotak mahindra bank limited"],
    sector: "Financial Services",
    industry: "Banks",
  },
  {
    ticker: "AXISBANK",
    companyName: "Axis Bank Limited",
    aliases: ["axis", "axis bank", "axis bank limited"],
    sector: "Financial Services",
    industry: "Banks",
  },
  {
    ticker: "INFY",
    companyName: "Infosys Limited",
    aliases: ["infy", "infosys", "infosys limited"],
    sector: "Technology",
    industry: "Information Technology Services",
  },
  {
    ticker: "WIPRO",
    companyName: "Wipro Limited",
    aliases: ["wipro", "wipro limited"],
    sector: "Technology",
    industry: "Information Technology Services",
  },
  {
    ticker: "HCLTECH",
    companyName: "HCL Technologies Limited",
    aliases: ["hcl", "hcl tech", "hcl technologies", "hcl technologies limited"],
    sector: "Technology",
    industry: "Information Technology Services",
  },
  {
    ticker: "BHARTIARTL",
    companyName: "Bharti Airtel Limited",
    aliases: ["airtel", "bharti airtel", "bharti airtel limited", "bhartiartl"],
    sector: "Communication Services",
    industry: "Telecom Services",
  },
  {
    ticker: "TATAMOTORS",
    symbol: "TMCV.NS",
    companyName: "Tata Motors Limited",
    aliases: ["tata motors", "tata motor", "tata motors limited", "tatamotors"],
    sector: "Consumer Cyclical",
    industry: "Auto Manufacturers",
  },
  {
    ticker: "HYUNDAI",
    companyName: "Hyundai Motor India Limited",
    aliases: ["hyundai", "hyundai motor", "hyundai motors", "hyundai india", "hyundai motor india", "hyundai motor india limited"],
    sector: "Consumer Cyclical",
    industry: "Auto Manufacturers",
  },
  {
    ticker: "MARUTI",
    companyName: "Maruti Suzuki India Limited",
    aliases: ["maruti", "maruti suzuki", "maruti suzuki india", "maruti suzuki india limited"],
    sector: "Consumer Cyclical",
    industry: "Auto Manufacturers",
  },
  {
    ticker: "M&M",
    companyName: "Mahindra & Mahindra Limited",
    aliases: ["mahindra", "mahindra and mahindra", "mahindra & mahindra", "m&m"],
    sector: "Consumer Cyclical",
    industry: "Auto Manufacturers",
  },
  {
    ticker: "ZOMATO",
    companyName: "Zomato Limited",
    aliases: ["zomato", "zomato limited"],
    sector: "Consumer Cyclical",
    industry: "Internet Retail",
  },
  {
    ticker: "TITAN",
    companyName: "Titan Company Limited",
    aliases: ["titan", "titan company", "titan company limited"],
    sector: "Consumer Cyclical",
    industry: "Luxury Goods",
  },
  {
    ticker: "ITC",
    companyName: "ITC Limited",
    aliases: ["itc", "itc limited"],
    sector: "Consumer Defensive",
    industry: "Tobacco",
  },
  {
    ticker: "LT",
    companyName: "Larsen & Toubro Limited",
    aliases: ["lt", "l&t", "larsen", "larsen toubro", "larsen and toubro"],
    sector: "Industrials",
    industry: "Engineering & Construction",
  },
];

export function resolveKnownCompany(query: string): MarketSymbol | null {
  const normalizedQuery = normalizeCompanyQuery(query);
  const tickerQuery = normalizeTicker(query);

  const exact = companies.find(
    (company) =>
      normalizeTicker(company.ticker) === tickerQuery ||
      company.aliases.some((alias) => normalizeCompanyQuery(alias) === normalizedQuery),
  );
  if (exact) {
    return toMarketSymbol(exact);
  }

  const fuzzy = companies
    .flatMap((company) =>
      company.aliases.map((alias) => ({
        company,
        distance: levenshtein(normalizedQuery, normalizeCompanyQuery(alias)),
      })),
    )
    .sort((a, b) => a.distance - b.distance)[0];

  if (fuzzy && fuzzy.distance <= Math.max(1, Math.floor(normalizedQuery.length * 0.18))) {
    return toMarketSymbol(fuzzy.company);
  }

  return null;
}

export function searchKnownCompanies(query: string, limit = 8): MarketSymbol[] {
  const normalizedQuery = normalizeCompanyQuery(query);
  const tickerQuery = normalizeTicker(query);

  if (!normalizedQuery && !tickerQuery) {
    return [];
  }

  return companies
    .map((company) => {
      const normalizedTicker = normalizeTicker(company.ticker);
      const normalizedName = normalizeCompanyQuery(company.companyName);
      const aliases = company.aliases.map(normalizeCompanyQuery);
      const exact =
        normalizedTicker === tickerQuery ||
        normalizedName === normalizedQuery ||
        aliases.some((alias) => alias === normalizedQuery);
      const startsWith =
        normalizedTicker.startsWith(tickerQuery) ||
        normalizedName.startsWith(normalizedQuery) ||
        aliases.some((alias) => alias.startsWith(normalizedQuery));
      const includes =
        normalizedName.includes(normalizedQuery) ||
        aliases.some((alias) => alias.includes(normalizedQuery));
      const nearestDistance = Math.min(
        levenshtein(normalizedQuery, normalizedName),
        ...aliases.map((alias) => levenshtein(normalizedQuery, alias)),
      );

      let score = 0;
      if (exact) score += 100;
      if (startsWith) score += 60;
      if (includes) score += 30;
      if (nearestDistance <= Math.max(1, Math.floor(normalizedQuery.length * 0.2))) {
        score += 20 - nearestDistance;
      }

      return { company, score };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((result) => toMarketSymbol(result.company));
}

function toMarketSymbol(company: CompanyAlias): MarketSymbol {
  return {
    ticker: normalizeTicker(company.ticker),
    symbol: company.symbol ?? `${normalizeTicker(company.ticker)}.NS`,
    companyName: company.companyName,
    exchange: "NSE",
    sector: company.sector ?? null,
    industry: company.industry ?? null,
    isin: getKnownIsin(company.ticker),
  };
}

function normalizeCompanyQuery(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bltd\b|\blimited\b|\bcompany\b|\bco\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function levenshtein(left: string, right: string) {
  const rows = Array.from({ length: left.length + 1 }, (_, index) => [index]);
  for (let index = 1; index <= right.length; index += 1) {
    rows[0][index] = index;
  }

  for (let row = 1; row <= left.length; row += 1) {
    for (let col = 1; col <= right.length; col += 1) {
      rows[row][col] =
        left[row - 1] === right[col - 1]
          ? rows[row - 1][col - 1]
          : Math.min(rows[row - 1][col - 1], rows[row][col - 1], rows[row - 1][col]) + 1;
    }
  }

  return rows[left.length][right.length];
}
