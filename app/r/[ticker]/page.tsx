import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, Bolt, RefreshCw, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ReportViewEvent } from "@/components/analytics-events";
import { ShareReportButton } from "@/components/share-report-button";
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

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { ticker } = await params;
  const decodedTicker = decodeURIComponent(ticker);
  const resolved = await resolveTickerQuery(decodedTicker);
  const reportTicker = resolved.ok ? resolved.data.ticker : decodedTicker.toUpperCase();
  const companyName = resolved.ok ? resolved.data.companyName : `${reportTicker} stock`;
  const title = `${reportTicker} analysis by Metric Finance`;
  const description = `Read the Metric Finance brief on ${companyName}: price action, volume, peers, technicals, news, and risk context.`;
  const path = `/r/${encodeURIComponent(reportTicker)}`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "Metric Finance",
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

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
  const hasFundamentalData = hasFundamentalMetrics(displayMetrics);
  const peerSnapshots = await getPeerSnapshots(displayPeers.slice(1));
  const marketRead = getMarketRead(marketData);
  const rangeRead = getRangeRead(marketData);
  const volumeRead = getVolumeRead(marketData);
  const tradientSignals = await getTradientSignals({
    ticker: resolved.data.ticker,
    companyName: report.companyName,
  });
  const signals = tradientSignals.ok ? tradientSignals.data : null;
  const metricBrief = buildMetricBrief({
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
  });
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
      <ReportViewEvent ticker={report.ticker} companyName={report.companyName} />
      <TopBar reportActions ticker={report.ticker} companyName={report.companyName} />
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
            {metricBrief}
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
            <SectionHeading title={hasFundamentalData ? "Business Quality" : "Market Feed"} />
            <span className="font-mono text-[0.65rem] font-bold uppercase text-metric-muted">
              {hasFundamentalData ? "Current feed" : "Quote feed"}
            </span>
          </div>
          <div className="grid gap-2">
            {displayMetrics.slice(0, 6).map(([label, value, yoy, median]) => {
              const hasYoY = isMeaningfulMetricMovement(yoy);
              const hasMedian = Boolean(median && median !== "N/A");

              return (
                <div key={label} className="border-2 border-black bg-white p-4 neo-shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-metric-muted">
                        {label}
                      </p>
                      <p className="mt-2 text-3xl font-extrabold leading-none">{value}</p>
                    </div>
                    <div className="text-right font-mono text-[0.65rem] font-bold uppercase leading-5">
                      {hasYoY ? (
                        <p className={yoy.startsWith("-") ? "text-metric-red" : "text-metric-green"}>
                          {yoy}
                        </p>
                      ) : null}
                      {hasMedian ? (
                        <p className="text-metric-muted">Median {median}</p>
                      ) : (
                        <p className="text-metric-blue">Current</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
            {buildRiskCards({
              marketData,
              marketRead,
              rangeRead,
              volumeRead,
              metrics: displayMetrics,
              signals,
            }).map(({ Icon, title, copy, stripe }) => (
              <div key={title} className="relative overflow-hidden border-2 border-black bg-white p-4 neo-shadow-sm">
                <div className={`absolute right-0 top-0 h-full w-2 ${stripe}`} />
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="text-black" size={20} strokeWidth={2.2} />
                  <h3 className="font-mono text-sm font-bold uppercase">{title}</h3>
                </div>
                <p className="text-sm leading-6">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-4 border-black bg-black p-6 text-white neo-shadow">
          <SectionHeading title="What This Means" inverted />
          <p className="mt-4 text-sm leading-6 text-metric-surface-dim">
            {buildWhatThisMeans({
              marketData,
              marketRead,
              rangeRead,
              volumeRead,
              metrics: displayMetrics,
              signals,
              metricBrief,
            })}
          </p>
          <ShareReportButton
            ticker={report.ticker}
            companyName={report.companyName}
            className="neo-press mt-6 inline-flex w-full items-center justify-center gap-2 border-4 border-black bg-metric-finance-accent px-8 py-4 font-mono text-sm font-extrabold uppercase tracking-[0.05em] text-black neo-shadow"
          />
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
    .filter((metric) => metric.median && isFundamentalMetricLabel(metric.label))
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

function hasFundamentalMetrics(metrics: Array<[string, string, string, string]>) {
  return metrics.some(([label, value]) => value !== "N/A" && isFundamentalMetricLabel(label));
}

function isFundamentalMetricLabel(label: string) {
  const normalized = normalizeMetricLabel(label);
  const exactKeys = ["pe", "pb", "de"];
  const containsKeys = [
    "peratio",
    "pricetoearnings",
    "pbratio",
    "pricetobook",
    "evebitda",
    "enterprisevaluetoebitda",
    "roa",
    "roe",
    "roce",
    "revenuegrowth",
    "eps",
    "dividendyield",
    "freecashflow",
    "cashconversion",
    "quickratio",
    "currentratio",
    "debttoequity",
    "interestcoverage",
    "altman",
    "piotroski",
  ];

  return (
    exactKeys.includes(normalized) ||
    containsKeys.some((key) => normalized === key || normalized.includes(key)) ||
    normalized.includes("margin") ||
    normalized.includes("profit")
  );
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
  const sectorContext = marketData?.sector ?? marketData?.industry ?? "its peer group";
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

  const setupSentence = `${input.companyName} is trading at ${price}, a ${change} day move, with ${volume} shares changing hands.`;
  const rangeSentence = input.rangeRead.meaning
    .replace(/^The current price is /, "It is ")
    .replace(/^That puts /, "Range context: ");
  const peerSentence = peerMoves
    ? `Peer context matters here: ${peerMoves}. That helps separate a company-specific move from a broader ${sectorContext} tape.`
    : "Peer data is thin, so the read has to lean more on price, volume, range position, and news flow.";
  const fundamentalsSentence = [
    valuation ? `valuation: ${valuation}` : null,
    quality ? `quality: ${quality}` : null,
    leverage ? `risk: ${leverage}` : null,
  ]
    .filter(Boolean)
    .join("; ");
  const evidenceSentence = fundamentalsSentence
    ? `The available fundamentals add ${fundamentalsSentence}.`
    : `The quote feed has not supplied full valuation, profitability, and balance-sheet ratios yet, so the durability of the move cannot be judged from fundamentals alone.`;
  const signalSentence = [
    technical ? `${technical.label} is at ${technical.value}; ${lowercaseFirst(technical.meaning)}` : null,
    leadNews ? `The lead news item is ${leadNews.sentiment.toLowerCase()}: ${leadNews.source} reported "${leadNews.title}".` : null,
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

function buildRiskCards(input: {
  marketData: MarketSnapshot | undefined;
  marketRead: AnalysisRead;
  rangeRead: AnalysisRead;
  volumeRead: AnalysisRead;
  metrics: Array<[string, string, string, string]>;
  signals: TradientSignal | null;
}): Array<{
  Icon: LucideIcon;
  title: string;
  copy: string;
  stripe: string;
}> {
  const valuation = getMetricTuple(input.metrics, /p\/?e|p\/?b|ev\/?ebitda|valuation/i);
  const quality = getMetricTuple(input.metrics, /roe|roce|margin|profit|quality/i);
  const balanceSheet = getMetricTuple(input.metrics, /debt|d\/?e|risk|quick|current ratio|interest coverage/i);
  const newsSignal = getNewsSentimentSummary(input.signals);

  return [
    {
      Icon: AlertTriangle,
      title: "Valuation risk",
      copy: valuation
        ? buildMetricComparisonCopy(
            valuation,
            "Valuation read",
            "If the multiple is rich versus peers, the market will need cleaner growth, margin resilience, or earnings visibility to keep supporting it.",
          )
        : `${input.rangeRead.meaning} With no clean valuation ratio in the feed, the honest read is range, peer action, and whether fresh numbers confirm the move.`,
      stripe: "bg-metric-red",
    },
    {
      Icon: TrendingDown,
      title: "Earnings risk",
      copy: quality
        ? buildMetricComparisonCopy(
            quality,
            "Quality read",
            "The question is whether earnings quality can keep pace once margins, deal momentum, and cash conversion are refreshed.",
          )
        : `${input.marketRead.meaning} Profitability data is incomplete, so earnings commentary, margin direction, and peer execution deserve more weight than a single daily move.`,
      stripe: "bg-metric-pink",
    },
    {
      Icon: Bolt,
      title: "Market timing",
      copy: [
        `Latest market print: ${formatTimestamp(input.marketData?.asOf ?? null)}.`,
        input.volumeRead.meaning,
        balanceSheet ? `Balance-sheet read: ${balanceSheet[0]} is ${balanceSheet[1]} versus sector median ${balanceSheet[3]}.` : null,
        newsSignal.label !== "No News" ? `The matched news flow is ${newsSignal.label.toLowerCase()} (${newsSignal.detail}).` : null,
      ]
        .filter(Boolean)
        .join(" "),
      stripe: "bg-metric-green",
    },
  ];
}

function buildWhatThisMeans(input: {
  marketData: MarketSnapshot | undefined;
  marketRead: AnalysisRead;
  rangeRead: AnalysisRead;
  volumeRead: AnalysisRead;
  metrics: Array<[string, string, string, string]>;
  signals: TradientSignal | null;
  metricBrief: string;
}) {
  const valuation = getMetricSignal(input.metrics, /p\/?e|valuation|ev/i);
  const quality = getMetricSignal(input.metrics, /roe|roce|margin|profit|quality/i);
  const balanceSheet = getMetricSignal(input.metrics, /debt|d\/?e|risk|quick|current ratio|interest coverage/i);
  const newsSignal = getNewsSentimentSummary(input.signals);
  const technical = input.signals?.technicals[0];
  const fundamentals = [
    valuation ? `valuation reads as ${valuation}` : null,
    quality ? `quality reads as ${quality}` : null,
    balanceSheet ? `risk/liquidity reads as ${balanceSheet}` : null,
  ]
    .filter(Boolean)
    .join("; ");

  if (fundamentals || technical || newsSignal.label !== "No News") {
    return [
      input.marketRead.meaning,
      input.rangeRead.meaning,
      fundamentals ? `On fundamentals, ${fundamentals}.` : null,
      technical ? `Technically, ${technical.label} at ${technical.value} says this: ${technical.meaning}` : null,
      newsSignal.label !== "No News" ? `News flow is ${newsSignal.label.toLowerCase()} (${newsSignal.detail}).` : null,
      fundamentals
        ? "The cleaner conclusion comes from alignment: price, peer action, business quality, balance-sheet comfort, and news should be read together."
        : "Until deeper fundamentals arrive, the cleanest read is whether price, volume, peers, technicals, and news are telling the same story.",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return input.metricBrief;
}

function getMetricTuple(metrics: Array<[string, string, string, string]>, pattern: RegExp) {
  const metric = metrics.find(([label, value]) => pattern.test(label) && value !== "N/A" && isFundamentalMetricLabel(label));
  return metric ?? null;
}

function buildMetricComparisonCopy(
  metric: [string, string, string, string],
  prefix: string,
  implication: string,
) {
  const [label, value, yoy, median] = metric;
  const comparison = getMetricComparison(value, median);
  const movement = isMeaningfulMetricMovement(yoy) ? ` ${yoy} YoY.` : "";
  return `${prefix}: ${label} is ${value}${median && median !== "N/A" ? ` versus sector median ${median}` : ""}${comparison}.${movement} ${implication}`;
}

function getMetricComparison(value: string, median: string) {
  const companyValue = parseMetricNumber(value);
  const medianValue = parseMetricNumber(median);
  if (companyValue === null || medianValue === null || medianValue === 0) {
    return "";
  }

  if (medianValue < 0 && companyValue >= 0) {
    return ", above a weak sector benchmark";
  }

  const gap = ((companyValue - medianValue) / Math.abs(medianValue)) * 100;
  if (gap >= 15) {
    return ", a visible premium to the benchmark";
  }
  if (gap <= -15) {
    return ", a visible discount to the benchmark";
  }
  return ", broadly close to the benchmark";
}

function parseMetricNumber(value: string) {
  const parsed = Number.parseFloat(value.replace(/,/g, "").replace(/%/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function getMetricSignal(metrics: Array<[string, string, string, string]>, pattern: RegExp) {
  const metric = metrics.find(([label]) => pattern.test(label) && isFundamentalMetricLabel(label));
  if (!metric || metric[1] === "N/A") {
    return null;
  }

  const [, value, yoy, median] = metric;
  const comparison = median && median !== "N/A" ? `versus peer median ${median}` : "with no peer median supplied";
  const movement = isMeaningfulMetricMovement(yoy) ? `, ${yoy} YoY` : "";
  return `${value}${movement}, ${comparison}`;
}

function isMeaningfulMetricMovement(value: string) {
  return Boolean(value && value !== "N/A" && value.toLowerCase() !== "current");
}

function lowercaseFirst(value: string) {
  return value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value;
}

function buildClosingRead(input: {
  marketRead: AnalysisRead;
  rangeRead: AnalysisRead;
  hasFundamentals: boolean;
  hasNews: boolean;
  hasTechnicals: boolean;
}) {
  if (!input.hasFundamentals) {
    return "For now, this is a market-tape read: price, range, peers, technicals, and news can explain the setup, while valuation and quality need a deeper fundamentals feed before durability can be judged.";
  }

  if (input.hasNews && input.hasTechnicals) {
    return "The useful read is whether price, news, and technicals are confirming each other. One headline or one ratio is rarely enough.";
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
      meaning: "The current price move is unavailable from the provider, so the first issue is data completeness rather than momentum.",
    };
  }

  if (change >= 2) {
    return {
      label: "Market Signal: Strong Move",
      meaning: `The stock is up ${formatPercent(change)} today. That is a meaningful move; volume and peer action decide whether it has real depth or is just a sharp daily print.`,
    };
  }

  if (change <= -2) {
    return {
      label: "Market Signal: Weak Move",
      meaning: `The stock is down ${formatPercent(change)} today, so sellers are setting the near-term tone. The next check is whether peers are also weak or this is company-specific pressure.`,
    };
  }

  return {
    label: "Market Signal: Normal Range",
    meaning: `The stock is moving ${formatPercent(change)} today, which is a moderate move. Volume, range position, and peer behaviour decide whether it is worth reading into.`,
  };
}

function getRangeRead(marketData: MarketSnapshot | undefined): AnalysisRead {
  const price = marketData?.price;
  const high = marketData?.fiftyTwoWeekHigh;
  const low = marketData?.fiftyTwoWeekLow;
  if (price === null || price === undefined || high === null || high === undefined || low === null || low === undefined || high === low) {
    return {
      label: "Range Context: Unavailable",
      meaning: "The 52-week range is incomplete, so the report cannot place the price inside its recent trading band yet.",
    };
  }

  const position = ((price - low) / (high - low)) * 100;
  if (position >= 75) {
    return {
      label: "Range Context: Upper Band",
      meaning: `The current price sits around ${position.toFixed(0)}% through its 52-week range. That puts it closer to the yearly high, where valuation support and earnings delivery matter more.`,
    };
  }

  if (position <= 25) {
    return {
      label: "Range Context: Lower Band",
      meaning: `The current price sits around ${position.toFixed(0)}% through its 52-week range. That puts it near the lower band, where the key question is whether weakness is temporary or fundamental.`,
    };
  }

  return {
    label: "Range Context: Middle Band",
    meaning: `The current price sits around ${position.toFixed(0)}% through its 52-week range. It is not at an obvious extreme, so peers and business quality carry more weight.`,
  };
}

function getVolumeRead(marketData: MarketSnapshot | undefined): AnalysisRead {
  if (!marketData?.volume) {
    return {
      label: "Volume Context: Unavailable",
      meaning: "Volume is unavailable, so the report cannot judge how widely today’s move was participated in.",
    };
  }

  return {
    label: "Volume Context: Available",
    meaning: `${formatNumber(marketData.volume)} shares traded in the latest feed. That helps judge whether the move has participation behind it.`,
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
  const metric = (pattern: RegExp) =>
    input.metrics.find(([label]) => pattern.test(label) && isFundamentalMetricLabel(label));
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
      meaning: valuation ? `${valuation[2]} YoY` : "Awaiting ratios",
      tone: "dark" as const,
    },
    {
      label: "Business Quality",
      value: quality?.[1] ?? "Mixed",
      meaning: quality ? `${quality[0]} vs ${quality[3]}` : "Awaiting ratios",
      tone: "white" as const,
    },
    {
      label: "Debt / Risk",
      value: debt?.[1] ?? "Check",
      meaning: debt ? `${debt[0]} vs ${debt[3]}` : "Awaiting leverage",
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
