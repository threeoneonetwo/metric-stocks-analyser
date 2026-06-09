import { neon } from "@neondatabase/serverless";

export type DashboardKpi = {
  label: string;
  value: string;
  detail: string;
  tone: "good" | "warn" | "bad" | "neutral";
};

export type DashboardFunnelStep = {
  label: string;
  value: number;
  rateFromPrevious: number | null;
};

export type DashboardData = {
  generatedAt: string;
  selectedDate: string;
  dateLabel: string;
  kpis: DashboardKpi[];
  funnel: DashboardFunnelStep[];
  insights: string[];
  topTickers: Array<{
    ticker: string;
    analyses: number;
    ready: number;
    avgDurationMs: number | null;
    failureCount: number;
  }>;
  providerMix: Array<{
    provider: string;
    reports: number;
  }>;
  latestJobs: Array<{
    ticker: string;
    outcome: string;
    cacheHit: boolean;
    durationMs: number | null;
    errorMessage: string | null;
    completedAt: string | null;
  }>;
  topLocations: Array<{
    label: string;
    uniqueUsers: number;
    analyses: number;
  }>;
  trackingGaps: string[];
};

type CountRow = { count: string | number | null };

type SummaryRow = {
  started_today: string | number | null;
  started_24h: string | number | null;
  started_7d: string | number | null;
  unique_searchers_today: string | number | null;
  ready_today: string | number | null;
  ready_24h: string | number | null;
  cache_hits_today: string | number | null;
  cache_hits_24h: string | number | null;
  errors_today: string | number | null;
  errors_24h: string | number | null;
  claude_failures_24h: string | number | null;
  avg_duration_24h: string | number | null;
  p95_duration_24h: string | number | null;
};

type LocationRow = {
  location_label: string | null;
  unique_users: string | number | null;
  analyses: string | number | null;
};

type TopTickerRow = {
  ticker: string;
  analyses: string | number;
  ready: string | number | null;
  avg_duration_ms: string | number | null;
  failure_count: string | number | null;
};

type ProviderRow = {
  provider: string | null;
  reports: string | number;
};

type LatestJobRow = {
  ticker: string;
  outcome: string;
  cache_hit: boolean;
  duration_ms: number | null;
  error_message: string | null;
  completed_at: string | Date | null;
};

export async function getDashboardData(selectedDateInput?: string | null): Promise<DashboardData> {
  const generatedAt = new Date();
  const selectedDate = normalizeDashboardDate(selectedDateInput, generatedAt);
  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${selectedDate}T12:00:00+05:30`));

  if (!process.env.DATABASE_URL) {
    return {
      generatedAt: generatedAt.toISOString(),
      selectedDate,
      dateLabel,
      kpis: [],
      funnel: [],
      insights: ["Database is not connected, so Metric cannot calculate product signals yet."],
      topTickers: [],
      providerMix: [],
      latestJobs: [],
      topLocations: [],
      trackingGaps: ["Unique visitors", "Share clicks", "Scroll depth", "Onboarding completion"],
    };
  }

  const sql = neon(process.env.DATABASE_URL);
  const dayStart = sql`(${selectedDate}::date::timestamp at time zone 'Asia/Kolkata')`;
  const dayEnd = sql`((${selectedDate}::date + interval '1 day')::timestamp at time zone 'Asia/Kolkata')`;

  const [summaryRows, reportRows, topTickerRows, providerRows, latestJobRows, locationRows] = await Promise.all([
    sql`select
      count(*) filter (where started_at >= ${dayStart} and started_at < ${dayEnd}) as started_today,
      count(*) filter (where started_at >= ${dayStart} and started_at < ${dayEnd}) as started_24h,
      count(*) filter (where started_at >= ${dayEnd} - interval '7 days' and started_at < ${dayEnd}) as started_7d,
      count(distinct ip_hash) filter (where started_at >= ${dayStart} and started_at < ${dayEnd} and ip_hash is not null) as unique_searchers_today,
      count(*) filter (where started_at >= ${dayStart} and started_at < ${dayEnd} and outcome in ('ready', 'cache_hit')) as ready_today,
      count(*) filter (where started_at >= ${dayStart} and started_at < ${dayEnd} and outcome in ('ready', 'cache_hit')) as ready_24h,
      count(*) filter (where started_at >= ${dayStart} and started_at < ${dayEnd} and cache_hit = true) as cache_hits_today,
      count(*) filter (where started_at >= ${dayStart} and started_at < ${dayEnd} and cache_hit = true) as cache_hits_24h,
      count(*) filter (where started_at >= ${dayStart} and started_at < ${dayEnd} and outcome = 'error') as errors_today,
      count(*) filter (where started_at >= ${dayStart} and started_at < ${dayEnd} and outcome = 'error') as errors_24h,
      count(*) filter (where started_at >= ${dayStart} and started_at < ${dayEnd} and error_message ilike '%claude%') as claude_failures_24h,
      avg(duration_ms) filter (where started_at >= ${dayStart} and started_at < ${dayEnd} and duration_ms is not null) as avg_duration_24h,
      percentile_cont(0.95) within group (order by duration_ms) filter (where started_at >= ${dayStart} and started_at < ${dayEnd} and duration_ms is not null) as p95_duration_24h
      from generation_jobs` as unknown as Promise<SummaryRow[]>,
    sql`select count(*) as count from reports` as unknown as Promise<CountRow[]>,
    sql`select
        ticker,
        count(*) as analyses,
        count(*) filter (where outcome in ('ready', 'cache_hit')) as ready,
        avg(duration_ms) as avg_duration_ms,
        count(*) filter (where outcome = 'error' or error_message is not null) as failure_count
      from generation_jobs
      where started_at >= ${dayStart} and started_at < ${dayEnd}
      group by ticker
      order by analyses desc, ready desc
      limit 10` as unknown as Promise<TopTickerRow[]>,
    sql`select coalesce(source_data->>'provider', 'unknown') as provider, count(*) as reports
      from reports
      group by provider
      order by reports desc` as unknown as Promise<ProviderRow[]>,
    sql`select ticker, outcome, cache_hit, duration_ms, error_message, completed_at
      from generation_jobs
      where started_at >= ${dayStart} and started_at < ${dayEnd}
      order by started_at desc
      limit 10` as unknown as Promise<LatestJobRow[]>,
    sql`select
        coalesce(nullif(concat_ws(', ', nullif(visitor_city, ''), nullif(visitor_region, ''), nullif(visitor_country, '')), ''), 'Location not captured yet') as location_label,
        count(distinct ip_hash) filter (where ip_hash is not null) as unique_users,
        count(*) as analyses
      from generation_jobs
      where started_at >= ${dayStart} and started_at < ${dayEnd}
      group by location_label
      order by unique_users desc nulls last, analyses desc
      limit 8` as unknown as Promise<LocationRow[]>,
  ]);

  const summary = summaryRows[0] ?? ({} as SummaryRow);
  const startedToday = toNumber(summary.started_today);
  const started24h = toNumber(summary.started_24h);
  const started7d = toNumber(summary.started_7d);
  const uniqueSearchersToday = toNumber(summary.unique_searchers_today);
  const readyToday = toNumber(summary.ready_today);
  const ready24h = toNumber(summary.ready_24h);
  const cacheHitsToday = toNumber(summary.cache_hits_today);
  const cacheHits24h = toNumber(summary.cache_hits_24h);
  const errorsToday = toNumber(summary.errors_today);
  const errors24h = toNumber(summary.errors_24h);
  const claudeFailures24h = toNumber(summary.claude_failures_24h);
  const avgDuration24h = toNumber(summary.avg_duration_24h);
  const p95Duration24h = toNumber(summary.p95_duration_24h);
  const reportCount = toNumber(reportRows[0]?.count);
  const successRate24h = ratio(ready24h, started24h);
  const cacheRate24h = ratio(cacheHits24h, started24h);
  const claudeFailureRate24h = ratio(claudeFailures24h, started24h);
  const marketDataFallbacks = providerRows.find((row) => row.provider === "market-data");
  const fallbackRate = ratio(toNumber(marketDataFallbacks?.reports), reportCount);

  const topTickers = topTickerRows.map((row) => ({
    ticker: row.ticker,
    analyses: toNumber(row.analyses),
    ready: toNumber(row.ready),
    avgDurationMs: nullableNumber(row.avg_duration_ms),
    failureCount: toNumber(row.failure_count),
  }));

  const funnel: DashboardFunnelStep[] = [
    { label: "Analysis requests", value: startedToday, rateFromPrevious: null },
    { label: "Reports ready", value: readyToday, rateFromPrevious: ratio(readyToday, startedToday) },
    { label: "Cached reads", value: cacheHitsToday, rateFromPrevious: ratio(cacheHitsToday, readyToday) },
    { label: "Hard errors", value: errorsToday, rateFromPrevious: ratio(errorsToday, startedToday) },
  ];

  return {
    generatedAt: generatedAt.toISOString(),
    selectedDate,
    dateLabel,
    kpis: [
      {
        label: "Analyses today",
        value: formatInteger(startedToday),
        detail: `${formatInteger(started7d)} in the 7 days ending this date`,
        tone: startedToday > 20 ? "good" : startedToday > 0 ? "neutral" : "warn",
      },
      {
        label: "Unique people",
        value: uniqueSearchersToday ? formatInteger(uniqueSearchersToday) : "N/A",
        detail: uniqueSearchersToday ? "Privacy-safe daily IP hash estimate" : "No unique visitor signal for this date",
        tone: uniqueSearchersToday > 5 ? "good" : uniqueSearchersToday > 0 ? "neutral" : "warn",
      },
      {
        label: "Report success",
        value: formatPercent(successRate24h),
        detail: `${formatInteger(errors24h)} hard errors in 24h`,
        tone: successRate24h >= 0.9 ? "good" : successRate24h >= 0.75 ? "warn" : "bad",
      },
      {
        label: "Avg generation",
        value: formatDuration(avgDuration24h),
        detail: `P95 ${formatDuration(p95Duration24h)}`,
        tone: avgDuration24h <= 12_000 ? "good" : avgDuration24h <= 30_000 ? "warn" : "bad",
      },
      {
        label: "Cache hit rate",
        value: formatPercent(cacheRate24h),
        detail: `${formatInteger(cacheHits24h)} cached reads in 24h`,
        tone: cacheRate24h >= 0.35 ? "good" : cacheRate24h >= 0.15 ? "neutral" : "warn",
      },
      {
        label: "Data fallback",
        value: formatPercent(fallbackRate),
        detail: `${formatInteger(toNumber(marketDataFallbacks?.reports))} of ${formatInteger(reportCount)} saved reports`,
        tone: fallbackRate <= 0.1 ? "good" : fallbackRate <= 0.3 ? "warn" : "bad",
      },
    ],
    funnel,
    insights: buildInsights({
      startedToday,
      started24h,
      started7d,
      successRate24h,
      cacheRate24h,
      claudeFailureRate24h,
      avgDuration24h,
      p95Duration24h,
      fallbackRate,
      topTicker: topTickers[0]?.ticker,
    }),
    topTickers,
    providerMix: providerRows.map((row) => ({
      provider: formatProviderLabel(row.provider),
      reports: toNumber(row.reports),
    })),
    latestJobs: latestJobRows.map((row) => ({
      ticker: row.ticker,
      outcome: row.outcome,
      cacheHit: row.cache_hit,
      durationMs: row.duration_ms,
      errorMessage: row.error_message,
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    })),
    topLocations: locationRows.map((row) => ({
      label: row.location_label ?? "Location not captured yet",
      uniqueUsers: toNumber(row.unique_users),
      analyses: toNumber(row.analyses),
    })),
    trackingGaps: ["Search opened but abandoned", "Share clicks in database", "Report scroll completion"],
  };
}

function normalizeDashboardDate(value: string | null | undefined, fallback: Date) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fallback);
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function buildInsights(input: {
  startedToday: number;
  started24h: number;
  started7d: number;
  successRate24h: number;
  cacheRate24h: number;
  claudeFailureRate24h: number;
  avgDuration24h: number;
  p95Duration24h: number;
  fallbackRate: number;
  topTicker?: string;
}) {
  const insights: string[] = [];

  if (input.startedToday === 0) {
    insights.push("No one has run an analysis today. The immediate business question is acquisition, not report tuning.");
  } else {
    insights.push(`${formatInteger(input.startedToday)} analyses have run today. ${input.topTicker ? `${input.topTicker} is the strongest ticker-demand signal, so test loading speed and report quality there first.` : "Ticker demand is still too thin to call a pattern."}`);
  }

  if (input.successRate24h < 0.75) {
    insights.push(`Reliability is the main product risk: only ${formatPercent(input.successRate24h)} of analysis requests completed cleanly in the last 24 hours.`);
  } else if (input.claudeFailureRate24h > 0.2) {
    insights.push(`Claude pressure is high at ${formatPercent(input.claudeFailureRate24h)}. Shorter prompts, background generation, or a faster model would protect conversion.`);
  } else {
    insights.push(`Generation is stable enough to focus on activation. The 24-hour success rate is ${formatPercent(input.successRate24h)}.`);
  }

  if (input.avgDuration24h > 30_000 || input.p95Duration24h > 45_000) {
    insights.push(`Speed is likely hurting user patience: average generation is ${formatDuration(input.avgDuration24h)} and P95 is ${formatDuration(input.p95Duration24h)}.`);
  } else {
    insights.push(`Latency is currently acceptable at ${formatDuration(input.avgDuration24h)} average. Keep the loading bar, but product work can focus on trust and clarity.`);
  }

  if (input.fallbackRate > 0.3) {
    insights.push(`Fallback reports are too common at ${formatPercent(input.fallbackRate)}. That weakens trust because users expect a real analyst read, not a quote-only explanation.`);
  } else if (input.cacheRate24h < 0.15 && input.started7d > 10) {
    insights.push("Cache reuse is low, which suggests users are mostly testing one-off tickers. Add stronger prompts to compare another stock or revisit saved briefs.");
  }

  return insights;
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : 0;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDuration(value: number) {
  if (!value) return "0s";
  if (value < 1000) return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}s`;
}

function formatProviderLabel(provider: string | null) {
  if (provider === "claude") return "Claude analysis";
  if (provider === "gemini") return "Old Gemini cache";
  if (provider === "market-data") return "Market-data fallback";
  if (provider === "upstox") return "Upstox market data";
  if (provider === "yahoo") return "Yahoo market data";
  return provider ?? "Unknown";
}
