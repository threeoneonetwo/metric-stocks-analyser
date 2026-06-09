import { cookies } from "next/headers";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { BusinessDashboard } from "@/components/business-dashboard";
import { DashboardLogin } from "@/components/dashboard-login";
import { DASHBOARD_COOKIE, isAllowedDashboardHost, isDashboardAuthenticated } from "@/lib/dashboard-auth";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const headerStore = await headers();
  if (!isAllowedDashboardHost(headerStore.get("host"))) {
    notFound();
  }

  const cookieStore = await cookies();
  const isAuthed = isDashboardAuthenticated(cookieStore.get(DASHBOARD_COOKIE)?.value);

  if (!isAuthed) {
    return <DashboardLogin />;
  }

  const { date } = await searchParams;
  const data = await getDashboardData(date);
  return <BusinessDashboard initialData={data} />;
}
