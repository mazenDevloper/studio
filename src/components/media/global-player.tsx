"use client";

import { useMediaStore } from "@/lib/store";
import { X, Bookmark, Monitor, ChevronDown, Play, Pause, Tv, List, ChevronRight, ChevronLeft, Youtube, Eye, EyeOff, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetchChannelDetails } from "@/lib/youtube";

/**
 * GlobalVideoPlayer - optimized for "Native Performance" using CSS containment and GPU isolation.
 */
export function GlobalVideoPlayer() {
  const router = useRouter();
  const { 
    activeVideo, 
    activeIptv,
    isPlaying, 
    isMinimized, 
    isFullScreen,
    videoProgress,
    nextTrack,
    nextIptvChannel,
    prevIptvChannel,
    setActiveVideo, 
    setActiveIptv,
    setIsPlaying, 
    setIsMinimized, 
    setIsFullScreen,
    toggleSaveVideo,
    savedVideos,
    toggleFavoriteIptvChannel,
    showIslands,
    toggleShowIslands
  } = useMediaStore();
  
  const [mounted, setMounted] = useState(false);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
  }, []);

  // Background Audio Support via Media Session API
  useEffect(() => {
    if ('mediaSession' in navigator && (activeVideo || activeIptv)) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: activeVideo?.title || activeIptv?.name || "DriveCast Media",
        artist: activeVideo?.channelTitle || "Premium Stream",
        artwork: [
          { src: activeVideo?.thumbnail || activeIptv?.stream_icon || "", sizes: '512x512', type: 'image/jpeg' }
        ]
      });
      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('nexttrack', () => activeIptv ? nextIptvChannel() : nextTrack());
      navigator.mediaSession.setActionHandler('previoustrack', () => activeIptv ? prevIptvChannel() : prevTrack());
    }
  }, [activeVideo, activeIptv, setIsPlaying, nextTrack, nextIptvChannel, prevIptvChannel]);

  // Key Bindings: 1 for Previous, 3 for Next (CH+/CH-)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeVideo && !activeIptv) return;
      if (e.key === "3") { e.preventDefault(); activeIptv ? nextIptvChannel() : nextTrack(); }
      else if (e.key === "1") { e.preventDefault(); activeIptv ? prevIptvChannel() : prevTrack(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeVideo, activeIptv, nextTrack, nextIptvChannel, prevIptvChannel]);

  const initYouTubePlayer = useCallback((videoId: string) => {
    if (!containerRef.current) return;
    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      try {
        playerRef.current.loadVideoById({ videoId, startSeconds: Math.floor(videoProgress[videoId] || 0) });
        return;
      } catch (e) {}
    }
    containerRef.current.innerHTML = '<div id="youtube-source-element"></div>';
    playerRef.current = new (window as any).YT.Player('youtube-source-element', {
      height: '100%', width: '100%', videoId,
      playerVars: { autoplay: 1, controls: 1, modestbranding: 1, rel: 0, playsinline: 1, iv_load_policy: 3, start: Math.floor(videoProgress[videoId] || 0), enablejsapi: 1, origin: window.location.origin },
      events: {
        onReady: (event: any) => event.target.playVideo(),
        onStateChange: (event: any) => {
          if (event.data === (window as any).YT.PlayerState.PLAYING) setIsPlaying(true);
          else if (event.data === (window as any).YT.PlayerState.PAUSED) setIsPlaying(false);
          else if (event.data === (window as any).YT.PlayerState.ENDED) nextTrack();
        },
      }
    });
  }, [videoProgress, setIsPlaying, nextTrack]);

  useEffect(() => {
    if (!mounted) return;
    if (activeVideo) {
      if ((window as any).YT && (window as any).YT.Player) initYouTubePlayer(activeVideo.id);
      else (window as any).onYouTubeIframeAPIReady = () => initYouTubePlayer(activeVideo.id);
    } else {
      if (playerRef.current) { try { playerRef.current.destroy(); } catch(e) {} playerRef.current = null; }
    }
  }, [activeVideo?.id, activeIptv, mounted, initYouTubePlayer]);

  if (!mounted || (!activeVideo && !activeIptv)) return null;

  return (
    <div className={cn(
      "fixed z-[9999] transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-2xl overflow-hidden",
      isMinimized ? "bottom-12 left-1/2 -translate-x-1/2 w-[500px] h-28 rounded-[2.5rem] liquid-glass" : 
      isFullScreen ? "inset-0 w-full h-full bg-black rounded-0" : "bottom-8 right-4 w-[50vw] h-[55vh] glass-panel rounded-[3.5rem] bg-black/95"
    )} style={{ transform: 'translate3d(0,0,0)', willChange: 'transform', contain: 'layout paint' }}>
      
      <div className={cn("absolute inset-0 transition-opacity duration-700", isMinimized ? "opacity-0" : "opacity-100")} style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
        {activeVideo ? <div key={activeVideo.id} ref={containerRef} className="w-full h-full" style={{ background: '#000' }} /> : 
        <iframe key={activeIptv?.stream_id} src={`${activeIptv?.url}${activeIptv?.url?.includes('?') ? '&' : '?'}autoplay=1&mute=0`} className="w-full h-full border-none" allow="autoplay; fullscreen" sandbox="allow-forms allow-scripts allow-same-origin" style={{ background: '#000' }} />}
      </div>

      {isMinimized && (
        <div className="h-full flex items-center justify-between px-8 relative z-10" onClick={() => setIsFullScreen(true)}>
          <div className="flex items-center gap-4 flex-1 min-w-0 text-right">
            <div className="relative w-20 h-14 rounded-xl overflow-hidden border border-white/10 bg-zinc-900">
              <Image src={activeVideo?.thumbnail || activeIptv?.stream_icon || ""} alt="" fill className="object-cover" />
            </div>
            <div className="flex flex-col">
              <h4 className="text-base font-black text-white truncate max-w-[200px]">{activeVideo?.title || activeIptv?.name}</h4>
              <span className="text-[9px] text-accent font-black uppercase">Capsule Feed</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10">{isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}</button>
            <button onClick={(e) => { e.stopPropagation(); setActiveVideo(null); setActiveIptv(null); }} className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      {/* Optimized Floating Collapsible Controls */}
      {!isMinimized && (
        <div className={cn(
          "fixed z-[5200] flex items-center transition-all duration-500",
          isFullScreen ? "left-10 bottom-10 scale-150 origin-bottom-left" : "right-12 bottom-12 scale-90"
        )}>
          <div className={cn(
            "flex items-center transition-all duration-700 liquid-glass p-2 rounded-full border border-white/20 shadow-2xl overflow-hidden backdrop-blur-3xl",
            isControlsExpanded ? "gap-2 px-3" : "w-16 h-16 justify-center"
          )}>
            {!isControlsExpanded ? (
              <button onClick={() => setIsControlsExpanded(true)} className="w-12 h-12 rounded-full bg-primary shadow-glow text-white flex items-center justify-center focusable">
                <Settings className="w-7 h-7 animate-spin-slow" />
              </button>
            ) : (
              <>
                <button onClick={() => setIsControlsExpanded(false)} className="w-12 h-12 rounded-full bg-white/10 text-white/40 flex items-center justify-center focusable"><ChevronRight className="w-6 h-6" /></button>
                {activeIptv && (
                  <>
                    <button onClick={prevIptvChannel} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center focusable"><ChevronRight className="w-6 h-6" /></button>
                    <button onClick={nextIptvChannel} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center focusable"><ChevronLeft className="w-6 h-6" /></button>
                    <div className="w-px h-8 bg-white/20 mx-1" />
                  </>
                )}
                <button onClick={toggleShowIslands} className={cn("w-12 h-12 rounded-full flex items-center justify-center focusable", showIslands ? "bg-accent/20 text-accent" : "bg-white/5 text-white/40")}>{showIslands ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}</button>
                <button onClick={() => setIsMinimized(true)} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center focusable"><ChevronDown className="w-5 h-5" /></button>
                <button onClick={() => setIsFullScreen(!isFullScreen)} className={cn("w-12 h-12 rounded-full flex items-center justify-center focusable", isFullScreen && "bg-primary")}><Monitor className="w-5 h-5" /></button>
                <button onClick={() => { setActiveVideo(null); setActiveIptv(null); }} className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center focusable"><X className="w-5 h-5" /></button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
