
"use client";

import { LayoutDashboard, Radio, Settings, ArrowLeft, Trophy, ArrowRightLeft, Tv, BookOpen } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMediaStore } from "@/lib/store";

const FootballBallIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
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

export function CarDock() {
  const pathname = usePathname();
  const router = useRouter();
  const { dockSide, toggleDockSide, resetMediaView } = useMediaStore();

  const apps = [
    { name: "Home", href: "/", icon: LayoutDashboard, color: "bg-blue-600" },
    { name: "Media", href: "/media", icon: Radio, color: "bg-red-500" },
    { name: "Quran", href: "/quran", icon: BookOpen, color: "bg-blue-900" },
    { name: "Hihi2", href: "/hihi2", icon: FootballBallIcon, color: "bg-amber-600" }, // Order 4
    { name: "IPTV", href: "/iptv", icon: Tv, color: "bg-emerald-600" },
    { name: "Football", href: "/football", icon: Trophy, color: "bg-orange-600" },
    { name: "Settings", href: "/settings", icon: Settings, color: "bg-zinc-700" },
  ];

  const handleAppClick = (app: any) => {
    if (pathname === '/media' && app.href === '/media') {
      resetMediaView();
    }
    router.push(app.href);
  };

  return (
    <div className={cn(
      "fixed z-[150] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
      "bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-3xl border-t border-white/5 flex flex-row items-center justify-around px-4 md:fixed md:top-0 md:h-screen md:w-20 md:flex-col md:py-6 md:gap-0",
      dockSide === 'left' 
        ? "md:left-0 md:right-auto md:border-r md:shadow-[20px_0_50px_rgba(0,0,0,0.8)]" 
        : "md:right-0 md:left-auto md:border-l md:shadow-[-20px_0_50px_rgba(0,0,0,0.8)]"
    )}>
      <div className="flex flex-row md:flex-col items-center gap-0 flex-1 justify-around md:justify-start">
        {apps.map((app) => (
          <button
            key={app.name}
            onClick={() => handleAppClick(app)}
            data-nav-id={`dock-${app.name}`}
            className={cn(
              "w-12 h-12 md:w-14 md:h-14 rounded-[1.2rem] flex items-center justify-center transition-all duration-500 relative group focusable outline-none mb-1 md:mb-2",
              app.color,
              pathname === app.href 
                ? "scale-110 shadow-[0_0_25px_rgba(255,255,255,0.2)] ring-2 ring-white/20" 
                : "opacity-40 grayscale hover:opacity-100 focus:opacity-100"
            )}
          >
            <app.icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
            {pathname === app.href && (
              <div className={cn(
                "absolute rounded-full shadow-[0_0_10px_white] bg-white",
                "bottom-2 w-6 h-1 md:w-1.5 md:h-6",
                dockSide === 'left' ? "md:-right-6 md:bottom-auto" : "md:-left-6 md:bottom-auto"
              )} />
            )}
          </button>
        ))}
      </div>

      <div className="hidden md:flex mt-auto flex-col items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDockSide}
          className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white/40 focusable"
          title="تبديل جهة شريط المهام"
        >
          <ArrowRightLeft className="w-6 h-6" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white/40 focusable"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
