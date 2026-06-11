"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarDays, RefreshCcw } from "lucide-react";
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
    <main className="min-h-screen bg-[#0f172a] px-4 py-5 text-[#d8e2f4] sm:px-6 sm:py-7">
      <div className="mx-auto max-w-[1500px]">
        <section className="mb-6 rounded-2xl border border-[#24324a] bg-[#111a33] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.34em] text-[#b8c4ff]">Metric internal</p>
              <h1 className="text-4xl font-black tracking-[-0.05em] text-white sm:text-5xl">Business dashboard</h1>
              <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-[#a9b7cb]">
                Only the core daily product metrics from Metric Finance&apos;s first-party database.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-xl border border-[#24324a] bg-[#0e172a] px-4 py-3 text-sm font-bold text-[#a9b7cb]">
                <span className="h-2 w-2 rounded-full bg-[#5b9bd5] shadow-[0_0_18px_rgba(91,155,213,0.9)]" />
                {updatedLabel}
              </div>
              <label className="inline-flex items-center gap-2 rounded-xl border border-[#24324a] bg-[#0e172a] px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#a9b7cb]">
                <CalendarDays size={16} />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => handleDateChange(event.target.value)}
                  className="bg-transparent text-[#a9b7cb] outline-none [color-scheme:dark]"
                  aria-label="Select dashboard date"
                />
              </label>
              <button
                onClick={() => refresh()}
                className="inline-flex items-center gap-2 rounded-xl border border-[#334155] bg-[#b8c4ff] px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-[#0b1326] transition hover:bg-[#dbe2ff] disabled:opacity-60"
                disabled={loading}
              >
                <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
                {loading ? "Refreshing" : "Refresh"}
              </button>
            </div>
          </div>

          <p className="mt-5 text-sm font-bold text-[#64748b]">{data.dateLabel}</p>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.kpis.map((metric) => (
            <KpiCard key={metric.label} metric={metric} />
          ))}
        </section>

        <section className="rounded-2xl border border-[#24324a] bg-[#111a33] p-6">
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionTitle>Top tickers</SectionTitle>
              <p className="text-sm font-bold text-[#64748b]">Most analysed stocks on the selected day.</p>
            </div>
          </div>

          {data.topTickers.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {data.topTickers.map((row, index) => (
                <article
                  key={row.ticker}
                  className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-4 rounded-xl border border-[#24324a] bg-[#0e172a] px-4 py-4"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#334155] bg-[#111a33] text-sm font-black text-[#b8c4ff]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-lg font-black tracking-[-0.02em] text-white">{row.ticker}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-[#64748b]">Ticker demand</p>
                  </div>
                  <p className="text-2xl font-black text-[#45e5d2]">{row.analyses.toLocaleString("en-IN")}</p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState>No ticker analyses for this date.</EmptyState>
          )}
        </section>

        <p className="mt-5 text-center text-xs font-bold text-[#64748b]">
          Auto-refreshes every 2 min · All dates use IST · Server-side metrics only
        </p>
      </div>
    </main>
  );
}

function KpiCard({ metric }: { metric: DashboardKpi }) {
  const toneClass = {
    good: "text-[#45e5d2]",
    bad: "text-[#fb7185]",
    neutral: "text-white",
  }[metric.tone];

  return (
    <article className="rounded-2xl border border-[#24324a] bg-[#111a33] p-5 shadow-[0_16px_50px_rgba(0,0,0,0.18)]">
      <p className="mb-3 text-sm font-black text-[#7d8ca8]">{metric.label}</p>
      <p className={`text-5xl font-black tracking-[-0.05em] ${toneClass}`}>{metric.value}</p>
      <p className="mt-4 min-h-10 text-sm font-semibold leading-5 text-[#64748b]">{metric.detail}</p>
    </article>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-black uppercase tracking-[0.28em] text-[#b8c4ff]">{children}</h2>;
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-[#24324a] bg-[#0e172a] px-4 py-8 text-sm font-semibold text-[#64748b]">{children}</p>;
}
