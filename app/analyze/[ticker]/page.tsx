import { ensureReportForTicker } from "@/domain/report-cache";
import { resolveTickerQuery } from "@/domain/ticker-resolver";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getVisitorMetadata } from "@/lib/request-metadata";

type AnalyzePageProps = {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ refresh?: string }>;
};

export default async function AnalyzePage({ params, searchParams }: AnalyzePageProps) {
  const { ticker } = await params;
  const { refresh } = await searchParams;
  const cookieStore = await cookies();
  const hasCompletedOnboarding = cookieStore.get("metric_onboarding")?.value === "complete";

  if (!hasCompletedOnboarding) {
    const requestedPath = `/analyze/${ticker}${refresh ? `?refresh=${encodeURIComponent(refresh)}` : ""}`;
    redirect(`/?onboarding=1&next=${encodeURIComponent(requestedPath)}`);
  }

  const resolved = await resolveTickerQuery(decodeURIComponent(ticker));
  if (!resolved.ok) {
    notFound();
  }

  const normalizedTicker = resolved.data.ticker;
  const headerStore = await headers();
  await ensureReportForTicker(normalizedTicker, {
    refresh: refresh === "1",
    visitor: getVisitorMetadata(headerStore),
  });
  redirect(`/r/${encodeURIComponent(normalizedTicker)}`);
}
