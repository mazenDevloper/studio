
"use client";

import { useEffect, useCallback, useState } from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useMediaStore } from "@/lib/store";

export function RemotePointer() {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();
  const { activeIptv, isFullScreen, nextIptvChannel, prevIptvChannel, wallPlateType } = useMediaStore();

  const navigate = useCallback((direction: string) => {
    // Disable navigation if Wall Plate is active
    if (wallPlateType) return;

    const focusables = Array.from(document.querySelectorAll(".focusable")) as HTMLElement[];
    if (focusables.length === 0) return;

    const current = document.activeElement as HTMLElement;
    const isCurrentFocusable = current && current.classList.contains("focusable");
    
    if (!isCurrentFocusable || !direction) {
      let target: HTMLElement | null = null;
      if (pathname === '/') {
        target = document.querySelector('[data-nav-id="moon-widget-container"]') as HTMLElement || focusables.find(el => !el.dataset.navId?.startsWith('dock-')) || focusables[0];
      } else if (pathname === '/media') {
        target = document.querySelector('[data-nav-id^="fav-channel-"]') as HTMLElement || focusables[0];
      } else if (pathname === '/iptv') {
        target = document.querySelector('.iptv-channel-item') as HTMLElement || focusables[0];
      } else if (pathname === '/football') {
        target = document.querySelector('.match-card-item') as HTMLElement || focusables[0];
      } else {
        target = focusables.find(el => !el.dataset.navId?.startsWith('dock-')) || focusables[0];
      }
      
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const currentRect = current.getBoundingClientRect();
    let minDistance = Infinity;
    let next: HTMLElement | null = null;

    const getDistance = (rect1: DOMRect, rect2: DOMRect, dir: string) => {
      const p1 = { x: rect1.left + rect1.width / 2, y: rect1.top + rect1.height / 2 };
      const p2 = { x: rect2.left + rect2.width / 2, y: rect2.top + rect2.height / 2 };
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;

      if (dir === "ArrowRight" && dx <= 5) return Infinity;
      if (dir === "ArrowLeft" && dx >= -5) return Infinity;
      if (dir === "ArrowDown" && dy <= 5) return Infinity;
      if (dir === "ArrowUp" && dy >= -5) return Infinity;

      const primaryAxisWeight = 0.3;
      const secondaryAxisWeight = 2.0;
      
      if (dir === "ArrowRight" || dir === "ArrowLeft") {
        return Math.sqrt(Math.pow(dx * primaryAxisWeight, 2) + Math.pow(dy * secondaryAxisWeight, 2));
      } else {
        return Math.sqrt(Math.pow(dx * secondaryAxisWeight, 2) + Math.pow(dy * primaryAxisWeight, 2));
      }
    };

    for (const el of focusables) {
      if (el === current) continue;
      
      const rect = el.getBoundingClientRect();
      const dy = Math.abs((rect.top + rect.height/2) - (currentRect.top + currentRect.height/2));
      if ((direction === "ArrowLeft" || direction === "ArrowRight") && dy > 150) continue;

      const dist = getDistance(currentRect, rect, direction);
      if (dist < minDistance) {
        minDistance = dist;
        next = el;
      }
    }

    if (next) {
      next.focus();
      next.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }, [pathname, wallPlateType]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      const isInputFocused = 
        activeEl?.tagName === 'INPUT' || 
        activeEl?.tagName === 'TEXTAREA' || 
        activeEl?.hasAttribute('contenteditable') ||
        activeEl?.getAttribute('role') === 'textbox';

      if (isInputFocused) return;

      // Skip normal navigation keys if Wall Plate is active
      if (wallPlateType) {
        if (["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
          return;
        }
      }

      if (e.key === "PageUp" || e.key === "ChannelUp") {
        if (activeIptv && isFullScreen) { e.preventDefault(); nextIptvChannel(); return; }
      } else if (e.key === "PageDown" || e.key === "ChannelDown") {
        if (activeIptv && isFullScreen) { e.preventDefault(); prevIptvChannel(); return; }
      }

      if (e.key === "1") {
        if (activeIptv) { prevIptvChannel(); setActiveKey("1"); setIsVisible(true); setTimeout(() => setIsVisible(false), 500); }
        return;
      }
      if (e.key === "3") {
        if (activeIptv) { nextIptvChannel(); setActiveKey("3"); setIsVisible(true); setTimeout(() => setIsVisible(false), 500); }
        return;
      }

      const standardMap: Record<string, string> = {
        "2": "ArrowUp", "4": "ArrowLeft", "6": "ArrowRight", "8": "ArrowDown",
        "ArrowUp": "ArrowUp", "ArrowDown": "ArrowDown", "ArrowLeft": "ArrowLeft", "ArrowRight": "ArrowRight"
      };

      if (standardMap[e.key]) {
        e.preventDefault();
        const dir = standardMap[e.key];
        navigate(dir);
        let visualKey = e.key;
        if (e.key === "ArrowUp") visualKey = "2";
        if (e.key === "ArrowDown") visualKey = "8";
        if (e.key === "ArrowLeft") visualKey = "4";
        if (e.key === "ArrowRight") visualKey = "6";
        setActiveKey(visualKey);
        setIsVisible(true);
        setTimeout(() => setIsVisible(false), 800);
      } else if (e.key === "5" || e.key === "Enter") {
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
  }, [navigate, activeIptv, isFullScreen, nextIptvChannel, prevIptvChannel, wallPlateType]);

  // Hide pointer element in Wall Plate mode
  if (wallPlateType) return null;

  return (
    <div className={cn(
      "fixed bottom-24 right-12 z-[10000] pointer-events-none flex flex-col items-center gap-3 transition-all duration-500 scale-110",
      isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
    )}>
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border-2", activeKey === "2" ? "bg-primary border-primary shadow-glow" : "bg-black/60 border-white/10 backdrop-blur-xl")}>
        <ChevronUp className="w-8 h-8 text-white" />
      </div>
      <div className="flex gap-3">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border-2", activeKey === "4" ? "bg-primary border-primary shadow-glow" : "bg-black/60 border-white/10 backdrop-blur-xl")}>
          <ChevronLeft className="w-8 h-8 text-white" />
        </div>
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border-2", activeKey === '5' ? "bg-accent border-accent shadow-glow" : "bg-black/60 border-white/10 backdrop-blur-xl")}>
          <Circle className="w-8 h-8 text-white" />
        </div>
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border-2", activeKey === "6" ? "bg-primary border-primary shadow-glow" : "bg-black/60 border-white/10 backdrop-blur-xl")}>
          <ChevronRight className="w-8 h-8 text-white" />
        </div>
      </div>
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border-2", activeKey === "8" ? "bg-primary border-primary shadow-glow" : "bg-black/60 border-white/10 backdrop-blur-xl")}>
        <ChevronDown className="w-8 h-8 text-white" />
      </div>
      
      <div className="flex gap-12 mt-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border transition-all", activeKey === "1" ? "bg-primary border-primary shadow-glow scale-125" : "bg-white/5 border-white/10")}>
          <span className="text-white text-[10px] font-black">1</span>
        </div>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border transition-all", activeKey === "3" ? "bg-primary border-primary shadow-glow scale-125" : "bg-white/5 border-white/10")}>
          <span className="text-white text-[10px] font-black">3</span>
        </div>
      </div>
    </div>
  );
}
