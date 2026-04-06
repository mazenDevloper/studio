
"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { normalizeKey } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useMediaStore, AppAction } from "@/lib/store";
import { init } from "@noriginmedia/norigin-spatial-navigation";

export function RemotePointer() {
  const pathname = usePathname();
  const router = useRouter();
  const { 
    wallPlateType, setWallPlate, dockSide
  } = useMediaStore();

  useEffect(() => {
    try { init({ debug: false, visualDebug: false }); } 
    catch (e) { console.warn("Spatial Navigation Init Error:", e); }
  }, []);

  // FOCUS GUARDIAN: Ensure something is ALWAYS focused
  useEffect(() => {
    const guardian = setInterval(() => {
      const active = document.activeElement as HTMLElement;
      const isInput = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA';
      const isFocusable = active?.classList.contains('focusable');
      
      if (!isInput && !isFocusable) {
        const appMap: Record<string, string> = { 
          '/': 'Home', 
          '/media': 'Media', 
          '/quran': 'Quran', 
          '/football': 'Football', 
          '/hihi2': 'Hihi2', 
          '/iptv': 'IPTV', 
          '/settings': 'Settings' 
        };
        const currentApp = appMap[pathname] || 'Home';
        
        let target = null;
        if (pathname === '/') {
          target = document.querySelector('[data-nav-id="reminder-summary-0"]') as HTMLElement;
        }
        
        if (!target) {
          target = document.querySelector(`[data-nav-id="dock-${currentApp}"]`) as HTMLElement
                || document.querySelector('.active-nav-target') as HTMLElement
                || document.querySelector('.focusable') as HTMLElement;
        }
        target?.focus();
      }
    }, 1000);
    return () => clearInterval(guardian);
  }, [pathname]);

  const navigate = useCallback((direction: string) => {
    if (wallPlateType) return;
    
    const focusables = Array.from(document.querySelectorAll(".focusable")) as HTMLElement[];
    const current = document.activeElement as HTMLElement;
    
    if (!current?.classList.contains("focusable")) {
      const target = document.querySelector('.active-nav-target') as HTMLElement || focusables[0];
      target?.focus();
      return;
    }

    const currentRect = current.getBoundingClientRect();
    const currentId = current.getAttribute('data-nav-id') || "";
    
    const getZone = (id: string) => {
      if (id.startsWith('dock-')) return 1; // Zone 1: Dock
      if (id.startsWith('subs-') || id.startsWith('reciter-') || id.startsWith('aside-') || id.startsWith('iptv-cat-')) return 2; // Zone 2: Sidebar
      return 3; // Zone 3: Content
    };

    const currentZone = getZone(currentId);
    const isDockLeft = dockSide === 'left';
    const towardContent = isDockLeft ? "ArrowRight" : "ArrowLeft";
    const towardDock = isDockLeft ? "ArrowLeft" : "ArrowRight";
    
    const is2LevelScreen = ['/', '/iptv', '/football', '/settings', '/hihi2'].includes(pathname);
    const hasSidebar = !is2LevelScreen && (pathname === '/media' || pathname === '/quran');

    // 1. DIRECTIONAL SMART JUMPS
    if (direction === towardContent) {
      if (currentZone === 1) {
        if (hasSidebar) {
          const target = document.querySelector('.active-nav-target') as HTMLElement 
                      || document.querySelector('[data-nav-id^="subs-"]') as HTMLElement;
          if (target) { target.focus(); return; }
        } else {
          // DIRECT JUMP TO CONTENT (Zone 3)
          let target = null;
          if (pathname === '/') target = document.querySelector('[data-nav-id="reminder-summary-0"]') as HTMLElement;
          if (!target) target = focusables.find(el => getZone(el.getAttribute('data-nav-id') || "") === 3);
          
          if (target) {
            target.focus();
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
        }
      }
      if (currentZone === 2) {
        const target = document.querySelector('[data-nav-id$="-0"]:not([data-nav-id^="dock-"]):not([data-nav-id^="subs-"])') as HTMLElement
                    || focusables.find(el => getZone(el.getAttribute('data-nav-id') || "") === 3);
        if (target) { target.focus(); target.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      }
    }

    // 2. GEOMETRIC CALCULATION WITH RESTRICTIONS
    let minDistance = Infinity;
    let next: HTMLElement | null = null;

    const getDistance = (rect1: DOMRect, rect2: DOMRect, dir: string, targetId: string) => {
      const targetZone = getZone(targetId);
      
      // RESTRICT ZONE EXIT FROM CONTENT
      if (currentZone === 3 && targetZone !== 3) {
        if (dir !== towardDock) return Infinity; // Only exit via dock direction
        
        // Strict Column-0 check
        const parts = currentId.split('-');
        const lastPart = parts[parts.length - 1];
        const idx = parseInt(lastPart);
        const isColumnZero = isNaN(idx) || (idx % 3 === 0) || currentId.endsWith('-0') || currentId.startsWith('reminder-') || currentId.startsWith('dashboard-col-0');
        
        if (!isColumnZero) return Infinity;

        // Ensure we jump to the right next zone
        if (is2LevelScreen && targetZone !== 1) return Infinity;
        if (!is2LevelScreen && targetZone !== 2) return Infinity;
      }

      // RESTRICT ZONE EXIT FROM SIDEBAR
      if (currentZone === 2 && targetZone !== 2) {
        if (dir === towardDock && targetZone !== 1) return Infinity;
        if (dir === towardContent && targetZone !== 3) return Infinity;
      }

      // COORDINATE MATH
      const p1 = { x: rect1.left + rect1.width / 2, y: rect1.top + rect1.height / 2 };
      const p2 = { x: rect2.left + rect2.width / 2, y: rect2.top + rect2.height / 2 };
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;

      // Primary Directional Filter
      if (dir === "ArrowRight" && dx <= 5) return Infinity; 
      if (dir === "ArrowLeft" && dx >= -5) return Infinity;  
      if (dir === "ArrowDown" && dy <= 5) return Infinity;
      if (dir === "ArrowUp" && dy >= -5) return Infinity;

      let distance = Math.sqrt(dx * dx + dy * dy);
      
      // PREFER SAME ZONE (High Penalty for zone switching)
      if (targetZone !== currentZone) {
        distance += 5000; 
      }

      // SMART TARGET ATTRACTION
      if (dir === towardDock && targetZone === 1) {
        const appMap: Record<string, string> = { '/': 'Home', '/media': 'Media', '/quran': 'Quran', '/football': 'Football', '/hihi2': 'Hihi2', '/iptv': 'IPTV', '/settings': 'Settings' };
        const currentApp = appMap[pathname] || 'Home';
        if (targetId === `dock-${currentApp}`) distance -= 4500; // Strong pull to current app icon
      }
      
      if (targetZone === 2 || (targetZone === 1 && currentZone === 3)) {
        const activeTarget = document.querySelector('.active-nav-target');
        if (targetId === activeTarget?.getAttribute('data-nav-id')) distance -= 4000;
      }

      return distance;
    };

    for (const el of focusables) {
      if (el === current) continue;
      const dist = getDistance(currentRect, el.getBoundingClientRect(), direction, el.getAttribute('data-nav-id') || "");
      if (dist < minDistance) { minDistance = dist; next = el; }
    }

    if (next) {
      next.focus();
      next.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [wallPlateType, pathname, dockSide]);

  const isAction = useCallback((key: string, action: AppAction) => {
    const mappings = useMediaStore.getState().keyMappings[action] || [];
    return mappings.some(m => m.toLowerCase() === key.toLowerCase());
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      const key = normalizeKey(e); 
      
      if (activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA') {
        if (e.key === "Enter") activeEl.blur(); 
        return;
      }
      
      if (isAction(key, 'nav_back') || e.keyCode === 461) {
        if (wallPlateType) { e.preventDefault(); setWallPlate(null); return; }
        if (pathname !== '/') { e.preventDefault(); router.back(); return; }
      }

      if (isAction(key, 'goto_home')) { e.preventDefault(); router.push('/'); return; }
      if (isAction(key, 'goto_media')) { e.preventDefault(); router.push('/media'); return; }
      if (isAction(key, 'goto_quran')) { e.preventDefault(); router.push('/quran'); return; }
      if (isAction(key, 'goto_football')) { e.preventDefault(); router.push('/football'); return; }
      if (isAction(key, 'goto_hihi2')) { e.preventDefault(); router.push('/hihi2'); return; }
      if (isAction(key, 'goto_iptv')) { e.preventDefault(); router.push('/iptv'); return; }
      if (isAction(key, 'goto_settings')) { e.preventDefault(); router.push('/settings'); return; }

      if (isAction(key, 'nav_up')) { e.preventDefault(); navigate("ArrowUp"); return; }
      if (isAction(key, 'nav_down')) { e.preventDefault(); navigate("ArrowDown"); return; }
      if (isAction(key, 'nav_left')) { e.preventDefault(); navigate("ArrowLeft"); return; }
      if (isAction(key, 'nav_right')) { e.preventDefault(); navigate("ArrowRight"); return; }
      
      if (isAction(key, 'nav_ok') || e.keyCode === 13) {
        if (activeEl?.classList.contains("focusable")) { activeEl.click(); }
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [navigate, isAction, wallPlateType, setWallPlate, router, pathname, dockSide]);

  return null;
}
