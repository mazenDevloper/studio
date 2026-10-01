import { BROWSER_HEADERS, UA, getJson } from "@/lib/match-core";

/**
 * Extra info for one match card: goal scorers, TV channels, venue, referee and (when a source has it) commentators.
 * Fetched lazily per match from the same provider the match came from (the id prefix tells which one).
 */

export interface Scorer { side: "home" | "away"; player: string; minute: string; note?: string }
export interface MatchDetails {
  source: string;
  scorers: Scorer[];
  channels: string[];
  commentators: string[];
  venue?: string;
  referee?: string;
}

const empty = (source: string): MatchDetails => ({ source, scorers: [], channels: [], commentators: [] });

// ---- 365Scores ----
export function parse365Game(json: any): MatchDetails {
  const g = json?.game ?? json;
  const out = empty("365scores");
  const members = new Map<number, string>(((g?.members ?? []) as any[]).map(m => [m.id, m.name || m.shortName]));
  const homeId = g?.homeCompetitor?.id;
  for (const e of (g?.events ?? []) as any[]) {
    const type = String(e?.eventType?.name ?? "");
    if (!/goal/i.test(type)) continue;
    const sub = String(e?.eventType?.subTypeName ?? "");
    out.scorers.push({
      side: e.competitorId === homeId ? "home" : "away",
      player: members.get(e.playerId) ?? "",
      minute: e.gameTimeDisplay || (e.gameTime ? `${Math.ceil(e.gameTime)}'` : ""),
      note: /own/i.test(sub) ? "OG" : /pen/i.test(sub) ? "P" : undefined,
    });
  }
  out.channels = ((g?.tvNetworks ?? []) as any[]).map(t => t?.name).filter(Boolean);
  out.venue = g?.venue?.name || undefined;
  out.referee = ((g?.officials ?? []) as any[]).find(o => /referee/i.test(String(o?.role ?? o?.type ?? "")) || o)?.name || undefined;
  return out;
}

// ---- FotMob ----
export function parseFotmobDetails(json: any): MatchDetails {
  const out = empty("fotmob");
  const ev = json?.header?.events ?? {};
  for (const [side, key] of [["home", "homeTeamGoals"], ["away", "awayTeamGoals"]] as const) {
    for (const [name, goals] of Object.entries(ev[key] ?? {})) {
      for (const g of (goals as any[]) ?? []) {
        out.scorers.push({
          side, player: g?.fullName || name,
          minute: `${g?.time ?? ""}${g?.overloadTime ? `+${g.overloadTime}` : ""}'`,
          note: g?.ownGoal ? "OG" : g?.goalDescription && /pen/i.test(g.goalDescription) ? "P" : undefined,
        });
      }
    }
  }
  const info = json?.content?.matchFacts?.infoBox ?? {};
  out.venue = info?.Stadium?.name || undefined;
  out.referee = info?.Referee?.text || undefined;
  return out;
}

// ---- ESPN (summary keyEvents) ----
export function parseEspnSummary(json: any, homeId: string): MatchDetails {
  const out = empty("espn");
  for (const k of (json?.keyEvents ?? []) as any[]) {
    if (!k?.scoringPlay && !/goal/i.test(String(k?.type?.text ?? ""))) continue;
    out.scorers.push({
      side: String(k?.team?.id) === String(homeId) ? "home" : "away",
      player: k?.participants?.[0]?.athlete?.displayName ?? "",
      minute: k?.clock?.displayValue ?? "",
      note: /own/i.test(String(k?.type?.text ?? "")) ? "OG" : /pen/i.test(String(k?.type?.text ?? "")) ? "P" : undefined,
    });
  }
  out.channels = ((json?.broadcasts ?? []) as any[]).flatMap(b => b?.media?.shortName ? [b.media.shortName] : b?.names ?? []);
  out.venue = json?.gameInfo?.venue?.fullName || undefined;
  out.referee = ((json?.gameInfo?.officials ?? []) as any[])[0]?.displayName || undefined;
  return out;
}

export async function getMatchDetails(id: string, league: string, homeId: string): Promise<MatchDetails> {
  if (id.startsWith("365")) {
    const json = await getJson(`https://webws.365scores.com/web/game/?appTypeId=5&langId=1&timezoneName=Asia/Muscat&userCountryId=1&gameId=${id.slice(3)}`, BROWSER_HEADERS("https://www.365scores.com"));
    return parse365Game(json);
  }
  if (id.startsWith("fm")) {
    const json = await getJson(`https://www.fotmob.com/api/matchDetails?matchId=${id.slice(2)}`, BROWSER_HEADERS("https://www.fotmob.com"));
    return parseFotmobDetails(json);
  }
  if (/^\d+$/.test(id) && league) {
    const json = await getJson(`https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(league)}/summary?event=${id}`, UA);
    return parseEspnSummary(json, homeId);
  }
  throw new Error("لا توجد تفاصيل لهذا المصدر / details not available for this source");
}
