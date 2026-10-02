import type { TopMatch } from "@/lib/match-core";

/**
 * Links the TV channels of a match to the user's favourite IPTV channels.
 * Broadcast names ("beIN SPORTS HD 1") and IPTV names ("AR: bein sport 1 FHD", "بي ان سبورت 1") are reduced to the
 * same key; a link the user picks by hand is stored on the favourite channel (matchAliases) and always wins.
 */

export interface LinkableChannel { name: string; stream_id: string; matchAliases?: string[] }

/**
 * Who shows each league in the Arab region (2026/27, see the broadcast report), and the main foreign channel for
 * leagues nobody shows in the region.
 *  - rights:  the exact rights holder (one channel / platform): listed first, always.
 *  - network: an Arab network that spreads the matches over numbered channels (beIN, AD Sports...): only shown when
 *             no source names the exact Arab channel of the match.
 *  - foreign: only shown when the match has no Arab channel at all.
 * alwaysList: every match of the league is listed on the matches page, not only the "important" ones.
 */
export interface LeagueChannelRule {
  label: string;
  channels: string[];
  kind: "rights" | "network" | "foreign";
  alwaysList?: boolean;
  test: (league: TopMatch["league"]) => boolean;
}

const isCountry = (l: TopMatch["league"], re: RegExp) => !l.country || re.test(l.country);
const named = (l: TopMatch["league"], re: RegExp) => re.test(String(l.name ?? "").trim());
const slug = (l: TopMatch["league"], ...ids: string[]) => {
  const id = String(l.id ?? "");
  return ids.includes(id) || ids.some(x => x.endsWith(".") && id.startsWith(x));
};

export const LEAGUE_CHANNEL_RULES: LeagueChannelRule[] = [
  // ---------- Arab rights holders (one channel / platform) ----------
  {
    label: "الدوري السعودي وكأس خادم الحرمين والسوبر والدرجة الأولى", channels: ["Thmanyah 1", "Thmanyah 2", "Thmanyah 3"], kind: "rights", alwaysList: true,
    test: l => slug(l, "ksa.1", "ksa.2", "ksa.kings_cup") || /saudi (pro|professional) league|roshn|yelo|دوري روشن|الدوري السعودي/i.test(l.name)
      || (/saudi/i.test(l.country ?? "") && named(l, /^(pro|professional) league$|king'?s cup|super cup|first division/i)),
  },
  {
    label: "السوبر الإسباني والسوبر الإيطالي", channels: ["Thmanyah 1", "Thmanyah 2", "Thmanyah 3"], kind: "rights", alwaysList: true,
    test: l => slug(l, "esp.super_cup", "ita.super_cup") || named(l, /supercopa de espa|spanish super ?cup|supercoppa|italian super ?cup|السوبر الإسباني|السوبر الايطالي|السوبر الإيطالي/i)
      || (named(l, /^super ?cup$|^supercopa$|^supercoppa$/i) && /spain|españa|ital/i.test(l.country ?? "")),
  },
  {
    label: "الدوري الألماني", channels: ["MBC Action", "Shahid"], kind: "rights", alwaysList: true,
    test: l => slug(l, "ger.1") || (named(l, /^(german |1\. ?)?bundesliga$/i) && isCountry(l, /german|deutschland/i)),
  },
  {
    label: "الدوري الإيطالي", channels: ["STARZPLAY Sport 1"], kind: "rights", alwaysList: true,
    test: l => slug(l, "ita.1") || (named(l, /^(italian )?serie a( tim| enilive)?$/i) && isCountry(l, /ital/i)),
  },
  {
    label: "الدوري الإماراتي وكؤوسه", channels: ["Abu Dhabi Sports 1", "Dubai Sports 1", "Sharjah Sports"], kind: "rights", alwaysList: true,
    test: l => slug(l, "uae.1") || /\buae\b|adnoc|arabian gulf league|الدوري الإماراتي/i.test(l.name) || /united arab emirates|^uae$/i.test(l.country ?? ""),
  },
  {
    label: "الدوري العماني وكأس السلطان", channels: ["Oman Sport"], kind: "rights", alwaysList: true,
    test: l => /\boman|omantel|sultan qaboos|عمان|عُمان/i.test(l.name) || /^oman$/i.test(l.country ?? ""),
  },
  {
    // Sharjah Sports' 2026/27 schedule: Scottish league, League Cup and Super Cup (+ a weekly Scottish league magazine)
    label: "الدوري الاسكتلندي وكأس الرابطة والسوبر", channels: ["Sharjah Sports"], kind: "rights", alwaysList: true,
    test: l => slug(l, "sco.1", "sco.cis") || named(l, /scottish (premiership|league cup)|^spfl/i)
      || (/scotland/i.test(l.country ?? "") && named(l, /^premiership$|league cup|super cup/i)),
  },
  // ---------- Arab networks (exact channel number comes from the match sources) ----------
  { label: "الدوري الهولندي", channels: ["Dubai Sports"], kind: "network",
    test: l => slug(l, "ned.1") || named(l, /eredivisie/i) },
  { label: "الدوري القطري", channels: ["Alkass"], kind: "network",
    test: l => /stars league|qsl|الدوري القطري/i.test(l.name) || (/^qatar$/i.test(l.country ?? "") && named(l, /league|cup/i)) },
  { label: "الدوري المصري", channels: ["ON Time Sports"], kind: "network",
    test: l => slug(l, "egy.1") || /egyptian premier|الدوري المصري/i.test(l.name) || (/^egypt$/i.test(l.country ?? "") && named(l, /premier league/i)) },
  { label: "كأس ألمانيا وكأس إيطاليا", channels: ["Abu Dhabi Sports"], kind: "network",
    test: l => slug(l, "ger.dfb_pokal", "ita.coppa_italia") || named(l, /dfb.?pokal|german cup|coppa italia/i) },
  {
    label: "beIN: الإنجليزي والإسباني والفرنسي والتركي وأوروبا وآسيا وأفريقيا والكؤوس الإنجليزية", channels: ["beIN SPORTS"], kind: "network",
    test: l => slug(l, "eng.1", "esp.1", "fra.1", "fra.2", "tur.1", "eng.2", "eng.3", "eng.4", "eng.fa", "eng.league_cup", "uefa.", "afc.", "caf.")
      || (named(l, /^(english )?premier league$/i) && isCountry(l, /england/i))
      || (named(l, /^(spanish )?la ?liga( ea sports)?$|^primera divisi[oó]n$/i) && isCountry(l, /spain|españa/i))
      || (named(l, /^(french )?ligue [12]/i) && isCountry(l, /france/i))
      || (named(l, /s[uü]per ?lig/i) && isCountry(l, /turk|türk/i))
      || (named(l, /^(efl )?championship$|league one|league two|carabao|efl cup|^fa cup$/i) && isCountry(l, /england/i))
      || (named(l, /uefa|^champions league$|^europa league$|conference league/i) && !named(l, /afc|caf|concacaf|asian|african/i))
      || named(l, /^afc |\bafc champions|acl elite|asian champions|^caf |\bcaf champions|\bcaf confederation cup$/i),
  },
  // ---------- not shown in the Arab region: the main foreign channel ----------
  { label: "الدوري البرتغالي", channels: ["Sport TV1"], kind: "foreign",
    test: l => slug(l, "por.1") || (named(l, /primeira liga|liga portugal|betclic/i) && isCountry(l, /portugal/i)) },
  { label: "الدوري الأرجنتيني", channels: ["TyC Sports Internacional", "ESPN Premium", "TNT Sports"], kind: "foreign",
    test: l => slug(l, "arg.1") || (named(l, /liga profesional|primera divisi[oó]n|torneo (apertura|clausura)|copa de la liga/i) && /argentin/i.test(l.country ?? "")) },
  { label: "الدوري الأمريكي", channels: ["Apple TV"], kind: "foreign",
    test: l => slug(l, "usa.1") || named(l, /^mls$|major league soccer/i) },
  { label: "الدوري البلجيكي", channels: ["DAZN"], kind: "foreign",
    test: l => slug(l, "bel.1") || named(l, /jupiler|belgian pro league|first division a/i) || (named(l, /^pro league$/i) && /belgi/i.test(l.country ?? "")) },
  { label: "الدوري البرازيلي", channels: ["Premiere", "Globo"], kind: "foreign",
    test: l => slug(l, "bra.1") || named(l, /brasileir[aã]o/i) || (named(l, /^s[eé]rie a$/i) && /brazil|brasil/i.test(l.country ?? "")) },
  { label: "الدوري المكسيكي", channels: ["TUDN"], kind: "foreign",
    test: l => slug(l, "mex.1") || named(l, /liga mx/i) },
];

const usableLeague = (l: TopMatch["league"]) => !/women|female|u\d\d|youth|reserve|سيدات/i.test(l.name);
export function leagueRules(league: TopMatch["league"]): LeagueChannelRule[] {
  return usableLeague(league) ? LEAGUE_CHANNEL_RULES.filter(r => r.test(league)) : [];
}

/** The exact Arab rights holders of a league (shown first on the card). */
export function leagueChannels(league: TopMatch["league"]): string[] {
  return leagueRules(league).filter(r => r.kind === "rights").flatMap(r => r.channels);
}

/** Leagues whose every match is listed (regional rights holders), not only the important ones. */
export function leagueAlwaysListed(league: TopMatch["league"]): boolean {
  return leagueRules(league).some(r => r.alwaysList);
}

/**
 * Channels for one match: the league's rights holder + every source; Arab channels first; an Arab network
 * ("beIN SPORTS") when no source names the exact channel; foreign channels only when there's no Arab one.
 */
export function matchChannels(league: TopMatch["league"], sources: string[]): string[] {
  const rules = leagueRules(league);
  const of = (k: LeagueChannelRule["kind"]) => rules.filter(r => r.kind === k).flatMap(r => r.channels);
  // a source naming the exact numbered channel ("Thmanyah 2") replaces the rights holder's other numbers
  const src = sources.filter(Boolean);
  const brand = (c: string) => channelTokens(c).filter(t => !isNum(t)).sort().join(" ");
  const numbered = new Set(src.filter(c => channelTokens(c).some(isNum)).map(brand));
  const rights = of("rights").filter(r => !numbered.has(brand(r)));
  const all = uniqueChannels([...rights, ...src]);
  const arab = all.filter(isArabChannel);
  if (arab.length) return arab;
  const network = of("network");
  if (network.length) return uniqueChannels(network);
  return uniqueChannels([...of("foreign"), ...all]);
}

// ---- name normalisation ----
const BRANDS: [RegExp, string][] = [
  [/b[ea]in\s*-?\s*sports?|بي\s*[اإأآ]?ن\s*(سبورت[س]?|الرياضي[ةه])|بين\s*سبورت[س]?|\bbein\b|بي\s*[اإأ]ن/gi, " bein "],
  [/starz\s*-?\s*play(\s*sports?)?|ستارز\s*بلاي(\s*سبورت[س]?)?/gi, " starzplay "],
  [/thmanyah|thamanyah?|thmanya|thamaniya|ثمانية|ثمانيه/gi, " thmanyah "],
  [/mbc\s*-?\s*action|[اإأ]م\s*بي\s*سي\s*[اأإ]كشن/gi, " mbc action "],
  [/[اإأ]م\s*بي\s*سي/gi, " mbc "],
  [/oman\s*(tv\s*)?sports?(\s*tv)?|عُ?م[اآ]ن\s*(ال)?رياضي[ةه]/gi, " oman sport "],
  [/abu\s*dhabi\s*sports?|ad\s*sports?|[اأ]بو\s*ظبي\s*(ال)?رياضي[ةه]/gi, " adsport "],
  [/dubai\s*sports?|دبي\s*(ال)?رياضي[ةه]/gi, " dubaisport "],
  [/al\s*-?\s*kass|alkass|الكاس/gi, " alkass "],
  [/\bssc(\s*sports?)?\b|[اإأ]س\s*[اإأ]س\s*سي/gi, " ssc "],
  [/shahid|شاهد/gi, " shahid "],
  [/sharjah\s*sports?|الشارقة\s*(ال)?رياضي[ةه]/gi, " sharjahsport "],
  [/ksa\s*sports?|السعودية\s*(ال)?رياضي[ةه]/gi, " ksasport "],
  [/sports?|(ال)?رياضي[ةه]/gi, " sport "],
];
/** quality/region tags that don't change which channel it is */
const NOISE = new Set(["hd", "fhd", "uhd", "sd", "hq", "4k", "8k", "hevc", "h265", "h264", "1080", "1080p", "720", "720p", "480p", "tv", "channel", "ch", "live", "ar", "arab", "arabic", "mena", "me", "backup", "raw", "vip", "plus", "fps", "50fps", "60fps", "قناة", "مباشر"]);
/** words that make it a different channel ("beIN SPORTS 1" is not "beIN SPORTS MAX 1") */
const VARIANTS = new Set(["premium", "max", "xtra", "extra", "english", "en", "french", "fr", "news", "kids", "movies", "4k"]);

export function channelTokens(name: string): string[] {
  let s = ` ${name.toLowerCase()} `
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x6f0))
    // region/quality prefixes of IPTV lists: "AR:", "|AR|", "[AR]", "OM -"
    .replace(/^\s*[\[(|]?\s*(ar|arb|arab|me|mena|om|oman|ksa|sa|uae|ae|qa|eg|kw|bh|uk|en|fr|tr|vip|4k|hd|fhd|sd)\s*[\])|:\-]\s*/i, " ");
  for (const [re, to] of BRANDS) s = s.replace(re, to);
  return s
    .replace(/([a-z])(\d)/g, "$1 $2").replace(/(\d)([a-z])/g, "$1 $2")
    .split(/[^a-z0-9؀-ۿ]+/)
    .filter(t => t && !NOISE.has(t))
    // "bein sport 1" and "bein 1" are the same channel: the generic word only counts when it is the whole name
    .filter((t, _i, all) => t !== "sport" || !all.some(x => ["bein", "starzplay", "ssc", "adsport", "dubaisport", "ksasport", "sharjahsport"].includes(x)));
}

/** Stable key for a channel name (token order doesn't matter). */
export function channelKey(name: string): string {
  return Array.from(new Set(channelTokens(name))).sort().join(" ");
}

const isNum = (t: string) => /^\d+$/.test(t);

/** 0 = different channel, higher = closer. */
export function channelScore(broadcast: string, candidate: string): number {
  return tokenScore(channelTokens(broadcast), channelTokens(candidate));
}

/** channelScore on names already split by channelTokens (for big IPTV catalogues). */
export function tokenScore(broadcastTokens: string[], candidateTokens: string[]): number {
  const a = new Set(broadcastTokens), b = new Set(candidateTokens);
  if (!a.size || !b.size) return 0;
  const words = (s: Set<string>) => [...s].filter(t => !isNum(t));
  const nums = (s: Set<string>) => [...s].filter(isNum).sort().join(",");
  // every word of the broadcast name must be there ("oman sport" must not match plain "Oman TV")
  if (words(a).some(t => !b.has(t))) return 0;
  const extra = words(b).filter(t => !a.has(t));
  if (extra.some(t => VARIANTS.has(t))) return 0;
  const na = nums(a), nb = nums(b);
  let score = 100 - extra.length * 10;
  if (na) { if (na !== nb) return 0; }
  else if (nb) score -= 15 + Math.min(Number(nb.split(",")[0]) || 0, 20); // "Thmanyah" -> prefer "Thmanyah 1"
  return score >= 60 ? score : 0;
}

export function findFavoriteChannel<T extends LinkableChannel>(broadcast: string, favorites: T[]): T | null {
  const key = channelKey(broadcast);
  if (!key) return null;
  const linked = favorites.find(f => f.matchAliases?.includes(key));
  if (linked) return linked;
  let best: T | null = null, bestScore = 0;
  for (const f of favorites) {
    const sc = channelScore(broadcast, f.name);
    if (sc > bestScore) { best = f; bestScore = sc; }
  }
  return best;
}

/** Channel names without duplicates ("beIN SPORTS HD 1" == "beIN Sports 1"), first spelling wins. */
export function uniqueChannels(names: string[]): string[] {
  const seen = new Set<string>();
  return names.filter(n => {
    const k = channelKey(n) || n.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ---- Arab vs foreign channels ----
/** Arab-region broadcasters (after channelTokens normalisation, or Arabic script). */
const ARAB_BRANDS = new Set(["bein", "thmanyah", "ssc", "adsport", "dubaisport", "sharjahsport", "ksasport", "alkass", "mbc", "starzplay", "shahid"]);
const ARAB_NAMES = /\b(oman|kuwait|bahrain|qatar|jordan|iraq|yemen|libya|syria|saudi|emirates|abu dhabi|dubai|sharjah|ajman|nile|on time|ontime|al ?jazeera|arryadia|arriyadia|alwan|aloula|al ?oula|tunisia|algeri|maroc|morocc|egypt|cbc|dmc|nahar|rotana|alhadath|alarabiya|ad sports|ad sport|ktv)\b/i;

export function isArabChannel(name: string): boolean {
  if (/[؀-ۿ]/.test(name)) return true; // written in Arabic
  // beIN also runs foreign feeds (USA, France, Turkey, Asia...): those are not the Arab channels
  if (/\b(usa|us|france|french|fr|turkey|türkiye|turkiye|asia|australia|espa[nñ]ol|canada|uk|english|xtra|connect)\b/i.test(name) && /b[ea]in/i.test(name)) return false;
  if (channelTokens(name).some(t => ARAB_BRANDS.has(t))) return true;
  return ARAB_NAMES.test(name);
}

/** Arab channels first; when a match has none, the foreign ones (from any source) are shown instead. */
export function prioritizeChannels(names: string[]): string[] {
  const list = uniqueChannels(names.filter(Boolean));
  const arab = list.filter(isArabChannel);
  return arab.length ? arab : list;
}
