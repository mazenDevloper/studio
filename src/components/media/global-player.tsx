
"use client";

import { useMediaStore } from "@/lib/store";
import { X, Monitor, ChevronRight, ChevronLeft, Maximize2, BookmarkCheck, Volume2, ListPlus, LayoutList, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { SovereignIframe } from "@/components/ui/sovereign-iframe";
import { Input } from "@/components/ui/input";
import { ShortcutBadge } from "@/components/layout/car-dock";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * GlobalVideoPlayer v720.0 - Sovereign Background Persistence Engine
 * Features: 10-Second Transition Pulse + Silent Audio Heartbeat + Visibility Lock.
 */
export function GlobalVideoPlayer() {
  const { 
    activeVideo, activeIptv, isMinimized, isFullScreen, nextTrack, prevTrack,
    setActiveVideo, setActiveIptv, setIsMinimized, setIsFullScreen, 
    toggleSaveVideo, savedVideos, setGridMode, playlist, playlistIndex,
    isPlayerControlsExpanded, setIsPlayerControlsExpanded, cyclePlayerMode,
    isPlayerPlaylistOpen, setIsPlayerPlaylistOpen,
    videoProgress, dockSide, playlists, addVideoToPlaylist, isPlaying, setIsPlaying
  } = useMediaStore();
  
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [urlInput, setUrlInput] = useState("https://idebsports.ly/matches");
  const [countdown, setCountdown] = useState<number | null>(null);
  const lastProcessedIdRef = useRef<string | null>(null);
  const audioHeartbeatRef = useRef<HTMLAudioElement>(null);

  const isActive = !!(activeVideo || activeIptv);

  // SOVEREIGN HEARTBEAT: Silent Audio to keep process alive in background
  useEffect(() => {
    if (isPlaying && isActive) {
      audioHeartbeatRef.current?.play().catch(() => {});
    } else {
      audioHeartbeatRef.current?.pause();
    }
  }, [isPlaying, isActive]);

  // SOVEREIGN BACKGROUND PULSE: Advanced MediaSession Integration
  useEffect(() => {
    if (activeVideo && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: activeVideo.title,
        artist: activeVideo.channelTitle || 'DriveCast Sovereign',
        album: 'المجلد السيادي المستمر',
        artwork: [
          { src: activeVideo.thumbnail, sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      const actionHandlers: [MediaSessionAction, () => void][] = [
        ['play', () => { setIsPlaying(true); }],
        ['pause', () => { setIsPlaying(false); }],
        ['nexttrack', () => { nextTrack(); setCountdown(null); }],
        ['previoustrack', () => { prevTrack(); setCountdown(null); }],
        ['stop', () => { handleClose(); }]
      ];

      actionHandlers.forEach(([action, handler]) => {
        try {
          navigator.mediaSession.setActionHandler(action, handler);
        } catch (e) {}
      });
    }
  }, [activeVideo, isPlaying, setIsPlaying, nextTrack, prevTrack]);

  // VISIBILITY WATCHDOG
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPlaying && isActive) {
        setIframeKey(prev => prev + 0);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isPlaying, isActive]);

  // SOVEREIGN TIME WATCHDOG: 10-Second Transition logic
  useEffect(() => {
    if (!activeVideo || !activeVideo.duration || activeVideo.duration === "FEED") {
      setCountdown(null);
      return;
    }

    setCountdown(null);
    lastProcessedIdRef.current = null;

    const parts = activeVideo.duration.split(':').map(Number);
    let totalSeconds = 0;
    if (parts.length === 3) totalSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else if (parts.length === 2) totalSeconds = parts[0] * 60 + parts[1];

    if (totalSeconds <= 0) return;

    // Trigger countdown 10 seconds before end
    const triggerTime = (totalSeconds - 10) * 1000;
    const watchdog = setTimeout(() => {
      if (lastProcessedIdRef.current !== activeVideo.id) {
         setCountdown(10);
         lastProcessedIdRef.current = activeVideo.id;
      }
    }, triggerTime > 0 ? triggerTime : 100); 

    return () => clearTimeout(watchdog);
  }, [activeVideo?.id, activeVideo?.duration]);

  // COUNTDOWN CYCLE
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      nextTrack();
      return;
    }
    const timer = setTimeout(() => setCountdown(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [countdown, nextTrack]);

  useEffect(() => {
    setMounted(true);
    if (isActive) {
      const timer = setTimeout(() => {
        const targetId = isMinimized ? "player-close-btn-min" : "player-close-btn";
        const closeBtn = document.querySelector(`[data-nav-id="${targetId}"]`) as HTMLElement;
        closeBtn?.focus();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activeVideo?.id, activeIptv?.stream_id, isMinimized, isActive]);

  const isSaved = activeVideo ? savedVideos.some(v => v.id === activeVideo.id) : false;
  const isWebType = activeIptv?.type === 'web' || !!activeIptv;

  const youtubeUrl = useMemo(() => {
    if (!activeVideo?.id) return "";
    const start = activeVideo.id && videoProgress[activeVideo.id] ? Math.floor(videoProgress[activeVideo.id]) : 0;
    const params = new URLSearchParams({
      autoplay: '1', mute: '0', controls: '1', start: start.toString(), rel: '0', 
      modestbranding: '1', enablejsapi: '1', iv_load_policy: '3',
      origin: typeof window !== 'undefined' ? window.location.origin : '', hl: 'ar'
    });
    return `https://www.youtube.com/embed/${activeVideo.id}?${params.toString()}`;
  }, [activeVideo?.id, videoProgress]);

  const handleClose = () => { 
    setActiveVideo(null); 
    setActiveIptv(null); 
    setGridMode('hidden'); 
    setIsPlayerControlsExpanded(false); 
    setIsFullScreen(false);
    setIsMinimized(false);
    setIsPlayerPlaylistOpen(false);
    setCountdown(null);
    lastProcessedIdRef.current = null;
    setIsPlaying(false);
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
  const ctrlBtnClass = "rounded-full flex items-center justify-center focusable transition-all shadow-glow active:scale-90 w-12 h-12 min-[968px]:w-14 min-[968px]:h-14 max-[968px]:w-16 max-[968px]:h-16";

  return (
    <>
      <audio ref={audioHeartbeatRef} loop className="hidden">
        <source src="data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==" type="audio/wav" />
      </audio>

      <div className={cn(
        "fixed z-[99999] shadow-[0_0_120px_rgba(0,0,0,0.9)] transition-all duration-500 overflow-hidden pointer-events-auto", 
        isMinimized ? "bottom-8 left-1/2 -translate-x-1/2 w-[440px] h-24 rounded-[2.5rem] premium-glass bg-black/80 border border-white/20" : 
        isFullScreen ? "inset-0 w-full h-full bg-black flex" : 
        `bottom-12 ${popupSideClass} w-[35vw] h-[40vh] premium-glass rounded-[3.5rem] bg-black/95 border-2 border-white/10 flex`
      )}>
        <div className={cn("relative flex-1 transition-opacity duration-500 flex", isMinimized ? "opacity-0 pointer-events-none absolute -top-[9999px]" : "opacity-100")}>
           <div className="flex-1 relative">
              {activeVideo ? (
                <SovereignIframe key={`yt-${activeVideo.id}-${iframeKey}`} src={youtubeUrl} title={activeVideo.title} />
              ) : (
                activeIptv?.url && <SovereignIframe key={`web-${activeIptv.stream_id}-${iframeKey}`} src={activeIptv.url} title={activeIptv.name} />
              )}

              {countdown !== null && (
                <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-3xl animate-in fade-in duration-300">
                  <div className="relative flex items-center justify-center">
                     <div className="w-40 h-40 rounded-full border-4 border-white/5 flex items-center justify-center relative">
                        <span className="text-7xl font-black text-white tabular-nums drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">{countdown}</span>
                        <svg className="absolute inset-0 -rotate-90 w-40 h-40">
                          <circle
                            cx="80" cy="80" r="76"
                            fill="none" stroke="currentColor" strokeWidth="8"
                            className="text-primary transition-all duration-1000 ease-linear"
                            style={{ strokeDasharray: 477, strokeDashoffset: 477 * (1 - countdown / 10) }}
                          />
                        </svg>
                     </div>
                  </div>
                  <div className="mt-8 text-center space-y-2">
                     <h2 className="text-2xl font-black text-white tracking-widest uppercase">الانتقال للتلاوة التالية</h2>
                     <p className="text-white/40 font-bold uppercase tracking-[0.5em] text-[10px]">Sovereign 10s Sequence active</p>
                  </div>
                  <button onClick={() => setCountdown(null)} className="mt-12 h-14 px-10 rounded-full bg-white/10 border border-white/20 text-white font-black hover:bg-white/20 transition-all focusable flex items-center gap-3"><RotateCcw className="w-5 h-5" /> إلغاء العد</button>
                </div>
              )}
           </div>

           {isPlayerPlaylistOpen && (
             <div className={cn(
               "h-full bg-black/95 border-l border-white/10 backdrop-blur-3xl animate-in fade-in slide-in-from-left-full duration-500 flex flex-col shrink-0 transition-all",
               isFullScreen ? "w-[30%]" : "w-[45%]"
             )} dir="rtl">
               <div className="p-6 border-b border-white/5 flex items-center justify-between">
                 <div className="flex items-center gap-3 text-indigo-400"><LayoutList className="w-5 h-5" /><h3 className="text-xs font-black uppercase tracking-widest">المجلد السيادي</h3></div>
                 <button onClick={() => setIsPlayerPlaylistOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition-colors focusable"><X className="w-4 h-4" /></button>
               </div>
               <ScrollArea className="flex-1">
                 <div className="p-4 space-y-3">
                   {playlist.map((v, i) => (
                     <button key={v.id + i} onClick={() => { setActiveVideo(v, playlist); lastProcessedIdRef.current = null; setCountdown(null); }} className={cn("w-full p-4 rounded-[1.8rem] flex items-center gap-4 transition-all focusable text-right border-2", i === playlistIndex ? "bg-indigo-600 border-indigo-400 text-white shadow-glow scale-[1.02]" : "bg-white/5 border-transparent text-white/60 hover:bg-white/10")}>
                       <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10"><img src={v.thumbnail} className="w-full h-full object-cover" alt="" /></div>
                       <div className="flex flex-col min-w-0"><span className="text-[11px] font-black truncate">{v.title}</span><span className="text-[9px] opacity-40 font-bold mt-1">{v.duration || "---"}</span></div>
                     </button>
                   ))}
                 </div>
               </ScrollArea>
             </div>
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
        <div className="fixed z-[100000] flex items-center transition-all duration-500 left-1/2 -translate-x-1/2 bottom-0 scale-[0.95] origin-bottom pb-8">
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-3xl p-2 rounded-full border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.7)] transition-all">
            <div className="relative group">
              <button onClick={handleClose} data-nav-id="player-close-btn" className={cn(ctrlBtnClass, "bg-red-600/40 text-red-500 border-2 border-red-500/20")}>
                <X className="w-6 h-6" />
              </button>
              <ShortcutBadge action="player_close" className="-bottom-4 left-1/2 -translate-x-1/2 scale-75" />
            </div>
            
            {isPlayerControlsExpanded && (
              <div className="flex items-center gap-3 animate-in slide-in-from-left-4 duration-300">
                {isWebType && (
                  <div className="flex items-center gap-3 bg-white/5 rounded-full px-5 h-12 min-[968px]:h-14 max-[968px]:h-16 border-2 border-white/10 group focus-within:border-emerald-500/40 transition-all">
                    <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePutToIframe()} placeholder="URL..." className="bg-transparent border-none text-[16px] font-black text-white p-0 h-full w-48 focus-visible:ring-0" />
                    <button onClick={handlePutToIframe} className="w-10 h-10 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center"><ChevronRight className="w-5 h-5" /></button>
                  </div>
                )}
                
                {isWebType && (
                  <button onClick={() => setIframeKey(k => k + 1)} className={cn(ctrlBtnClass, "bg-white/10 text-emerald-400")}>
                    <Volume2 className="w-6 h-6" />
                  </button>
                )}
                
                {!isWebType && (
                  <>
                    <div className="relative group">
                      <button onClick={prevTrack} className={cn(ctrlBtnClass, "bg-white/5 text-white")}>
                        <ChevronRight className="w-6 h-6" />
                      </button>
                      <ShortcutBadge action="player_prev" className="-bottom-4 left-1/2 -translate-x-1/2 scale-75" />
                    </div>
                    <div className="relative group">
                      <button onClick={nextTrack} className={cn(ctrlBtnClass, "bg-white/5 text-white")}>
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <ShortcutBadge action="player_next" className="-bottom-4 left-1/2 -translate-x-1/2 scale-75" />
                    </div>
                  </>
                )}
                
                <div className="relative group">
                  <button onClick={() => setIsPlayerPlaylistOpen(!isPlayerPlaylistOpen)} className={cn(ctrlBtnClass, isPlayerPlaylistOpen ? "bg-indigo-600 text-white" : "bg-white/5 text-white/60")}>
                    <LayoutList className="w-6 h-6" />
                  </button>
                  <ShortcutBadge action="player_playlist" className="-bottom-4 left-1/2 -translate-x-1/2 scale-75" />
                </div>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <div className="relative group">
                      <button className={cn(ctrlBtnClass, isSaved ? "bg-accent/40 text-accent" : "bg-white/5 text-white/60")}>
                        <BookmarkCheck className="w-6 h-6" />
                        <ShortcutBadge action="player_save" className="-bottom-4 left-1/2 -translate-x-1/2 scale-75" />
                      </button>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="center" className="bg-zinc-950/95 backdrop-blur-3xl border-white/10 w-96 p-4 rounded-[3rem] shadow-2xl mb-10 z-[100001]">
                     <div className="space-y-2">
                        <h4 className="text-[12px] font-black text-white/20 uppercase tracking-[0.4em] px-4 py-3 border-b border-white/5">حفظ في المجلد السيادي</h4>
                        <button onClick={() => activeVideo && toggleSaveVideo(activeVideo)} className="w-full text-right p-5 rounded-3xl hover:bg-white/10 flex items-center justify-between text-white text-lg font-black transition-all">
                           <span>المفضلات العامة ⭐</span>
                           {isSaved && <BookmarkCheck className="w-6 h-6 text-accent" />}
                        </button>
                        {playlists.map(p => (
                          <button key={p.id} onClick={() => { if(activeVideo) { addVideoToPlaylist(p.id, activeVideo); toast({ title: "تم الحفظ", description: `تمت الإضافة إلى قائمة ${p.name}` }); } }} className="w-full text-right p-5 rounded-3xl hover:bg-indigo-600 flex items-center gap-5 text-white text-lg font-black transition-all group/item"><div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover/item:bg-white/20"><ListPlus className="w-6 h-6" /></div><span className="truncate">{p.name}</span></button>
                        ))}
                     </div>
                  </PopoverContent>
                </Popover>

                <div className="relative group">
                  <button onClick={cyclePlayerMode} className={cn(ctrlBtnClass, "bg-white/5 text-white/60")}>
                    <Maximize2 className="w-6 h-6" />
                  </button>
                  <ShortcutBadge action="player_mode" className="-bottom-4 left-1/2 -translate-x-1/2 scale-75" />
                </div>
                
                <div className="relative group">
                  <button onClick={() => setIsFullScreen(!isFullScreen)} className={cn(ctrlBtnClass, isFullScreen ? "bg-primary text-white shadow-glow" : "bg-white/5 text-white/60")}>
                    <Monitor className="w-6 h-6" />
                  </button>
                  <ShortcutBadge action="player_fullscreen" className="-bottom-4 left-1/2 -translate-x-1/2 scale-75" />
                </div>
              </div>
            )}
            
            <div className="relative group">
              <button onClick={() => setIsPlayerControlsExpanded(!isPlayerControlsExpanded)} className={cn(ctrlBtnClass, "bg-white/20 text-white shadow-glow border-2 border-white/20")}>
                {isPlayerControlsExpanded ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
              </button>
              <ShortcutBadge action="player_settings" className="-bottom-4 left-1/2 -translate-x-1/2 scale-75" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
