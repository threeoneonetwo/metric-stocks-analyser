import { NextResponse } from "next/server";
import { ensureReportForTicker, getReportForTicker } from "@/domain/report-cache";
import { getVisitorMetadata } from "@/lib/request-metadata";
import { normalizeTicker } from "@/lib/utils";
import { headers } from "next/headers";

type ReportApiProps = {
  params: Promise<{ ticker: string }>;
};

export async function GET(_request: Request, { params }: ReportApiProps) {
  const { ticker } = await params;
  const normalizedTicker = normalizeTicker(ticker);
  const report = await getReportForTicker(normalizedTicker);

  return NextResponse.json({ report });
}

export async function POST(_request: Request, { params }: ReportApiProps) {
  const { ticker } = await params;
  const normalizedTicker = normalizeTicker(ticker);
  const { searchParams } = new URL(_request.url);
  const headerStore = await headers();
  const report = await ensureReportForTicker(normalizedTicker, {
    refresh: searchParams.get("refresh") === "1",
    visitor: getVisitorMetadata(headerStore),
  });

  return NextResponse.json({ report });
}
