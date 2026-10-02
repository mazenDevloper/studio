
'use client';

import { useEffect, useCallback, useRef, useState } from "react";
import { normalizeKey, cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useMediaStore, AppAction, MappingContext } from "@/lib/store";
import { init } from "@noriginmedia/norigin-spatial-navigation";
import { useToast } from "@/hooks/use-toast";

/**
 * RemotePointer v1461.0 - Sovereign Precision Engine
 * Features: Screen-Aware Selective Joystick Inversion + Advanced Input Isolation.
 */
export function RemotePointer() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  
  const { 
    wallPlateType, isFullScreen, isMinimized, 
    activeVideo, activeIptv, setGridMode,
    setIsRecordingKey, isRecordingKey, recordingAction, setRecordingAction,
    setIsSidebarShrinked, setKeyMapping, nextTrack, prevTrack, setActiveVideo, setActiveIptv,
    mapSettings
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
    const screenMap: Record<string, string> = { '/': 'dashboard', '/dashboard': 'dashboard', '/media': 'media', '/quran': 'quran', '/football': 'football', '/iptv': 'iptv', '/settings': 'settings' };
    const pageCtx = screenMap[pathname] || 'global';
    const match = (keysArr: string[] | undefined) => (Array.isArray(keysArr) ? keysArr : []).some(k => k.toLowerCase() === normalizedKey);
    
    if (isPlayerActive && match(mappings.player?.[action])) return true;
    if (pageCtx !== 'global' && match(mappings[pageCtx]?.[action])) return true;
    return match(mappings.global?.[action]);
  }, [pathname, activeVideo, activeIptv, isFullScreen, isMinimized]);

  const handleScroll = (dir: 'up' | 'down') => {
    const zone = document.querySelector('[data-nav-zone="content"]') as HTMLElement;
    if (!zone) return;
    const scrollTarget = zone.scrollHeight > zone.clientHeight ? zone : (zone.closest('.overflow-auto, .overflow-y-auto') as HTMLElement || window);
    scrollTarget.scrollBy({ top: dir === 'up' ? -400 : 400, behavior: 'smooth' });
  };

  const navigate = useCallback((direction: string) => {
    if (wallPlateType) return;

    let finalDir = direction;
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 968;

    // Apply 90-degree Rotation Logic for Portrait/Side installations - ONLY for small screens
    if (isSmallScreen && (mapSettings.autoRotateNav90 ?? true)) {
      if (finalDir === 'ArrowUp') finalDir = 'ArrowLeft';
      else if (finalDir === 'ArrowLeft') finalDir = 'ArrowDown';
      else if (finalDir === 'ArrowDown') finalDir = 'ArrowRight';
      else if (finalDir === 'ArrowRight') finalDir = 'ArrowUp';
    }

    // Apply Standard Joystick Inversion Logic - ONLY for small screens
    if (isSmallScreen && (mapSettings.invertJoystickX ?? true)) {
      if (finalDir === 'ArrowLeft') finalDir = 'ArrowRight';
      else if (finalDir === 'ArrowRight') finalDir = 'ArrowLeft';
    }
    if (isSmallScreen && (mapSettings.invertJoystickY ?? true)) {
      if (finalDir === 'ArrowUp') finalDir = 'ArrowDown';
      else if (finalDir === 'ArrowDown') finalDir = 'ArrowUp';
    }

    const focusables = Array.from(document.querySelectorAll(".focusable")).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }) as HTMLElement[];

    let current = document.activeElement as HTMLElement;
    if (!current || current === document.body || !current.classList.contains("focusable")) {
      // SOVEREIGN FOCUS RESCUE PROTOCOL
      const reciterTarget = document.querySelector('[data-nav-id="reciter-item-0"]') as HTMLElement;
      const rescue = reciterTarget || (document.querySelector('[data-nav-zone="content"] .focusable') as HTMLElement) || focusables[0];
      
      if (rescue) {
        rescue.focus(); 
        rescue.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
      return;
    }

    const currentRowId = current.closest('[data-row-id]')?.getAttribute('data-row-id');
    const currentZone = current.closest('[data-nav-zone]')?.getAttribute('data-nav-zone') || 'global';
    const currentNavId = current.getAttribute('data-nav-id') || '';
    const isFirstInRow = currentNavId.endsWith('-0') || currentNavId.endsWith('surah-0') || currentNavId.endsWith('cat-0');

    if (['ArrowLeft', 'ArrowRight'].includes(finalDir)) {
      const sameRowFocusables = focusables.filter(el => el.closest('[data-row-id]')?.getAttribute('data-row-id') === currentRowId);
      const nextInRow = findBestCandidate(current, sameRowFocusables, finalDir);
      
      if (nextInRow) {
        nextInRow.focus();
        nextInRow.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        return;
      }

      const targetZoneFocusables = focusables.filter(el => el.closest('[data-nav-zone]')?.getAttribute('data-nav-zone') !== currentZone);
      const bestZoneTarget = findBestCandidate(current, targetZoneFocusables, finalDir);

      if (bestZoneTarget) {
        const targetZone = bestZoneTarget.closest('[data-nav-zone]')?.getAttribute('data-nav-zone');
        
        if (targetZone === 'sidebar') {
          const target = document.querySelector('[data-nav-id="sidebar-channel-0"]') as HTMLElement || bestZoneTarget;
          target.focus(); target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          setIsSidebarShrinked(false);
          return;
        }
        
        if (targetZone === 'content') {
          const target = document.querySelector('[data-nav-id="reciter-item-0"]') as HTMLElement || document.querySelector('[data-nav-zone="content"] .focusable') as HTMLElement || bestZoneTarget;
          target.focus(); target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          setIsSidebarShrinked(true);
          return;
        }

        if (targetZone === 'dock') {
          const target = document.querySelector('[data-nav-id="dock-Media"]') as HTMLElement || bestZoneTarget;
          target.focus(); target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          setIsSidebarShrinked(false);
          return;
        }

        bestZoneTarget.focus();
        bestZoneTarget.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
      return;
    }

    const sameZoneFocusables = focusables.filter(el => el.closest('[data-nav-zone]')?.getAttribute('data-nav-zone') === currentZone);
    const nextInZone = findBestCandidate(current, sameZoneFocusables, finalDir);

    if (nextInZone) {
      const targetRowId = nextInZone.closest('[data-row-id]')?.getAttribute('data-row-id');
      
      if (isFirstInRow && targetRowId !== currentRowId) {
         const firstInTargetRow = focusables.find(el => {
            const row = el.closest('[data-row-id]')?.getAttribute('data-row-id');
            const navId = el.getAttribute('data-nav-id') || '';
            return row === targetRowId && (navId.endsWith('-0') || navId.endsWith('surah-0'));
         });
         if (firstInTargetRow) {
            firstInTargetRow.focus();
            firstInTargetRow.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            return;
         }
      }

      nextInZone.focus();
      nextInZone.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      return;
    }
  }, [wallPlateType, setIsSidebarShrinked, mapSettings]);

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

  /** Is `key` mapped to `action` in one specific context (player / page / global)? */
  const inCtx = (key: string, action: AppAction, ctx: string) =>
    (useMediaStore.getState().keyMappings?.[ctx]?.[action] ?? []).some(k => String(k).toLowerCase() === key.toLowerCase());

  /** Press the visible button that shows this action's key badge (the badge says which button the key works). */
  const pressShortcut = (action: AppAction, scope: ParentNode = document): boolean => {
    const badges = Array.from(scope.querySelectorAll<HTMLElement>(`[data-shortcut="${action}"]`)).reverse(); // later = on top (player)
    for (const b of badges) {
      const host = (b.closest("button") || b.parentElement?.querySelector("button") || b.parentElement) as HTMLElement | null;
      if (!host) continue;
      const r = host.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      host.click();
      return true;
    }
    return false;
  };

  /** Actions on the selected item (favourite star, remove): only inside the focused card, never another card. */
  const itemAction = (action: AppAction): boolean => {
    let scope: HTMLElement | null = document.activeElement as HTMLElement;
    for (let i = 0; scope && scope !== document.body && i < 3; i++, scope = scope.parentElement) {
      if (pressShortcut(action, scope)) return true;
      if (action === "toggle_star" || action === "delete_item") {
        const star = scope.querySelector("svg.lucide-star")?.closest("button") as HTMLElement | null;
        if (star) { star.click(); return true; }
      }
    }
    return false;
  };

  const executeAction = useCallback((finalKey: string, e: KeyboardEvent | null) => {
    const activeEl = document.activeElement as any;
    const isTypingMode = (activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA') && !activeEl?.readOnly;

    if (isRecordingKey && recordingAction) {
      const FORBIDDEN_KEYS = ['Backspace', 'Escape', 'Back', 'Exit', 'Delete'];
      if (FORBIDDEN_KEYS.includes(finalKey)) {
        toast({ variant: 'destructive', title: "مفتاح محظور" });
        setIsRecordingKey(false); setRecordingAction(null); return;
      }
      setKeyMapping(recordingAction.ctx, recordingAction.act, finalKey);
      setIsRecordingKey(false); setRecordingAction(null);
      toast({ title: "تم البرمجة" });
      return;
    } 

    if (isTypingMode) {
       // INPUT ISOLATION: Only allow navigation within input or via arrow keys
       // Block numeric shortcuts and other mapped actions while typing
       if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(finalKey)) {
          e?.preventDefault();
          navigate(finalKey);
          return;
       }
       // Do not run isAction checks for any other keys when typing
       return;
    }

    // ---- player keys: in full screen, in the small window and (close / restore only) when minimised ----
    const st = useMediaStore.getState();
    if (activeVideo || activeIptv) {
      const playerActs: AppAction[] = ['player_close', 'player_minimize', 'player_playlist', 'player_settings', 'player_fullscreen', 'player_mode', 'player_save'];
      for (const act of playerActs) {
        if (isMinimized && act !== 'player_close' && act !== 'player_minimize') continue;
        if (!inCtx(finalKey, act, 'player')) continue;
        e?.preventDefault();
        if (act === 'player_close') handleClose();
        else if (act === 'player_minimize') st.setIsMinimized(!isMinimized);
        else if (act === 'player_playlist') { if (!pressShortcut(act)) st.setIsPlayerPlaylistOpen(!st.isPlayerPlaylistOpen); }
        else if (act === 'player_fullscreen') { if (!pressShortcut(act)) st.setIsFullScreen(!isFullScreen); }
        else pressShortcut(act);
        return;
      }
    }

    // ---- colour keys on the page: star / remove the selected item, reorder mode ----
    for (const act of ['toggle_star', 'delete_item', 'toggle_reorder'] as AppAction[]) {
      if (!isAction(finalKey, act)) continue;
      if (act === 'toggle_reorder' ? pressShortcut(act) : itemAction(act)) { e?.preventDefault(); return; }
    }

    const isPlayerActive = (activeVideo || activeIptv) && isFullScreen && !isMinimized;
    if (isPlayerActive) {
      if (isAction(finalKey, 'player_next')) { e?.preventDefault(); nextTrack(); return; }
      if (isAction(finalKey, 'player_prev')) { e?.preventDefault(); prevTrack(); return; }
      if (isAction(finalKey, 'player_close')) { e?.preventDefault(); handleClose(); return; }
    }

    if (isAction(finalKey, 'nav_scroll_up')) { e?.preventDefault(); handleScroll('up'); return; }
    if (isAction(finalKey, 'nav_scroll_down')) { e?.preventDefault(); handleScroll('down'); return; }
    if (isAction(finalKey, 'nav_up')) { e?.preventDefault(); navigate("ArrowUp"); return; }
    if (isAction(finalKey, 'nav_down')) { e?.preventDefault(); navigate("ArrowDown"); return; }
    if (isAction(finalKey, 'nav_left')) { e?.preventDefault(); navigate("ArrowLeft"); return; }
    if (isAction(finalKey, 'nav_right')) { e?.preventDefault(); navigate("ArrowRight"); return; }
    if (isAction(finalKey, 'nav_ok') || (e && (e.keyCode === 13 || e.key === 'Enter'))) { 
      if (activeEl?.classList.contains("focusable") && !isTypingMode) { e?.preventDefault(); activeEl.click(); }
    }
    
    if (isAction(finalKey, 'goto_home')) { e?.preventDefault(); router.push('/dashboard'); return; }
    if (isAction(finalKey, 'goto_media')) { e?.preventDefault(); router.push('/media'); return; }
    if (isAction(finalKey, 'goto_quran')) { e?.preventDefault(); router.push('/quran'); return; }
    if (isAction(finalKey, 'goto_matches')) { e?.preventDefault(); router.push('/matches'); return; }
    if (isAction(finalKey, 'goto_hihi2')) { e?.preventDefault(); router.push('/hihi2'); return; }
    if (isAction(finalKey, 'goto_iptv')) { e?.preventDefault(); router.push('/iptv'); return; }
    if (isAction(finalKey, 'goto_football')) { e?.preventDefault(); router.push('/football'); return; }
    if (isAction(finalKey, 'goto_settings')) { e?.preventDefault(); router.push('/settings'); return; }
    if (isAction(finalKey, 'goto_car_dashboard')) { e?.preventDefault(); router.push('/car-dashboard'); return; }
  }, [navigate, isAction, wallPlateType, router, isRecordingKey, recordingAction, setIsRecordingKey, setRecordingAction, setKeyMapping, toast, activeVideo, activeIptv, isFullScreen, isMinimized, nextTrack, prevTrack]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let rawKey = normalizeKey(e); 
      executeAction(rawKey, e);
      setPressedKey(rawKey); setTimeout(() => setPressedKey(null), 2500); 
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [executeAction]);

  const handleClose = () => { 
     useMediaStore.getState().setActiveVideo(null); 
     useMediaStore.getState().setActiveIptv(null); 
  };

  return (
    <>{pressedKey && <div className="fixed top-6 right-6 z-[10003] animate-in fade-in zoom-in duration-200"><div className="bg-black/60 backdrop-blur-3xl px-3 py-1 rounded-lg border border-white/10 shadow-2xl flex items-center gap-2"><span className="text-[14px] font-black text-white tracking-tighter uppercase tabular-nums">{pressedKey}</span></div></div>}</>
  );
}
