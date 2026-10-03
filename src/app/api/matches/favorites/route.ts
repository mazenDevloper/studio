import { NextRequest, NextResponse } from "next/server";
import { getFavoriteUpcoming } from "@/lib/top-matches";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/matches/favorites?teams=A|B[&days=14] - favourite teams' upcoming matches from tomorrow on. */
export async function GET(req: NextRequest) {
  const teams = (req.nextUrl.searchParams.get("teams") || "").split("|").map(s => s.trim()).filter(Boolean).slice(0, 80);
  const days = Math.min(21, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 14));
  try {
    return NextResponse.json(await getFavoriteUpcoming(teams, days));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 502 });
  }
}
