
"use client";

import { useMediaStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * GlobalQuranPlayer - يعمل في الخلفية لضمان استمرار الصوت عند التنقل
 * يتم تغيير موقعه برمجياً بدلاً من حذفه لضمان عدم انقطاع الصوت
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
      <iframe
        src={`${activeQuranUrl}${activeQuranUrl.includes('?') ? '&' : '?'}autoplay=1`}
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        className="w-full h-full border-none"
        style={{ background: '#000' }}
      />
    </div>
  );
}
