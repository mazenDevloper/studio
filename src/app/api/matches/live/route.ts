import { NextRequest, NextResponse } from "next/server";
import { getLiveNow } from "@/lib/top-matches";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** GET /api/matches/live[?teams=A~England|B] - every match being played now, strongest first. */
export async function GET(req: NextRequest) {
  const teams = (req.nextUrl.searchParams.get("teams") || "").split("|").map(s => s.trim()).filter(Boolean).slice(0, 80);
  try {
    const follow = req.nextUrl.searchParams.getAll("follow").map(s => s.trim()).filter(Boolean).slice(0, 60);
    return NextResponse.json(await getLiveNow(teams, follow), { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 502 });
  }
}
