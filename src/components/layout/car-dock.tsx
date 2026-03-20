
"use client";

import { LayoutDashboard, Radio, Settings, GripVertical, ArrowLeft, Trophy, ArrowRightLeft, Tv, BookOpen } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useMediaStore } from "@/lib/store";

export function CarDock() {
  const pathname = usePathname();
  const router = useRouter();
  const { dockSide, toggleDockSide, setDockSide, resetMediaView } = useMediaStore();

  const apps = [
    { name: "Home", href: "/", icon: LayoutDashboard, color: "bg-blue-600" },
    { name: "Media", href: "/media", icon: Radio, color: "bg-red-500" },
    { name: "Quran", href: "/quran", icon: BookOpen, color: "bg-blue-900" },
    { name: "IPTV", href: "/iptv", icon: Tv, color: "bg-emerald-600" },
    { name: "Football", href: "/football", icon: Trophy, color: "bg-orange-600" },
    { name: "Settings", href: "/settings", icon: Settings, color: "bg-zinc-700" },
  ];

  // Auto-Right side if width < 1080
  useEffect(() => {
    const checkWidth = () => {
      if (window.innerWidth < 1080) {
        setDockSide('right');
      }
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, [setDockSide]);

  const handleAppClick = (app: any) => {
    // If clicking "Media" while already on Media page, reset the view
    if (pathname === '/media' && app.href === '/media') {
      resetMediaView();
    }
    router.push(app.href);
  };

  // Smart Focus Transition Logic
  useEffect(() => {
    const timer = setTimeout(() => {
      let target: HTMLElement | null = null;
      
      if (pathname === '/') {
        target = document.querySelector('[data-nav-id="moon-widget-container"]') as HTMLElement;
      } else if (pathname === '/media') {
        target = document.querySelector('[data-nav-id="fav-channel-0"]') as HTMLElement || 
                 document.querySelector('[data-nav-id="add-channel-btn"]') as HTMLElement;
      } else if (pathname === '/quran') {
        target = document.querySelector('[data-nav-id="quran-selector-trigger"]') as HTMLElement;
      } else if (pathname === '/iptv') {
        target = document.querySelector('[data-nav-id="iptv-channel-0"]') as HTMLElement || 
                 document.querySelector('[data-nav-id="iptv-cat-0"]') as HTMLElement;
      } else if (pathname === '/football') {
        target = document.querySelector('.focusable[data-nav-id^="match-"]') as HTMLElement || 
                 document.querySelector('[role="tablist"] [role="tab"]:nth-child(2)') as HTMLElement;
      } else if (pathname === '/settings') {
        target = document.querySelector('[role="tablist"] [role="tab"]:first-child') as HTMLElement;
      }

      if (!target) {
        target = document.querySelector('main .focusable:not([data-nav-id^="dock-"])') as HTMLElement;
      }

      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div className={cn(
      "fixed z-[100] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
      "bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-3xl border-t border-white/5 flex flex-row items-center justify-around px-4 md:fixed md:top-0 md:h-screen md:w-24 md:flex-col md:py-8 md:gap-8",
      dockSide === 'left' 
        ? "md:left-0 md:right-auto md:border-r md:shadow-[20px_0_50px_rgba(0,0,0,0.8)]" 
        : "md:right-0 md:left-auto md:border-l md:shadow-[-20px_0_50px_rgba(0,0,0,0.8)]"
    )}>
      <div className="hidden md:block mb-2">
        <GripVertical className="text-white/10 w-6 h-6" />
      </div>

      <div className="flex flex-row md:flex-col items-center gap-4 md:gap-6 flex-1 justify-around md:justify-start">
        {apps.map((app) => (
          <button
            key={app.name}
            onClick={() => handleAppClick(app)}
            data-nav-id={`dock-${app.name}`}
            className={cn(
              "w-12 h-12 md:w-14 md:h-14 rounded-[1.2rem] flex items-center justify-center transition-all duration-500 relative group focusable outline-none",
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

      <div className="hidden md:flex mt-auto flex-col items-center gap-6">
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
