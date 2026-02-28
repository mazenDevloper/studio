
"use client";

import { LayoutDashboard, Radio, Settings, GripVertical, ArrowLeft, Trophy, ArrowRightLeft } from "lucide-react";
import Link from "next/navigation";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useMediaStore } from "@/lib/store";

export function CarDock() {
  const pathname = usePathname();
  const router = useRouter();
  const { dockSide, toggleDockSide } = useMediaStore();

  const apps = [
    { name: "Home", href: "/", icon: LayoutDashboard, color: "bg-blue-600" },
    { name: "Media", href: "/media", icon: Radio, color: "bg-red-500" },
    { name: "Football", href: "/football", icon: Trophy, color: "bg-orange-600" },
    { name: "Settings", href: "/settings", icon: Settings, color: "bg-zinc-700" },
  ];

  // Smart Initial Focus: Target the Media icon on startup
  useEffect(() => {
    const timer = setTimeout(() => {
      const mediaIcon = document.querySelector('[data-nav-id="dock-Media"]') as HTMLElement;
      if (mediaIcon) mediaIcon.focus();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

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
            onClick={() => router.push(app.href)}
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
