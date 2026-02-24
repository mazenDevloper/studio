
"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

export function RemotePointer() {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [pointerData, setPointerData] = useState<{
    rect: DOMRect;
    borderRadius: string;
  } | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const updatePointer = useCallback((el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    setPointerData({
      rect,
      borderRadius: style.borderRadius
    });
    setFocusedId(el.getAttribute("data-nav-id") || el.id || "unknown");
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const getDistance = (rect1: DOMRect, rect2: DOMRect, direction: string) => {
    const p1 = { x: rect1.left + rect1.width / 2, y: rect1.top + rect1.height / 2 };
    const p2 = { x: rect2.left + rect2.width / 2, y: rect2.top + rect2.height / 2 };

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    if (direction === "ArrowRight" && dx <= 5) return Infinity;
    if (direction === "ArrowLeft" && dx >= -5) return Infinity;
    if (direction === "ArrowDown" && dy <= 5) return Infinity;
    if (direction === "ArrowUp" && dy >= -5) return Infinity;

    const orthogonalWeight = 12.0; 
    if (direction === "ArrowRight" || direction === "ArrowLeft") {
      return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy * orthogonalWeight, 2));
    } else {
      return Math.sqrt(Math.pow(dx * orthogonalWeight, 2) + Math.pow(dy, 2));
    }
  };

  const navigate = useCallback((direction: string) => {
    setIsVisible(true);
    // البحث في كامل المستند ليشمل الـ Portals (Dialogs/Popups)
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
    }
  }, [updatePointer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        navigate(e.key);
      }
      if (e.key === "Enter") {
        const current = document.activeElement as HTMLElement;
        if (current && current.classList.contains("focusable")) {
          // محاكاة الضغط للعناصر التي لا تستجيب للتركيز التقليدي
          current.click();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  if (!isVisible || !pointerData) return null;

  const { rect, borderRadius } = pointerData;

  return (
    <div 
      className="fixed pointer-events-none z-[2000] transition-all duration-300 ease-out"
      style={{
        top: rect.top - 4,
        left: rect.left - 4,
        width: rect.width + 8,
        height: rect.height + 8,
        borderRadius: borderRadius !== '0px' ? `calc(${borderRadius} + 4px)` : '12px'
      }}
    >
      <div 
        className="w-full h-full border-4 border-primary shadow-[0_0_40px_hsl(var(--primary)/0.6)] animate-pulse" 
        style={{ borderRadius: 'inherit' }}
      />
      <div className="absolute -top-3 -left-3 w-6 h-6 bg-primary rounded-full blur-sm opacity-50" />
    </div>
  );
}
