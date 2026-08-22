
"use client";

import { useMediaStore, YouTubeVideo } from "@/lib/store";
import { X, Monitor, ChevronRight, ChevronLeft, Maximize2, BookmarkCheck, Volume2, ListPlus, LayoutList, RotateCcw, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo, useRef } from "react";
import { SovereignIframe } from "@/components/ui/sovereign-iframe";
import { Input } from "@/components/ui/input";
import { ShortcutBadge } from "@/components/layout/car-dock";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

/**
 * GlobalVideoPlayer v1240.0 - Sovereign Auto-Activation & Layering
 * Features: 
 * 1. 1-Second Auto-Click: Automatically triggers play on start.
 * 2. Layered Playlist: Moves horizontal list above floating buttons.
 * 3. Physical Pulse Feedback at the center of the iframe on activation.
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
  const [urlInput, setUrlInput] = useState("");
  const [showPulse, setShowPulse] = useState(false);
  
  const [localElapsed, setLocalElapsed] = useState(0);
  const [postEndTimer, setPostEndTimer] = useState(0);
  const [isEnded, setIsEnded] = useState(false);
  
  const audioHeartbeatRef = useRef<HTMLAudioElement>(null);
  const forcePlayBtnRef = useRef<HTMLButtonElement>(null);
  const forcePlayBtnExpandedRef = useRef<HTMLButtonElement>(null);
  const autoClickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isActive = !!(activeVideo || activeIptv);

  const parseDurationToSeconds = (dur: string): number => {
    if (!dur || dur === "FEED") return 0;
    const parts = dur.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  };

  const totalDuration = useMemo(() => activeVideo ? parseDurationToSeconds(activeVideo.duration || "") : 0, [activeVideo]);

  // SOVEREIGN AUTO-ACTIVATION: Trigger play after 1 second of loading
  useEffect(() => {
    if (isActive && !isMinimized) {
      if (autoClickTimerRef.current) clearTimeout(autoClickTimerRef.current);
      autoClickTimerRef.current = setTimeout(() => {
        handleIframeAutoClick();
      }, 1500); // 1.5 seconds for safety
    }
    return () => {
      if (autoClickTimerRef.current) clearTimeout(autoClickTimerRef.current);
    };
  }, [activeVideo?.id, activeIptv?.stream_id, isActive, isMinimized]);

  useEffect(() => {
    if (isPlaying && isActive) {
      audioHeartbeatRef.current?.play().catch(() => {});
    } else {
      audioHeartbeatRef.current?.pause();
    }
  }, [isPlaying, isActive]);

  useEffect(() => {
    let interval: any;
    if (isPlaying && activeVideo && !isEnded && totalDuration > 0) {
      interval = setInterval(() => {
        setLocalElapsed(prev => {
          if (prev >= totalDuration) {
            setIsEnded(true);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, activeVideo, isEnded, totalDuration]);

  useEffect(() => {
    let interval: any;
    if (isEnded) {
      interval = setInterval(() => {
        setPostEndTimer(prev => {
          if (prev >= 5) {
            nextTrack();
            resetWatchdog();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isEnded, nextTrack]);

  const resetWatchdog = () => {
    setLocalElapsed(0);
    setPostEndTimer(0);
    setIsEnded(false);
  };

  useEffect(() => {
    resetWatchdog();
  }, [activeVideo?.id]);

  useEffect(() => {
    if (activeVideo && 'mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: activeVideo.title,
        artist: activeVideo.channelTitle || 'DriveCast Sovereign',
        album: 'المجلد السيادي المستمر',
        artwork: [{ src: activeVideo.thumbnail, sizes: '512x512', type: 'image/jpeg' }]
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      const actionHandlers: [MediaSessionAction, () => void][] = [
        ['play', () => setIsPlaying(true)],
        ['pause', () => setIsPlaying(false)],
        ['nexttrack', () => { nextTrack(); resetWatchdog(); }],
        ['previoustrack', () => { prevTrack(); resetWatchdog(); }],
        ['stop', () => handleClose()]
      ];
      actionHandlers.forEach(([action, handler]) => {
        try { navigator.mediaSession.setActionHandler(action, handler); } catch (e) {}
      });
    }
  }, [activeVideo, isPlaying, setIsPlaying, nextTrack, prevTrack]);

  useEffect(() => {
    setMounted(true);
    if (isActive) {
      setTimeout(() => {
        const targetId = isMinimized ? "player-force-play" : "player-close-btn";
        (document.querySelector(`[data-nav-id="${targetId}"]`) as HTMLElement)?.focus();
      }, 800);
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
    setActiveVideo(null); setActiveIptv(null); setGridMode('hidden'); 
    setIsPlayerControlsExpanded(false); setIsFullScreen(false); setIsMinimized(false);
    setIsPlayerPlaylistOpen(false); resetWatchdog(); setIsPlaying(false);
  };

  const handleIframeAutoClick = () => {
    setIsPlaying(true);
    setIframeKey(k => k + 1);
    setShowPulse(true);
    setTimeout(() => setShowPulse(false), 800);

    const frames = document.getElementsByName('sovereign-frame') as NodeListOf<HTMLIFrameElement>;
    frames.forEach(frame => {
      if (frame.contentWindow) {
        frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
        frame.contentWindow.postMessage({ type: 'SOVEREIGN_UNMUTE_TRIGGER' }, '*');
      }
    });

    setTimeout(() => {
      if (isMinimized) {
        forcePlayBtnRef.current?.focus();
      } else {
        forcePlayBtnExpandedRef.current?.focus();
      }
    }, 200);
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

  const effectiveCountdown = isEnded ? 5 - postEndTimer : null;

  return (
    <>
      <audio ref={audioHeartbeatRef} loop className="hidden">
        <source src="data:audio/wav;base64,UklGRigAAABXQVZFRm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==" type="audio/wav" />
      </audio>

      <div className={cn(
        "fixed z-[99999] shadow-[0_0_120px_rgba(0,0,0,0.9)] transition-all duration-500 overflow-hidden pointer-events-auto", 
        isMinimized ? "bottom-8 left-1/2 -translate-x-1/2 w-[520px] h-24 rounded-[2.5rem] premium-glass bg-black/80 border border-white/20" : 
        isFullScreen ? "inset-0 w-full h-full bg-black flex flex-col" : 
        `bottom-12 ${popupSideClass} w-[35vw] h-[40vh] premium-glass rounded-[3.5rem] bg-black/95 border-2 border-white/10 flex`
      )}>
        <div className={cn("relative flex-1 transition-opacity duration-500 flex flex-col", isMinimized ? "opacity-0 pointer-events-none absolute -top-[9999px]" : "opacity-100")}>
           <div className="flex-1 relative">
              {activeVideo ? (
                <SovereignIframe key={`yt-${activeVideo.id}-${iframeKey}`} src={youtubeUrl} title={activeVideo.title} />
              ) : (
                activeIptv?.url && <SovereignIframe key={`web-${activeIptv.stream_id}-${iframeKey}`} src={activeIptv.url} title={activeIptv.name} />
              )}

              {showPulse && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[101]">
                   <div className="w-32 h-32 rounded-full bg-emerald-500/20 border-4 border-emerald-400 animate-ping opacity-0" />
                   <div className="absolute w-16 h-16 rounded-full bg-emerald-500/40 border-2 border-emerald-300 animate-in zoom-in-50 fade-in duration-300" />
                </div>
              )}

              {(effectiveCountdown !== null && effectiveCountdown > 0) && (
                <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-3xl animate-in fade-in duration-300">
                  <div className="relative flex items-center justify-center">
                     <div className="w-40 h-40 rounded-full border-4 border-white/5 flex items-center justify-center relative">
                        <span className="text-7xl font-black text-white tabular-nums drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">{effectiveCountdown}</span>
                        <svg className="absolute inset-0 -rotate-90 w-40 h-40">
                          <circle
                            cx="80" cy="80" r="76"
                            fill="none" stroke="currentColor" strokeWidth="8"
                            className="text-primary transition-all duration-1000 ease-linear"
                            style={{ strokeDasharray: 477, strokeDashoffset: 477 * (1 - effectiveCountdown / 5) }}
                          />
                        </svg>
                     </div>
                  </div>
                  <div className="mt-8 text-center space-y-2">
                     <h2 className="text-2xl font-black text-white tracking-widest uppercase">الانتقال للتلاوة التالية</h2>
                     <p className="text-white/40 font-bold uppercase tracking-[0.5em] text-[10px]">Sovereign Post-End Watchdog</p>
                  </div>
                  <button onClick={() => resetWatchdog()} className="mt-12 h-14 px-10 rounded-full bg-white/10 border border-white/20 text-white font-black hover:bg-white/20 transition-all focusable flex items-center gap-3"><RotateCcw className="w-5 h-5" /> إلغاء العد</button>
                </div>
              )}
           </div>

           {isPlayerPlaylistOpen && (
             <div className="absolute bottom-32 left-8 right-8 h-[240px] bg-black/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] animate-in slide-in-from-bottom-full duration-500 z-[200] flex flex-col shadow-2xl" dir="rtl">
               <div className="px-8 py-3 flex items-center justify-between border-b border-white/5">
                 <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-glow">
                       <LayoutList className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                       <h3 className="text-sm font-black text-white tracking-tighter">قائمة المجلد السيادي</h3>
                       <span className="text-[8px] text-white/40 font-bold uppercase tracking-[0.3em]">{playlist.length} تلاوة</span>
                    </div>
                 </div>
                 <button onClick={() => setIsPlayerPlaylistOpen(false)} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all focusable"><X className="w-4 h-4" /></button>
               </div>
               
               <ScrollArea className="flex-1 w-full">
                 <div className="flex gap-4 p-6 overflow-x-auto no-scrollbar scroll-smooth">
                   {playlist.map((v, i) => (
                     <button 
                       key={v.id + i} 
                       onClick={() => { setActiveVideo(v, playlist); resetWatchdog(); }}
                       className={cn(
                         "w-[260px] h-[120px] shrink-0 rounded-[2rem] border-2 transition-all duration-300 focusable overflow-hidden relative group text-right flex flex-col justify-end p-4 shadow-2xl",
                         i === playlistIndex 
                           ? "bg-indigo-600/20 border-indigo-400 scale-105 z-10 shadow-[0_0_50px_rgba(129,140,248,0.3)]" 
                           : "bg-white/5 border-white/5 hover:bg-white/10"
                       )}
                       tabIndex={0}
                       data-nav-id={`playlist-item-${i}`}
                     >
                       <div className="absolute inset-0 z-0">
                         <img src={v.thumbnail} className="w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-[5s]" alt="" />
                         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                       </div>
                       <div className="relative z-10 space-y-1">
                          <h4 className="text-[12px] font-black text-white line-clamp-2 leading-tight drop-shadow-md">{v.title}</h4>
                          <div className="flex items-center gap-2 text-[8px] font-bold text-white/40 uppercase tracking-widest mt-1">
                             <span className="truncate max-w-[100px]">{v.channelTitle}</span>
                             <span className="opacity-30">•</span>
                             <span className="text-indigo-300">{v.duration || "FEED"}</span>
                          </div>
                       </div>
                     </button>
                   ))}
                 </div>
                 <ScrollBar orientation="horizontal" className="bg-white/5 h-1" />
               </ScrollArea>
             </div>
           )}
        </div>

        {isMinimized && (
          <div className="absolute inset-0 flex items-center justify-between px-8 gap-6 animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/20 bg-zinc-900/40 shadow-glow"><img src={activeVideo?.thumbnail || activeIptv?.stream_icon} className="w-full h-full object-cover" alt="" /></div>
            <div className="flex flex-col flex-1 min-w-0 text-right"><span className="text-white font-black text-sm truncate w-full tracking-tighter leading-none">{activeVideo?.title || activeIptv?.name}</span><span className="text-[8px] text-accent font-black uppercase tracking-[0.4em] mt-1.5">نظام البث المركزي</span></div>
            <div className="flex gap-3">
              <div className="relative group">
                <button 
                  ref={forcePlayBtnRef}
                  onClick={handleIframeAutoClick} 
                  data-nav-id="player-force-play" 
                  className="w-10 h-10 rounded-full bg-emerald-500 text-black shadow-glow flex items-center justify-center focusable transition-all hover:scale-110 active:scale-95"
                >
                  <Play className="w-6 h-6 fill-current" />
                </button>
                <ShortcutBadge action="player_mode" className="-bottom-5 left-1/2 -translate-x-1/2 scale-50" />
              </div>
              <div className="relative group"><button onClick={() => setIsMinimized(false)} className="w-10 h-10 rounded-full bg-primary text-white shadow-glow flex items-center justify-center focusable transition-all hover:scale-110 active:scale-95"><Maximize2 className="w-5 h-5" /></button><ShortcutBadge action="player_minimize" className="-bottom-5 left-1/2 -translate-x-1/2 scale-50" /></div>
              <div className="relative group"><button onClick={handleClose} data-nav-id="player-close-btn-min" className="w-10 h-10 rounded-full bg-red-600 text-white shadow-glow flex items-center justify-center focusable hover:scale-110 active:scale-95"><X className="w-5 h-5" /></button><ShortcutBadge action="player_close" className="-bottom-5 left-1/2 -translate-x-1/2 scale-50" /></div>
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

            <div className="relative group">
              <button 
                ref={forcePlayBtnExpandedRef}
                onClick={handleIframeAutoClick} 
                data-nav-id="player-force-play-expanded" 
                className={cn(ctrlBtnClass, "bg-emerald-500/40 text-emerald-400 border-2 border-emerald-500/20")}
              >
                <Play className="w-6 h-6 fill-current" />
              </button>
              <ShortcutBadge action="player_mode" className="-bottom-4 left-1/2 -translate-x-1/2 scale-75" />
            </div>
            
            {isPlayerControlsExpanded && (
              <div className="flex items-center gap-3 animate-in slide-in-from-left-4 duration-300">
                {isWebType && (
                  <div className="flex items-center gap-3 bg-white/5 rounded-full px-5 h-12 min-[968px]:h-14 max-[968px]:h-16 border-2 border-white/10 group focus-within:border-emerald-500/40 transition-all">
                    <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePutToIframe()} placeholder="URL..." className="bg-transparent border-none text-[16px] font-black text-white p-0 h-full w-48 focus-visible:ring-0" />
                    <button onClick={handlePutToIframe} className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center"><ChevronRight className="w-5 h-5" /></button>
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
                      <button onClick={() => { prevTrack(); resetWatchdog(); }} className={cn(ctrlBtnClass, "bg-white/5 text-white")}>
                        <ChevronRight className="w-6 h-6" />
                      </button>
                      <ShortcutBadge action="player_prev" className="-bottom-4 left-1/2 -translate-x-1/2 scale-75" />
                    </div>
                    <div className="relative group">
                      <button onClick={() => { nextTrack(); resetWatchdog(); }} className={cn(ctrlBtnClass, "bg-white/5 text-white")}>
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
