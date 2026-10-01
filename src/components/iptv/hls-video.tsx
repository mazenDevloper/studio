"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { proxiedUrl } from "@/lib/m3u";

interface HlsVideoProps {
  src: string;
  className?: string;
  onError?: (msg: string) => void;
}

const MAX_NETWORK_RETRIES = 3;
const FAIL_MESSAGE = "تعذر تشغيل البث / Stream failed to play";

/**
 * <video> wired to hls.js (native HLS on Safari / smart TVs). Tries sound first, falls back to muted autoplay.
 * http streams on https pages are relayed through /api/hls. Gives up with a message after a few failed retries
 * instead of spinning forever.
 */
export function HlsVideo({ src, className, onError }: HlsVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const errorRef = useRef(onError);
  errorRef.current = onError;
  const [status, setStatus] = useState<"loading" | "playing" | "failed">("loading");

  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;
    setStatus("loading");
    let hls: Hls | null = null;
    let retries = 0;
    let dead = false;
    const fail = () => { if (dead) return; setStatus("failed"); errorRef.current?.(FAIL_MESSAGE); };
    const onPlaying = () => setStatus("playing");
    video.addEventListener("playing", onPlaying);

    const start = () => {
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    };

    const url = proxiedUrl(src);
    const isHls = /\.m3u8?(\?|$)/i.test(src) || src.includes("m3u8") || /\/live\/[^/]+\/[^/]+\/\d+/.test(src);
    // Safety net: nothing playing after 25s means the stream is unreachable.
    const watchdog = setTimeout(() => { if (!video.currentTime && video.paused) fail(); }, 25000);

    if (isHls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, start);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && retries < MAX_NETWORK_RETRIES) { retries++; hls?.startLoad(); }
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && retries < MAX_NETWORK_RETRIES) { retries++; hls?.recoverMediaError(); }
        else fail();
      });
    } else {
      video.src = url;
      video.addEventListener("loadedmetadata", start, { once: true });
      video.addEventListener("error", fail, { once: true });
    }
    return () => {
      dead = true;
      clearTimeout(watchdog);
      video.removeEventListener("playing", onPlaying);
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  return (
    <div className="relative w-full h-full bg-black">
      <video ref={ref} controls autoPlay playsInline className={cn("w-full h-full bg-black object-contain", className)} />
      {status === "loading" && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><Loader2 className="w-10 h-10 animate-spin text-white/60" /></div>}
      {status === "failed" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-center px-6">
          <span className="text-white font-black text-sm">{FAIL_MESSAGE}</span>
          <span className="text-white/50 text-xs">القناة غير متاحة الآن أو الرابط محجوب / channel offline or blocked</span>
        </div>
      )}
    </div>
  );
}
