"use client";

import { useEffect } from "react";
import { create } from "zustand";
import type { TopMatchesResult } from "@/lib/match-core";

/**
 * One shared live feed of today's matches (/api/matches) for the whole app:
 * the floating island, the goal celebration and the /matches page all read the same data,
 * and polling runs once, only while at least one of them is mounted and the tab is visible.
 */

const POLL_MS = 30_000;

export interface PinnedMatch { id: string; home: string; away: string }

const PIN_KEY = "pinned_matches_v1";
const loadPins = (): PinnedMatch[] => {
  try { return typeof window === "undefined" ? [] : JSON.parse(localStorage.getItem(PIN_KEY) || "[]"); } catch { return []; }
};
const savePins = (pins: PinnedMatch[]) => { try { localStorage.setItem(PIN_KEY, JSON.stringify(pins)); } catch {} };

interface LiveMatchesState {
  data: TopMatchesResult | null;
  error: string;
  loading: boolean;
  updatedAt: number | null;
  teams: string[];
  /** matches the user pinned as a floating island (kept across reloads) */
  pinned: PinnedMatch[];
  /** true while the goal island is expanded: the other islands step aside */
  celebrating: boolean;
  refresh: () => Promise<void>;
  setTeams: (teams: string[]) => void;
  togglePin: (m: PinnedMatch) => void;
  setCelebrating: (v: boolean) => void;
}

export const useLiveMatchesStore = create<LiveMatchesState>((set, get) => ({
  data: null,
  error: "",
  loading: false,
  updatedAt: null,
  teams: [],
  pinned: loadPins(),
  celebrating: false,
  refresh: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const q = new URLSearchParams({ limit: "12" });
      // favourite teams + both sides of every pinned match are always included in the feed
      const teams = Array.from(new Set([...get().teams, ...get().pinned.flatMap(p => [p.home, p.away])]));
      if (teams.length) q.set("teams", teams.join("|"));
      const res = await fetch(`/api/matches?${q}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      set({ data: json, error: "", updatedAt: Date.now() });
    } catch (e: any) {
      set({ error: e?.message || "Failed to fetch" });
    } finally {
      set({ loading: false });
    }
  },
  togglePin: (m) => {
    const pins = get().pinned.some(p => p.id === m.id) ? get().pinned.filter(p => p.id !== m.id) : [...get().pinned, m];
    savePins(pins);
    set({ pinned: pins });
    get().refresh();
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
  const teamsKey = teams?.join("|");

  useEffect(() => {
    subscribers++;
    if (!timer) {
      const { refresh, data } = useLiveMatchesStore.getState();
      if (!data) refresh();
      timer = setInterval(() => {
        if (document.visibilityState === "visible") useLiveMatchesStore.getState().refresh();
      }, POLL_MS);
    }
    return () => {
      subscribers--;
      if (!subscribers && timer) { clearInterval(timer); timer = null; }
    };
  }, []);

  useEffect(() => {
    if (teams) useLiveMatchesStore.getState().setTeams(teams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamsKey]);

  return state;
}
