
"use client";

import { LayoutDashboard, Radio, Settings, ArrowLeft, Trophy, ArrowRightLeft, Tv, BookOpen } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMediaStore, AppAction } from "@/lib/store";

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
  const hardwarePriority = ['Red', 'Green', 'Yellow', 'Blue', 'ChannelUp', 'ChannelDown', 'Back', 'Exit', '1', '3', '7', '9', '0'];
  const found = hardwarePriority.find(hw => keys.some(k => k.toLowerCase() === hw.toLowerCase()));
  if (found) return found;
  return keys[0];
}

export function ShortcutBadge({ action, className }: { action: AppAction, className?: string }) {
  const { keyMappings } = useMediaStore();
  const keys = keyMappings.global?.[action] || keyMappings.media?.[action] || keyMappings.quran?.[action] || [];
  const displayKey = getPriorityKey(keys);
  if (!displayKey) return null;
  
  const shortKey = displayKey.length > 4 ? displayKey.substring(0, 3) : displayKey;
  
  const colorClasses: Record<string, string> = {
    'Red': 'bg-red-600 text-white',
    'Green': 'bg-green-600 text-white',
    'Yellow': 'bg-yellow-500 text-black',
    'Blue': 'bg-blue-600 text-white',
    '1': 'bg-zinc-800 text-white border-white/20',
    '3': 'bg-zinc-800 text-white border-white/20',
    '7': 'bg-zinc-800 text-white border-white/20',
    '9': 'bg-zinc-800 text-white border-white/20',
    '0': 'bg-zinc-800 text-white border-white/20'
  };
  
  const badgeClass = colorClasses[displayKey] || 'bg-white text-black';
  
  return (
    <div className={cn(
      "absolute -bottom-1 -left-1 text-[9px] font-black px-2 py-0.5 rounded-md shadow-glow z-[200] uppercase border border-black/10 transition-all duration-300 flex items-center gap-1",
      badgeClass,
      className
    )}>
      <span className="opacity-90 font-black text-[10px]">زر</span>
      <span className="font-black text-[10px]">{shortKey}</span>
    </div>
  );
}

export function CarDock() {
  const pathname = usePathname();
  const router = useRouter();
  const { dockSide, toggleDockSide, resetMediaView } = useMediaStore();

  const apps = [
    { name: "Home", href: "/", icon: LayoutDashboard, color: "bg-blue-600", action: "goto_home" as AppAction },
    { name: "Media", href: "/media", icon: Radio, color: "bg-red-500", action: "goto_media" as AppAction },
    { name: "Quran", href: "/quran", icon: BookOpen, color: "bg-blue-900", action: "goto_quran" as AppAction },
    { name: "Hihi2", href: "/hihi2", icon: FootballBallIcon, color: "bg-amber-600", action: "goto_hihi2" as AppAction },
    { name: "IPTV", href: "/iptv", icon: Tv, color: "bg-emerald-600", action: "goto_iptv" as AppAction },
    { name: "Football", href: "/football", icon: Trophy, color: "bg-orange-600", action: "goto_football" as AppAction },
    { name: "Settings", href: "/settings", icon: Settings, color: "bg-zinc-700", action: "goto_settings" as AppAction },
  ];

  return (
    <div className={cn(
      "fixed z-[150] transition-all duration-700",
      "bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-3xl border-t border-white/5 flex flex-row items-center justify-around px-4 md:fixed md:top-0 md:h-screen md:w-20 md:flex-col md:py-6 md:gap-0",
      dockSide === 'left' ? "md:left-0 md:border-r" : "md:right-0 md:border-l"
    )}>
      <div className="flex flex-row md:flex-col items-center flex-1 justify-around md:justify-start">
        {apps.map((app) => {
          const isActive = pathname === app.href;
          return (
            <button
              key={app.name}
              onClick={() => { if (pathname === '/media' && app.href === '/media') resetMediaView(); router.push(app.href); }}
              data-nav-id={`dock-${app.name}`}
              className={cn(
                "w-12 h-12 md:w-14 md:h-14 rounded-[1.2rem] flex items-center justify-center transition-all relative focusable outline-none mb-1 md:mb-2",
                app.color, isActive ? "scale-110 shadow-glow ring-2 ring-white/20 z-50" : "hover:scale-105"
              )}
            >
              <ShortcutBadge action={app.action} />
              <div className={cn("transition-all duration-500 flex items-center justify-center", !isActive && "opacity-40 grayscale")}>
                <app.icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
              </div>
            </button>
          );
        })}
      </div>
      <div className="hidden md:flex mt-auto flex-col items-center gap-2">
        <button onClick={toggleDockSide} data-nav-id="dock-action-toggle" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white/40 focusable flex items-center justify-center relative"><ArrowRightLeft className="w-6 h-6" /></button>
        <button onClick={() => router.back()} data-nav-id="dock-action-back" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white/40 focusable flex items-center justify-center relative">
          <div className="opacity-40 grayscale"><ArrowLeft className="w-6 h-6" /></div>
        </button>
      </div>
    </div>
  );
}
