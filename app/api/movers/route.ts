import { NextResponse } from "next/server";
import { yahooMarketData } from "@/services/marketData/yahoo";

const moverCandidates = [
  "RELIANCE",
  "TCS",
  "HDFCBANK",
  "ICICIBANK",
  "SBIN",
  "KOTAKBANK",
  "AXISBANK",
  "INFY",
  "WIPRO",
  "HCLTECH",
  "BHARTIARTL",
  "TATAMOTORS",
  "HYUNDAI",
  "MARUTI",
  "M&M",
  "ZOMATO",
  "TITAN",
  "ITC",
  "LT",
  "ONGC",
  "NTPC",
  "POWERGRID",
  "COALINDIA",
  "BAJFINANCE",
  "HINDUNILVR",
  "ASIANPAINT",
  "ULTRACEMCO",
  "SUNPHARMA",
  "CIPLA",
  "TATASTEEL",
  "JSWSTEEL",
  "GRASIM",
  "NESTLEIND",
];

const fallbackMovers = [
  ["TATAMOTORS", "Tata Motors", 2.45],
  ["BHARTIARTL", "Bharti Airtel", 1.12],
  ["ZOMATO", "Zomato", -0.84],
  ["RELIANCE", "Reliance Industries", 0.78],
  ["HDFCBANK", "HDFC Bank", -0.66],
  ["ICICIBANK", "ICICI Bank", 0.61],
  ["INFY", "Infosys", -0.58],
  ["TCS", "Tata Consultancy Services", 0.51],
  ["MARUTI", "Maruti Suzuki", 0.49],
  ["ITC", "ITC", -0.42],
] as const;

export async function GET() {
  const snapshots = await Promise.allSettled(
    moverCandidates.map(async (ticker) => {
      const snapshot = await yahooMarketData.getSnapshot(ticker);
      if (!snapshot.ok || snapshot.data.dayChangePercent === null) {
        return null;
      }

      return {
        ticker: snapshot.data.ticker,
        companyName: snapshot.data.companyName,
        price: snapshot.data.price,
        changePercent: snapshot.data.dayChangePercent,
        source: snapshot.data.source,
        asOf: snapshot.data.asOf,
      };
    }),
  );

  const movers = snapshots
    .flatMap((result) => (result.status === "fulfilled" && result.value ? [result.value] : []))
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 10);

  return NextResponse.json({
    movers:
      movers.length > 0
        ? movers
        : fallbackMovers.map(([ticker, companyName, changePercent]) => ({
            ticker,
            companyName,
            price: null,
            changePercent,
            source: "fallback",
            asOf: null,
          })),
  });
}
