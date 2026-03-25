
"use client";

import { useMediaStore } from "@/lib/store";
import { X, Bookmark, Monitor, ChevronDown, Play, Pause, ChevronRight, ChevronLeft, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { fetchChannelDetails } from "@/lib/youtube";

<<<<<<< HEAD
/**
 * GlobalVideoPlayer - يعمل في الخلفية لضمان استمرار الصوت عند التنقل
 * يعتمد على iframe ثابت يتم إخفاؤه بدلاً من حذفه لضمان عدم انقطاع الصوت
 */
=======
>>>>>>> 98c1c5d968cac60f9715bedd21fe0759356127b9
export function GlobalVideoPlayer() {
  const { 
    activeVideo, 
    activeIptv,
    isPlaying, 
    isMinimized, 
    isFullScreen,
    videoProgress,
    nextTrack,
    prevTrack,
    setActiveVideo, 
    setActiveIptv,
    setIsPlaying, 
    setIsMinimized, 
    setIsFullScreen,
    updateVideoProgress,
    toggleSaveVideo,
    savedVideos
  } = useMediaStore();
  
  const [mounted, setMounted] = useState(false);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [channelIcon, setChannelIcon] = useState<string | null>(null);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const internalPlayingId = useRef<string | null>(null);
  const progressInterval = useRef<any>(null);

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
    setMounted(true);
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
  }, []);

  useEffect(() => {
    if (activeVideo?.channelId) {
      fetchChannelDetails(activeVideo.channelId).then(details => {
        if (details) setChannelIcon(details.image);
      });
    } else {
      setChannelIcon(null);
    }
  }, [activeVideo?.channelId]);

  const onPlayerStateChange = useCallback((event: any) => {
    const YT = (window as any).YT;
    if (event.data === YT.PlayerState.PLAYING) {
      setIsPlaying(true);
      if (progressInterval.current) clearInterval(progressInterval.current);
      progressInterval.current = setInterval(() => {
        if (playerRef.current?.getCurrentTime && internalPlayingId.current) {
          updateVideoProgress(internalPlayingId.current, playerRef.current.getCurrentTime());
        }
      }, 5000);
    } else if (event.data === YT.PlayerState.PAUSED) {
      setIsPlaying(false);
      if (progressInterval.current) clearInterval(progressInterval.current);
    } else if (event.data === YT.PlayerState.ENDED) {
      nextTrack();
    }
  }, [setIsPlaying, nextTrack, updateVideoProgress]);

  useEffect(() => {
    if (!mounted || !currentYouTubeId) {
      internalPlayingId.current = null;
<<<<<<< HEAD
=======
      // لا نحذف المشغل هنا لضمان استمراره في الخلفية إذا كان مجرد "مخفي"
>>>>>>> 98c1c5d968cac60f9715bedd21fe0759356127b9
      return;
    }

    const startPlayer = () => {
      const YT = (window as any).YT;
      if (!YT || !YT.Player) return;
<<<<<<< HEAD

      const startSecs = Math.floor(videoProgress[currentYouTubeId] || 0);

      // إعادة تدوير المشغل إذا كان موجوداً
      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function' && document.getElementById('youtube-player-element')) {
        if (internalPlayingId.current !== currentYouTubeId) {
          playerRef.current.loadVideoById({ 
            videoId: currentYouTubeId, 
            startSeconds: startSecs 
          });
          internalPlayingId.current = currentYouTubeId;
        }
        return;
      }

      // تهيئة مشغل جديد
      if (containerRef.current) {
        containerRef.current.innerHTML = '<div id="youtube-player-element"></div>';
        playerRef.current = new YT.Player('youtube-player-element', {
          height: '100%',
          width: '100%',
          videoId: currentYouTubeId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            enablejsapi: 1,
            start: startSecs
          },
          events: {
            onStateChange: onPlayerStateChange,
            onReady: (e: any) => {
              e.target.playVideo();
              internalPlayingId.current = currentYouTubeId;
            },
            onError: () => {
              internalPlayingId.current = null;
              playerRef.current = null;
            }
          }
        });
      }
    };

    const YT = (window as any).YT;
    if (YT && YT.Player) {
      startPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = startPlayer;
    }

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [currentYouTubeId, mounted, onPlayerStateChange, videoProgress]);

  // Media Session API for Background Playback Control
  useEffect(() => {
    if (!activeVideo || !window.navigator.mediaSession) return;

    window.navigator.mediaSession.metadata = new MediaMetadata({
      title: activeVideo.title,
      artist: activeVideo.channelTitle || "DriveCast",
      artwork: [
        { src: activeVideo.thumbnail, sizes: '512x512', type: 'image/jpeg' }
      ]
    });

    window.navigator.mediaSession.setActionHandler('play', () => {
      if (playerRef.current) playerRef.current.playVideo();
      setIsPlaying(true);
    });
    window.navigator.mediaSession.setActionHandler('pause', () => {
      if (playerRef.current) playerRef.current.pauseVideo();
      setIsPlaying(false);
    });
    window.navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
    window.navigator.mediaSession.setActionHandler('previoustrack', prevTrack);

    return () => {
      window.navigator.mediaSession.setActionHandler('play', null);
      window.navigator.mediaSession.setActionHandler('pause', null);
      window.navigator.mediaSession.setActionHandler('nexttrack', null);
      window.navigator.mediaSession.setActionHandler('previoustrack', null);
    };
  }, [activeVideo, nextTrack, prevTrack, setIsPlaying]);
=======

      const startSecs = Math.floor(videoProgress[currentYouTubeId] || 0);

      // إذا كان المشغل موجوداً وجاهزاً، نكتفي بتغيير الفيديو
      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function' && document.getElementById('youtube-player-element')) {
        if (internalPlayingId.current !== currentYouTubeId) {
          playerRef.current.loadVideoById({ 
            videoId: currentYouTubeId, 
            startSeconds: startSecs 
          });
          internalPlayingId.current = currentYouTubeId;
        }
        return;
      }

      // تهيئة مشغل جديد كلياً
      if (containerRef.current) {
        containerRef.current.innerHTML = '<div id="youtube-player-element"></div>';
        playerRef.current = null; // تصفير المرجع القديم لضمان التهيئة الصحيحة
        
        playerRef.current = new YT.Player('youtube-player-element', {
          height: '100%',
          width: '100%',
          videoId: currentYouTubeId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            enablejsapi: 1,
            start: startSecs
          },
          events: {
            onStateChange: onPlayerStateChange,
            onReady: (e: any) => {
              e.target.playVideo();
              internalPlayingId.current = currentYouTubeId;
            },
            onError: () => {
              internalPlayingId.current = null;
              playerRef.current = null;
            }
          }
        });
      }
    };

    const YT = (window as any).YT;
    if (YT && YT.Player) {
      startPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = startPlayer;
    }

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [currentYouTubeId, mounted, onPlayerStateChange, videoProgress]);
>>>>>>> 98c1c5d968cac60f9715bedd21fe0759356127b9

  if (!mounted) return null;

  const isActive = activeVideo || activeIptv;
  const displayImage = activeIptv ? activeIptv.stream_icon : (channelIcon || activeVideo?.thumbnail || "");

  return (
    <div 
      className={cn(
        "fixed z-[9999] shadow-2xl overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
        !isActive ? "top-[-9999px] left-[-9999px] opacity-0" :
        isMinimized ? "bottom-12 left-1/2 -translate-x-1/2 w-[500px] h-28 rounded-[2.5rem] premium-glass" : 
        isFullScreen ? "inset-0 w-full h-full bg-black rounded-0" : "bottom-8 right-4 w-[50vw] h-[55vh] premium-glass rounded-[3.5rem] bg-black/95"
      )} 
<<<<<<< HEAD
      style={{ 
        transform: isActive && !isMinimized && !isFullScreen ? 'translate3d(0,0,0)' : 'none', 
        contain: 'layout paint',
        backfaceVisibility: 'hidden',
        willChange: 'transform, width, height'
      }}
=======
>>>>>>> 98c1c5d968cac60f9715bedd21fe0759356127b9
    >
      <div className={cn("absolute inset-0 transition-opacity duration-500", isMinimized ? "opacity-0 pointer-events-none" : "opacity-100")}>
        {currentYouTubeId ? (
          <div ref={containerRef} className="w-full h-full bg-black" />
        ) : (
          <iframe 
            key={activeIptv?.stream_id}
            src={activeIptv ? `${activeIptv.url}${activeIptv.url?.includes('?') ? '&' : '?'}autoplay=1&mute=0` : ''} 
            className="w-full h-full border-none" 
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen" 
          />
        )}
      </div>

      {isMinimized && isActive && (
        <div className="h-full flex items-center justify-between px-8 relative z-10 cursor-pointer" onClick={() => setIsFullScreen(true)}>
          <div className="flex items-center gap-4 flex-1 min-w-0 text-right">
            <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/10 bg-zinc-900 shadow-xl">
              {displayImage && <Image src={displayImage} alt="" fill className="object-cover" />}
            </div>
            <div className="flex flex-col">
              <h4 className="text-base font-black text-white truncate max-w-[200px]">{activeVideo?.title || activeIptv?.name}</h4>
<<<<<<< HEAD
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-accent font-black uppercase tracking-widest">Background Transmission</span>
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              </div>
=======
              <span className="text-[9px] text-accent font-black uppercase tracking-widest">Background Transmission</span>
>>>>>>> 98c1c5d968cac60f9715bedd21fe0759356127b9
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={(e) => { 
              e.stopPropagation(); 
              if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
                isPlaying ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
              }
              setIsPlaying(!isPlaying); 
            }} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/10 focusable">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
            </button>
            <button onClick={(e) => { 
              e.stopPropagation(); 
              setActiveVideo(null); 
              setActiveIptv(null);
              if (containerRef.current) containerRef.current.innerHTML = '';
              playerRef.current = null;
            }} className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center focusable"><X className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      {!isMinimized && isActive && (
<<<<<<< HEAD
        <div className={cn(
          "fixed z-[5200] flex items-center transition-all duration-500",
          isFullScreen ? "left-10 bottom-10 scale-150 origin-bottom-left" : "right-12 bottom-12 scale-90"
        )} style={{ transform: 'translate3d(0,0,0)' }}>
          <div className={cn(
            "flex items-center premium-glass p-2 rounded-full border border-white/20 shadow-2xl overflow-hidden backdrop-blur-3xl transition-all duration-500",
            isControlsExpanded ? "gap-2 px-3" : "w-16 h-16 justify-center"
          )}>
=======
        <div className={cn("fixed z-[5200] flex items-center transition-all duration-500", isFullScreen ? "left-10 bottom-10 scale-150 origin-bottom-left" : "right-12 bottom-12 scale-90")}>
          <div className={cn("flex items-center premium-glass p-2 rounded-full border border-white/20 shadow-2xl overflow-hidden backdrop-blur-3xl transition-all duration-500", isControlsExpanded ? "gap-2 px-3" : "w-16 h-16 justify-center")}>
>>>>>>> 98c1c5d968cac60f9715bedd21fe0759356127b9
            {!isControlsExpanded ? (
              <button onClick={() => setIsControlsExpanded(true)} className="w-12 h-12 rounded-full bg-primary shadow-glow text-white flex items-center justify-center focusable">
                <Settings className="w-7 h-7" />
              </button>
            ) : (
              <>
                <button onClick={() => setIsControlsExpanded(false)} className="w-12 h-12 rounded-full bg-white/10 text-white/40 flex items-center justify-center focusable"><ChevronRight className="w-6 h-6" /></button>
                {activeVideo && (
                  <>
                    <button onClick={() => toggleSaveVideo(activeVideo)} className={cn("w-12 h-12 rounded-full flex items-center justify-center focusable", isYouTubeSaved ? "bg-primary text-white shadow-glow" : "bg-white/5 text-white/40")}><Bookmark className={cn("w-5 h-5", isYouTubeSaved && "fill-current")} /></button>
                    <div className="w-px h-8 bg-white/20 mx-1" />
                    <button onClick={prevTrack} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center focusable"><ChevronRight className="w-6 h-6" /></button>
                    <button onClick={nextTrack} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center focusable"><ChevronLeft className="w-6 h-6" /></button>
                  </>
                )}
                <div className="w-px h-8 bg-white/20 mx-1" />
                <button onClick={() => setIsMinimized(true)} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center focusable"><ChevronDown className="w-5 h-5" /></button>
                <button onClick={() => setIsFullScreen(!isFullScreen)} className={cn("w-12 h-12 rounded-full flex items-center justify-center focusable", isFullScreen && "bg-primary shadow-glow")}><Monitor className="w-5 h-5" /></button>
                <button onClick={() => { 
                  setActiveVideo(null); 
                  setActiveIptv(null);
                  if (containerRef.current) containerRef.current.innerHTML = '';
                  playerRef.current = null;
                }} className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center focusable"><X className="w-5 h-5" /></button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}