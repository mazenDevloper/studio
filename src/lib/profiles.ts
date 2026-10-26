"use client";
/**
 * One settings profile per device (car / home / TV): the screen size, dock side, end-of-video action… are saved in
 * «المركز» under this device's id and put back by themselves whenever DriveCast opens on that device.
 */
import { hub } from "@/lib/hub";
import { useMediaStore } from "@/lib/store";

const FIELDS = ["dockSide", "displayScale", "dockScale", "endAction", "isLooping"] as const;
export type Profile = Partial<Record<(typeof FIELDS)[number], any>> & { start?: string; at?: number };

const all = (): Record<string, Profile> => ((hub.state as any).profiles || {}) as any;
export const profileOf = (id: string): Profile | null => all()[id] || null;

export function saveProfile(id: string, extra: Partial<Profile> = {}) {
  const s: any = useMediaStore.getState(), p: Profile = { ...(profileOf(id) || {}) };
  for (const k of FIELDS) p[k] = s[k];
  Object.assign(p, extra, { at: Date.now() });
  const next = { ...all(), [id]: p };
  (hub.state as any).profiles = next;
  hub.op({ op: "set", key: "profiles", value: next });
}

export function applyProfile(id: string, route?: (path: string) => void) {
  const p = profileOf(id); if (!p) return false;
  const patch: any = {};
  for (const k of FIELDS) if (p[k] !== undefined) patch[k] = p[k];
  useMediaStore.setState(patch);
  if (route && p.start && location.pathname !== p.start) route(p.start);
  return true;
}
