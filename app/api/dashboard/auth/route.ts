import { NextResponse } from "next/server";
import {
  DASHBOARD_COOKIE,
  DASHBOARD_COOKIE_VALUE,
  DASHBOARD_PASSWORD,
  isAllowedDashboardHost,
} from "@/lib/dashboard-auth";

export async function POST(request: Request) {
  if (!isAllowedDashboardHost(new URL(request.url).host)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (password !== DASHBOARD_PASSWORD) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(DASHBOARD_COOKIE, DASHBOARD_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return response;
}
