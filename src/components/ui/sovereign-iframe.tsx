
'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface SovereignIframeProps extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  className?: string;
  title: string;
}

/**
 * SovereignIframe v240.0 - Unmute & Autoplay Engine
 * Features: 
 * 1. Persistent Unmute Heartbeat: Periodically sends unmute/play commands via postMessage.
 * 2. Permissive Sandbox: Ensures scripts and presentations work across all browsers.
 */
export function SovereignIframe({ src, className, title, ...props }: SovereignIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isYouTube = src?.includes('youtube') || src?.includes('youtu.be');

  useEffect(() => {
    // Persistent Unmute Engine - Essential for bypassing browser root refusals
    const pulseCommands = () => {
      try {
        const frame = iframeRef.current;
        if (!frame || !frame.contentWindow) return;

        // Command Pack A: YouTube API Compatibility
        if (isYouTube) {
          const ytCmd = JSON.stringify({ event: 'command', func: 'unMute', args: '' });
          const ytPlay = JSON.stringify({ event: 'command', func: 'playVideo', args: '' });
          frame.contentWindow.postMessage(ytCmd, '*');
          frame.contentWindow.postMessage(ytPlay, '*');
        }

        // Command Pack B: Generic HTML5 / Mangomolo Compatibility
        frame.contentWindow.postMessage({ type: 'SOVEREIGN_UNMUTE_TRIGGER' }, '*');
        frame.contentWindow.postMessage({ type: 'unmute' }, '*');
        frame.contentWindow.postMessage({ type: 'play' }, '*');
        
        // Command Pack C: Direct physical activation bypass
        frame.contentWindow.postMessage('unmute', '*');
      } catch (e) {
        // Silent catch for cross-origin errors
      }
    };

    // Initial burst then periodic pulse
    const timer1 = setTimeout(pulseCommands, 1000);
    const timer2 = setTimeout(pulseCommands, 3000);
    const interval = setInterval(pulseCommands, 5000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearInterval(interval);
    };
  }, [src, isYouTube]);

  return (
    <div className={cn("w-full h-full relative bg-black overflow-hidden", className)}>
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        name="sovereign-frame"
        className="w-full h-full border-none absolute inset-0"
        loading="eager"
        referrerPolicy={isYouTube ? "strict-origin-when-cross-origin" : "no-referrer"}
        // sandbox allows essential operations while keeping the frame isolated
        sandbox="allow-forms allow-scripts allow-same-origin allow-presentation allow-pointer-lock allow-top-navigation-by-user-activation"
        // allow attribute is critical for autoplay and fullscreen bypass
        allow="autoplay; fullscreen; clipboard-write; encrypted-media; picture-in-picture; web-share; accelerometer; gyroscope; microphone; camera; display-capture"
        {...props}
      />
      {/* Visual inner shadow for depth */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
    </div>
  );
}
