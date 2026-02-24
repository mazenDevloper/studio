
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

export function RemotePointer() {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [pointerRect, setPointerRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const updatePointer = useCallback((el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setPointerRect(rect);
    setFocusedId(el.getAttribute("data-nav-id") || el.id || "unknown");
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const getDistance = (rect1: DOMRect, rect2: DOMRect, direction: string) => {
    const p1 = { x: rect1.left + rect1.width / 2, y: rect1.top + rect1.height / 2 };
    const p2 = { x: rect2.left + rect2.width / 2, y: rect2.top + rect2.height / 2 };

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    // Filter by direction
    if (direction === "ArrowRight" && dx <= 0) return Infinity;
    if (direction === "ArrowLeft" && dx >= 0) return Infinity;
    if (direction === "ArrowDown" && dy <= 0) return Infinity;
    if (direction === "ArrowUp" && dy >= 0) return Infinity;

    // Euclidean distance with weight on the primary axis
    const weight = 2.5;
    if (direction === "ArrowRight" || direction === "ArrowLeft") {
      return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy * weight, 2));
    } else {
      return Math.sqrt(Math.pow(dx * weight, 2) + Math.pow(dy, 2));
    }
  };

  const navigate = useCallback((direction: string) => {
    setIsVisible(true);
    const focusables = Array.from(document.querySelectorAll(".focusable")) as HTMLElement[];
    if (focusables.length === 0) return;

    const current = document.activeElement as HTMLElement;
    const isCurrentFocusable = current.classList.contains("focusable");
    
    let next: HTMLElement | null = null;

    if (!isCurrentFocusable) {
      next = focusables[0];
    } else {
      const currentRect = current.getBoundingClientRect();
      let minDistance = Infinity;

      for (const el of focusables) {
        if (el === current) continue;
        const rect = el.getBoundingClientRect();
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
        if (current.classList.contains("focusable")) {
          current.click();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  if (!isVisible || !pointerRect) return null;

  return (
    <div 
      className="fixed pointer-events-none z-[1000] transition-all duration-300 ease-out"
      style={{
        top: pointerRect.top - 4,
        left: pointerRect.left - 4,
        width: pointerRect.width + 8,
        height: pointerRect.height + 8,
      }}
    >
      <div className="w-full h-full rounded-[inherit] border-2 border-primary shadow-[0_0_20px_hsl(var(--primary))] animate-pulse" />
      <div className="absolute -top-2 -left-2 w-4 h-4 bg-primary rounded-full blur-sm" />
    </div>
  );
}
