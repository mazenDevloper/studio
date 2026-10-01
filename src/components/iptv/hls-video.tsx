"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { cn } from "@/lib/utils";

interface HlsVideoProps {
  src: string;
  className?: string;
  onError?: (msg: string) => void;
}

/** <video> wired to hls.js (native HLS on Safari / smart TVs). Tries sound first, falls back to muted autoplay. */
export function HlsVideo({ src, className, onError }: HlsVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const errorRef = useRef(onError);
  errorRef.current = onError;

  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;
    let hls: Hls | null = null;

    const start = () => {
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    };

    const isHls = /\.m3u8?(\?|$)/i.test(src) || src.includes("m3u8") || /\/live\/[^/]+\/[^/]+\/\d+/.test(src);
    if (isHls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, start);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls?.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls?.recoverMediaError();
        else errorRef.current?.("تعذر تشغيل البث / Stream failed to play");
      });
    } else {
      video.src = src;
      video.addEventListener("loadedmetadata", start, { once: true });
      video.addEventListener("error", () => errorRef.current?.("تعذر تشغيل البث / Stream failed to play"), { once: true });
    }
    return () => {
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [src]);

  return <video ref={ref} controls autoPlay playsInline className={cn("w-full h-full bg-black object-contain", className)} />;
}
