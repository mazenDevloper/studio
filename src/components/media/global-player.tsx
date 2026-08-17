
"use client";

import { useMediaStore } from "@/lib/store";
import { X, Monitor, ChevronRight, ChevronLeft, Maximize2, BookmarkCheck, Volume2, ListPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { SovereignIframe } from "@/components/ui/sovereign-iframe";
import { Input } from "@/components/ui/input";
import { ShortcutBadge } from "@/components/layout/car-dock";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

/**
 * GlobalVideoPlayer v250.0 - Auto-Next Engine & Sovereign Watchdog
 */
export function GlobalVideoPlayer() {
  const { 
    activeVideo, activeIptv, isMinimized, isFullScreen, nextTrack, prevTrack,
    setActiveVideo, setActiveIptv, setIsMinimized, setIsFullScreen, 
    toggleSaveVideo, savedVideos, setGridMode,
    isPlayerControlsExpanded, setIsPlayerControlsExpanded, cyclePlayerMode,
    videoProgress, dockSide, playlists, addVideoToPlaylist, isLooping
  } = useMediaStore();
  
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [urlInput, setUrlInput] = useState("https://idebsports.ly/matches");

  useEffect(() => {
    setMounted(true);
    if (activeVideo || activeIptv) {
      const timer = setTimeout(() => {
        const targetId = isMinimized ? "player-close-btn-min" : "player-close-btn";
        const closeBtn = document.querySelector(`[data-nav-id="${targetId}"]`) as HTMLElement;
        closeBtn?.focus();
        closeBtn?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeVideo?.id, activeIptv?.stream_id, isMinimized]);

  // SOVEREIGN AUTO-NEXT: Listen for YouTube End event
  useEffect(() => {
    if (!activeVideo) return;

    const handleMessage = (event: MessageEvent) => {
      // Expecting data from YouTube Player API (enablejsapi=1)
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        // event === 'onStateChange', info === 0 means "ended"
        if (data.event === 'onStateChange' && data.info === 0) {
          if (isLooping) {
            nextTrack();
          }
        }
      } catch (e) {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeVideo, isLooping, nextTrack]);

  // Focus Watchdog: Rescue focus every 10s if lost to Iframe
  useEffect(() => {
    if (!activeVideo && !activeIptv) return;

    const rescueFocus = () => {
      const active = document.activeElement;
      const targetId = isMinimized ? "player-close-btn-min" : "player-close-btn";
      
      // If close button is already focused, do nothing
      if (active?.getAttribute('data-nav-id') === targetId) return;

      const playerContainer = document.querySelector('.fixed.z-\\[99999\\]');
      const controlsContainer = document.querySelector('.fixed.z-\\[100000\\]');
      
      const isFocusInPlayer = playerContainer?.contains(active) || controlsContainer?.contains(active);
      const isFocusInIframe = active?.tagName === 'IFRAME';
      
      if (!isFocusInPlayer || isFocusInIframe) {
         const rescueBtn = document.querySelector(`[data-nav-id="${targetId}"]`) as HTMLElement;
         rescueBtn?.focus();
         rescueBtn?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    const interval = setInterval(rescueFocus, 10000); 
    return () => clearInterval(interval);
  }, [activeVideo, activeIptv, isMinimized]);

  const isActive = !!(activeVideo || activeIptv);
  const isSaved = activeVideo ? savedVideos.some(v => v.id === activeVideo.id) : false;
  const isWebType = activeIptv?.type === 'web' || !!activeIptv;

  const youtubeUrl = useMemo(() => {
    if (!activeVideo?.id) return "";
    const start = activeVideo.id && videoProgress[activeVideo.id] ? Math.floor(videoProgress[activeVideo.id]) : 0;
    const params = new URLSearchParams({
      autoplay: '1', mute: '0', controls: '1', start: start.toString(), rel: '0', modestbranding: '1', enablejsapi: '1', 
      origin: typeof window !== 'undefined' ? window.location.origin : '', hl: 'ar'
    });
    return `https://www.youtube.com/embed/${activeVideo.id}?${params.toString()}`;
  }, [activeVideo?.id, videoProgress]);

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
            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/20 bg-zinc-900/40 shadow-glow"><img src={activeVideo?.thumbnail || activeIptv?.stream_icon} className="w-full h-full object-cover" alt="" /></div>
            <div className="flex flex-col flex-1 min-w-0 text-right"><span className="text-white font-black text-sm truncate w-full tracking-tighter leading-none">{activeVideo?.title || activeIptv?.name}</span><span className="text-[8px] text-accent font-black uppercase tracking-[0.4em] mt-1.5">نظام البث المركزي</span></div>
            <div className="flex gap-3">
              <div className="relative group"><button onClick={() => setIsMinimized(false)} className="w-9 h-9 rounded-full bg-primary text-white shadow-glow flex items-center justify-center focusable transition-all"><Maximize2 className="w-5 h-5" /></button><ShortcutBadge action="player_minimize" className="-bottom-5 left-1/2 -translate-x-1/2 scale-50" /></div>
              <div className="relative group"><button onClick={handleClose} data-nav-id="player-close-btn-min" className="w-9 h-9 rounded-full bg-red-600 text-white shadow-glow flex items-center justify-center focusable"><X className="w-5 h-5" /></button><ShortcutBadge action="player_close" className="-bottom-5 left-1/2 -translate-x-1/2 scale-50" /></div>
            </div>
          </div>
        )}
      </div>

      {!isMinimized && (
        <div className="fixed z-[100000] flex items-center transition-all duration-500 left-1/2 -translate-x-1/2 bottom-0 scale-[0.95] origin-bottom pb-4">
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-3xl p-2 rounded-full border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
            <div className="relative group">
              <button onClick={handleClose} data-nav-id="player-close-btn" className="w-9 h-9 rounded-full bg-red-600/20 text-red-500 border border-red-600/20 flex items-center justify-center focusable shadow-glow"><X className="w-5 h-5" /></button>
              <ShortcutBadge action="player_close" className="-bottom-4 left-1/2 -translate-x-1/2 scale-50" />
            </div>
            <div className="w-px h-6 bg-white/20 mx-0.5" />
            {isPlayerControlsExpanded && (
              <div className="flex items-center gap-3 animate-in slide-in-from-left-4 duration-300">
                {isWebType && (
                  <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 h-10 border border-white/10 group focus-within:border-emerald-500/40 transition-all"><Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePutToIframe()} placeholder="URL..." className="bg-transparent border-none text-[10px] font-bold text-white p-0 h-full w-40 focus-visible:ring-0" /><button onClick={handlePutToIframe} className="w-7 h-7 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center"><ChevronRight className="w-3.5 h-3.5" /></button></div>
                )}
                {isWebType && <button onClick={() => setIframeKey(k => k + 1)} className="w-10 h-10 rounded-full bg-white/10 text-emerald-400 flex items-center justify-center focusable"><Volume2 className="w-5 h-5" /></button>}
                {!isWebType && (<><div className="relative group"><button onClick={prevTrack} className="w-9 h-9 rounded-full bg-white/5 text-white/40 flex items-center justify-center focusable"><ChevronRight className="w-5 h-5" /></button><ShortcutBadge action="player_prev" className="-bottom-4 left-1/2 -translate-x-1/2 scale-50" /></div><div className="relative group"><button onClick={nextTrack} className="w-9 h-9 rounded-full bg-white/5 text-white/40 flex items-center justify-center focusable"><ChevronLeft className="w-5 h-5" /></button><ShortcutBadge action="player_next" className="-bottom-4 left-1/2 -translate-x-1/2 scale-50" /></div></>)}
                <div className="w-px h-6 bg-white/20 mx-0.5" />
                
                <Popover>
                  <PopoverTrigger asChild>
                    <div className="relative group">
                      <button className={cn("w-9 h-9 rounded-full flex items-center justify-center focusable transition-all active:scale-95", isSaved ? "bg-accent/40 text-accent shadow-glow" : "bg-white/5 text-white/40")}>
                        <BookmarkCheck className="w-5 h-5" />
                        <ShortcutBadge action="player_save" className="-bottom-4 left-1/2 -translate-x-1/2 scale-50" />
                      </button>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="center" className="bg-zinc-950/95 backdrop-blur-3xl border-white/10 w-64 p-2 rounded-[2rem] shadow-2xl mb-4 z-[100001]">
                     <div className="space-y-1">
                        <h4 className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] px-4 py-2 border-b border-white/5">حفظ في قائمة التشغيل</h4>
                        <button onClick={() => activeVideo && toggleSaveVideo(activeVideo)} className="w-full text-right p-3 rounded-xl hover:bg-white/5 flex items-center justify-between text-white text-xs font-black transition-all">
                           <span>المفضلات العامة ⭐</span>
                           {isSaved && <BookmarkCheck className="w-4 h-4 text-accent" />}
                        </button>
                        <div className="h-px bg-white/5 my-1" />
                        {playlists.length === 0 && (
                          <p className="text-[10px] text-white/20 text-center py-4 italic">لا توجد قوائم تشغيل منشئة</p>
                        )}
                        {playlists.map(p => (
                          <button 
                            key={p.id} 
                            onClick={() => { 
                              if(activeVideo) { 
                                addVideoToPlaylist(p.id, activeVideo); 
                                toast({ title: "تم الحفظ", description: `تمت الإضافة إلى قائمة ${p.name}` }); 
                              } 
                            }} 
                            className="w-full text-right p-3 rounded-xl hover:bg-indigo-600 flex items-center gap-3 text-white text-xs font-black transition-all group/item"
                          >
                             <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center group-hover/item:bg-white/20">
                               <ListPlus className="w-3.5 h-3.5" />
                             </div>
                             <span className="truncate">{p.name}</span>
                          </button>
                        ))}
                     </div>
                  </PopoverContent>
                </Popover>

                <div className="relative group"><button onClick={cyclePlayerMode} className="w-9 h-9 rounded-full bg-white/5 text-white/40 flex items-center justify-center focusable"><Maximize2 className="w-5 h-5" /></button><ShortcutBadge action="player_mode" className="-bottom-4 left-1/2 -translate-x-1/2 scale-50" /></div>
                <div className="relative group"><button onClick={() => setIsFullScreen(!isFullScreen)} className={cn("w-9 h-9 rounded-full flex items-center justify-center focusable", isFullScreen ? "bg-primary text-white shadow-glow" : "bg-white/5 text-white/40")}><Monitor className="w-5 h-5" /></button><ShortcutBadge action="player_fullscreen" className="-bottom-4 left-1/2 -translate-x-1/2 scale-50" /></div>
              </div>
            )}
            <div className="relative group"><button onClick={() => setIsPlayerControlsExpanded(!isPlayerControlsExpanded)} className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center focusable shadow-glow">{isPlayerControlsExpanded ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}</button><ShortcutBadge action="player_settings" className="-bottom-4 left-1/2 -translate-x-1/2 scale-50" /></div>
          </div>
        </div>
      )}
    </>
  );
}
