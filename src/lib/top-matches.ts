import { footballDay } from "@/lib/oman-time";
import { S365_HEADERS, remember365Countries, s365Url } from "@/lib/scores365";
import { leagueAlwaysListed, leagueTopClubs, leagueKeyMatches } from "@/lib/match-channels";
import { EXTRA_SOURCES } from "@/lib/match-sources-extra";
import {
  BROWSER_HEADERS, build, getJson, sortMatches, favoriteOf, parseFavSpec, isYouthMatch, isExcludedLeague, AMERICAS_CUP, importanceOf, leagueWeightByName, num, pickTop, sameTeam, shiftedDash, shiftedYmd,
  type SourceAttempt, type TopMatch, type TopMatchesResult,
} from "@/lib/match-core";
import { omanTime } from "@/lib/oman-time";

export type { SourceAttempt, TopMatch, TopMatchesResult } from "@/lib/match-core";
export { importanceOf, leagueWeightByName, normalizeTeamName, pickTop } from "@/lib/match-core";

/**
 * Today's most important football matches from many keyless public / open-data sources, queried in parallel.
 * The source that returns the most important matches wins; every attempt is reported in `attempts`
 * so you can see which sources are reachable from your network/hosting.
 */

/** ESPN competition slug -> name + importance weight. */
export const COMPETITIONS: { slug: string; name: string; weight: number }[] = [
  { slug: "fifa.world", name: "FIFA World Cup", weight: 100 },
  { slug: "uefa.champions", name: "UEFA Champions League", weight: 95 },
  { slug: "uefa.euro", name: "UEFA Euro", weight: 90 },
  { slug: "conmebol.america", name: "Copa America", weight: 90 },
  { slug: "caf.nations", name: "Africa Cup of Nations", weight: 85 },
  { slug: "fifa.cwc", name: "FIFA Club World Cup", weight: 85 },
  { slug: "eng.1", name: "Premier League", weight: 80 },
  { slug: "esp.1", name: "La Liga", weight: 80 },
  { slug: "ita.1", name: "Serie A", weight: 75 },
  { slug: "ger.1", name: "Bundesliga", weight: 75 },
  { slug: "fra.1", name: "Ligue 1", weight: 70 },
  { slug: "ksa.1", name: "Saudi Pro League", weight: 70 },
  { slug: "uefa.europa", name: "UEFA Europa League", weight: 65 },
  { slug: "afc.champions", name: "AFC Champions League", weight: 60 },
  { slug: "fifa.worldq.uefa", name: "World Cup Qualifying - UEFA", weight: 60 },
  { slug: "fifa.worldq.afc", name: "World Cup Qualifying - AFC", weight: 60 },
  { slug: "fifa.worldq.caf", name: "World Cup Qualifying - CAF", weight: 55 },
  { slug: "fifa.worldq.conmebol", name: "World Cup Qualifying - CONMEBOL", weight: 60 },
  { slug: "uefa.europa.conf", name: "UEFA Conference League", weight: 55 },
  { slug: "uefa.nations", name: "UEFA Nations League", weight: 55 },
  { slug: "caf.champions", name: "CAF Champions League", weight: 55 },
  { slug: "eng.fa", name: "FA Cup", weight: 50 },
  { slug: "esp.copa_del_rey", name: "Copa del Rey", weight: 50 },
  { slug: "ita.coppa_italia", name: "Coppa Italia", weight: 45 },
  { slug: "ger.dfb_pokal", name: "DFB Pokal", weight: 45 },
  { slug: "fra.coupe_de_france", name: "Coupe de France", weight: 40 },
  { slug: "fifa.friendly", name: "International Friendly", weight: 40 },
];

/** Map one ESPN scoreboard event. Returns null when it lacks the data we need. */
export function mapEspnEvent(e: any, comp: { slug: string; name: string; weight: number }, leagueMeta?: { name?: string; logo?: string }): TopMatch | null {
  const c = e?.competitions?.[0];
  const home = c?.competitors?.find((x: any) => x.homeAway === "home");
  const away = c?.competitors?.find((x: any) => x.homeAway === "away");
  const ms = Date.parse(e?.date);
  if (!home?.team || !away?.team || !Number.isFinite(ms)) return null;

  const state: string = e.status?.type?.state ?? "pre";
  const status = state === "in" ? "live" : state === "post" ? "finished" : "upcoming";
  const started = status !== "upcoming";
  const timestamp = Math.floor(ms / 1000);
  const homeName = home.team.displayName || home.team.name || "";
  const awayName = away.team.displayName || away.team.name || "";

  return {
    id: String(e.id),
    league: { id: comp.slug, name: leagueMeta?.name || comp.name, logo: leagueMeta?.logo },
    home: { id: String(home.team.id), name: homeName, logo: home.team.logo },
    away: { id: String(away.team.id), name: awayName, logo: away.team.logo },
    timestamp,
    omanTime: omanTime(timestamp),
    status,
    statusText: e.status?.type?.shortDetail || e.status?.type?.description || "",
    elapsed: status === "live" ? num(String(e.status?.displayClock ?? "").replace(/[^\d]/g, "")) : null,
    score: { home: started ? num(home.score) : null, away: started ? num(away.score) : null },
    channels: Array.from(new Set((c?.broadcasts ?? []).flatMap((b: any) => b?.names ?? []))) as string[],
    importance: importanceOf(comp.weight, homeName, awayName),
  };
}

// ---------- Source 1: ESPN ----------
async function fetchCompetition(comp: (typeof COMPETITIONS)[number], range: string, host: string) {
  const json = await getJson(`https://${host}/apis/site/v2/sports/soccer/${comp.slug}/scoreboard?dates=${range}&limit=200`);
  const league = json?.leagues?.[0];
  const meta = { name: league?.name as string | undefined, logo: league?.logos?.[0]?.href as string | undefined };
  return ((json?.events ?? []) as any[]).map(e => mapEspnEvent(e, comp, meta)).filter(Boolean) as TopMatch[];
}

export async function fromEspn(date: string, host = "site.api.espn.com"): Promise<TopMatch[]> {
  const range = `${shiftedYmd(date, -1)}-${shiftedYmd(date, 1)}`;
  const results = await Promise.allSettled(COMPETITIONS.map(c => fetchCompetition(c, range, host)));
  const ok = results.filter(r => r.status === "fulfilled") as PromiseFulfilledResult<TopMatch[]>[];
  if (!ok.length) {
    const first = results.find(r => r.status === "rejected") as PromiseRejectedResult | undefined;
    throw new Error(`unreachable (${first?.reason?.message ?? "unknown"})`);
  }
  return ok.flatMap(r => r.value);
}

// ---------- Source 2: Sofascore ----------
export function mapSofascoreEvent(e: any): TopMatch | null {
  const t = e?.tournament;
  const type: string = e?.status?.type ?? "notstarted";
  if (!e?.homeTeam || !e?.awayTeam || !e?.startTimestamp || ["canceled", "postponed"].includes(type)) return null;
  const leagueName: string = t?.uniqueTournament?.name || t?.name || "";
  const status = type === "inprogress" ? "live" : type === "finished" ? "finished" : "upcoming";
  const started = status !== "upcoming";
  return build({
    id: `ss${e.id}`,
    league: { id: String(t?.uniqueTournament?.id ?? t?.id ?? ""), name: leagueName, logo: t?.uniqueTournament?.id ? `https://api.sofascore.app/api/v1/unique-tournament/${t.uniqueTournament.id}/image` : undefined, country: t?.category?.name || undefined },
    home: { id: String(e.homeTeam.id), name: e.homeTeam.name, logo: `https://api.sofascore.app/api/v1/team/${e.homeTeam.id}/image` },
    away: { id: String(e.awayTeam.id), name: e.awayTeam.name, logo: `https://api.sofascore.app/api/v1/team/${e.awayTeam.id}/image` },
    timestamp: e.startTimestamp,
    status,
    statusText: e.status?.description ?? "",
    elapsed: null,
    score: { home: started ? num(e.homeScore?.current) : null, away: started ? num(e.awayScore?.current) : null },
    channels: [],
  }, leagueWeightByName(leagueName, t?.category?.name));
}

async function fromSofascore(date: string): Promise<TopMatch[]> {
  const days = [-1, 0, 1].map(d => shiftedYmd(date, d)).map(y => `${y.slice(0, 4)}-${y.slice(4, 6)}-${y.slice(6)}`);
  const results = await Promise.all(days.map(d => getJson(`https://api.sofascore.com/api/v1/sport/football/scheduled-events/${d}`, BROWSER_HEADERS("https://www.sofascore.com"))));
  return results.flatMap(j => (j?.events ?? []) as any[]).map(mapSofascoreEvent).filter(Boolean) as TopMatch[];
}

// ---------- Source 3: TheSportsDB ----------
export function mapSportsDbEvent(e: any): TopMatch | null {
  const raw: string | undefined = e?.strTimestamp || (e?.dateEvent && e?.strTime ? `${e.dateEvent}T${e.strTime}` : undefined);
  if (!raw || !e?.strHomeTeam || !e?.strAwayTeam) return null;
  const ms = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(raw) ? raw : `${raw}Z`); // TheSportsDB timestamps are UTC
  if (!Number.isFinite(ms)) return null;
  const st = String(e.strStatus ?? "").toLowerCase();
  const status = /finished|^ft$|aet|pen/.test(st) ? "finished" : !st || /not started|^ns$|scheduled|tbd/.test(st) ? "upcoming" : /postponed|cancel|abandon/.test(st) ? null : "live";
  if (!status) return null;
  const started = status !== "upcoming";
  return build({
    id: `sd${e.idEvent}`,
    league: { id: String(e.idLeague ?? ""), name: e.strLeague ?? "", logo: e.strLeagueBadge || undefined, country: e.strCountry || undefined },
    home: { id: String(e.idHomeTeam ?? ""), name: e.strHomeTeam, logo: e.strHomeTeamBadge || undefined },
    away: { id: String(e.idAwayTeam ?? ""), name: e.strAwayTeam, logo: e.strAwayTeamBadge || undefined },
    timestamp: Math.floor(ms / 1000),
    status,
    statusText: e.strStatus ?? "",
    elapsed: null,
    score: { home: started ? num(e.intHomeScore) : null, away: started ? num(e.intAwayScore) : null },
    channels: e.strTVStation ? [String(e.strTVStation)] : [],
  }, leagueWeightByName(e.strLeague ?? "", e.strCountry));
}

async function fromSportsDb(date: string): Promise<TopMatch[]> {
  const days = [-1, 0, 1].map(d => shiftedYmd(date, d)).map(y => `${y.slice(0, 4)}-${y.slice(4, 6)}-${y.slice(6)}`);
  const results = await Promise.all(days.map(d => getJson(`https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${d}&s=Soccer`)));
  return results.flatMap(j => (j?.events ?? []) as any[]).map(mapSportsDbEvent).filter(Boolean) as TopMatch[];
}

// ---------- Source 4: 365Scores (popular in the Arab world; takes the timezone directly) ----------
/** competitionId -> country name, from the "competitions" + "countries" lists of a 365Scores response */
export function competitionCountries365(json: any): Map<number, string> {
  const countries = new Map<number, string>(((json?.countries ?? []) as any[]).map(c => [Number(c?.id), String(c?.name ?? "")]));
  const out = new Map<number, string>();
  for (const c of (json?.competitions ?? []) as any[]) {
    const name = countries.get(Number(c?.countryId));
    if (name) out.set(Number(c.id), name);
  }
  return out;
}

export function map365Game(g: any, countryOf?: Map<number, string>): TopMatch | null {
  const ms = Date.parse(g?.startTime);
  if (!g?.homeCompetitor?.name || !g?.awayCompetitor?.name || !Number.isFinite(ms)) return null;
  const group = Number(g.statusGroup); // 2 = scheduled, 3 = live, 4 = finished
  const text = String(g.statusText ?? "");
  const status = group === 3 ? "live" : group === 4 ? "finished" : /postpon|cancel|abandon|suspend/i.test(text) ? null : "upcoming";
  if (!status) return null;
  const started = status !== "upcoming";
  const img = (kind: string, id: unknown) => `https://imagecache.365scores.com/image/upload/f_png,w_64,h_64,c_limit,q_auto:eco/${kind}/${id}`;
  const leagueName: string = g.competitionDisplayName || "";
  const country = countryOf?.get(Number(g.competitionId));
  return build({
    id: `365${g.id}`,
    league: { id: String(g.competitionId ?? ""), name: leagueName, logo: g.competitionId ? img("Competitions", g.competitionId) : undefined, country },
    home: { id: String(g.homeCompetitor.id), name: g.homeCompetitor.name, logo: img("Competitors", g.homeCompetitor.id) },
    away: { id: String(g.awayCompetitor.id), name: g.awayCompetitor.name, logo: img("Competitors", g.awayCompetitor.id) },
    timestamp: Math.floor(ms / 1000),
    status,
    statusText: text,
    elapsed: status === "live" ? num(String(g.gameTime ?? "").split(".")[0]) : null,
    score: { home: started ? num(g.homeCompetitor.score) : null, away: started ? num(g.awayCompetitor.score) : null },
    channels: ((g.tvNetworks ?? []) as any[]).map(t => t?.name).filter(Boolean),
  }, leagueWeightByName(leagueName, country));
}

async function from365(date: string): Promise<TopMatch[]> {
  const [y, m, d] = date.split("-");
  const dmy = `${d}/${m}/${y}`; // 365Scores wants DD/MM/YYYY
  const next = shiftedYmd(date, 1); // the football day runs until 05:00 the next morning
  const dmyNext = `${next.slice(6)}/${next.slice(4, 6)}/${next.slice(0, 4)}`;
  // The day list keeps the request that is known to return every competition; the Gulf country (TV channels) is only
  // used for one match's details - with it the list came back with far fewer matches.
  const url = `https://webws.365scores.com/web/games/allscores/?appTypeId=5&langId=1&timezoneName=Asia/Muscat&userCountryId=1&startDate=${dmy}&endDate=${dmyNext}&sports=1&showOdds=false`;
  const json = await getJson(url, S365_HEADERS);
  remember365Countries(json);
  const countryOf = competitionCountries365(json);
  return ((json?.games ?? []) as any[]).map(g => map365Game(g, countryOf)).filter(Boolean) as TopMatch[];
}

export const SOURCES: { name: string; kind?: string; run: (date: string) => Promise<TopMatch[]> }[] = [
  { name: "espn", run: fromEspn },
  { name: "365scores", run: from365 },
  { name: "sofascore", run: fromSofascore },
  { name: "thesportsdb", run: fromSportsDb },
  ...EXTRA_SOURCES,
];

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

type Raw = { attempt: SourceAttempt; matches: TopMatch[]; priority: number };
type Run = { attempt: SourceAttempt; top: TopMatch[]; day: TopMatch[]; total: number; priority: number };
interface DayData { date: string; at: number; raws: Raw[]; live: boolean }

const FRESH_MS = 60_000;
const LIVE_FRESH_MS = 20_000;          // while something is live, refresh faster
const STALE_OK_MS = 15 * 60_000;       // an older answer is still returned at once (and refreshed in the background)...
const LIVE_STALE_OK_MS = 60_000;       // ...but live scores may be at most a minute old
const GRACE_MS = 2500;                 // after a source already filled the list, wait this long for the others, then decide
const READY_LIMIT = 12;
const dayCache = new Map<string, DayData>();
const inflight = new Map<string, Promise<DayData>>();
let lastUsedAt = 0;

/** Runs every source for one football day (3-day windows, filtered later) and keeps their raw matches. */
async function collectDay(date: string, only?: string): Promise<DayData> {
  const chosen = only ? SOURCES.filter(s => s.name === only) : SOURCES;
  if (!chosen.length) throw new Error(`unknown source "${only}"`);

  const runOne = async (src: (typeof SOURCES)[number], priority: number): Promise<Raw & { importantCount: number }> => {
    const t0 = Date.now();
    try {
      const matches = await withTimeout(src.run(date), 25000);
      const { total, top } = pickTop(matches, date, READY_LIMIT);
      const importantCount = top.filter(m => m.importance > 0).length;
      return { attempt: { source: src.name, kind: src.kind, ok: true, ms: Date.now() - t0, total, important: importantCount }, matches, priority, importantCount };
    } catch (e: any) {
      return { attempt: { source: src.name, kind: src.kind, ok: false, ms: Date.now() - t0, total: 0, important: 0, error: e?.message || "failed" }, matches: [], priority, importantCount: 0 };
    }
  };

  // Don't wait for the slowest source: once the preferred one (or, without it, any) has filled the list, give the
  // others a short grace period.
  const finished: (Raw & { importantCount: number })[] = [];
  await new Promise<void>(resolve => {
    let pending = chosen.length;
    let grace: ReturnType<typeof setTimeout> | undefined;
    chosen.forEach((src, priority) => {
      runOne(src, priority).then(r => {
        finished.push(r);
        pending--;
        const pref = finished.find(f => f.attempt.source === "365scores");
        const prefOut = !chosen.some(c => c.name === "365scores") || (pref && !(pref.attempt.ok && pref.importantCount > 0));
        const ready = (r.attempt.source === "365scores" && r.attempt.ok && r.importantCount > 0)
          || (prefOut && finished.some(f => f.attempt.ok && f.importantCount >= READY_LIMIT));
        if (ready && !grace) grace = setTimeout(resolve, GRACE_MS);
        if (pending === 0) { if (grace) clearTimeout(grace); resolve(); }
      });
    });
  });

  const done = new Set(finished.map(r => r.attempt.source));
  const raws: Raw[] = [
    ...finished.sort((a, b) => a.priority - b.priority).map(({ importantCount: _i, ...r }) => r),
    ...chosen.filter(s => !done.has(s.name)).map((s, i) => ({ attempt: { source: s.name, kind: s.kind, ok: false, ms: 0, total: 0, important: 0, error: "skipped (slow)" }, matches: [], priority: 1000 + i })),
  ];
  if (!raws.some(r => r.attempt.ok)) {
    throw new Error(`تعذر الوصول لأي مصدر / no source reachable: ${raws.map(r => `${r.attempt.source}: ${r.attempt.error}`).join(" | ")}`);
  }
  // "live" = a match that would be listed (important, a favourite...) is being played; hundreds of minor matches are
  // live on any football day, and counting them kept today on the fastest refresh all day long
  const live = raws.some(r => r.matches.some(m => m.status === "live" && m.importance > 0 && footballDay(new Date(m.timestamp * 1000)) === date));
  return { date, at: Date.now(), raws, live };
}

/** Day data with stale-while-revalidate: fresh -> cached; a bit old -> cached now + refreshed in the background. */
async function getDay(date: string, only?: string): Promise<DayData> {
  const key = `${date}|${only ?? ""}`;
  const refresh = () => {
    let p = inflight.get(key);
    if (!p) {
      p = collectDay(date, only).then(d => { dayCache.set(key, d); return d; }).finally(() => inflight.delete(key));
      inflight.set(key, p);
    }
    return p;
  };
  const hit = dayCache.get(key);
  if (hit) {
    const age = Date.now() - hit.at;
    if (age < (hit.live ? LIVE_FRESH_MS : FRESH_MS)) return hit;
    // Today with matches live used to wait for every source again after one minute: each request then blocked on
    // 14 sources (up to 25 s each), and when they rate-limited the frequent calls ("no source reachable") the
    // request failed - yesterday / tomorrow (never live) were served from the cache and didn't fail. Now any answer
    // under an hour old comes back at once and is refreshed in the background; a failed refresh keeps it.
    if (age < (hit.live ? LIVE_STALE_OK_MS : STALE_OK_MS) || age < 60 * 60_000) { refresh().catch(() => {}); return hit; }
    return refresh().catch(() => hit);
  }
  return refresh();
}

/**
 * Keeps today's matches ready in memory while the app is being used (started from instrumentation.ts), so
 * /api/matches answers instantly instead of waiting for 14 sources. Idle for 10 minutes -> stops calling the sources.
 */
export function startMatchesWarmup() {
  const g = globalThis as any;
  if (g.__matchesWarmup) return;
  // every 30 s while something is live, every 5 minutes otherwise (fewer calls = no rate limiting by the sources)
  let last = 0;
  const tick = () => {
    if (!(Date.now() - lastUsedAt < 10 * 60_000 || !dayCache.size)) return;
    const hit = dayCache.get(`${footballDay()}|`);
    if (hit && Date.now() - last < (hit.live ? 30_000 : 5 * 60_000)) return;
    last = Date.now();
    getDay(footballDay()).catch(() => {});
  };
  tick();
  g.__matchesWarmup = setInterval(tick, 15_000);
  g.__matchesWarmup.unref?.();
}

/**
 * @param teams team names whose matches today must be included even if they aren't "important" (favourite teams)
 */
const AMERICAS_BIG = ["Flamengo", "Palmeiras", "Boca Juniors", "River Plate"];

export async function getTopMatchesToday(limit = 10, only?: string, includeAll = false, teams: string[] = [], dayOffset = 0, pins: string[] = [], follow: string[] = []): Promise<TopMatchesResult> {
  if (!dayOffset) lastUsedAt = Date.now();
  // until 05:00 Oman time this is still yesterday's football day; -1 / +1 = yesterday's / tomorrow's matches
  const date = dayOffset ? shiftedDash(footballDay(), dayOffset) : footballDay();
  const day = await getDay(date, only);

  const runs: Run[] = day.raws.map(r => {
    if (!r.attempt.ok) return { attempt: r.attempt, top: [], day: [], total: 0, priority: r.priority };
    const { total, top, day: list } = pickTop(r.matches, date, limit);
    const important = includeAll ? top : top.filter(m => m.importance > 0);
    return { attempt: { ...r.attempt, total, important: important.length }, top: important, day: list, total, priority: r.priority };
  });
  const working = runs.filter(r => r.attempt.ok);
  const quality = (r: Run) => r.top.reduce((n, m) => n + m.importance, 0);
  const byQuality = [...working].sort((a, b) => quality(b) - quality(a) || b.total - a.total || a.priority - b.priority);
  // 365Scores is preferred (live scores, channels, Arab-region coverage) - but only when its list isn't clearly
  // poorer than the best other source (a reduced answer used to win with a single match).
  const s365 = working.find(r => r.attempt.source === "365scores" && r.top.length > 0);
  const bestOther = byQuality.find(r => r !== s365);
  const best = s365 && (!bestOther || s365.top.length >= Math.min(limit, Math.ceil(bestOther.top.length * 0.7))) ? s365 : byQuality[0];
  // favourites: the club itself ("Liverpool~England"), not a namesake abroad or its youth / B side
  const specs = teams.map(parseFavSpec);
  const isFav = (m: TopMatch) => specs.some(f => favoriteOf(f, m));
  // pinned matches' teams: always listed, but not favourites (no goal alerts, no island unless pinned)
  const isPin = (m: TopMatch) => pins.some(t => sameTeam(t, m.home.name) || sameTeam(t, m.away.name));
  // always shown besides the top list: favourite teams' matches, and every match of a league that has a regional
  // channel (Saudi -> Thmanyah, UAE -> AD Sports / Sharjah, Bundesliga -> MBC Action, Serie A -> STARZPLAY, Oman...)
  // (yesterday / tomorrow: only the favourites besides the important matches)
  // followed competitions: every match listed (not favourites: no bell, no island)
  const isFollowed = (m: TopMatch) => follow.some(k => leagueKeyMatches(k, m.league));
  const isExtra = (m: TopMatch) => isFav(m) || isPin(m) || isFollowed(m) || (!includeAll && !dayOffset && leagueAlwaysListed(m.league));
  const favExtra: TopMatch[] = [];
  for (const r of [best, ...working.filter(w => w !== best)]) {
    for (const m of r.day) {
      if (!isExtra(m) || best.top.some(t => t.id === m.id) || [...favExtra].some(f => f.id === m.id || (sameTeam(f.home.name, m.home.name) && sameTeam(f.away.name, m.away.name)))) continue;
      if (best.top.some(t => sameTeam(t.home.name, m.home.name) && sameTeam(t.away.name, m.away.name))) continue;
      favExtra.push(m);
    }
  }
  return {
    date,
    timezone: "Asia/Muscat",
    source: best.attempt.source,
    total: best.total,
    // Favourite teams' matches are always included; order: live favourites, live, favourites, then the rest
    // Belgian, Dutch, Brazilian, Argentine leagues: only the two biggest clubs (and favourite teams)
    matches: sortMatches([...best.top, ...favExtra].filter(m => {
      if (isYouthMatch(m) && !isFav(m)) return false; // no U18 / U21 / reserves / women
      // never fetched: lower tiers (any country), the Americas except MLS / Brazil Série A / Argentina's top league
      const excluded = isExcludedLeague(m.league);
      if (!isFollowed(m) && (excluded === "lower-tier" || (excluded === "americas" && !isFav(m)))) return false;
      // Libertadores & co.: only with the four big clubs kept from Brazil and Argentina (or a favourite)
      if (AMERICAS_CUP.test(m.league.name) && !isFav(m) && !AMERICAS_BIG.some(t => sameTeam(t, m.home.name) || sameTeam(t, m.away.name))) return false;
      const clubs = isFav(m) || includeAll || isFollowed(m) ? null : leagueTopClubs(m.league);
      return !clubs || clubs.some(t => sameTeam(t, m.home.name) || sameTeam(t, m.away.name));
    }).map(m => (isFav(m) ? { ...m, favorite: true } : isFollowed(m) ? { ...m, followed: true } : m))),
    attempts: runs.map(r => r.attempt),
    fetchedAt: new Date(day.at).toISOString(),
  };
}

/** 365Scores competitor id per team name (search once, kept for a day). */
const teamIds365 = new Map<string, { id: number | null; at: number }>();
async function find365TeamId(name: string, country?: string): Promise<number | null> {
  const key = `${name.trim().toLowerCase()}~${(country ?? "").toLowerCase()}`;
  const hit = teamIds365.get(key);
  if (hit && Date.now() - hit.at < 86_400_000) return hit.id;
  try {
    const json = await getJson(await s365Url("search", { query: name, filter: "competitors" }), S365_HEADERS, 86_400);
    const countries = new Map<number, string>(((json?.countries ?? []) as any[]).map(c => [Number(c.id), String(c.name)]));
    // the same club in its own country (Liverpool of England, not of Uruguay)
    const list = ((json?.competitors ?? []) as any[]).filter(c => (c.sportId ?? 1) === 1 && c.name)
      .filter(c => favoriteOf({ name, country }, { home: { id: "", name: c.name }, away: { id: "", name: "" }, league: { id: "", name: "", country: countries.get(Number(c.countryId)) } }));
    const lower = name.trim().toLowerCase();
    const best = list.find(c => String(c.name).toLowerCase() === lower) ?? list[0] ?? null;
    teamIds365.set(key, { id: best ? Number(best.id) : null, at: Date.now() });
    return best ? Number(best.id) : null;
  } catch {
    return null; // not cached: try again next time
  }
}

/**
 * Favourite teams' upcoming matches over the next `days` days, starting tomorrow. One 365Scores "fixtures" call
 * for all the teams (their ids found by name once); teams 365Scores doesn't know fall back to the day lists of the
 * next few days, within a time budget so the request never runs into the platform's time limit.
 */
export async function getFavoriteUpcoming(teams: string[], days = 14): Promise<{ matches: TopMatch[]; days: string[] }> {
  if (!teams.length) return { matches: [], days: [] };
  const specs = teams.map(parseFavSpec);
  const isFav = (m: TopMatch) => specs.some(f => favoriteOf(f, m)) && !isYouthMatch(m);
  const dates = Array.from({ length: days }, (_, i) => shiftedDash(footballDay(), i + 1));
  const inRange = (m: TopMatch) => { const d = footballDay(new Date(m.timestamp * 1000)); return d >= dates[0] && d <= dates[dates.length - 1]; };
  const found: TopMatch[] = [];
  const add = (m: TopMatch) => {
    if (!inRange(m) || !isFav(m)) return;
    if (found.some(f => f.id === m.id || (sameTeam(f.home.name, m.home.name) && sameTeam(f.away.name, m.away.name) && Math.abs(f.timestamp - m.timestamp) < 6 * 3600))) return;
    found.push({ ...m, favorite: true });
  };

  // 1) 365Scores fixtures, all teams in one call
  const ids: (number | null)[] = [];
  for (let i = 0; i < teams.length; i += 8) ids.push(...await Promise.all(specs.slice(i, i + 8).map(f => find365TeamId(f.name, f.country))));
  const known = [...new Set(ids.filter((x): x is number => !!x))];
  let fixturesOk = false;
  if (known.length) {
    try {
      const json = await getJson(await s365Url("games/fixtures", { competitors: known.join(","), showOdds: "false" }), S365_HEADERS, 600);
      remember365Countries(json);
      const countryOf = competitionCountries365(json);
      for (const g of (json?.games ?? []) as any[]) { const m = map365Game(g, countryOf); if (m) add(m); }
      fixturesOk = true;
    } catch { /* fall back below */ }
  }

  // 2) the day lists for the rest (teams 365Scores doesn't know, or everything if the fixtures call failed)
  const rest = fixturesOk ? teams.filter((_, i) => !ids[i]) : teams;
  if (rest.length) {
    const deadline = Date.now() + 20_000;
    const restSpecs = rest.map(parseFavSpec);
    const restFav = (m: TopMatch) => restSpecs.some(f => favoriteOf(f, m));
    for (let i = 0; i < Math.min(dates.length, 7) && Date.now() < deadline; i += 3) {
      await Promise.race([
        Promise.all(dates.slice(i, i + 3).map(async date => {
          try {
            const day = await getDay(date);
            for (const r of [...day.raws].sort((a, b) => a.priority - b.priority)) for (const m of r.matches) if (restFav(m)) add(m);
          } catch { /* day unreachable: skip */ }
        })),
        new Promise(res => setTimeout(res, Math.max(0, deadline - Date.now()))),
      ]);
    }
  }
  return { matches: found.sort((a, b) => a.timestamp - b.timestamp), days: dates };
}

/**
 * Every match being played right now (today's football day, all working sources merged), strongest first:
 * importance (league + big clubs), favourites on top. Same exclusions as the lists (lower tiers, the Americas
 * outside MLS / Brazil / Argentina, youth and women's matches).
 */
export async function getLiveNow(teams: string[] = [], follow: string[] = []): Promise<{ date: string; matches: TopMatch[]; fetchedAt: string }> {
  const date = footballDay();
  const day = await getDay(date);
  const specs = teams.map(parseFavSpec);
  const isFav = (m: TopMatch) => specs.some(f => favoriteOf(f, m));
  const out: TopMatch[] = [];
  for (const r of [...day.raws].sort((a, b) => a.priority - b.priority)) {
    for (const m of r.matches) {
      if (m.status !== "live") continue;
      if (out.some(o => o.id === m.id || (sameTeam(o.home.name, m.home.name) && sameTeam(o.away.name, m.away.name)))) continue;
      const fav = isFav(m);
      if (isYouthMatch(m) && !fav) continue;
      const excluded = isExcludedLeague(m.league);
      const followed = follow.some(k => leagueKeyMatches(k, m.league));
      if (!followed && (excluded === "lower-tier" || (excluded === "americas" && !fav))) continue;
      out.push(fav ? { ...m, favorite: true } : followed ? { ...m, followed: true } : m);
    }
  }
  out.sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || b.importance - a.importance || a.timestamp - b.timestamp);
  return { date, matches: out, fetchedAt: new Date(day.at).toISOString() };
}
