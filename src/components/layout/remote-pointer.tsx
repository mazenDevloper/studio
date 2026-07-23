
"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { normalizeKey, cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useMediaStore, AppAction, MappingContext } from "@/lib/store";
import { init } from "@noriginmedia/norigin-spatial-navigation";
import { useToast } from "@/hooks/use-toast";
import { getDisplayNumber } from "@/lib/constants";

/**
 * Sovereign Routing Engine v9997.0 - Vertical Navigation Fix
 * Features: Absolute vertical targeting for targeted rows, standard navigation for sidebar and search grid.
 */
export function RemotePointer() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  
  const { 
    wallPlateType, setWallPlate, isFullScreen, isMinimized, 
    activeVideo, activeIptv, 
    isAltModeActive, toggleAltMode,
    pickedUpId, setPickedUpId, reorderChannel, reorderReciter, reorderIptvChannel,
    isReorderMode, toggleReorderMode, setIsSidebarShrinked, isRecordingKey,
    displayScale, setDisplayScale, favoriteIptvChannels, setActiveIptv,
    mapSettings, updateMapSettings, customManuscripts, wallPlateData
  } = useMediaStore();

  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [displayBuffer, setDisplayBuffer] = useState<string>("");
  const bufferTimerRef = useRef<any>(null);

  useEffect(() => {
    try { init({ debug: false, visualDebug: false }); } 
    catch (e) { console.warn(e); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const activeDockBtn = document.querySelector('[data-nav-id^="dock-"].bg-blue-600\\/10') as HTMLElement;
      if (activeDockBtn) {
        activeDockBtn.focus();
        activeDockBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 600); 
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if (pathname !== '/media') return;
      const target = e.target as HTMLElement;
      const isInsideSidebar = target.closest('aside');
      setIsSidebarShrinked(!isInsideSidebar);
    };
    window.addEventListener('focusin', handleFocusIn);
    return () => window.removeEventListener('focusin', handleFocusIn);
  }, [pathname, setIsSidebarShrinked]);

  const isAction = useCallback((key: string, action: AppAction) => {
    const mappings = useMediaStore.getState().keyMappings;
    const isPlayerActive = (activeVideo || activeIptv) && isFullScreen && !isMinimized;
    const normalizedKey = key.toLowerCase();

    const screenMap: Record<string, string> = { 
      '/': 'dashboard', '/media': 'media', '/quran': 'quran', 
      '/football': 'football', '/iptv': 'iptv', '/settings': 'settings' 
    };
    const pageCtx = screenMap[pathname] || 'global';

    const match = (keysArr: string[] | undefined) => {
      if (!keysArr) return false;
      return keysArr.some(k => k.toLowerCase() === normalizedKey);
    };

    if (isPlayerActive) {
      if (match(mappings.player?.[action])) return true;
    }

    if (pageCtx !== 'global' && match(mappings[pageCtx]?.[action])) return true;
    return match(mappings.global?.[action]);
  }, [pathname, activeVideo, activeIptv, isFullScreen, isMinimized]);

  const navigateManuscript = useCallback((direction: 'next' | 'prev') => {
    if (!customManuscripts.length) return;

    if (wallPlateType === 'moon') {
      const currentIdx = mapSettings.moonManuIdx || 0;
      let nextIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
      if (nextIdx >= customManuscripts.length) nextIdx = 0;
      if (nextIdx < 0) nextIdx = customManuscripts.length - 1;
      updateMapSettings({ moonManuIdx: nextIdx });
      return;
    }

    if (!wallPlateData?.id) return;
    const currentId = wallPlateData.id || wallPlateData.content;
    const currentIdx = customManuscripts.findIndex(m => m.id === currentId || m.content === currentId);
    if (currentIdx === -1) {
      setWallPlate('manuscript', customManuscripts[0]);
      return;
    }
    let nextIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
    if (nextIdx >= customManuscripts.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = customManuscripts.length - 1;
    setWallPlate('manuscript', customManuscripts[nextIdx]);
  }, [wallPlateData, wallPlateType, customManuscripts, setWallPlate, mapSettings.moonManuIdx, updateMapSettings]);

  const navigate = useCallback((direction: string) => {
    if (wallPlateType) return;
    const focusables = Array.from(document.querySelectorAll(".focusable")).filter(el => {
      if (el.tagName === 'INPUT' && !(el as HTMLInputElement).classList.contains('focusable')) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }) as HTMLElement[];

    let current = document.activeElement as HTMLElement;
    if (!current || current === document.body || !current.classList.contains("focusable")) {
      const rescue = document.querySelector('[data-nav-id^="dock-"].bg-blue-600\\/10') as HTMLElement || focusables[0];
      rescue?.focus();
      return;
    }

    if (pickedUpId) {
      const type = current.getAttribute('data-type');
      if (type === 'channel' || type === 'reciter' || type === 'iptv') {
        const movePrev = (direction === 'ArrowRight' || direction === 'ArrowUp');
        const moveNext = (direction === 'ArrowLeft' || direction === 'ArrowDown');
        if (type === 'channel') { if (movePrev) reorderChannel(pickedUpId, 'prev'); if (moveNext) reorderChannel(pickedUpId, 'next'); }
        else if (type === 'reciter') { if (movePrev) reorderReciter(pickedUpId, 'prev'); if (moveNext) reorderReciter(pickedUpId, 'next'); }
        else if (type === 'iptv') { if (movePrev) reorderIptvChannel(pickedUpId, 'prev'); if (moveNext) reorderIptvChannel(pickedUpId, 'next'); }
      }
      return;
    }

    const currentRect = current.getBoundingClientRect();
    const isVertical = direction === "ArrowUp" || direction === "ArrowDown";
    
    // --- MEDIA SOVEREIGN NAVIGATION: Targeted Jumping for Row Isolation ---
    if (pathname === '/media' && isVertical) {
      const container = current.closest('nav, aside, main');
      if (container && container.tagName !== 'ASIDE') {
        const currentRow = current.closest('[data-row-id]');
        const rowId = currentRow?.getAttribute('data-row-id');
        
        // Skip targeted logic if we are in the results grid (let geometric fallback handle it)
        if (rowId !== 'row-grid-content') {
          const isDown = direction === "ArrowDown";
          const allRows = Array.from(container.querySelectorAll('[data-row-id]'));
          const currentIdx = allRows.indexOf(currentRow as Element);
          const nextRow = isDown ? allRows[currentIdx + 1] : allRows[currentIdx - 1];
          
          if (nextRow) {
            const nextRowId = nextRow.getAttribute('data-row-id');
            let targetNavId = '';
            
            if (nextRowId === 'row-styles') targetNavId = 'style-link-verses';
            else if (nextRowId === 'row-reciters') targetNavId = 'reciter-add';
            else if (nextRowId === 'row-juz') targetNavId = 'juz-15';
            else if (nextRowId === 'row-surahs') targetNavId = 'surah-17'; // Kahf
            else if (nextRowId?.startsWith('row-vids-')) {
               const listId = nextRowId.split('row-vids-')[1];
               targetNavId = `row-${listId}-video-0`;
            }
            
            let next = (targetNavId ? nextRow.querySelector(`[data-nav-id="${targetNavId}"]`) : nextRow.querySelector('.focusable')) as HTMLElement;
            if (!next) next = nextRow.querySelector('.focusable') as HTMLElement;
            
            if (next) {
              next.focus();
              next.scrollIntoView({ behavior: 'smooth', block: 'center' });
              return;
            }
          }
        }
      }
    }

    // Fallback Geometric Navigation (Handles Sidebar, Grids, and fallback jumps)
    let minDistance = Infinity;
    let next: HTMLElement | null = null;

    for (const el of focusables) {
      if (el === current) continue;
      
      const rect2 = el.getBoundingClientRect();
      const p1 = { x: currentRect.left + currentRect.width / 2, y: currentRect.top + currentRect.height / 2 };
      const p2 = { x: rect2.left + rect2.width / 2, y: rect2.top + rect2.height / 2 };
      const dx = p2.x - p1.x; const dy = p2.y - p1.y;
      
      if (direction === "ArrowRight" && dx <= 5) continue;
      if (direction === "ArrowLeft" && dx >= -5) continue;
      if (direction === "ArrowDown" && dy <= 5) continue;
      if (direction === "ArrowUp" && dy >= -5) continue;

      const distWeight = isVertical ? (dx * dx * 100) + (dy * dy) : (dx * dx) + (dy * dy * 100);
      const d = Math.sqrt(distWeight);
      if (d < minDistance) { minDistance = d; next = el; }
    }

    if (next) { 
      next.focus(); 
      next.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' }); 
    }
  }, [wallPlateType, pickedUpId, reorderChannel, reorderReciter, reorderIptvChannel, pathname]);

  const executeAction = useCallback((finalKey: string, e: KeyboardEvent | null) => {
    const activeEl = document.activeElement as HTMLElement;

    if (isAction(finalKey, 'inc_font')) { e?.preventDefault(); updateMapSettings({ fontScale: Math.min(2.0, (mapSettings.fontScale || 1.0) + 0.1) }); return; }
    if (isAction(finalKey, 'dec_font')) { e?.preventDefault(); updateMapSettings({ fontScale: Math.max(0.3, (mapSettings.fontScale || 1.0) - 0.1) }); return; }
    if (isAction(finalKey, 'next_manuscript')) { e?.preventDefault(); navigateManuscript('next'); return; }
    if (isAction(finalKey, 'prev_manuscript')) { e?.preventDefault(); navigateManuscript('prev'); return; }

    if (isAction(finalKey, 'media_scroll_up')) {
      e?.preventDefault();
      window.scrollBy({ top: -600, behavior: 'smooth' });
      return;
    }
    if (isAction(finalKey, 'media_scroll_down')) {
      e?.preventDefault();
      window.scrollBy({ top: 600, behavior: 'smooth' });
      return;
    }

    if (/^\d+$/.test(finalKey)) {
      const displayNum = parseInt(finalKey);
      const target = favoriteIptvChannels.find((_, idx) => getDisplayNumber(idx) === displayNum);
      if (target) {
        e?.preventDefault();
        setActiveIptv(target, favoriteIptvChannels);
        toast({ title: "بث مباشر", description: `الانتقال إلى ${target.name}` });
        return;
      }
    }

    if (isAction(finalKey, 'inc_zoom')) { e?.preventDefault(); setDisplayScale(Math.min(1.5, (displayScale || 1.0) + 0.05)); return; }
    if (isAction(finalKey, 'dec_zoom')) { e?.preventDefault(); setDisplayScale(Math.max(0.5, (displayScale || 1.0) - 0.05)); return; }
    if (isAction(finalKey, 'toggle_reorder')) { e?.preventDefault(); toggleReorderMode(); return; }
    
    if (isAction(finalKey, 'nav_back')) { e?.preventDefault(); if (wallPlateType) { setWallPlate(null); return; } if (pathname !== '/') router.push('/'); return; }
    if (isAction(finalKey, 'goto_home')) { e?.preventDefault(); router.push('/'); return; }
    if (isAction(finalKey, 'goto_media')) { e?.preventDefault(); router.push('/media'); return; }
    if (isAction(finalKey, 'goto_quran')) { e?.preventDefault(); router.push('/quran'); return; }
    if (isAction(finalKey, 'goto_hihi2')) { e?.preventDefault(); router.push('/hihi2'); return; }
    if (isAction(finalKey, 'goto_iptv')) { e?.preventDefault(); router.push('/iptv'); return; }
    if (isAction(finalKey, 'goto_football')) { e?.preventDefault(); router.push('/football'); return; }
    if (isAction(finalKey, 'goto_settings')) { e?.preventDefault(); router.push('/settings'); return; }
    
    if (isAction(finalKey, 'nav_up')) { e?.preventDefault(); navigate("ArrowUp"); return; }
    if (isAction(finalKey, 'nav_down')) { e?.preventDefault(); navigate("ArrowDown"); return; }
    if (isAction(finalKey, 'nav_left')) { e?.preventDefault(); navigate("ArrowLeft"); return; }
    if (isAction(finalKey, 'nav_right')) { e?.preventDefault(); navigate("ArrowRight"); return; }
    
    if (isAction(finalKey, 'nav_ok') || (e && (e.keyCode === 13 || e.key === 'Enter'))) { 
      if (activeEl?.classList.contains("focusable")) {
        const type = activeEl.getAttribute('data-type');
        if ((type === 'channel' || type === 'reciter' || type === 'iptv') && isReorderMode) {
          const id = activeEl.getAttribute('data-id');
          if (id) { e?.preventDefault(); e?.stopPropagation(); setPickedUpId(pickedUpId === id ? null : id); return; }
        }
        e?.preventDefault(); activeEl.click();
      }
    }
  }, [navigate, isAction, wallPlateType, setWallPlate, pathname, favoriteIptvChannels, setActiveIptv, router, mapSettings, updateMapSettings, navigateManuscript, displayScale, setDisplayScale, isReorderMode, pickedUpId, setPickedUpId, toggleReorderMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      let rawKey = normalizeKey(e); 
      
      if (activeEl?.tagName === 'INPUT' && !activeEl.classList.contains('focusable')) { 
        if (e.key === "Enter" || e.key === "Escape") { activeEl.blur(); return; }
        return; 
      }

      if (rawKey === 'Sub') { e.preventDefault(); toggleAltMode(); return; }
      
      let translatedKey = rawKey;
      if (isAltModeActive) {
        if (translatedKey === '2') translatedKey = 'ArrowUp'; 
        else if (translatedKey === '8') translatedKey = 'ArrowDown'; 
        else if (translatedKey === '4') translatedKey = 'ArrowLeft'; 
        else if (translatedKey === '6') translatedKey = 'ArrowRight'; 
        else if (translatedKey === '5') translatedKey = 'Enter';
      }

      const isNumeric = /^\d$/.test(rawKey);
      const isDualKey = isAltModeActive && ['2','4','6','8','5'].includes(rawKey);

      if (!isRecordingKey && isNumeric) {
        if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
        
        const nextBuffer = displayBuffer + rawKey;
        setDisplayBuffer(nextBuffer);

        if (nextBuffer.length >= 2) {
          executeAction(nextBuffer, e);
          setDisplayBuffer("");
          if (!isDualKey) { e.preventDefault(); return; }
        } else {
          if (!isDualKey) {
            bufferTimerRef.current = setTimeout(() => {
              executeAction(nextBuffer, null);
              setDisplayBuffer("");
            }, 1000); 
            e.preventDefault();
            return;
          } else {
            bufferTimerRef.current = setTimeout(() => setDisplayBuffer(""), 1000);
          }
        }
      }

      setPressedKey(translatedKey);
      setTimeout(() => setPressedKey(null), 2500); 
      executeAction(translatedKey, e);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [executeAction, isAltModeActive, toggleAltMode, isRecordingKey, displayBuffer]);

  return (
    <>
      {(pressedKey || displayBuffer) && (
        <div className="fixed top-6 right-6 z-[10003] animate-in fade-in zoom-in duration-200">
          <div className="bg-black/60 backdrop-blur-3xl px-3 py-1 rounded-lg border border-white/10 shadow-2xl flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[7px] font-black text-primary border border-primary/20">Z</div>
            <span className="text-[14px] font-black text-white tracking-tighter uppercase tabular-nums">
              {displayBuffer || pressedKey}
            </span>
            {displayBuffer && (
              <div className="ml-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </div>
        </div>
      )}
    </>
  );
}
