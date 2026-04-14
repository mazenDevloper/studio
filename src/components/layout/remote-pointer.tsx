
"use client";

import { useEffect, useCallback, useRef } from "react";
import { normalizeKey } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useMediaStore, AppAction, MappingContext } from "@/lib/store";
import { init } from "@noriginmedia/norigin-spatial-navigation";
import { useToast } from "@/hooks/use-toast";

/**
 * Smart Engine v76.0 - Strict Sequential Navigation (1-2-3)
 * Corrected transition: Dock (1) <-> Sidebar (2) <-> Content (3)
 * Transition to content is now consistent with layout flow.
 */
export function RemotePointer() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const { 
    wallPlateType, setWallPlate, dockSide, isFullScreen, isMinimized, 
    activeVideo, activeIptv, setIsSidebarShrinked, isPlayerControlsExpanded, setIsPlayerControlsExpanded,
    isAltModeActive, toggleAltMode, removeChannel, removeReciter, toggleStarChannel, favoriteChannels,
    pickedUpId, setPickedUpId, reorderChannel, reorderReciter, reorderIptvChannel, removeVideo,
    isReorderMode, toggleReorderMode
  } = useMediaStore();

  useEffect(() => {
    try { init({ debug: false, visualDebug: false }); } 
    catch (e) { console.warn(e); }
  }, []);

  const isAction = useCallback((key: string, action: AppAction) => {
    const mappings = useMediaStore.getState().keyMappings;
    const isPlayerActive = (activeVideo || activeIptv) && isFullScreen && !isMinimized;
    const normalizedKey = key.toLowerCase();

    const screenMap: Record<string, string> = { 
      '/': 'dashboard', '/media': 'media', '/quran': 'quran', 
      '/football': 'football', '/iptv': 'iptv', '/settings': 'settings' 
    };
    const pageCtx = screenMap[pathname] || 'global';

    // Priority 1: Player Context
    if (isPlayerActive) {
      if (mappings.player?.[action]?.some(k => k.toLowerCase() === normalizedKey)) {
        return true;
      }
      const isReservedByPlayer = Object.values(mappings.player || {}).some(keys => 
        Array.isArray(keys) && keys.some(k => k.toLowerCase() === normalizedKey)
      );
      if (isReservedByPlayer) return false;
    }

    // Priority 2: Screen/Page Context
    if (pageCtx !== 'global' && mappings[pageCtx]?.[action]?.some(k => k.toLowerCase() === normalizedKey)) {
      return true;
    }

    // Priority 3: Global Context
    return mappings.global?.[action]?.some(k => k.toLowerCase() === normalizedKey) ?? false;
  }, [pathname, activeVideo, activeIptv, isFullScreen, isMinimized]);

  const handleSwipe = useCallback(() => {
    const distance = touchStartX.current - touchEndX.current;
    const threshold = 100;
    
    if (Math.abs(distance) < threshold) return;

    const activeEl = document.activeElement as HTMLElement;
    const isScrollable = activeEl && (activeEl.scrollHeight > activeEl.clientHeight || activeEl.scrollWidth > activeEl.clientWidth);
    if (isScrollable && activeEl.tagName !== 'BODY') return;

    const apps = ["/", "/media", "/quran", "/hihi2", "/iptv", "/football", "/settings"];
    const currentIndex = apps.indexOf(pathname);

    if (distance > threshold) {
      const nextIndex = (currentIndex + 1) % apps.length;
      router.push(apps[nextIndex]);
    } else if (distance < -threshold) {
      const prevIndex = (currentIndex - 1 + apps.length) % apps.length;
      router.push(apps[prevIndex]);
    }
  }, [pathname, router]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => { touchStartX.current = e.changedTouches[0].screenX; };
    const onTouchEnd = (e: TouchEvent) => { 
      touchEndX.current = e.changedTouches[0].screenX; 
      handleSwipe();
    };
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleSwipe]);

  const getZone = (el: HTMLElement) => {
    const id = el.getAttribute('data-nav-id') || "";
    if (id.startsWith('dock-')) return 1; // Dock
    if (id.startsWith('subs-') || id === 'reciter-all' || (id.startsWith('reciter-') && !id.includes('item') && !id.includes('q-'))) return 2; // Sidebar
    return 3; // Content
  };

  const navigate = useCallback((direction: string) => {
    if (wallPlateType) return;
    
    const focusables = Array.from(document.querySelectorAll(".focusable")).filter(el => {
      if (el.tagName === 'INPUT' && !(el as HTMLInputElement).classList.contains('focusable')) return false;
      return true;
    }) as HTMLElement[];

    let current = document.activeElement as HTMLElement;
    
    if (!current || current === document.body || !current.classList.contains("focusable")) {
      const rescue = document.querySelector('[data-nav-id="media-reorder-toggle"]') as HTMLElement ||
                     document.querySelector('.active-nav-target') as HTMLElement || 
                     focusables[0];
      rescue?.focus();
      return;
    }

    if (pickedUpId) {
      const type = current.getAttribute('data-type');
      const isRTL = document.documentElement.dir === 'rtl';
      if (type === 'channel' || type === 'reciter' || type === 'iptv') {
        const movePrev = isRTL ? (direction === 'ArrowRight' || direction === 'ArrowUp') : (direction === 'ArrowLeft' || direction === 'ArrowUp');
        const moveNext = isRTL ? (direction === 'ArrowLeft' || direction === 'ArrowDown') : (direction === 'ArrowRight' || direction === 'ArrowDown');
        if (type === 'channel') { if (movePrev) reorderChannel(pickedUpId, 'prev'); if (moveNext) reorderChannel(pickedUpId, 'next'); }
        else if (type === 'reciter') { if (movePrev) reorderReciter(pickedUpId, 'prev'); if (moveNext) reorderReciter(pickedUpId, 'next'); }
        else if (type === 'iptv') { if (movePrev) reorderIptvChannel(pickedUpId, 'prev'); if (moveNext) reorderIptvChannel(pickedUpId, 'next'); }
      }
      return;
    }

    const currentRect = current.getBoundingClientRect();
    const currentZone = getZone(current);
    const isVertical = direction === "ArrowUp" || direction === "ArrowDown";
    const isHorizontal = direction === "ArrowLeft" || direction === "ArrowRight";
    
    const towardDock = dockSide === 'left' ? "ArrowLeft" : "ArrowRight";
    const towardContent = dockSide === 'left' ? "ArrowRight" : "ArrowLeft";

    let minDistance = Infinity;
    let next: HTMLElement | null = null;
    const currentRowId = current.closest('[data-row-id]')?.getAttribute('data-row-id');

    // First attempt: Move within the SAME zone
    for (const el of focusables) {
      if (el === current || getZone(el) !== currentZone) continue;
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

    // Second attempt: Jump between zones (Sequential 1-2-3)
    if (!next && isHorizontal) {
      if (direction === towardContent) {
        if (currentZone === 1) {
          // Dock (1) -> Sidebar (2)
          next = focusables.find(el => getZone(el) === 2);
          if (next) setIsSidebarShrinked(false);
        }
        else if (currentZone === 2) {
          // Sidebar (2) -> Content (3)
          next = focusables.find(el => getZone(el) === 3 && el.classList.contains('active-nav-target')) ||
                 focusables.find(el => getZone(el) === 3);
          if (next) setIsSidebarShrinked(true);
        }
      }
      else if (direction === towardDock) {
        if (currentZone === 3) {
          // Content (3) -> Sidebar (2)
          next = focusables.find(el => getZone(el) === 2);
          if (next) setIsSidebarShrinked(false);
        } else if (currentZone === 2) {
          // Sidebar (2) -> Dock (1)
          next = document.querySelector(`[data-nav-id^="dock-"]`) as HTMLElement;
          if (next) setIsSidebarShrinked(true);
        }
      }
    }

    if (next) { next.focus(); next.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); }
  }, [wallPlateType, pathname, setIsSidebarShrinked, dockSide, pickedUpId, reorderChannel, reorderReciter, reorderIptvChannel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      let key = normalizeKey(e); 
      if (activeEl?.tagName === 'INPUT' && !activeEl.classList.contains('focusable')) { 
        if (e.key === "Enter" || e.key === "Escape") { activeEl.blur(); return; }
        return; 
      }

      if (key === 'Sub') { e.preventDefault(); toggleAltMode(); return; }
      if (isAltModeActive) {
        if (key === '2') key = 'ArrowUp'; else if (key === '8') key = 'ArrowDown'; else if (key === '4') key = 'ArrowLeft'; else if (key === '6') key = 'ArrowRight'; else if (key === '5') key = 'Enter';
      }
      
      if (isAction(key, 'toggle_reorder')) { e.preventDefault(); toggleReorderMode(); return; }
      if (isAction(key, 'delete_item')) {
        const type = activeEl.getAttribute('data-type');
        const id = activeEl.getAttribute('data-id');
        if (type === 'channel' && id) removeChannel(id);
        else if (type === 'reciter' && id) removeReciter(id);
        else if (type === 'iptv' && id) toggleStarChannel(id);
        else if (activeEl.getAttribute('data-nav-id')?.startsWith('saved-video-')) {
          const videoId = activeEl.getAttribute('data-video-id');
          if (videoId) removeVideo(videoId);
        }
      }

      if (isAction(key, 'nav_back')) {
        e.preventDefault();
        if (wallPlateType) { setWallPlate(null); return; }
        const currentZone = getZone(activeEl);
        if (currentZone === 2 || currentZone === 3) {
          const appName = ["Media", "Quran", "Hihi2", "IPTV", "Football", "Settings"].find(a => pathname.toLowerCase().includes(a.toLowerCase())) || "Home";
          (document.querySelector(`[data-nav-id="dock-${appName}"]`) as HTMLElement)?.focus();
          return;
        }
        if (pathname !== '/') { router.back(); return; }
        return;
      }

      if (isAction(key, 'goto_home')) { e.preventDefault(); router.push('/'); return; }
      if (isAction(key, 'goto_media')) { e.preventDefault(); router.push('/media'); return; }
      if (isAction(key, 'goto_quran')) { e.preventDefault(); router.push('/quran'); return; }
      if (isAction(key, 'goto_hihi2')) { e.preventDefault(); router.push('/hihi2'); return; }
      if (isAction(key, 'goto_iptv')) { e.preventDefault(); router.push('/iptv'); return; }
      if (isAction(key, 'goto_football')) { e.preventDefault(); router.push('/football'); return; }
      if (isAction(key, 'goto_settings')) { e.preventDefault(); router.push('/settings'); return; }

      if (isAction(key, 'nav_up')) { e.preventDefault(); navigate("ArrowUp"); return; }
      if (isAction(key, 'nav_down')) { e.preventDefault(); navigate("ArrowDown"); return; }
      if (isAction(key, 'nav_left')) { e.preventDefault(); navigate("ArrowLeft"); return; }
      if (isAction(key, 'nav_right')) { e.preventDefault(); navigate("ArrowRight"); return; }
      
      if (isAction(key, 'nav_ok') || e.keyCode === 13) { 
        if (activeEl?.classList.contains("focusable")) {
          const type = activeEl.getAttribute('data-type');
          if ((type === 'channel' || type === 'reciter' || type === 'iptv') && isReorderMode) {
            const id = activeEl.getAttribute('data-id');
            if (id) { e.preventDefault(); e.stopPropagation(); setPickedUpId(pickedUpId === id ? null : id); return; }
          }
          if (isReorderMode && !type) { e.preventDefault(); return; }
          e.preventDefault(); activeEl.click();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [navigate, isAction, wallPlateType, setWallPlate, router, pathname, setIsSidebarShrinked, isPlayerControlsExpanded, setIsPlayerControlsExpanded, isAltModeActive, toggleAltMode, toast, dockSide, removeChannel, removeReciter, toggleStarChannel, favoriteChannels, pickedUpId, setPickedUpId, removeVideo, isReorderMode, toggleReorderMode]);

  return null;
}
