
"use client";

import { LayoutDashboard, Radio, Settings, ArrowLeft, Trophy, ArrowRightLeft, Tv, BookOpen } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMediaStore, AppAction, MappingContext } from "@/lib/store";
import { useEffect, useState } from "react";

const FootballBallIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="m12 12-4-2.5" />
    <path d="m12 12 4-2.5" />
    <path d="M12 12v5" />
    <path d="m12 7-1.5 2.5 1.5 2.5 1.5-2.5z" />
    <path d="m12 17-2-3 2-3 2 3z" />
    <path d="m8 9.5-3 1 1.5 3.5 3-1z" />
    <path d="m16 9.5 3 1-1.5 3.5-3-1z" />
  </svg>
);

function getPriorityKey(keys: string[]): string | null {
  if (!keys || keys.length === 0) return null;
  const hardwarePriority = ['Red', 'Green', 'Yellow', 'Blue', 'Sub', 'Back', 'Exit', '1', '3', '7', '9', '0', '2', '4', '5', '6', '8', 'Info'];
  const found = hardwarePriority.find(hw => keys.some(k => k.toLowerCase() === hw.toLowerCase()));
  return found || keys[0];
}

export function ShortcutBadge({ action, className, context = 'default' }: { action: AppAction, className?: string, context?: 'dock' | 'player' | 'default' }) {
  const pathname = usePathname();
  const { keyMappings, activeVideo, activeIptv, isFullScreen, isMinimized } = useMediaStore();
  const isPlayerActive = (activeVideo || activeIptv) && isFullScreen && !isMinimized;
  
  const screenMap: Record<string, MappingContext> = { 
    '/': 'dashboard', '/media': 'media', '/quran': 'quran', 
    '/football': 'football', '/iptv': 'iptv', '/settings': 'settings' 
  };
  const pageCtx = screenMap[pathname] || 'global';

  let keys: string[] = [];
  if (isPlayerActive) {
    keys = keyMappings.player?.[action] || [];
  } else {
    keys = keyMappings[pageCtx]?.[action] || keyMappings.global?.[action] || [];
  }

  const displayKey = getPriorityKey(keys);
  if (!displayKey) return null;
  
  const shortKey = displayKey.length > 5 ? displayKey.substring(0, 4) : displayKey;
  const isColor = ['Red', 'Green', 'Yellow', 'Blue'].includes(displayKey);
  const isNumber = /^\d$/.test(displayKey);
  const isHardware = ['Sub', 'Info', 'Back', 'Exit'].includes(displayKey);
  const isWhiteButton = !isColor && !isNumber && !isHardware;
  const scale = context === 'dock' ? 1.45 : context === 'player' ? 1.15 : 1.0;
  
  return (
    <div className={cn("absolute z-[200] flex items-center justify-center transition-all duration-0 -bottom-4 -left-4", isColor ? "rounded-[0.6rem]" : "rounded-full", displayKey === 'Red' && "bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)]", displayKey === 'Green' && "bg-green-600 shadow-[0_0_15px_rgba(22,163,74,0.8)]", displayKey === 'Yellow' && "bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.8)]", displayKey === 'Blue' && "bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.8)]", (isNumber || isHardware) && "bg-zinc-800 border-2 border-zinc-600 shadow-2xl", isWhiteButton && "bg-white text-black shadow-glow", className)} style={{ width: isColor ? `${36 * scale}px` : `${30 * scale}px`, height: isColor ? `${26 * scale}px` : `${30 * scale}px` }}>
      <div className="flex flex-col items-center leading-none" style={{ transform: `scale(${scale * 0.85})` }}>
        <span className={cn("font-black uppercase tracking-tighter mb-0.5", (displayKey === 'Yellow' || isWhiteButton) ? "text-black" : "text-white")} style={{ fontSize: '7.5px' }}>زر</span>
        <span className={cn("font-black tracking-tight", (displayKey === 'Yellow' || isWhiteButton) ? "text-black" : "text-white")} style={{ fontSize: '10px' }}>{shortKey}</span>
      </div>
    </div>
  );
}

export function CarDock() {
  const pathname = usePathname();
  const router = useRouter();
  const { dockSide, toggleDockSide, resetMediaView, dockScale, setDockScale } = useMediaStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && (dockScale === 1.0 || !dockScale)) setDockScale(1.0);
  }, [dockScale, setDockScale]);

  const apps = [
    { name: "Home", href: "/", icon: LayoutDashboard, action: "goto_home" as AppAction },
    { name: "Media", href: "/media", icon: Radio, action: "goto_media" as AppAction },
    { name: "Quran", href: "/quran", icon: BookOpen, action: "goto_quran" as AppAction },
    { name: "Hihi2", href: "/hihi2", icon: FootballBallIcon, action: "goto_hihi2" as AppAction },
    { name: "IPTV", href: "/iptv", icon: Tv, action: "goto_iptv" as AppAction },
    { name: "Football", href: "/football", icon: Trophy, action: "goto_football" as AppAction },
    { name: "Settings", href: "/settings", icon: Settings, action: "goto_settings" as AppAction },
  ];

  return (
    <div className={cn("fixed top-0 bottom-0 z-[150] transition-all duration-0 bg-black/80 backdrop-blur-3xl flex flex-col py-6 border-white/5", "w-16 min-[980px]:w-20", dockSide === 'left' ? "left-0 border-r" : "right-0 border-l")} style={{ zoom: mounted ? (dockScale || 1.0) : 1.0, willChange: 'transform' }}>
      <div className="flex flex-col items-center flex-1 justify-start gap-2">
        {apps.map((app) => {
          const isActive = pathname === app.href;
          return (
            <button key={app.name} onClick={() => { if (pathname === '/media' && app.href === '/media') resetMediaView(); router.push(app.href); }} data-nav-id={`dock-${app.name}`} className={cn("w-12 h-12 min-[980px]:w-14 min-[980px]:h-14 rounded-[1.5rem] flex items-center justify-center transition-all duration-0 relative focusable outline-none mb-3", isActive ? "bg-blue-600/10 shadow-[0_0_30px_rgba(37,99,235,0.2)] border border-blue-500/20 z-50 scale-110" : "bg-transparent")}>
              <ShortcutBadge action={app.action} context="dock" />
              <div className={cn("transition-all duration-0 flex items-center justify-center", isActive ? "text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]" : "text-white")}><app.icon className="w-6 h-6 min-[980px]:w-7 min-[980px]:h-7" /></div>
            </button>
          );
        })}
      </div>
      <div className="flex mt-auto flex-col items-center gap-3">
        <button onClick={toggleDockSide} className="w-10 h-10 min-[980px]:w-12 min-[980px]:h-12 rounded-full bg-white/5 border border-white/10 text-white focusable flex items-center justify-center relative"><ArrowRightLeft className="w-5 h-5 min-[980px]:w-6 min-[980px]:h-6" /></button>
        <button onClick={() => router.back()} className="w-10 h-10 min-[980px]:w-12 min-[980px]:h-12 rounded-full bg-white/5 border border-white/10 text-white focusable flex items-center justify-center relative"><ArrowLeft className="w-5 h-5 min-[980px]:w-6 min-[980px]:h-6" /></button>
      </div>
    </div>
  );
}
