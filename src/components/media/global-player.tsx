
"use client";

import { useMediaStore } from "@/lib/store";
import { X, Minimize2, Bookmark, Monitor, ChevronDown, Play, Pause, Tv, List, ChevronRight, ChevronLeft, Youtube, Activity, Eye, EyeOff, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { fetchChannelDetails } from "@/lib/youtube";

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

  // Media Session API - Core for Background Audio
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
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (activeIptv) nextIptvChannel(); else nextTrack();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (activeIptv) prevIptvChannel(); else prevTrack();
      });
    }
  }, [activeVideo, activeIptv, setIsPlaying, nextTrack, nextIptvChannel, prevIptvChannel]);

  // Key Binding: 1 for Prev, 3 for Next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeVideo && !activeIptv) return;
      if (e.key === "3") {
        e.preventDefault();
        if (activeIptv) nextIptvChannel(); else nextTrack();
      } else if (e.key === "1") {
        e.preventDefault();
        if (activeIptv) prevIptvChannel(); else prevTrack();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeVideo, activeIptv, nextTrack, nextIptvChannel, prevIptvChannel]);

  const initYouTubePlayer = useCallback((videoId: string) => {
    if (!containerRef.current) return;
    
    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      try {
        playerRef.current.loadVideoById({
          videoId: videoId,
          startSeconds: Math.floor(videoProgress[videoId] || 0)
        });
        return;
      } catch (e) {
        console.warn("YouTube loadVideoById failed, falling back to clean init");
      }
    }

    containerRef.current.innerHTML = '<div id="youtube-source-element"></div>';
    playerRef.current = new (window as any).YT.Player('youtube-source-element', {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        iv_load_policy: 3,
        start: Math.floor(videoProgress[videoId] || 0),
        enablejsapi: 1,
        origin: typeof window !== 'undefined' ? window.location.origin : ''
      },
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
      if ((window as any).YT && (window as any).YT.Player) {
        initYouTubePlayer(activeVideo.id);
      } else {
        (window as any).onYouTubeIframeAPIReady = () => initYouTubePlayer(activeVideo.id);
      }
    } else {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch(e) {}
        playerRef.current = null;
      }
    }
  }, [activeVideo?.id, activeIptv, mounted, initYouTubePlayer]);

  if (!mounted || (!activeVideo && !activeIptv)) return null;

  const handleAddToIptv = async () => {
    if (!activeVideo) return;
    const details = await fetchChannelDetails(activeVideo.channelId!);
    toggleFavoriteIptvChannel({
      stream_id: activeVideo.id,
      name: details?.name || activeVideo.channelTitle || activeVideo.title,
      stream_icon: details?.image || activeVideo.thumbnail,
      category_id: "direct",
      url: `https://www.youtube.com/embed/${activeVideo.id}`,
      type: "web",
      starred: true
    });
  };

  return (
    <div 
      className={cn(
        "fixed z-[9999] transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-2xl overflow-hidden",
        isMinimized 
          ? "bottom-12 left-1/2 -translate-x-1/2 w-[500px] h-28 rounded-[2.5rem] liquid-glass" 
          : isFullScreen
            ? "inset-0 w-full h-full bg-black rounded-0"
            : "bottom-8 right-4 w-[50vw] h-[55vh] glass-panel rounded-[3.5rem] bg-black/95"
      )}
      style={{
        transform: 'translate3d(0,0,0)', 
        willChange: 'transform',
        contain: 'layout paint'
      }}
    >
      <div 
        className={cn("absolute inset-0 transition-opacity duration-700", isMinimized ? "opacity-0" : "opacity-100")}
        style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
      >
        {activeVideo ? (
          <div key={activeVideo.id} ref={containerRef} className="w-full h-full" style={{ background: '#000' }} />
        ) : (
          <iframe 
            key={activeIptv?.stream_id}
            src={`${activeIptv?.url}${activeIptv?.url?.includes('?') ? '&' : '?'}autoplay=1&mute=0`}
            className="w-full h-full border-none"
            allow="autoplay; fullscreen"
            sandbox="allow-forms allow-scripts allow-same-origin"
            style={{ background: '#000' }}
          />
        )}
      </div>

      {!isMinimized && (
        <div className={cn(
          "absolute top-0 left-0 right-0 p-8 z-[5100] transition-all duration-700",
          isFullScreen ? "bg-gradient-to-b from-black/80 to-transparent" : "bg-gradient-to-b from-black/40 to-transparent"
        )}>
          <div className="flex items-center gap-4 text-right dir-rtl">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center border",
              activeIptv ? "bg-emerald-500/20 border-emerald-500/20" : "bg-red-500/20 border-red-500/20"
            )}>
              {activeIptv ? <Tv className="w-6 h-6 text-emerald-500" /> : <Youtube className="w-6 h-6 text-red-500" />}
            </div>
            <div className="flex flex-col">
              <h2 className={cn(
                "font-black text-white truncate drop-shadow-xl font-headline",
                isFullScreen ? "text-2xl" : "text-lg"
              )}>
                {activeVideo?.title || activeIptv?.name}
              </h2>
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-[0.3em]">
                {activeIptv ? "Premium Live Feed" : "YouTube Direct Signal"}
              </span>
            </div>
          </div>
        </div>
      )}

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
            {activeIptv && (
              <>
                <button onClick={(e) => { e.stopPropagation(); prevIptvChannel(); }} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 focusable"><ChevronRight className="w-5 h-5" /></button>
                <button onClick={(e) => { e.stopPropagation(); nextIptvChannel(); }} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 focusable"><ChevronLeft className="w-5 h-5" /></button>
              </>
            )}
            <button onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 focusable">{isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}</button>
            <button onClick={(e) => { e.stopPropagation(); setActiveVideo(null); setActiveIptv(null); }} className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center focusable"><X className="w-5 h-5" /></button>
          </div>
        </div>
      )}

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
              <button 
                onClick={() => setIsControlsExpanded(true)} 
                className="w-12 h-12 rounded-full bg-primary shadow-glow text-white flex items-center justify-center focusable"
              >
                <Settings className="w-7 h-7 animate-spin-slow" />
              </button>
            ) : (
              <>
                <button 
                  onClick={() => setIsControlsExpanded(false)} 
                  className="w-12 h-12 rounded-full bg-white/10 text-white/40 flex items-center justify-center focusable"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                
                {activeIptv && (
                  <>
                    <button onClick={prevIptvChannel} title="Previous Channel" className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center focusable"><ChevronRight className="w-6 h-6" /></button>
                    <button onClick={nextIptvChannel} title="Next Channel" className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center focusable"><ChevronLeft className="w-6 h-6" /></button>
                    <div className="w-px h-8 bg-white/20 mx-1" />
                  </>
                )}
                
                <button onClick={toggleShowIslands} title={showIslands ? "Hide Islands" : "Show Islands"} className={cn("w-12 h-12 rounded-full flex items-center justify-center focusable transition-all", showIslands ? "bg-accent/20 text-accent border-accent/20" : "bg-white/5 text-white/40 border-white/10")}>
                  {showIslands ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>

                <button onClick={() => setIsMinimized(true)} title="Minimize" className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center focusable"><ChevronDown className="w-5 h-5" /></button>
                <button onClick={() => setIsFullScreen(!isFullScreen)} title="Cinema Mode" className={cn("w-12 h-12 rounded-full flex items-center justify-center focusable", isFullScreen && "bg-primary border-primary")}><Monitor className="w-5 h-5" /></button>
                {activeVideo && (
                  <>
                    <button onClick={handleAddToIptv} title="Add to IPTV" className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center focusable"><Tv className="w-5 h-5 text-emerald-400" /></button>
                    <button onClick={() => toggleSaveVideo(activeVideo!)} title="Bookmark" className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center focusable"><Bookmark className={cn("w-5 h-5", savedVideos.some(v => v.id === activeVideo?.id) && "fill-current text-primary")} /></button>
                  </>
                )}
                <button onClick={() => router.push('/iptv')} title="IPTV Library" className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center focusable"><List className="w-5 h-5" /></button>
                <div className="w-px h-8 bg-white/20 mx-1" />
                <button onClick={() => { setActiveVideo(null); setActiveIptv(null); }} title="Close Player" className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center focusable"><X className="w-5 h-5" /></button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
