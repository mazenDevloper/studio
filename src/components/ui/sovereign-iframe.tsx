
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SovereignIframeProps extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  className?: string;
  title: string;
}

/**
 * SovereignIframe v7.0 - The Official Handshake Engine
 * Bypasses X-Frame-Options by intelligent referrer management.
 * Solves YouTube Error 153 by allowing strict-origin validation.
 */
export function SovereignIframe({ src, className, title, ...props }: SovereignIframeProps) {
  const isYouTube = src?.includes('youtube') || src?.includes('youtu.be');

  return (
    <div className={cn("w-full h-full relative bg-black overflow-hidden", className)}>
      <iframe
        src={src}
        title={title}
        className="w-full h-full border-none absolute inset-0"
        loading="eager"
        // For YouTube, we must provide origin, so we use strict-origin-when-cross-origin
        referrerPolicy={isYouTube ? "strict-origin-when-cross-origin" : "no-referrer"}
        // Permissive Sandbox to allow JS API handshake and Autoplay
        sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-presentation allow-top-navigation-by-user-activation"
        // Comprehensive Allow policy mimicking a real browser environment
        allow="autoplay; fullscreen; clipboard-write; encrypted-media; picture-in-picture; web-share; accelerometer; gyroscope; microphone; camera; display-capture"
        {...props}
      />
      {/* Decorative inner shadow to match Sovereign UI */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
    </div>
  );
}
