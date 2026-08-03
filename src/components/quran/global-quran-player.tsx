
"use client";

import { useMediaStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SovereignIframe } from "@/components/ui/sovereign-iframe";

/**
 * GlobalQuranPlayer v5.0 - Background Persistence Engine
 * Uses SovereignIframe for robust cross-page audio maintenance.
 */
export function GlobalQuranPlayer() {
  const { activeQuranUrl } = useMediaStore();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !activeQuranUrl) return null;

  const isQuranPage = pathname === '/quran';

  return (
    <div 
      className={cn(
        "fixed transition-all duration-0 ease-linear",
        isQuranPage 
          ? "inset-0 z-0 w-full h-full" 
          : "top-[-9999px] left-[-9999px] w-1 h-1 opacity-0 pointer-events-none overflow-hidden"
      )}
    >
      <SovereignIframe
        src={`${activeQuranUrl}${activeQuranUrl.includes('?') ? '&' : '?'}autoplay=1`}
        title="Background Quran Engine"
      />
    </div>
  );
}
