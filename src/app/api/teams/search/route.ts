import { NextRequest, NextResponse } from "next/server";
import { BROWSER_HEADERS, getJson } from "@/lib/match-core";
import { S365_HEADERS, s365Url } from "@/lib/scores365";

export const dynamic = "force-dynamic";

interface TeamHit { id: number; name: string; logo: string; country?: string; source: string }

/** 365Scores search (football teams). */
async function from365(q: string): Promise<TeamHit[]> {
  const json = await getJson(await s365Url("search", { query: q, filter: "competitors" }), S365_HEADERS, 3600);
  const countries = new Map<number, string>((json?.countries ?? []).map((c: any) => [Number(c.id), String(c.name)]));
  return (json?.competitors ?? [])
    .filter((c: any) => (c.sportId ?? 1) === 1) // football only (clubs and national teams)
    .map((c: any) => ({
      id: Number(c.id), name: String(c.name), country: countries.get(Number(c.countryId)), source: "365scores",
      logo: `https://imagecache.365scores.com/image/upload/f_png,w_68,h_68,c_limit,q_auto:eco,dpr_2,d_Competitors:default1.png/v${c.imageVersion ?? 1}/Competitors/${c.id}`,
    }));
}

/** TheSportsDB (free key) as a fallback. */
async function fromSportsDb(q: string): Promise<TeamHit[]> {
  const json = await getJson(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(q)}`, BROWSER_HEADERS("https://www.thesportsdb.com"), 3600);
  return (json?.teams ?? [])
    .filter((t: any) => /soccer/i.test(t.strSport ?? ""))
    .map((t: any) => ({ id: Number(t.idTeam), name: String(t.strTeam), logo: t.strBadge || t.strTeamBadge || "", country: t.strCountry || undefined, source: "thesportsdb" }));
}

/** GET /api/teams/search?q=Arsenal - football clubs for the favourite-teams picker. */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim().slice(0, 60);
  if (q.length < 2) return NextResponse.json({ teams: [] });
  const errors: string[] = [];
  for (const run of [from365, fromSportsDb]) {
    try {
      const teams = (await run(q)).filter(t => t.id && t.name).slice(0, 20);
      if (teams.length) return NextResponse.json({ teams });
    } catch (e: any) { errors.push(e?.message || "failed"); }
  }
  return NextResponse.json({ teams: [], errors });
}
