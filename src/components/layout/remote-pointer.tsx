
"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export function RemotePointer() {
  const router = useRouter();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const updatePointer = useCallback((el: HTMLElement) => {
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const getDistance = (rect1: DOMRect, rect2: DOMRect, direction: string) => {
    const p1 = { x: rect1.left + rect1.width / 2, y: rect1.top + rect1.height / 2 };
    const p2 = { x: rect2.left + rect2.width / 2, y: rect2.top + rect2.height / 2 };

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    // Strict directional checks
    if (direction === "ArrowRight" && dx <= 5) return Infinity;
    if (direction === "ArrowLeft" && dx >= -5) return Infinity;
    if (direction === "ArrowDown" && dy <= 5) return Infinity;
    if (direction === "ArrowUp" && dy >= -5) return Infinity;

    // Extreme bias for the movement axis to ensure predictability
    const orthogonalWeight = 15.0; 
    if (direction === "ArrowRight" || direction === "ArrowLeft") {
      return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy * orthogonalWeight, 2));
    } else {
      return Math.sqrt(Math.pow(dx * orthogonalWeight, 2) + Math.pow(dy, 2));
    }
  };

  const navigate = useCallback((direction: string) => {
    const focusables = Array.from(document.querySelectorAll(".focusable")) as HTMLElement[];
    if (focusables.length === 0) return;

    const current = document.activeElement as HTMLElement;
    const isCurrentFocusable = current && current.classList.contains("focusable");
    
    let next: HTMLElement | null = null;

    if (!isCurrentFocusable) {
      next = focusables[0];
    } else {
      const currentRect = current.getBoundingClientRect();
      let minDistance = Infinity;

      for (const el of focusables) {
        if (el === current) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const portal = document.querySelector('[role="dialog"]');
        if (portal && !portal.contains(el)) continue;

        const dist = getDistance(currentRect, rect, direction);
        if (dist < minDistance) {
          minDistance = dist;
          next = el;
        }
      }
    }

    if (next) {
      next.focus();
      updatePointer(next);
    }
  }, [updatePointer]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, string> = {
        "2": "ArrowUp",
        "4": "ArrowLeft",
        "6": "ArrowRight",
        "8": "ArrowDown",
        "ArrowUp": "ArrowUp",
        "ArrowDown": "ArrowDown",
        "ArrowLeft": "ArrowLeft",
        "ArrowRight": "ArrowRight"
      };

      const colorActionMap: Record<string, string> = {
        "7": "/",
        "9": "/media",
        "1": "/football",
        "3": "/settings",
        "F1": "/",
        "F2": "/media",
        "F3": "/football",
        "F4": "/settings"
      };

      if (keyMap[e.key] || e.key === "5" || e.key === "Enter") {
        const visualKey = e.key === "ArrowUp" ? "2" : 
                         e.key === "ArrowDown" ? "8" : 
                         e.key === "ArrowLeft" ? "4" : 
                         e.key === "ArrowRight" ? "6" : 
                         (e.key === "Enter" ? "5" : e.key);
        
        setActiveKey(visualKey);
        setIsVisible(true);
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          setActiveKey(null);
          setIsVisible(false);
        }, 1000);
      }

      if (keyMap[e.key]) {
        e.preventDefault();
        navigate(keyMap[e.key]);
      } else if (colorActionMap[e.key]) {
        e.preventDefault();
        router.push(colorActionMap[e.key]);
      } else if (e.key === "5" || e.key === "Enter") {
        e.preventDefault();
        const current = document.activeElement as HTMLElement;
        if (current && current.classList.contains("focusable")) {
          current.click();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeout) clearTimeout(timeout);
    };
  }, [navigate, router]);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.classList && target.classList.contains("focusable")) {
        updatePointer(target);
      }
    };
    window.addEventListener("focus", handleFocus, true);
    return () => window.removeEventListener("focus", handleFocus, true);
  }, [updatePointer]);

  return (
    <div className={cn(
      "fixed bottom-12 right-12 z-[10000] pointer-events-none flex flex-col items-center gap-3 transition-all duration-500",
      isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"
    )}>
      {/* HUD D-PAD Map */}
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-200",
        activeKey === '2' ? "bg-primary/40 border-primary scale-110 shadow-[0_0_30px_hsl(var(--primary))]" : "bg-black/40 border-white/10 backdrop-blur-xl"
      )}>
        <ChevronUp className="w-8 h-8 text-white" />
      </div>
      
      <div className="flex gap-3">
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-200",
          activeKey === '4' ? "bg-primary/40 border-primary scale-110 shadow-[0_0_30px_hsl(var(--primary))]" : "bg-black/40 border-white/10 backdrop-blur-xl"
        )}>
          <ChevronLeft className="w-8 h-8 text-white" />
        </div>
        
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-200",
          activeKey === '5' ? "bg-accent/40 border-accent scale-110 shadow-[0_0_30px_hsl(var(--accent))]" : "bg-black/40 border-white/10 backdrop-blur-xl"
        )}>
          <Circle className="w-8 h-8 text-white" />
        </div>
        
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-200",
          activeKey === '6' ? "bg-primary/40 border-primary scale-110 shadow-[0_0_30px_hsl(var(--primary))]" : "bg-black/40 border-white/10 backdrop-blur-xl"
        )}>
          <ChevronRight className="w-8 h-8 text-white" />
        </div>
      </div>
      
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-200",
        activeKey === '8' ? "bg-primary/40 border-primary scale-110 shadow-[0_0_30px_hsl(var(--primary))]" : "bg-black/40 border-white/10 backdrop-blur-xl"
      )}>
        <ChevronDown className="w-8 h-8 text-white" />
      </div>
    </div>
  );
}
