"use client";

/**
 * The Android app (android-app/, Capacitor) exposes a native plugin to the page: NativeIsland. In a normal
 * browser none of this exists and every helper is a no-op.
 */

export interface NativeStatus { overlay: boolean; background: boolean; notifications: boolean; overlayEnabled: boolean; version?: string; textZoom?: number; accessibility?: boolean }

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
  setVideoPlaying(o: { playing: boolean }): Promise<void>;
  takePendingCommands(): Promise<{ commands: NativeCommand[] }>;
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
