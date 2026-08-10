
"use client";

import { useMediaStore } from "@/lib/store";
import { X, Monitor, ChevronRight, ChevronLeft, Maximize2, Minimize2, BookmarkCheck, RefreshCw, Send, Globe, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { SovereignIframe } from "@/components/ui/sovereign-iframe";
import { Input } from "@/components/ui/input";

/**
 * GlobalVideoPlayer v210.0 - Sovereign Centered Precision
 * Features: Bottom-0, Scale 95, and Hyper-Targeted Navigation.
 */
export function GlobalVideoPlayer() {
  const { 
    activeVideo, activeIptv, isMinimized, isFullScreen, nextTrack, prevTrack,
    setActiveVideo, setActiveIptv, setIsMinimized, setIsFullScreen, 
    toggleSaveVideo, savedVideos, setGridMode,
    isPlayerControlsExpanded, setIsPlayerControlsExpanded, cyclePlayerMode,
    videoProgress, dockSide
  } = useMediaStore();
  
  const [mounted, setMounted] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [urlInput, setUrlInput] = useState("https://online.aflam4you.net/top-videos.html");

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = !!(activeVideo || activeIptv);
  const isSaved = activeVideo ? savedVideos.some(v => v.id === activeVideo.id) : false;
  const isWebType = activeIptv?.type === 'web' || !!activeIptv;

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
      mute: '0',
      controls: '1', 
      start: startSeconds.toString(), 
      rel: '0',
      modestbranding: '1', 
      enablejsapi: '1', 
      origin: typeof window !== 'undefined' ? window.location.origin : '',
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

  const reloadIframe = () => setIframeKey(p => p + 1);

  const handlePutToIframe = () => {
    if (!urlInput.trim()) return;
    let target = urlInput.trim();
    if (!target.startsWith('http')) target = 'https://' + target;
    
    setActiveIptv({
      stream_id: "injected-" + Date.now(),
      name: "رابط خارجي",
      stream_icon: "https://www.google.com/s2/favicons?sz=64&domain=" + target,
      category_id: "direct",
      url: target,
      type: 'web'
    });
  };

  if (!mounted || !isActive) return null;

  return (
    <>
      <div className={cn(
        "fixed z-[99999] shadow-[0_0_80px_rgba(0,0,0,0.5)] transition-all duration-500 overflow-hidden pointer-events-auto", 
        isMinimized ? (dockSide === 'left' ? "bottom-8 left-8" : "bottom-8 right-8") + " w-[420px] h-24 rounded-[2.5rem] premium-glass bg-black/80 border border-white/20" : 
        isFullScreen ? "inset-0 w-full h-full bg-black" : 
        "bottom-12 left-1/2 -translate-x-1/2 w-[55vw] h-[60vh] premium-glass rounded-[3.5rem] bg-black/95 border-2 border-white/10"
      )}>
        <div className={cn("absolute inset-0 transition-opacity duration-500", isMinimized ? "opacity-0 pointer-events-none" : "opacity-100")}>
          {activeVideo ? (
            <SovereignIframe key={`yt-${activeVideo.id}-${iframeKey}`} src={youtubeUrl} title={activeVideo.title} />
          ) : (
            activeIptv?.url && <SovereignIframe key={`web-${activeIptv.stream_id}-${iframeKey}`} src={activeIptv.url} title={activeIptv.name} />
          )}
        </div>

        {isMinimized && (
          <div className="absolute inset-0 flex items-center justify-between px-8 gap-6 animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/20 bg-zinc-900/40 shadow-glow">
              <img src={activeVideo?.thumbnail || activeIptv?.stream_icon} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="flex flex-col flex-1 min-w-0 text-right">
              <span className="text-white font-black text-sm truncate w-full tracking-tighter leading-none">{activeVideo?.title || activeIptv?.name}</span>
              <span className="text-[8px] text-accent font-black uppercase tracking-[0.4em] mt-1.5">بث سيادي نشط</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsMinimized(false)} className="w-10 h-10 rounded-full bg-primary/20 text-primary border border-primary/20 flex items-center justify-center focusable shadow-glow"><Maximize2 className="w-5 h-5" /></button>
              <button onClick={handleClose} className="w-10 h-10 rounded-full bg-red-600/20 text-red-500 border border-red-600/20 flex items-center justify-center focusable"><X className="w-5 h-5" /></button>
            </div>
          </div>
        )}
      </div>

      {!isMinimized && (
        <div className={cn(
          "fixed z-[100000] flex items-center transition-all duration-500 left-1/2 -translate-x-1/2 bottom-4 scale-95 origin-bottom"
        )}>
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-3xl p-2 rounded-full border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
            <button onClick={handleClose} className="w-9 h-9 rounded-full bg-red-600/20 text-red-500 border border-red-600/20 flex items-center justify-center focusable shadow-glow"><X className="w-5 h-5" /></button>
            <div className="w-px h-6 bg-white/20 mx-0.5" />
            
            {isPlayerControlsExpanded && (
              <div className="flex items-center gap-3 animate-in slide-in-from-left-4 duration-300">
                {isWebType && (
                  <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 h-10 border border-white/10 group focus-within:border-emerald-500/40 focus-within:bg-white/10 transition-all">
                    <Globe className="w-4 h-4 text-white/20 group-focus-within:text-emerald-400" />
                    <Input 
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePutToIframe()}
                      placeholder="URL..."
                      className="bg-transparent border-none text-[10px] font-bold text-white p-0 h-full w-40 focus-visible:ring-0 placeholder:text-white/10"
                    />
                    <button 
                      onClick={handlePutToIframe}
                      className="w-7 h-7 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/40 transition-all shadow-glow"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="w-px h-6 bg-white/20 mx-0.5" />

                {isWebType && (
                  <button onClick={reloadIframe} className="w-10 h-10 rounded-full bg-white/10 text-emerald-400 flex items-center justify-center focusable hover:bg-emerald-500/20 shadow-glow" title="تنشيط الصوت / Unmute"><Volume2 className="w-5 h-5" /></button>
                )}
                {!isWebType && (
                  <>
                    <button onClick={prevTrack} className="w-9 h-9 rounded-full bg-white/5 text-white/40 flex items-center justify-center focusable hover:bg-white/10"><ChevronRight className="w-5 h-5" /></button>
                    <button onClick={nextTrack} className="w-9 h-9 rounded-full bg-white/5 text-white/40 flex items-center justify-center focusable hover:bg-white/10"><ChevronLeft className="w-5 h-5" /></button>
                  </>
                )}
                <div className="w-px h-6 bg-white/20 mx-0.5" />
                <button onClick={() => activeVideo && toggleSaveVideo(activeVideo)} className={cn("w-9 h-9 rounded-full flex items-center justify-center focusable transition-all", isSaved ? "bg-accent/40 text-accent shadow-glow" : "bg-white/5 text-white/40")}><BookmarkCheck className="w-5 h-5" /></button>
                <button onClick={cyclePlayerMode} className="w-9 h-9 rounded-full bg-white/5 text-white/40 flex items-center justify-center focusable hover:bg-white/10"><Maximize2 className="w-5 h-5" /></button>
                <button onClick={() => setIsFullScreen(!isFullScreen)} className={cn("w-9 h-9 rounded-full flex items-center justify-center focusable transition-all", isFullScreen ? "bg-primary text-white shadow-glow" : "bg-white/5 text-white/40")}><Monitor className="w-5 h-5" /></button>
              </div>
            )}

            <button 
              onClick={() => setIsPlayerControlsExpanded(!isPlayerControlsExpanded)} 
              className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center focusable shadow-glow"
            >
              {isPlayerControlsExpanded ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
