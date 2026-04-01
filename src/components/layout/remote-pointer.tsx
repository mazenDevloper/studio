
"use client";

import { useEffect, useCallback, useState } from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useMediaStore } from "@/lib/store";
import { init } from "@noriginmedia/norigin-spatial-navigation";

export function RemotePointer() {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { activeIptv, isFullScreen, nextIptvChannel, prevIptvChannel, wallPlateType, setWallPlate, dockSide } = useMediaStore();

  useEffect(() => {
    try { init({ debug: false, visualDebug: false }); } 
    catch (e) { console.warn("Spatial Navigation Init Error:", e); }
  }, []);

  useEffect(() => {
    const keepFocus = () => {
      const current = document.activeElement;
      if (!current || current === document.body || !current.classList.contains('focusable')) {
        let target: HTMLElement | null = null;
        if (pathname === '/') target = document.querySelector('[data-nav-id="car-visualizer-container"]') as HTMLElement;
        else if (pathname === '/media') target = document.querySelector('[data-nav-id="subs-all"]') as HTMLElement;
        else if (pathname === '/iptv') target = document.querySelector('[data-nav-id="iptv-cat-0"]') as HTMLElement;
        else target = document.querySelector('.focusable') as HTMLElement;
        
        if (target) {
          target.focus();
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };
    const timer = setInterval(keepFocus, 1000);
    return () => clearInterval(timer);
  }, [pathname]);

  const navigate = useCallback((direction: string) => {
    if (wallPlateType) return;
    const focusables = Array.from(document.querySelectorAll(".focusable")) as HTMLElement[];
    if (focusables.length === 0) return;
    
    const current = document.activeElement as HTMLElement;
    if (!current?.classList.contains("focusable") || !direction) {
      (document.querySelector('[data-nav-id="subs-all"]') as HTMLElement || focusables[0]).focus();
      return;
    }

    const currentRect = current.getBoundingClientRect();
    const currentId = current.getAttribute('data-nav-id') || "";
    
    // ZONE DETECTION: 1: Dock, 2: Subscriptions, 3: Content
    const getZone = (id: string) => {
      if (id.startsWith('dock-')) return 1;
      if (id.startsWith('subs-')) return 2;
      if (id.startsWith('video-') || id.startsWith('iptv-')) return 3;
      return 0;
    };

    const currentZone = getZone(currentId);

    let minDistance = Infinity;
    let next: HTMLElement | null = null;

    const getDistance = (rect1: DOMRect, rect2: DOMRect, dir: string, targetId: string) => {
      const p1 = { x: rect1.left + rect1.width / 2, y: rect1.top + rect1.height / 2 };
      const p2 = { x: rect2.left + rect2.width / 2, y: rect2.top + rect2.height / 2 };
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;

      // Basic directional pruning
      if (dir === "ArrowRight" && dx <= 5) return Infinity; 
      if (dir === "ArrowLeft" && dx >= -5) return Infinity;  
      if (dir === "ArrowDown" && dy <= 5) return Infinity;
      if (dir === "ArrowUp" && dy >= -5) return Infinity;

      const isHorizontal = dir === "ArrowRight" || dir === "ArrowLeft";
      const targetZone = getZone(targetId);
      
      // FORGIVING LOGIC: If we are jumping between Zones, ignore vertical offset mostly
      const isZoneJump = currentZone !== 0 && targetZone !== 0 && currentZone !== targetZone;
      
      let primaryAxisWeight = 1.0;
      let secondaryAxisWeight = isHorizontal ? 2.5 : 200.0;

      if (isZoneJump && isHorizontal) {
        // Boost elements in the next/prev logical zone
        secondaryAxisWeight = 0.5; // Make it very forgiving for vertical alignment
        primaryAxisWeight = 0.1;   // Prefer zone jumps if moving horizontally
      }
      
      return isHorizontal 
        ? Math.sqrt(Math.pow(dx * primaryAxisWeight, 2) + Math.pow(dy * secondaryAxisWeight, 2))
        : Math.sqrt(Math.pow(dx * secondaryAxisWeight, 2) + Math.pow(dy * primaryAxisWeight, 2));
    };

    for (const el of focusables) {
      if (el === current || el.tabIndex === -1) continue;
      const dist = getDistance(currentRect, el.getBoundingClientRect(), direction, el.getAttribute('data-nav-id') || "");
      if (dist < minDistance) { minDistance = dist; next = el; }
    }

    if (next) {
      next.focus();
      next.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }, [wallPlateType]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      if (activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA') return;
      
      if (e.keyCode === 461 || e.key === 'Back' || e.key === 'Escape' || e.key === 'Backspace' || e.key === "0") {
        e.preventDefault(); 
        if (wallPlateType) setWallPlate(null); 
        else if (pathname !== '/') router.back();
        setActiveKey('0'); setIsVisible(true); setTimeout(() => setIsVisible(false), 500); 
        return;
      }

      if (activeIptv && isFullScreen && (e.key === "PageUp" || e.key === "ChannelUp" || e.keyCode === 427)) { e.preventDefault(); nextIptvChannel(); return; }
      if (activeIptv && isFullScreen && (e.key === "PageDown" || e.key === "ChannelDown" || e.keyCode === 428)) { e.preventDefault(); prevIptvChannel(); return; }
      if (activeIptv && e.key === "1") { prevIptvChannel(); setActiveKey("1"); setIsVisible(true); setTimeout(() => setIsVisible(false), 500); return; }
      if (activeIptv && e.key === "3") { nextIptvChannel(); setActiveKey("3"); setIsVisible(true); setTimeout(() => setIsVisible(false), 500); return; }

      const standardMap: Record<string, string> = { "2": "ArrowUp", "4": "ArrowLeft", "6": "ArrowRight", "8": "ArrowDown", "ArrowUp": "ArrowUp", "ArrowDown": "ArrowDown", "ArrowLeft": "ArrowLeft", "ArrowRight": "ArrowRight" };
      if (standardMap[e.key]) {
        e.preventDefault(); 
        const dir = standardMap[e.key]; 
        navigate(dir);
        let visualKey = e.key; 
        if (e.key === "ArrowUp") visualKey = "2"; 
        if (e.key === "ArrowDown") visualKey = "8"; 
        if (e.key === "ArrowLeft") visualKey = "4"; 
        if (e.key === "ArrowRight") visualKey = "6";
        setActiveKey(visualKey); setIsVisible(true); setTimeout(() => setIsVisible(false), 800);
      } else if (e.key === "5" || e.key === "Enter" || e.keyCode === 13) {
        const current = document.activeElement as HTMLElement;
        if (current?.classList.contains("focusable")) { 
          current.click(); 
          setActiveKey('5'); 
          setIsVisible(true); 
          setTimeout(() => setIsVisible(false), 500); 
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [navigate, activeIptv, isFullScreen, nextIptvChannel, prevIptvChannel, wallPlateType, setWallPlate, router, pathname]);

  return (
    <div className={cn("fixed bottom-24 right-12 z-[10000] pointer-events-none flex flex-col items-center gap-3 transition-all duration-500 scale-110", isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10")}>
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border-2", activeKey === "2" ? "bg-primary border-primary shadow-glow" : "bg-black/60 border-white/10 backdrop-blur-xl")}><ChevronUp className="w-8 h-8 text-white" /></div>
      <div className="flex gap-3">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border-2", activeKey === "4" ? "bg-primary border-primary shadow-glow" : "bg-black/60 border-white/10 backdrop-blur-xl")}><ChevronLeft className="w-8 h-8 text-white" /></div>
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border-2", activeKey === '5' ? "bg-accent border-accent shadow-glow" : "bg-black/60 border-white/10 backdrop-blur-xl")}><Circle className="w-8 h-8 text-white" /></div>
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border-2", activeKey === "6" ? "bg-primary border-primary shadow-glow" : "bg-black/60 border-white/10 backdrop-blur-xl")}><ChevronRight className="w-8 h-8 text-white" /></div>
      </div>
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border-2", activeKey === "8" ? "bg-primary border-primary shadow-glow" : "bg-black/60 border-white/10 backdrop-blur-xl")}><ChevronDown className="w-8 h-8 text-white" /></div>
      <div className="flex gap-8 mt-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border transition-all", activeKey === "1" ? "bg-primary border-primary shadow-glow scale-125" : "bg-white/5 border-white/10")}><span className="text-white text-[10px] font-black">1</span></div>
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border transition-all", activeKey === "0" ? "bg-red-600 border-white shadow-glow scale-125" : "bg-black/60 border-white/10")}><span className="text-white text-[10px] font-black">0</span></div>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border transition-all", activeKey === "3" ? "bg-primary border-primary shadow-glow scale-125" : "bg-white/5 border-white/10")}><span className="text-white text-[10px] font-black">3</span></div>
      </div>
    </div>
  );
}
