
"use client";

import { useMediaStore } from "@/lib/store";
import { X, Monitor, ChevronRight, ChevronLeft, Maximize2, Minimize2, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { SovereignIframe } from "@/components/ui/sovereign-iframe";

/**
 * GlobalVideoPlayer v45.0 - Absolute Floating Engine
 * FIX: All modes (Popup/Minimized) are now Fixed and Floating.
 * ZERO impact on background layout space.
 */
export function GlobalVideoPlayer() {
  const { 
    activeVideo, activeIptv, isMinimized, isFullScreen, nextTrack, prevTrack,
    setActiveVideo, setActiveIptv, setIsMinimized, setIsFullScreen, 
    toggleSaveVideo, savedVideos, setGridMode,
    setIsPlayerControlsExpanded, cyclePlayerMode,
    videoProgress, dockSide
  } = useMediaStore();
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = !!(activeVideo || activeIptv);
  const isSaved = activeVideo ? savedVideos.some(v => v.id === activeVideo.id) : false;
  const isDockLeft = dockSide === 'left';

  const startSeconds = useMemo(() => {
    if (activeVideo?.id && videoProgress[activeVideo.id]) {
      return Math.floor(videoProgress[activeVideo.id]);
    }
    return 0;
  }, [activeVideo, videoProgress]);

  const youtubeUrl = useMemo(() => {
    if (!activeVideo?.id) return "";
    const params = new URLSearchParams({
      autoplay: '1', 
      controls: '1', 
      start: startSeconds.toString(), 
      rel: '0',
      modestbranding: '1', 
      enablejsapi: '1', 
      origin: 'https://www.youtube.com',
      widget_referrer: 'https://www.youtube.com',
      hl: 'ar'
    });
    return `https://www.youtube.com/embed/${activeVideo.id}?${params.toString()}`;
  }, [activeVideo?.id, startSeconds]);

  const handleClose = () => { 
    setActiveVideo(null); 
    setActiveIptv(null); 
    setGridMode('hidden'); 
    setIsPlayerControlsExpanded(false); 
  };

  if (!mounted || !isActive) return null;

  return (
    <>
      {/* 
        FLOATING PLAYER CONTAINER
        Using fixed positioning for ALL non-fullscreen modes.
      */}
      <div className={cn(
        "fixed z-[99999] shadow-[0_0_100px_rgba(0,0,0,0.9)] transition-all duration-500 overflow-hidden pointer-events-auto", 
        isMinimized ? (isDockLeft ? "bottom-8 left-8" : "bottom-8 right-8") + " w-[420px] h-24 rounded-[2rem] premium-glass bg-black/80 border border-white/20" : 
        isFullScreen ? "inset-0 w-full h-full bg-black" : 
        (isDockLeft ? "bottom-12 left-12" : "bottom-12 right-12") + " w-[35vw] h-[40vh] premium-glass rounded-[3.5rem] bg-black/95 border-2 border-white/10"
      )}>
        <div className={cn("absolute inset-0 transition-opacity duration-500", isMinimized ? "opacity-0 pointer-events-none" : "opacity-100")}>
          {activeVideo ? (
            <SovereignIframe src={youtubeUrl} title={activeVideo.title} />
          ) : (
            activeIptv?.url && <SovereignIframe src={activeIptv.url} title={activeIptv.name} />
          )}
        </div>

        {isMinimized && (
          <div className="absolute inset-0 flex items-center justify-between px-6 gap-4 animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/20 bg-zinc-900/40">
              <img src={activeVideo?.thumbnail || activeIptv?.stream_icon} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="flex flex-col flex-1 min-w-0 text-right">
              <span className="text-white font-black text-sm truncate w-full tracking-tighter leading-none">{activeVideo?.title || activeIptv?.name}</span>
              <span className="text-[8px] text-accent font-black uppercase tracking-[0.4em] mt-1">بث سيادي نشط</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsMinimized(false)} className="w-10 h-10 rounded-full bg-primary/20 text-primary border border-primary/20 flex items-center justify-center focusable shadow-glow"><Maximize2 className="w-5 h-5" /></button>
              <button onClick={handleClose} className="w-10 h-10 rounded-full bg-red-600/20 text-red-500 border border-red-600/20 flex items-center justify-center focusable"><X className="w-5 h-5" /></button>
            </div>
          </div>
        )}
      </div>

      {/* DETACHED FLOATING CONTROLS */}
      {!isMinimized && (
        <div className={cn(
          "fixed z-[100000] flex items-center transition-all duration-500", 
          isFullScreen ? (isDockLeft ? "right-10 bottom-10" : "left-10 bottom-10") + " scale-110" : (isDockLeft ? "left-16 bottom-16" : "right-16 bottom-16") + " scale-90"
        )}>
          <div className="flex items-center gap-4 bg-black/80 backdrop-blur-3xl p-3 rounded-full border border-white/20 shadow-[0_0_50px_rgba(0,0,0,1)]">
            <button onClick={handleClose} className="w-10 h-10 rounded-full bg-red-600/20 text-red-500 border border-red-600/20 flex items-center justify-center focusable shadow-glow"><X className="w-5 h-5" /></button>
            <div className="w-px h-7 bg-white/10 mx-1" />
            <button onClick={prevTrack} className="w-9 h-9 rounded-full bg-white/5 text-white/40 flex items-center justify-center focusable hover:bg-white/10"><ChevronRight className="w-5 h-5" /></button>
            <button onClick={nextTrack} className="w-9 h-9 rounded-full bg-white/5 text-white/40 flex items-center justify-center focusable hover:bg-white/10"><ChevronLeft className="w-5 h-5" /></button>
            <div className="w-px h-7 bg-white/10 mx-1" />
            <button onClick={() => activeVideo && toggleSaveVideo(activeVideo)} className={cn("w-9 h-9 rounded-full flex items-center justify-center focusable transition-all", isSaved ? "bg-accent/40 text-accent shadow-glow" : "bg-white/5 text-white/40")}><BookmarkCheck className="w-5 h-5" /></button>
            <button onClick={cyclePlayerMode} className="w-9 h-9 rounded-full bg-white/5 text-white/40 flex items-center justify-center focusable hover:bg-white/10"><Minimize2 className="w-5 h-5" /></button>
            <button onClick={() => setIsFullScreen(!isFullScreen)} className={cn("w-9 h-9 rounded-full flex items-center justify-center focusable transition-all", isFullScreen ? "bg-primary text-white shadow-glow" : "bg-white/5 text-white/40")}><Monitor className="w-5 h-5" /></button>
          </div>
        </div>
      )}
    </>
  );
}
