import { NextRequest, NextResponse } from "next/server";
import { getMatchDetails } from "@/lib/match-details";

export const dynamic = "force-dynamic";

/** GET /api/matches/details?id=365123&league=eng.1&homeId=42 - scorers, channels, venue, referee for one match. */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const id = p.get("id") || "";
  if (!/^[\w-]{1,40}$/.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  try {
    return NextResponse.json(await getMatchDetails(id, p.get("league") || "", p.get("homeId") || ""));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 502 });
  }
}
