import { NextRequest, NextResponse } from "next/server";
import { getTopMatchesToday } from "@/lib/top-matches";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // many sources are queried in parallel

/** GET /api/matches?limit=10[&day=-60..60 days from today][&source=espn|sofascore|365scores|thesportsdb][&all=1 include unranked matches][&teams=A~England|B favourite teams (optional ~country)][&pins=A|B pinned matches' teams: listed, not favourites] - today's most important matches, Oman kick-off times. */
export async function GET(req: NextRequest) {
  const limit = Math.min(30, Math.max(1, Number(req.nextUrl.searchParams.get("limit")) || 10));
  try {
    return NextResponse.json(await getTopMatchesToday(limit, req.nextUrl.searchParams.get("source") || undefined, req.nextUrl.searchParams.get("all") === "1", (req.nextUrl.searchParams.get("teams") || "").split("|").map(s => s.trim()).filter(Boolean).slice(0, 80), Math.max(-60, Math.min(60, Math.trunc(Number(req.nextUrl.searchParams.get("day")) || 0))),
      (req.nextUrl.searchParams.get("pins") || "").split("|").map(s => s.trim()).filter(Boolean).slice(0, 40)));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to fetch matches" }, { status: 502 });
  }
}
