import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { logProductEvent } from "@/db/product-events";
import { getVisitorMetadata } from "@/lib/request-metadata";
import { normalizeTicker } from "@/lib/utils";

const ALLOWED_EVENTS = new Set([
  "landing_view",
  "search_open",
  "search_submit",
  "report_view",
  "share_report",
]);

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isEventBody(body) || !ALLOWED_EVENTS.has(body.eventName)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const headerStore = await headers();
  const visitor = getVisitorMetadata(headerStore);
  const ticker = body.ticker ? normalizeTicker(body.ticker) : undefined;

  await logProductEvent({
    eventName: body.eventName,
    ticker,
    metadata: body.metadata,
    ipHash: visitor.ipHash,
    visitorCountry: visitor.country,
    visitorRegion: visitor.region,
    visitorCity: visitor.city,
    visitorTimezone: visitor.timezone,
  });

  return NextResponse.json({ ok: true });
}

function isEventBody(value: unknown): value is {
  eventName: string;
  ticker?: string;
  metadata?: Record<string, unknown>;
} {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  if (typeof body.eventName !== "string") return false;
  if (body.ticker !== undefined && typeof body.ticker !== "string") return false;
  if (body.metadata !== undefined && (!body.metadata || typeof body.metadata !== "object" || Array.isArray(body.metadata))) {
    return false;
  }
  return true;
}
