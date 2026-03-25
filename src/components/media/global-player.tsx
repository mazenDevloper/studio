
"use client";

import { useMediaStore } from "@/lib/store";
import { X, Monitor, ChevronDown, Play, Pause, ChevronRight, ChevronLeft, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { fetchChannelDetails } from "@/lib/youtube";

export function GlobalVideoPlayer() {
  const { 
    activeVideo, activeIptv, isPlaying, isMinimized, isFullScreen, videoProgress, nextTrack, prevTrack, nextIptvChannel, prevIptvChannel,
    setActiveVideo, setActiveIptv, setIsPlaying, setIsMinimized, setIsFullScreen, updateVideoProgress
  } = useMediaStore();
  
  const [mounted, setMounted] = useState(false);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [channelIcon, setChannelIcon] = useState<string | null>(null);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const progressInterval = useRef<any>(null);

  const isActive = !!(activeVideo || activeIptv);

  const currentYouTubeId = useMemo(() => {
    const input = activeVideo ? activeVideo.id : (activeIptv?.url || "");
    if (!input || typeof input !== 'string') return null;
    
    const regExp = /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = input.match(regExp);
    if (match && match[1].length === 11) return match[1];
    
    if (input.length === 11 && !input.includes(".") && !input.includes("/")) return input;
    
    return null;
  }, [activeVideo, activeIptv?.url]);

  useEffect(() => {
    if (!isActive) {
      if (playerRef.current && typeof playerRef.current.stopVideo === 'function') {
        try { playerRef.current.stopVideo(); } catch (e) {}
      }
      lastIdRef.current = null;
      playerRef.current = null; 
      if (progressInterval.current) clearInterval(progressInterval.current);
    }
  }, [isActive]);

  useEffect(() => {
    if (activeVideo?.channelId) {
      fetchChannelDetails(activeVideo.channelId).then(details => {
        if (details) setChannelIcon(details.image);
      });
    } else {
      setChannelIcon(null);
    }
  }, [activeVideo?.channelId]);

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
      }, 5000);
    } else if (event.data === YT.PlayerState.PAUSED) {
      setIsPlaying(false);
      if (progressInterval.current) clearInterval(progressInterval.current);
    } else if (event.data === YT.PlayerState.ENDED) {
      nextTrack();
    }
  }, [setIsPlaying, nextTrack, updateVideoProgress]);

  const initPlayer = useCallback((videoId: string) => {
    if (!containerRef.current || !mounted) return;
    const YT = (window as any).YT;
    if (!YT || !YT.Player) return;

    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      if (lastIdRef.current === videoId) return;
      lastIdRef.current = videoId;
      playerRef.current.loadVideoById({ videoId, startSeconds: Math.floor(videoProgress[videoId] || 0) });
      return;
    }

    lastIdRef.current = videoId;
    containerRef.current.innerHTML = '<div id="yt-stable-element"></div>';
    playerRef.current = new YT.Player('yt-stable-element', {
      height: '100%', width: '100%', videoId,
      playerVars: { autoplay: 1, controls: 1, modestbranding: 1, rel: 0, playsinline: 1, enablejsapi: 1, origin: window.location.origin, start: Math.floor(videoProgress[videoId] || 0) },
      events: { onReady: (e: any) => e.target.playVideo(), onStateChange: onPlayerStateChange }
    });
  }, [mounted, onPlayerStateChange, videoProgress]);

  useEffect(() => {
    if (currentYouTubeId && mounted) {
      const YT = (window as any).YT;
      if (YT && YT.Player) initPlayer(currentYouTubeId);
      else (window as any).onYouTubeIframeAPIReady = () => initPlayer(currentYouTubeId);
    }
  }, [currentYouTubeId, mounted, initPlayer]);

  const handleClose = () => {
    if (playerRef.current && typeof playerRef.current.stopVideo === 'function') {
      try { playerRef.current.stopVideo(); } catch (e) {}
    }
    lastIdRef.current = null;
    playerRef.current = null;
    setActiveVideo(null);
    setActiveIptv(null);
  };

  if (!mounted) return null;

  const displayImage = activeIptv ? activeIptv.stream_icon : (channelIcon || activeVideo?.thumbnail || "");

  return (
    <div className={cn("fixed z-[9999] shadow-2xl overflow-hidden transition-all duration-700", !isActive ? "top-[-9999px] left-[-9999px] opacity-0" : isMinimized ? "bottom-12 left-1/2 -translate-x-1/2 w-[500px] h-28 rounded-[2.5rem] premium-glass" : isFullScreen ? "inset-0 w-full h-full bg-black" : "bottom-8 right-4 w-[50vw] h-[55vh] premium-glass rounded-[3.5rem] bg-black/95")}>
      <div className={cn("absolute inset-0 transition-opacity duration-500", isMinimized ? "opacity-0 pointer-events-none" : "opacity-100")}>
        {currentYouTubeId ? (
          <div ref={containerRef} className="w-full h-full bg-black" />
        ) : (activeIptv?.url ? (
          <iframe 
            key={activeIptv.stream_id}
            src={`${activeIptv.url}${activeIptv.url.includes('?') ? '&' : '?'}autoplay=1&mute=0`} 
            className="w-full h-full border-none" 
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture" 
            referrerPolicy="no-referrer"
            style={{ background: '#000' }}
          />
        ) : null)}
      </div>

      {isMinimized && isActive && (
        <div className="h-full flex items-center justify-between px-8 relative z-10 cursor-pointer" onClick={() => setIsFullScreen(true)}>
          <div className="flex items-center gap-4 flex-1 min-w-0 text-right">
            <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/10 bg-zinc-900 shadow-xl"><Image src={displayImage} alt="" fill className="object-cover" /></div>
            <div className="flex flex-col"><h4 className="text-base font-black text-white truncate max-w-[200px]">{activeVideo?.title || activeIptv?.name}</h4><span className="text-[9px] text-accent font-black uppercase tracking-widest">Background Mode</span></div>
          </div>
          <div className="flex gap-3">
            <button onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); if (playerRef.current) isPlaying ? playerRef.current.pauseVideo() : playerRef.current.playVideo(); }} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 focusable">{isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}</button>
            <button onClick={(e) => { e.stopPropagation(); handleClose(); }} className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center focusable"><X className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      {!isMinimized && isActive && (
        <div className={cn("fixed z-[5200] flex items-center transition-all duration-500", isFullScreen ? "left-10 bottom-10 scale-150 origin-bottom-left" : "right-12 bottom-12 scale-90")}>
          <div className={cn("flex items-center premium-glass p-2 rounded-full border border-white/20 shadow-2xl backdrop-blur-3xl transition-all duration-500", isControlsExpanded ? "gap-2 px-3" : "w-16 h-16 justify-center")}>
            {!isControlsExpanded ? (
              <button onClick={() => setIsControlsExpanded(true)} className="w-12 h-12 rounded-full bg-primary shadow-glow text-white flex items-center justify-center focusable"><Settings className="w-7 h-7" /></button>
            ) : (
              <>
                <button onClick={() => setIsControlsExpanded(false)} className="w-12 h-12 rounded-full bg-white/10 text-white/40 flex items-center justify-center focusable"><ChevronRight className="w-6 h-6" /></button>
                <div className="flex gap-2">
                  <button onClick={prevTrack} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center focusable"><ChevronRight className="w-6 h-6" /></button>
                  <button onClick={nextTrack} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center focusable"><ChevronLeft className="w-6 h-6" /></button>
                </div>
                <div className="w-px h-8 bg-white/20 mx-1" />
                <button onClick={() => setIsMinimized(true)} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center focusable"><ChevronDown className="w-5 h-5" /></button>
                <button onClick={() => setIsFullScreen(!isFullScreen)} className={cn("w-12 h-12 rounded-full flex items-center justify-center focusable", isFullScreen && "bg-primary shadow-glow")}><Monitor className="w-5 h-5" /></button>
                <button onClick={handleClose} className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center focusable"><X className="w-5 h-5" /></button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
