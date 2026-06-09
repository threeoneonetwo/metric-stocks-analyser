export const DASHBOARD_COOKIE = "metric_dashboard";
export const DASHBOARD_PASSWORD = "hellomoto";
export const DASHBOARD_COOKIE_VALUE = "metric-dashboard-v1";

export function isDashboardAuthenticated(value: string | undefined) {
  return value === DASHBOARD_COOKIE_VALUE;
}

export function isAllowedDashboardHost(host: string | null) {
  if (!host) return false;
  const normalized = host.toLowerCase().split(":")[0];
  return normalized === "metricfinance.app" || normalized === "localhost" || normalized === "127.0.0.1";
}
