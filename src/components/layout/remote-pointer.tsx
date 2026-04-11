
"use client";

import { useEffect, useCallback, useRef } from "react";
import { normalizeKey } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useMediaStore, AppAction, MappingContext } from "@/lib/store";
import { init } from "@noriginmedia/norigin-spatial-navigation";
import { useToast } from "@/hooks/use-toast";

/**
 * Smart Engine v38.0 - Advanced Action Handlers
 * Added Red Key (Delete) and Yellow Key (Star) processing for focused items.
 */
export function RemotePointer() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  
  const { 
    wallPlateType, setWallPlate, dockSide, isFullScreen, isMinimized, 
    activeVideo, activeIptv, setIsSidebarShrinked, isPlayerControlsExpanded, setIsPlayerControlsExpanded,
    isAltModeActive, toggleAltMode, removeChannel, removeReciter, toggleStarChannel, favoriteChannels
  } = useMediaStore();

  useEffect(() => {
    try { init({ debug: false, visualDebug: false }); } 
    catch (e) { console.warn(e); }
  }, []);

  const isAction = useCallback((key: string, action: AppAction) => {
    const mappings = useMediaStore.getState().keyMappings;
    const isPlayerActive = (activeVideo || activeIptv) && isFullScreen && !isMinimized;
    
    const normalizedKey = key.toLowerCase();
    const restrictedKeys = ['red', 'green', 'yellow', 'blue', 'sub', '7', '9'];
    const protectedKeys = ['1', '3', '0'];

    if (protectedKeys.includes(normalizedKey)) {
      return mappings.global?.[action]?.some(m => m.toLowerCase() === normalizedKey);
    }

    if (isPlayerActive) {
      if (mappings.player?.[action]?.some(m => m.toLowerCase() === normalizedKey)) return true;
      if (restrictedKeys.includes(normalizedKey)) return false;
    }

    const screenMap: Record<string, string> = { 
      '/': 'dashboard', '/media': 'media', '/quran': 'quran', 
      '/football': 'football', '/iptv': 'iptv', '/settings': 'settings' 
    };
    const pageCtx = screenMap[pathname];
    if (pageCtx && mappings[pageCtx]?.[action]?.some(m => m.toLowerCase() === normalizedKey)) return true;

    return mappings.global?.[action]?.some(m => m.toLowerCase() === normalizedKey);
  }, [pathname, activeVideo, activeIptv, isFullScreen, isMinimized]);

  const getZone = (el: HTMLElement) => {
    const id = el.getAttribute('data-nav-id') || "";
    if (id.startsWith('dock-')) return 1;
    if (id.startsWith('subs-') || id === 'reciter-all' || (id.startsWith('reciter-') && !id.includes('item') && !id.includes('q-'))) return 2;
    return 3;
  };

  const navigate = useCallback((direction: string) => {
    if (wallPlateType) return;
    
    const focusables = Array.from(document.querySelectorAll(".focusable")).filter(el => {
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

    const towardDock = "ArrowRight";
    const towardContent = "ArrowLeft";

    let minDistance = Infinity;
    let next: HTMLElement | null = null;
    const currentRowId = current.closest('[data-row-id]')?.getAttribute('data-row-id');

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

    if (!next && isHorizontal) {
      if (direction === towardContent) {
        if (currentZone === 1) {
          const targetZone = (pathname === '/media') ? 2 : 3;
          next = focusables.find(el => getZone(el) === targetZone && el.classList.contains('active-nav-target')) ||
                 focusables.find(el => getZone(el) === targetZone);
          if (next && targetZone === 3) setIsSidebarShrinked(true);
        }
        else if (currentZone === 2) {
          next = focusables.find(el => getZone(el) === 3 && (el.getAttribute('data-nav-id')?.includes('item') || el.getAttribute('data-nav-id')?.includes('grid') || el.getAttribute('data-nav-id')?.includes('q-'))) ||
                 focusables.find(el => getZone(el) === 3);
          if (next) setIsSidebarShrinked(true);
        }
      }
      else if (direction === towardDock) {
        if (currentZone === 3) {
          if (pathname === '/') {
            next = document.querySelector(`[data-nav-id="dock-Home"]`) as HTMLElement;
          } else if (pathname === '/media' || pathname === '/quran') {
            next = focusables.find(el => getZone(el) === 2 && el.classList.contains('active-nav-target')) ||
                   focusables.find(el => getZone(el) === 2);
            if (next) {
              setIsSidebarShrinked(false);
            } else {
              const appName = pathname === '/media' ? 'Media' : 'Quran';
              next = document.querySelector(`[data-nav-id="dock-${appName}"]`) as HTMLElement;
            }
          } else {
            const appName = ["Hihi2", "IPTV", "Football", "Settings"].find(a => pathname.toLowerCase().includes(a.toLowerCase())) || "Home";
            next = document.querySelector(`[data-nav-id="dock-${appName}"]`) as HTMLElement;
          }
        } else if (currentZone === 2) {
          const appName = ["Media", "Quran"].find(a => pathname.toLowerCase().includes(a.toLowerCase())) || "Home";
          next = document.querySelector(`[data-nav-id="dock-${appName}"]`) as HTMLElement;
        }
      }
    }

    if (next) { next.focus(); next.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); }
  }, [wallPlateType, pathname, setIsSidebarShrinked, dockSide]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      let key = normalizeKey(e); 
      
      if (activeEl?.tagName === 'INPUT' && !activeEl.classList.contains('focusable')) { 
        if (e.key === "Enter" || e.key === "Escape") { activeEl.blur(); return; }
        return; 
      }

      if (key === 'Sub') {
        e.preventDefault();
        toggleAltMode();
        toast({ title: useMediaStore.getState().isAltModeActive ? "تفعيل المود البديل" : "إيقاف المود البديل", description: useMediaStore.getState().isAltModeActive ? "الملاحة عبر الأرقام نشطة" : "العودة للمود القياسي" });
        return;
      }

      if (isAltModeActive) {
        if (key === 'ArrowUp') key = '2';
        else if (key === 'ArrowDown') key = '8';
        else if (key === 'ArrowLeft') key = '4';
        else if (key === 'ArrowRight') key = '6';
        else if (key === 'Enter') key = '5';
      }
      
      if (isAction(key, 'delete_item')) {
        const type = activeEl.getAttribute('data-type');
        const id = activeEl.getAttribute('data-id');
        if (type === 'channel' && id) {
          removeChannel(id);
          toast({ title: "تم الحذف", description: "تم إزالة القناة من المفضلة" });
        } else if (type === 'reciter' && id) {
          removeReciter(id);
          toast({ title: "تم الحذف", description: "تم إزالة القارئ من القائمة" });
        }
      }

      if (isAction(key, 'toggle_star')) {
        const type = activeEl.getAttribute('data-type');
        const id = activeEl.getAttribute('data-id');
        if (type === 'channel' && id) {
          toggleStarChannel(id);
          const isStarred = !favoriteChannels.find(c => c.channelid === id)?.starred;
          toast({ 
            title: isStarred ? "تم التمييز" : "إزالة التمييز", 
            description: isStarred ? "ستظهر القناة في الترددات المجرسة" : "تمت الإزالة من الترددات المجرسة" 
          });
        }
      }

      if (isAction(key, 'nav_back')) {
        e.preventDefault();
        if (wallPlateType) { setWallPlate(null); return; }
        if (!activeEl || activeEl === document.body || !activeEl.classList.contains("focusable")) {
          const rescue = document.querySelector('.active-nav-target') || document.querySelector('.focusable');
          (rescue as HTMLElement)?.focus(); return;
        }
        const currentZone = getZone(activeEl);
        if (currentZone === 3 && pathname === '/media') {
          setIsSidebarShrinked(false);
          const next = document.querySelector('.active-nav-target[data-nav-id^="subs-"]') as HTMLElement || 
                       document.querySelector('[data-nav-id="subs-all"]') as HTMLElement;
          if (next) next.focus();
          else { (document.querySelector(`[data-nav-id="dock-Media"]`) as HTMLElement)?.focus(); }
          return;
        }
        if (currentZone === 2 || (currentZone === 3 && pathname === '/quran')) {
          const appName = ["Media", "Quran", "Hihi2", "IPTV", "Football", "Settings"].find(a => pathname.toLowerCase().includes(a.toLowerCase())) || "Home";
          (document.querySelector(`[data-nav-id="dock-${appName}"]`) as HTMLElement)?.focus();
          return;
        }
        if (pathname !== '/') { router.back(); return; }
        return;
      }

      if (isAction(key, 'focus_search')) {
        e.preventDefault();
        const searchInput = document.querySelector('[data-nav-id="search-input"]') as HTMLElement;
        if (searchInput) { searchInput.focus(); searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        return;
      }

      if (isAction(key, 'player_settings')) { e.preventDefault(); setIsPlayerControlsExpanded(!isPlayerControlsExpanded); return; }

      const forceClick = (selector: string) => {
        const el = document.querySelector(selector) as HTMLElement;
        if (el) { e.preventDefault(); el.click(); el.focus(); return true; }
        return false;
      };

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

      if (isAction(key, 'goto_home')) { e.preventDefault(); router.push('/'); return; }
      if (isAction(key, 'goto_media')) { e.preventDefault(); router.push('/media'); return; }
      if (isAction(key, 'goto_quran')) { e.preventDefault(); router.push('/quran'); return; }
      if (isAction(key, 'goto_hihi2')) { e.preventDefault(); router.push('/hihi2'); return; }
      if (isAction(key, 'goto_iptv')) { e.preventDefault(); router.push('/iptv'); return; }
      if (isAction(key, 'goto_football')) { e.preventDefault(); router.push('/football'); return; }
      if (isAction(key, 'goto_settings')) { e.preventDefault(); router.push('/settings'); return; }

      if (isAction(key, 'goto_tab_appearance')) { forceClick('[data-nav-id="settings-tab-appearance"]'); return; }
      if (isAction(key, 'goto_tab_prayers')) { forceClick('[data-nav-id="settings-tab-prayers"]'); return; }
      if (isAction(key, 'goto_tab_reminders')) { forceClick('[data-nav-id="settings-tab-reminders"]'); return; }
      if (isAction(key, 'goto_tab_buttonmap')) { forceClick('[data-nav-id="settings-tab-buttonmap"]'); return; }

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
  }, [navigate, isAction, wallPlateType, setWallPlate, router, pathname, setIsSidebarShrinked, isPlayerControlsExpanded, setIsPlayerControlsExpanded, isAltModeActive, toggleAltMode, toast, dockSide, removeChannel, removeReciter, toggleStarChannel, favoriteChannels]);

  return null;
}
