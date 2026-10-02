import type { TopMatch } from "@/lib/match-core";

/**
 * Links the TV channels of a match to the user's favourite IPTV channels.
 * Broadcast names ("beIN SPORTS HD 1") and IPTV names ("AR: bein sport 1 FHD", "بي ان سبورت 1") are reduced to the
 * same key; a link the user picks by hand is stored on the favourite channel (matchAliases) and always wins.
 */

export interface LinkableChannel { name: string; stream_id: string; matchAliases?: string[] }

/** Channels shown for a whole league even when the feed lists none (regional rights holders). */
export interface LeagueChannelRule { label: string; channel: string; test: (league: TopMatch["league"]) => boolean }

const isCountry = (l: TopMatch["league"], re: RegExp) => !l.country || re.test(l.country);

export const LEAGUE_CHANNEL_RULES: LeagueChannelRule[] = [
  {
    label: "الدوري الألماني", channel: "MBC Action",
    test: l => l.id === "ger.1" || (/^(german |1\. ?)?bundesliga$/i.test(l.name.trim()) && isCountry(l, /german|deutschland/i)),
  },
  {
    label: "الدوري السعودي", channel: "Thmanyah",
    test: l => l.id === "ksa.1" || /saudi (pro|professional) league|roshn|دوري روشن|الدوري السعودي/i.test(l.name)
      || (/^(pro|professional) league$/i.test(l.name.trim()) && /saudi/i.test(l.country ?? "")),
  },
  // UAE league and cups: Abu Dhabi Sports and Sharjah Sports
  ...["Abu Dhabi Sports 1", "Sharjah Sports"].map(channel => ({
    label: "الدوري الإماراتي", channel,
    test: (l: TopMatch["league"]) => l.id === "uae.1" || /\buae\b|adnoc|arabian gulf league|emirates|الدوري الإماراتي/i.test(l.name)
      || /united arab emirates|^uae$/i.test(l.country ?? ""),
  })),
  {
    label: "الدوري الإيطالي", channel: "STARZPLAY Sport 1",
    test: l => l.id === "ita.1" || (/^(italian )?serie a( tim| enilive)?$/i.test(l.name.trim()) && isCountry(l, /ital/i)),
  },
  {
    label: "الدوري العماني", channel: "Oman Sport",
    test: l => /\boman|omantel|عمان|عُمان/i.test(l.name) || /^oman$/i.test(l.country ?? ""),
  },
];

export function leagueChannels(league: TopMatch["league"]): string[] {
  return LEAGUE_CHANNEL_RULES.filter(r => !/women|female|u\d\d|youth|reserve|سيدات/i.test(league.name) && r.test(league)).map(r => r.channel);
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
  const a = new Set(channelTokens(broadcast)), b = new Set(channelTokens(candidate));
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

/** The favourite IPTV channel for a broadcast name: a hand-picked link first, then the closest name. */
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
const ARAB_NAMES = /\b(oman|kuwait|bahrain|qatar|jordan|iraq|yemen|libya|syria|saudi|emirates|abu dhabi|dubai|sharjah|ajman|nile|on time|ontime|al ?jazeera|arryadia|arriyadia|alwan|aloula|al ?oula|tunisia|algeri|maroc|morocc|egypt|cbc|dmc|nahar|rotana|alhadath|alarabiya|ad sports|ad sport)\b/i;

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
