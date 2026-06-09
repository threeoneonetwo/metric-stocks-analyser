import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DASHBOARD_COOKIE, isAllowedDashboardHost, isDashboardAuthenticated } from "@/lib/dashboard-auth";
import { getDashboardData } from "@/lib/dashboard-data";

export async function GET(request: Request) {
  if (!isAllowedDashboardHost(new URL(request.url).host)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const isAuthed = isDashboardAuthenticated(cookieStore.get(DASHBOARD_COOKIE)?.value);

  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = new URL(request.url).searchParams.get("date");
  const data = await getDashboardData(date);
  return NextResponse.json(data);
}
