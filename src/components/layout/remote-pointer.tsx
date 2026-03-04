
"use client";

import { useEffect, useCallback, useState } from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export function RemotePointer() {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const navigate = useCallback((direction: string) => {
    const focusables = Array.from(document.querySelectorAll(".focusable")) as HTMLElement[];
    if (focusables.length === 0) return;

    const current = document.activeElement as HTMLElement;
    const isCurrentFocusable = current && current.classList.contains("focusable");
    
    // Smart Auto-Focus if nothing focused
    if (!isCurrentFocusable) {
      // Try to focus dock first, or first visible item
      const first = focusables.find(el => el.dataset.navId?.startsWith('dock-')) || focusables[0];
      first?.focus();
      return;
    }

    if (!direction) return;

    const currentRect = current.getBoundingClientRect();
    let minDistance = Infinity;
    let next: HTMLElement | null = null;

    const getDistance = (rect1: DOMRect, rect2: DOMRect, dir: string) => {
      const p1 = { x: rect1.left + rect1.width / 2, y: rect1.top + rect1.height / 2 };
      const p2 = { x: rect2.left + rect2.width / 2, y: rect2.top + rect2.height / 2 };
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;

      // Filter by direction with small threshold
      if (dir === "ArrowRight" && dx <= 5) return Infinity;
      if (dir === "ArrowLeft" && dx >= -5) return Infinity;
      if (dir === "ArrowDown" && dy <= 5) return Infinity;
      if (dir === "ArrowUp" && dy >= -5) return Infinity;

      // Prioritize primary axis alignment
      const primaryAxisWeight = 0.5;
      const secondaryAxisWeight = 1.5;
      
      if (dir === "ArrowRight" || dir === "ArrowLeft") {
        return Math.sqrt(Math.pow(dx * primaryAxisWeight, 2) + Math.pow(dy * secondaryAxisWeight, 2));
      } else {
        return Math.sqrt(Math.pow(dx * secondaryAxisWeight, 2) + Math.pow(dy * primaryAxisWeight, 2));
      }
    };

    for (const el of focusables) {
      if (el === current) continue;
      const rect = el.getBoundingClientRect();
      const dist = getDistance(currentRect, rect, direction);
      if (dist < minDistance) {
        minDistance = dist;
        next = el;
      }
    }

    if (next) {
      next.focus();
      next.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

    window.addEventListener("keydown", handleKeyDown);
    // Initial Smart Focus after mount
    const timer = setTimeout(() => navigate(''), 1500);
    return () => { window.removeEventListener("keydown", handleKeyDown); clearTimeout(timer); };
  }, [navigate]);

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
    </div>
  );
}
