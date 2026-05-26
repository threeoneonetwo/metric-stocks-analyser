import { FooterBar, TopBar } from "@/components/site-chrome";
import { ensureReportForTicker } from "@/domain/report-cache";
import { resolveTickerQuery } from "@/domain/ticker-resolver";
import { normalizeTicker } from "@/lib/utils";
import { LoadingView } from "./loading-view";

type AnalyzePageProps = {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ refresh?: string }>;
};

export default async function AnalyzePage({ params, searchParams }: AnalyzePageProps) {
  const { ticker } = await params;
  const { refresh } = await searchParams;
  const resolved = await resolveTickerQuery(decodeURIComponent(ticker));
  const normalizedTicker = resolved.ok ? resolved.data.ticker : normalizeTicker(ticker);
  const displayName = resolved.ok ? resolved.data.companyName : normalizedTicker;
  await ensureReportForTicker(normalizedTicker, { refresh: refresh === "1" });

  return (
    <main className="min-h-screen pb-14">
      <TopBar />
      <LoadingView ticker={normalizedTicker} companyName={displayName} />
      <FooterBar />
    </main>
  );
}
