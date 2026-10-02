import { footballDay, omanTime } from "@/lib/oman-time";

/** Shared types and helpers for the match sources. */

export interface TopMatch {
  id: string;
  /** country: the league's country when the source tells it (tells e.g. the German Bundesliga from the Austrian one) */
  league: { id: string; name: string; logo?: string; country?: string };
  home: { id: string; name: string; logo?: string };
  away: { id: string; name: string; logo?: string };
  /** Kick-off, unix seconds */
  timestamp: number;
  /** Kick-off HH:mm in Oman time (Asia/Muscat, UTC+4) */
  omanTime: string;
  status: "upcoming" | "live" | "finished";
  /** e.g. "Sun, October 5th at 7:00 PM GMT", "FT", "67'" */
  statusText: string;
  elapsed: number | null;
  score: { home: number | null; away: number | null };
  /** TV channels when ESPN lists them */
  channels: string[];
  importance: number;
  /** set when the match involves one of the user's favourite teams */
  favorite?: boolean;
}

export interface TopMatchesResult {
  date: string;        // Oman calendar date
  timezone: string;
  source: string;
  total: number;       // all fixtures found for that Oman day
  matches: TopMatch[]; // most important first
  attempts: SourceAttempt[];
  fetchedAt: string;
}

export interface SourceAttempt {
  source: string;
  /** "public" = unofficial public feed, "open" = open data / open source, undefined = first-wave sources */
  kind?: string;
  ok: boolean;
  ms: number;
  /** matches found for the Oman day (before importance filtering) */
  total: number;
  /** matches that count as important */
  important: number;
  error?: string;
}

/** Big clubs/national teams: each side playing adds weight. Names are normalised first (no accents, no hyphens). */
export const BIG_TEAMS = /^(real madrid|barcelona|atletico madrid|manchester city|manchester united|man city|man utd|man united|liverpool|arsenal|chelsea|tottenham( hotspur)?|spurs|bayern( munich| munchen)?|borussia dortmund|paris saint germain|psg|juventus|inter( milan)?|ac milan|milan|napoli|al hilal|al nassr|al ittihad|al ahli|al ahly|zamalek|al ain|al sadd|esperance( de tunis)?|wydad( ac)?|raja( ca)?|al ahli tripoli|al ittihad tripoli|saudi arabia|egypt|morocco|oman|argentina|brazil|france|england|spain|germany|portugal|italy|netherlands)( fc| cf)?$/;

export function normalizeTeamName(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/-/g, " ").replace(/\s+/g, " ").trim().toLowerCase().replace(/^(fc|afc|sc) /, "");
}

export function importanceOf(leagueWeight: number, homeName: string, awayName: string): number {
  const home = BIG_TEAMS.test(normalizeTeamName(homeName)) ? 15 : 0;
  const away = BIG_TEAMS.test(normalizeTeamName(awayName)) ? 15 : 0;
  // Two big teams meeting is worth more than the sum of its parts (derbies, classics).
  return leagueWeight + home + away + (home && away ? 10 : 0);
}

export const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseInt(v, 10) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

/** YYYYMMDD for the Oman date shifted by `days`. */
export function shiftedYmd(omanYmd: string, days: number): string {
  const [y, m, d] = omanYmd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10).replace(/-/g, "");
}

export const UA = { "User-Agent": "Mozilla/5.0", Accept: "application/json" };

/** Headers a real browser would send; some public JSON endpoints (Sofascore, 365Scores) 403 anything else. */
export const BROWSER_HEADERS = (origin: string) => ({
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
  Origin: origin,
  Referer: `${origin}/`,
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "cross-site",
});

/** `revalidate` (seconds) is short by default so live scores stay fresh; static schedule files pass a longer one. */
export async function getJson(url: string, headers: Record<string, string> = UA, revalidate = 20): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, { headers, next: { revalidate }, signal: AbortSignal.timeout(12000) });
  } catch (e: any) {
    // Surface the real network cause (ENOTFOUND, ECONNRESET, timeout...) instead of a generic "fetch failed".
    throw new Error(e?.cause?.code || e?.cause?.message || e?.name || e?.message || "network error");
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Ordered name patterns (first match wins) for sources that don't give us ESPN-style competition slugs. */
export const NAME_WEIGHTS: [RegExp, number][] = [
  [/world cup.*qualif|qualif.*world cup/i, 60],
  [/qualif/i, 40], // any other qualifiers (AFCON, Euro, Asian Cup...) rank below the tournament itself
  [/club world cup/i, 85],
  [/fifa world cup|^world cup$/i, 100],
  [/afc champions/i, 60],
  [/caf champions/i, 55],
  [/uefa champions league|^champions league$/i, 95],
  [/^(uefa )?euro(pean championship)?( 20\d\d)?$/i, 90],
  [/copa am[eé]rica/i, 90],
  [/arab cup/i, 70],
  [/gulf cup|khaleeji/i, 60],
  [/asian cup/i, 85],
  [/africa cup of nations|afcon/i, 85],
  [/europa conference|conference league/i, 55],
  [/europa league/i, 65],
  [/nations league/i, 55],
  [/english premier league|^premier league$/i, 80],
  [/la ?liga|spanish la liga/i, 80],
  [/serie a|italian serie a/i, 75],
  [/bundesliga|german bundesliga/i, 75],
  [/ligue 1|french ligue 1/i, 70],
  [/saudi (pro )?league|roshn/i, 70],
  [/egypt.*(premier|league)|premier.*egypt/i, 50],
  [/liby/i, 45],
  [/oman/i, 45],
  [/qatar|stars league/i, 40],
  [/\buae\b|arabian gulf|united arab emirates/i, 40],
  [/botola|morocc/i, 40],
  [/fa cup/i, 50],
  [/copa del rey/i, 50],
  [/coppa italia/i, 45],
  [/dfb.?pokal/i, 45],
  [/coupe de france/i, 40],
  [/friendl/i, 40],
];

export function leagueWeightByName(name: string, country?: string): number {
  // "Premier League" also exists in Egypt, Russia, ...: only England counts.
  if (/^premier league$/i.test(name.trim()) && country && !/england/i.test(country)) return 0;
  for (const [re, w] of NAME_WEIGHTS) if (re.test(name)) return w;
  return 0;
}

export function build(base: Omit<TopMatch, "omanTime" | "importance">, weight: number): TopMatch {
  return { ...base, omanTime: omanTime(base.timestamp), importance: importanceOf(weight, base.home.name, base.away.name) };
}

/** Keep only matches whose kick-off falls on the given Oman calendar day, most important first. */
export function pickTop(matches: TopMatch[], omanYmd: string, limit: number): { total: number; top: TopMatch[]; day: TopMatch[] } {
  const seen = new Set<string>();
  const today = matches.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return footballDay(new Date(m.timestamp * 1000)) === omanYmd; // kick-offs until 05:00 count for the previous day
  });
  // live matches first (they stay at the top while playing), then importance, then kick-off time
  const live = (m: TopMatch) => (m.status === "live" ? 1 : 0);
  const top = [...today].sort((a, b) => live(b) - live(a) || b.importance - a.importance || a.timestamp - b.timestamp).slice(0, limit);
  return { total: today.length, top, day: today };
}

const TEAM_NOISE = /\b(fc|sc|cf|afc|club|saudi|football|calcio|sk|sv|ac|as|cd|fk|de|al)\b/g;
/** Loose key for comparing team names across sources ("Al-Hilal Saudi FC" ~ "Al Hilal"). */
const TEAM_ALIASES: [RegExp, string][] = [
  [/\bman(chester)? (utd|united)\b/, "manchester united"],
  [/\bman(chester)? city\b/, "manchester city"],
  [/\bspurs\b|\btottenham hotspur\b/, "tottenham"],
  [/\bpsg\b|\bparis sg\b/, "paris saint germain"],
  [/\bbayern munchen\b|\bbayern munich\b/, "bayern"],
  [/\batletico de madrid\b/, "atletico madrid"],
  [/\binternazionale( milano)?\b|\binter milano\b/, "inter milan"],
  [/\bqadisiy?ah?\b|\bqadsia\b|\bqadsiya\b/, "qadsiah"],
  [/\bnasr\b/, "nasr"],
];
export function teamKey(name: string): string {
  let n = normalizeTeamName(name);
  for (const [re, to] of TEAM_ALIASES) n = n.replace(re, to);
  return n.replace(/[^a-z0-9 ]/g, " ").replace(TEAM_NOISE, " ").replace(/\s+/g, " ").trim();
}
const DIFFERENT_SIDE = new Set(["tula", "montevideo", "castilla", "b", "ii", "u17", "u19", "u20", "u21", "u23", "women", "w", "reserves", "youth", "academy"]);
export function sameTeam(a: string, b: string): boolean {
  const x = teamKey(a), y = teamKey(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [s, l] = x.length <= y.length ? [x, y] : [y, x];
  if (s.length < 4 || !(` ${l} `).includes(` ${s} `)) return false;
  // "Arsenal" ~ "Arsenal FC" but not "Arsenal Tula" / "Real Madrid Castilla" / youth & women's sides
  const extra = l.split(" ").filter(w => !s.split(" ").includes(w));
  return !extra.some(w => DIFFERENT_SIDE.has(w));
}


/** YYYY-MM-DD for the Oman date shifted by `days`. */
export function shiftedDash(omanYmd: string, days: number): string {
  const y = shiftedYmd(omanYmd, days);
  return `${y.slice(0, 4)}-${y.slice(4, 6)}-${y.slice(6)}`;
}

/** Start year of the football season containing the given date (seasons start in July). */
export function seasonStartYear(omanYmd: string): number {
  const [y, m] = omanYmd.split("-").map(Number);
  return m >= 7 ? y : y - 1;
}

/** Convert a wall-clock time in an IANA timezone (e.g. "2026-10-03" "15:00" Europe/London) to unix seconds. */
export function zonedToUnix(ymd: string, hm: string, tz: string): number {
  const [y, mo, d] = ymd.split("-").map(Number);
  const [h, mi] = hm.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offsetAt = (t: number) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(new Date(t)).map(x => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - t;
  };
  let utc = guess - offsetAt(guess);
  utc = guess - offsetAt(utc); // second pass settles DST edges
  return Math.floor(utc / 1000);
}

/** Stable id for "hide this match" that survives switching between providers (ids differ per source). */
export function matchHideKey(m: { timestamp: number; home: { name: string }; away: { name: string } }): string {
  return `match:${footballDay(new Date(m.timestamp * 1000))}:${teamKey(m.home.name)}:${teamKey(m.away.name)}`;
}

/** URL of /api/matches/details for a match (team names let other sources be matched on 365Scores). */
export function matchDetailsUrl(m: TopMatch, fresh = false): string {
  const q = new URLSearchParams({ id: m.id, league: m.league.id, homeId: m.home.id, home: m.home.name, away: m.away.name });
  if (fresh) q.set("fresh", "1");
  return `/api/matches/details?${q}`;
}

/**
 * Goal alerts (the goal animation) per match, from the bell on the match card. Stored in belledMatchIds as
 * "goal:<key>" (turned on) or "mute:<key>" (a favourite team's match turned off); favourites are on by default.
 */
export function goalAlertOn(m: TopMatch, belled: string[] = []): boolean {
  const k = matchHideKey(m);
  if (belled.includes(`goal:${k}`)) return true;
  if (belled.includes(`mute:${k}`)) return false;
  return !!m.favorite;
}
