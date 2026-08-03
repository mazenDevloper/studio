
"use client";

import { useMediaStore } from "@/lib/store";
import { SovereignIframe } from "@/components/ui/sovereign-iframe";

/**
 * Simplified QuranView v5.0 - Sovereign Auto-Play Engine
 * Uses SovereignIframe to bypass root refusal and ensure background audio stability.
 */
export function QuranView() {
  const { activeQuranUrl } = useMediaStore();

  return (
    <div className="w-full h-full bg-black relative">
      {activeQuranUrl && (
        <SovereignIframe 
          src={`${activeQuranUrl}${activeQuranUrl.includes('?') ? '&' : '?'}autoplay=1`} 
          title="Quran Radio" 
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none" />
    </div>
  );
}
