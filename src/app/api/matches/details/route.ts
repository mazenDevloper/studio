import { NextRequest, NextResponse } from "next/server";
import { getMatchDetails } from "@/lib/match-details";

export const dynamic = "force-dynamic";

/**
 * GET /api/matches/details?id=365123&league=eng.1&homeId=42&home=Arsenal&away=Chelsea[&fresh=1]
 * Scorers (with photos), channels, venue, referee, stats for one match. home/away let matches from other
 * sources be looked up on 365Scores; fresh=1 (goal animation) skips most of the cache.
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const id = p.get("id") || "";
  if (!/^[\w-]{1,40}$/.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const team = (k: string) => (p.get(k) || "").slice(0, 80);
  try {
    return NextResponse.json(await getMatchDetails(id, p.get("league") || "", p.get("homeId") || "", {
      home: team("home"), away: team("away"), fresh: p.get("fresh") === "1", table: p.get("table") === "1",
    }));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 502 });
  }
}
