"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { proxiedUrl } from "@/lib/m3u";
import { useIptvPlayback, hlsConfig, mpegtsConfig, toTsUrl, REFILL_CUSHION, FREEZE_MS, type IptvPlaybackSettings } from "@/lib/iptv-playback";

interface HlsVideoProps {
  src: string;
  className?: string;
  onError?: (msg: string) => void;
}

const FAIL_MESSAGE = "تعذر تشغيل البث / Stream failed to play";
/** reloads allowed before giving up: few for a channel that never started, many for one that dropped mid-play */
const START_RELOADS = 2;
const RECONNECT_RELOADS = 12;

type Status = "loading" | "playing" | "buffering" | "reconnecting" | "failed";

/** Seconds buffered ahead of the playhead. */
function bufferedAhead(v: HTMLVideoElement): number {
  for (let i = 0; i < v.buffered.length; i++) {
    if (v.buffered.start(i) <= v.currentTime + 0.3 && v.buffered.end(i) >= v.currentTime) return v.buffered.end(i) - v.currentTime;
  }
  return 0;
}

/**
 * <video> for IPTV: hls.js for .m3u8, mpegts.js for continuous .ts (Xtream) streams, native elsewhere (Safari / TVs).
 * Anti-stutter, all tunable in the IPTV playback settings:
 *  - plays a few segments behind the live edge with a large buffer (no low-latency edge chasing);
 *  - after a stall it waits for a small cushion to refill instead of play-stall-play micro stutter;
 *  - a frozen picture is nudged to the live edge, then the stream is reconnected automatically.
 * Gives up with a message instead of spinning forever when a channel never starts.
 */
export function HlsVideo({ src, className, onError }: HlsVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const errorRef = useRef(onError);
  errorRef.current = onError;
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);
  const [stats, setStats] = useState("");
  const reloadsRef = useRef(0);
  const playedRef = useRef(false);

  const profile = useIptvPlayback(s => s.profile);
  const engine = useIptvPlayback(s => s.engine);
  const connection = useIptvPlayback(s => s.connection);
  const bufferSeconds = useIptvPlayback(s => s.bufferSeconds);
  const maxQuality = useIptvPlayback(s => s.maxQuality);
  const autoReconnect = useIptvPlayback(s => s.autoReconnect);
  const showStats = useIptvPlayback(s => s.showStats);

  // a new channel starts with a clean reconnect budget
  useEffect(() => { reloadsRef.current = 0; playedRef.current = false; }, [src]);

  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;
    const settings: IptvPlaybackSettings = { profile, engine, connection, bufferSeconds, maxQuality, autoReconnect, showStats };
    setStatus(attempt ? "reconnecting" : "loading");
    let hls: Hls | null = null;
    let ts: { destroy(): void; unload(): void; detachMediaElement(): void } | null = null;
    let dead = false;
    let usedEngine = "native";
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => { const t = setTimeout(() => { if (!dead) fn(); }, ms); timers.push(t); };

    const fail = () => { if (dead) return; dead = true; setStatus("failed"); errorRef.current?.(FAIL_MESSAGE); };
    /** Tear down and build the player again (re-runs this effect). */
    const reload = () => {
      if (dead) return;
      const limit = playedRef.current && settings.autoReconnect ? RECONNECT_RELOADS : START_RELOADS;
      if (reloadsRef.current >= limit) { fail(); return; }
      reloadsRef.current++;
      dead = true;
      setStatus("reconnecting");
      const wait = Math.min(1000 * 2 ** (reloadsRef.current - 1), 8000);
      const t = setTimeout(() => setAttempt(n => n + 1), wait);
      timers.push(t);
    };

    const start = () => {
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    };

    // ---- stall cushion + freeze watchdog ----
    const cushion = REFILL_CUSHION[settings.profile];
    let autoPaused = false, selfPause = false, stalledAt = 0;
    let lastTime = -1, lastMove = Date.now(), movingSince = 0, nudged = false, streamEnded = false;
    const onPlaying = () => { playedRef.current = true; setStatus("playing"); errorRef.current?.(""); };
    const onWaiting = () => {
      if (!playedRef.current || dead) return;
      setStatus("buffering");
      if (cushion > 0 && !video.paused) { autoPaused = true; selfPause = true; stalledAt = Date.now(); video.pause(); }
    };
    const onPause = () => { if (selfPause) selfPause = false; };
    const onPlay = () => { autoPaused = false; };
    video.addEventListener("playing", onPlaying);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("pause", onPause);
    video.addEventListener("play", onPlay);

    const tick = setInterval(() => {
      if (dead) return;
      const now = Date.now();
      if (streamEnded && playedRef.current && video.currentTime > 0 && bufferedAhead(video) < 0.5) { reload(); return; }
      if (autoPaused && (bufferedAhead(video) >= cushion || now - stalledAt > 10_000)) {
        autoPaused = false;
        start();
      }
      const running = !video.paused || autoPaused;
      if (!running || !playedRef.current) { lastMove = now; return; }
      if (video.currentTime !== lastTime) {
        lastTime = video.currentTime; lastMove = now; nudged = false;
        if (!movingSince) movingSince = now;
        if (now - movingSince > 20_000) reloadsRef.current = 0; // healthy again: refill the reconnect budget
        return;
      }
      movingSince = 0;
      if (!settings.autoReconnect || now - lastMove < FREEZE_MS[settings.profile]) return;
      if (!nudged) {
        // first try: jump to the live edge / over the hole and keep loading
        nudged = true; lastMove = now;
        const edge = hls?.liveSyncPosition;
        if (edge && Number.isFinite(edge) && edge > video.currentTime + 0.5) video.currentTime = edge;
        else if (video.buffered.length) video.currentTime = Math.max(video.currentTime, video.buffered.end(video.buffered.length - 1) - 1);
        hls?.startLoad();
        start();
      } else {
        reload();
      }
    }, 500);

    // Safety net: nothing playing after 25s means the stream is unreachable (or stuck while connecting).
    later(() => { if (!playedRef.current || (!video.currentTime && video.paused)) reload(); }, 25_000);

    const tsUrl = settings.engine === "mpegts" || /\.ts(\?|$)/i.test(src) ? toTsUrl(src) : null;
    const isHls = /\.m3u8?(\?|$)/i.test(src) || src.includes("m3u8") || /\/live\/[^/]+\/[^/]+\/\d+/.test(src);

    if (tsUrl && typeof window !== "undefined" && "MediaSource" in window) {
      usedEngine = "mpegts";
      // continuous stream: relayed by default (same origin, no CORS, one upstream connection closed on switch)
      const url = proxiedUrl(tsUrl, settings.connection === "direct" ? "auto" : "relay");
      import("mpegts.js").then(({ default: mpegts }) => {
        if (dead) return;
        if (!mpegts.isSupported()) { reload(); return; }
        const p = mpegts.createPlayer({ type: "mpegts", isLive: true, url }, mpegtsConfig(settings));
        ts = p;
        p.attachMediaElement(video);
        p.on(mpegts.Events.ERROR, () => reload());
        // a live stream that "completes" was cut by the server (or Vercel's time limit): play out what is buffered, then reconnect
        p.on(mpegts.Events.LOADING_COMPLETE, () => { streamEnded = true; });
        p.load();
        start();
      }).catch(() => reload());
    } else if (isHls && Hls.isSupported()) {
      usedEngine = "hls";
      const url = proxiedUrl(src, settings.connection);
      hls = new Hls(hlsConfig(settings));
      let netRetries = 0, mediaRetries = 0;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        if (settings.maxQuality > 0 && hls) {
          let cap = -1;
          data.levels.forEach((l, i) => { if (!l.height || l.height <= settings.maxQuality) cap = i; });
          hls.autoLevelCapping = cap >= 0 ? cap : 0;
        }
        start();
      });
      hls.on(Hls.Events.FRAG_LOADED, () => { netRetries = 0; });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && netRetries < 3) { netRetries++; later(() => hls?.startLoad(), 1000 * netRetries); }
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRetries < 2) {
          mediaRetries++;
          if (mediaRetries === 2) hls?.swapAudioCodec();
          hls?.recoverMediaError();
        }
        else reload();
      });
    } else {
      video.src = proxiedUrl(src, settings.connection);
      video.addEventListener("loadedmetadata", start, { once: true });
      video.addEventListener("error", reload, { once: true });
    }

    const statsTimer = settings.showStats ? setInterval(() => {
      const q = (video as any).getVideoPlaybackQuality?.();
      const bw = hls?.bandwidthEstimate;
      setStats([
        usedEngine.toUpperCase(),
        `buffer ${bufferedAhead(video).toFixed(1)}s`,
        video.videoHeight ? `${video.videoHeight}p` : "",
        bw && Number.isFinite(bw) ? `${(bw / 1e6).toFixed(1)} Mbps` : "",
        q ? `dropped ${q.droppedVideoFrames}` : "",
        reloadsRef.current ? `reconnects ${reloadsRef.current}` : "",
      ].filter(Boolean).join(" · "));
    }, 1000) : null;

    return () => {
      dead = true;
      timers.forEach(clearTimeout);
      clearInterval(tick);
      if (statsTimer) clearInterval(statsTimer);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("loadedmetadata", start);
      video.removeEventListener("error", reload);
      hls?.destroy();
      if (ts) { try { ts.unload(); ts.detachMediaElement(); ts.destroy(); } catch {} }
      video.removeAttribute("src");
      video.load();
    };
  }, [src, attempt, profile, engine, connection, bufferSeconds, maxQuality, autoReconnect, showStats]);

  return (
    <div className="relative w-full h-full bg-black">
      <video ref={ref} controls autoPlay playsInline className={cn("w-full h-full bg-black object-contain", className)} />
      {(status === "loading" || status === "buffering") && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Loader2 className="w-10 h-10 animate-spin text-white/60" /></div>}
      {status === "reconnecting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
          <Loader2 className="w-10 h-10 animate-spin text-white/70" />
          <span className="text-white/80 text-xs font-bold bg-black/60 rounded-full px-3 py-1">جاري إعادة الاتصال...</span>
        </div>
      )}
      {showStats && stats && <div dir="ltr" className="absolute top-2 left-2 text-[10px] font-mono text-white/80 bg-black/60 rounded-md px-2 py-1 pointer-events-none">{stats}</div>}
      {status === "failed" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-center px-6">
          <span className="text-white font-black text-sm">{FAIL_MESSAGE}</span>
          <span className="text-white/50 text-xs">القناة غير متاحة الآن أو الرابط محجوب / channel offline or blocked</span>
          <button onClick={() => { reloadsRef.current = 0; playedRef.current = false; setAttempt(n => n + 1); }} className="mt-2 h-9 px-5 rounded-full bg-white text-black text-xs font-black focusable">إعادة المحاولة</button>
        </div>
      )}
    </div>
  );
}
