
"use client";

import { useMediaStore, AppAction, MappingContext } from "@/lib/store";
import { X, Monitor, ChevronDown, ChevronRight, ChevronLeft, Settings, LayoutGrid, Bookmark, BookmarkCheck, Globe, Youtube, Eye, Maximize2, Minimize2, Play, Pause, FastForward, Rewind } from "lucide-react";
import { cn, normalizeKey } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";

/**
 * Priorities HW TV Keys for display in badges with specific priorities for Colors and Numbers
 */
function getPriorityKey(keys: string[]): string | null {
  if (!keys || keys.length === 0) return null;
  const hardwarePriority = ['Red', 'Green', 'Yellow', 'Blue', 'ChannelUp', 'ChannelDown', 'PageUp', 'PageDown', 'Back', 'Exit', '1', '3', '7', '9', '0', '2', '4', '5', '6', '8'];
  const found = hardwarePriority.find(hw => keys.some(k => k.toLowerCase() === hw.toLowerCase()));
  if (found) return found;
  return keys[0];
}

function ShortcutBadge({ action }: { action: AppAction }) {
  const { keyMappings } = useMediaStore();
  const playerKeys = keyMappings.player?.[action] || [];
  const globalKeys = keyMappings.global?.[action] || [];
  const combined = Array.from(new Set([...playerKeys, ...globalKeys]));
  
  const displayKey = getPriorityKey(combined);
  if (!displayKey) return null;
  
  const shortKey = displayKey.length > 4 ? displayKey.substring(0, 3) : displayKey;
  
  const colorClasses: Record<string, string> = {
    'Red': 'bg-red-600 text-white',
    'Green': 'bg-green-600 text-white',
    'Yellow': 'bg-yellow-500 text-black',
    'Blue': 'bg-blue-600 text-white',
    '1': 'bg-zinc-800 text-white',
    '3': 'bg-zinc-800 text-white',
    '7': 'bg-zinc-800 text-white',
    '9': 'bg-zinc-800 text-white',
    '0': 'bg-zinc-800 text-white'
  };
  
  const badgeClass = colorClasses[displayKey] || 'bg-white text-black';
  
  return (
    <div className={cn(
      "absolute -top-1 -left-1 text-[8px] font-black px-1 py-0.5 rounded shadow-glow z-20 uppercase border border-black/10 transition-all duration-300 grayscale-0 opacity-100",
      badgeClass
    )}>
      {shortKey}
    </div>
  );
}

export function GlobalVideoPlayer() {
  const { 
    activeVideo, activeIptv, isPlaying, isMinimized, isFullScreen, nextTrack, prevTrack,
    setActiveVideo, setActiveIptv, setIsPlaying, setIsMinimized, setIsFullScreen, updateVideoProgress,
    playlist, videoProgress, toggleSaveVideo, savedVideos, iptvPlaylist, playerMode, setPlayerMode,
    showIslands, toggleShowIslands, gridMode, setGridMode
  } = useMediaStore();
  
  const [mounted, setMounted] = useState(false);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const progressInterval = useRef<any>(null);

  const isActive = !!(activeVideo || activeIptv);
  const isSaved = activeVideo ? savedVideos.some(v => v.id === activeVideo.id) : false;

  const startSeconds = useMemo(() => {
    if (activeVideo?.id && videoProgress[activeVideo.id]) {
      return Math.floor(videoProgress[activeVideo.id]);
    }
    return 0;
  }, [activeVideo?.id, videoProgress]);

  // FORCED PLAYER CONTROL ACTIONS
  useEffect(() => {
    const handleForcedKeys = (e: KeyboardEvent) => {
      if (!isActive) return;
      const key = normalizeKey(e);
      const mappings = useMediaStore.getState().keyMappings;
      
      // Close Forced
      if (mappings.player?.player_close?.includes(key) || mappings.global?.player_close?.includes(key)) {
        e.preventDefault();
        handleClose();
      }
      
      // Playlist Toggle Forced
      if (mappings.player?.player_playlist?.includes(key)) {
        e.preventDefault();
        setGridMode(gridMode === 'hidden' ? 'full' : 'hidden');
      }

      // Minimize Toggle Forced
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
    
    const startFrom = Math.floor(videoProgress[videoId] || 0);

    if (playerRef.current?.loadVideoById) {
      if (lastIdRef.current === videoId) return;
      lastIdRef.current = videoId;
      playerRef.current.loadVideoById({ videoId, startSeconds: startFrom });
      return;
    }
    
    lastIdRef.current = videoId;
    containerRef.current.innerHTML = '<div id="yt-stable-element"></div>';
    playerRef.current = new YT.Player('yt-stable-element', {
      height: '100%', width: '100%', videoId,
      playerVars: { 
        autoplay: 1, controls: 1, modestbranding: 1, rel: 0, 
        playsinline: 1, origin: window.location.origin, enablejsapi: 1,
        start: startFrom
      },
      events: { onReady: (e: any) => e.target.playVideo(), onStateChange: onPlayerStateChange }
    });
  }, [mounted, onPlayerStateChange, videoProgress, playerMode]); 

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
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20">
              <LayoutGrid className="w-7 h-7 text-primary" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-3xl font-black text-white tracking-tighter">قائمة التشغيل الذكية</h2>
              <span className="text-[10px] text-white/40 uppercase font-bold tracking-[0.3em]">
                {gridMode === 'full' ? 'Full View Sync' : 'Partial Context View'}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setGridMode('hidden')} className="w-14 h-14 rounded-full bg-white/5 text-white focusable">
            <X className="w-8 h-8" />
          </Button>
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
              <ShortcutBadge action="player_close" />
              <X className="w-5 h-5" />
            </button>
            <div className={cn("flex items-center bg-white/5 backdrop-blur-3xl p-2.5 rounded-full border border-white/10 shadow-2xl transition-all", isControlsExpanded ? "gap-3 px-4" : "px-2.5")} data-nav-id="player-controls-container">
              {!isControlsExpanded ? <button onClick={() => setIsControlsExpanded(true)} className="w-10 h-10 rounded-full bg-white/5 border border-white/5 text-white/60 flex items-center justify-center focusable cursor-pointer" tabIndex={0} data-nav-id="player-settings-toggle"><Settings className="w-6 h-6" /></button> : (
                <>
                  <button onClick={() => setIsControlsExpanded(false)} className="w-9 h-9 rounded-full bg-white/5 text-white/20 flex items-center justify-center focusable cursor-pointer" tabIndex={0}><ChevronRight className="w-5 h-5" /></button>
                  <button onClick={prevTrack} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center focusable cursor-pointer relative" tabIndex={0}>
                    <ShortcutBadge action="player_prev" />
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button onClick={nextTrack} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center focusable cursor-pointer relative" tabIndex={0}>
                    <ShortcutBadge action="player_next" />
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="w-px h-7 bg-white/10 mx-1" />
                  <button onClick={() => activeVideo && toggleSaveVideo(activeVideo)} className={cn("w-9 h-9 rounded-full flex items-center justify-center focusable cursor-pointer transition-colors relative", isSaved ? "bg-accent/40 text-accent shadow-glow" : "bg-white/5 text-white/40")} tabIndex={0}>
                    <ShortcutBadge action="player_save" />
                    {isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                  </button>
                  <button onClick={() => setIsMinimized(!isMinimized)} className={cn("w-9 h-9 rounded-full flex items-center justify-center focusable cursor-pointer relative", isMinimized && "bg-orange-500/40 shadow-glow")} tabIndex={0} data-nav-id="player-min-toggle">
                    <ShortcutBadge action="player_minimize" />
                    {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
                  </button>
                  <button onClick={() => setIsFullScreen(!isFullScreen)} className={cn("w-9 h-9 rounded-full flex items-center justify-center focusable cursor-pointer relative", isFullScreen && "bg-primary/40 shadow-glow")} tabIndex={0}>
                    <ShortcutBadge action="player_fullscreen" />
                    <Monitor className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
