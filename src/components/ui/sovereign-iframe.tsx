'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface SovereignIframeProps extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  className?: string;
  title: string;
}

/**
 * SovereignIframe v230.0 - Anti-Popup Shield & Unmute Engine
 * Features: Stripped allow-popups to kill unwanted windows + SOVEREIGN_UNMUTE logic.
 */
export function SovereignIframe({ src, className, title, ...props }: SovereignIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isYouTube = src?.includes('youtube') || src?.includes('youtu.be');

  useEffect(() => {
    if (isYouTube) return;

    const handleUnmute = () => {
      try {
        const frame = iframeRef.current;
        if (!frame || !frame.contentWindow) return;
        frame.contentWindow.postMessage({ type: 'SOVEREIGN_UNMUTE_TRIGGER' }, '*');
      } catch (e) {}
    };

    const timer = setTimeout(handleUnmute, 3000);
    return () => clearTimeout(timer);
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
        // CRITICAL: allow-popups removed to prevent new windows
        sandbox="allow-forms allow-scripts allow-same-origin allow-presentation allow-pointer-lock allow-top-navigation-by-user-activation"
        allow="autoplay; fullscreen; clipboard-write; encrypted-media; picture-in-picture; web-share; accelerometer; gyroscope; microphone; camera; display-capture"
        {...props}
      />
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
    </div>
  );
}
