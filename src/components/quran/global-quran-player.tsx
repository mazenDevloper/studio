
"use client";

import { useMediaStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SovereignIframe } from "@/components/ui/sovereign-iframe";
import { useQuranTab } from "@/components/quran/quran-view";

/**
 * GlobalQuranPlayer v5.0 - Background Persistence Engine
 * Uses SovereignIframe for robust cross-page audio maintenance.
 */
export function GlobalQuranPlayer() {
  const { activeQuranUrl } = useMediaStore();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const quranTab = useQuranTab(s => s.tab);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !activeQuranUrl) return null;

  // full screen on the Quran screen's radio tab; anywhere else (and on the Mushaf tab) it plays hidden
  const isQuranPage = pathname === '/quran' && quranTab === 'radio';

  return (
    <div 
      className={cn(
        "fixed transition-all duration-0 ease-linear",
        isQuranPage 
          ? "inset-x-0 bottom-0 top-16 z-0 w-full" 
          : "offscreen-hidden w-1 h-1"
      )}
    >
      <SovereignIframe
        src={`${activeQuranUrl}${activeQuranUrl.includes('?') ? '&' : '?'}autoplay=1`}
        title="Background Quran Engine"
      />
    </div>
  );
}
