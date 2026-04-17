
"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { normalizeKey } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useMediaStore, AppAction, MappingContext } from "@/lib/store";
import { init } from "@noriginmedia/norigin-spatial-navigation";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * Smart Engine v115.0 - Micro Feedback & Precision Navigation
 */
export function RemotePointer() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  
  const { 
    wallPlateType, setWallPlate, dockSide, isFullScreen, isMinimized, 
    activeVideo, activeIptv, selectedChannel, setActiveIptv,
    isAltModeActive, toggleAltMode, removeChannel, removeReciter, toggleStarChannel, favoriteChannels,
    pickedUpId, setPickedUpId, reorderChannel, reorderReciter, reorderIptvChannel, removeVideo,
    isReorderMode, toggleReorderMode, setIsSidebarShrinked, isRecordingKey, favoriteIptvChannels,
    displayScale, setDisplayScale
  } = useMediaStore();

  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const keyBufferRef = useRef<string>("");
  const comboTimeoutRef = useRef<any>(null);

  useEffect(() => {
    try { init({ debug: false, visualDebug: false }); } 
    catch (e) { console.warn(e); }
  }, []);

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
      const isReservedByPlayer = Object.values(mappings.player || {}).some(keys => 
        Array.isArray(keys) && keys.some(k => k.toLowerCase() === normalizedKey)
      );
      if (isReservedByPlayer) return false;
    }

    if (pageCtx !== 'global' && match(mappings[pageCtx]?.[action])) return true;
    return match(mappings.global?.[action]);
  }, [pathname, activeVideo, activeIptv, isFullScreen, isMinimized]);

  const navigate = useCallback((direction: string) => {
    if (wallPlateType) return;
    const isRTL = document.documentElement.dir === 'rtl';
    const focusables = Array.from(document.querySelectorAll(".focusable")).filter(el => {
      if (el.tagName === 'INPUT' && !(el as HTMLInputElement).classList.contains('focusable')) return false;
      return true;
    }) as HTMLElement[];

    let current = document.activeElement as HTMLElement;
    if (!current || current === document.body || !current.classList.contains("focusable")) {
      const rescue = document.querySelector('[data-nav-id="dash-col-1"]') as HTMLElement || focusables[0];
      rescue?.focus();
      return;
    }

    if (pickedUpId) {
      const type = current.getAttribute('data-type');
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
    const isVertical = direction === "ArrowUp" || direction === "ArrowDown";
    const isMovingToSidebar = (dockSide === 'left' && direction === 'ArrowLeft') || (dockSide === 'right' && direction === 'ArrowRight');

    // Precision Content -> Sidebar Navigation (Restricted Level 2)
    if (pathname === '/media' && !current.closest('aside')) {
      if (isVertical) {
        // Strict Isolation: Vertical buttons stay within content in media view
      } else if (isMovingToSidebar) {
        const navId = current.getAttribute('data-nav-id') || '';
        const isFirstItem = navId.endsWith('-0') || navId === 'reciter-add' || navId === 'surah-0' || navId === 'subs-all';
        
        if (isFirstItem) {
          let targetId = 'subs-all'; 
          if (selectedChannel) {
            const idx = favoriteChannels.findIndex(c => c.channelid === selectedChannel.channelid);
            if (idx !== -1) targetId = `subs-${idx + 1}`;
          }
          const sidebarTarget = document.querySelector(`[data-nav-id="${targetId}"]`) as HTMLElement;
          if (sidebarTarget) { sidebarTarget.focus(); return; }
        } else {
          // Stay within content level if not on the very first element of a section
        }
      }
    }

    let minDistance = Infinity;
    let next: HTMLElement | null = null;

    for (const el of focusables) {
      if (el === current) continue;
      
      // Vertical Isolation Fix: Prevent vertical jump to sidebar in Media View
      if (pathname === '/media' && isVertical && !current.closest('aside') && el.closest('aside')) continue;

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
  }, [wallPlateType, dockSide, pickedUpId, reorderChannel, reorderReciter, reorderIptvChannel, pathname, selectedChannel, favoriteChannels]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      let rawKey = normalizeKey(e); 
      
      if (activeEl?.tagName === 'INPUT' && !activeEl.classList.contains('focusable')) { 
        if (e.key === "Enter" || e.key === "Escape") { activeEl.blur(); return; }
        return; 
      }

      setPressedKey(rawKey);
      setTimeout(() => setPressedKey(null), 2000);

      if (rawKey === 'Sub') { e.preventDefault(); toggleAltMode(); return; }
      
      let finalKey = rawKey;
      if (!isRecordingKey) {
        if (keyBufferRef.current) {
          finalKey = keyBufferRef.current + rawKey;
          keyBufferRef.current = "";
          if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
        } else if (['Red', 'Green', 'Yellow', 'Blue', '1', '3', '5', '7', '9'].includes(rawKey)) {
          keyBufferRef.current = rawKey;
          if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
          comboTimeoutRef.current = setTimeout(() => {
            if (keyBufferRef.current === rawKey) {
              keyBufferRef.current = "";
            }
          }, 2000);
        }
      }

      const possibleNum = parseInt(finalKey);
      if (!isNaN(possibleNum) && possibleNum >= 11 && possibleNum <= 23 && !isRecordingKey) {
        const favs = useMediaStore.getState().favoriteIptvChannels;
        const targetIdx = favs.findIndex((_, idx) => {
          let num = 11 + idx;
          if (num >= 13) num++;
          if (num >= 17) num++;
          return num === possibleNum;
        });
        if (targetIdx !== -1) {
          e.preventDefault();
          setActiveIptv(favs[targetIdx], favs);
          toast({ title: `تشغيل القناة ${possibleNum}`, description: favs[targetIdx].name });
          return;
        }
      }

      if (isAltModeActive) {
        if (finalKey === '2') finalKey = 'ArrowUp'; else if (finalKey === '8') finalKey = 'ArrowDown'; else if (finalKey === '4') finalKey = 'ArrowLeft'; else if (finalKey === '6') finalKey = 'ArrowRight'; else if (finalKey === '5') finalKey = 'Enter';
      }

      if (isAction(finalKey, 'inc_zoom')) {
        e.preventDefault();
        const newScale = Math.min(1.5, (displayScale || 1.0) + 0.05);
        setDisplayScale(newScale);
        toast({ title: "تكبير الزوم", description: `${Math.round(newScale * 100)}%` });
        return;
      }

      if (isAction(finalKey, 'dec_zoom')) {
        e.preventDefault();
        const newScale = Math.max(0.5, (displayScale || 1.0) - 0.05);
        setDisplayScale(newScale);
        toast({ title: "تصغير الزوم", description: `${Math.round(newScale * 100)}%` });
        return;
      }

      if (isAction(finalKey, 'toggle_reorder')) { e.preventDefault(); toggleReorderMode(); return; }
      if (isAction(finalKey, 'delete_item')) {
        const type = activeEl.getAttribute('data-type');
        const id = activeEl.getAttribute('data-id');
        if (type === 'channel' && id) removeChannel(id);
        else if (type === 'reciter' && id) removeReciter(id);
        else if (type === 'iptv' && id) toggleStarChannel(id);
        else if (activeEl.getAttribute('data-nav-id')?.startsWith('saved-video-')) {
          const videoId = activeEl.getAttribute('data-video-id');
          if (videoId) removeVideo(videoId);
        }
        return;
      }

      if (isAction(finalKey, 'nav_back')) {
        e.preventDefault();
        if (wallPlateType) { setWallPlate(null); return; }
        if (pathname !== '/') { router.back(); return; }
        return;
      }

      if (isAction(finalKey, 'goto_home')) { e.preventDefault(); router.push('/'); return; }
      if (isAction(finalKey, 'goto_media')) { e.preventDefault(); router.push('/media'); return; }
      if (isAction(finalKey, 'goto_quran')) { e.preventDefault(); router.push('/quran'); return; }
      if (isAction(finalKey, 'goto_hihi2')) { e.preventDefault(); router.push('/hihi2'); return; }
      if (isAction(finalKey, 'goto_iptv')) { e.preventDefault(); router.push('/iptv'); return; }
      if (isAction(finalKey, 'goto_football')) { e.preventDefault(); router.push('/football'); return; }
      if (isAction(finalKey, 'goto_settings')) { e.preventDefault(); router.push('/settings'); return; }
      
      if (isAction(finalKey, 'nav_up')) { e.preventDefault(); navigate("ArrowUp"); return; }
      if (isAction(finalKey, 'nav_down')) { e.preventDefault(); navigate("ArrowDown"); return; }
      if (isAction(finalKey, 'nav_left')) { e.preventDefault(); navigate("ArrowLeft"); return; }
      if (isAction(finalKey, 'nav_right')) { e.preventDefault(); navigate("ArrowRight"); return; }
      
      if (isAction(finalKey, 'nav_ok') || e.keyCode === 13) { 
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
  }, [navigate, isAction, wallPlateType, setWallPlate, router, pathname, isAltModeActive, toggleAltMode, toast, removeChannel, removeReciter, toggleStarChannel, pickedUpId, setPickedUpId, removeVideo, isReorderMode, toggleReorderMode, isRecordingKey, setActiveIptv, displayScale, setDisplayScale]);

  return (
    <>
      {pressedKey && (
        <div className="fixed top-6 right-6 z-[10003] animate-in fade-in zoom-in duration-300">
          <div className="bg-black/60 backdrop-blur-3xl px-3 py-1.5 rounded-xl border border-white/10 shadow-2xl flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-black text-primary border border-primary/20">زر</div>
            <span className="text-[10px] font-black text-white tracking-tighter uppercase">{pressedKey}</span>
          </div>
        </div>
      )}
    </>
  );
}
