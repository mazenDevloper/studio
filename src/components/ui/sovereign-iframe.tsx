
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SovereignIframeProps extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  className?: string;
  title: string;
}

/**
 * SovereignIframe v150.0 - Full Navigation Shield & Autoplay Enable
 * Sets a fixed name to encourage internal navigation and uses sandbox to PREVENT new tabs.
 * Added muted: false hints where applicable.
 */
export function SovereignIframe({ src, className, title, ...props }: SovereignIframeProps) {
  const isYouTube = src?.includes('youtube') || src?.includes('youtu.be');

  return (
    <div className={cn("w-full h-full relative bg-black overflow-hidden", className)}>
      <iframe
        src={src}
        title={title}
        name="sovereign-frame"
        className="w-full h-full border-none absolute inset-0"
        loading="eager"
        referrerPolicy={isYouTube ? "strict-origin-when-cross-origin" : "no-referrer"}
        // Restricted Sandbox: Omit 'allow-popups' to force local navigation
        sandbox="allow-forms allow-scripts allow-same-origin allow-presentation allow-pointer-lock allow-top-navigation-by-user-activation"
        // Allow necessary features for streaming and unmuting
        allow="autoplay; fullscreen; clipboard-write; encrypted-media; picture-in-picture; web-share; accelerometer; gyroscope; microphone; camera; display-capture"
        {...props}
      />
      {/* Decorative inner shadow to match Sovereign UI */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
    </div>
  );
}

