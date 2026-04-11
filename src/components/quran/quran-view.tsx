
"use client";

import { useMediaStore } from "@/lib/store";
import { useEffect } from "react";

/**
 * Simplified QuranView v36.0 - Pure Iframe Experience
 * Everything removed except the content iframe.
 */
export function QuranView() {
  const { activeQuranUrl } = useMediaStore();

  return (
    <div className="w-full h-full bg-black">
      {activeQuranUrl && (
        <iframe
          src={`${activeQuranUrl}${activeQuranUrl.includes('?') ? '&' : '?'}autoplay=1`}
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          className="w-full h-full border-none"
          style={{ background: '#000' }}
        />
      )}
    </div>
  );
}
