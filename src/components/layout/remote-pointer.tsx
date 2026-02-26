
"use client";

import { useEffect, useCallback } from "react";

export function RemotePointer() {
  const updatePointer = useCallback((el: HTMLElement) => {
    // We only care about scrolling now, the CSS glow handles the visual focus accurately
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

    // Favor the movement axis
    const orthogonalWeight = 8.0; 
    if (direction === "ArrowRight" || direction === "ArrowLeft") {
      return Math.sqrt(Math.pow(dx, 2) + Math.pow(dy * orthogonalWeight, 2));
    } else {
      return Math.sqrt(Math.pow(dx * orthogonalWeight, 2) + Math.pow(dy, 2));
    }
  };

  const navigate = useCallback((direction: string) => {
    // Find all focusable elements
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

        // Check if inside a visible dialog/portal if one is open
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
    const handleKeyDown = (e: KeyboardEvent) => {
      // Map Numbers to Directions: 2=Up, 4=Left, 6=Right, 8=Down
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

      if (keyMap[e.key]) {
        e.preventDefault();
        navigate(keyMap[e.key]);
      }

      if (e.key === "Enter" || e.key === "5") {
        const current = document.activeElement as HTMLElement;
        if (current && current.classList.contains("focusable")) {
          current.click();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

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

  // Return null because we rely on native focus glow (CSS) instead of drawing a helper div
  return null;
}
