import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { AlertTriangle, Bolt, RefreshCw, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ReportViewEvent } from "@/components/analytics-events";
import { ShareReportButton } from "@/components/share-report-button";
import { getPeerComparisonLabels, shouldReplacePeerLabels } from "@/domain/competitors";
import { getReportViewForTicker } from "@/domain/report-cache";
import { resolveTickerQuery } from "@/domain/ticker-resolver";
import { getMarketDataService } from "@/services/marketData";
import type { MarketSnapshot } from "@/services/marketData/types";
import { getTradientSignals } from "@/services/tradient";
import type { TradientSignal } from "@/services/tradient";
import { notFound } from "next/navigation";
import { getVisitorMetadata } from "@/lib/request-metadata";

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
  const sector = resolved.ok ? (resolved.data.sector ?? resolved.data.industry ?? null) : null;
  const title = `${reportTicker} Stock Analysis: Fundamentals, Price & News | Metric Finance`;
  const path = `/r/${encodeURIComponent(reportTicker)}`;

  const sectorStr = sector ?? null;

  const description = [
    `${companyName} analysis.`,
    sectorStr ? `${sectorStr} sector.` : null,
    `Get Metric Finance's AI-powered brief: fundamentals, peer comparison, price action, and news sentiment.`,
  ].filter(Boolean).join(" ");

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: "Metric Finance", type: "article" },
    twitter: { card: "summary", title, description },
  };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { ticker } = await params;
  const resolved = await resolveTickerQuery(decodeURIComponent(ticker));
  if (!resolved.ok) notFound();

  const headerStore = await headers();
  const reportView = await getReportViewForTicker(resolved.data.ticker, {
    visitor: getVisitorMetadata(headerStore),
  });
  const report = reportView.payload;
  const freshMarketData = shouldFetchFreshMarketData(reportView.generatedAt)
    ? await getFreshMarketData(resolved.data.ticker, resolved.data.symbol)
    : null;
  const marketData = freshMarketData ?? reportView.sourceData?.marketData;
  const displayPrice =
    marketData?.price !== null && marketData?.price !== undefined ? formatPrice(marketData.price) : report.price;
  const displayDayChange =
    marketData?.dayChangePercent !== null && marketData?.dayChangePercent !== undefined
      ? formatPercent(marketData.dayChangePercent)
      : report.dayChange;
  const isDayUp = (marketData?.dayChangePercent ?? 0) >= 0;
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
  const tradientSignals = await getTradientSignals({ ticker: resolved.data.ticker, companyName: report.companyName });
  const signals = tradientSignals.ok ? tradientSignals.data : null;

  const aiInsights = report.insights ?? null;
  const aiMetricBrief = report.metricBrief ?? null;

  const templateMetricBrief = buildMetricBrief({
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
  const metricBrief = aiMetricBrief ?? templateMetricBrief;
  const signalTiles = buildSignalTiles({ displayDayChange, marketData, marketRead, rangeRead, volumeRead, metrics: displayMetrics, signals });
  const newsCounts = getNewsSentimentCounts(signals?.news ?? []);
  const newsTotal = Math.max(1, (signals?.news ?? []).length);
  const newsPrimary = newsCounts.positive > newsCounts.negative && newsCounts.positive >= newsCounts.neutral
    ? "Positive"
    : newsCounts.negative > newsCounts.positive && newsCounts.negative >= newsCounts.neutral
      ? "Negative"
      : (signals?.news ?? []).length ? "Neutral" : "No News";
  const templateRiskCards = buildRiskCards({ marketData, marketRead, rangeRead, volumeRead, metrics: displayMetrics, signals });
  const riskCards = templateRiskCards.map((card, i) => {
    const aiCopy = i === 0 ? aiInsights?.valuationRisk : i === 1 ? aiInsights?.earningsRisk : aiInsights?.marketTiming;
    return aiCopy ? { ...card, copy: aiCopy } : card;
  });
  const verdict = aiInsights?.whatThisMeans ?? null;
  const rangePositionText = aiInsights?.rangePosition ?? rangeRead.meaning;
  const newsContextText = aiInsights?.newsContext ?? null;
  const rangePos = getRangePosition(marketData);

  const G = "rgba(255,255,255,0.08)"; // glass border shorthand

  return (
    <main className="report-page relative min-h-screen flex flex-col">
      <ReportViewEvent ticker={report.ticker} companyName={report.companyName} />

      {/* Full-screen dark background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundColor: "#0b1326",
          backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      {/* Atmosphere glows */}
      <div className="fixed top-[-5%] left-[-10%] w-[50%] h-[40%] rounded-full pointer-events-none -z-10" style={{ background: "rgba(184,196,255,0.07)", filter: "blur(80px)" }} />
      <div className="fixed bottom-[-5%] right-[-10%] w-[40%] h-[30%] rounded-full pointer-events-none -z-10" style={{ background: "rgba(77,224,130,0.04)", filter: "blur(80px)" }} />

      {/* Top nav */}
      <header
        className="w-full h-16 sticky top-0 z-50 flex items-center justify-between"
        style={{ background: "rgba(11,19,38,0.85)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${G}`, paddingLeft: "2.5rem", paddingRight: "2.5rem" }}
      >
        <Link href="/" className="text-white font-bold text-2xl tracking-tight">
          Metric
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href={`/analyze/${report.ticker}?refresh=1`}
            className="p-2 rounded-full hover:bg-white/5 transition-colors text-[#8e909f]"
            aria-label="Refresh analysis"
          >
            <RefreshCw size={18} strokeWidth={1.8} />
          </Link>
          <ShareReportButton
            ticker={report.ticker}
            companyName={report.companyName}
            iconOnly
            iconSize={18}
            className="p-2 rounded-full hover:bg-white/5 transition-colors text-[#8e909f]"
          />
        </div>
      </header>

      {/* Content — single column on mobile, full-width dashboard on desktop */}
      <div className="mx-auto w-full max-w-[430px] lg:max-w-[1320px] px-4 lg:px-10 pt-6 lg:pt-10 pb-24 flex flex-col gap-5 lg:gap-6">

        {/* ── Hero header ── */}
        <div className="lg:flex lg:items-end lg:justify-between lg:gap-8">
          <div className="lg:flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <span
                className="px-2 py-0.5 rounded text-[9px] font-bold tracking-widest text-[#a8b8ff]"
                style={{ background: "rgba(30,64,175,0.6)", border: "1px solid rgba(168,184,255,0.3)" }}
              >
                {report.ticker}
              </span>
              {marketData?.sector && (
                <span className="text-[9px] text-[#8e909f] px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)" }}>
                  {marketData.sector}
                </span>
              )}
              <span className="text-[#8e909f] text-[9px] ml-auto lg:ml-3">{formatTimestamp(marketData?.asOf ?? null)}</span>
            </div>
            <h1 className="text-[1.75rem] lg:text-4xl font-bold leading-tight text-white mb-5 lg:mb-0 tracking-tight">
              {report.companyName}
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:gap-4 lg:w-[420px] lg:shrink-0">
            <div className="glass-panel p-4 flex flex-col">
              <span className="text-[9px] text-[#8e909f] uppercase tracking-wider mb-2 font-mono">Current Price</span>
              <div className="text-2xl font-bold text-[#b8c4ff] tracking-tight">{displayPrice}</div>
            </div>
            <div className="glass-panel p-4 flex flex-col">
              <span className="text-[9px] text-[#8e909f] uppercase tracking-wider mb-2 font-mono">Day Change</span>
              <div className={`text-2xl font-bold tracking-tight ${isDayUp ? "text-[#4ade80]" : "text-[#f43f5e]"}`}>
                {displayDayChange}
              </div>
            </div>
          </div>
        </div>

        {/* ── Dashboard grid: main analysis + sidebar on desktop ── */}
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
        <div className="contents lg:flex lg:flex-col lg:gap-6 lg:col-span-2 lg:min-w-0">

        {/* ── Before You Buy ── */}
        <section className="glass-panel p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#b8c4ff]">
              Before You Buy
            </h2>
            <span className="text-[9px] text-[#8e909f] opacity-60 uppercase tracking-widest">Analyst Brief</span>
          </div>
          <p className="text-sm lg:text-[15px] text-[#dae2fd] leading-relaxed mb-5">{report.summary}</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4" style={{ borderTop: `1px solid ${G}` }}>
            {[signalTiles[0], signalTiles[3], signalTiles[6], signalTiles[7]].map((tile) => (
              <div key={tile.label}>
                <p className="text-[9px] text-[#8e909f] uppercase tracking-wider mb-1">{tile.label}</p>
                <p className="text-base font-bold text-[#dae2fd]">{tile.value}</p>
                <p className="text-[9px] text-[#8e909f] mt-0.5">{tile.meaning}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Range Position ── */}
        <section className="glass-panel p-5 lg:p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#dae2fd]">Range Position</h2>
            <span
              className={`px-2 py-0.5 rounded text-[9px] ${
                rangeRead.label.includes("Upper") ? "bg-[#4ade80]/10 text-[#4ade80]"
                  : rangeRead.label.includes("Lower") ? "bg-[#f43f5e]/10 text-[#f43f5e]"
                  : "bg-[#b8c4ff]/10 text-[#b8c4ff]"
              }`}
             
            >
              {rangeRead.label.replace("Range Context: ", "")}
            </span>
          </div>
          <div className="flex justify-between mt-3 text-[10px] text-[#8e909f]">
            <span>{formatPrice(marketData?.fiftyTwoWeekLow ?? null)}</span>
            <span className="text-[#b8c4ff]">{rangePos}% of range</span>
            <span>{formatPrice(marketData?.fiftyTwoWeekHigh ?? null)}</span>
          </div>
          <div className="h-2 rounded-full mt-2 overflow-hidden" style={{ background: "rgba(45,52,73,1)" }}>
            <div className="h-full rounded-full bg-[#b8c4ff] transition-all" style={{ width: `${rangePos}%` }} />
          </div>
          <p className="text-xs text-[#8e909f] mt-3 leading-relaxed">{rangePositionText}</p>
        </section>

        {/* ── Metric Brief ── */}
        <section className="glass-panel p-5 lg:p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#dae2fd]">Metric Brief</h2>
            <Link href={`/analyze/${report.ticker}?refresh=1`} className="p-1.5 text-[#8e909f] rounded-full hover:bg-white/5" aria-label="Refresh">
              <RefreshCw size={14} />
            </Link>
          </div>
          <p className="text-sm text-[#c4c5d5] leading-relaxed">{metricBrief}</p>
        </section>

        {/* ── News Sentiment ── */}
        <section className="glass-panel p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-[#dae2fd]">News Sentiment</h2>
            <span
              className="px-2 py-0.5 rounded-full text-[9px] font-medium text-[#dae2fd]"
              style={{ background: "rgba(45,52,73,1)" }}
            >
              {newsPrimary.toUpperCase()}
            </span>
          </div>
          <div className="flex gap-1 h-1.5 rounded-full overflow-hidden mb-5">
            <div className="bg-[#4ade80] h-full rounded-full" style={{ width: `${(newsCounts.positive / newsTotal) * 100}%` }} />
            <div className="bg-white/20 h-full" style={{ width: `${(newsCounts.neutral / newsTotal) * 100}%` }} />
            <div className="bg-[#f43f5e] h-full rounded-full" style={{ width: `${(newsCounts.negative / newsTotal) * 100}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {([["Positive", newsCounts.positive, "#4ade80"], ["Neutral", newsCounts.neutral, "#8e909f"], ["Negative", newsCounts.negative, "#f43f5e"]] as const).map(([label, count, color]) => (
              <div key={label} className="rounded-lg p-2 text-center" style={{ background: "rgba(23,31,51,0.8)", border: `1px solid ${G}` }}>
                <p className="text-[8px] uppercase tracking-wider" style={{ color }}>{label}</p>
                <p className="text-xl font-bold text-[#dae2fd] mt-1">{count}</p>
              </div>
            ))}
          </div>
          {newsContextText && (
            <p className="text-xs text-[#8e909f] leading-relaxed mb-4">{newsContextText}</p>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            {(signals?.news ?? []).length > 0 ? (
              signals!.news.map((item) => (
                <div key={`${item.title}-${item.publishedAt}`} className="rounded-lg p-3" style={{ background: "rgba(23,31,51,0.8)", border: `1px solid ${G}` }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[8px] font-bold text-[#b8c4ff] uppercase tracking-wider">{item.source}</span>
                    <span className="text-[8px] text-[#8e909f] uppercase">{item.sentiment}</span>
                  </div>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#dae2fd] leading-snug underline decoration-white/20 underline-offset-2 line-clamp-2">
                      {item.title}
                    </a>
                  ) : (
                    <p className="text-sm font-semibold text-[#dae2fd] leading-snug line-clamp-2">{item.title}</p>
                  )}
                  {item.summary && <p className="mt-1.5 text-xs text-[#8e909f] leading-relaxed">{item.summary}</p>}
                </div>
              ))
            ) : (
              <p className="text-xs text-[#8e909f] text-center py-4 lg:col-span-2">No matched headlines in the latest batch.</p>
            )}
          </div>
        </section>
        </div>

        {/* ── Sidebar column on desktop ── */}
        <div className="contents lg:flex lg:flex-col lg:gap-6 lg:min-w-0">

        {/* ── Business Quality ── */}
        <section className="glass-panel p-5">
          <h2 className="text-base font-semibold text-[#dae2fd] mb-4">{hasFundamentalData ? "Business Quality" : "Market Feed"}</h2>
          <div className="space-y-4">
            {displayMetrics.slice(0, 6).map(([label, value, yoy, median]) => {
              const hasYoY = isMeaningfulMetricMovement(yoy);
              const hasMedian = Boolean(median && median !== "N/A");
              return (
                <div key={label} className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-[#8e909f] uppercase tracking-wider">{label}</p>
                    <p className="text-2xl font-bold text-[#dae2fd] mt-0.5">{value}</p>
                  </div>
                  <div className="text-right text-[9px]">
                    {hasYoY && <p className={yoy.startsWith("-") ? "text-[#f43f5e]" : "text-[#4ade80]"}>{yoy}</p>}
                    {hasMedian && <p className="text-[#8e909f] mt-0.5">Median {median}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Signal Grid (4 key tiles) ── */}
        <section>
          <p className="text-[9px] text-[#8e909f] font-mono uppercase tracking-widest mb-3">Live Signals</p>
          <div className="grid grid-cols-2 gap-3">
            {[signalTiles[0], signalTiles[3], signalTiles[6], signalTiles[7]].map((tile) => (
              <div
                key={tile.label}
                className="glass-panel p-4"
                style={
                  tile.tone === "accent" ? { background: "rgba(55,85,195,0.18)", borderColor: "rgba(184,196,255,0.2)" }
                    : tile.tone === "dark" ? { background: "rgba(6,14,32,0.8)" }
                    : {}
                }
              >
                <p className="text-[9px] text-[#8e909f] font-mono uppercase tracking-wider">{tile.label}</p>
                <p className="mt-2 text-base font-bold text-[#dae2fd] break-words leading-tight">{tile.value}</p>
                <p className="mt-1.5 text-[10px] text-[#8e909f] leading-tight">{tile.meaning}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Peer Lens ── */}
        <section className="glass-panel p-5">
          <h2 className="text-base font-semibold text-[#dae2fd] mb-4">Peer Lens</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ borderBottom: `1px solid ${G}` }}>
                  <th className="pb-2 text-[#8e909f] uppercase text-[9px] tracking-wider">Stock</th>
                  <th className="pb-2 text-[#8e909f] uppercase text-[9px] tracking-wider text-right">Price</th>
                  <th className="pb-2 text-[#8e909f] uppercase text-[9px] tracking-wider text-right">Change</th>
                  <th className="pb-2 text-[#8e909f] uppercase text-[9px] tracking-wider text-right">Volume</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                  <td className="py-2.5 text-[#b8c4ff] font-bold">{report.ticker}</td>
                  <td className="py-2.5 text-right text-[#dae2fd]">{displayPrice}</td>
                  <td className={`py-2.5 text-right font-bold ${isDayUp ? "text-[#4ade80]" : "text-[#f43f5e]"}`}>{displayDayChange}</td>
                  <td className="py-2.5 text-right text-[#8e909f]">{formatNumber(marketData?.volume ?? null)}</td>
                </tr>
                {displayPeers.slice(1).map((peer, i) => {
                  const snap = peerSnapshots[i];
                  const peerUp = (snap?.dayChangePercent ?? 0) >= 0;
                  return (
                    <tr key={peer} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                      <td className="py-2.5 text-[#8e909f]">{peer}</td>
                      <td className="py-2.5 text-right text-[#8e909f]">{formatPrice(snap?.price ?? null)}</td>
                      <td className={`py-2.5 text-right ${snap?.dayChangePercent !== null && snap?.dayChangePercent !== undefined ? (peerUp ? "text-[#4ade80]" : "text-[#f43f5e]") : "text-[#8e909f]"}`}>
                        {formatPercent(snap?.dayChangePercent ?? null)}
                      </td>
                      <td className="py-2.5 text-right text-[#8e909f]">{formatNumber(snap?.volume ?? null)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Technical Signals ── */}
        {(signals?.technicals?.length ?? 0) > 0 && (
          <section className="glass-panel p-5">
            <h2 className="text-base font-semibold text-[#dae2fd] mb-4">Technical Signals</h2>
            <div className="space-y-4">
              {signals!.technicals.map((item) => (
                <div key={item.label} className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-[9px] text-[#8e909f] uppercase tracking-wider">{item.label}</p>
                    <p className="text-sm text-[#c4c5d5] mt-1 leading-relaxed">{item.meaning}</p>
                  </div>
                  <span className="text-[#b8c4ff] font-bold text-sm shrink-0">{item.value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        </div>
        </div>

        {/* ── What Could Matter ── */}
        <section className="glass-panel p-5 lg:p-6">
          <h2 className="text-base font-semibold text-[#dae2fd] mb-4">What Could Matter</h2>
          <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-4 lg:items-stretch">
            {riskCards.map(({ Icon, title, copy, stripe }) => {
              const stripeColor = stripe === "bg-metric-red" ? "#f43f5e" : stripe === "bg-metric-pink" ? "#ffb4ab" : "#4ade80";
              return (
                <div key={title} className="relative overflow-hidden rounded-lg p-3 pl-4 lg:p-4 lg:pl-5" style={{ background: "rgba(23,31,51,0.8)", border: `1px solid ${G}` }}>
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ background: stripeColor }} />
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon size={14} strokeWidth={2} style={{ color: stripeColor }} />
                    <p className="text-[10px] font-bold text-[#dae2fd] uppercase tracking-wider">{title}</p>
                  </div>
                  <p className="text-xs text-[#8e909f] leading-relaxed">{copy}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Verdict ── */}
        <section className="rounded-xl p-6 lg:p-8 mb-2" style={{ background: "linear-gradient(135deg, rgba(30,64,175,0.2) 0%, rgba(11,19,38,0.4) 100%)", border: "1px solid rgba(184,196,255,0.25)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-5 rounded-full bg-[#b8c4ff]" />
            <h2 className="text-lg font-bold text-[#b8c4ff] tracking-tight">Analyst Verdict</h2>
          </div>
          {verdict ? (
            <p className="text-sm lg:text-[15px] text-[#c4c5d5] leading-[1.8] mb-6 lg:max-w-4xl">{verdict}</p>
          ) : (
            <p className="text-sm lg:text-[15px] text-[#c4c5d5] leading-[1.8] mb-6 lg:max-w-4xl">
              Claude analyst verdict is refreshing for this ticker. The live signal grid above is still grounded in the latest available market data.
            </p>
          )}
          <ShareReportButton
            ticker={report.ticker}
            companyName={report.companyName}
            className="w-full lg:w-auto lg:px-10 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm text-[#0b1326] bg-[#b8c4ff] hover:bg-[#dde1ff] transition-colors"
          />
        </section>
      </div>

      {/* Footer */}
      <footer
        className="py-6 text-center text-[9px] uppercase tracking-widest mt-auto"
        style={{ borderTop: `1px solid ${G}`, background: "rgba(6,14,32,0.8)" }}
      >
        <p className="text-[#8e909f]">
          Built by{" "}
          <a href="https://www.linkedin.com/in/yashnapandugala/" target="_blank" rel="noreferrer" className="text-[#dae2fd] underline underline-offset-2">Yashna</a>
          {" "}&{" "}
          <a href="https://www.linkedin.com/in/vanshpandita-real/" target="_blank" rel="noreferrer" className="text-[#dae2fd] underline underline-offset-2">Vansh</a>
          {" "}• Not financial advice
        </p>
      </footer>
    </main>
  );
}

function shouldFetchFreshMarketData(generatedAt: Date | undefined) {
  if (!generatedAt) {
    return true;
  }

  return Date.now() - generatedAt.getTime() > 60_000;
}

// ── Data helpers (unchanged) ──────────────────────────────────────────────────

async function getFreshMarketData(ticker: string, symbol: string) {
  const service = getMarketDataService();
  const result = await service.getSnapshot(ticker);
  if (result.ok && result.data.source !== "mock") return result.data;

  const symbolTicker = symbol.replace(/\.(NS|BO)$/i, "");
  if (symbolTicker !== ticker) {
    const symbolResult = await service.getSnapshot(symbolTicker);
    if (symbolResult.ok && symbolResult.data.source !== "mock") return { ...symbolResult.data, ticker };
  }
  return undefined;
}

function getDisplayMetrics(reportMetrics: Array<[string, string, string, string]>, marketData: MarketSnapshot | undefined) {
  const fundamentalMetrics = (marketData?.metrics ?? [])
    .filter((metric) => metric.median && isFundamentalMetricLabel(metric.label))
    .map<[string, string, string, string]>((metric) => [metric.label, metric.value, "Current", metric.median ?? "N/A"]);

  if (!fundamentalMetrics.length) return reportMetrics;

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
  const containsKeys = ["peratio","pricetoearnings","pbratio","pricetobook","evebitda","enterprisevaluetoebitda","roa","roe","roce","revenuegrowth","eps","dividendyield","freecashflow","cashconversion","quickratio","currentratio","debttoequity","interestcoverage","altman","piotroski"];
  return exactKeys.includes(normalized) || containsKeys.some((key) => normalized === key || normalized.includes(key)) || normalized.includes("margin") || normalized.includes("profit");
}

async function getPeerSnapshots(peers: string[]) {
  const service = getMarketDataService();
  const snapshots = await Promise.all(peers.map(async (peer) => {
    const result = await service.getSnapshot(peer);
    return result.ok && result.data.source !== "mock" ? result.data : null;
  }));
  return snapshots;
}

function buildMetricBrief(input: {
  ticker: string; companyName: string; marketData: MarketSnapshot | undefined;
  peerLabels: string[]; peerSnapshots: Array<MarketSnapshot | null>;
  metrics: Array<[string, string, string, string]>;
  marketRead: AnalysisRead; rangeRead: AnalysisRead; volumeRead: AnalysisRead;
  signals: TradientSignal | null; reportSummary: string;
}) {
  const { marketData } = input;
  const price = formatPrice(marketData?.price ?? null);
  const change = formatPercent(marketData?.dayChangePercent ?? null);
  const volume = formatNumber(marketData?.volume ?? null);
  const sectorContext = marketData?.sector ?? marketData?.industry ?? "its peer group";
  const peerMoves = input.peerLabels.map((peer, i) => `${peer}: ${formatPercent(input.peerSnapshots[i]?.dayChangePercent ?? null)}`).filter((m) => !m.endsWith("N/A")).join(", ");
  const valuation = getMetricSignal(input.metrics, /p\/?e|valuation|ev/i);
  const quality = getMetricSignal(input.metrics, /roe|roce|margin|profit|quality/i);
  const leverage = getMetricSignal(input.metrics, /debt|d\/?e|risk|coverage/i);
  const technical = input.signals?.technicals[0];
  const leadNews = input.signals?.news[0];

  const setupSentence = `${input.companyName} is trading at ${price}, a ${change} day move, with ${volume} shares changing hands.`;
  const rangeSentence = input.rangeRead.meaning.replace(/^The current price is /, "It is ").replace(/^That puts /, "Range context: ");
  const peerSentence = peerMoves ? `Peer context matters here: ${peerMoves}. That helps separate a company-specific move from a broader ${sectorContext} tape.` : "Peer data is thin, so the read has to lean more on price, volume, range position, and news flow.";
  const fundamentalsSentence = [valuation ? `valuation: ${valuation}` : null, quality ? `quality: ${quality}` : null, leverage ? `risk: ${leverage}` : null].filter(Boolean).join("; ");
  const evidenceSentence = fundamentalsSentence ? `The available fundamentals add ${fundamentalsSentence}.` : `The quote feed has not supplied full valuation, profitability, and balance-sheet ratios yet, so the durability of the move cannot be judged from fundamentals alone.`;
  const signalSentence = [technical ? `${technical.label} is at ${technical.value}; ${lowercaseFirst(technical.meaning)}` : null, leadNews ? `The lead news item is ${leadNews.sentiment.toLowerCase()}: ${leadNews.source} reported "${leadNews.title}".` : null].filter(Boolean).join(" ");
  const analystSentence = buildClosingRead({ marketRead: input.marketRead, rangeRead: input.rangeRead, hasFundamentals: Boolean(fundamentalsSentence), hasNews: Boolean(leadNews), hasTechnicals: Boolean(technical) });

  return [setupSentence, rangeSentence, peerSentence, evidenceSentence, signalSentence, analystSentence].filter(Boolean).join(" ");
}

function buildRiskCards(input: {
  marketData: MarketSnapshot | undefined; marketRead: AnalysisRead; rangeRead: AnalysisRead;
  volumeRead: AnalysisRead; metrics: Array<[string, string, string, string]>; signals: TradientSignal | null;
}): Array<{ Icon: LucideIcon; title: string; copy: string; stripe: string }> {
  const valuation = getMetricTuple(input.metrics, /p\/?e|p\/?b|ev\/?ebitda|valuation/i);
  const quality = getMetricTuple(input.metrics, /roe|roce|margin|profit|quality/i);
  const balanceSheet = getMetricTuple(input.metrics, /debt|d\/?e|risk|quick|current ratio|interest coverage/i);
  const newsSignal = getNewsSentimentSummary(input.signals);
  return [
    { Icon: AlertTriangle, title: "Valuation risk", stripe: "bg-metric-red", copy: valuation ? buildMetricComparisonCopy(valuation, "Valuation read", "If the multiple is rich versus peers, the market will need cleaner growth, margin resilience, or earnings visibility to keep supporting it.") : `${input.rangeRead.meaning} With no clean valuation ratio in the feed, the honest read is range, peer action, and whether fresh numbers confirm the move.` },
    { Icon: TrendingDown, title: "Earnings risk", stripe: "bg-metric-pink", copy: quality ? buildMetricComparisonCopy(quality, "Quality read", "The question is whether earnings quality can keep pace once margins, deal momentum, and cash conversion are refreshed.") : `${input.marketRead.meaning} Profitability data is incomplete, so earnings commentary, margin direction, and peer execution deserve more weight than a single daily move.` },
    { Icon: Bolt, title: "Market timing", stripe: "bg-metric-green", copy: [`Latest market print: ${formatTimestamp(input.marketData?.asOf ?? null)}.`, input.volumeRead.meaning, balanceSheet ? `Balance-sheet read: ${balanceSheet[0]} is ${balanceSheet[1]} versus sector median ${balanceSheet[3]}.` : null, newsSignal.label !== "No News" ? `The matched news flow is ${newsSignal.label.toLowerCase()} (${newsSignal.detail}).` : null].filter(Boolean).join(" ") },
  ];
}

function buildSignalTiles(input: { displayDayChange: string; marketData: MarketSnapshot | undefined; marketRead: AnalysisRead; rangeRead: AnalysisRead; volumeRead: AnalysisRead; metrics: Array<[string, string, string, string]>; signals: TradientSignal | null }) {
  const metric = (pattern: RegExp) => input.metrics.find(([label]) => pattern.test(label) && isFundamentalMetricLabel(label));
  const valuation = metric(/p\/?e|p\/?b|ev\/?ebitda|valuation/i);
  const quality = metric(/roe|roce|margin|profit/i);
  const debt = metric(/debt|d\/?e|risk|quick|current ratio|interest coverage/i);
  const technical = input.signals?.technicals[0];
  const newsCount = input.signals?.news.length ?? 0;
  const newsSignal = getNewsSentimentSummary(input.signals);
  return [
    { label: "Price Action", value: input.displayDayChange, meaning: input.marketRead.label.replace("Market Signal: ", ""), tone: "accent" as const },
    { label: "Volume", value: formatNumber(input.marketData?.volume ?? null), meaning: input.volumeRead.label.replace("Volume Context: ", ""), tone: "white" as const },
    { label: "52W Position", value: `${getRangePosition(input.marketData)}%`, meaning: input.rangeRead.label.replace("Range Context: ", ""), tone: "white" as const },
    { label: "Valuation", value: valuation ? formatValuationTileValue(valuation) : "Pending", meaning: valuation ? formatMetricTileContext(valuation, "Current multiple") : "Awaiting ratios", tone: "dark" as const },
    { label: "Business Quality", value: quality?.[1] ?? "Mixed", meaning: quality ? `${quality[0]} vs ${quality[3]}` : "Awaiting ratios", tone: "white" as const },
    { label: "Debt / Risk", value: debt?.[1] ?? "Check", meaning: debt ? `${debt[0]} vs ${debt[3]}` : "Awaiting leverage", tone: "white" as const },
    { label: "Technical Setup", value: technical?.value ?? "N/A", meaning: technical?.label ?? "Tradient signal", tone: "accent" as const },
    { label: "News Signal", value: newsSignal.label, meaning: newsCount ? `${newsSignal.detail} · ${newsCount} matched` : "No exact match", tone: "white" as const },
  ];
}

function formatValuationTileValue(metric: [string, string, string, string]) {
  const [label, value] = metric;
  const shortLabel = label
    .replace(/ ratio$/i, "")
    .replace(/^price[- ]?to[- ]?/i, "P/")
    .replace(/^enterprise value ?\/ ?ebitda$/i, "EV/EBITDA");
  const unitValue = /p\/?e|p\/?b|ev\/?ebitda|ratio|valuation/i.test(label) && /^-?\d+(\.\d+)?$/.test(value)
    ? `${value}x`
    : value;
  return `${shortLabel} ${unitValue}`;
}

function formatMetricTileContext(metric: [string, string, string, string], fallback: string) {
  const [, , yoy, median] = metric;
  if (isMeaningfulMetricMovement(yoy)) return `${yoy} YoY`;
  if (median && median !== "N/A") return `Median ${median}`;
  return fallback;
}

function getRangePosition(marketData: MarketSnapshot | undefined) {
  const price = marketData?.price;
  const high = marketData?.fiftyTwoWeekHigh;
  const low = marketData?.fiftyTwoWeekLow;
  if (price == null || high == null || low == null || high === low) return 0;
  return Math.min(100, Math.max(0, Math.round(((price - low) / (high - low)) * 100)));
}

function getMetricTuple(metrics: Array<[string, string, string, string]>, pattern: RegExp) {
  return metrics.find(([label, value]) => pattern.test(label) && value !== "N/A" && isFundamentalMetricLabel(label)) ?? null;
}

function buildMetricComparisonCopy(metric: [string, string, string, string], prefix: string, implication: string) {
  const [label, value, yoy, median] = metric;
  const companyValue = parseMetricNumber(value);
  const medianValue = parseMetricNumber(median);
  let comparison = "";
  if (companyValue !== null && medianValue !== null && medianValue !== 0) {
    if (medianValue < 0 && companyValue >= 0) comparison = ", above a weak sector benchmark";
    else { const gap = ((companyValue - medianValue) / Math.abs(medianValue)) * 100; comparison = gap >= 15 ? ", a visible premium to the benchmark" : gap <= -15 ? ", a visible discount to the benchmark" : ", broadly close to the benchmark"; }
  }
  const movement = isMeaningfulMetricMovement(yoy) ? ` ${yoy} YoY.` : "";
  return `${prefix}: ${label} is ${value}${median && median !== "N/A" ? ` versus sector median ${median}` : ""}${comparison}.${movement} ${implication}`;
}

function parseMetricNumber(value: string) {
  const parsed = Number.parseFloat(value.replace(/,/g, "").replace(/%/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function getMetricSignal(metrics: Array<[string, string, string, string]>, pattern: RegExp) {
  const metric = metrics.find(([label]) => pattern.test(label) && isFundamentalMetricLabel(label));
  if (!metric || metric[1] === "N/A") return null;
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

function buildClosingRead(input: { marketRead: AnalysisRead; rangeRead: AnalysisRead; hasFundamentals: boolean; hasNews: boolean; hasTechnicals: boolean }) {
  if (!input.hasFundamentals) return "For now, this is a market-tape read: price, range, peers, technicals, and news can explain the setup, while valuation and quality need a deeper fundamentals feed before durability can be judged.";
  if (input.hasNews && input.hasTechnicals) return "The useful read is whether price, news, and technicals are confirming each other. One headline or one ratio is rarely enough.";
  return `${input.marketRead.meaning} ${input.rangeRead.meaning}`;
}

type AnalysisRead = { label: string; meaning: string };

function getMarketRead(marketData: MarketSnapshot | undefined): AnalysisRead {
  const change = marketData?.dayChangePercent;
  if (change == null) return { label: "Market Signal: Incomplete", meaning: "The current price move is unavailable from the provider, so the first issue is data completeness rather than momentum." };
  if (change >= 2) return { label: "Market Signal: Strong Move", meaning: `The stock is up ${formatPercent(change)} today. That is a meaningful move; volume and peer action decide whether it has real depth or is just a sharp daily print.` };
  if (change <= -2) return { label: "Market Signal: Weak Move", meaning: `The stock is down ${formatPercent(change)} today, so sellers are setting the near-term tone. The next check is whether peers are also weak or this is company-specific pressure.` };
  return { label: "Market Signal: Normal Range", meaning: `The stock is moving ${formatPercent(change)} today, which is a moderate move. Volume, range position, and peer behaviour decide whether it is worth reading into.` };
}

function getRangeRead(marketData: MarketSnapshot | undefined): AnalysisRead {
  const price = marketData?.price;
  const high = marketData?.fiftyTwoWeekHigh;
  const low = marketData?.fiftyTwoWeekLow;
  if (price == null || high == null || low == null || high === low) return { label: "Range Context: Unavailable", meaning: "The 52-week range is incomplete, so the report cannot place the price inside its recent trading band yet." };
  const position = getRangePosition(marketData);
  if (position >= 75) return { label: "Range Context: Upper Band", meaning: `The current price sits around ${position.toFixed(0)}% through its 52-week range. That puts it closer to the yearly high, where valuation support and earnings delivery matter more.` };
  if (position <= 25) return { label: "Range Context: Lower Band", meaning: `The current price sits around ${position.toFixed(0)}% through its 52-week range. That puts it near the lower band, where the key question is whether weakness is temporary or fundamental.` };
  return { label: "Range Context: Middle Band", meaning: `The current price sits around ${position.toFixed(0)}% through its 52-week range. It is not at an obvious extreme, so peers and business quality carry more weight.` };
}

function getVolumeRead(marketData: MarketSnapshot | undefined): AnalysisRead {
  if (!marketData?.volume) return { label: "Volume Context: Unavailable", meaning: "Volume is unavailable, so the report cannot judge how widely today's move was participated in." };
  return { label: "Volume Context: Available", meaning: `${formatNumber(marketData.volume)} shares traded in the latest feed. That helps judge whether the move has participation behind it.` };
}

function getNewsSentimentCounts(news: TradientSignal["news"]) {
  return news.reduce((acc, item) => {
    const s = item.sentiment.toLowerCase();
    if (s.includes("positive")) acc.positive += 1;
    else if (s.includes("negative")) acc.negative += 1;
    else acc.neutral += 1;
    return acc;
  }, { positive: 0, neutral: 0, negative: 0 });
}

function getNewsSentimentSummary(signals: TradientSignal | null) {
  const news = signals?.news ?? [];
  const counts = getNewsSentimentCounts(news);
  if (!news.length) return { label: "No News", detail: "No matched headlines" };
  if (counts.positive > counts.negative && counts.positive >= counts.neutral) return { label: "Positive", detail: `${counts.positive} positive / ${counts.neutral} neutral / ${counts.negative} negative` };
  if (counts.negative > counts.positive && counts.negative >= counts.neutral) return { label: "Negative", detail: `${counts.positive} positive / ${counts.neutral} neutral / ${counts.negative} negative` };
  return { label: "Neutral", detail: `${counts.positive} positive / ${counts.neutral} neutral / ${counts.negative} negative` };
}

function formatPrice(value: number | null) {
  if (value === null) return "N/A";
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)}`;
}

function formatPercent(value: number | null) {
  if (value === null) return "N/A";
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatNumber(value: number | null) {
  if (value === null) return "N/A";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

function formatTimestamp(value: string | null) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
}
