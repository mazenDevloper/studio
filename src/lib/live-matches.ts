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
        if (teams.length) q.set("teams", teams.join("|"));
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

let subscribers = 0;
let timer: ReturnType<typeof setInterval> | null = null;

/** Subscribe to the shared feed. Pass `teams` (favourite team names) to always include their matches. */
export function useLiveMatches(teams?: string[]) {
  const state = useLiveMatchesStore();
  // both sides of every pinned match (cloud-synced) are always included, like favourite teams
  const pins = useMediaStore(s => s.pinnedMatches) || [];
  const allTeams = teams ? Array.from(new Set([...teams, ...pins.flatMap(p => [p.home, p.away])])) : undefined;
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
        if (document.visibilityState === "visible") useLiveMatchesStore.getState().refresh();
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
 * page is still loading. Must build the same team list as useLiveMatches: favourite team names, then both sides
 * of each pinned match, without duplicates.
 */
export const MATCHES_PREFETCH_SCRIPT = `(function(){try{
var s=(JSON.parse(localStorage.getItem('drivecast-sovereign-v143')||'{}')||{}).state||{};var t=[];
function add(n){if(n&&t.indexOf(n)<0)t.push(n)}
(s.favoriteTeams||[]).forEach(function(x){add(x&&x.name)});
(s.pinnedMatches||[]).forEach(function(p){if(p){add(p.home);add(p.away)}});
var q='limit=${MATCHES_LIMIT}'+(t.length?'&teams='+encodeURIComponent(t.join('|')):'');
window.__matchesPrefetch={teams:t,at:Date.now(),p:fetch('/api/matches?'+q,{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).catch(function(){return null})};
}catch(e){}})();`;
