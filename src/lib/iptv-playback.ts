"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { HlsConfig, LoaderConfig } from "hls.js";

/**
 * IPTV playback tuning (per device, kept in this browser only: a phone on 4G and a TV on fibre need different
 * settings). Most IPTV stutter comes from playing too close to the live edge with a tiny buffer, from hls.js
 * "low latency" mode chasing the edge, and from servers that throttle browsers; these knobs address each.
 */

/** stable = far from the live edge + refill cushion (least stutter); fast = closest to live (most stutter-prone) */
export type BufferProfile = "stable" | "balanced" | "fast";
/** hls = the playlist's .m3u8 links; mpegts = Xtream live links played as one continuous .ts stream (often smoother) */
export type IptvEngine = "hls" | "mpegts";
/** auto = relay through this app's server only when the page is https; relay = always (VLC user agent, no CORS issues) */
export type ConnectionMode = "auto" | "direct" | "relay";

export interface IptvPlaybackSettings {
  profile: BufferProfile;
  engine: IptvEngine;
  connection: ConnectionMode;
  /** seconds hls.js keeps loaded ahead */
  bufferSeconds: number;
  /** 0 = automatic */
  maxQuality: number;
  autoReconnect: boolean;
  showStats: boolean;
}

export const DEFAULT_IPTV_PLAYBACK: IptvPlaybackSettings = {
  profile: "stable", engine: "hls", connection: "auto", bufferSeconds: 60, maxQuality: 0, autoReconnect: true, showStats: false,
};

interface IptvPlaybackState extends IptvPlaybackSettings {
  setPlayback: (patch: Partial<IptvPlaybackSettings>) => void;
  resetPlayback: () => void;
}

export const useIptvPlayback = create<IptvPlaybackState>()(
  persist(
    (set) => ({
      ...DEFAULT_IPTV_PLAYBACK,
      setPlayback: (patch) => set(patch),
      resetPlayback: () => set(DEFAULT_IPTV_PLAYBACK),
    }),
    { name: "iptv-playback-v1" },
  ),
);

/** Seconds of video that must be buffered before playback resumes after a stall (0 = let the browser decide). */
export const REFILL_CUSHION: Record<BufferProfile, number> = { stable: 4, balanced: 2, fast: 0 };
/** A playing video whose clock hasn't moved for this long is considered frozen and gets recovered. */
export const FREEZE_MS: Record<BufferProfile, number> = { stable: 9000, balanced: 7000, fast: 5000 };

const retry = (maxNumRetry: number) => ({ maxNumRetry, retryDelayMs: 500, maxRetryDelayMs: 4000, backoff: "exponential" as const });
const policy = (ttfb: number, load: number, retries: number): { default: LoaderConfig } => ({
  default: { maxTimeToFirstByteMs: ttfb, maxLoadTimeMs: load, timeoutRetry: retry(retries), errorRetry: retry(retries) },
});

export function hlsConfig(s: IptvPlaybackSettings): Partial<HlsConfig> {
  const live = s.profile === "stable"
    ? { liveSyncDurationCount: 4, liveMaxLatencyDurationCount: Infinity, maxLiveSyncPlaybackRate: 1 }
    : s.profile === "balanced"
      ? { liveSyncDurationCount: 3, liveMaxLatencyDurationCount: 10, maxLiveSyncPlaybackRate: 1.05 }
      : { liveSyncDurationCount: 2, liveMaxLatencyDurationCount: 6, maxLiveSyncPlaybackRate: 1.2 };
  return {
    ...live,
    enableWorker: true,
    // low-latency mode keeps hopping to the live edge: the main cause of stutter on IPTV panels
    lowLatencyMode: s.profile === "fast",
    maxBufferLength: s.bufferSeconds,
    maxMaxBufferLength: s.bufferSeconds * 2,
    backBufferLength: 30,
    maxBufferHole: 1, // jump the small timestamp gaps IPTV encoders leave instead of stalling on them
    nudgeMaxRetry: 10,
    startFragPrefetch: true,
    abrBandWidthFactor: 0.8,
    abrBandWidthUpFactor: 0.6,
    fragLoadPolicy: policy(10_000, 30_000, 6),
    playlistLoadPolicy: policy(10_000, 15_000, 6),
    manifestLoadPolicy: policy(10_000, 20_000, 4),
  };
}

export function mpegtsConfig(s: IptvPlaybackSettings) {
  return {
    isLive: true,
    enableWorker: true,
    enableStashBuffer: s.profile !== "fast",
    stashInitialSize: s.profile === "stable" ? 1024 * 1024 : 384 * 1024,
    liveBufferLatencyChasing: s.profile === "fast",
    liveSync: s.profile !== "stable",
    liveSyncMaxLatency: s.profile === "balanced" ? 8 : 4,
    liveSyncTargetLatency: s.profile === "balanced" ? 5 : 2,
    lazyLoad: false,
    autoCleanupSourceBuffer: true,
    autoCleanupMaxBackwardDuration: 60,
    autoCleanupMinBackwardDuration: 30,
  };
}

/**
 * Xtream live link as a continuous MPEG-TS stream: /live/user/pass/123.m3u8 -> /live/user/pass/123.ts.
 * Returns null when the link isn't an Xtream live link (it then stays on HLS).
 */
export function toTsUrl(src: string): string | null {
  try {
    const u = new URL(src);
    if (/\.ts$/i.test(u.pathname)) return src;
    const m = u.pathname.match(/^(.*\/live\/[^/]+\/[^/]+\/\d+)(\.m3u8?)?$/i);
    if (!m) return null;
    u.pathname = `${m[1]}.ts`;
    return u.toString();
  } catch { return null; }
}

export const PROFILE_LABELS: Record<BufferProfile, { title: string; hint: string }> = {
  stable: { title: "ثابت", hint: "أقل تقطيع · متأخر عن البث بثوانٍ" },
  balanced: { title: "متوازن", hint: "تقطيع قليل · تأخير متوسط" },
  fast: { title: "أقرب للمباشر", hint: "أقل تأخير · أكثر عرضة للتقطيع" },
};
