"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function RemotePointer() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInverted, setIsInverted] = useState(false);

  const updatePointer = useCallback((el: HTMLElement) => {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const getDistance = (rect1: DOMRect, rect2: DOMRect, direction: string) => {
    const p1 = { x: rect1.left + rect1.width / 2, y: rect1.top + rect1.height / 2 };
    const p2 = { x: rect2.left + rect2.width / 2, y: rect2.top + rect2.height / 2 };

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    // Direct movement check with slight tolerance for better UX
    if (direction === "ArrowRight" && dx <= 2) return Infinity;
    if (direction === "ArrowLeft" && dx >= -2) return Infinity;
    if (direction === "ArrowDown" && dy <= 2) return Infinity;
    if (direction === "ArrowUp" && dy >= -2) return Infinity;

    // Adjusted weighting to allow more "diagonal" row-skipping navigation (Smart Remote)
    const orthogonalWeight = 3.5; 
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
        
        // Ensure element is visible and has dimensions
        if (rect.width === 0 || rect.height === 0) continue;

        // Skip elements inside modals if focus is outside
        const portal = document.querySelector('[role="dialog"]');
        if (portal && !portal.contains(el) && portal.contains(current)) continue;

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
      // Toggle Inversion with Key 0
      if (e.key === "0") {
        e.preventDefault();
        setIsInverted(prev => {
          const nextVal = !prev;
          toast({
            title: nextVal ? "تم عكس الريموت" : "تم إعادة الريموت",
            description: nextVal ? "8 أعلى | 6 يسار | 4 يمين | 2 أسفل" : "2 أعلى | 4 يسار | 6 يمين | 8 أسفل",
          });
          return nextVal;
        });
        return;
      }

      // Exclusive Key Mapping
      const standardMap: Record<string, string> = {
        "2": "ArrowUp",
        "4": "ArrowLeft",
        "6": "ArrowRight",
        "8": "ArrowDown",
        "ArrowUp": "ArrowUp",
        "ArrowDown": "ArrowDown",
        "ArrowLeft": "ArrowLeft",
        "ArrowRight": "ArrowRight"
      };

      const invertedMap: Record<string, string> = {
        "8": "ArrowUp",
        "6": "ArrowLeft",
        "4": "ArrowRight",
        "2": "ArrowDown",
        "ArrowUp": "ArrowUp",
        "ArrowDown": "ArrowDown",
        "ArrowLeft": "ArrowLeft",
        "ArrowRight": "ArrowRight"
      };

      const keyMap = isInverted ? invertedMap : standardMap;

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
        e.preventDefault();
        
        let visualKey = e.key;
        if (e.key === "ArrowUp") visualKey = isInverted ? "8" : "2";
        if (e.key === "ArrowDown") visualKey = isInverted ? "2" : "8";
        if (e.key === "ArrowLeft") visualKey = isInverted ? "6" : "4";
        if (e.key === "ArrowRight") visualKey = isInverted ? "4" : "6";
        if (e.key === "Enter") visualKey = "5";
        
        setActiveKey(visualKey);
        setIsVisible(true);
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          setActiveKey(null);
          setIsVisible(false);
        }, 1000);

        if (keyMap[e.key]) {
          navigate(keyMap[e.key]);
        } else if (e.key === "5" || e.key === "Enter") {
          const current = document.activeElement as HTMLElement;
          if (current && current.classList.contains("focusable")) {
            current.click();
          }
        }
      } else if (colorActionMap[e.key]) {
        e.preventDefault();
        router.push(colorActionMap[e.key]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeout) clearTimeout(timeout);
    };
  }, [navigate, router, isInverted, toast]);

  return (
    <div className={cn(
      "fixed bottom-24 right-12 z-[10000] pointer-events-none flex flex-col items-center gap-3 transition-all duration-500 scale-110",
      isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
    )}>
      {/* HUD D-PAD Map - Only lights up the active functional direction */}
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-200",
        activeKey === (isInverted ? "8" : "2") ? "bg-primary border-primary shadow-[0_0_40px_hsl(var(--primary))]" : "bg-black/60 border-white/10 backdrop-blur-xl"
      )}>
        <ChevronUp className="w-8 h-8 text-white" />
      </div>
      
      <div className="flex gap-3">
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-200",
          activeKey === (isInverted ? "6" : "4") ? "bg-primary border-primary shadow-[0_0_40px_hsl(var(--primary))]" : "bg-black/60 border-white/10 backdrop-blur-xl"
        )}>
          <ChevronLeft className="w-8 h-8 text-white" />
        </div>
        
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-200",
          activeKey === '5' ? "bg-accent border-accent shadow-[0_0_40px_hsl(var(--accent))]" : "bg-black/60 border-white/10 backdrop-blur-xl"
        )}>
          <Circle className="w-8 h-8 text-white" />
        </div>
        
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-200",
          activeKey === (isInverted ? "4" : "6") ? "bg-primary border-primary shadow-[0_0_40px_hsl(var(--primary))]" : "bg-black/60 border-white/10 backdrop-blur-xl"
        )}>
          <ChevronRight className="w-8 h-8 text-white" />
        </div>
      </div>
      
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-200",
        activeKey === (isInverted ? "2" : "8") ? "bg-primary border-primary shadow-[0_0_40px_hsl(var(--primary))]" : "bg-black/60 border-white/10 backdrop-blur-xl"
      )}>
        <ChevronDown className="w-8 h-8 text-white" />
      </div>
    </div>
  );
}
