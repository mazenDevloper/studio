
"use client";

import { useMediaStore } from "@/lib/store";
import { X, Minimize2, Bookmark, Monitor, ChevronDown, Play, Pause, Tv, FileType } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Hls from "hls.js";

/**
 * GlobalVideoPlayer - Highly specialized IPTV & YouTube Hybrid Engine.
 * Optimized for automotive environment with robust stream handling and format switching.
 */
export function GlobalVideoPlayer() {
  const { 
    activeVideo, 
    activeIptv,
    isPlaying, 
    isMinimized, 
    isFullScreen,
    videoProgress,
    iptvFormat,
    setActiveVideo, 
    setActiveIptv,
    setIsPlaying, 
    setIsMinimized, 
    setIsFullScreen,
    toggleSaveVideo,
    setIptvFormat,
    savedVideos,
  } = useMediaStore();
  
  const [mounted, setMounted] = useState(false);
  const playerRef = useRef<any>(null);
  const videoTagRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    setMounted(true);
    // Load YouTube API if not present
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (e) {}
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, []);

  // Specialized YouTube Logic
  useEffect(() => {
    if (!activeVideo || !mounted || activeIptv) return;
    const startSeconds = videoProgress[activeVideo.id] || 0;

    const initPlayer = () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch(e) {}
      }
      playerRef.current = new (window as any).YT.Player('youtube-player-element', {
        height: '100%',
        width: '100%',
        videoId: activeVideo.id,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          start: Math.floor(startSeconds),
          enablejsapi: 1,
          origin: window.location.origin
        },
        events: {
          onStateChange: (event: any) => {
            if (event.data === 1) setIsPlaying(true);
            else if (event.data === 2) setIsPlaying(false);
          },
          onError: (e: any) => {
            console.error("YouTube Player Error:", e);
          }
        }
      });
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }
  }, [activeVideo?.id, mounted, activeIptv]);

  // Specialized IPTV Engine - Multi-format HLS.js Integration
  useEffect(() => {
    if (activeIptv && videoTagRef.current) {
      const extension = iptvFormat === 'm3u8' ? 'm3u8' : 'ts';
      const iptvUrl = `http://ban.programing-services.com:2095/live/W87d737/Pd37qj34/${activeIptv.stream_id}.${extension}`;

      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const video = videoTagRef.current;

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          manifestLoadingMaxRetry: 10,
        });
        
        hls.loadSource(iptvUrl);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(e => console.warn("Auto-play blocked", e));
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Fallback for Safari/Native HLS
        video.src = iptvUrl;
        video.onloadedmetadata = () => {
          video.play().catch(e => console.warn("Native auto-play blocked", e));
        };
      } else {
        // Direct source for other formats (.ts)
        video.src = iptvUrl;
        video.load();
        video.play().catch(e => console.warn("Direct source auto-play blocked", e));
      }
    }
  }, [activeIptv?.stream_id, iptvFormat]);

  if (!mounted || (!activeVideo && !activeIptv)) return null;

  const isSaved = activeVideo ? savedVideos.some(v => v.id === activeVideo.id) : false;
  const extension = iptvFormat === 'm3u8' ? 'm3u8' : 'ts';

  return (
    <div 
      className={cn(
        "fixed z-[9999] transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-2xl",
        isMinimized 
          ? "bottom-12 left-1/2 -translate-x-1/2 w-[500px] h-28 rounded-[2.5rem] liquid-glass cursor-pointer" 
          : isFullScreen
            ? "inset-0 w-full h-full bg-black"
            : "bottom-8 right-4 w-[50vw] h-[55vh] glass-panel rounded-[3.5rem] bg-black/95 left-auto translate-x-0"
      )}
      style={{ position: 'fixed' }}
      onClick={() => isMinimized && setIsFullScreen(true)}
    >
      <div className={cn(
        "absolute inset-0 transition-all duration-700 overflow-hidden rounded-[inherit]",
        isMinimized ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        {activeVideo && !activeIptv ? (
          <div id="youtube-player-element" className="w-full h-full bg-black"></div>
        ) : activeIptv ? (
          <div className="w-full h-full relative bg-black">
            <video 
              ref={videoTagRef}
              autoPlay
              controls
              className="w-full h-full object-contain"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            {/* Context Overlay for IPTV Info */}
            <div className="absolute top-8 right-8 bg-black/60 backdrop-blur-3xl px-6 py-3 rounded-full border border-white/10 pointer-events-none animate-in fade-in duration-1000">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
                <span className="text-xs font-black text-white uppercase tracking-widest">{activeIptv.name}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {isMinimized && (
        <div className="h-full w-full flex items-center justify-between px-8 relative z-10">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="relative w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 bg-zinc-900 shadow-xl">
              {activeVideo ? (
                <Image src={activeVideo.thumbnail} alt="" fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-800"><Tv className="w-6 h-6 text-emerald-500" /></div>
              )}
            </div>
            <div className="flex flex-col min-w-0 text-right">
              <h4 className="text-base font-black text-white truncate">{activeVideo?.title || activeIptv?.name}</h4>
              <span className="text-[9px] text-accent font-black uppercase tracking-widest">
                {activeVideo ? activeVideo.channelTitle : `IPTV Transmission (${extension.toUpperCase()})`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/10 focusable">
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); setActiveVideo(null); setActiveIptv(null); }} className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg focusable">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {!isMinimized && (
        <div className={cn(
          "fixed bottom-12 z-[5200] flex items-center gap-4",
          isFullScreen ? "left-1/2 -translate-x-1/2" : "right-12"
        )}>
          <div className="flex items-center gap-3 liquid-glass p-4 rounded-full border-2 border-white/20 shadow-2xl">
            {activeIptv && (
              <button 
                onClick={(e) => { e.stopPropagation(); setIptvFormat(iptvFormat === 'ts' ? 'm3u8' : 'ts'); }} 
                className={cn(
                  "w-14 h-14 rounded-full border-2 transition-all flex flex-col items-center justify-center focusable",
                  iptvFormat === 'm3u8' ? "bg-emerald-600 border-emerald-400 shadow-[0_0_20px_#10b981]" : "bg-white/10 border-white/10"
                )}
                title="Format Switch (TS/M3U8)"
              >
                <FileType className="w-5 h-5 text-white" />
                <span className="text-[8px] font-black text-white">{iptvFormat.toUpperCase()}</span>
              </button>
            )}
            <button onClick={() => setIsMinimized(true)} className="w-14 h-14 rounded-full bg-white/10 border border-white/10 text-white flex items-center justify-center focusable"><ChevronDown className="w-6 h-6" /></button>
            <button onClick={() => setIsFullScreen(!isFullScreen)} className={cn("w-14 h-14 rounded-full border-2 transition-all flex items-center justify-center focusable", isFullScreen ? "bg-primary border-primary" : "bg-white/10 border-white/10")}><Monitor className="w-6 h-6" /></button>
            {activeVideo && (
              <button onClick={() => toggleSaveVideo(activeVideo)} className={cn("w-14 h-14 rounded-full border-2 transition-all flex items-center justify-center focusable", isSaved ? "bg-accent border-accent" : "bg-white/10 border-white/10")}><Bookmark className={cn("w-6 h-6", isSaved && "fill-current")} /></button>
            )}
            <div className="w-px h-10 bg-white/20 mx-1" />
            <button onClick={() => { setActiveVideo(null); setActiveIptv(null); }} className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center focusable shadow-2xl"><X className="w-7 h-7" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
