"use client";

import { useEffect, useRef } from "react";
import { useMediaStore } from "@/lib/store";

/** Last position reported by the YouTube player, readable from anywhere (e.g. "save to continue"). */
let lastYoutubeTime = { id: "", t: 0 };
export function getYoutubeTime(videoId: string): number {
  return lastYoutubeTime.id === videoId ? lastYoutubeTime.t : 0;
}

const SILENT = "data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";

/**
 * Keeps YouTube playing when the app goes to the background.
 * The YouTube embed pauses itself when the page is hidden (IPTV <video> and the Quran mp3 <audio> don't),
 * so while hidden we continue the same video as plain audio from the position it reached, then hand the
 * position back to the YouTube player when the app is visible again.
 */
export function YoutubeBackgroundBridge() {
  const { activeVideo, isPlaying } = useMediaStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const timeRef = useRef(0);           // last position reported by the YouTube iframe
  const urlRef = useRef<string | null>(null);
  const bridgingRef = useRef(false);
  const videoId = activeVideo?.id;

  const iframe = () => (videoId ? document.querySelector<HTMLIFrameElement>(`iframe[src*="youtube.com/embed/${videoId}"]`) : null);
  const yt = (func: string, args: unknown[] = []) => iframe()?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");

  // Unlock the <audio> element on the first user gesture, so it may start later while the page is hidden.
  useEffect(() => {
    const unlock = () => {
      const a = audioRef.current;
      if (!a || a.dataset.unlocked) return;
      a.src = SILENT; a.muted = true;
      a.play().then(() => { a.pause(); a.muted = false; a.dataset.unlocked = "1"; }).catch(() => {});
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => { window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  }, []);

  // Track the current time from the YouTube iframe API ("listening" makes it send infoDelivery messages).
  useEffect(() => {
    timeRef.current = 0;
    if (!videoId) return;
    const onMsg = (e: MessageEvent) => {
      try {
        if (!/youtube(-nocookie)?\.com$/.test(new URL(e.origin).hostname)) return;
        const d = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        const t = d?.info?.currentTime;
        if (typeof t === "number" && !bridgingRef.current) { timeRef.current = t; if (videoId) lastYoutubeTime = { id: videoId, t }; }
      } catch {}
    };
    window.addEventListener("message", onMsg);
    const ping = setInterval(() => iframe()?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*"), 2000);
    return () => { window.removeEventListener("message", onMsg); clearInterval(ping); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Resolve a direct audio URL ahead of time (the page may be throttled once hidden).
  useEffect(() => {
    urlRef.current = null;
    if (!videoId) return;
    let cancelled = false;
    fetch(`/api/audio-url?id=${videoId}`).then(r => (r.ok ? r.json() : null)).then(j => { if (!cancelled && j?.url) urlRef.current = j.url; }).catch(() => {});
    return () => { cancelled = true; };
  }, [videoId]);

  // Hand over on hide / take back on show.
  useEffect(() => {
    const onVis = () => {
      const a = audioRef.current;
      if (!a) return;
      if (document.hidden) {
        if (!videoId || !isPlaying || !urlRef.current) return;
        a.src = urlRef.current;
        a.currentTime = timeRef.current || 0;
        a.play().then(() => {
          bridgingRef.current = true;
          yt("pauseVideo"); // avoid double audio on desktop, where the embed may keep playing
          if ("mediaSession" in navigator) {
            navigator.mediaSession.setActionHandler("play", () => a.play());
            navigator.mediaSession.setActionHandler("pause", () => a.pause());
          }
        }).catch(() => {});
      } else if (bridgingRef.current) {
        const t = a.currentTime;
        if (videoId) lastYoutubeTime = { id: videoId, t };
        a.pause();
        bridgingRef.current = false;
        timeRef.current = t;
        yt("seekTo", [t, true]);
        yt("playVideo");
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, isPlaying]);

  // Stop the bridge when the video is closed or changed.
  useEffect(() => () => { audioRef.current?.pause(); bridgingRef.current = false; }, [videoId]);

  return <audio ref={audioRef} preload="none" playsInline className="hidden" />;
}
