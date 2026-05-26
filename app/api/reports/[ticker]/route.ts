import { NextResponse } from "next/server";
import { ensureReportForTicker, getReportForTicker } from "@/domain/report-cache";
import { normalizeTicker } from "@/lib/utils";

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
  const report = await ensureReportForTicker(normalizedTicker);

  return NextResponse.json({ report });
}
