import { FooterBar, TopBar } from "@/components/site-chrome";
import { normalizeTicker } from "@/lib/utils";
import { LoadingView } from "./loading-view";

type AnalyzePageProps = {
  params: Promise<{ ticker: string }>;
};

export default async function AnalyzePage({ params }: AnalyzePageProps) {
  const { ticker } = await params;
  const normalizedTicker = normalizeTicker(ticker);

  return (
    <main className="min-h-screen pb-14">
      <TopBar />
      <LoadingView ticker={normalizedTicker} />
      <FooterBar />
    </main>
  );
}
