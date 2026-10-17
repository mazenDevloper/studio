import { getJson, sameTeam } from "@/lib/match-core";
import { footballDay } from "@/lib/oman-time";
import { S365_HEADERS, s365Url } from "@/lib/scores365";

/** team name → logo (365Scores search, the same as the teams search in the matches tab); kept while warm */
const cache = new Map<string, string>();

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\b(fc|cf|afc|sc|ac)\b/g, "").replace(/[^a-z0-9؀-ۿ]+/g, " ").trim();

async function lookup(name: string): Promise<string> {
  const k = norm(name);
  if (cache.has(k)) return cache.get(k)!;
  let logo = "";
  try {
    const json = await getJson(await s365Url("search", { query: name, filter: "competitors" }), S365_HEADERS, 86400);
    const list = (json?.competitors ?? []).filter((c: any) => (c.sportId ?? 1) === 1);
    const best = list.find((c: any) => norm(String(c.name)) === k) ?? list.find((c: any) => norm(String(c.name)).includes(k) || k.includes(norm(String(c.name)))) ?? list[0];
    if (best) logo = `https://imagecache.365scores.com/image/upload/f_png,w_68,h_68,c_limit,q_auto:eco,dpr_2,d_Competitors:default1.png/v${best.imageVersion ?? 1}/Competitors/${best.id}`;
  } catch {}
  cache.set(k, logo);
  return logo;
}

/** Fill in every missing team logo of a matches response (in place). */
/** logos that often fail to load elsewhere (hotlink-protected / wrong codes): replaced too */
const weak = (u?: string) => !u || /premierleague\.com|null|undefined/.test(u);

export async function fillTeamLogos(data: any): Promise<any> {
  const matches: any[] = data?.matches ?? [];
  const need = new Set<string>();
  for (const m of matches) for (const t of [m?.home, m?.away]) if (t?.name && weak(t.logo)) need.add(t.name);
  const names = [...need].slice(0, 40);
  const found = new Map<string, string>();
  await Promise.all(names.map(async n => { found.set(n, await Promise.race([lookup(n), new Promise<string>(r => setTimeout(() => r(""), 6000))])); }));
  for (const m of matches) for (const t of [m?.home, m?.away]) if (t?.name && weak(t.logo) && found.get(t.name)) t.logo = found.get(t.name);
  return data;
}

/**
 * Live matches from a source that only says "live" (no minute, a score that never moves): their score, minute and
 * state taken from 365Scores' live list (refreshed every minute); failing that, the minute estimated from kick-off.
 */
export async function freshenLive(data: any): Promise<any> {
  const matches: any[] = data?.matches ?? [];
  const now = Date.now() / 1000;
  // live ones, ones that should have started, and finished ones whose score is missing or 0-0 (often a source's blank)
  const due = matches.filter(m => m?.status === "live" || (m?.status === "upcoming" && m.timestamp < now && now - m.timestamp < 3 * 3600)
    || (m?.status === "finished" && now - m.timestamp < 36 * 3600 && (m.score?.home == null || m.score?.away == null || (m.score.home === 0 && m.score.away === 0))));
  if (!due.length) return data;
  let games: any[] = [];
  try {
    const day: string = footballDay();
    const [y, mo, d] = day.split("-");
    const nx = new Date(Date.UTC(+y, +mo - 1, +d + 1));
    const dmy = `${d}/${mo}/${y}`, dmyNext = `${String(nx.getUTCDate()).padStart(2, "0")}/${String(nx.getUTCMonth() + 1).padStart(2, "0")}/${nx.getUTCFullYear()}`;
    const json = await Promise.race([getJson(await s365Url("games/allscores", { startDate: dmy, endDate: dmyNext, sports: 1, showOdds: "false" }), S365_HEADERS, 60), new Promise<any>(r => setTimeout(() => r(null), 7000))]);
    games = json?.games ?? [];
  } catch {}
  for (const m of due) {
    const g = games.find(x => sameTeam(x?.homeCompetitor?.name ?? "", m.home.name) && sameTeam(x?.awayCompetitor?.name ?? "", m.away.name));
    if (g) {
      const st = Number(g.statusGroup);
      if (st === 4) m.status = "finished"; else if (st === 3) m.status = "live";
      const hs = Number(g.homeCompetitor?.score), as = Number(g.awayCompetitor?.score);
      if (hs >= 0 && as >= 0) m.score = { home: hs, away: as };
      const t = parseInt(String(g.gameTime ?? ""), 10);
      if (m.status === "live" && t > 0) m.elapsed = t;
      if (g.shortStatusText && m.status === "live" && !(t > 0)) m.statusText = String(g.shortStatusText);
    }
    if (m.status === "live" && (m.elapsed == null || m.elapsed <= 0)) {
      // an estimate: 45 first half, 15 break, then the second half
      const e = Math.floor((now - m.timestamp) / 60);
      m.elapsed = e <= 45 ? Math.max(1, e) : e <= 60 ? 45 : Math.min(90, e - 15);
    }
  }
  return data;
}

/** The same match from two sources ("1. FC Köln" / "FC Cologne"): kept once - the one with more detail. */
export function dedupeMatches(data: any): any {
  const list: any[] = data?.matches ?? [];
  const out: any[] = [];
  const near = (a: any, b: any) => Math.abs((a.timestamp ?? 0) - (b.timestamp ?? 0)) < 3 * 3600;
  // the same team spelled two ways by two sources ("Espanyol" / "Espanol", "Atletico Madrid" / "Ath Madrid"): a shared
  // long word, or the same first 4 letters (both sides must match and the kick-offs be close, so no real match merges)
  const sameSide = (x: string, y: string) => {
    const a = norm(x), b = norm(y);
    return sameTeam(x, y) || a.split(" ").some(w => w.length > 3 && b.includes(w)) || (a.length >= 4 && b.length >= 4 && a.slice(0, 4) === b.slice(0, 4));
  };
  for (const m of list) {
    const i = out.findIndex(o => near(o, m) && sameSide(o.home?.name ?? "", m.home?.name ?? "") && sameSide(o.away?.name ?? "", m.away?.name ?? ""));
    if (i < 0) { out.push(m); continue; }
    const score = (x: any) => (x.elapsed != null ? 2 : 0) + (x.home?.logo ? 1 : 0) + (x.league?.country ? 1 : 0) + (x.channels?.length ? 1 : 0) + (x.favorite ? 4 : 0);
    if (score(m) > score(out[i])) out[i] = { ...m, favorite: m.favorite || out[i].favorite };
    else out[i] = { ...out[i], favorite: m.favorite || out[i].favorite };
  }
  if (data?.matches) data.matches = out;
  return data;
}
