
"use client";

import { useMediaStore } from "@/lib/store";
import { X, Bookmark, Monitor, ChevronDown, Play, Pause, Tv, List, ChevronRight, ChevronLeft, Youtube, Star, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { fetchChannelDetails } from "@/lib/youtube";

/**
 * GlobalVideoPlayer - Stable Version with GPU Isolation and Hardware Acceleration.
 * Quality Strategy: Force 360p/240p/144p to save GPU/Bandwidth.
 * Security: Re-enabled sandbox for IPTV safety.
 */
export function GlobalVideoPlayer() {
  const { 
    activeVideo, 
    activeIptv,
    isPlaying, 
    isMinimized, 
    isFullScreen,
    videoProgress,
    nextTrack,
    nextIptvChannel,
    prevIptvChannel,
    setActiveVideo, 
    setActiveIptv,
    setIsPlaying, 
    setIsMinimized, 
    setIsFullScreen,
    updateVideoProgress,
    favoriteIptvChannels,
    toggleFavoriteIptvChannel,
    toggleSaveVideo,
    savedVideos
  } = useMediaStore();
  
  const [mounted, setMounted] = useState(false);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [channelIcon, setChannelIcon] = useState<string | null>(null);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const progressInterval = useRef<any>(null);

  const isIptvStarred = useMemo(() => {
    if (!activeIptv) return false;
    return favoriteIptvChannels.some(c => c.stream_id === activeIptv.stream_id);
  }, [activeIptv, favoriteIptvChannels]);

  const isYouTubeSaved = useMemo(() => {
    if (!activeVideo) return false;
    return savedVideos.some(v => v.id === activeVideo.id);
  }, [activeVideo, savedVideos]);

  const currentYouTubeId = useMemo(() => {
    if (activeVideo) return activeVideo.id;
    if (activeIptv?.url) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = activeIptv.url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
    }
    return null;
  }, [activeVideo, activeIptv?.url]);

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
      
      // Quality Enforcement Strategy
      // Best effort to set low quality to save GPU
      if (playerRef.current && playerRef.current.setPlaybackQuality) {
        playerRef.current.setPlaybackQuality('medium'); // 360p
      }

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
    const startSecs = Math.floor(videoProgress[videoId] || 0);
    if (playerRef.current && lastIdRef.current === videoId && typeof playerRef.current.loadVideoById === 'function') {
      return;
    }
    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      lastIdRef.current = videoId;
      playerRef.current.loadVideoById({ 
        videoId, 
        startSeconds: startSecs,
        suggestedQuality: 'medium' // Force 360p
      });
      return;
    }
    lastIdRef.current = videoId;
    containerRef.current.innerHTML = '<div id="yt-stable-element"></div>';
    const YT = (window as any).YT;
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
        enablejsapi: 1,
        origin: window.location.origin,
        start: startSecs,
        vq: 'medium' // Legacy hint for 360p
      },
      events: {
        onReady: (e: any) => {
          e.target.setPlaybackQuality('medium');
          e.target.playVideo();
        },
        onStateChange: onPlayerStateChange
      }
    });
  }, [mounted, onPlayerStateChange, videoProgress]);

  useEffect(() => {
    if (!mounted) return;
    if (currentYouTubeId) {
      const YT = (window as any).YT;
      if (YT && YT.Player) initPlayer(currentYouTubeId);
      else (window as any).onYouTubeIframeAPIReady = () => initPlayer(currentYouTubeId);
    } else {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch(e) {}
        playerRef.current = null;
        lastIdRef.current = null;
      }
    }
    return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
  }, [currentYouTubeId, mounted, initPlayer]);

  const handleAddToIptv = async () => {
    if (!activeVideo) return;
    const details = await fetchChannelDetails(activeVideo.channelId!);
    toggleFavoriteIptvChannel({
      stream_id: activeVideo.id,
      name: details?.name || activeVideo.channelTitle || activeVideo.title,
      stream_icon: details?.image || activeVideo.thumbnail,
      category_id: "direct",
      url: `https://www.youtube.com/embed/${activeVideo.id}`,
      type: "web",
      starred: true
    });
  };

  if (!mounted || (!activeVideo && !activeIptv)) return null;

  const displayImage = activeIptv ? activeIptv.stream_icon : (channelIcon || activeVideo?.thumbnail || "");

  return (
    <div 
      className={cn(
        "fixed z-[9999] shadow-2xl overflow-hidden",
        isMinimized ? "bottom-12 left-1/2 -translate-x-1/2 w-[500px] h-28 rounded-[2.5rem] liquid-glass" : 
        isFullScreen ? "inset-0 w-full h-full bg-black rounded-0" : "bottom-8 right-4 w-[50vw] h-[55vh] glass-panel rounded-[3.5rem] bg-black/95"
      )} 
      style={{ 
        transform: 'translate3d(0,0,0)', 
        contain: 'layout paint',
        backfaceVisibility: 'hidden'
      }}
    >
      <div className={cn("absolute inset-0", isMinimized ? "opacity-0" : "opacity-100")} style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
        {currentYouTubeId ? (
          <div ref={containerRef} className="w-full h-full bg-black" />
        ) : (
          <iframe 
            key={activeIptv?.stream_id}
            src={`${activeIptv?.url}${activeIptv?.url?.includes('?') ? '&' : '?'}autoplay=1&mute=0`} 
            className="w-full h-full border-none" 
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen" 
            referrerPolicy="no-referrer"
            sandbox="allow-forms allow-scripts allow-same-origin"
            style={{ background: '#000' }}
          />
        )}
      </div>

      {isMinimized && (
        <div className="h-full flex items-center justify-between px-8 relative z-10" onClick={() => setIsFullScreen(true)}>
          <div className="flex items-center gap-4 flex-1 min-w-0 text-right">
            <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/10 bg-zinc-900 shadow-xl">
              <Image src={displayImage} alt="" fill className="object-cover" />
            </div>
            <div className="flex flex-col">
              <h4 className="text-base font-black text-white truncate max-w-[200px]">{activeVideo?.title || activeIptv?.name}</h4>
              <span className="text-[9px] text-accent font-black uppercase">Active Stream</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={(e) => { 
              e.stopPropagation(); 
              if (playerRef.current) {
                if (isPlaying) playerRef.current.pauseVideo();
                else playerRef.current.playVideo();
              }
              setIsPlaying(!isPlaying); 
            }} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); setActiveVideo(null); setActiveIptv(null); }} className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      {!isMinimized && (
        <div className={cn(
          "fixed z-[5200] flex items-center",
          isFullScreen ? "left-10 bottom-10 scale-150 origin-bottom-left" : "right-12 bottom-12 scale-90"
        )} style={{ transform: 'translate3d(0,0,0)' }}>
          <div className={cn(
            "flex items-center liquid-glass p-2 rounded-full border border-white/20 shadow-2xl overflow-hidden backdrop-blur-3xl",
            isControlsExpanded ? "gap-2 px-3" : "w-16 h-16 justify-center"
          )}>
            {!isControlsExpanded ? (
              <button onClick={() => setIsControlsExpanded(true)} className="w-12 h-12 rounded-full bg-primary shadow-glow text-white flex items-center justify-center focusable">
                <Settings className="w-7 h-7" />
              </button>
            ) : (
              <>
                <button onClick={() => setIsControlsExpanded(false)} className="w-12 h-12 rounded-full bg-white/10 text-white/40 flex items-center justify-center focusable"><ChevronRight className="w-6 h-6" /></button>
                {activeVideo && (
                  <>
                    <button onClick={() => toggleSaveVideo(activeVideo)} className={cn("w-12 h-12 rounded-full flex items-center justify-center focusable", isYouTubeSaved ? "bg-primary text-white shadow-glow" : "bg-white/5 text-white/40")} title="حفظ في الفيديوهات المحفوظة"><Bookmark className={cn("w-5 h-5", isYouTubeSaved && "fill-current")} /></button>
                    <button onClick={handleAddToIptv} className="w-12 h-12 rounded-full bg-white/5 text-emerald-400 flex items-center justify-center focusable" title="حفظ كقناة IPTV"><Tv className="w-5 h-5" /></button>
                  </>
                )}
                {activeIptv && (
                  <>
                    <button onClick={() => toggleFavoriteIptvChannel(activeIptv)} className={cn("w-12 h-12 rounded-full flex items-center justify-center focusable", isIptvStarred ? "bg-yellow-500 text-black shadow-glow" : "bg-white/5 text-white/40")} title="حفظ في مفضلة IPTV"><Star className={cn("w-5 h-5", isIptvStarred && "fill-current")} /></button>
                    <div className="w-px h-8 bg-white/20 mx-1" />
                    <button onClick={prevIptvChannel} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center focusable"><ChevronRight className="w-6 h-6" /></button>
                    <button onClick={nextIptvChannel} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center focusable"><ChevronLeft className="w-6 h-6" /></button>
                    <div className="w-px h-8 bg-white/20 mx-1" />
                  </>
                )}
                <button onClick={() => setIsMinimized(true)} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center focusable"><ChevronDown className="w-5 h-5" /></button>
                <button onClick={() => setIsFullScreen(!isFullScreen)} className={cn("w-12 h-12 rounded-full flex items-center justify-center focusable", isFullScreen && "bg-primary shadow-glow")}><Monitor className="w-5 h-5" /></button>
                <button onClick={() => { setActiveVideo(null); setActiveIptv(null); }} className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center focusable"><X className="w-5 h-5" /></button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
