"use client";
/**
 * The network layer shared by the matches feed and the cloud bins:
 *  - TanStack Query (core): retries with growing waits, one request at a time for the same thing, a time limit
 *  - Dexie (IndexedDB): the last good copy of every cloud bin, so the app opens full with no internet (car, tunnel)
 */
import { QueryClient } from "@tanstack/query-core";
import Dexie, { type Table } from "dexie";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: n => Math.min(8000, 700 * 2 ** n),   // 0.7 s, 1.4 s, 2.8 s
      staleTime: 0,
      gcTime: 10 * 60_000,
      networkMode: "always",
    },
  },
});

/** fetch JSON with a time limit; throws on a bad answer so the query retries it */
export async function getJson(url: string, ms = 10_000, init?: RequestInit) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { cache: "no-store", ...init, signal: c.signal });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error((j && (j.error as string)) || `HTTP ${r.status}`);
    return j;
  } finally { clearTimeout(t); }
}

// ---- offline copies of the cloud bins ----
interface BinRow { id: string; data: unknown; at: number }
class OfflineDb extends Dexie {
  bins!: Table<BinRow, string>;
  constructor() { super("drivecast-offline"); this.version(1).stores({ bins: "id, at" }); }
}
let db: OfflineDb | null = null;
const odb = () => { if (!db && typeof indexedDB !== "undefined") { try { db = new OfflineDb(); } catch { db = null; } } return db; };

export async function saveBinOffline(id: string, data: unknown) {
  try { await odb()?.bins.put({ id, data, at: Date.now() }); } catch { /* storage full / private mode */ }
}
export async function loadBinOffline(id: string): Promise<{ data: unknown; at: number } | null> {
  try { const r = await odb()?.bins.get(id); return r ? { data: r.data, at: r.at } : null; } catch { return null; }
}
