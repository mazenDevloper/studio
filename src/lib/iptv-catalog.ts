"use client";

import { create } from "zustand";
import type { IptvChannel } from "@/lib/store";
import { loadSource, type IptvSource } from "@/lib/m3u-loader";
import { DEFAULT_IPTV_SOURCE } from "@/lib/iptv-defaults";
import { channelKey, channelTokens, tokenScore, type LinkableChannel } from "@/lib/match-channels";

/**
 * The whole IPTV playlist (not only the favourites), shared by the IPTV screen and the match cards, so a
 * broadcast name like "DAZN" on a Belgian match can open DAZN from the playlist's BELGIUM group. Kept in memory
 * for the session; the IPTV screen hands over the list it already loaded instead of fetching it twice.
 */

export const IPTV_SOURCE_KEY = "iptv_source_v1";

interface Entry { ch: IptvChannel; tokens: string[]; markers: Set<string> }
interface CatalogState {
  status: "idle" | "loading" | "ready" | "error";
  channels: IptvChannel[];
  setChannels: (list: IptvChannel[]) => void;
  load: () => Promise<void>;
}

/** Country words a playlist uses in group names / channel prefixes ("BELGIUM", "BE|", "|PT|"...). */
const COUNTRIES: Record<string, string[]> = {
  belgium: ["belgium", "belgie", "belgique", "be", "bel"],
  portugal: ["portugal", "pt", "por"],
  netherlands: ["netherlands", "holland", "nederland", "nl"],
  germany: ["germany", "deutschland", "de", "ger"],
  italy: ["italy", "italia", "it", "ita"],
  spain: ["spain", "espana", "es", "esp"],
  france: ["france", "fr"],
  england: ["england", "uk", "gb", "united kingdom"],
  scotland: ["scotland", "uk", "gb", "united kingdom"],
  argentina: ["argentina", "arg", "latino", "latin"], // "AR" in playlists means Arabic
  brazil: ["brazil", "brasil", "br", "bra"],
  mexico: ["mexico", "mx", "latino", "latin"],
  usa: ["usa", "us", "united states"],
  turkey: ["turkey", "turkiye", "tr", "tur"],
};
const ARAB_MARKERS = ["arab", "arabic", "ar", "mena", "عربي", "عربية", "bein", "ksa", "uae", "oman", "qatar", "kuwait", "egypt", "gulf", "خليج"];
const COUNTRY_CODES = new Set(Object.values(COUNTRIES).flat().filter(c => c.length <= 3 && c !== "fr" && c !== "en" && c !== "ar"));

const words = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9؀-ۿ]+/).filter(Boolean);

let entries: Entry[] = [];
let byToken = new Map<string, Entry[]>();
let inflight: Promise<void> | null = null;

function index(list: IptvChannel[]) {
  entries = list.filter(c => c?.name).map(ch => {
    const markers = new Set([...words(ch.group || ""), ...words(ch.name)]);
    const g = (ch.group || "").toLowerCase();
    for (const [country, names] of Object.entries(COUNTRIES)) if (names.some(n => n.includes(" ") && g.includes(n))) markers.add(country);
    // country prefixes aren't part of the channel's own name ("BE| DAZN 1" is DAZN 1)
    return { ch, markers, tokens: channelTokens(ch.name).filter(t => !COUNTRY_CODES.has(t)) };
  });
  byToken = new Map();
  for (const e of entries) for (const t of new Set(e.tokens)) {
    const arr = byToken.get(t);
    if (arr) arr.push(e); else byToken.set(t, [e]);
  }
}

export const useIptvCatalog = create<CatalogState>()((set, get) => ({
  status: "idle",
  channels: [],
  setChannels: (list) => { index(list); set({ channels: list, status: "ready" }); },
  load: () => {
    if (get().status === "ready") return Promise.resolve();
    if (inflight) return inflight;
    set({ status: "loading" });
    let src: IptvSource = DEFAULT_IPTV_SOURCE;
    try { const raw = localStorage.getItem(IPTV_SOURCE_KEY); if (raw) src = JSON.parse(raw) as IptvSource; } catch {}
    inflight = loadSource(src)
      .then(res => {
        if (res.single) { set({ status: "ready" }); return; }
        get().setChannels(res.channels.map(c => ({
          name: c.name, stream_id: `m3u:${c.url}`, stream_icon: c.logo || "", category_id: "source", url: c.url, type: "live" as const, group: c.group,
        })));
      })
      .catch(() => set({ status: "error" }))
      .finally(() => { inflight = null; });
    return inflight;
  },
}));

function countryKey(country?: string): string | null {
  const c = (country || "").toLowerCase();
  if (!c) return null;
  for (const k of Object.keys(COUNTRIES)) if (c.includes(k) || COUNTRIES[k].some(n => n.length > 3 && c.includes(n))) return k;
  return null;
}

/**
 * Best playlist channel for a broadcast name. `country` is the league's country: a channel from that country's
 * group wins ("DAZN" on a Belgian match -> DAZN from BELGIUM, not DAZN Germany); Arab channels prefer Arab groups.
 */
export function findCatalogChannel(broadcast: string, country?: string, arab = false): IptvChannel | null {
  if (!entries.length) return null;
  const bt = channelTokens(broadcast);
  const firstWord = bt.find(t => !/^\d+$/.test(t));
  if (!firstWord) return null;
  const want = countryKey(country);
  const wantMarkers = want ? COUNTRIES[want] : [];
  let best: IptvChannel | null = null, bestScore = 0;
  for (const e of byToken.get(firstWord) ?? []) {
    let sc = tokenScore(bt, e.tokens);
    if (!sc) continue;
    if (want) {
      if (e.markers.has(want) || wantMarkers.some(m => e.markers.has(m))) sc += 30;
      else if (Object.keys(COUNTRIES).some(k => k !== want && (e.markers.has(k) || COUNTRIES[k].some(m => m.length > 2 && e.markers.has(m))))) sc -= 20;
    }
    if (arab && ARAB_MARKERS.some(m => e.markers.has(m))) sc += 15;
    if (/\b(backup|test|vod|replay|ppv)\b/i.test(`${e.ch.group} ${e.ch.name}`)) sc -= 25;
    if (sc > bestScore) { best = e.ch; bestScore = sc; }
  }
  return bestScore >= 50 ? best : null;
}

/** Channels of the same playlist group (the player's side list when a playlist channel is opened). */
export function catalogGroup(ch: IptvChannel, max = 400): IptvChannel[] {
  if (!ch.group) return [ch];
  const list = entries.filter(e => e.ch.group === ch.group).map(e => e.ch);
  return list.length > max ? list.slice(0, max) : list;
}

/** Search the whole playlist by text (channel picker). */
export function searchCatalog(q: string, max = 60): IptvChannel[] {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  const out: IptvChannel[] = [];
  for (const e of entries) {
    if (`${e.ch.name} ${e.ch.group ?? ""}`.toLowerCase().includes(t)) { out.push(e.ch); if (out.length >= max) break; }
  }
  return out;
}

/** Favourite first (linked or matching), then the whole playlist. */
export function resolveChannel<T extends LinkableChannel>(
  broadcast: string, favorites: T[], find: (b: string, f: T[]) => T | null, country?: string, arab = false,
): { ch: T | IptvChannel; fav: boolean } | null {
  // international channels carry a country prefix ("POR: Sport TV1")
  broadcast = broadcast.replace(/^[A-Z]{2,3}:\s*/, "");
  if (!channelKey(broadcast)) return null;
  const fav = find(broadcast, favorites);
  if (fav) return { ch: fav, fav: true };
  const cat = findCatalogChannel(broadcast, country, arab);
  return cat ? { ch: cat, fav: false } : null;
}

const SLUG_COUNTRY: Record<string, string> = {
  bel: "belgium", por: "portugal", ned: "netherlands", ger: "germany", ita: "italy", esp: "spain", fra: "france",
  eng: "england", sco: "scotland", arg: "argentina", bra: "brazil", mex: "mexico", usa: "usa", tur: "turkey",
};
/** The league's country (365Scores / Sofascore give it; ESPN only has slugs like "bel.1"). */
export function leagueCountry(league: { id: string; country?: string }): string | undefined {
  return league.country || SLUG_COUNTRY[String(league.id ?? "").split(".")[0]] || undefined;
}

/** Playlist groups (categories) with their channel counts, in playlist order. */
export function catalogGroups(): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of entries) { const g = e.ch.group || "بدون تصنيف"; counts.set(g, (counts.get(g) ?? 0) + 1); }
  return [...counts].map(([name, count]) => ({ name, count }));
}

/** Channels of one playlist group. */
export function channelsInGroup(group: string): IptvChannel[] {
  return entries.filter(e => (e.ch.group || "بدون تصنيف") === group).map(e => e.ch);
}
