"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Activity, CalendarDays, Clock3 } from "lucide-react";
import type { DashboardData, DashboardKpi } from "@/lib/dashboard-data";

const REFRESH_MS = 2 * 60 * 1000;

export function BusinessDashboard({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date(initialData.generatedAt));
  const [selectedDate, setSelectedDate] = useState(initialData.selectedDate);

  const refresh = useCallback(async (date = selectedDate) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard?date=${encodeURIComponent(date)}`, { cache: "no-store" });
      if (response.ok) {
        const nextData = (await response.json()) as DashboardData;
        setData(nextData);
        setSelectedDate(nextData.selectedDate);
        setLastUpdated(new Date(nextData.generatedAt));
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    const interval = window.setInterval(() => refresh(selectedDate), REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [refresh, selectedDate]);

  async function handleDateChange(value: string) {
    setSelectedDate(value);
    const url = new URL(window.location.href);
    url.searchParams.set("date", value);
    window.history.replaceState(null, "", url.toString());
    await refresh(value);
  }

  const updatedLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(lastUpdated),
    [lastUpdated],
  );

  return (
    <main className="min-h-screen bg-[#e7eff7] px-4 py-5 text-[#d8e2f4] sm:px-6 sm:py-7">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="mx-auto max-w-[1540px]">
        <header className="mb-5 rounded-[22px] border border-[#b8c4ff]/25 bg-[#111a33] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-[#b8c4ff]">Metric internal</p>
              <h1 className="text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">Business dashboard</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#c4c5d5]">
                Product usage, report generation health, and the business signals that should guide the next changes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#b8c4ff]/20 bg-[#0b1326] px-4 py-2 text-sm font-bold text-[#c4c5d5]">
                <span className="h-2 w-2 rounded-full bg-[#5b8fd8] shadow-[0_0_18px_rgba(91,143,216,0.95)]" />
                {updatedLabel}
              </div>
              <label className="inline-flex items-center gap-2 rounded-xl border border-[#b8c4ff]/25 bg-[#0b1326] px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#c4c5d5]">
                <CalendarDays size={16} />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => handleDateChange(event.target.value)}
                  className="bg-transparent text-[#c4c5d5] outline-none [color-scheme:dark]"
                  aria-label="Select dashboard date"
                />
              </label>
              <button
                onClick={() => refresh()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#b8c4ff] px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#0b1326] transition hover:bg-[#dde1ff] disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Refreshing" : "Refresh"}
              </button>
            </div>
          </div>
        </header>

        <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {data.kpis.map((metric) => (
            <KpiCard key={metric.label} metric={metric} />
          ))}
        </section>

        <section className="mb-5 rounded-[22px] border border-[#b8c4ff]/20 bg-[#111a33] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <SectionTitle>Analysis funnel</SectionTitle>
          <div className="grid gap-4 xl:grid-cols-4">
            {data.funnel.map((step, index) => (
              <div key={step.label} className="relative">
                <div className="rounded-xl border border-[#b8c4ff]/20 bg-[#0b1326] px-4 py-3 text-center">
                  <p className="text-2xl font-black text-[#4ee7d8]">{step.value.toLocaleString("en-IN")}</p>
                </div>
                <p className="mt-2 text-center text-sm font-bold text-[#8e9ab5]">{step.label}</p>
                {index > 0 ? (
                  <p className="absolute -left-6 top-4 hidden text-xs font-black text-[#8e9ab5] xl:block">
                    {formatPercent(step.rateFromPrevious)} →
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="mb-5 rounded-[22px] border border-[#b8c4ff]/20 bg-[#111a33] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <div className="mb-4 flex items-center gap-2">
            <Activity size={18} className="text-[#b8c4ff]" />
            <SectionTitle className="mb-0">Main product reads</SectionTitle>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.insights.map((insight) => (
              <p key={insight} className="rounded-xl border border-[#b8c4ff]/15 bg-[#0b1326] p-4 text-sm font-semibold leading-6 text-[#c4c5d5]">
                {insight}
              </p>
            ))}
          </div>
        </section>

        <div className="mb-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[22px] border border-[#b8c4ff]/20 bg-[#111a33] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
            <SectionTitle>Top ticker demand</SectionTitle>
            <div className="space-y-3">
              {data.topTickers.length ? data.topTickers.map((row, index) => (
                <div key={row.ticker} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-xl border border-[#b8c4ff]/15 bg-[#0b1326] px-4 py-3">
                  <span className="text-xs font-black text-[#8e9ab5]">#{index + 1}</span>
                  <div>
                    <p className="text-base font-black text-white">{row.ticker}</p>
                    <p className="text-xs font-semibold text-[#8e9ab5]">{row.ready} ready · {formatMs(row.avgDurationMs)} avg</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-[#24314f]">
                      <div className="h-full rounded-full bg-[#b8c4ff]" style={{ width: `${Math.min(100, row.analyses * 12)}%` }} />
                    </div>
                    <span className="w-8 text-right text-sm font-black text-[#d8e2f4]">{row.analyses}</span>
                  </div>
                </div>
              )) : <EmptyState>No ticker searches yet</EmptyState>}
            </div>
          </section>

          <section className="rounded-[22px] border border-[#b8c4ff]/20 bg-[#111a33] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
            <SectionTitle>Data provider health</SectionTitle>
            <div className="space-y-3">
              {data.providerMix.length ? data.providerMix.map((row) => (
                <div key={row.provider} className="flex items-center justify-between rounded-xl border border-[#b8c4ff]/15 bg-[#0b1326] px-4 py-3">
                  <span className="text-sm font-black text-[#c4c5d5]">{row.provider}</span>
                  <span className="text-base font-black text-white">{row.reports}</span>
                </div>
              )) : <EmptyState>No saved reports yet</EmptyState>}
            </div>
          </section>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[22px] border border-[#b8c4ff]/20 bg-[#111a33] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
            <SectionTitle>Latest analyses</SectionTitle>
            <div className="grid gap-3 md:grid-cols-2">
              {data.latestJobs.length ? data.latestJobs.map((job, index) => (
                <div key={`${job.ticker}-${job.completedAt}-${index}`} className="rounded-xl border border-[#b8c4ff]/15 bg-[#0b1326] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-lg font-black text-white">{job.ticker}</span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${job.errorMessage ? "bg-[#7f1d1d] text-[#fecaca]" : "bg-[#053d35] text-[#99f6e4]"}`}>
                      {job.cacheHit ? "cache" : job.outcome}
                    </span>
                  </div>
                  <p className="flex items-center gap-2 text-xs font-semibold text-[#8e9ab5]">
                    <Clock3 size={13} />
                    {formatMs(job.durationMs)} · {job.completedAt ? new Date(job.completedAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }) : "pending"}
                  </p>
                  {job.errorMessage ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#fca5a5]">{job.errorMessage}</p> : null}
                </div>
              )) : <EmptyState>No analysis jobs yet</EmptyState>}
            </div>
          </section>

          <section className="rounded-[22px] border border-[#b8c4ff]/20 bg-[#111a33] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
            <SectionTitle>Tracking gaps</SectionTitle>
            <div className="space-y-3">
              {data.trackingGaps.map((gap) => (
                <div key={gap} className="rounded-xl border border-[#b8c4ff]/15 bg-[#0b1326] px-4 py-3 text-sm font-semibold text-[#c4c5d5]">
                  {gap}
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs font-semibold leading-5 text-[#74819e]">
              Auto-refreshes every 2 min · All times in IST · Server-side metrics only
            </p>
          </section>
        </div>

        <section className="mt-5 rounded-[22px] border border-[#b8c4ff]/20 bg-[#111a33] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <SectionTitle>Visitor locations</SectionTitle>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {data.topLocations.length ? data.topLocations.map((location) => (
              <div key={location.label} className="rounded-xl border border-[#b8c4ff]/15 bg-[#0b1326] px-4 py-3">
                <p className="text-sm font-black text-white">{location.label}</p>
                <p className="mt-2 text-xs font-semibold text-[#8e9ab5]">
                  {location.uniqueUsers ? `${location.uniqueUsers.toLocaleString("en-IN")} unique` : "No unique hash"} · {location.analyses.toLocaleString("en-IN")} analyses
                </p>
              </div>
            )) : <EmptyState>No location signal for this date</EmptyState>}
          </div>
        </section>
      </div>
    </main>
  );
}

function KpiCard({ metric }: { metric: DashboardKpi }) {
  const toneClass = {
    good: "text-[#45e5d2]",
    warn: "text-[#fbbf24]",
    bad: "text-[#fb7185]",
    neutral: "text-white",
  }[metric.tone];

  return (
    <article className="rounded-[22px] border border-[#b8c4ff]/20 bg-[#111a33] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
      <p className="mb-3 text-sm font-black text-[#8e9ab5]">{metric.label}</p>
      <p className={`text-4xl font-black tracking-tight ${toneClass}`}>{metric.value}</p>
      <p className="mt-4 text-sm font-semibold leading-5 text-[#8e9ab5]">{metric.detail}</p>
    </article>
  );
}

function SectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`mb-4 text-sm font-black uppercase tracking-[0.22em] text-[#8e9ab5] ${className}`}>
      {children}
    </h2>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-[#b8c4ff]/15 bg-[#0b1326] px-4 py-5 text-sm font-semibold text-[#8e9ab5]">{children}</p>;
}

function formatPercent(value: number | null) {
  if (value === null) return "100%";
  return `${Math.round(value * 100)}%`;
}

function formatMs(value: number | null) {
  if (!value) return "0s";
  if (value < 1000) return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}s`;
}
