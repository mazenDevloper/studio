import { NextRequest, NextResponse } from "next/server";
import { getTopMatchesToday } from "@/lib/top-matches";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // many sources are queried in parallel

/** GET /api/matches?limit=10[&source=espn|sofascore|365scores|thesportsdb][&all=1 include unranked matches] - today's most important matches, Oman kick-off times. */
export async function GET(req: NextRequest) {
  const limit = Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 10));
  try {
    return NextResponse.json(await getTopMatchesToday(limit, req.nextUrl.searchParams.get("source") || undefined, req.nextUrl.searchParams.get("all") === "1"));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to fetch matches" }, { status: 502 });
  }
}
