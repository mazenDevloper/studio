"use client";

/**
 * The Android app (android-app/, Capacitor) exposes a native plugin to the page: NativeIsland. In a normal
 * browser none of this exists and every helper is a no-op.
 */

export interface NativeStatus { overlay: boolean; background: boolean; notifications: boolean; overlayEnabled: boolean; version?: string; textZoom?: number; accessibility?: boolean;
  /** the iPhone app: Dynamic Island switches */ platform?: "ios"; liveActivities?: boolean; prayerIsland?: boolean; matchesIsland?: boolean }

interface NativeIslandPlugin {
  configure(o: { config: string }): Promise<void>;
  setOverlayEnabled(o: { enabled: boolean }): Promise<void>;
  getStatus(): Promise<NativeStatus>;
  requestOverlay(): Promise<void>;
  requestBackground(): Promise<void>;
  requestNotifications(): Promise<void>;
  requestAccessibility(): Promise<void>;
  setTextZoom(o: { percent: number }): Promise<void>;
  updateWidgets(o: { data: string }): Promise<void>;
  setMatchesIsland(o: { enabled: boolean }): Promise<void>;
  setPrayerIsland(o: { enabled: boolean }): Promise<void>;
  setVideoPlaying(o: { playing: boolean }): Promise<void>;
  takePendingCommands(): Promise<{ commands: NativeCommand[] }>;
  /** the shared state of the widgets / islands / page (Hub): read it, change a value (value = JSON text) */
  hubGet?(): Promise<{ state: string }>;
  hubSet?(o: { key: string; value: string }): Promise<void>;
  /** settings' test: "goal" = four goals 3 s apart with the full animation; "islands" = sample islands for a minute */
  testIslands?(o: { kind: "goal" | "islands" }): Promise<void>;
  addListener(event: "command", cb: (c: NativeCommand) => void): Promise<{ remove: () => void }> | { remove: () => void };
}

/** From a widget / picture-in-picture: "media" (toggle | next | prev), "pip" ("1" | "0"). */
export interface NativeCommand { cmd: string; arg: string }

export function nativeIsland(): NativeIslandPlugin | null {
  if (typeof window === "undefined") return null;
  const cap = (window as any).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  return (cap.Plugins?.NativeIsland as NativeIslandPlugin) ?? null;
}

export const isNativeApp = () => !!nativeIsland();

/** Change a value shared with the widgets and islands (no-op in a browser). */
export function hubSet(key: string, value: unknown) {
  nativeIsland()?.hubSet?.({ key, value: JSON.stringify(value ?? null) }).catch(() => {});
}

/** The shared state now (empty in a browser). */
export async function hubGet(): Promise<Record<string, any>> {
  try {
    const r = await nativeIsland()?.hubGet?.();
    return r?.state ? JSON.parse(r.state) : {};
  } catch {
    return {};
  }
}

/** A shared value changed on the phone (widget, island, bubble...): listen with window "native-hub". */
export type NativeHubEvent = CustomEvent<{ key: string; value: any }>;
