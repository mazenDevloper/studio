
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useMediaStore } from '@/lib/store';

/**
 * Sovereign Resiliency Hook v1.1
 * Manages the transition between Proxy Audio and IFrame Fallback with state syncing.
 */
export function useAudioPlayer() {
  const { activeAudio, isPlaying, setIsPlaying } = useMediaStore();
  const [isFallback, setIsFallback] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [loading, setLoading] = useState(false);

  const switchToFallback = useCallback(() => {
    if (!isFallback) {
      console.warn("[Sovereign Audio] Primary stream failed. Switching to IFrame Fallback Protocol.");
      setIsFallback(true);
      setLoading(false);
    }
  }, [isFallback]);

  useEffect(() => {
    // Reset fallback state when track changes to try primary engine again
    setIsFallback(false);
    setLoading(true);
  }, [activeAudio?.id]);

  const handlePlayPause = useCallback(() => {
    if (isFallback) {
      // Logic for fallback is handled by the component's IFrame reload/control
      setIsPlaying(!isPlaying);
      return;
    }

    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(switchToFallback);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, isFallback, setIsPlaying, switchToFallback]);

  return { 
    audioRef, 
    isFallback, 
    loading, 
    setLoading, 
    handlePlayPause, 
    switchToFallback 
  };
}
