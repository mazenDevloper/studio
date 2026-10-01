import {
  BROWSER_HEADERS, UA, build, getJson, leagueWeightByName, num, seasonStartYear, shiftedDash, shiftedYmd, zonedToUnix,
  type TopMatch,
} from "@/lib/match-core";

/**
 * Ten more keyless sources: five public/unofficial JSON feeds and five open-data feeds.
 * Each `run(omanDate)` returns raw matches (a 3-day window is fine); the caller filters by Oman date.
 * Field names follow each provider's documented/observed format; mappers return null for anything unexpected.
 */

export type MatchSource = { name: string; kind: "public" | "open"; run: (date: string) => Promise<TopMatch[]> };

const dayWindow = (date: string) => [-1, 0, 1];
const nowSec = () => Math.floor(Date.now() / 1000);

/** Fixture feeds have no live data: a started match without a score is treated as live for ~2h. */
function statusFromTimes(timestamp: number, hasScore: boolean): "upcoming" | "live" | "finished" {
  if (hasScore) return "finished";
  const n = nowSec();
  return n >= timestamp && n <= timestamp + 2 * 3600 ? "live" : n > timestamp + 2 * 3600 ? "finished" : "upcoming";
}

const stripClub = (n: string) => n.replace(/\s+(FC|CF|AFC|SC)$/i, "").replace(/^(FC|AFC)\s+/i, "").trim();

// ================= PUBLIC / UNOFFICIAL (5) =================

// ---- 1. Livescore (offset 0 => Esd is UTC) ----
export function mapLivescoreStages(json: any): TopMatch[] {
  const out: TopMatch[] = [];
  for (const st of (json?.Stages ?? []) as any[]) {
    const leagueName = String(st.CompN || st.Snm || "");
    const weight = leagueWeightByName(leagueName, st.Cnm);
    for (const e of (st.Events ?? []) as any[]) {
      const esd = String(e.Esd ?? "");
      const t1 = e.T1?.[0], t2 = e.T2?.[0];
      if (!t1?.Nm || !t2?.Nm || esd.length < 12) continue;
      const ts = Math.floor(Date.UTC(+esd.slice(0, 4), +esd.slice(4, 6) - 1, +esd.slice(6, 8), +esd.slice(8, 10), +esd.slice(10, 12)) / 1000);
      const eps = String(e.Eps ?? "");
      if (/postp|canc|aband/i.test(eps)) continue;
      const status = /^(FT|AET|AP|Pen)/i.test(eps) ? "finished" : /^(NS|\?)?$/i.test(eps) ? "upcoming" : "live";
      const started = status !== "upcoming";
      out.push(build({
        id: `ls${e.Eid}`,
        league: { id: String(st.Sid ?? ""), name: leagueName },
        home: { id: String(t1.ID ?? ""), name: t1.Nm, logo: t1.Img ? `https://lsm-static-prod.livescore.com/medium/${t1.Img}` : undefined },
        away: { id: String(t2.ID ?? ""), name: t2.Nm, logo: t2.Img ? `https://lsm-static-prod.livescore.com/medium/${t2.Img}` : undefined },
        timestamp: ts, status, statusText: eps, elapsed: status === "live" ? num(eps.replace(/[^\d]/g, "")) : null,
        score: { home: started ? num(e.Tr1) : null, away: started ? num(e.Tr2) : null }, channels: [],
      }, weight));
    }
  }
  return out;
}
async function fromLivescore(date: string): Promise<TopMatch[]> {
  const days = dayWindow(date).map(d => shiftedYmd(date, d));
  const res = await Promise.all(days.map(y => getJson(`https://prod-cdn-public-api.livescore.com/v1/api/app/date/soccer/${y}/0?locale=en&MD=1`, BROWSER_HEADERS("https://www.livescore.com"))));
  return res.flatMap(mapLivescoreStages);
}

// ---- 2. FotMob ----
export function mapFotmob(json: any): TopMatch[] {
  const out: TopMatch[] = [];
  for (const lg of (json?.leagues ?? []) as any[]) {
    const country = lg.ccode === "ENG" ? "England" : lg.ccode;
    const weight = leagueWeightByName(String(lg.name ?? ""), country);
    for (const m of (lg.matches ?? []) as any[]) {
      const ms = Date.parse(m?.status?.utcTime);
      if (!m?.home?.name || !m?.away?.name || !Number.isFinite(ms) || m.status?.cancelled) continue;
      const status = m.status?.finished ? "finished" : m.status?.started ? "live" : "upcoming";
      const sc = String(m.status?.scoreStr ?? "").match(/(\d+)\s*-\s*(\d+)/);
      const started = status !== "upcoming";
      out.push(build({
        id: `fm${m.id}`,
        league: { id: String(lg.primaryId ?? lg.id ?? ""), name: String(lg.name ?? "") },
        home: { id: String(m.home.id), name: m.home.name, logo: `https://images.fotmob.com/image_resources/logo/teamlogo/${m.home.id}.png` },
        away: { id: String(m.away.id), name: m.away.name, logo: `https://images.fotmob.com/image_resources/logo/teamlogo/${m.away.id}.png` },
        timestamp: Math.floor(ms / 1000), status, statusText: String(m.status?.reason?.short ?? ""), elapsed: null,
        score: { home: started && sc ? +sc[1] : null, away: started && sc ? +sc[2] : null }, channels: [],
      }, weight));
    }
  }
  return out;
}
async function fromFotmob(date: string): Promise<TopMatch[]> {
  const days = dayWindow(date).map(d => shiftedYmd(date, d));
  const h = BROWSER_HEADERS("https://www.fotmob.com");
  const res = await Promise.all(days.map(async y => {
    try { return await getJson(`https://www.fotmob.com/api/data/matches?date=${y}&timezone=Asia%2FMuscat&ccode3=OMN`, h); }
    catch { return getJson(`https://www.fotmob.com/api/matches?date=${y}&timezone=Asia%2FMuscat&ccode3=OMN`, h); }
  }));
  return res.flatMap(mapFotmob);
}

// ---- 3. Sofascore via the www host (a different edge than api.sofascore.com) ----
async function fromSofascoreWww(date: string): Promise<TopMatch[]> {
  const { mapSofascoreEvent } = await import("@/lib/top-matches");
  const res = await Promise.all(dayWindow(date).map(d => getJson(`https://www.sofascore.com/api/v1/sport/football/scheduled-events/${shiftedDash(date, d)}`, BROWSER_HEADERS("https://www.sofascore.com"))));
  return res.flatMap(j => (j?.events ?? []) as any[]).map(mapSofascoreEvent).filter(Boolean) as TopMatch[];
}

// ---- 4. ESPN via its web host ----
async function fromEspnWeb(date: string): Promise<TopMatch[]> {
  const { fromEspn } = await import("@/lib/top-matches");
  return fromEspn(date, "site.web.api.espn.com");
}

// ---- 5. Premier League's official Fantasy API (PL only, UTC kick-offs) ----
export function mapFpl(fixtures: any[], teams: any[]): TopMatch[] {
  const byId = new Map<number, any>(teams.map(t => [t.id, t]));
  const out: TopMatch[] = [];
  for (const f of fixtures) {
    const h = byId.get(f.team_h), a = byId.get(f.team_a), ms = Date.parse(f.kickoff_time);
    if (!h || !a || !Number.isFinite(ms)) continue;
    const status = f.finished || f.finished_provisional ? "finished" : f.started ? "live" : "upcoming";
    const started = status !== "upcoming";
    out.push(build({
      id: `fpl${f.id}`,
      league: { id: "fpl-pl", name: "Premier League" },
      home: { id: String(h.id), name: h.name, logo: `https://resources.premierleague.com/premierleague/badges/70/t${h.code}.png` },
      away: { id: String(a.id), name: a.name, logo: `https://resources.premierleague.com/premierleague/badges/70/t${a.code}.png` },
      timestamp: Math.floor(ms / 1000), status, statusText: "", elapsed: status === "live" ? num(f.minutes) : null,
      score: { home: started ? num(f.team_h_score) : null, away: started ? num(f.team_a_score) : null }, channels: [],
    }, 80));
  }
  return out;
}
async function fromFpl(): Promise<TopMatch[]> {
  const [boot, fixtures] = await Promise.all([
    getJson("https://fantasy.premierleague.com/api/bootstrap-static/", UA),
    getJson("https://fantasy.premierleague.com/api/fixtures/", UA),
  ]);
  return mapFpl(fixtures ?? [], boot?.teams ?? []);
}

// ================= OPEN DATA / OPEN SOURCE (5) =================

// ---- 6. OpenLigaDB (open-source community API, Germany) ----
export function mapOpenLiga(matches: any[], label: string, weight: number): TopMatch[] {
  const out: TopMatch[] = [];
  for (const m of matches) {
    const ms = Date.parse(m?.matchDateTimeUTC ?? "");
    if (!m?.team1?.teamName || !m?.team2?.teamName || !Number.isFinite(ms)) continue;
    const results = (m.matchResults ?? []) as any[];
    const final = results.find(r => r.resultTypeID === 2) ?? results.sort((x, y) => (y.resultOrderID ?? 0) - (x.resultOrderID ?? 0))[0];
    const ts = Math.floor(ms / 1000);
    const status = m.matchIsFinished ? "finished" : statusFromTimes(ts, false);
    const started = status !== "upcoming";
    out.push(build({
      id: `ol${m.matchID}`,
      league: { id: `ol-${label}`, name: label },
      home: { id: String(m.team1.teamId), name: m.team1.teamName, logo: m.team1.teamIconUrl || undefined },
      away: { id: String(m.team2.teamId), name: m.team2.teamName, logo: m.team2.teamIconUrl || undefined },
      timestamp: ts, status, statusText: "", elapsed: null,
      score: { home: started ? num(final?.pointsTeam1) : null, away: started ? num(final?.pointsTeam2) : null }, channels: [],
    }, weight));
  }
  return out;
}
async function fromOpenLiga(date: string): Promise<TopMatch[]> {
  const y = seasonStartYear(date);
  const feeds: [string, string, number][] = [["bl1", "Bundesliga", 75], ["dfb", "DFB Pokal", 45]];
  const res = await Promise.allSettled(feeds.map(([code, label, w]) => getJson(`https://api.openligadb.de/getmatchdata/${code}/${y}`, UA).then(j => mapOpenLiga(j ?? [], label, w))));
  const ok = res.filter(r => r.status === "fulfilled") as PromiseFulfilledResult<TopMatch[]>[];
  if (!ok.length) throw new Error((res[0] as PromiseRejectedResult).reason?.message ?? "failed");
  return ok.flatMap(r => r.value);
}

// ---- 7. openfootball/football.json (GitHub, public domain). Times are league-local wall-clock. ----
const OPENFOOTBALL: { file: string; name: string; weight: number; tz: string }[] = [
  { file: "en.1", name: "Premier League", weight: 80, tz: "Europe/London" },
  { file: "es.1", name: "La Liga", weight: 80, tz: "Europe/Madrid" },
  { file: "it.1", name: "Serie A", weight: 75, tz: "Europe/Rome" },
  { file: "de.1", name: "Bundesliga", weight: 75, tz: "Europe/Berlin" },
  { file: "fr.1", name: "Ligue 1", weight: 70, tz: "Europe/Paris" },
  { file: "pt.1", name: "Primeira Liga", weight: 40, tz: "Europe/Lisbon" },
  { file: "nl.1", name: "Eredivisie", weight: 40, tz: "Europe/Amsterdam" },
];
export function mapOpenFootball(json: any, lg: (typeof OPENFOOTBALL)[number]): TopMatch[] {
  const out: TopMatch[] = [];
  for (const m of (json?.matches ?? []) as any[]) {
    if (!m?.date || !m?.time || !m?.team1 || !m?.team2) continue;
    const ts = zonedToUnix(m.date, String(m.time).slice(0, 5), lg.tz);
    const ft = Array.isArray(m.score?.ft) ? m.score.ft : Array.isArray(m.score) ? m.score : null;
    const status = statusFromTimes(ts, !!ft);
    const started = status !== "upcoming";
    out.push(build({
      id: `of-${lg.file}-${m.date}-${m.team1}-${m.team2}`,
      league: { id: `of-${lg.file}`, name: lg.name },
      home: { id: String(m.team1), name: stripClub(String(m.team1)) },
      away: { id: String(m.team2), name: stripClub(String(m.team2)) },
      timestamp: ts, status, statusText: m.round ?? "", elapsed: null,
      score: { home: started && ft ? num(ft[0]) : null, away: started && ft ? num(ft[1]) : null }, channels: [],
    }, lg.weight));
  }
  return out;
}
async function fromOpenFootball(date: string): Promise<TopMatch[]> {
  const y = seasonStartYear(date);
  const season = `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
  const res = await Promise.allSettled(OPENFOOTBALL.map(lg =>
    getJson(`https://raw.githubusercontent.com/openfootball/football.json/master/${season}/${lg.file}.json`, UA).then(j => mapOpenFootball(j, lg))));
  const ok = res.filter(r => r.status === "fulfilled") as PromiseFulfilledResult<TopMatch[]>[];
  if (!ok.length) throw new Error((res[0] as PromiseRejectedResult).reason?.message ?? "failed");
  return ok.flatMap(r => r.value);
}

// ---- 8. fixturedownload.com public JSON feeds (UTC) ----
const FIXTUREDOWNLOAD: { slug: string; name: string; weight: number }[] = [
  { slug: "champions-league", name: "UEFA Champions League", weight: 95 },
  { slug: "epl", name: "Premier League", weight: 80 },
  { slug: "la-liga", name: "La Liga", weight: 80 },
  { slug: "serie-a", name: "Serie A", weight: 75 },
  { slug: "bundesliga", name: "Bundesliga", weight: 75 },
  { slug: "ligue-1", name: "Ligue 1", weight: 70 },
];
export function mapFixtureDownload(rows: any[], lg: (typeof FIXTUREDOWNLOAD)[number]): TopMatch[] {
  const out: TopMatch[] = [];
  for (const r of rows) {
    const ms = Date.parse(String(r?.DateUtc ?? "").replace(" ", "T"));
    if (!r?.HomeTeam || !r?.AwayTeam || !Number.isFinite(ms)) continue;
    const ts = Math.floor(ms / 1000);
    const hasScore = r.HomeTeamScore !== null && r.HomeTeamScore !== undefined;
    const status = statusFromTimes(ts, hasScore);
    const started = status !== "upcoming";
    out.push(build({
      id: `fd-${lg.slug}-${r.MatchNumber}`,
      league: { id: `fd-${lg.slug}`, name: lg.name },
      home: { id: String(r.HomeTeam), name: String(r.HomeTeam) },
      away: { id: String(r.AwayTeam), name: String(r.AwayTeam) },
      timestamp: ts, status, statusText: r.RoundNumber ? `Round ${r.RoundNumber}` : "", elapsed: null,
      score: { home: started ? num(r.HomeTeamScore) : null, away: started ? num(r.AwayTeamScore) : null }, channels: [],
    }, lg.weight));
  }
  return out;
}
async function fromFixtureDownload(date: string): Promise<TopMatch[]> {
  const y = seasonStartYear(date);
  const res = await Promise.allSettled(FIXTUREDOWNLOAD.map(lg => getJson(`https://fixturedownload.com/feed/json/${lg.slug}-${y}`, UA).then(j => mapFixtureDownload(j ?? [], lg))));
  const ok = res.filter(r => r.status === "fulfilled") as PromiseFulfilledResult<TopMatch[]>[];
  if (!ok.length) throw new Error((res[0] as PromiseRejectedResult).reason?.message ?? "failed");
  return ok.flatMap(r => r.value);
}

// ---- 9. football-data.co.uk fixtures.csv (open data; kick-offs in UK time) ----
const FDUK_DIVS: Record<string, { name: string; weight: number }> = {
  E0: { name: "Premier League", weight: 80 }, SP1: { name: "La Liga", weight: 80 }, I1: { name: "Serie A", weight: 75 },
  D1: { name: "Bundesliga", weight: 75 }, F1: { name: "Ligue 1", weight: 70 }, N1: { name: "Eredivisie", weight: 40 },
  P1: { name: "Primeira Liga", weight: 40 }, SC0: { name: "Scottish Premiership", weight: 35 }, E1: { name: "Championship", weight: 30 },
};
function csvRow(line: string): string[] {
  const out: string[] = []; let cur = "", q = false;
  for (const ch of line) {
    if (ch === '"') q = !q; else if (ch === "," && !q) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out;
}
export function mapFootballDataCsv(csv: string): TopMatch[] {
  const lines = csv.replace(/^﻿/, "").split(/\r?\n/).filter(Boolean);
  const head = csvRow(lines[0]);
  const col = (n: string) => head.indexOf(n);
  const [iDiv, iDate, iTime, iHome, iAway] = ["Div", "Date", "Time", "HomeTeam", "AwayTeam"].map(col);
  if ([iDiv, iDate, iHome, iAway].some(i => i < 0)) return [];
  const out: TopMatch[] = [];
  for (const line of lines.slice(1)) {
    const r = csvRow(line);
    const div = FDUK_DIVS[r[iDiv]];
    const dm = String(r[iDate] ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (!div || !dm || !r[iHome] || !r[iAway]) continue;
    const yyyy = dm[3].length === 2 ? `20${dm[3]}` : dm[3];
    const ts = zonedToUnix(`${yyyy}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`, iTime >= 0 && r[iTime] ? r[iTime] : "15:00", "Europe/London");
    const status = statusFromTimes(ts, false);
    out.push(build({
      id: `fduk-${r[iDiv]}-${yyyy}${dm[2]}${dm[1]}-${r[iHome]}-${r[iAway]}`,
      league: { id: `fduk-${r[iDiv]}`, name: div.name },
      home: { id: r[iHome], name: r[iHome] }, away: { id: r[iAway], name: r[iAway] },
      timestamp: ts, status: status === "finished" ? "finished" : status, statusText: "", elapsed: null,
      score: { home: null, away: null }, channels: [],
    }, div.weight));
  }
  return out;
}
async function fromFootballDataUk(): Promise<TopMatch[]> {
  const res = await fetch("https://www.football-data.co.uk/fixtures.csv", { headers: UA, next: { revalidate: 300 }, signal: AbortSignal.timeout(12000) }).catch((e: any) => { throw new Error(e?.cause?.code || e?.message || "network error"); });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return mapFootballDataCsv(await res.text());
}

// ---- 10. TheSportsDB per-league feeds (community-run open database; better coverage than eventsday) ----
const SPORTSDB_LEAGUES = [4328, 4335, 4332, 4331, 4334, 4480, 4481, 4668];
async function fromSportsDbLeagues(): Promise<TopMatch[]> {
  const { mapSportsDbEvent } = await import("@/lib/top-matches");
  const urls = SPORTSDB_LEAGUES.flatMap(id => [`eventsnextleague.php?id=${id}`, `eventspastleague.php?id=${id}`]);
  const res = await Promise.allSettled(urls.map(u => getJson(`https://www.thesportsdb.com/api/v1/json/3/${u}`, UA)));
  const ok = res.filter(r => r.status === "fulfilled") as PromiseFulfilledResult<any>[];
  if (!ok.length) throw new Error((res[0] as PromiseRejectedResult).reason?.message ?? "failed");
  return ok.flatMap(r => (r.value?.events ?? []) as any[]).map(mapSportsDbEvent).filter(Boolean) as TopMatch[];
}

export const EXTRA_SOURCES: MatchSource[] = [
  { name: "livescore", kind: "public", run: fromLivescore },
  { name: "fotmob", kind: "public", run: fromFotmob },
  { name: "sofascore-www", kind: "public", run: fromSofascoreWww },
  { name: "espn-web", kind: "public", run: fromEspnWeb },
  { name: "fpl", kind: "public", run: () => fromFpl() },
  { name: "openligadb", kind: "open", run: fromOpenLiga },
  { name: "openfootball", kind: "open", run: fromOpenFootball },
  { name: "fixturedownload", kind: "open", run: fromFixtureDownload },
  { name: "footballdata-uk", kind: "open", run: () => fromFootballDataUk() },
  { name: "thesportsdb-leagues", kind: "open", run: () => fromSportsDbLeagues() },
];
