import Link from "next/link";
import { FooterBar, TopBar } from "@/components/site-chrome";
import { getMockReport } from "@/domain/mock-report";
import { normalizeTicker } from "@/lib/utils";

type ReportPageProps = {
  params: Promise<{ ticker: string }>;
};

export default async function ReportPage({ params }: ReportPageProps) {
  const { ticker } = await params;
  const report = getMockReport(normalizeTicker(ticker));

  return (
    <main className="min-h-screen pb-14">
      <TopBar reportActions ticker={report.ticker} />
      <div className="sticky top-14 z-30 border-b border-black bg-metric-cream">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <p className="font-mono text-sm font-semibold">{report.ticker}</p>
            <p className="text-xs text-black/65">{report.companyName}</p>
          </div>
          <div className="text-right font-mono">
            <p className="text-sm">{report.price}</p>
            <p className="text-xs text-metric-green">{report.dayChange}</p>
          </div>
        </div>
      </div>
      <article className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6">
        <ReportSection title="Executive Summary">
          <p className="text-base leading-7">{report.summary}</p>
          <p className="mono-label mt-5">
            Last analyzed {report.analyzedAt} ·{" "}
            <Link href={`/analyze/${report.ticker}`} className="metric-link">
              Refresh
            </Link>
          </p>
        </ReportSection>

        <ReportSection title="Contrarian Signal">
          <span className="inline-flex rounded-full border border-black px-3 py-1 font-mono text-xs uppercase">
            {report.verdict}
          </span>
          <p className="mt-4 leading-7">
            The signal is intentionally neutral in the mock state. Production copy may need final legal review before recommendation like labels are used.
          </p>
        </ReportSection>

        <ReportSection title="Company Overview">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Sector", "Energy"],
              ["Market Cap", "₹19.4T"],
              ["52W Range", "₹2,220 to ₹3,024"],
            ].map(([label, value]) => (
              <div key={label} className="border border-black bg-white p-4">
                <p className="mono-label">{label}</p>
                <p className="mt-2 font-mono text-sm">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 leading-7">{report.overview}</p>
        </ReportSection>

        <ReportSection title="Financials">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {report.metrics.map(([label, value, yoy, median]) => (
              <div key={label} className="border border-black bg-white p-4">
                <p className="mono-label">{label}</p>
                <p className="mt-3 font-mono text-2xl">{value}</p>
                <p className="mt-3 font-mono text-xs">
                  YoY <span className={yoy.startsWith("-") ? "text-metric-red" : "text-metric-green"}>{yoy}</span>
                </p>
                <p className="mt-1 font-mono text-xs text-black/60">Sector median {median}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 leading-7">
            AI insight placeholder, this will summarize what changed, what is unusual versus sector medians, and what deserves deeper review.
          </p>
        </ReportSection>

        <ReportSection title="Peer Comparison">
          <div className="overflow-x-auto border border-black bg-white">
            <table className="min-w-[640px] w-full border-collapse font-mono text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 border-b border-r border-black bg-white p-3 text-left">Metric</th>
                  {report.peers.map((peer) => (
                    <th key={peer} className="border-b border-r border-black p-3 text-left last:border-r-0">
                      {peer}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {["P/E", "ROE", "Op Margin", "Revenue Growth"].map((metric) => (
                  <tr key={metric}>
                    <td className="sticky left-0 border-r border-t border-black bg-white p-3">{metric}</td>
                    {report.peers.map((peer, index) => (
                      <td key={peer} className={index === 0 ? "border-r border-t border-black p-3 text-metric-green" : "border-r border-t border-black p-3 last:border-r-0"}>
                        {index === 0 ? "Better" : "Median"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportSection>

        <ReportSection title="Sentiment">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-black px-3 py-1 font-mono text-xs uppercase">{report.sentiment}</span>
            <span className="font-mono text-xs">Confidence {report.confidence}</span>
          </div>
          <div className="mt-5 grid gap-3">
            {["Moneycontrol", "Economic Times", "Business Standard"].map((source) => (
              <div key={source} className="flex items-center justify-between border border-black bg-white p-3">
                <span>{source} placeholder headline</span>
                <span className="font-mono text-xs uppercase text-black/60">Neutral</span>
              </div>
            ))}
          </div>
        </ReportSection>

        <ReportSection title="Top Risks">
          <div className="grid gap-3 md:grid-cols-3">
            {["Valuation", "Execution", "Regulatory"].map((risk) => (
              <div key={risk} className="border border-black bg-white p-4">
                <p className="mono-label">{risk}</p>
                <h3 className="mt-3 font-medium">Placeholder risk card</h3>
                <p className="mt-3 text-sm leading-6">Grounded risk descriptions will be generated from source data and cited news.</p>
                <p className="mono-label mt-4 text-black/60">Triggered by source data</p>
              </div>
            ))}
          </div>
        </ReportSection>

        <section className="surface rounded-lg p-5 sm:p-6">
          <h2 className="font-serif text-3xl">Share this research snapshot.</h2>
          <button className="mt-5 rounded bg-black px-5 py-3 font-mono text-xs uppercase text-metric-yellow">
            Share report
          </button>
        </section>
      </article>
      <FooterBar />
    </main>
  );
}

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface rounded-lg p-5 sm:p-6">
      <h2 className="mb-5 font-serif text-3xl leading-none sm:text-4xl">{title}</h2>
      {children}
    </section>
  );
}
