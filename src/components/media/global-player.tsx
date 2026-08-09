
"use client";

import { useMediaStore } from "@/lib/store";
import { X, Monitor, ChevronRight, ChevronLeft, Maximize2, Minimize2, BookmarkCheck, RefreshCw, Send, Globe, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { SovereignIframe } from "@/components/ui/sovereign-iframe";
import { Input } from "@/components/ui/input";

/**
 * GlobalVideoPlayer v160.0 - Sovereign Ultra-Compact & Light Shadow
 * Features: Absolute Transparency, Reduced Black Shadow, and Smart URL Auto-Fill.
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
  const isDockLeft = dockSide === 'left';
  const isWebType = activeIptv?.type === 'web' || !!activeIptv;

  const startSeconds = useMemo(() => {
    if (activeVideo?.id && videoProgress[activeVideo.id]) {
      return Math.floor(videoProgress[activeVideo.id]);
    }
    return 0;
  }, [activeVideo, videoProgress]);

  // YouTube Params with mute=0 to ensure sound
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
      widget_referrer: typeof window !== 'undefined' ? window.location.origin : '',
      hl: 'ar'
    });
    return `https://www.youtube.com/embed/${activeVideo.id}?${params.toString()}`;
  }, [activeVideo?.id, startSeconds, mounted]);

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
        "fixed z-[99999] shadow-[0_0_40px_rgba(0,0,0,0.4)] transition-all duration-500 overflow-hidden pointer-events-auto", 
        isMinimized ? (isDockLeft ? "bottom-8 left-8" : "bottom-8 right-8") + " w-[380px] h-20 rounded-[2rem] premium-glass bg-black/80 border border-white/20" : 
        isFullScreen ? "inset-0 w-full h-full bg-black" : 
        (isDockLeft ? "bottom-12 left-12" : "bottom-12 right-12") + " w-[55vw] h-[60vh] premium-glass rounded-[3.5rem] bg-black/95 border-2 border-white/10"
      )}>
        <div className={cn("absolute inset-0 transition-opacity duration-500", isMinimized ? "opacity-0 pointer-events-none" : "opacity-100")}>
          {activeVideo ? (
            <SovereignIframe key={`yt-${activeVideo.id}-${iframeKey}`} src={youtubeUrl} title={activeVideo.title} />
          ) : (
            activeIptv?.url && <SovereignIframe key={`web-${activeIptv.stream_id}-${iframeKey}`} src={activeIptv.url} title={activeIptv.name} />
          )}
        </div>

        {isMinimized && (
          <div className="absolute inset-0 flex items-center justify-between px-6 gap-4 animate-in fade-in duration-300">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/20 bg-zinc-900/40">
              <img src={activeVideo?.thumbnail || activeIptv?.stream_icon} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="flex flex-col flex-1 min-w-0 text-right">
              <span className="text-white font-black text-xs truncate w-full tracking-tighter leading-none">{activeVideo?.title || activeIptv?.name}</span>
              <span className="text-[7px] text-accent font-black uppercase tracking-[0.4em] mt-1">بث سيادي نشط</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsMinimized(false)} className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/20 flex items-center justify-center focusable shadow-glow"><Maximize2 className="w-4 h-4" /></button>
              <button onClick={handleClose} className="w-8 h-8 rounded-full bg-red-600/20 text-red-500 border border-red-600/20 flex items-center justify-center focusable"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {!isMinimized && (
        <div className={cn(
          "fixed z-[100000] flex items-center transition-all duration-500", 
          isFullScreen ? (isDockLeft ? "right-10 bottom-10" : "left-10 bottom-10") + " scale-100" : (isDockLeft ? "left-14 bottom-14" : "right-14 bottom-14") + " scale-90"
        )}>
          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-3xl p-1.5 rounded-full border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
            <button onClick={handleClose} className="w-8 h-8 rounded-full bg-red-600/20 text-red-500 border border-red-600/20 flex items-center justify-center focusable shadow-glow"><X className="w-4 h-4" /></button>
            <div className="w-px h-5 bg-white/10 mx-0.5" />
            
            {isPlayerControlsExpanded && (
              <div className="flex items-center gap-2 animate-in slide-in-from-left-4 duration-300">
                {/* URL INJECTION HUB - ONLY SHOW FOR WEB MODE (HIHI2/IPTV) */}
                {isWebType && (
                  <div className="flex items-center gap-2 bg-white/5 rounded-full px-2 h-7 border border-white/10 group focus-within:border-emerald-500/40 focus-within:bg-white/10 transition-all">
                    <Globe className="w-3 h-3 text-white/20 group-focus-within:text-emerald-400" />
                    <Input 
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePutToIframe()}
                      placeholder="URL..."
                      className="bg-transparent border-none text-[8px] font-bold text-white p-0 h-full w-32 focus-visible:ring-0 placeholder:text-white/10"
                    />
                    <button 
                      onClick={handlePutToIframe}
                      className="w-5 h-5 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/40 transition-all"
                      title="PUT TO IFRAME"
                    >
                      <Send className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}

                <div className="w-px h-5 bg-white/10 mx-0.5" />

                {isWebType && (
                  <button onClick={reloadIframe} className="w-7 h-7 rounded-full bg-white/10 text-emerald-400 flex items-center justify-center focusable hover:bg-emerald-500/20 shadow-glow" title="تنشيط الصوت وإعادة التحميل"><Volume2 className="w-4 h-4" /></button>
                )}
                {!isWebType && (
                  <>
                    <button onClick={prevTrack} className="w-7 h-7 rounded-full bg-white/5 text-white/40 flex items-center justify-center focusable hover:bg-white/10"><ChevronRight className="w-4 h-4" /></button>
                    <button onClick={nextTrack} className="w-7 h-7 rounded-full bg-white/5 text-white/40 flex items-center justify-center focusable hover:bg-white/10"><ChevronLeft className="w-4 h-4" /></button>
                  </>
                )}
                <div className="w-px h-5 bg-white/10 mx-0.5" />
                <button onClick={() => activeVideo && toggleSaveVideo(activeVideo)} className={cn("w-7 h-7 rounded-full flex items-center justify-center focusable transition-all", isSaved ? "bg-accent/40 text-accent shadow-glow" : "bg-white/5 text-white/40")}><BookmarkCheck className="w-4 h-4" /></button>
                <button onClick={cyclePlayerMode} className="w-7 h-7 rounded-full bg-white/5 text-white/40 flex items-center justify-center focusable hover:bg-white/10" title="تبديل الوضع"><Maximize2 className="w-4 h-4" /></button>
                <button onClick={() => setIsFullScreen(!isFullScreen)} className={cn("w-7 h-7 rounded-full flex items-center justify-center focusable transition-all", isFullScreen ? "bg-primary text-white shadow-glow" : "bg-white/5 text-white/40")}><Monitor className="w-4 h-4" /></button>
              </div>
            )}

            <button 
              onClick={() => setIsPlayerControlsExpanded(!isPlayerControlsExpanded)} 
              className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center focusable shadow-glow"
              title={isPlayerControlsExpanded ? "طي الشريط" : "توسيع الشريط"}
            >
              {isPlayerControlsExpanded ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
