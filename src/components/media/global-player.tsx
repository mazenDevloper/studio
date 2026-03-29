
"use client";

import { useMediaStore } from "@/lib/store";
import { X, Monitor, ChevronDown, ChevronRight, ChevronLeft, Settings, LayoutGrid, Bookmark, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export function GlobalVideoPlayer() {
  const { 
    activeVideo, activeIptv, isPlaying, isMinimized, isFullScreen, nextTrack, prevTrack,
    setActiveVideo, setActiveIptv, setIsPlaying, setIsMinimized, setIsFullScreen, updateVideoProgress,
    playlist, videoProgress, toggleSaveVideo, savedVideos
  } = useMediaStore();
  
  const [mounted, setMounted] = useState(false);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const progressInterval = useRef<any>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const isActive = !!(activeVideo || activeIptv);
  const isSaved = activeVideo ? savedVideos.some(v => v.id === activeVideo.id) : false;

  useEffect(() => {
    if (isActive && isControlsExpanded && closeBtnRef.current) {
      setTimeout(() => closeBtnRef.current?.focus(), 200);
    }
  }, [isActive, isControlsExpanded]);

  const currentYouTubeId = useMemo(() => {
    const input = activeVideo ? activeVideo.id : (activeIptv?.url || "");
    if (!input || typeof input !== 'string') return null;
    const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = input.match(regExp);
    return (match && match[1].length === 11) ? match[1] : (input.length === 11 ? input : null);
  }, [activeVideo, activeIptv?.url]);

  useEffect(() => {
    setMounted(true);
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive || isMinimized) return;
      if (e.key === "ArrowDown" && isControlsExpanded) {
        e.preventDefault();
        setShowGrid(true);
      }
      if (e.key === "Escape") setShowGrid(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, isMinimized, isControlsExpanded]);

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
    } else if (event.data === YT.PlayerState.PAUSED) {
      setIsPlaying(false);
    } else if (event.data === YT.PlayerState.ENDED) {
      nextTrack();
    }
  }, [setIsPlaying, nextTrack, updateVideoProgress]);

  const initPlayer = useCallback((videoId: string) => {
    if (!containerRef.current || !mounted) return;
    const YT = (window as any).YT;
    if (!YT?.Player) return;
    
    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      if (lastIdRef.current === videoId) return;
      lastIdRef.current = videoId;
      playerRef.current.loadVideoById({ 
        videoId, 
        startSeconds: Math.floor(videoProgress[videoId] || 0) 
      });
      return;
    }

    lastIdRef.current = videoId;
    containerRef.current.innerHTML = '<div id="yt-stable-element"></div>';
    
    playerRef.current = new YT.Player('yt-stable-element', {
      height: '100%', 
      width: '100%', 
      videoId,
      playerVars: { 
        autoplay: 1, 
        controls: 1, 
        modestbranding: 1, 
        rel: 0, 
        playsinline: 1, 
        origin: window.location.origin,
        enablejsapi: 1,
        widget_referrer: window.location.href,
        host: 'https://www.youtube.com'
      },
      events: { 
        onReady: (e: any) => e.target.playVideo(), 
        onStateChange: onPlayerStateChange 
      }
    });
  }, [mounted, onPlayerStateChange, videoProgress]); 

  useEffect(() => {
    if (currentYouTubeId && mounted) {
      const YT = (window as any).YT;
      if (YT?.Player) initPlayer(currentYouTubeId);
      else (window as any).onYouTubeIframeAPIReady = () => initPlayer(currentYouTubeId);
    }
  }, [currentYouTubeId, mounted, initPlayer]);

  const handleClose = () => {
    if (playerRef.current?.destroy) {
      try { playerRef.current.destroy(); } catch {}
    }
    playerRef.current = null;
    lastIdRef.current = null;
    setActiveVideo(null);
    setActiveIptv(null);
    setShowGrid(false);
  };

  if (!mounted) return null;

  return (
    <div className={cn(
      "fixed z-[9999] shadow-2xl transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden",
      !isActive ? "top-[-9999px] left-[-9999px] opacity-0" : 
      isMinimized ? "bottom-12 left-1/2 -translate-x-1/2 w-[500px] h-28 rounded-[2.5rem] premium-glass bg-black/40 border border-white/10" : 
      isFullScreen ? "inset-0 w-full h-full bg-black ring-0 border-0" : 
      "bottom-8 right-8 w-[50vw] h-[55vh] premium-glass rounded-[3.5rem] bg-black/95 border border-white/10"
    )}>
      
      <div className={cn("absolute inset-0 transition-opacity duration-700", isMinimized ? "opacity-0 pointer-events-none" : "opacity-100")}>
        {currentYouTubeId ? <div ref={containerRef} className="w-full h-full bg-black" /> : 
        (activeIptv?.url && (
          <iframe 
            key={activeIptv.stream_id} 
            src={`${activeIptv.url}${activeIptv.url.includes('?') ? '&' : '?'}autoplay=1`} 
            className="w-full h-full border-none" 
            allow="autoplay; encrypted-media; fullscreen" 
            sandbox="allow-scripts allow-forms allow-same-origin allow-presentation allow-downloads"
            style={{ background: '#000' }} 
          />
        ))}
      </div>

      <div className={cn(
        "absolute bottom-0 left-0 right-0 z-[100] bg-black/90 backdrop-blur-3xl border-t border-white/10 transition-all duration-700 ease-in-out px-12 py-8 overflow-hidden rounded-t-[3rem]",
        showGrid ? "translate-y-0 h-[45vh]" : "translate-y-full h-0"
      )}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-white flex items-center gap-4"><LayoutGrid className="w-6 h-6 text-primary" /> قائمة التشغيل</h2>
          <Button onClick={() => setShowGrid(false)} className="w-12 h-12 rounded-full bg-white/10 text-white focusable cursor-pointer"><X className="w-6 h-6" /></Button>
        </div>
        
        <ScrollArea className="h-full pr-4 pb-20">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {playlist.map((v, i) => (
              <div key={i} onClick={() => { setActiveVideo(v, playlist); setShowGrid(false); }} className={cn("group rounded-[1.5rem] bg-white/5 p-2 transition-all focusable cursor-pointer border-2", activeVideo?.id === v.id ? "border-primary shadow-glow" : "border-transparent")}>
                <div className="aspect-video relative rounded-[1rem] overflow-hidden mb-2">
                  <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-[9px] font-bold text-white line-clamp-2 px-2 uppercase tracking-tight">{v.title}</h3>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {isActive && (
        <div className={cn("fixed z-[5200] flex items-center transition-all duration-700", isFullScreen ? "left-10 bottom-10 scale-125 origin-bottom-left" : "right-12 bottom-12 scale-90")}>
          <div className="flex items-center gap-4">
            <button 
              ref={closeBtnRef} 
              onClick={handleClose} 
              className="w-10 h-10 rounded-full bg-red-600/10 border border-red-600/30 text-red-500/80 flex items-center justify-center focusable cursor-pointer shadow-lg active:scale-90 transition-all backdrop-blur-md hover:bg-red-600/20 hover:text-red-500"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className={cn("flex items-center bg-white/5 backdrop-blur-3xl p-2.5 rounded-full border border-white/10 shadow-2xl transition-all", isControlsExpanded ? "gap-3 px-4" : "px-2.5")}>
              {!isControlsExpanded ? (
                <button onClick={() => setIsControlsExpanded(true)} className="w-10 h-10 rounded-full bg-white/5 border border-white/5 text-white/60 flex items-center justify-center focusable cursor-pointer"><Settings className="w-6 h-6" /></button>
              ) : (
                <>
                  <button onClick={() => setIsControlsExpanded(false)} className="w-9 h-9 rounded-full bg-white/5 text-white/20 flex items-center justify-center focusable cursor-pointer"><ChevronRight className="w-5 h-5" /></button>
                  <button onClick={prevTrack} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center focusable cursor-pointer"><ChevronRight className="w-5 h-5" /></button>
                  <button onClick={nextTrack} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center focusable cursor-pointer"><ChevronLeft className="w-5 h-5" /></button>
                  <div className="w-px h-7 bg-white/10 mx-1" />
                  <button 
                    onClick={() => activeVideo && toggleSaveVideo(activeVideo)} 
                    className={cn("w-9 h-9 rounded-full flex items-center justify-center focusable cursor-pointer transition-colors", isSaved ? "bg-accent/40 text-accent shadow-glow" : "bg-white/5 text-white/40")}
                  >
                    {isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                  </button>
                  <button onClick={() => setIsMinimized(true)} className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center focusable cursor-pointer"><ChevronDown className="w-5 h-5" /></button>
                  <button onClick={() => setIsFullScreen(!isFullScreen)} className={cn("w-9 h-9 rounded-full flex items-center justify-center focusable cursor-pointer", isFullScreen && "bg-primary/40 shadow-glow")}><Monitor className="w-5 h-5" /></button>
                  <button onClick={() => setShowGrid(!showGrid)} className={cn("w-9 h-9 rounded-full flex items-center justify-center focusable cursor-pointer", showGrid && "bg-emerald-500/40 shadow-glow")}><LayoutGrid className="w-5 h-5" /></button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
