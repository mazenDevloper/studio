
"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { normalizeKey, cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useMediaStore, AppAction, MappingContext } from "@/lib/store";
import { init } from "@noriginmedia/norigin-spatial-navigation";
import { useToast } from "@/hooks/use-toast";

export function RemotePointer() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  
  const { 
    wallPlateType, isFullScreen, isMinimized, 
    activeVideo, activeIptv, 
    setIsRecordingKey, isRecordingKey, recordingAction, setRecordingAction,
    setIsSidebarShrinked, setKeyMapping, nextTrack, prevTrack, setActiveVideo, setActiveIptv
  } = useMediaStore();

  const [pressedKey, setPressedKey] = useState<string | null>(null);

  useEffect(() => {
    try { init({ debug: false, visualDebug: false }); } 
    catch (e) { console.warn(e); }
  }, []);

  const isAction = useCallback((key: string, action: AppAction) => {
    const mappings = useMediaStore.getState().keyMappings;
    const isPlayerActive = (activeVideo || activeIptv) && isFullScreen && !isMinimized;
    const normalizedKey = key.toLowerCase();
    const screenMap: Record<string, string> = { '/': 'dashboard', '/media': 'media', '/quran': 'quran', '/football': 'football', '/iptv': 'iptv', '/settings': 'settings' };
    const pageCtx = screenMap[pathname] || 'global';
    const match = (keysArr: string[] | undefined) => keysArr?.some(k => k.toLowerCase() === normalizedKey);
    
    if (isPlayerActive && match(mappings.player?.[action])) return true;
    if (pageCtx !== 'global' && match(mappings[pageCtx]?.[action])) return true;
    return match(mappings.global?.[action]);
  }, [pathname, activeVideo, activeIptv, isFullScreen, isMinimized]);

  const navigate = useCallback((direction: string) => {
    if (wallPlateType) return;
    const focusables = Array.from(document.querySelectorAll(".focusable")).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }) as HTMLElement[];

    let current = document.activeElement as HTMLElement;
    if (!current || current === document.body || !current.classList.contains("focusable")) {
      const rescue = document.querySelector('[data-nav-id="sidebar-channel-0"]') as HTMLElement || focusables[0];
      rescue?.focus(); return;
    }

    const currentZone = current.closest('[data-nav-zone]')?.getAttribute('data-nav-zone') || 'global';
    const currentRowId = current.closest('[data-row-id]')?.getAttribute('data-row-id');
    const isVertical = direction === "ArrowUp" || direction === "ArrowDown";
    const isHorizontal = direction === "ArrowLeft" || direction === "ArrowRight";

    if (isVertical) {
      const sameZoneFocusables = focusables.filter(el => el.closest('[data-nav-zone]')?.getAttribute('data-nav-zone') === currentZone);
      findNext(current, sameZoneFocusables, direction);
      return;
    }

    if (isHorizontal) {
      const sameZoneFocusables = focusables.filter(el => el.closest('[data-nav-zone]')?.getAttribute('data-nav-zone') === currentZone);
      const candidatesInRow = sameZoneFocusables.filter(el => el.closest('[data-row-id]')?.getAttribute('data-row-id') === currentRowId);
      const nextInRow = findBestCandidate(current, candidatesInRow, direction);
      
      if (nextInRow) {
        nextInRow.focus();
        nextInRow.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        return;
      }

      const targetZoneFocusables = focusables.filter(el => el.closest('[data-nav-zone]')?.getAttribute('data-nav-zone') !== currentZone);
      const bestZoneTarget = findBestCandidate(current, targetZoneFocusables, direction);

      if (bestZoneTarget) {
        const targetZone = bestZoneTarget.closest('[data-nav-zone]')?.getAttribute('data-nav-zone');
        if (targetZone === 'sidebar') {
          const target = document.querySelector('[data-nav-id="sidebar-channel-0"]') as HTMLElement || bestZoneTarget;
          target.focus(); setIsSidebarShrinked(false); return;
        }
        if (targetZone === 'content') {
          const target = document.querySelector('[data-nav-zone="content"] .focusable') as HTMLElement || bestZoneTarget;
          target.focus(); setIsSidebarShrinked(true); return;
        }
        if (targetZone === 'dock') setIsSidebarShrinked(true);
        bestZoneTarget.focus();
      }
    }
  }, [wallPlateType, setIsSidebarShrinked]);

  const findBestCandidate = (current: HTMLElement, candidates: HTMLElement[], direction: string) => {
    const currentRect = current.getBoundingClientRect();
    let minDistance = Infinity;
    let next: HTMLElement | null = null;
    for (const el of candidates) {
      if (el === current) continue;
      const rect2 = el.getBoundingClientRect();
      const p1 = { x: currentRect.left + currentRect.width / 2, y: currentRect.top + currentRect.height / 2 };
      const p2 = { x: rect2.left + rect2.width / 2, y: rect2.top + rect2.height / 2 };
      const dx = p2.x - p1.x; const dy = p2.y - p1.y;
      if (direction === "ArrowRight" && dx <= 5) continue;
      if (direction === "ArrowLeft" && dx >= -5) continue;
      if (direction === "ArrowDown" && dy <= 5) continue;
      if (direction === "ArrowUp" && dy >= -5) continue;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDistance) { minDistance = d; next = el; }
    }
    return next;
  };

  const findNext = (current: HTMLElement, candidates: HTMLElement[], direction: string) => {
    const next = findBestCandidate(current, candidates, direction);
    if (next) {
      next.focus();
      next.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const executeAction = useCallback((finalKey: string, e: KeyboardEvent | null) => {
    const activeEl = document.activeElement as HTMLElement;
    const isInputFocused = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA' || activeEl?.getAttribute('contenteditable') === 'true';

    if (isRecordingKey && recordingAction) {
      const FORBIDDEN_KEYS = ['Backspace', 'Escape', 'Back', 'Delete'];
      if (FORBIDDEN_KEYS.includes(finalKey)) {
        toast({ variant: 'destructive', title: "مفتاح محظور", description: "هذا المفتاح مخصص لوظائف النظام الأساسية" });
        setIsRecordingKey(false);
        setRecordingAction(null);
        return;
      }
      setKeyMapping(recordingAction.ctx, recordingAction.act, finalKey);
      setIsRecordingKey(false);
      setRecordingAction(null);
      toast({ title: "تم البرمجة", description: `تم ربط المفتاح ${finalKey} بنجاح` });
      return;
    } 

    if (isInputFocused && !['Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(finalKey)) {
      return;
    }

    // Player Actions Prioritization
    const isPlayerActive = (activeVideo || activeIptv) && isFullScreen && !isMinimized;
    if (isPlayerActive) {
      if (isAction(finalKey, 'player_next')) { e?.preventDefault(); nextTrack(); return; }
      if (isAction(finalKey, 'player_prev')) { e?.preventDefault(); prevTrack(); return; }
      if (isAction(finalKey, 'player_close')) { e?.preventDefault(); setActiveVideo(null); setActiveIptv(null); return; }
    }

    if (isAction(finalKey, 'nav_up')) { e?.preventDefault(); navigate("ArrowUp"); return; }
    if (isAction(finalKey, 'nav_down')) { e?.preventDefault(); navigate("ArrowDown"); return; }
    if (isAction(finalKey, 'nav_left')) { e?.preventDefault(); navigate("ArrowLeft"); return; }
    if (isAction(finalKey, 'nav_right')) { e?.preventDefault(); navigate("ArrowRight"); return; }
    if (isAction(finalKey, 'nav_ok') || (e && (e.keyCode === 13 || e.key === 'Enter'))) { 
      if (activeEl?.classList.contains("focusable")) { e?.preventDefault(); activeEl.click(); }
    }
    
    if (!isInputFocused) {
      if (isAction(finalKey, 'goto_home')) { e?.preventDefault(); router.push('/dashboard'); return; }
      if (isAction(finalKey, 'goto_media')) { e?.preventDefault(); router.push('/media'); return; }
      if (isAction(finalKey, 'goto_quran')) { e?.preventDefault(); router.push('/quran'); return; }
      if (isAction(finalKey, 'goto_hihi2')) { e?.preventDefault(); router.push('/hihi2'); return; }
      if (isAction(finalKey, 'goto_iptv')) { e?.preventDefault(); router.push('/iptv'); return; }
      if (isAction(finalKey, 'goto_football')) { e?.preventDefault(); router.push('/football'); return; }
      if (isAction(finalKey, 'goto_settings')) { e?.preventDefault(); router.push('/settings'); return; }
    }
  }, [navigate, isAction, wallPlateType, router, isRecordingKey, recordingAction, setIsRecordingKey, setRecordingAction, setKeyMapping, toast, activeVideo, activeIptv, isFullScreen, isMinimized, nextTrack, prevTrack, setActiveVideo, setActiveIptv]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let rawKey = normalizeKey(e); 
      executeAction(rawKey, e);
      setPressedKey(rawKey); setTimeout(() => setPressedKey(null), 2500); 
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [executeAction]);

  return (
    <>
      {pressedKey && (
        <div className="fixed top-6 right-6 z-[10003] animate-in fade-in zoom-in duration-200">
          <div className="bg-black/60 backdrop-blur-3xl px-3 py-1 rounded-lg border border-white/10 shadow-2xl flex items-center gap-2">
            <span className="text-[14px] font-black text-white tracking-tighter uppercase tabular-nums">{pressedKey}</span>
          </div>
        </div>
      )}
    </>
  );
}
