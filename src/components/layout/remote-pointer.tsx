
"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Circle, MousePointer2, MousePointer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function RemotePointer() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isVirtualCursorEnabled, setIsVirtualCursorEnabled] = useState(false);

  // Handle Virtual Cursor Meta Tag & CSS for Hisense VIDAA
  useEffect(() => {
    const metaId = 'vidaa-cursor-meta';
    let meta = document.getElementById(metaId) as HTMLMetaElement;

    if (!isVirtualCursorEnabled) {
      if (!meta) {
        meta = document.createElement('meta');
        meta.id = metaId;
        meta.name = 'cursor';
        meta.content = 'disabled';
        document.head.appendChild(meta);
      }
      document.body.classList.add('no-cursor');
    } else {
      if (meta) {
        meta.remove();
      }
      document.body.classList.remove('no-cursor');
    }
  }, [isVirtualCursorEnabled]);

  const updatePointer = useCallback((el: HTMLElement) => {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const ensureFocus = useCallback(() => {
    const active = document.activeElement;
    const isFocusable = active && active.classList.contains("focusable");
    
    if (!isFocusable || active === document.body) {
      const allFocusables = Array.from(document.querySelectorAll(".focusable")) as HTMLElement[];
      if (allFocusables.length > 0) {
        const mediaIcon = document.querySelector('[data-nav-id="dock-Media"]') as HTMLElement;
        if (mediaIcon) {
          mediaIcon.focus();
        } else {
          allFocusables[0].focus();
        }
      }
    }
  }, []);

  const getDistance = (rect1: DOMRect, rect2: DOMRect, direction: string) => {
    const p1 = { x: rect1.left + rect1.width / 2, y: rect1.top + rect1.height / 2 };
    const p2 = { x: rect2.left + rect2.width / 2, y: rect2.top + rect2.height / 2 };

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    if (direction === "ArrowRight" && dx <= 2) return Infinity;
    if (direction === "ArrowLeft" && dx >= -2) return Infinity;
    if (direction === "ArrowDown" && dy <= 2) return Infinity;
    if (direction === "ArrowUp" && dy >= -2) return Infinity;

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
        if (rect.width === 0 || rect.height === 0) continue;

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
    } else {
      ensureFocus();
    }
  }, [updatePointer, ensureFocus]);

  useEffect(() => {
    ensureFocus();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Virtual Cursor using '1' key (KeyCode 49)
      if (e.key === "1") {
        e.preventDefault();
        setIsVirtualCursorEnabled(prev => {
          const newState = !prev;
          toast({
            title: newState ? "المؤشر الوهمي مفعّل" : "المؤشر الوهمي معطّل",
            description: newState ? "يمكنك استخدام الفأرة الآن" : "التنقل الذكي مفعل بالكامل",
            duration: 3000,
          });
          return newState;
        });
        return;
      }

      const standardMap: Record<string, string> = {
        "2": "ArrowUp", "4": "ArrowLeft", "6": "ArrowRight", "8": "ArrowDown",
        "ArrowUp": "ArrowUp", "ArrowDown": "ArrowDown", "ArrowLeft": "ArrowLeft", "ArrowRight": "ArrowRight"
      };

      if (standardMap[e.key]) {
        e.preventDefault();
        // Always navigate with Smart Pointer if we are using directions
        navigate(standardMap[e.key]);
        
        // UI Feedback
        let visualKey = e.key;
        if (e.key === "ArrowUp") visualKey = "2";
        if (e.key === "ArrowDown") visualKey = "8";
        if (e.key === "ArrowLeft") visualKey = "4";
        if (e.key === "ArrowRight") visualKey = "6";
        setActiveKey(visualKey);
        setIsVisible(true);
        const timeout = setTimeout(() => setIsVisible(false), 1000);
        return () => clearTimeout(timeout);
      } else if (e.key === "5" || e.key === "Enter") {
        const current = document.activeElement as HTMLElement;
        if (current && current.classList.contains("focusable")) {
          current.click();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, router, toast, ensureFocus]);

  return (
    <>
      <div className={cn(
        "fixed bottom-24 right-12 z-[10000] pointer-events-none flex flex-col items-center gap-3 transition-all duration-500 scale-110",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      )}>
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-200",
          activeKey === "2" ? "bg-primary border-primary shadow-[0_0_40px_hsl(var(--primary))]" : "bg-black/60 border-white/10 backdrop-blur-xl"
        )}>
          <ChevronUp className="w-8 h-8 text-white" />
        </div>
        
        <div className="flex gap-3">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-200",
            activeKey === "4" ? "bg-primary border-primary shadow-[0_0_40px_hsl(var(--primary))]" : "bg-black/60 border-white/10 backdrop-blur-xl"
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
            activeKey === "6" ? "bg-primary border-primary shadow-[0_0_40px_hsl(var(--primary))]" : "bg-black/60 border-white/10 backdrop-blur-xl"
          )}>
            <ChevronRight className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-200",
          activeKey === "8" ? "bg-primary border-primary shadow-[0_0_40px_hsl(var(--primary))]" : "bg-black/60 border-white/10 backdrop-blur-xl"
        )}>
          <ChevronDown className="w-8 h-8 text-white" />
        </div>
      </div>

      <div className={cn(
        "fixed top-8 left-8 z-[10001] px-4 py-2 rounded-full backdrop-blur-3xl border flex items-center gap-3 transition-all duration-500",
        isVirtualCursorEnabled ? "bg-accent/20 border-accent/40" : "bg-primary/20 border-primary/40 opacity-30"
      )}>
        {isVirtualCursorEnabled ? <MousePointer2 className="w-4 h-4 text-accent" /> : <MousePointer className="w-4 h-4 text-primary" />}
        <span className="text-[10px] font-black uppercase tracking-widest text-white">
          {isVirtualCursorEnabled ? "Virtual Mouse" : "Smart Remote"}
        </span>
      </div>
    </>
  );
}
