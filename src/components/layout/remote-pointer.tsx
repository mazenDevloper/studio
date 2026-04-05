
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
    activeIptv, activeVideo, isFullScreen, nextTrack, prevTrack, toggleSaveVideo,
    wallPlateType, setWallPlate, setIsFullScreen, setIsMinimized,
    setActiveVideo, setActiveIptv, dockSide
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
        // Try to focus active sidebar target, or dock home, or first focusable
        const target = document.querySelector('.active-nav-target') as HTMLElement
                    || document.querySelector('[data-nav-id="dock-Home"]') as HTMLElement
                    || document.querySelector('.focusable') as HTMLElement;
        target?.focus();
      }
    }, 1000);
    return () => clearInterval(guardian);
  }, []);

  const navigate = useCallback((direction: string) => {
    if (wallPlateType) return;
    
    const focusables = Array.from(document.querySelectorAll(".focusable")) as HTMLElement[];
    const current = document.activeElement as HTMLElement;
    
    // Guardian if lost
    if (!current?.classList.contains("focusable")) {
      const target = document.querySelector('.active-nav-target') as HTMLElement || focusables[0];
      target?.focus();
      return;
    }

    const currentRect = current.getBoundingClientRect();
    const currentId = current.getAttribute('data-nav-id') || "";
    
    const getZone = (id: string) => {
      if (id.startsWith('dock-')) return 1; 
      if (id.startsWith('subs-') || id.startsWith('reciter-') || id.startsWith('aside-')) return 2; 
      return 3; 
    };

    const currentZone = getZone(currentId);
    const isDockLeft = dockSide === 'left';
    const towardContent = isDockLeft ? "ArrowRight" : "ArrowLeft";
    const towardDock = isDockLeft ? "ArrowLeft" : "ArrowRight";

    // SMART JUMP: Sidebar (Zone 2) -> Content (Zone 3)
    if (direction === towardContent && currentZone === 2) {
      const target = document.querySelector('[data-nav-id="video-result-0"]') as HTMLElement
                  || document.querySelector('[data-nav-id="video-ch-0"]') as HTMLElement
                  || document.querySelector('[data-nav-id="q-reciter-0"]') as HTMLElement
                  || document.querySelector('[data-nav-id$="-0"]') as HTMLElement;
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    // SMART JUMP: Content (Zone 3) -> Sidebar (Zone 2)
    if (direction === towardDock && currentZone === 3) {
      const target = document.querySelector('.active-nav-target') as HTMLElement
                  || document.querySelector('[data-nav-id="subs-all"]') as HTMLElement;
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }

    // VERTICAL LEVEL NAVIGATION (3-Click Hierarchy)
    if (direction === "ArrowDown" || direction === "ArrowUp") {
      const sectionOrder = [
        'q-reciter', 
        'q-surah', 
        'video-result', 
        'video-ch',
        'video-live', 
        'video-latest', 
        'video-trending', 
        'video-sports', 
        'video-kids'
      ];
      const currentPrefix = currentId.split('-').slice(0, -1).join('-');
      const currentIndex = sectionOrder.indexOf(currentPrefix);

      if (currentIndex !== -1) {
        let nextIndex = direction === "ArrowDown" ? currentIndex + 1 : currentIndex - 1;
        while (nextIndex >= 0 && nextIndex < sectionOrder.length) {
          const target = document.querySelector(`[data-nav-id="${sectionOrder[nextIndex]}-0"]`) as HTMLElement;
          if (target) {
            target.focus();
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
          nextIndex = direction === "ArrowDown" ? nextIndex + 1 : nextIndex - 1;
        }
      }
    }

    let minDistance = Infinity;
    let next: HTMLElement | null = null;
    const currentPrefix = currentId.split('-').slice(0, -1).join('-');
    const isHorizontalMove = direction === "ArrowLeft" || direction === "ArrowRight";

    const getDistance = (rect1: DOMRect, rect2: DOMRect, dir: string, targetId: string) => {
      const p1 = { x: rect1.left + rect1.width / 2, y: rect1.top + rect1.height / 2 };
      const p2 = { x: rect2.left + rect2.width / 2, y: rect2.top + rect2.height / 2 };
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;

      if (dir === "ArrowRight" && dx <= 5) return Infinity; 
      if (dir === "ArrowLeft" && dx >= -5) return Infinity;  
      if (dir === "ArrowDown" && dy <= 5) return Infinity;
      if (dir === "ArrowUp" && dy >= -5) return Infinity;

      let distance = Math.sqrt(dx * dx + dy * dy);
      // Prioritize same-row movement
      if (isHorizontalMove && currentZone === 3) {
        if (targetId.startsWith(currentPrefix)) distance *= 0.5;
        else distance *= 10.0; 
      }
      return distance;
    };

    for (const el of focusables) {
      if (el === current) continue;
      const targetId = el.getAttribute('data-nav-id') || "";
      const dist = getDistance(currentRect, el.getBoundingClientRect(), direction, targetId);
      if (dist < minDistance) { minDistance = dist; next = el; }
    }

    // CIRCULAR NAVIGATION within Content Rows
    if (isHorizontalMove && currentZone === 3 && !next) {
      const allInRow = Array.from(document.querySelectorAll(`[data-nav-id^="${currentPrefix}-"]`)) as HTMLElement[];
      if (allInRow.length > 1) {
        next = (direction === towardContent) ? allInRow[0] : allInRow[allInRow.length - 1];
      }
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
      
      // SEARCH SHORTCUT (0 key)
      if (key === '0' || e.keyCode === 48) {
        if (pathname === '/media' || pathname === '/quran') {
          const searchInput = document.querySelector(`[data-nav-id="${pathname.slice(1)}-search-input"]`) as HTMLInputElement;
          if (searchInput) {
            e.preventDefault();
            if (activeEl === searchInput) {
              searchInput.blur();
              const firstContent = document.querySelector('[data-nav-id="q-reciter-0"]') as HTMLElement;
              firstContent?.focus();
            } else { 
              searchInput.focus(); 
            }
            return;
          }
        }
      }

      if (activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA') {
        if (e.key === "Enter") activeEl.blur(); 
        return;
      }
      
      const isPlayerActive = !!(activeVideo || activeIptv);

      if (isAction(key, 'nav_back') || e.keyCode === 461) {
        if (wallPlateType) { e.preventDefault(); setWallPlate(null); return; }
        if (pathname !== '/') { e.preventDefault(); router.back(); return; }
      }

      if (isPlayerActive) {
        if (isAction(key, 'player_next')) { e.preventDefault(); nextTrack(); return; }
        if (isAction(key, 'player_prev')) { e.preventDefault(); prevTrack(); return; }
        if (isAction(key, 'player_save') && activeVideo) { e.preventDefault(); toggleSaveVideo(activeVideo); return; }
        if (isAction(key, 'player_fullscreen')) { e.preventDefault(); setIsFullScreen(true); return; }
        if (isAction(key, 'player_minimize')) { e.preventDefault(); setIsMinimized(true); return; }
        if (isAction(key, 'player_close')) { e.preventDefault(); setActiveVideo(null); setActiveIptv(null); return; }
      }

      if (isAction(key, 'goto_home')) { e.preventDefault(); router.push('/'); return; }
      if (isAction(key, 'goto_media')) { e.preventDefault(); router.push('/media'); return; }
      if (isAction(key, 'goto_quran')) { e.preventDefault(); router.push('/quran'); return; }
      if (isAction(key, 'goto_football')) { e.preventDefault(); router.push('/football'); return; }
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
  }, [navigate, isAction, activeIptv, activeVideo, isFullScreen, nextTrack, prevTrack, toggleSaveVideo, wallPlateType, setWallPlate, router, pathname, setIsFullScreen, setIsMinimized, setActiveVideo, setActiveIptv, dockSide]);

  return null;
}
