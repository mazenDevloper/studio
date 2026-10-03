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
  /** in a followed competition: listed and goal alerts on by default (not a favourite) */
  followed?: boolean;
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

/** League names used in several countries: they only count in their own country ("Serie A" of Brazil / Ecuador,
 * the Austrian "Bundesliga", the Algerian "Ligue 1", "Premier League" of Egypt / Russia...). */
const COUNTRY_GATED: [RegExp, RegExp][] = [
  [/^(english )?premier league$|^fa cup$|^championship$/i, /england/i],
  [/serie a/i, /ital/i],
  [/bundesliga/i, /german|deutschland/i],
  [/ligue 1/i, /france/i],
  [/la ?liga|primera divisi[oó]n|copa del rey/i, /spain|espa/i],
];

/** Second / third tiers ("LaLiga 2", "Serie B / C", "2. Bundesliga", "Ligue 2"...): never "important" by name. */
const LOWER_TIER = /laliga ?2|hypermotion|segunda|serie [bc]\b|2\. ?bundesliga|3\. ?liga|ligue 2|\bliga 2\b|primera federaci|segunda federaci|tercera|league (one|two)\b|second division|third division|\bnational league\b|super league 2|premier league 2|\b(ii|b|c)$/i;

export function leagueWeightByName(name: string, country?: string): number {
  if (LOWER_TIER.test(name.trim())) return 0;
  if (country) for (const [re, home] of COUNTRY_GATED) if (re.test(name.trim()) && !home.test(country)) return 0;
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
const DIFFERENT_SIDE = new Set(["tula", "montevideo", "castilla", "b", "ii", "iii", "u15", "u16", "u17", "u18", "u19", "u20", "u21", "u23",
  "women", "w", "femeni", "femenino", "feminin", "feminine", "fem", "ladies", "reserves", "reserve", "res", "youth", "academy", "atletic",
  "jong", "juvenil", "primavera", "sub", "2", "c", "futuro", "next", "gen", "nextgen", "promesas", "mestalla"]);
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
  return !!(m.favorite || m.followed);
}

/**
 * Matches page / feed order: live favourites, live, favourites, then the rest - each group by importance, then
 * kick-off (finished matches after the upcoming ones of the same group).
 */
export function sortMatches<T extends Pick<TopMatch, "status" | "importance" | "timestamp" | "favorite">>(list: T[]): T[] {
  const rank = (m: T) => (m.status === "live" ? (m.favorite ? 0 : 1) : m.favorite ? 2 : 3);
  return [...list].sort((a, b) => rank(a) - rank(b) || (a.status === "finished" ? 1 : 0) - (b.status === "finished" ? 1 : 0)
    || (b.importance ?? 0) - (a.importance ?? 0) || a.timestamp - b.timestamp);
}

// ---- favourite teams: the club itself, not a namesake from another country or its youth / B side ----

/** A favourite team as sent to the server: "Liverpool~England" (the country is optional). */
export interface FavSpec { name: string; country?: string }
export const favSpecString = (t: { name: string; country?: string }) => (t.country ? `${t.name}~${t.country}` : t.name);
export function parseFavSpec(s: string): FavSpec {
  const [name, country] = s.split("~");
  return { name: name.trim(), country: country?.trim() || undefined };
}

/** Countries of well-known clubs, for favourites saved without one (keeps Liverpool of Uruguay out). */
const FAMOUS_CLUBS: Record<string, string> = Object.fromEntries(Object.entries({
  england: "liverpool|arsenal|chelsea|tottenham|manchester united|manchester city|newcastle united|aston villa|west ham united|everton",
  spain: "barcelona|real madrid|atletico madrid|sevilla|valencia|villarreal|real betis|real sociedad|athletic bilbao",
  italy: "juventus|inter|milan|ac milan|napoli|roma|lazio|atalanta|fiorentina",
  germany: "bayern|dortmund|leverkusen|bayern munich|bayern munchen|borussia dortmund|bayer leverkusen|rb leipzig|eintracht frankfurt",
  france: "paris saint germain|psg|marseille|lyon|monaco|lille",
  portugal: "benfica|porto|sporting cp|sporting lisbon|braga",
  netherlands: "ajax|psv|psv eindhoven|feyenoord",
  "saudi arabia": "hilal|al hilal|nassr|al nassr|ittihad|al ittihad|ahli|al ahli|shabab|al shabab|ettifaq|al ettifaq|qadsiah|al qadsiah",
  egypt: "zamalek",
  oman: "dhofar|al nahda|sur|al seeb|seeb",
  qatar: "al sadd|sadd|al duhail|duhail",
  uae: "al ain|al wahda|shabab al ahli|al jazira|sharjah",
  argentina: "boca juniors|river plate",
  brazil: "flamengo|palmeiras|corinthians|santos",
}).flatMap(([country, names]) => names.split("|").map(n => [n.trim(), country])));

const SLUG_COUNTRIES: Record<string, string> = {
  eng: "england", esp: "spain", ita: "italy", ger: "germany", fra: "france", por: "portugal", ned: "netherlands", bel: "belgium",
  sco: "scotland", tur: "turkey", ksa: "saudi arabia", egy: "egypt", uae: "united arab emirates", qat: "qatar", uru: "uruguay",
  ecu: "ecuador", arg: "argentina", bra: "brazil", mex: "mexico", usa: "usa", col: "colombia", chi: "chile", per: "peru",
  par: "paraguay", bol: "bolivia", ven: "venezuela",
};
/** Competitions between countries / continents: any club can play there. */
const INTERNATIONAL = /world|europe|international|intl|asia|africa|america|friendl|uefa|fifa|afc|caf|concacaf|conmebol|gulf|arab|champions|cup winners/i;

const sameCountry = (a: string, b: string) => {
  const x = a.toLowerCase().replace(/^the /, ""), y = b.toLowerCase().replace(/^the /, "");
  const uae = (s: string) => (/united arab emirates|^uae$/.test(s) ? "uae" : s);
  return x.includes(y) || y.includes(x) || uae(x) === uae(y);
};

/** Is this match one of the favourite team's (same club, same country when that is known)? */
export function favoriteOf(fav: FavSpec, m: Pick<TopMatch, "home" | "away" | "league">): boolean {
  const side = [m.home.name, m.away.name].find(n => sameTeam(fav.name, n));
  if (!side) return false;
  if (isExcludedLeague(m.league) === "lower-tier") return false;
  const want = fav.country || FAMOUS_CLUBS[teamKey(fav.name)] || FAMOUS_CLUBS[normalizeTeamName(fav.name)];
  const got = m.league.country || SLUG_COUNTRIES[String(m.league.id ?? "").split(".")[0]];
  // a longer name ("Boca Juniors de Cali") is only trusted when the league's country can confirm it
  if (teamKey(side) !== teamKey(fav.name) && !got) return false;
  if (!want || !got || INTERNATIONAL.test(got) || INTERNATIONAL.test(m.league.name)) return true;
  return sameCountry(want, got);
}

/** Youth / reserve / women's matches (U18, U21, Primavera, reserves, (W)...): never listed. */
const WOMEN_LEAGUE = /women|female|feminin|femenin|ladies|\bwsl\b|nwsl|frauen|\bliga f\b|damallsvenskan|\(w\)/i;
const WOMEN_TEAM = /\(w\)|\bw$|\bwomen\b|\bfem(enino|enina|inine|eni)?\b|\bladies\b|frauen|damen/i;
const YOUTH = /\b(u-? ?(1[3-9]|2[0-3])|under[- ]?(1[3-9]|2[0-3])|sub-?(1[3-9]|2[0-3])|youth|juvenil|primavera|reserves?|academy|jong)\b/i;
export function isYouthMatch(m: Pick<TopMatch, "home" | "away" | "league">): boolean {
  return YOUTH.test(m.league.name) || YOUTH.test(m.home.name) || YOUTH.test(m.away.name)
    || WOMEN_LEAGUE.test(m.league.name) || WOMEN_TEAM.test(m.home.name) || WOMEN_TEAM.test(m.away.name);
}

// ---- leagues that are never fetched into the lists ----

/** Every second / third tier (any country, the Saudi Yelo league included). */
const ANY_LOWER_TIER = /laliga ?2|hypermotion|segunda|serie [b-d]\b|2\. ?bundesliga|3\. ?liga|ligue [23]\b|\bliga [23]\b|primera federaci|segunda federaci|tercera|league (one|two)\b|second division|third division|\bnational league\b|super league 2|premier league 2|\bprimera [bc]\b|\bb nacional|federal a|yelo|first division league|championnat national|eerste divisie|challenger pro league|\bdivision 2\b|\b(ii|b|c)$/i;

const AMERICAS = /united states|\busa\b|canada|mexico|colombia|peru|chile|uruguay|ecuador|paraguay|bolivia|venezuela|costa rica|honduras|guatemala|el salvador|panama|jamaica|haiti|trinidad|brazil|brasil|argentin|north america|south america|concacaf|conmebol/i;
const AMERICAS_SLUGS = new Set(["usa", "can", "mex", "col", "per", "chi", "uru", "ecu", "par", "bol", "ven", "crc", "hon", "gua", "slv", "pan", "jam", "bra", "arg", "concacaf", "conmebol"]);
const AMERICAS_NAMES = /liga mx|\bmls\b|major league soccer|usl|nwsl|canadian premier|brasileir|libertadores|sudamericana|recopa|concacaf|copa argentina|copa do brasil|campeonato (paulista|carioca|mineiro|gaucho)|liga betplay|primera a\b|liga 1 (peru|te apuesto)|liga auf|liga pro\b|torneo (apertura|clausura)/i;

/** The Americas leagues that stay: MLS, Brazil's Série A and Argentina's top league (two clubs each, see
 * leagueTopClubs), and the continental cups when one of those clubs plays (americasCupClubs). */
const AMERICAS_KEPT = (l: TopMatch["league"]) => {
  const slug = String(l.id ?? "").toLowerCase();
  if (["usa.1", "bra.1", "arg.1"].includes(slug)) return true;
  const n = l.name.trim(), c = (l.country ?? "").toLowerCase();
  if (/^mls$|major league soccer/i.test(n)) return true;
  if (/brazil|brasil/.test(c) || /brasileir/i.test(n)) return /^(brasileir[aã]o( betano)?( s[eé]rie a)?|s[eé]rie a|brazilian s[eé]rie a|campeonato brasileiro s[eé]rie a)$/i.test(n);
  if (/argentin/.test(c) || /argentin/i.test(n)) return /liga profesional|^primera divisi[oó]n$|argentine (primera|liga)|^(torneo )?(apertura|clausura)$|copa de la liga/i.test(n);
  return false;
};

export const AMERICAS_CUP = /libertadores|sudamericana|recopa|concacaf champions/i;

/** Leagues left out of every list (unless a favourite team plays, for the Americas). */
export function isExcludedLeague(league: TopMatch["league"]): "lower-tier" | "americas" | null {
  if (ANY_LOWER_TIER.test(league.name.trim())) return "lower-tier";
  const slug = String(league.id ?? "").toLowerCase();
  const americas = AMERICAS.test(league.country ?? "") || AMERICAS_SLUGS.has(slug.split(".")[0]) || AMERICAS_NAMES.test(league.name);
  if (americas && !AMERICAS_KEPT(league) && !AMERICAS_CUP.test(league.name)) return "americas";
  return null;
}
