import Link from "next/link";
import { AlertTriangle, Bolt, RefreshCw, Share2, TrendingDown } from "lucide-react";
import { FooterBar, TopBar } from "@/components/site-chrome";
import { getPeerComparisonLabels, shouldReplacePeerLabels } from "@/domain/competitors";
import { getReportViewForTicker } from "@/domain/report-cache";
import { resolveTickerQuery } from "@/domain/ticker-resolver";
import { getMarketDataService } from "@/services/marketData";
import type { MarketSnapshot } from "@/services/marketData/types";
import { getTradientSignals } from "@/services/tradient";
import type { TradientSignal } from "@/services/tradient";
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
  const displayMetrics = getDisplayMetrics(report.metrics, marketData);
  const peerSnapshots = await getPeerSnapshots(displayPeers.slice(1));
  const marketRead = getMarketRead(marketData);
  const rangeRead = getRangeRead(marketData);
  const volumeRead = getVolumeRead(marketData);
  const tradientSignals = await getTradientSignals({
    ticker: resolved.data.ticker,
    companyName: report.companyName,
  });
  const signals = tradientSignals.ok ? tradientSignals.data : null;
  const signalTiles = buildSignalTiles({
    displayDayChange,
    marketData,
    marketRead,
    rangeRead,
    volumeRead,
    metrics: displayMetrics,
    signals,
  });

  return (
    <main className="flex min-h-screen flex-col">
      <TopBar reportActions ticker={report.ticker} />
      <div className="sticky top-[68px] z-40 border-b-4 border-black bg-white px-4 py-3">
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

      <article className="mx-auto flex w-full max-w-[42rem] flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <section className="border-4 border-black bg-black p-5 text-white neo-shadow">
          <div className="mb-5 flex items-center justify-between gap-3">
            <span className="border-2 border-white bg-metric-finance-accent px-3 py-1 font-mono text-xs font-extrabold uppercase tracking-[0.08em] text-black">
              {report.ticker}
            </span>
            <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.08em] text-metric-surface-dim">
              {formatTimestamp(marketData?.asOf ?? null)}
            </span>
          </div>
          <h1 className="text-5xl font-extrabold uppercase leading-[0.9] tracking-tight">
            Before You Buy
          </h1>
          <p className="mt-4 text-sm font-bold uppercase leading-5 tracking-[0.04em] text-metric-finance-accent-soft">
            {report.companyName}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <DataTile label="Price" value={displayPrice} tone="dark" />
            <DataTile label="Day move" value={displayDayChange} tone="accent" />
          </div>
        </section>

        <section className="surface p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionHeading title="Metric Brief" />
            <Link
              href={`/analyze/${report.ticker}?refresh=1`}
              className="neo-press inline-flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-metric-finance-accent"
              aria-label="Refresh data"
            >
              <RefreshCw size={16} />
            </Link>
          </div>
          <p className="text-[0.95rem] font-medium leading-7">
            {buildMetricBrief({
              ticker: report.ticker,
              companyName: report.companyName,
              marketData,
              peerLabels: displayPeers.slice(1),
              peerSnapshots,
              metrics: displayMetrics,
              marketRead,
              rangeRead,
              volumeRead,
              signals,
              reportSummary: report.summary,
            })}
          </p>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <SectionHeading title="Signal Grid" />
            <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.08em] text-metric-muted">
              Live read
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {signalTiles.map((tile) => (
              <SignalTile key={tile.label} {...tile} />
            ))}
          </div>
        </section>

        <section className="surface p-5">
          <SectionHeading title="Market Setup" />
          <div className="mt-4 grid gap-2">
            <AnalysisCard label="Price action" copy={marketRead.meaning} />
            <AnalysisCard label="52W position" copy={rangeRead.meaning} />
            <AnalysisCard label="Volume" copy={volumeRead.meaning} />
          </div>
          <div className="mt-4 border-2 border-black bg-metric-finance-accent-soft p-3">
            <div className="mb-2 flex items-center justify-between gap-4 font-mono text-xs font-bold uppercase">
              <span>{formatPrice(marketData?.fiftyTwoWeekLow ?? null)}</span>
              <span>52W range</span>
              <span>{formatPrice(marketData?.fiftyTwoWeekHigh ?? null)}</span>
            </div>
            <div className="h-3 border-2 border-black bg-white">
              <div
                className="h-full bg-metric-finance-accent"
                style={{ width: `${getRangePosition(marketData)}%` }}
              />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-4">
            <SectionHeading title="Business Quality" />
            <span className="font-mono text-[0.65rem] font-bold uppercase text-metric-muted">
              Current feed
            </span>
          </div>
          <div className="grid gap-2">
            {displayMetrics.slice(0, 6).map(([label, value, yoy, median]) => (
              <div key={label} className="border-2 border-black bg-white p-4 neo-shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-metric-muted">
                      {label}
                    </p>
                    <p className="mt-2 text-3xl font-extrabold leading-none">{value}</p>
                  </div>
                  <div className="text-right font-mono text-[0.65rem] font-bold uppercase leading-5">
                    <p className={yoy.startsWith("-") ? "text-metric-red" : "text-metric-green"}>
                      {yoy}
                    </p>
                    <p className="text-metric-muted">Median {median}</p>
                  </div>
                </div>
              </div>
            ))}
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
            <RecentSignals signals={signals} fallbackSummary={report.summary} />
          </div>
        </section>

        <NewsSentiment signals={signals} />

        <section>
          <SectionHeading title="What Could Matter" />
          <div className="mt-4 grid gap-3">
            {[
              [AlertTriangle, "Valuation risk", "A higher multiple needs stronger growth, margins, and execution to justify it.", "bg-metric-red"],
              [TrendingDown, "Earnings risk", "Business quality and price action need to be read with fresh quarterly fundamentals once connected.", "bg-metric-pink"],
              [Bolt, "Market timing", `Fresh snapshot: ${formatTimestamp(marketData?.asOf ?? null)}. Short-term setups can change quickly around news, volume, and peer moves.`, "bg-metric-green"],
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

        <section className="border-4 border-black bg-black p-6 text-white neo-shadow">
          <SectionHeading title="What This Means" inverted />
          <p className="mt-4 text-sm leading-6 text-metric-surface-dim">
            {marketRead.meaning} {rangeRead.meaning} The peer lens and recent
            signals explain whether the setup is stock-specific or sector-wide.
          </p>
          <button className="neo-press mt-6 inline-flex w-full items-center justify-center gap-2 border-4 border-black bg-metric-finance-accent px-8 py-4 font-mono text-sm font-extrabold uppercase tracking-[0.05em] text-black neo-shadow">
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

function getDisplayMetrics(
  reportMetrics: Array<[string, string, string, string]>,
  marketData: MarketSnapshot | undefined,
) {
  const fundamentalMetrics = (marketData?.metrics ?? [])
    .filter((metric) => metric.median && /p\/?e|p\/?b|roa|roe|roce|ev\/ebitda/i.test(metric.label))
    .map<[string, string, string, string]>((metric) => [
      metric.label,
      metric.value,
      "Current",
      metric.median ?? "N/A",
    ]);

  if (!fundamentalMetrics.length) {
    return reportMetrics;
  }

  const existingLabels = new Set(fundamentalMetrics.map(([label]) => normalizeMetricLabel(label)));
  const supplementalMetrics = reportMetrics.filter(([label]) => !existingLabels.has(normalizeMetricLabel(label)));

  return [...fundamentalMetrics, ...supplementalMetrics].slice(0, 6);
}

function normalizeMetricLabel(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "");
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
  signals: TradientSignal | null;
  reportSummary: string;
}) {
  const marketData = input.marketData;
  const price = formatPrice(marketData?.price ?? null);
  const change = formatPercent(marketData?.dayChangePercent ?? null);
  const volume = formatNumber(marketData?.volume ?? null);
  const peerMoves = input.peerLabels
    .map((peer, index) => {
      const snapshot = input.peerSnapshots[index];
      return `${peer}: ${formatPercent(snapshot?.dayChangePercent ?? null)}`;
    })
    .filter((move) => !move.endsWith("N/A"))
    .join(", ");
  const valuation = getMetricSignal(input.metrics, /p\/?e|valuation|ev/i);
  const quality = getMetricSignal(input.metrics, /roe|roce|margin|profit|quality/i);
  const leverage = getMetricSignal(input.metrics, /debt|d\/?e|risk|coverage/i);
  const technical = input.signals?.technicals[0];
  const leadNews = input.signals?.news[0];

  const setupSentence = `${input.companyName} is trading at ${price}, ${change} on the latest snapshot, with ${volume} shares of reported volume.`;
  const rangeSentence = input.rangeRead.meaning
    .replace(/^The current price is /, "It is ")
    .replace(/^That places /, "Range context: ");
  const peerSentence = peerMoves
    ? `Against its nearest listed peers, today's move reads as ${peerMoves}, so the stock is moving with a weak telecom and large-cap tape rather than in isolation.`
    : "Peer movement is not complete enough yet to separate company-specific price action from a broader sector move.";
  const fundamentalsSentence = [
    valuation ? `valuation: ${valuation}` : null,
    quality ? `quality: ${quality}` : null,
    leverage ? `risk: ${leverage}` : null,
  ]
    .filter(Boolean)
    .join("; ");
  const evidenceSentence = fundamentalsSentence
    ? `The fundamental checkpoint is ${fundamentalsSentence}.`
    : `The fundamental checkpoint is still thin because the current feed has not supplied valuation, profitability, and balance-sheet depth together.`;
  const signalSentence = [
    technical ? `Technical signal: ${technical.label} at ${technical.value}, ${technical.meaning.toLowerCase()}` : null,
    leadNews ? `Latest news tone: ${leadNews.sentiment.toLowerCase()} from ${leadNews.source} on "${leadNews.title}".` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const analystSentence = buildClosingRead({
    marketRead: input.marketRead,
    rangeRead: input.rangeRead,
    hasFundamentals: Boolean(fundamentalsSentence),
    hasNews: Boolean(leadNews),
    hasTechnicals: Boolean(technical),
  });

  return [setupSentence, rangeSentence, peerSentence, evidenceSentence, signalSentence, analystSentence]
    .filter(Boolean)
    .join(" ");
}

function getMetricSignal(metrics: Array<[string, string, string, string]>, pattern: RegExp) {
  const metric = metrics.find(([label]) => pattern.test(label));
  if (!metric || metric[1] === "N/A") {
    return null;
  }

  const [, value, yoy, median] = metric;
  const comparison = median && median !== "N/A" ? `versus peer median ${median}` : "with no peer median supplied";
  const movement = yoy && yoy !== "N/A" ? `, ${yoy} YoY` : "";
  return `${value}${movement}, ${comparison}`;
}

function buildClosingRead(input: {
  marketRead: AnalysisRead;
  rangeRead: AnalysisRead;
  hasFundamentals: boolean;
  hasNews: boolean;
  hasTechnicals: boolean;
}) {
  if (!input.hasFundamentals) {
    return "The practical read is momentum-first: price, range, peers, technicals, and news can frame the setup, but quality and valuation still need a deeper fundamentals feed before the page can judge durability.";
  }

  if (input.hasNews && input.hasTechnicals) {
    return "The useful interpretation is whether the market move, news flow, and technical tape are pointing in the same direction; alignment matters more than any single headline or ratio.";
  }

  return `${input.marketRead.meaning} ${input.rangeRead.meaning}`;
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
      meaning: `The stock is up ${formatPercent(change)} on the latest snapshot, which points to visible positive price pressure. Volume, range position, and peer movement decide whether that pressure has depth.`,
    };
  }

  if (change <= -2) {
    return {
      label: "Market Signal: Weak Move",
      meaning: `The stock is down ${formatPercent(change)} on the latest snapshot, so sellers are controlling the near-term tape. Peer movement and news flow decide whether the pressure is company-specific or sector-wide.`,
    };
  }

  return {
    label: "Market Signal: Normal Range",
    meaning: `The stock is moving ${formatPercent(change)} on the latest snapshot, a moderate daily move that needs confirmation from volume, range position, and peer behaviour.`,
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
      meaning: `The current price is around ${position.toFixed(0)}% of the way through its 52-week range. That places it closer to the yearly high, where valuation support and earnings delivery carry more weight.`,
    };
  }

  if (position <= 25) {
    return {
      label: "Range Context: Lower Band",
      meaning: `The current price is around ${position.toFixed(0)}% of the way through its 52-week range. That places it near the lower band, where the distinction between temporary weakness and fundamental stress matters.`,
    };
  }

  return {
    label: "Range Context: Middle Band",
    meaning: `The current price is around ${position.toFixed(0)}% of the way through its 52-week range. That places it away from obvious range extremes, making peer movement and business quality more useful context.`,
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
    meaning: `Latest reported volume is ${formatNumber(marketData.volume)} shares, which gives the price move a participation check instead of leaving it as a standalone quote change.`,
  };
}

function buildSignalTiles(input: {
  displayDayChange: string;
  marketData: MarketSnapshot | undefined;
  marketRead: AnalysisRead;
  rangeRead: AnalysisRead;
  volumeRead: AnalysisRead;
  metrics: Array<[string, string, string, string]>;
  signals: TradientSignal | null;
}) {
  const metric = (pattern: RegExp) => input.metrics.find(([label]) => pattern.test(label));
  const valuation = metric(/p\/?e|valuation/i);
  const quality = metric(/roe|roce|margin|profit/i);
  const debt = metric(/debt|d\/?e|risk|quick|current ratio|interest coverage/i);
  const technical = input.signals?.technicals[0];
  const newsCount = input.signals?.news.length ?? 0;
  const newsSignal = getNewsSentimentSummary(input.signals);

  return [
    {
      label: "Price Action",
      value: input.displayDayChange,
      meaning: input.marketRead.label.replace("Market Signal: ", ""),
      tone: "accent" as const,
    },
    {
      label: "Volume",
      value: formatNumber(input.marketData?.volume ?? null),
      meaning: input.volumeRead.label.replace("Volume Context: ", ""),
      tone: "white" as const,
    },
    {
      label: "52W Position",
      value: `${getRangePosition(input.marketData)}%`,
      meaning: input.rangeRead.label.replace("Range Context: ", ""),
      tone: "white" as const,
    },
    {
      label: "Valuation",
      value: valuation?.[1] ?? "Pending",
      meaning: valuation ? `${valuation[2]} YoY` : "Needs fundamentals feed",
      tone: "dark" as const,
    },
    {
      label: "Business Quality",
      value: quality?.[1] ?? "Mixed",
      meaning: quality ? `${quality[0]} vs ${quality[3]}` : "AI context only",
      tone: "white" as const,
    },
    {
      label: "Debt / Risk",
      value: debt?.[1] ?? "Check",
      meaning: debt ? `${debt[0]} vs ${debt[3]}` : "Needs debt metric",
      tone: "white" as const,
    },
    {
      label: "Technical Setup",
      value: technical?.value ?? "N/A",
      meaning: technical?.label ?? "Tradient signal",
      tone: "accent" as const,
    },
    {
      label: "News Signal",
      value: newsSignal.label,
      meaning: newsCount ? `${newsSignal.detail} · ${newsCount} matched` : "No exact match",
      tone: "white" as const,
    },
  ];
}

function getRangePosition(marketData: MarketSnapshot | undefined) {
  const price = marketData?.price;
  const high = marketData?.fiftyTwoWeekHigh;
  const low = marketData?.fiftyTwoWeekLow;
  if (price === null || price === undefined || high === null || high === undefined || low === null || low === undefined || high === low) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(((price - low) / (high - low)) * 100)));
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

function SectionHeading({ title, inverted = false }: { title: string; inverted?: boolean }) {
  return (
    <h2 className={`flex items-center gap-2 font-mono text-2xl font-bold uppercase leading-none ${inverted ? "text-white" : ""}`}>
      <span className={`h-4 w-4 ${inverted ? "bg-metric-finance-accent" : "bg-black"}`} />
      {title}
    </h2>
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

function DataTile({
  label,
  value,
  tone = "white",
}: {
  label: string;
  value: string;
  tone?: "white" | "dark" | "accent";
}) {
  const className =
    tone === "dark"
      ? "border-white bg-black text-white"
      : tone === "accent"
        ? "border-black bg-metric-finance-accent text-black"
        : "border-black bg-white text-black";

  return (
    <div className={`border-2 p-3 ${className}`}>
      <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.08em] opacity-70">
        {label}
      </p>
      <p className="mt-2 font-mono text-xl font-extrabold uppercase leading-none">
        {value}
      </p>
    </div>
  );
}

function SignalTile({
  label,
  value,
  meaning,
  tone,
}: {
  label: string;
  value: string;
  meaning: string;
  tone: "white" | "dark" | "accent";
}) {
  return (
    <div
      className={`min-h-32 border-2 border-black p-3 neo-shadow-sm ${
        tone === "dark"
          ? "bg-black text-white"
          : tone === "accent"
            ? "bg-metric-finance-accent text-black"
            : "bg-white text-black"
      }`}
    >
      <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.08em] opacity-70">
        {label}
      </p>
      <p className="mt-3 break-words font-mono text-2xl font-extrabold uppercase leading-none">
        {value}
      </p>
      <p className="mt-3 text-xs font-bold uppercase leading-4 opacity-80">
        {meaning}
      </p>
    </div>
  );
}

function RecentSignals({
  signals,
  fallbackSummary,
}: {
  signals: TradientSignal | null;
  fallbackSummary: string;
}) {
  const technicals = signals?.technicals ?? [];
  const news = signals?.news ?? [];

  return (
    <div className="grid gap-3">
      <div className="border-b-2 border-black/10 p-2">
        <p className="font-bold">Technical signal</p>
        <div className="mt-2 grid gap-2">
          {technicals.length ? (
            technicals.map((item) => (
              <div key={item.label} className="border-2 border-black bg-white p-3">
                <div className="flex items-center justify-between gap-3 font-mono text-xs font-bold uppercase">
                  <span>{item.label}</span>
                  <span>{item.value}</span>
                </div>
                <p className="mt-2 text-sm leading-6">{item.meaning}</p>
              </div>
            ))
          ) : (
            <p className="text-sm leading-6">{fallbackSummary}</p>
          )}
        </div>
      </div>

      <div className="p-2">
        <p className="font-bold">News signal</p>
        <div className="mt-2 grid gap-2">
          {news.length ? (
            news.map((item) => (
              <div key={`${item.title}-${item.publishedAt}`} className="border-2 border-black bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[0.65rem] font-bold uppercase text-metric-muted">
                  <span>{item.source}</span>
                  <span>{item.sentiment}</span>
                </div>
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer" className="font-bold leading-6 underline decoration-2 underline-offset-4">
                    {item.title}
                  </a>
                ) : (
                  <p className="font-bold leading-6">{item.title}</p>
                )}
                <p className="mt-1 text-sm leading-6">{item.summary}</p>
                {item.publishedAt ? (
                  <p className="mt-2 font-mono text-[0.65rem] uppercase text-metric-muted">
                    {formatTimestamp(item.publishedAt)}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="font-mono text-xs uppercase text-metric-muted">
              No ticker-matched Tradient headlines in the latest market-news batch.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function getNewsSentimentCounts(news: TradientSignal["news"]) {
  return news.reduce(
    (acc, item) => {
      const sentiment = item.sentiment.toLowerCase();
      if (sentiment.includes("positive")) acc.positive += 1;
      else if (sentiment.includes("negative")) acc.negative += 1;
      else acc.neutral += 1;
      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 },
  );
}

function getNewsSentimentSummary(signals: TradientSignal | null) {
  const news = signals?.news ?? [];
  const counts = getNewsSentimentCounts(news);
  if (!news.length) {
    return {
      label: "No News",
      detail: "No matched headlines",
    };
  }

  if (counts.positive > counts.negative && counts.positive >= counts.neutral) {
    return {
      label: "Positive",
      detail: `${counts.positive} positive / ${counts.neutral} neutral / ${counts.negative} negative`,
    };
  }

  if (counts.negative > counts.positive && counts.negative >= counts.neutral) {
    return {
      label: "Negative",
      detail: `${counts.positive} positive / ${counts.neutral} neutral / ${counts.negative} negative`,
    };
  }

  return {
    label: "Neutral",
    detail: `${counts.positive} positive / ${counts.neutral} neutral / ${counts.negative} negative`,
  };
}

function NewsSentiment({ signals }: { signals: TradientSignal | null }) {
  const news = signals?.news ?? [];
  const counts = getNewsSentimentCounts(news);
  const total = Math.max(1, news.length);
  const primary =
    counts.positive > counts.negative && counts.positive >= counts.neutral
      ? "Positive"
      : counts.negative > counts.positive && counts.negative >= counts.neutral
        ? "Negative"
        : news.length
          ? "Neutral"
          : "No matched news";

  return (
    <section className="surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <SectionHeading title="News Sentiment" />
        <span className="border-2 border-black bg-black px-2 py-1 font-mono text-[0.65rem] font-bold uppercase text-metric-finance-accent">
          {primary}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          ["Positive", counts.positive, "bg-metric-finance-accent"],
          ["Neutral", counts.neutral, "bg-white"],
          ["Negative", counts.negative, "bg-metric-pink"],
        ].map(([label, count, bg]) => (
          <div key={label as string} className={`border-2 border-black p-3 text-center ${bg as string}`}>
            <p className="font-mono text-[0.6rem] font-bold uppercase tracking-[0.08em]">
              {label as string}
            </p>
            <p className="mt-2 text-2xl font-extrabold leading-none">{count as number}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 h-4 overflow-hidden border-2 border-black bg-white">
        <div className="flex h-full">
          <div
            className="bg-metric-finance-accent"
            style={{ width: `${(counts.positive / total) * 100}%` }}
          />
          <div
            className="bg-metric-surface-variant"
            style={{ width: `${(counts.neutral / total) * 100}%` }}
          />
          <div
            className="bg-metric-pink"
            style={{ width: `${(counts.negative / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {news.length ? (
          news.map((item) => (
            <div key={`sentiment-${item.title}-${item.publishedAt}`} className="border-2 border-black bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[0.65rem] font-bold uppercase text-metric-muted">
                <span>{item.source}</span>
                <span>{item.sentiment}</span>
              </div>
              {item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer" className="font-bold leading-6 underline decoration-2 underline-offset-4">
                  {item.title}
                </a>
              ) : (
                <p className="font-bold leading-6">{item.title}</p>
              )}
              <p className="mt-1 text-sm leading-6">{item.summary}</p>
            </div>
          ))
        ) : (
          <p className="border-2 border-dashed border-black bg-white p-4 text-sm leading-6">
            No exact company-matched headline is available in the latest Tradient batch. The brief uses price,
            volume, peer movement, and technical signals until a matching article appears.
          </p>
        )}
      </div>
    </section>
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
