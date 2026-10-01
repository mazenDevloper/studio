"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { useMediaStore } from "@/lib/store";
import type { TopMatchesResult } from "@/lib/match-core";

/**
 * One shared live feed of today's matches (/api/matches) for the whole app:
 * the floating island, the goal celebration and the /matches page all read the same data,
 * and polling runs once, only while at least one of them is mounted and the tab is visible.
 */

const POLL_MS = 30_000;

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

export const useLiveMatchesStore = create<LiveMatchesState>((set, get) => ({
  data: null,
  error: "",
  loading: false,
  updatedAt: null,
  teams: [],
  celebrating: false,
  refresh: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const q = new URLSearchParams({ limit: "12" });
      if (get().teams.length) q.set("teams", get().teams.join("|"));
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
    if (allTeams) useLiveMatchesStore.getState().setTeams(allTeams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamsKey]);

  return state;
}
