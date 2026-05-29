import Link from "next/link";
import { AlertTriangle, Bolt, RefreshCw, Share2, TrendingDown } from "lucide-react";
import { FooterBar, TopBar } from "@/components/site-chrome";
import { getPeerComparisonLabels, shouldReplacePeerLabels } from "@/domain/competitors";
import { getReportViewForTicker } from "@/domain/report-cache";
import { resolveTickerQuery } from "@/domain/ticker-resolver";
import { getMarketDataService } from "@/services/marketData";
import type { MarketSnapshot } from "@/services/marketData/types";
import { notFound } from "next/navigation";

type ReportPageProps = {
  params: Promise<{ ticker: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReportPage({ params }: ReportPageProps) {
  const { ticker } = await params;
  const resolved = await resolveTickerQuery(decodeURIComponent(ticker));
  if (!resolved.ok) {
    notFound();
  }

  const freshMarketData = await getFreshMarketData(resolved.data.ticker, resolved.data.symbol);
  const reportView = await getReportViewForTicker(resolved.data.ticker);
  const report = reportView.payload;
  const marketData = freshMarketData ?? reportView.sourceData?.marketData;
  const displayPrice =
    marketData?.price !== null && marketData?.price !== undefined ? formatPrice(marketData.price) : report.price;
  const displayDayChange =
    marketData?.dayChangePercent !== null && marketData?.dayChangePercent !== undefined
      ? formatPercent(marketData.dayChangePercent)
      : report.dayChange;
  const displayPeers = shouldReplacePeerLabels(report.peers)
    ? getPeerComparisonLabels({
        ticker: resolved.data.ticker,
        sector: marketData?.sector ?? resolved.data.sector,
        industry: marketData?.industry ?? resolved.data.industry,
      })
    : report.peers;
  const peerSnapshots = await getPeerSnapshots(displayPeers.slice(1));
  const marketRead = getMarketRead(marketData);
  const rangeRead = getRangeRead(marketData);
  const volumeRead = getVolumeRead(marketData);

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
        <ReportSection title="Metric Brief" accent>
          <p className="text-base leading-7">
            {buildMetricBrief({
              ticker: report.ticker,
              companyName: report.companyName,
              marketData,
              peerLabels: displayPeers.slice(1),
              peerSnapshots,
              metrics: report.metrics,
              marketRead,
              rangeRead,
              volumeRead,
              reportSummary: report.summary,
            })}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t-2 border-black/10 pt-4">
            <span className="font-mono text-xs uppercase tracking-[0.08em] text-metric-muted">
              Market data refreshed: {formatTimestamp(marketData?.asOf ?? null)}
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
              {marketRead.label}
            </h2>
          </div>
          <div className="bg-white p-6">
            <p className="text-base italic leading-7">{marketRead.meaning}</p>
          </div>
        </section>

        <section>
          <SectionHeading title="Market Setup" />
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
            <p className="leading-7">{rangeRead.meaning}</p>
          </div>
        </section>

        <section className="surface p-4">
          <SectionHeading title="Price Behaviour" />
          <div className="mt-4 grid gap-2">
            {[
              ["Daily movement", marketRead.meaning],
              ["Range context", rangeRead.meaning],
              ["Volume context", volumeRead.meaning],
            ].map(([label, copy]) => (
              <AnalysisCard key={label} label={label} copy={copy} />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <SectionHeading title="Business Quality" />
            <span className="font-mono text-xs uppercase text-metric-muted">
              AI + provider fields
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
              <strong>WHAT THIS MEANS:</strong> These fields are meant to explain business strength,
              valuation context, and balance-sheet quality before someone decides whether to research further.
            </p>
          </div>
        </section>

        <section className="surface p-4">
          <SectionHeading title="Valuation Context" />
          <div className="mt-4 grid gap-2">
            <AnalysisCard
              label="Valuation lens"
              copy="Metric treats valuation as context, not a recommendation. A higher multiple needs stronger growth, margins, and execution to justify it; a lower multiple still needs a check on debt, earnings quality, and sector risk."
            />
            <AnalysisCard
              label="Current limitation"
              copy="Live valuation ratios and historical averages need a licensed fundamentals feed. Until that is connected, price, range, volume, sector, industry, and AI-generated financial context are shown separately."
            />
          </div>
        </section>

        <ReportTable
          target={marketData}
          targetLabel={report.ticker}
          peers={displayPeers}
          peerSnapshots={peerSnapshots}
        />

        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <SectionHeading title="Recent Signals" />
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
                  Live news headlines are not connected yet. The current signal is based on market data and the generated brief.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <SectionHeading title="Risk Map" />
          <div className="mt-4 grid gap-4">
            {[
              [AlertTriangle, "Data coverage", "Yahoo Finance currently supplies price, volume, sector, industry, and range fields. Full fundamentals still need a licensed provider.", "bg-metric-red"],
              [TrendingDown, "Interpretation risk", "Momentum, valuation, and business quality should be read together. One strong field does not explain the whole stock.", "bg-metric-pink"],
              [Bolt, "Latency", `This page fetches a fresh market snapshot on every report load. Snapshot timestamp: ${formatTimestamp(marketData?.asOf ?? null)}.`, "bg-metric-green"],
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
            Know what the data means before acting.
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

async function getPeerSnapshots(peers: string[]) {
  const service = getMarketDataService();
  const snapshots = await Promise.all(
    peers.map(async (peer) => {
      const result = await service.getSnapshot(peer);
      return result.ok && result.data.source !== "mock" ? result.data : null;
    }),
  );

  return snapshots;
}

function buildMetricBrief(input: {
  ticker: string;
  companyName: string;
  marketData: MarketSnapshot | undefined;
  peerLabels: string[];
  peerSnapshots: Array<MarketSnapshot | null>;
  metrics: Array<[string, string, string, string]>;
  marketRead: AnalysisRead;
  rangeRead: AnalysisRead;
  volumeRead: AnalysisRead;
  reportSummary: string;
}) {
  const marketData = input.marketData;
  const dayRange =
    marketData?.dayLow !== null &&
    marketData?.dayLow !== undefined &&
    marketData?.dayHigh !== null &&
    marketData?.dayHigh !== undefined
      ? `${formatPrice(marketData.dayLow)}-${formatPrice(marketData.dayHigh)}`
      : "N/A";
  const yearlyRange =
    marketData?.fiftyTwoWeekLow !== null &&
    marketData?.fiftyTwoWeekLow !== undefined &&
    marketData?.fiftyTwoWeekHigh !== null &&
    marketData?.fiftyTwoWeekHigh !== undefined
      ? `${formatPrice(marketData.fiftyTwoWeekLow)}-${formatPrice(marketData.fiftyTwoWeekHigh)}`
      : "N/A";
  const peerRead = input.peerLabels
    .map((peer, index) => {
      const snapshot = input.peerSnapshots[index];
      return `${peer}: ${formatPercent(snapshot?.dayChangePercent ?? null)}`;
    })
    .join(", ");
  const metricRead = input.metrics
    .slice(0, 3)
    .map(([label, value, yoy, median]) => `${label} ${value} (${yoy} YoY, median ${median})`)
    .join("; ");

  const base = [
    `${input.companyName} (${input.ticker}) is being shown as a pre-buy intelligence brief, not a stock recommendation.`,
    `Latest setup: price ${formatPrice(marketData?.price ?? null)}, day change ${formatPercent(marketData?.dayChangePercent ?? null)}, day range ${dayRange}, volume ${formatNumber(marketData?.volume ?? null)}, and 52-week range ${yearlyRange}.`,
    `Market meaning: ${input.marketRead.meaning} ${input.rangeRead.meaning} ${input.volumeRead.meaning}`,
    `Peer check: ${peerRead || "peer snapshots are unavailable"}. This shows whether today's move is company-specific or moving with close competitors.`,
    `Business context: sector ${marketData?.sector ?? "N/A"}, industry ${marketData?.industry ?? "N/A"}. Key available metrics: ${metricRead || "N/A"}.`,
  ].join(" ");
  const cleanSummary = input.reportSummary.replace(/\b(buy|sell|hold|accumulate|avoid)\b/gi, "research");
  return `${base} Brief: ${cleanSummary}`;
}

type AnalysisRead = {
  label: string;
  meaning: string;
};

function getMarketRead(marketData: MarketSnapshot | undefined): AnalysisRead {
  const change = marketData?.dayChangePercent;
  if (change === null || change === undefined) {
    return {
      label: "Market Signal: Incomplete",
      meaning: "The latest price move is unavailable from the current provider, so the first check is data completeness before interpreting momentum.",
    };
  }

  if (change >= 2) {
    return {
      label: "Market Signal: Strong Move",
      meaning: `The stock is up ${formatPercent(change)} on the latest Yahoo snapshot. That means today has visible positive price pressure, so volume and range position matter before reading too much into the move.`,
    };
  }

  if (change <= -2) {
    return {
      label: "Market Signal: Weak Move",
      meaning: `The stock is down ${formatPercent(change)} on the latest Yahoo snapshot. That points to visible selling pressure today, so the next question is whether the move is stock-specific or sector-wide.`,
    };
  }

  return {
    label: "Market Signal: Normal Range",
    meaning: `The stock is moving ${formatPercent(change)} on the latest Yahoo snapshot, which is a moderate daily move rather than an extreme signal by itself.`,
  };
}

function getRangeRead(marketData: MarketSnapshot | undefined): AnalysisRead {
  const price = marketData?.price;
  const high = marketData?.fiftyTwoWeekHigh;
  const low = marketData?.fiftyTwoWeekLow;
  if (price === null || price === undefined || high === null || high === undefined || low === null || low === undefined || high === low) {
    return {
      label: "Range Context: Unavailable",
      meaning: "The 52-week range is incomplete, so the page cannot yet explain whether the current price is near the top, middle, or bottom of its recent trading band.",
    };
  }

  const position = ((price - low) / (high - low)) * 100;
  if (position >= 75) {
    return {
      label: "Range Context: Upper Band",
      meaning: `The current price is around ${position.toFixed(0)}% of the way through its 52-week range. That means the stock is trading closer to its yearly high than its yearly low, so valuation support matters more.`,
    };
  }

  if (position <= 25) {
    return {
      label: "Range Context: Lower Band",
      meaning: `The current price is around ${position.toFixed(0)}% of the way through its 52-week range. That means the stock is closer to its yearly low, so the important question is whether weakness is temporary or tied to fundamentals.`,
    };
  }

  return {
    label: "Range Context: Middle Band",
    meaning: `The current price is around ${position.toFixed(0)}% of the way through its 52-week range. That means the setup is not at an obvious range extreme, so peer movement and business quality become more useful context.`,
  };
}

function getVolumeRead(marketData: MarketSnapshot | undefined): AnalysisRead {
  if (!marketData?.volume) {
    return {
      label: "Volume Context: Unavailable",
      meaning: "Volume is unavailable, so the page cannot yet judge whether today's move has unusually strong participation.",
    };
  }

  return {
    label: "Volume Context: Available",
    meaning: `Latest reported volume is ${formatNumber(marketData.volume)} shares. Volume helps separate an ordinary price move from a move with broader market participation.`,
  };
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

function AnalysisCard({ label, copy }: { label: string; copy: string }) {
  return (
    <div className="border-2 border-black bg-white p-4 neo-shadow-sm">
      <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.08em] text-metric-muted">
        {label}
      </p>
      <p className="text-sm leading-6">{copy}</p>
    </div>
  );
}

function ReportTable({
  target,
  targetLabel,
  peers,
  peerSnapshots,
}: {
  target: MarketSnapshot | undefined;
  targetLabel: string;
  peers: string[];
  peerSnapshots: Array<MarketSnapshot | null>;
}) {
  const peerLabels = [targetLabel, ...peers.slice(1)];
  const snapshots = [target ?? null, ...peerSnapshots];
  const rows = [
    ["Price", (snapshot: MarketSnapshot | null) => formatPrice(snapshot?.price ?? null)],
    ["Day Change", (snapshot: MarketSnapshot | null) => formatPercent(snapshot?.dayChangePercent ?? null)],
    ["Volume", (snapshot: MarketSnapshot | null) => formatNumber(snapshot?.volume ?? null)],
    ["Day High", (snapshot: MarketSnapshot | null) => formatPrice(snapshot?.dayHigh ?? null)],
    ["Day Low", (snapshot: MarketSnapshot | null) => formatPrice(snapshot?.dayLow ?? null)],
  ] as const;

  return (
    <section>
      <SectionHeading title="Peer Lens" />
      <div className="mt-4 overflow-x-auto border-4 border-black bg-white neo-shadow">
        <table className="w-full min-w-[640px] border-collapse text-left font-mono text-sm">
          <thead>
            <tr className="border-b-4 border-black">
              <th className="sticky left-0 border-r-4 border-black bg-metric-surface-variant p-4 text-xs uppercase">
                Metric
              </th>
              {peerLabels.map((peer, index) => (
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
            {rows.map(([metric, getValue]) => (
              <tr key={metric} className="border-b-2 border-black last:border-b-0">
                <td className="sticky left-0 border-r-4 border-black bg-metric-surface-variant p-4 font-bold">
                  {metric}
                </td>
                {peerLabels.map((peer, index) => (
                  <td
                    key={`${peer}-${metric}`}
                    className={`border-r-2 border-black p-4 last:border-r-0 ${index === 0 ? "bg-metric-green-bright/25 font-bold" : ""}`}
                  >
                    {getValue(snapshots[index] ?? null)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 border-2 border-dashed border-black bg-white p-3">
        <p className="text-sm leading-6">
          <strong>WHAT THIS MEANS:</strong> Peer movement helps explain whether today&apos;s setup is specific to the company
          or part of a broader sector move. This table uses fresh market snapshots where Yahoo provides them.
        </p>
      </div>
    </section>
  );
}
