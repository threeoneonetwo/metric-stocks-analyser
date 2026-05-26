import Link from "next/link";
import { AlertTriangle, Bolt, RefreshCw, Share2, TrendingDown } from "lucide-react";
import { FooterBar, TopBar } from "@/components/site-chrome";
import { getReportViewForTicker } from "@/domain/report-cache";
import { resolveTickerQuery } from "@/domain/ticker-resolver";
import { getMarketDataService } from "@/services/marketData";
import { notFound } from "next/navigation";

type ReportPageProps = {
  params: Promise<{ ticker: string }>;
};

export default async function ReportPage({ params }: ReportPageProps) {
  const { ticker } = await params;
  const resolved = await resolveTickerQuery(decodeURIComponent(ticker));
  if (!resolved.ok) {
    notFound();
  }

  const reportView = await getReportViewForTicker(resolved.data.ticker);
  const report = reportView.payload;
  const marketData =
    reportView.sourceData?.marketData ?? (await getFreshMarketData(report.ticker, resolved.data.symbol));
  const displayPrice =
    marketData?.price !== null && marketData?.price !== undefined ? formatPrice(marketData.price) : report.price;
  const displayDayChange =
    marketData?.dayChangePercent !== null && marketData?.dayChangePercent !== undefined
      ? formatPercent(marketData.dayChangePercent)
      : report.dayChange;

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
            <p className="text-2xl font-bold text-metric-green">{displayPrice}</p>
            <p className="text-xs font-bold text-metric-green">{displayDayChange}</p>
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
            Market Snapshot
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Price", displayPrice],
              ["Day Change", displayDayChange],
              ["Day High", formatPrice(marketData?.dayHigh ?? null)],
              ["Day Low", formatPrice(marketData?.dayLow ?? null)],
              ["Volume", formatNumber(marketData?.volume ?? null)],
              ["Source", marketData?.source ?? "N/A"],
            ].map(([label, value]) => (
              <div key={label} className="border-2 border-black bg-white p-3 neo-shadow-sm">
                <p className="font-mono text-xs uppercase tracking-[0.08em] text-metric-muted">
                  {label}
                </p>
                <p className="mt-1 font-mono text-sm font-bold uppercase">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid overflow-hidden border-4 border-black neo-shadow">
          <div className="flex items-center justify-center border-b-4 border-black bg-metric-finance-accent p-6">
            <h2 className="text-center font-mono text-3xl font-bold uppercase leading-none">
              {report.verdict}
            </h2>
          </div>
          <div className="bg-white p-6">
            <p className="text-base italic leading-7">{report.summary}</p>
          </div>
        </section>

        <section>
          <SectionHeading title="Company Overview" />
          <div className="mb-4 grid grid-cols-2 gap-2">
            {[
              ["Sector", marketData?.sector ?? "N/A"],
              ["Market Cap", formatLargeInr(marketData?.marketCap ?? null)],
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
                <span className="font-mono text-xs">{formatPrice(marketData?.fiftyTwoWeekLow ?? null)}</span>
                <div className="relative h-2 flex-1 border border-black bg-metric-surface-variant">
                  <div className="absolute right-6 top-1/2 h-4 w-3 -translate-y-1/2 bg-black" />
                </div>
                <span className="font-mono text-xs font-bold">{formatPrice(marketData?.fiftyTwoWeekHigh ?? null)}</span>
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
              <div className="border-b-2 border-black/10 p-2">
                <p className="font-bold">Sentiment signal</p>
                <p className="mt-1 text-sm leading-6">{report.summary}</p>
              </div>
              <div className="p-2">
                <p className="font-mono text-xs uppercase text-metric-muted">
                  Live news headlines are not connected yet.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <SectionHeading title="Top Risks" />
          <div className="mt-4 grid gap-4">
            {[
              [AlertTriangle, "Market data coverage", "Yahoo Finance currently supplies price, volume, sector, industry, and 52-week range. Full fundamentals still need a licensed provider.", "bg-metric-red"],
              [TrendingDown, "Valuation context", "Ratios and peer medians are AI-generated until a fundamentals feed is connected.", "bg-metric-pink"],
              [Bolt, "Refresh timing", `Market snapshot timestamp: ${formatTimestamp(marketData?.asOf ?? null)}.`, "bg-metric-green"],
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

async function getFreshMarketData(ticker: string, symbol: string) {
  const service = getMarketDataService();
  const result = await service.getSnapshot(ticker);
  if (result.ok && result.data.source !== "mock") {
    return result.data;
  }

  const symbolTicker = symbol.replace(/\.(NS|BO)$/i, "");
  if (symbolTicker !== ticker) {
    const symbolResult = await service.getSnapshot(symbolTicker);
    if (symbolResult.ok && symbolResult.data.source !== "mock") {
      return {
        ...symbolResult.data,
        ticker,
      };
    }
  }

  return undefined;
}

function formatPrice(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value)}`;
}

function formatPercent(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function formatLargeInr(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  if (value >= 1_00_000_00_00_000) {
    return `₹${new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
    }).format(value / 1_00_000_00_00_000)}L Cr`;
  }

  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function formatNumber(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
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
      <span className="mb-4 inline-block bg-black px-2 py-1 font-mono text-xs font-bold uppercase tracking-[0.08em] text-metric-finance-accent">
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
