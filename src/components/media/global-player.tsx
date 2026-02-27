"use client";

import { useMediaStore } from "@/lib/store";
import { X, Youtube as YoutubeIcon, Minimize2, Bookmark, Monitor, ChevronDown, Play, Pause, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { FluidGlass } from "@/components/ui/fluid-glass";

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export function GlobalVideoPlayer() {
  const { 
    activeVideo, 
    isPlaying, 
    isMinimized, 
    isFullScreen,
    videoProgress,
    setActiveVideo, 
    setIsPlaying, 
    setIsMinimized, 
    setIsFullScreen,
    toggleSaveVideo,
    updateVideoProgress,
    savedVideos,
  } = useMediaStore();
  
  const [mounted, setMounted] = useState(false);
  const playerRef = useRef<any>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  useEffect(() => {
    if (!activeVideo || !mounted) return;

    const savedV = savedVideos.find(v => v.id === activeVideo.id);
    const startSeconds = savedV?.progress || videoProgress[activeVideo.id] || 0;

    const initPlayer = () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch(e) {}
      }
      playerRef.current = new window.YT.Player('youtube-player-element', {
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
          origin: window.location.origin,
          vq: 'large'
        },
        events: {
          onReady: (event: any) => {
            if (isPlaying) event.target.playVideo();
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              startProgressTracking();
            } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              stopProgressTracking();
              saveCurrentProgress();
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      stopProgressTracking();
      saveCurrentProgress();
    };
  }, [activeVideo?.id, mounted]);

  useEffect(() => {
    if (playerRef.current && playerRef.current.getPlayerState) {
      const state = playerRef.current.getPlayerState();
      if (isPlaying && state !== 1) {
        playerRef.current.playVideo();
      } else if (!isPlaying && state === 1) {
        playerRef.current.pauseVideo();
      }
    }
  }, [isPlaying]);

  const saveCurrentProgress = () => {
    if (playerRef.current && playerRef.current.getCurrentTime && activeVideo) {
      const currentTime = Math.floor(playerRef.current.getCurrentTime());
      if (currentTime > 0) {
        updateVideoProgress(activeVideo.id, currentTime);
      }
    }
  };

  const startProgressTracking = () => {
    stopProgressTracking();
    progressInterval.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime && activeVideo) {
        const currentTime = Math.floor(playerRef.current.getCurrentTime());
        updateVideoProgress(activeVideo.id, currentTime);
      }
    }, 5000);
  };

  const stopProgressTracking = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  if (!mounted || !activeVideo) return null;

  const isSaved = savedVideos.some(v => v.id === activeVideo.id);

  return (
    <div 
      className={cn(
        "fixed z-[9999] transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]",
        isMinimized 
          ? "bottom-16 left-1/2 -translate-x-1/2 w-[650px] h-32 rounded-[2.5rem] liquid-glass cursor-pointer hover:scale-[1.02] active:scale-95 shadow-[0_40px_100px_rgba(0,0,0,0.9)]" 
          : isFullScreen
            ? "inset-0 bg-black flex flex-col"
            : "w-[65vw] h-[50vh] glass-panel rounded-[3.5rem] bg-black/95 shadow-[0_60px_150px_rgba(0,0,0,1)]"
      )}
      style={!isMinimized && !isFullScreen ? { bottom: '35rem', left: '5rem' } : {}}
      onClick={() => isMinimized && setIsFullScreen(true)}
    >
      <FluidGlass scale={isMinimized ? 1.5 : 2} className="opacity-20" />

      <div className={cn(
        "absolute inset-0 transition-all duration-700 overflow-hidden rounded-[inherit]",
        isMinimized ? "opacity-0 scale-90 pointer-events-none" : "opacity-100 scale-100"
      )}>
        <div id="youtube-player-element" className="w-full h-full"></div>
      </div>

      {isMinimized && activeVideo && (
        <div className="h-full w-full flex items-center justify-between px-10 animate-in fade-in zoom-in-95 duration-700 relative z-10">
          <div className="flex items-center gap-6 flex-1 min-w-0">
            <div className="relative w-28 h-20 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 border-2 border-white/30">
              <Image src={activeVideo.thumbnail} alt="" fill className="object-cover" />
              {isPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Activity className="w-8 h-8 text-accent animate-pulse" />
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0 text-right">
              <h4 className="text-xl font-black text-white truncate uppercase tracking-tighter font-headline leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,1)]">
                {activeVideo.title}
              </h4>
              <span className="text-[12px] text-accent font-black uppercase tracking-[0.4em] mt-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                {activeVideo.channelTitle || "إرسال نشط"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
              className="w-16 h-16 rounded-full bg-white/15 text-white hover:bg-white/30 focusable border-2 border-white/20"
            >
              {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
            </Button>
            <div className="w-px h-12 bg-white/30" />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { e.stopPropagation(); saveCurrentProgress(); setActiveVideo(null); }}
              className="w-14 h-14 rounded-full bg-red-600/40 text-red-500 hover:bg-red-600 hover:text-white transition-all focusable border-2 border-red-600/30"
            >
              <X className="w-8 h-8" />
            </Button>
          </div>
        </div>
      )}

      {!isMinimized && (
        <div className={cn(
          "fixed bottom-32 left-1/2 -translate-x-1/2 flex items-center gap-6 z-[5200] transition-all duration-1000",
          isFullScreen ? "scale-110" : "scale-100"
        )}>
          <div className="flex items-center gap-4 liquid-glass p-5 rounded-full border-2 border-white/20 shadow-[0_50px_120px_rgba(0,0,0,1)]">
            <Button 
              onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }} 
              className="w-16 h-16 rounded-full bg-white/10 border border-white/10 text-white focusable flex flex-col items-center justify-center gap-1"
            >
              <ChevronDown className="w-7 h-7" />
              <span className="text-[9px] font-black uppercase tracking-widest">تصغير</span>
            </Button>
            <Button 
              onClick={(e) => { e.stopPropagation(); setIsFullScreen(!isFullScreen); }} 
              className={cn(
                "w-16 h-16 rounded-full border-2 transition-all flex flex-col items-center justify-center gap-1 focusable",
                isFullScreen ? "bg-primary/30 border-primary text-white" : "bg-white/10 border-white/10 text-white"
              )}
            >
              <Monitor className="w-7 h-7" />
              <span className="text-[9px] font-black uppercase tracking-widest">سينما</span>
            </Button>
            <Button 
              onClick={(e) => { e.stopPropagation(); toggleSaveVideo(activeVideo); }}
              className={cn("w-16 h-16 rounded-full border-2 transition-all focusable", isSaved ? "bg-accent/30 border-accent text-accent" : "bg-white/10 border-white/10 text-white")}
            >
              <Bookmark className={cn("w-7 h-7", isSaved && "fill-current")} />
            </Button>
            <div className="w-px h-12 bg-white/20 mx-2" />
            <Button 
              variant="destructive" 
              size="icon" 
              onClick={(e) => { e.stopPropagation(); saveCurrentProgress(); setActiveVideo(null); }} 
              className="w-16 h-16 rounded-full shadow-3xl focusable border-2 border-red-500/20"
            >
              <X className="w-9 h-9" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}