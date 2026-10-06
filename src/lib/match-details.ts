import { BROWSER_HEADERS, UA, getJson, sameTeam } from "@/lib/match-core";
import { isArabChannel, prioritizeChannels } from "@/lib/match-channels";
import { footballDay } from "@/lib/oman-time";
import { S365_HEADERS, athleteImage, remember365Countries, s365CountryId, s365RegionCountryIds, s365Url } from "@/lib/scores365";

/**
 * Extra info for one match card: goal scorers (with photos), TV channels, venue, referee, red cards, round,
 * formations and match stats. 365Scores is asked first for every match (it carries the most, including the
 * Middle East TV channels); matches that came from another source are looked up there by team names.
 * The match's own source (FotMob / ESPN) is the fallback.
 */

export interface Scorer { side: "home" | "away"; player: string; minute: string; note?: string; photo?: string; assist?: string }
export interface CardEvent { side: "home" | "away"; player: string; minute: string }
export interface StatRow { name: string; home: string; away: string }
export interface LineupPlayer { name: string; number?: string; pos?: string }
export interface Lineup { formation?: string; starters: LineupPlayer[]; subs: LineupPlayer[] }
export interface TableRow { pos: number; team: string; logo?: string; played?: number; points?: number; gd?: string; side?: "home" | "away" }
export interface MatchDetails {
  source: string;
  scorers: Scorer[];
  channels: string[];
  commentators: string[];
  venue?: string;
  venueCapacity?: number;
  attendance?: number;
  referee?: string;
  round?: string;
  formations?: { home?: string; away?: string };
  redCards?: CardEvent[];
  stats?: StatRow[];
  /** the two teams' line-ups (when announced) */
  lineups?: { home?: Lineup; away?: Lineup };
  /** the league table, or the group of the two teams (only with table=1) */
  table?: { name?: string; rows: TableRow[] };
}

const empty = (source: string): MatchDetails => ({ source, scorers: [], channels: [], commentators: [] });
const posNum = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : undefined; };

// ---- 365Scores ----
export function parse365Game(json: any): MatchDetails {
  const g = json?.game ?? json;
  const out = empty("365scores");
  const members = new Map<number, any>(((g?.members ?? []) as any[]).map(m => [m.id, m]));
  const homeId = g?.homeCompetitor?.id;
  const minuteOf = (e: any) => e?.gameTimeDisplay || (e?.gameTime ? `${Math.ceil(e.gameTime)}'` : "");
  const nameOf = (m: any) => m?.name || m?.shortName || "";
  for (const e of (g?.events ?? []) as any[]) {
    const type = String(e?.eventType?.name ?? "");
    const sub = String(e?.eventType?.subTypeName ?? "");
    const side = e?.competitorId === homeId ? "home" : "away";
    const player = members.get(e?.playerId);
    if (/red card/i.test(type) || /red/i.test(sub) && /card/i.test(type)) {
      (out.redCards ??= []).push({ side, player: nameOf(player), minute: minuteOf(e) });
      continue;
    }
    if (!/goal/i.test(type) || /disallow|cancel|missed/i.test(`${type} ${sub}`)) continue;
    const assist = members.get(((e?.extraPlayers ?? []) as any[])[0]);
    out.scorers.push({
      side,
      player: nameOf(player),
      minute: minuteOf(e),
      note: /own/i.test(`${type} ${sub}`) ? "OG" : /pen/i.test(sub) ? "P" : undefined,
      photo: player?.athleteId ? athleteImage(player.athleteId, player.imageVersion) : undefined,
      assist: assist ? nameOf(assist) : undefined,
    });
  }
  out.channels = Array.from(new Set(((g?.tvNetworks ?? []) as any[]).map(t => t?.name).filter(Boolean)));
  out.venue = g?.venue?.name || undefined;
  out.venueCapacity = posNum(g?.venue?.capacity);
  out.attendance = posNum(g?.venue?.attendance ?? g?.attendance);
  const officials = (g?.officials ?? []) as any[];
  out.referee = (officials.find(o => /referee/i.test(String(o?.role ?? o?.type ?? o?.officialType ?? ""))) ?? officials[0])?.name || undefined;
  const round = g?.roundName ? `${g.roundName}${g.roundNum ? ` ${g.roundNum}` : ""}` : "";
  out.round = [g?.stageName, round].filter(Boolean).join(" · ") || undefined;
  const fh = g?.homeCompetitor?.lineups?.formation, fa = g?.awayCompetitor?.lineups?.formation;
  if (fh || fa) out.formations = { home: fh || undefined, away: fa || undefined };
  // line-ups: each side's members, starting (status 1 / "Starting") and substitutes
  const lineup = (c: any): Lineup | undefined => {
    const list = (c?.lineups?.members ?? []) as any[];
    if (!list.length) return undefined;
    const players = list.map(x => {
      const m = members.get(x?.id) ?? {};
      const starting = x?.status === 1 || /start/i.test(String(x?.statusText ?? ""));
      return { starting, p: { name: nameOf(m) || nameOf(x), number: m?.jerseyNumber != null ? String(m.jerseyNumber) : undefined, pos: x?.position?.shortName || x?.position?.name || x?.formation?.shortName || undefined } };
    });
    return { formation: c?.lineups?.formation || undefined, starters: players.filter(x => x.starting).map(x => x.p), subs: players.filter(x => !x.starting).map(x => x.p) };
  };
  const lh = lineup(g?.homeCompetitor), la = lineup(g?.awayCompetitor);
  if (lh || la) out.lineups = { home: lh, away: la };
  return out;
}

/** 365Scores standings: the group holding one of the two teams (or the whole table), top 20. */
export function parse365Table(json: any, homeId?: number, awayId?: number): MatchDetails["table"] {
  const st = (json?.standings ?? [])[0];
  let rows = (st?.rows ?? []) as any[];
  if (!rows.length) return undefined;
  const mine = rows.find(r => r?.competitor?.id === homeId || r?.competitor?.id === awayId);
  const group = mine?.groupNum;
  if (group != null) rows = rows.filter(r => r?.groupNum === group);
  const groupName = group != null ? ((st?.groups ?? []) as any[]).find(x => x?.num === group)?.name : undefined;
  return {
    name: groupName || st?.displayName || st?.competitionName || undefined,
    rows: rows.slice(0, 24).map((r, i) => {
      const f = Number(r?.for), a = Number(r?.against);
      const gd = Number.isFinite(f) && Number.isFinite(a) ? f - a : Number(r?.ratio);
      return {
        pos: Number(r?.position) || i + 1, team: r?.competitor?.name ?? "", played: posNum(r?.gamePlayed) ?? 0,
        points: Number(r?.points) || 0, gd: Number.isFinite(gd) ? (gd > 0 ? `+${gd}` : String(gd)) : undefined,
        side: r?.competitor?.id === homeId ? "home" : r?.competitor?.id === awayId ? "away" : undefined,
      };
    }),
  };
}

/** 365Scores stats endpoint: one row per stat with the value of each side (major stats first). */
export function parse365Stats(json: any, homeId: number, awayId: number): StatRow[] {
  const rows = new Map<string, { home: string; away: string; major: boolean }>();
  const list = (json?.statistics ?? json?.games?.[0]?.statistics ?? []) as any[];
  for (const s of list) {
    if (!s?.name) continue;
    const row = rows.get(s.name) ?? { home: "", away: "", major: !!s.isMajor };
    if (s.competitorId === homeId) row.home = String(s.value ?? "");
    else if (s.competitorId === awayId) row.away = String(s.value ?? "");
    row.major ||= !!s.isMajor;
    rows.set(s.name, row);
  }
  return Array.from(rows.entries())
    .filter(([, r]) => r.home !== "" || r.away !== "")
    .sort((a, b) => Number(b[1].major) - Number(a[1].major))
    .slice(0, 8)
    .map(([name, r]) => ({ name, home: r.home || "0", away: r.away || "0" }));
}

async function details365(gameId: string, revalidate: number, table = false): Promise<MatchDetails> {
  const json = await getJson(await s365Url("game", { gameId }), S365_HEADERS, revalidate);
  remember365Countries(json);
  const out = parse365Game(json);
  if (!out.channels.some(isArabChannel)) {
    // no Arab channel for our country: ask 365Scores as other Arab countries (rights differ per country)
    const mine = await s365CountryId();
    const others = s365RegionCountryIds().filter(id => id !== mine).slice(0, 4);
    const found = await Promise.allSettled(others.map(c => getJson(`https://webws.365scores.com/web/game/?appTypeId=5&langId=1&timezoneName=Asia/Muscat&userCountryId=${c}&gameId=${gameId}`, S365_HEADERS, Math.max(revalidate, 300))));
    const names = found.flatMap(r => (r.status === "fulfilled" ? ((r.value?.game?.tvNetworks ?? []) as any[]).map(t => t?.name) : [])).filter(Boolean);
    // Arab channels first; foreign ones stay as a fallback for matches nobody in the region shows
    out.channels = prioritizeChannels([...names, ...out.channels]);
  }
  const g = json?.game;
  if (g && Number(g.statusGroup) >= 3) {
    try {
      const stats = await getJson(await s365Url("game/stats", { games: gameId }), S365_HEADERS, Math.max(revalidate, 30));
      out.stats = parse365Stats(stats, g.homeCompetitor?.id, g.awayCompetitor?.id);
    } catch { /* stats are optional */ }
  }
  if (table && g?.competitionId) {
    try {
      const st = await getJson(await s365Url("standings", { competitions: g.competitionId }), S365_HEADERS, Math.max(revalidate, 120));
      out.table = parse365Table(st, g.homeCompetitor?.id, g.awayCompetitor?.id);
    } catch { /* optional */ }
  }
  return out;
}

/** Find the 365Scores game for a match that came from another source, by team names (same football day). */
async function find365GameId(home: string, away: string): Promise<{ id: string; swapped: boolean } | null> {
  if (!home || !away) return null;
  const day = footballDay();
  const [y, m, d] = day.split("-");
  const next = new Date(Date.UTC(+y, +m - 1, +d + 1));
  const dmy = `${d}/${m}/${y}`;
  const dmyNext = `${String(next.getUTCDate()).padStart(2, "0")}/${String(next.getUTCMonth() + 1).padStart(2, "0")}/${next.getUTCFullYear()}`;
  const json = await getJson(await s365Url("games/allscores", { startDate: dmy, endDate: dmyNext, sports: 1, showOdds: "false" }), S365_HEADERS, 60);
  remember365Countries(json);
  const games = (json?.games ?? []) as any[];
  const is = (x: any, h: string, a: string) => sameTeam(x?.homeCompetitor?.name ?? "", h) && sameTeam(x?.awayCompetitor?.name ?? "", a);
  const direct = games.find(x => is(x, home, away));
  if (direct?.id) return { id: String(direct.id), swapped: false };
  const swapped = games.find(x => is(x, away, home));
  return swapped?.id ? { id: String(swapped.id), swapped: true } : null;
}

/** 365Scores listed the match the other way round: put every side back to the card's home/away. */
function flipSides(d: MatchDetails): MatchDetails {
  const flip = <T extends { side: "home" | "away" }>(x: T): T => ({ ...x, side: x.side === "home" ? "away" : "home" });
  return {
    ...d,
    scorers: d.scorers.map(flip),
    redCards: d.redCards?.map(flip),
    formations: d.formations && { home: d.formations.away, away: d.formations.home },
    stats: d.stats?.map(r => ({ ...r, home: r.away, away: r.home })),
    lineups: d.lineups && { home: d.lineups.away, away: d.lineups.home },
    table: d.table && { ...d.table, rows: d.table.rows.map(r => ({ ...r, side: r.side === "home" ? "away" : r.side === "away" ? "home" : undefined })) },
  };
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
          photo: g?.playerId ? `https://images.fotmob.com/image_resources/playerimages/${g.playerId}.png` : undefined,
        });
      }
    }
  }
  const info = json?.content?.matchFacts?.infoBox ?? {};
  out.venue = info?.Stadium?.name || undefined;
  out.venueCapacity = posNum(info?.Stadium?.capacity);
  out.attendance = posNum(info?.Attendance);
  out.referee = info?.Referee?.text || undefined;
  return out;
}

// ---- ESPN (summary keyEvents) ----
export function parseEspnSummary(json: any, homeId: string): MatchDetails {
  const out = empty("espn");
  for (const k of (json?.keyEvents ?? []) as any[]) {
    if (!k?.scoringPlay && !/goal/i.test(String(k?.type?.text ?? ""))) continue;
    const athlete = k?.participants?.[0]?.athlete;
    out.scorers.push({
      side: String(k?.team?.id) === String(homeId) ? "home" : "away",
      player: athlete?.displayName ?? "",
      minute: k?.clock?.displayValue ?? "",
      note: /own/i.test(String(k?.type?.text ?? "")) ? "OG" : /pen/i.test(String(k?.type?.text ?? "")) ? "P" : undefined,
      photo: athlete?.headshot?.href || undefined,
    });
  }
  out.channels = ((json?.broadcasts ?? []) as any[]).flatMap(b => b?.media?.shortName ? [b.media.shortName] : b?.names ?? []);
  out.venue = json?.gameInfo?.venue?.fullName || undefined;
  out.venueCapacity = posNum(json?.gameInfo?.venue?.capacity);
  out.attendance = posNum(json?.gameInfo?.attendance);
  out.referee = ((json?.gameInfo?.officials ?? []) as any[])[0]?.displayName || undefined;
  // line-ups (rosters) and the table ESPN sends with the summary
  const roster = (r: any): Lineup => {
    const list = (r?.roster ?? []) as any[];
    const p = (x: any): LineupPlayer => ({ name: x?.athlete?.displayName ?? "", number: x?.jersey || undefined, pos: x?.position?.abbreviation || undefined });
    return { formation: r?.formation || undefined, starters: list.filter(x => x?.starter).map(p), subs: list.filter(x => !x?.starter).map(p) };
  };
  const rs = (json?.rosters ?? []) as any[];
  const rh = rs.find(r => r?.homeAway === "home" || String(r?.team?.id) === String(homeId));
  const ra = rs.find(r => r !== rh);
  if (rh?.roster?.length || ra?.roster?.length) out.lineups = { home: rh ? roster(rh) : undefined, away: ra ? roster(ra) : undefined };
  const groups = (json?.standings?.groups ?? []) as any[];
  const grp = groups.find(gr => ((gr?.standings?.entries ?? []) as any[]).some(e => String(e?.team?.id ?? e?.id) === String(homeId))) ?? groups[0];
  const entries = (grp?.standings?.entries ?? []) as any[];
  if (entries.length) {
    const stat = (e: any, ...names: string[]) => ((e?.stats ?? []) as any[]).find(x => names.includes(x?.name) || names.includes(x?.abbreviation));
    out.table = {
      name: grp?.header || undefined,
      rows: entries.slice(0, 24).map((e, i) => ({
        pos: Number(stat(e, "rank")?.value) || i + 1, team: e?.team?.displayName ?? e?.team ?? "",
        played: Number(stat(e, "gamesPlayed", "GP")?.value) || 0, points: Number(stat(e, "points", "P", "PTS")?.value) || 0,
        gd: stat(e, "pointDifferential", "GD")?.displayValue, side: String(e?.team?.id ?? e?.id) === String(homeId) ? "home" : undefined,
      })),
    };
  }
  return out;
}

async function ownSource(id: string, league: string, homeId: string, revalidate: number): Promise<MatchDetails> {
  if (id.startsWith("fm")) {
    const json = await getJson(`https://www.fotmob.com/api/matchDetails?matchId=${id.slice(2)}`, BROWSER_HEADERS("https://www.fotmob.com"), revalidate);
    return parseFotmobDetails(json);
  }
  if (/^\d+$/.test(id) && league) {
    const json = await getJson(`https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(league)}/summary?event=${id}`, UA, revalidate);
    return parseEspnSummary(json, homeId);
  }
  throw new Error("لا توجد تفاصيل لهذا المصدر / details not available for this source");
}

/** Fill the gaps of `a` (the richer 365Scores details) with `b` (the match's own source). */
function merge(a: MatchDetails, b: MatchDetails | null): MatchDetails {
  if (!b) return a;
  return {
    ...b, ...Object.fromEntries(Object.entries(a).filter(([, v]) => v !== undefined && !(Array.isArray(v) && !v.length))),
    channels: Array.from(new Set([...a.channels, ...b.channels])),
    scorers: a.scorers.length ? a.scorers : b.scorers,
    source: `${a.source}+${b.source}`,
  } as MatchDetails;
}

export async function getMatchDetails(
  id: string, league: string, homeId: string,
  opts: { home?: string; away?: string; fresh?: boolean; table?: boolean } = {},
): Promise<MatchDetails> {
  const revalidate = opts.fresh ? 5 : 20;
  if (id.startsWith("365")) return details365(id.slice(3), revalidate, opts.table);

  // another source: look the same match up on 365Scores, keep the own source as backup
  const [own, s365] = await Promise.allSettled([
    ownSource(id, league, homeId, revalidate),
    find365GameId(opts.home ?? "", opts.away ?? "").then(async hit => {
      if (!hit) return null;
      const d = await details365(hit.id, revalidate, opts.table);
      return hit.swapped ? flipSides(d) : d;
    }),
  ]);
  const a = s365.status === "fulfilled" ? s365.value : null;
  const b = own.status === "fulfilled" ? own.value : null;
  if (a) return merge(a, b);
  if (b) return b;
  throw (own as PromiseRejectedResult).reason ?? new Error("details unavailable");
}
