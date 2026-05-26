import Link from "next/link";
import { AlertTriangle, Bolt, RefreshCw, Share2, TrendingDown } from "lucide-react";
import { FooterBar, TopBar } from "@/components/site-chrome";
import { getReportForTicker } from "@/domain/report-cache";
import { normalizeTicker } from "@/lib/utils";

type ReportPageProps = {
  params: Promise<{ ticker: string }>;
};

export default async function ReportPage({ params }: ReportPageProps) {
  const { ticker } = await params;
  const report = await getReportForTicker(normalizeTicker(ticker));

  return (
    <main className="flex min-h-screen flex-col">
      <TopBar reportActions ticker={report.ticker} />
      <div className="sticky top-[68px] z-40 border-b-4 border-black bg-white px-4 py-2">
        <div className="mx-auto flex max-w-[42rem] items-center justify-between gap-4">
          <div>
            <p className="font-mono text-2xl font-bold uppercase leading-none">
              {report.ticker}
            </p>
            <p className="font-mono text-xs uppercase tracking-[0.08em] text-metric-muted">
              {report.companyName}
            </p>
          </div>
          <div className="text-right font-mono">
            <p className="text-2xl font-bold text-metric-green">{report.price}</p>
            <p className="text-xs font-bold text-metric-green">{report.dayChange}</p>
          </div>
        </div>
      </div>

      <article className="mx-auto flex w-full max-w-[42rem] flex-1 flex-col gap-10 px-4 py-10 sm:px-6">
        <ReportSection title="Executive Summary" accent>
          <p className="text-base leading-7">{report.summary}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t-2 border-black/10 pt-4">
            <span className="font-mono text-xs uppercase tracking-[0.08em] text-metric-muted">
              Last analyzed: {report.analyzedAt}
            </span>
            <Link
              href={`/analyze/${report.ticker}?refresh=1`}
              className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.08em] text-metric-green underline decoration-2 underline-offset-4"
            >
              <RefreshCw size={14} /> Refresh data
            </Link>
          </div>
        </ReportSection>

        <section className="surface p-4">
          <h2 className="mb-4 flex items-center gap-2 font-mono text-2xl font-bold uppercase leading-none">
            <span className="h-4 w-4 bg-black" />
            Price Action (1M)
          </h2>
          <div className="relative h-48 w-full">
            <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 100">
              <line stroke="#e2e2e2" strokeWidth="1" x1="0" x2="400" y1="20" y2="20" />
              <line stroke="#e2e2e2" strokeWidth="1" x1="0" x2="400" y1="50" y2="50" />
              <line stroke="#e2e2e2" strokeWidth="1" x1="0" x2="400" y1="80" y2="80" />
              <path d="M0,80 Q50,60 100,75 T200,45 T300,55 T400,25 V100 H0 Z" fill="rgba(0,108,70,0.12)" />
              <path d="M0,80 Q50,60 100,75 T200,45 T300,55 T400,25" fill="none" stroke="#006c46" strokeWidth="3" />
            </svg>
            <div className="absolute right-2 top-2 bg-black px-2 py-1 font-mono text-xs font-bold text-metric-yellow neo-shadow-sm">
              {report.price}
            </div>
          </div>
        </section>

        <section className="grid overflow-hidden border-4 border-black neo-shadow">
          <div className="flex items-center justify-center border-b-4 border-black bg-metric-finance-accent p-6">
            <h2 className="text-center font-mono text-3xl font-bold uppercase leading-none">
              {report.verdict}
            </h2>
          </div>
          <div className="bg-white p-6">
            <p className="text-base italic leading-7">
              Current market valuations fail to account for the strategic bridge
              between distribution, data, and capital allocation. Short-term
              volatility can obscure the operating leverage visible in peer context.
            </p>
          </div>
        </section>

        <section>
          <SectionHeading title="Company Overview" />
          <div className="mb-4 grid grid-cols-2 gap-2">
            {[
              ["Sector", "Energy / Retail"],
              ["Market Cap", "₹19.4T"],
            ].map(([label, value]) => (
              <div key={label} className="border-2 border-black bg-white p-3 neo-shadow-sm">
                <p className="font-mono text-xs uppercase tracking-[0.08em] text-metric-muted">
                  {label}
                </p>
                <p className="mt-1 font-mono text-sm font-bold uppercase">{value}</p>
              </div>
            ))}
            <div className="col-span-2 border-2 border-black bg-white p-3 neo-shadow-sm">
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-metric-muted">
                52W Range
              </p>
              <div className="mt-2 flex items-center justify-between gap-4">
                <span className="font-mono text-xs">₹2,220</span>
                <div className="relative h-2 flex-1 border border-black bg-metric-surface-variant">
                  <div className="absolute right-6 top-1/2 h-4 w-3 -translate-y-1/2 bg-black" />
                </div>
                <span className="font-mono text-xs font-bold">₹3,024</span>
              </div>
            </div>
          </div>
          <div className="border-4 border-black bg-black p-4 text-white neo-shadow">
            <p className="leading-7">{report.overview}</p>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <SectionHeading title="Financials" />
            <span className="font-mono text-xs uppercase text-metric-muted">
              Values in INR CR
            </span>
          </div>
          <div className="grid gap-2">
            {report.metrics.map(([label, value, yoy, median]) => (
              <div key={label} className="border-2 border-black bg-white p-4 neo-shadow-sm">
                <p className="mb-2 font-mono text-xs uppercase tracking-[0.08em] text-metric-muted">
                  {label}
                </p>
                <p className="font-mono text-2xl font-bold">{value}</p>
                <div className="mt-4 flex justify-between border-t border-black/10 pt-2 font-mono text-xs">
                  <span className={yoy.startsWith("-") ? "text-metric-red" : "text-metric-green"}>
                    YoY {yoy}
                  </span>
                  <span className="text-metric-muted">Median {median}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-2 border-dashed border-black bg-metric-green-bright/25 p-3">
            <p className="text-sm leading-6">
              <strong>AI INSIGHT:</strong> Operating margin and growth deltas are
              framed against sector medians to surface what deserves deeper review.
            </p>
          </div>
        </section>

        <ReportTable peers={report.peers} />

        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <SectionHeading title="Sentiment" />
            <span className="font-mono text-xs uppercase text-metric-muted">
              Confidence {report.confidence}
            </span>
          </div>
          <div className="surface p-4">
            <div className="mb-6 flex items-center gap-4">
              <span className="border-2 border-black bg-metric-green-bright px-4 py-1 font-mono text-sm font-bold uppercase">
                {report.sentiment}
              </span>
              <div className="flex h-8 flex-1 overflow-hidden border-2 border-black">
                <div className="w-[82%] border-r-2 border-black bg-metric-green-bright" />
                <div className="w-[18%] bg-metric-pink" />
              </div>
            </div>
            <div className="grid gap-2">
              {["Moneycontrol", "Economic Times", "Business Standard"].map((source, index) => (
                <div key={source} className="flex items-start justify-between gap-4 border-b-2 border-black/10 p-2 last:border-b-0">
                  <div>
                    <p className="font-bold">{source} placeholder headline</p>
                    <p className="font-mono text-xs uppercase text-metric-muted">
                      Last 30 days | 142 articles
                    </p>
                  </div>
                  <span className={`px-2 py-1 font-mono text-[10px] font-bold uppercase text-white ${index === 2 ? "bg-metric-red" : "bg-metric-green"}`}>
                    {index === 2 ? "Caution" : "Positive"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <SectionHeading title="Top Risks" />
          <div className="mt-4 grid gap-4">
            {[
              [AlertTriangle, "High Impact - Regulatory", "Sudden policy shifts or antitrust scrutiny could disrupt earnings visibility.", "bg-metric-red"],
              [TrendingDown, "Medium Impact - Global Oil", "Geopolitical tension and GRM pressure can impact the core O2C cash engine.", "bg-metric-pink"],
              [Bolt, "Low Impact - Consumer Shift", "Cleaner-fuel adoption may change demand curves faster than legacy forecasts.", "bg-metric-green"],
            ].map(([Icon, title, copy, stripe]) => (
              <div key={title as string} className="relative overflow-hidden border-2 border-black bg-white p-4 neo-shadow-sm">
                <div className={`absolute right-0 top-0 h-full w-2 ${stripe as string}`} />
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="text-black" size={20} strokeWidth={2.2} />
                  <h3 className="font-mono text-sm font-bold uppercase">{title as string}</h3>
                </div>
                <p className="text-sm leading-6">{copy as string}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-4 border-black bg-black p-10 text-center text-white neo-shadow">
          <h2 className="mb-6 font-serif text-3xl font-bold">
            Found value in this analysis?
          </h2>
          <button className="neo-press inline-flex items-center gap-2 border-4 border-black bg-metric-green-bright px-8 py-4 font-mono text-sm font-bold uppercase tracking-[0.05em] text-black neo-shadow">
            <Share2 size={18} /> Share Report
          </button>
        </section>
      </article>
      <FooterBar />
    </main>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="flex items-center gap-2 font-mono text-2xl font-bold uppercase leading-none">
      <span className="h-4 w-4 bg-black" />
      {title}
    </h2>
  );
}

function ReportSection({
  title,
  children,
  accent = false,
}: {
  title: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <section className="surface relative p-4">
      {accent ? (
        <div className="absolute -right-4 -top-4 flex h-12 w-12 items-center justify-center border-4 border-black bg-metric-green-bright">
          <Bolt size={22} />
        </div>
      ) : null}
      <span className="mb-4 inline-block bg-black px-2 py-1 font-mono text-xs font-bold uppercase tracking-[0.08em] text-metric-yellow">
        {title}
      </span>
      {children}
    </section>
  );
}

function ReportTable({ peers }: { peers: string[] }) {
  return (
    <section>
      <SectionHeading title="Peer Comparison" />
      <div className="mt-4 overflow-x-auto border-4 border-black bg-white neo-shadow">
        <table className="w-full min-w-[640px] border-collapse text-left font-mono text-sm">
          <thead>
            <tr className="border-b-4 border-black">
              <th className="sticky left-0 border-r-4 border-black bg-metric-surface-variant p-4 text-xs uppercase">
                Metric
              </th>
              {peers.map((peer, index) => (
                <th
                  key={peer}
                  className={`border-r-2 border-black p-4 text-xs uppercase last:border-r-0 ${index === 0 ? "bg-metric-green-bright" : "bg-white"}`}
                >
                  {peer}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {["M.Cap (₹T)", "Div Yld %", "Beta", "P/B Ratio"].map((metric, rowIndex) => (
              <tr key={metric} className="border-b-2 border-black last:border-b-0">
                <td className="sticky left-0 border-r-4 border-black bg-metric-surface-variant p-4 font-bold">
                  {metric}
                </td>
                {peers.map((peer, index) => (
                  <td
                    key={`${peer}-${metric}`}
                    className={`border-r-2 border-black p-4 last:border-r-0 ${index === 0 ? "bg-metric-green-bright/25 font-bold" : rowIndex === 1 && index === 1 ? "bg-metric-pink text-metric-red" : ""}`}
                  >
                    {index === 0 ? ["19.8", "0.34", "0.88", "2.4"][rowIndex] : "Median"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
