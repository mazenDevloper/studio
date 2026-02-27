
"use client";

import { useMediaStore } from "@/lib/store";
import { X, Youtube as YoutubeIcon, Minimize2, Bookmark, Monitor, ChevronDown, Play, Pause, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";

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
        "fixed z-[2000] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
        isMinimized 
          ? "bottom-10 left-1/2 -translate-x-1/2 w-[650px] h-28 rounded-full liquid-glass cursor-pointer hover:scale-[1.02] active:scale-95 z-[210] shadow-[0_40px_100px_rgba(0,0,0,0.8)]" 
          : isFullScreen
            ? "inset-0 bg-black flex flex-col"
            : "bottom-12 right-12 w-[65vw] h-[68vh] glass-panel rounded-[3.5rem] bg-black/98"
      )}
      onClick={() => isMinimized && setIsMinimized(false)}
    >
      {/* Player Frame */}
      <div className={cn(
        "absolute inset-0 transition-all duration-700 overflow-hidden rounded-[inherit]",
        isMinimized ? "opacity-0 scale-90 pointer-events-none" : "opacity-100 scale-100"
      )}>
        <div id="youtube-player-element" className="w-full h-full"></div>
      </div>

      {/* Minimized Capsule UI with Bold Fonts & Glass Styling */}
      {isMinimized && activeVideo && (
        <div className="h-full w-full flex items-center justify-between px-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex items-center gap-6 flex-1 min-w-0">
            <div className="relative w-20 h-16 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 border-2 border-white/20">
              <Image src={activeVideo.thumbnail} alt="" fill className="object-cover" />
              {isPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Activity className="w-7 h-7 text-accent animate-pulse" />
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0 text-right">
              <h4 className="text-lg font-black text-white truncate uppercase tracking-tighter font-headline leading-tight">
                {activeVideo.title}
              </h4>
              <span className="text-[11px] text-accent font-black uppercase tracking-[0.4em] mt-1 opacity-90 drop-shadow-md">
                {activeVideo.channelTitle || "Active Transmission"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
              className="w-14 h-14 rounded-full bg-white/10 text-white hover:bg-white/20 focusable border border-white/10"
            >
              {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
            </Button>
            <div className="w-px h-10 bg-white/20" />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { e.stopPropagation(); saveCurrentProgress(); setActiveVideo(null); }}
              className="w-12 h-12 rounded-full bg-red-600/30 text-red-500 hover:bg-red-600 hover:text-white transition-all focusable border border-red-600/20"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>
      )}

      {/* Full Player Controls */}
      {!isMinimized && (
        <div className={cn(
          "fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 z-[2200] transition-all duration-700",
          isFullScreen ? "scale-110" : "scale-100"
        )}>
          <div className="flex items-center gap-4 liquid-glass p-4 rounded-full border border-white/20 shadow-[0_50px_120px_rgba(0,0,0,1)]">
            <Button 
              onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }} 
              className="w-16 h-16 rounded-full bg-white/10 border-white/10 text-white focusable flex flex-col items-center justify-center gap-1"
            >
              <ChevronDown className="w-7 h-7" />
              <span className="text-[9px] font-black uppercase tracking-widest">Pin</span>
            </Button>
            <Button 
              onClick={(e) => { e.stopPropagation(); setIsFullScreen(!isFullScreen); }} 
              className={cn(
                "w-16 h-16 rounded-full border-2 transition-all flex flex-col items-center justify-center gap-1 focusable",
                isFullScreen ? "bg-primary/30 border-primary text-white" : "bg-white/10 border-white/10 text-white"
              )}
            >
              <Monitor className="w-7 h-7" />
              <span className="text-[9px] font-black uppercase tracking-widest">Cinema</span>
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
