
"use client";

import { useMediaStore } from "@/lib/store";
import { X, Monitor, ChevronRight, ChevronLeft, Settings, LayoutGrid, Bookmark, BookmarkCheck, Youtube, Maximize2, Minimize2 } from "lucide-react";
import { cn, normalizeKey } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ShortcutBadge } from "@/components/layout/car-dock";

export function GlobalVideoPlayer() {
  const { 
    activeVideo, activeIptv, isPlaying, isMinimized, isFullScreen, nextTrack, prevTrack,
    setActiveVideo, setActiveIptv, setIsPlaying, setIsMinimized, setIsFullScreen, updateVideoProgress,
    playlist, videoProgress, toggleSaveVideo, savedVideos, iptvPlaylist, playerMode,
    gridMode, setGridMode, isPlayerControlsExpanded, setIsPlayerControlsExpanded
  } = useMediaStore();
  
  const [mounted, setMounted] = useState(false);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const progressInterval = useRef<any>(null);

  const isActive = !!(activeVideo || activeIptv);
  const isSaved = activeVideo ? savedVideos.some(v => v.id === activeVideo.id) : false;

  // Smart Resume: Only for saved videos
  const startSeconds = useMemo(() => {
    if (activeVideo?.id && isSaved && videoProgress[activeVideo.id]) {
      return Math.floor(videoProgress[activeVideo.id]);
    }
    return 0;
  }, [activeVideo?.id, isSaved, videoProgress]);

  useEffect(() => {
    const handleForcedKeys = (e: KeyboardEvent) => {
      if (!isActive) return;
      const key = normalizeKey(e);
      const mappings = useMediaStore.getState().keyMappings;
      
      if (mappings.player?.player_close?.includes(key) || mappings.global?.player_close?.includes(key)) {
        e.preventDefault();
        handleClose();
      }
      
      if (mappings.player?.player_playlist?.includes(key)) {
        e.preventDefault();
        setGridMode(gridMode === 'hidden' ? 'full' : 'hidden');
      }

      if (mappings.player?.player_minimize?.includes(key)) {
        e.preventDefault();
        setIsMinimized(!isMinimized);
      }
    };
    window.addEventListener("keydown", handleForcedKeys, true);
    return () => window.removeEventListener("keydown", handleForcedKeys, true);
  }, [isActive, gridMode, isMinimized, setGridMode, setIsMinimized]);

  useEffect(() => {
    setMounted(true);
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
  }, []);

  const onPlayerStateChange = useCallback((event: any) => {
    const YT = (window as any).YT;
    if (event.data === YT.PlayerState.PLAYING) {
      setIsPlaying(true);
      if (progressInterval.current) clearInterval(progressInterval.current);
      progressInterval.current = setInterval(() => {
        if (playerRef.current?.getCurrentTime && lastIdRef.current) {
          updateVideoProgress(lastIdRef.current, playerRef.current.getCurrentTime());
        }
      }, 15000); 
    } else if (event.data === YT.PlayerState.PAUSED) setIsPlaying(false);
    else if (event.data === YT.PlayerState.ENDED) nextTrack();
  }, [setIsPlaying, nextTrack, updateVideoProgress]);

  const initPlayer = useCallback((videoId: string) => {
    if (!containerRef.current || !mounted || playerMode === 'web') return;
    const YT = (window as any).YT;
    if (!YT?.Player) return;
    
    if (playerRef.current?.loadVideoById) {
      if (lastIdRef.current === videoId) return;
      lastIdRef.current = videoId;
      playerRef.current.loadVideoById({ videoId, startSeconds });
      return;
    }
    
    lastIdRef.current = videoId;
    containerRef.current.innerHTML = '<div id="yt-stable-element"></div>';
    playerRef.current = new YT.Player('yt-stable-element', {
      height: '100%', width: '100%', videoId,
      playerVars: { 
        autoplay: 1, controls: 1, modestbranding: 1, rel: 0, 
        playsinline: 1, origin: window.location.origin, enablejsapi: 1,
        start: startSeconds
      },
      events: { onReady: (e: any) => e.target.playVideo(), onStateChange: onPlayerStateChange }
    });
  }, [mounted, onPlayerStateChange, startSeconds, playerMode]); 

  useEffect(() => {
    const currentYouTubeId = activeVideo ? activeVideo.id : null;
    if (currentYouTubeId && mounted && playerMode === 'api') {
      const YT = (window as any).YT;
      if (YT?.Player) initPlayer(currentYouTubeId);
      else (window as any).onYouTubeIframeAPIReady = () => initPlayer(currentYouTubeId);
    }
  }, [activeVideo, mounted, initPlayer, playerMode]);

  const handleClose = () => {
    if (playerRef.current?.destroy) try { playerRef.current.destroy(); } catch {}
    playerRef.current = null; lastIdRef.current = null;
    setActiveVideo(null); setActiveIptv(null); setGridMode('hidden');
    setIsPlayerControlsExpanded(false);
  };

  if (!mounted) return null;
  const currentPlaylist = activeIptv ? iptvPlaylist : playlist;

  return (
    <div 
      className={cn(
        "fixed z-[9999] shadow-2xl transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden",
        !isActive ? "top-[-9999px] left-[-9999px] opacity-0" : 
        isMinimized ? "bottom-12 left-1/2 -translate-x-1/2 w-[500px] h-28 rounded-[2.5rem] premium-glass bg-black/40 border border-white/10" : 
        isFullScreen ? "inset-0 w-full h-full bg-black ring-0 border-0" : 
        "bottom-8 right-8 w-[50vw] h-[55vh] premium-glass rounded-[3.5rem] bg-black/95 border border-white/10"
      )}
    >
      <div className={cn("absolute inset-0 transition-opacity duration-700", isMinimized ? "opacity-0 pointer-events-none" : "opacity-100")}>
        {activeVideo ? (
          playerMode === 'api' ? <div ref={containerRef} className="w-full h-full bg-black" /> :
          <iframe 
            src={`https://www.youtube-nocookie.com/embed/${activeVideo.id}?autoplay=1&controls=1&modestbranding=1&rel=0&playsinline=1&hl=ar&widget_referrer=https://www.youtube.com&origin=https://www.youtube.com${startSeconds > 0 ? `&start=${startSeconds}` : ''}`} 
            className="w-full h-full border-none" 
            allow="autoplay; encrypted-media; fullscreen" 
            sandbox="allow-scripts allow-forms allow-same-origin allow-presentation allow-downloads" 
            style={{ background: '#000' }} 
          />
        ) : (activeIptv?.url && <iframe key={activeIptv.stream_id} src={`${activeIptv.url}${activeIptv.url.includes('?') ? '&' : '?'}autoplay=1`} className="w-full h-full border-none" allow="autoplay; encrypted-media; fullscreen" sandbox="allow-scripts allow-forms allow-same-origin allow-presentation allow-downloads" style={{ background: '#000' }} />)}
      </div>

      <div 
        className={cn(
          "absolute left-0 right-0 z-[100] bg-black/95 backdrop-blur-[80px] border-t border-white/10 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] px-12 py-8 rounded-t-[3rem] overflow-hidden player-playlist-grid",
          gridMode === 'hidden' ? "bottom-[-100%] h-0 invisible" : 
          gridMode === 'partial' ? "bottom-0 h-[66%] visible" : "bottom-0 h-full visible"
        )}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20"><LayoutGrid className="w-7 h-7 text-primary" /></div>
            <div className="flex flex-col"><h2 className="text-3xl font-black text-white tracking-tighter">قائمة التشغيل الذكية</h2><span className="text-[10px] text-white/40 uppercase font-bold tracking-[0.3em]">{gridMode === 'full' ? 'Full View Sync' : 'Partial Context View'}</span></div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setGridMode('hidden')} className="w-14 h-14 rounded-full bg-white/5 text-white focusable"><X className="w-8 h-8" /></Button>
        </div>
        <div className="h-full overflow-y-auto no-scrollbar pb-40">
          <div className="grid grid-cols-3 gap-8">
            {currentPlaylist.map((v: any, i: number) => {
              const id = activeIptv ? v.stream_id : v.id;
              const isActiveItem = activeIptv ? (activeIptv.stream_id === id) : (activeVideo?.id === id);
              return (
                <div key={`pl-item-${id}-${i}`} onClick={() => { if (activeIptv) setActiveIptv(v, currentPlaylist); else setActiveVideo(v, currentPlaylist); setGridMode('hidden'); }} data-nav-id={`player-playlist-item-${i}`} className={cn("group rounded-[2.5rem] bg-white/5 p-5 transition-all focusable cursor-pointer border-4", isActiveItem ? "border-primary shadow-glow scale-105" : "border-transparent opacity-60 hover:opacity-100")} tabIndex={0}>
                  <div className="aspect-video relative rounded-[1.8rem] overflow-hidden mb-4 shadow-2xl"><img src={activeIptv ? v.stream_icon : v.thumbnail} alt="" className="w-full h-full object-cover" />{isActiveItem && <div className="absolute inset-0 bg-primary/20 flex items-center justify-center"><div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center animate-pulse shadow-glow"><Youtube className="w-6 h-6 text-white" /></div></div>}</div>
                  <h3 className="text-base font-black text-white line-clamp-2 px-2 uppercase tracking-tight leading-relaxed text-right">{activeIptv ? v.name : v.title}</h3>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isActive && (
        <div className={cn("fixed z-[5200] flex items-center transition-all duration-700 player-controls-bar", isFullScreen ? "left-10 bottom-10 scale-125 origin-bottom-left" : "right-12 bottom-12 scale-90")}>
          <div className="flex items-center gap-4">
            <button onClick={handleClose} className="w-10 h-10 rounded-full bg-red-600/10 border border-red-600/30 text-red-500/80 flex items-center justify-center focusable cursor-pointer shadow-lg active:scale-90 transition-all backdrop-blur-md relative" tabIndex={0} data-nav-id="player-close-btn">
              <ShortcutBadge action="player_close" className="-bottom-10 left-1/2 -translate-x-1/2" context="player" />
              <X className="w-5 h-5" />
            </button>
            <div className={cn("flex items-center bg-white/5 backdrop-blur-3xl p-2.5 rounded-full border border-white/10 shadow-2xl transition-all", isPlayerControlsExpanded ? "gap-3 px-4" : "px-2.5")} data-nav-id="player-controls-container">
              {!isPlayerControlsExpanded ? (
                <button onClick={() => setIsPlayerControlsExpanded(true)} className="w-10 h-10 rounded-full bg-white/5 border border-white/5 text-white/60 flex items-center justify-center focusable cursor-pointer relative" tabIndex={0} data-nav-id="player-settings-toggle">
                  <ShortcutBadge action="player_settings" className="-bottom-10 left-1/2 -translate-x-1/2" context="player" />
                  <Settings className="w-6 h-6" />
                </button>
              ) : (
                <>
                  <button onClick={() => setIsPlayerControlsExpanded(false)} className="w-9 h-9 rounded-full bg-white/5 text-white/20 flex items-center justify-center focusable cursor-pointer relative" tabIndex={0}><ShortcutBadge action="player_settings" className="-bottom-10 left-1/2 -translate-x-1/2" context="player" /><ChevronRight className="w-5 h-5" /></button>
                  <button onClick={prevTrack} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center focusable cursor-pointer relative" tabIndex={0}><ShortcutBadge action="player_prev" className="-bottom-10 left-1/2 -translate-x-1/2" context="player" /><ChevronRight className="w-5 h-5" /></button>
                  <button onClick={nextTrack} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center focusable cursor-pointer relative" tabIndex={0}><ShortcutBadge action="player_next" className="-bottom-10 left-1/2 -translate-x-1/2" context="player" /><ChevronLeft className="w-5 h-5" /></button>
                  <div className="w-px h-7 bg-white/10 mx-1" />
                  <button onClick={() => activeVideo && toggleSaveVideo(activeVideo)} className={cn("w-9 h-9 rounded-full flex items-center justify-center focusable cursor-pointer transition-colors relative", isSaved ? "bg-accent/40 text-accent shadow-glow" : "bg-white/5 text-white/40")} tabIndex={0}><ShortcutBadge action="player_save" className="-bottom-10 left-1/2 -translate-x-1/2" context="player" />{isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}</button>
                  <button onClick={() => setIsMinimized(!isMinimized)} className={cn("w-9 h-9 rounded-full flex items-center justify-center focusable cursor-pointer relative", isMinimized && "bg-orange-500/40 shadow-glow")} tabIndex={0} data-nav-id="player-min-toggle"><ShortcutBadge action="player_minimize" className="-bottom-10 left-1/2 -translate-x-1/2" context="player" />{isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}</button>
                  <button onClick={() => setIsFullScreen(!isFullScreen)} className={cn("w-9 h-9 rounded-full flex items-center justify-center focusable cursor-pointer relative", isFullScreen && "bg-primary/40 shadow-glow")} tabIndex={0}><ShortcutBadge action="player_fullscreen" className="-bottom-10 left-1/2 -translate-x-1/2" context="player" /><Monitor className="w-5 h-5" /></button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
