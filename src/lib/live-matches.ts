"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { useMediaStore } from "@/lib/store";
import { footballDay } from "@/lib/oman-time";
import type { TopMatchesResult } from "@/lib/match-core";

/**
 * One shared live feed of today's matches (/api/matches) for the whole app:
 * the floating island, the goal celebration and the /matches page all read the same data,
 * and polling runs once, only while at least one of them is mounted and the tab is visible.
 *
 * Fast start: the last answer is kept in localStorage and shown at once, and the first request is started by a
 * tiny script in <head> (see MATCHES_PREFETCH_SCRIPT) before React has even loaded; the store takes that answer.
 */

const POLL_MS = 30_000;
const CACHE_KEY = "live-matches-v1";
export const MATCHES_LIMIT = 12;

interface LiveMatchesState {
  data: TopMatchesResult | null;
  error: string;
  loading: boolean;
  updatedAt: number | null;
  teams: string[];
  /** true while the goal island is expanded: the other islands step aside */
  celebrating: boolean;
  refresh: () => Promise<void>;
  setTeams: (teams: string[]) => void;
  setCelebrating: (v: boolean) => void;
}

function readCache(): { data: TopMatchesResult; updatedAt: number } | null {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    // only today's football day: yesterday's list would be wrong
    return c?.data?.date === footballDay() ? c : null;
  } catch { return null; }
}

/** The request started in <head>, if it was for these teams and is recent. Used once. */
function takePrefetch(teams: string[]): Promise<any> | null {
  const w = window as any;
  const pf = w.__matchesPrefetch;
  if (!pf) return null;
  if (Date.now() - pf.at > 20_000) { w.__matchesPrefetch = null; return null; }
  if (JSON.stringify(pf.teams) !== JSON.stringify(teams)) return null; // another subscriber's request: keep it for ours
  w.__matchesPrefetch = null;
  return pf.p;
}

const cached = typeof window !== "undefined" ? readCache() : null;
let again = false;

export const useLiveMatchesStore = create<LiveMatchesState>((set, get) => ({
  data: cached?.data ?? null,
  error: "",
  loading: false,
  updatedAt: cached?.updatedAt ?? null,
  teams: [],
  celebrating: false,
  refresh: async () => {
    // a request is already running: run once more when it ends (its teams may be out of date)
    if (get().loading) { again = true; return; }
    set({ loading: true });
    try {
      const teams = get().teams;
      let json = await (takePrefetch(teams) ?? Promise.resolve(null));
      if (!json || json.error || !Array.isArray(json.matches)) {
        const q = new URLSearchParams({ limit: String(MATCHES_LIMIT) });
        // "pin:" entries are pinned matches' teams: listed, but not favourites
        // "lg:" entries are followed competitions: listed, not favourites
        const fav = teams.filter(t => !t.startsWith("pin:") && !t.startsWith("lg:")), pins = teams.filter(t => t.startsWith("pin:")).map(t => t.slice(4));
        if (fav.length) q.set("teams", fav.join("|"));
        if (pins.length) q.set("pins", pins.join("|"));
        for (const t of teams) if (t.startsWith("lg:")) q.append("follow", t.slice(3));
        const res = await fetch(`/api/matches?${q}`, { cache: "no-store" });
        json = await res.json();
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      }
      const updatedAt = Date.now();
      set({ data: json, error: "", updatedAt });
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: json, updatedAt })); } catch {}
    } catch (e: any) {
      set({ error: e?.message || "Failed to fetch" });
    } finally {
      set({ loading: false });
      if (again) { again = false; get().refresh(); }
    }
  },
  setCelebrating: (v) => set({ celebrating: v }),
  setTeams: (teams) => {
    if (teams.join("|") === get().teams.join("|")) return;
    set({ teams });
    get().refresh();
  },
}));

/**
 * Refresh only when it can change something: every 30 s while one of the listed matches is live (or about to start),
 * otherwise not until 5 minutes before the next kick-off (checked again at least every 30 minutes, and after a
 * failed request on the normal 30 s rhythm).
 */
function pollDue(data: TopMatchesResult | null, updatedAt: number | null): boolean {
  if (!data || !updatedAt || useLiveMatchesStore.getState().error) return true;
  const now = Date.now();
  const list = data.matches || [];
  if (list.some(m => m.status === "live")) return true;
  const next = list.filter(m => m.status === "upcoming").map(m => m.timestamp * 1000).filter(t => t > now - 15 * 60_000).sort((a, b) => a - b)[0];
  if (next && next - now < 5 * 60_000) return true; // starting (or late to start): watch it
  const wakeAt = Math.min(updatedAt + 30 * 60_000, next ? next - 5 * 60_000 : Infinity);
  return now >= wakeAt;
}

let subscribers = 0;
let timer: ReturnType<typeof setInterval> | null = null;

/** Subscribe to the shared feed. Pass `teams` (favourite teams as favSpecString: "Liverpool~England") to always
 * include their matches. */
export function useLiveMatches(teams?: string[]) {
  const state = useLiveMatchesStore();
  // both sides of every pinned match (cloud-synced) are always included - as "pin:" entries, not favourites
  const pins = useMediaStore(s => s.pinnedMatches) || [];
  const follow = useMediaStore(s => s.followedLeagues) || [];
  const allTeams = teams ? Array.from(new Set([...teams, ...pins.flatMap(p => [`pin:${p.home}`, `pin:${p.away}`]), ...follow.map(k => `lg:${k}`)])) : undefined;
  const teamsKey = allTeams?.join("|");

  // teams first (same effect order as before), so the first request already carries them
  useEffect(() => {
    if (allTeams) useLiveMatchesStore.getState().setTeams(allTeams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamsKey]);

  useEffect(() => {
    subscribers++;
    if (!timer) {
      // the cached list is shown at once and refreshed right away (unless a few seconds old) - one tick later, so the
      // components that pass favourite teams have set them and the first request already includes them
      setTimeout(() => {
        const { refresh, updatedAt, loading } = useLiveMatchesStore.getState();
        if (!loading && (!updatedAt || Date.now() - updatedAt > 5_000)) refresh();
      }, 0);
      timer = setInterval(() => {
        if (document.visibilityState !== "visible") return;
        const { data, updatedAt } = useLiveMatchesStore.getState();
        if (!pollDue(data, updatedAt)) return;
        useLiveMatchesStore.getState().refresh();
      }, POLL_MS);
    }
    return () => {
      subscribers--;
      if (!subscribers && timer) { clearInterval(timer); timer = null; }
    };
  }, []);

  return state;
}

/**
 * Inline script for <head>: starts /api/matches with the user's teams (read from the persisted store) while the
 * page is still loading. Must build the same team list as useLiveMatches: favourite teams ("name~country"), then
 * both sides of each pinned match ("pin:name"), without duplicates.
 */
export const MATCHES_PREFETCH_SCRIPT = `(function(){try{
var s=(JSON.parse(localStorage.getItem('drivecast-sovereign-v143')||'{}')||{}).state||{};var t=[];
function add(n){if(n&&t.indexOf(n)<0)t.push(n)}
(s.favoriteTeams||[]).forEach(function(x){if(x&&x.name)add(x.country?x.name+'~'+x.country:x.name)});
(s.pinnedMatches||[]).forEach(function(p){if(p){add('pin:'+p.home);add('pin:'+p.away)}});
(s.followedLeagues||[]).forEach(function(k){add('lg:'+k)});
var f=t.filter(function(x){return x.indexOf('pin:')!==0&&x.indexOf('lg:')!==0}),pn=t.filter(function(x){return x.indexOf('pin:')===0}).map(function(x){return x.slice(4)});
var q='limit=${MATCHES_LIMIT}'+(f.length?'&teams='+encodeURIComponent(f.join('|')):'')+(pn.length?'&pins='+encodeURIComponent(pn.join('|')):'');
t.forEach(function(x){if(x.indexOf('lg:')===0)q+='&follow='+encodeURIComponent(x.slice(3))});
window.__matchesPrefetch={teams:t,at:Date.now(),p:fetch('/api/matches?'+q,{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null})};
}catch(e){}})();`;
