import { NextResponse } from "next/server";
import { resolveTickerQuery } from "@/domain/ticker-resolver";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? "";
  const resolved = await resolveTickerQuery(query);

  if (!resolved.ok) {
    return NextResponse.json(
      { error: resolved.error, code: resolved.code },
      { status: resolved.code === "NOT_FOUND" ? 404 : 400 },
    );
  }

  return NextResponse.json({ result: resolved.data });
}
