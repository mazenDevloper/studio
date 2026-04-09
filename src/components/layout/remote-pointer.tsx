
"use client";

import { useEffect, useCallback, useRef } from "react";
import { normalizeKey } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useMediaStore, AppAction } from "@/lib/store";
import { init } from "@noriginmedia/norigin-spatial-navigation";

/**
 * Smart Engine v23.0 - Sequential Flow & Aggregate Jumps
 */
export function RemotePointer() {
  const pathname = usePathname();
  const router = useRouter();
  
  const { 
    wallPlateType, setWallPlate, dockSide, isFullScreen, isMinimized, 
    activeVideo, activeIptv, setIsSidebarShrinked
  } = useMediaStore();

  useEffect(() => {
    try { init({ debug: false, visualDebug: false }); } 
    catch (e) { console.warn(e); }
  }, []);

  const isAction = useCallback((key: string, action: AppAction) => {
    const mappings = useMediaStore.getState().keyMappings;
    const isPlayerActive = (activeVideo || activeIptv) && isFullScreen && !isMinimized;
    
    const check = (ctx: string) => mappings[ctx]?.[action]?.some(m => m.toLowerCase() === key.toLowerCase());
    
    if (isPlayerActive && check('player')) return true;

    const screenMap: Record<string, string> = { 
      '/': 'dashboard', '/media': 'media', '/quran': 'quran', 
      '/football': 'football', '/iptv': 'iptv', '/settings': 'settings' 
    };
    const pageCtx = screenMap[pathname];
    if (pageCtx && check(pageCtx)) return true;

    return check('global');
  }, [pathname, activeVideo, activeIptv, isFullScreen, isMinimized]);

  const getZone = (el: HTMLElement) => {
    const id = el.getAttribute('data-nav-id') || "";
    if (id.startsWith('dock-')) return 1;
    // Zone 2 is sidebar (subscriptions, reciters list)
    if (id.startsWith('subs-') || id === 'reciter-all' || (id.startsWith('reciter-') && !id.includes('item') && !id.includes('q-'))) return 2;
    return 3; // Everything else is content
  };

  const navigate = useCallback((direction: string) => {
    if (wallPlateType) return;
    
    const focusables = Array.from(document.querySelectorAll(".focusable")).filter(el => {
      const id = el.getAttribute('data-nav-id') || "";
      if (el.tagName === 'INPUT' && !(el as HTMLInputElement).classList.contains('focusable')) return false;
      return true;
    }) as HTMLElement[];

    let current = document.activeElement as HTMLElement;
    
    if (!current || current === document.body || !current.classList.contains("focusable")) {
      const rescue = document.querySelector('.active-nav-target') as HTMLElement || focusables[0];
      rescue?.focus();
      return;
    }

    const currentRect = current.getBoundingClientRect();
    const currentZone = getZone(current);
    
    const isVertical = direction === "ArrowUp" || direction === "ArrowDown";
    const isHorizontal = direction === "ArrowLeft" || direction === "ArrowRight";

    // Nav Logic: Left = Content (1->2->3), Right = Dock (3->2->1)
    const towardContent = "ArrowLeft";
    const towardDock = "ArrowRight";

    let minDistance = Infinity;
    let next: HTMLElement | null = null;
    const currentRowId = current.closest('[data-row-id]')?.getAttribute('data-row-id');

    // 1. SEARCH WITHIN CURRENT ZONE (Strict Row Isolation)
    for (const el of focusables) {
      if (el === current || getZone(el) !== currentZone) continue;
      
      // Strict Row Isolation for Content Zone
      if (isHorizontal && currentZone === 3) {
        const targetRowId = el.closest('[data-row-id]')?.getAttribute('data-row-id');
        if (currentRowId && targetRowId && currentRowId !== targetRowId) continue;
      }
      
      const rect2 = el.getBoundingClientRect();
      const p1 = { x: currentRect.left + currentRect.width / 2, y: currentRect.top + currentRect.height / 2 };
      const p2 = { x: rect2.left + rect2.width / 2, y: rect2.top + rect2.height / 2 };
      const dx = p2.x - p1.x; const dy = p2.y - p1.y;
      
      if (direction === "ArrowRight" && dx <= 5) continue;
      if (direction === "ArrowLeft" && dx >= -5) continue;
      if (direction === "ArrowDown" && dy <= 5) continue;
      if (direction === "ArrowUp" && dy >= -5) continue;
      
      const d = Math.sqrt(dx*dx + dy*dy) + (isVertical ? Math.abs(dx)*5 : Math.abs(dy)*50);
      if (d < minDistance) { minDistance = d; next = el; }
    }

    // 2. EDGE JUMPING (Level Switches)
    if (!next && isHorizontal) {
      // 1 -> 2 or 1 -> 3
      if (currentZone === 1 && direction === towardContent) {
        const targetZone = (pathname === '/media' || pathname === '/quran') ? 2 : 3;
        next = focusables.find(el => getZone(el) === targetZone && el.classList.contains('active-nav-target')) ||
               focusables.find(el => getZone(el) === targetZone);
        if (next && targetZone === 3) setIsSidebarShrinked(true);
      }
      // 2 -> 3 (Jump to content)
      else if (currentZone === 2 && direction === towardContent) {
        // Find first item in content area
        next = focusables.find(el => getZone(el) === 3 && (el.getAttribute('data-nav-id')?.includes('item') || el.getAttribute('data-nav-id')?.includes('grid') || el.getAttribute('data-nav-id')?.includes('q-'))) ||
               focusables.find(el => getZone(el) === 3);
        if (next) setIsSidebarShrinked(true);
      }
      // 3 -> 2 or 2 -> 1 (Back to Dock)
      else if (direction === towardDock) {
        if (currentZone === 3) {
          setIsSidebarShrinked(false);
          const hasSidebar = pathname === '/media' || pathname === '/quran';
          if (hasSidebar) {
            next = focusables.find(el => getZone(el) === 2 && el.classList.contains('active-nav-target')) ||
                   focusables.find(el => getZone(el) === 2);
          } else {
            const apps = ["Home", "Media", "Quran", "Hihi2", "IPTV", "Football", "Settings"];
            const appName = pathname === '/' ? 'Home' : apps.find(a => pathname.toLowerCase().includes(a.toLowerCase())) || "Home";
            next = document.querySelector(`[data-nav-id="dock-${appName}"]`) as HTMLElement;
          }
        } else if (currentZone === 2) {
          const apps = ["Home", "Media", "Quran", "Hihi2", "IPTV", "Football", "Settings"];
          const appName = pathname === '/' ? 'Home' : apps.find(a => pathname.toLowerCase().includes(a.toLowerCase())) || "Home";
          next = document.querySelector(`[data-nav-id="dock-${appName}"]`) as HTMLElement;
        }
      }
    }

    if (next) { 
      next.focus(); 
      next.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); 
    }
  }, [wallPlateType, pathname, setIsSidebarShrinked]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      const key = normalizeKey(e); 
      
      if (activeEl?.tagName === 'INPUT' && !activeEl.classList.contains('focusable')) { 
        if (e.key === "Enter" || e.key === "Escape") { activeEl.blur(); return; }
        return; 
      }
      
      // Global Back/Exit Action
      if (isAction(key, 'nav_back')) {
        e.preventDefault();
        if (wallPlateType) { setWallPlate(null); return; }
        if (pathname !== '/') { router.back(); return; }
        return;
      }

      // Key 0 Rescue
      if (key === '0' && (!activeEl || activeEl === document.body)) {
        const rescue = document.querySelector('.focusable') as HTMLElement;
        rescue?.focus();
        return;
      }

      // FORCED TAB/BUTTON ACTIONS
      const forceClick = (selector: string) => {
        const el = document.querySelector(selector) as HTMLElement;
        if (el) { e.preventDefault(); el.click(); el.focus(); return true; }
        return false;
      };

      if (isAction(key, 'focus_search')) { forceClick('[data-nav-id="search-btn"]'); return; }
      if (isAction(key, 'focus_reciters')) {
        e.preventDefault();
        const el = document.querySelector('[data-nav-id*="q-reciter-item-0"], [data-nav-id*="q-reciter-0"]') as HTMLElement;
        if (el) { setIsSidebarShrinked(true); el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        return;
      }
      if (isAction(key, 'focus_surahs')) {
        e.preventDefault();
        const el = document.querySelector('[data-nav-id*="q-surah-item-0"], [data-nav-id*="q-surah-0"]') as HTMLElement;
        if (el) { setIsSidebarShrinked(true); el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        return;
      }

      // App Jumps
      if (isAction(key, 'goto_home')) { e.preventDefault(); router.push('/'); return; }
      if (isAction(key, 'goto_media')) { e.preventDefault(); router.push('/media'); return; }
      if (isAction(key, 'goto_quran')) { e.preventDefault(); router.push('/quran'); return; }
      if (isAction(key, 'goto_hihi2')) { e.preventDefault(); router.push('/hihi2'); return; }
      if (isAction(key, 'goto_iptv')) { e.preventDefault(); router.push('/iptv'); return; }
      if (isAction(key, 'goto_football')) { e.preventDefault(); router.push('/football'); return; }
      if (isAction(key, 'goto_settings')) { e.preventDefault(); router.push('/settings'); return; }

      // Tab Swaps
      if (isAction(key, 'goto_tab_appearance')) { forceClick('[data-nav-id="settings-tab-appearance"]'); return; }
      if (isAction(key, 'goto_tab_prayers')) { forceClick('[data-nav-id="settings-tab-prayers"]'); return; }
      if (isAction(key, 'goto_tab_reminders')) { forceClick('[data-nav-id="settings-tab-reminders"]'); return; }
      if (isAction(key, 'goto_tab_buttonmap')) { forceClick('[data-nav-id="settings-tab-buttonmap"]'); return; }

      // Standard Navigation
      if (isAction(key, 'nav_up')) { e.preventDefault(); navigate("ArrowUp"); return; }
      if (isAction(key, 'nav_down')) { e.preventDefault(); navigate("ArrowDown"); return; }
      if (isAction(key, 'nav_left')) { e.preventDefault(); navigate("ArrowLeft"); return; }
      if (isAction(key, 'nav_right')) { e.preventDefault(); navigate("ArrowRight"); return; }
      
      if (isAction(key, 'nav_ok') || e.keyCode === 13) { 
        if (activeEl?.classList.contains("focusable")) { e.preventDefault(); activeEl.click(); }
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [navigate, isAction, wallPlateType, setWallPlate, router, pathname, setIsSidebarShrinked]);

  return null;
}
