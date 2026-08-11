
"use client";

import { useMediaStore, AppAction } from "@/lib/store";
import { X, Monitor, ChevronRight, ChevronLeft, Maximize2, Minimize2, BookmarkCheck, RefreshCw, Send, Globe, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { SovereignIframe } from "@/components/ui/sovereign-iframe";
import { Input } from "@/components/ui/input";
import { ShortcutBadge } from "@/components/layout/car-dock";

/**
 * GlobalVideoPlayer v230.0 - Absolute Centered Minimized Engine
 * Features: Center-Dock Minimized player, Pop-up opposite side of Dock, Shortcut Badges in Player Hub.
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
      autoplay: '1', mute: '0', controls: '1', start: startSeconds.toString(), rel: '0', modestbranding: '1', enablejsapi: '1', 
      origin: typeof window !== 'undefined' ? window.location.origin : '', hl: 'ar'
    });
    return `https://www.youtube.com/embed/${activeVideo.id}?${params.toString()}`;
  }, [activeVideo?.id, startSeconds]);

  const handleClose = () => { 
    setActiveVideo(null); setActiveIptv(null); setGridMode('hidden'); setIsPlayerControlsExpanded(false); 
  };

  const handlePutToIframe = () => {
    if (!urlInput.trim()) return;
    let target = urlInput.trim();
    if (!target.startsWith('http')) target = 'https://' + target;
    setActiveIptv({
      stream_id: "injected-" + Date.now(), name: "رابط خارجي", stream_icon: "https://www.google.com/s2/favicons?sz=64&domain=" + target,
      category_id: "direct", url: target, type: 'web'
    });
  };

  if (!mounted || !isActive) return null;

  // Pop-up Positioning: Opposite side of Car Dock
  const popupSideClass = dockSide === 'left' ? "right-12" : "left-12";

  return (
    <>
      <div className={cn(
        "fixed z-[99999] shadow-[0_0_100px_rgba(0,0,0,0.7)] transition-all duration-500 overflow-hidden pointer-events-auto", 
        isMinimized ? "bottom-8 left-1/2 -translate-x-1/2 w-[440px] h-24 rounded-[2.5rem] premium-glass bg-black/80 border border-white/20" : 
        isFullScreen ? "inset-0 w-full h-full bg-black" : 
        `bottom-12 ${popupSideClass} w-[35vw] h-[40vh] premium-glass rounded-[3.5rem] bg-black/95 border-2 border-white/10`
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
              <span className="text-[8px] text-accent font-black uppercase tracking-[0.4em] mt-1.5">نظام البث المركزي</span>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsMinimized(false)} className="w-9 h-9 rounded-full bg-primary text-white shadow-glow flex items-center justify-center focusable transition-all"><Maximize2 className="w-5 h-5" /></button>
              <button onClick={handleClose} className="w-9 h-9 rounded-full bg-red-600 text-white shadow-glow flex items-center justify-center focusable"><X className="w-5 h-5" /></button>
            </div>
          </div>
        )}
      </div>

      {!isMinimized && (
        <div className="fixed z-[100000] flex items-center transition-all duration-500 left-1/2 -translate-x-1/2 bottom-0 scale-[0.95] origin-bottom pb-4">
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-3xl p-2 rounded-full border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
            <div className="relative group">
              <button onClick={handleClose} className="w-9 h-9 rounded-full bg-red-600/20 text-red-500 border border-red-600/20 flex items-center justify-center focusable shadow-glow"><X className="w-5 h-5" /></button>
              <ShortcutBadge action="player_close" className="-bottom-5 left-1/2 -translate-x-1/2 scale-50" />
            </div>
            <div className="w-px h-6 bg-white/20 mx-0.5" />
            
            {isPlayerControlsExpanded && (
              <div className="flex items-center gap-3 animate-in slide-in-from-left-4 duration-300">
                {isWebType && (
                  <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 h-10 border border-white/10 group focus-within:border-emerald-500/40 transition-all">
                    <Globe className="w-4 h-4 text-white/20" />
                    <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePutToIframe()} placeholder="URL..." className="bg-transparent border-none text-[10px] font-bold text-white p-0 h-full w-40 focus-visible:ring-0" />
                    <button onClick={handlePutToIframe} className="w-7 h-7 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center"><Send className="w-3.5 h-3.5" /></button>
                  </div>
                )}
                {isWebType && <button onClick={() => setIframeKey(k => k + 1)} className="w-10 h-10 rounded-full bg-white/10 text-emerald-400 flex items-center justify-center focusable"><Volume2 className="w-5 h-5" /></button>}
                {!isWebType && (
                  <>
                    <div className="relative group">
                      <button onClick={prevTrack} className="w-9 h-9 rounded-full bg-white/5 text-white/40 flex items-center justify-center focusable"><ChevronRight className="w-5 h-5" /></button>
                      <ShortcutBadge action="player_prev" className="-bottom-5 left-1/2 -translate-x-1/2 scale-50" />
                    </div>
                    <div className="relative group">
                      <button onClick={nextTrack} className="w-9 h-9 rounded-full bg-white/5 text-white/40 flex items-center justify-center focusable"><ChevronLeft className="w-5 h-5" /></button>
                      <ShortcutBadge action="player_next" className="-bottom-5 left-1/2 -translate-x-1/2 scale-50" />
                    </div>
                  </>
                )}
                <div className="w-px h-6 bg-white/20 mx-0.5" />
                <div className="relative group">
                  <button onClick={() => activeVideo && toggleSaveVideo(activeVideo)} className={cn("w-9 h-9 rounded-full flex items-center justify-center focusable", isSaved ? "bg-accent/40 text-accent shadow-glow" : "bg-white/5 text-white/40")}><BookmarkCheck className="w-5 h-5" /></button>
                  <ShortcutBadge action="player_save" className="-bottom-5 left-1/2 -translate-x-1/2 scale-50" />
                </div>
                <button onClick={cyclePlayerMode} className="w-9 h-9 rounded-full bg-white/5 text-white/40 flex items-center justify-center focusable"><Maximize2 className="w-5 h-5" /></button>
                <div className="relative group">
                  <button onClick={() => setIsFullScreen(!isFullScreen)} className={cn("w-9 h-9 rounded-full flex items-center justify-center focusable", isFullScreen ? "bg-primary text-white shadow-glow" : "bg-white/5 text-white/40")}><Monitor className="w-5 h-5" /></button>
                  <ShortcutBadge action="player_fullscreen" className="-bottom-5 left-1/2 -translate-x-1/2 scale-50" />
                </div>
              </div>
            )}

            <button onClick={() => setIsPlayerControlsExpanded(!isPlayerControlsExpanded)} className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center focusable shadow-glow">
              {isPlayerControlsExpanded ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
