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
    metrics: report.metrics,
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
              metrics: report.metrics,
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
            {report.metrics.slice(0, 6).map(([label, value, yoy, median]) => (
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
  const technicalRead = input.signals?.technicals.length
    ? input.signals.technicals.map((signal) => `${signal.label} ${signal.value}: ${signal.meaning}`).join(" ")
    : "Tradient technical signals are unavailable for this snapshot.";
  const newsRead = input.signals?.news.length
    ? input.signals.news.map((item) => `${item.title} (${item.sentiment})`).join("; ")
    : "No ticker-matched Tradient headlines were found in the latest market-news batch.";

  const base = [
    `${input.companyName} (${input.ticker}) is showing ${formatPrice(marketData?.price ?? null)} with a ${formatPercent(marketData?.dayChangePercent ?? null)} latest day move.`,
    `Latest setup: day range ${dayRange}, volume ${formatNumber(marketData?.volume ?? null)}, and 52-week range ${yearlyRange}.`,
    `Market meaning: ${input.marketRead.meaning} ${input.rangeRead.meaning} ${input.volumeRead.meaning}`,
    `Peer check: ${peerRead || "peer snapshots are unavailable"}. This shows whether today's move is company-specific or moving with close competitors.`,
    `Business context: sector ${marketData?.sector ?? "N/A"}, industry ${marketData?.industry ?? "N/A"}. Key available metrics: ${metricRead || "N/A"}.`,
    `Technical layer: ${technicalRead}`,
    `News layer: ${newsRead}`,
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
  const debt = metric(/debt|d\/?e|risk/i);
  const technical = input.signals?.technicals[0];
  const newsCount = input.signals?.news.length ?? 0;

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
      meaning: debt ? `${debt[0]} vs ${debt[3]}` : "Awaiting risk feed",
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
      value: newsCount ? `${newsCount} item${newsCount === 1 ? "" : "s"}` : "None",
      meaning: newsCount ? "Ticker-matched news" : "No exact match",
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
                  <span>{item.symbol ?? "Tradient"}</span>
                  <span>{item.sentiment}</span>
                </div>
                <p className="font-bold leading-6">{item.title}</p>
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
