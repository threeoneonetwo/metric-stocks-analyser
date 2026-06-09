import type { MetadataRoute } from "next";
import tickers from "@/data/nse-tickers.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://metricfinance.app";

  const stockPages = (tickers as string[]).map((ticker) => ({
    url: `${base}/r/${ticker}`,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [
    {
      url: base,
      changeFrequency: "daily",
      priority: 1,
    },
    ...stockPages,
  ];
}
