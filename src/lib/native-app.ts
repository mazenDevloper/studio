"use client";

/**
 * The Android app (android-app/, Capacitor) exposes a native plugin to the page: NativeIsland. In a normal
 * browser none of this exists and every helper is a no-op.
 */

export interface NativeStatus { overlay: boolean; background: boolean; notifications: boolean; overlayEnabled: boolean; version?: string }

interface NativeIslandPlugin {
  configure(o: { config: string }): Promise<void>;
  setOverlayEnabled(o: { enabled: boolean }): Promise<void>;
  getStatus(): Promise<NativeStatus>;
  requestOverlay(): Promise<void>;
  requestBackground(): Promise<void>;
  requestNotifications(): Promise<void>;
}

export function nativeIsland(): NativeIslandPlugin | null {
  if (typeof window === "undefined") return null;
  const cap = (window as any).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  return (cap.Plugins?.NativeIsland as NativeIslandPlugin) ?? null;
}

export const isNativeApp = () => !!nativeIsland();
