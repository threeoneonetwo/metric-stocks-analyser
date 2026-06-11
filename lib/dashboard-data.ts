import { neon } from "@neondatabase/serverless";

export type DashboardKpi = {
  label: string;
  value: string;
  detail: string;
  tone: "good" | "bad" | "neutral";
};

export type DashboardData = {
  generatedAt: string;
  selectedDate: string;
  dateLabel: string;
  kpis: DashboardKpi[];
  topTickers: Array<{
    ticker: string;
    analyses: number;
  }>;
};

type SummaryRow = {
  total_analyses: string | number | null;
  completed_analyses: string | number | null;
  errors: string | number | null;
  people_analysed: string | number | null;
  product_visitors: string | number | null;
  landing_visitors: string | number | null;
  search_users: string | number | null;
  report_viewers: string | number | null;
  share_users: string | number | null;
  month_total_analyses: string | number | null;
  month_people_analysed: string | number | null;
  month_product_visitors: string | number | null;
};

type TopTickerRow = {
  ticker: string;
  analyses: string | number;
};

export async function getDashboardData(selectedDateInput?: string | null): Promise<DashboardData> {
  const generatedAt = new Date();
  const selectedDate = normalizeDashboardDate(selectedDateInput, generatedAt);
  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "full",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${selectedDate}T12:00:00+05:30`));

  if (!process.env.DATABASE_URL) {
    return buildDashboardData({
      generatedAt,
      selectedDate,
      dateLabel,
      totalAnalyses: 0,
      completedAnalyses: 0,
      errors: 0,
      peopleAnalysed: 0,
      productVisitors: 0,
      landingVisitors: 0,
      searchUsers: 0,
      reportViewers: 0,
      shareUsers: 0,
      monthTotalAnalyses: 0,
      monthPeopleAnalysed: 0,
      monthProductVisitors: 0,
      topTickers: [],
    });
  }

  const sql = neon(process.env.DATABASE_URL);
  const dayStart = sql`(${selectedDate}::date::timestamp at time zone 'Asia/Kolkata')`;
  const dayEnd = sql`((${selectedDate}::date + interval '1 day')::timestamp at time zone 'Asia/Kolkata')`;
  const monthStart = sql`(date_trunc('month', ${selectedDate}::date)::timestamp at time zone 'Asia/Kolkata')`;
  const monthEnd = sql`((date_trunc('month', ${selectedDate}::date) + interval '1 month')::timestamp at time zone 'Asia/Kolkata')`;

  const [summaryRows, topTickerRows] = await Promise.all([
    sql`select
        count(*) as total_analyses,
        count(*) filter (where outcome in ('ready', 'cache_hit')) as completed_analyses,
        count(*) filter (where outcome = 'error') as errors,
        count(distinct ip_hash) filter (where ip_hash is not null) as people_analysed,
        (
          select count(distinct coalesce(product_events.ip_hash, product_events.id::text))
          from product_events
          where product_events.occurred_at >= ${dayStart}
            and product_events.occurred_at < ${dayEnd}
        ) as product_visitors,
        (
          select count(distinct coalesce(product_events.ip_hash, product_events.id::text))
          from product_events
          where product_events.occurred_at >= ${dayStart}
            and product_events.occurred_at < ${dayEnd}
            and product_events.event_name = 'landing_view'
        ) as landing_visitors,
        (
          select count(distinct coalesce(product_events.ip_hash, product_events.id::text))
          from product_events
          where product_events.occurred_at >= ${dayStart}
            and product_events.occurred_at < ${dayEnd}
            and product_events.event_name in ('search_open', 'search_submit')
        ) as search_users,
        (
          select count(distinct coalesce(product_events.ip_hash, product_events.id::text))
          from product_events
          where product_events.occurred_at >= ${dayStart}
            and product_events.occurred_at < ${dayEnd}
            and product_events.event_name = 'report_view'
        ) as report_viewers,
        (
          select count(distinct coalesce(product_events.ip_hash, product_events.id::text))
          from product_events
          where product_events.occurred_at >= ${dayStart}
            and product_events.occurred_at < ${dayEnd}
            and product_events.event_name = 'share_report'
        ) as share_users,
        (
          select count(*)
          from generation_jobs as month_jobs
          where month_jobs.started_at >= ${monthStart}
            and month_jobs.started_at < ${monthEnd}
        ) as month_total_analyses,
        (
          select count(distinct month_jobs.ip_hash)
          from generation_jobs as month_jobs
          where month_jobs.started_at >= ${monthStart}
            and month_jobs.started_at < ${monthEnd}
            and month_jobs.ip_hash is not null
        ) as month_people_analysed,
        (
          select count(distinct coalesce(month_events.ip_hash, month_events.id::text))
          from product_events as month_events
          where month_events.occurred_at >= ${monthStart}
            and month_events.occurred_at < ${monthEnd}
        ) as month_product_visitors
      from generation_jobs
      where started_at >= ${dayStart} and started_at < ${dayEnd}` as unknown as Promise<SummaryRow[]>,
    sql`select ticker, count(*) as analyses
      from generation_jobs
      where started_at >= ${dayStart} and started_at < ${dayEnd}
      group by ticker
      order by analyses desc, ticker asc
      limit 10` as unknown as Promise<TopTickerRow[]>,
  ]);

  const summary = summaryRows[0] ?? ({} as SummaryRow);

  return buildDashboardData({
    generatedAt,
    selectedDate,
    dateLabel,
    totalAnalyses: toNumber(summary.total_analyses),
    completedAnalyses: toNumber(summary.completed_analyses),
    errors: toNumber(summary.errors),
    peopleAnalysed: toNumber(summary.people_analysed),
    productVisitors: toNumber(summary.product_visitors),
    landingVisitors: toNumber(summary.landing_visitors),
    searchUsers: toNumber(summary.search_users),
    reportViewers: toNumber(summary.report_viewers),
    shareUsers: toNumber(summary.share_users),
    monthTotalAnalyses: toNumber(summary.month_total_analyses),
    monthPeopleAnalysed: toNumber(summary.month_people_analysed),
    monthProductVisitors: toNumber(summary.month_product_visitors),
    topTickers: topTickerRows.map((row) => ({
      ticker: row.ticker,
      analyses: toNumber(row.analyses),
    })),
  });
}

function buildDashboardData(input: {
  generatedAt: Date;
  selectedDate: string;
  dateLabel: string;
  totalAnalyses: number;
  completedAnalyses: number;
  errors: number;
  peopleAnalysed: number;
  productVisitors: number;
  landingVisitors: number;
  searchUsers: number;
  reportViewers: number;
  shareUsers: number;
  monthTotalAnalyses: number;
  monthPeopleAnalysed: number;
  monthProductVisitors: number;
  topTickers: DashboardData["topTickers"];
}): DashboardData {
  return {
    generatedAt: input.generatedAt.toISOString(),
    selectedDate: input.selectedDate,
    dateLabel: input.dateLabel,
    kpis: [
      {
        label: "Product visitors",
        value: formatInteger(input.productVisitors),
        detail: "Unique visitors with a tracked product event",
        tone: input.productVisitors > 0 ? "good" : "neutral",
      },
      {
        label: "People who analysed",
        value: formatInteger(input.peopleAnalysed),
        detail: "Unique visitors who triggered analysis",
        tone: input.peopleAnalysed > 0 ? "good" : "neutral",
      },
      {
        label: "Total analyses",
        value: formatInteger(input.totalAnalyses),
        detail: "All analysis requests",
        tone: input.totalAnalyses > 0 ? "good" : "neutral",
      },
      {
        label: "Report viewers",
        value: formatInteger(input.reportViewers),
        detail: "Unique visitors who viewed a report",
        tone: input.reportViewers > 0 ? "good" : "neutral",
      },
      {
        label: "Search users",
        value: formatInteger(input.searchUsers),
        detail: "Unique visitors who opened or used search",
        tone: input.searchUsers > 0 ? "good" : "neutral",
      },
      {
        label: "Month visitors",
        value: formatInteger(input.monthProductVisitors),
        detail: "Current calendar month product visitors",
        tone: input.monthProductVisitors > 0 ? "good" : "neutral",
      },
      {
        label: "Month analyses",
        value: formatInteger(input.monthTotalAnalyses),
        detail: "Total analyses this calendar month",
        tone: input.monthTotalAnalyses > 0 ? "good" : "neutral",
      },
      {
        label: "Month users",
        value: formatInteger(input.monthPeopleAnalysed),
        detail: "Unique people who analysed this month",
        tone: input.monthPeopleAnalysed > 0 ? "good" : "neutral",
      },
      {
        label: "Shares",
        value: formatInteger(input.shareUsers),
        detail: "Unique visitors who shared a report",
        tone: input.shareUsers > 0 ? "good" : "neutral",
      },
      {
        label: "Errors",
        value: formatInteger(input.errors),
        detail: `${formatInteger(input.completedAnalyses)} completed analysis requests`,
        tone: input.errors > 0 ? "bad" : "good",
      },
    ],
    topTickers: input.topTickers,
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

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}
