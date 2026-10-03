"use client";

import { useEffect, useRef } from "react";
import { useMediaStore } from "@/lib/store";
import { nativeIsland, type NativeCommand } from "@/lib/native-app";

const QURAN_META = "native-quran-meta-v1";

/** Surah names + a list of reciters for the Quran widget (quran.com, cached for a week). */
async function quranMeta(): Promise<{ surahs: string[]; reciters: { id: number; name: string }[] } | null> {
  try {
    const c = JSON.parse(localStorage.getItem(QURAN_META) || "null");
    if (c && Date.now() - c.at < 7 * 86_400_000) return c.meta;
  } catch {}
  try {
    const [ch, rc] = await Promise.all([
      fetch("/api/quran?path=chapters&language=ar").then(r => r.json()),
      fetch("/api/quran?path=resources/recitations&language=ar").then(r => r.json()),
    ]);
    const meta = {
      surahs: (ch.chapters || []).map((c: any) => String(c.name_arabic)),
      reciters: (rc.recitations || []).map((r: any) => ({ id: r.id, name: `${r.translated_name?.name || r.reciter_name}${r.style ? ` (${r.style})` : ""}` })),
    };
    if (meta.surahs.length) try { localStorage.setItem(QURAN_META, JSON.stringify({ at: Date.now(), meta })); } catch {}
    return meta;
  } catch { return null; }
}

/**
 * Inside the Android app: feeds the home-screen widgets (now playing, Quran surahs / reciters) and handles what
 * they send back - player controls, picture-in-picture. Renders nothing.
 */
export function NativeWidgetsBridge() {
  const activeVideo = useMediaStore(s => s.activeVideo);
  const activeAudio = useMediaStore(s => s.activeAudio);
  const activeIptv = useMediaStore(s => s.activeIptv);
  const isPlaying = useMediaStore(s => s.isPlaying);
  const quran = useRef<Awaited<ReturnType<typeof quranMeta>>>(null);
  const beforePip = useRef<boolean | null>(null);

  // what the media widget shows, and whether leaving the app should go picture-in-picture
  useEffect(() => {
    const plugin = nativeIsland();
    if (!plugin) return;
    const item = activeVideo ?? activeAudio;
    const nowPlaying = activeIptv
      ? { title: activeIptv.name, subtitle: "IPTV", playing: isPlaying, kind: "iptv" }
      : item ? { title: item.title, subtitle: item.channelTitle || "", playing: isPlaying, kind: activeVideo ? "video" : "audio" } : null;
    const send = () => plugin.updateWidgets({ data: JSON.stringify({ origin: location.origin, nowPlaying, quran: quran.current ?? undefined }) }).catch(() => {});
    send();
    if (!quran.current) quranMeta().then(m => { if (m) { quran.current = m; send(); } });
    plugin.setVideoPlaying({ playing: !!((activeVideo || activeIptv) && isPlaying) }).catch(() => {});
  }, [activeVideo, activeAudio, activeIptv, isPlaying]);

  // commands from the widgets / picture-in-picture
  useEffect(() => {
    const plugin = nativeIsland();
    if (!plugin) return;
    const run = (c: NativeCommand) => {
      const s = useMediaStore.getState();
      if (c.cmd === "media") {
        if (c.arg === "toggle") s.setIsPlaying(!s.isPlaying);
        else if (c.arg === "next") (s.activeIptv ? s.nextIptvChannel() : s.nextTrack());
        else if (c.arg === "prev") (s.activeIptv ? s.prevIptvChannel() : s.prevTrack());
      } else if (c.cmd === "pip") {
        // the small floating window shows just the player; back to the previous layout afterwards
        if (c.arg === "1") { beforePip.current = s.isFullScreen; s.setIsFullScreen(true); }
        else if (beforePip.current !== null) { s.setIsFullScreen(beforePip.current); beforePip.current = null; }
      }
    };
    let handle: { remove: () => void } | null = null;
    Promise.resolve(plugin.addListener("command", run)).then(h => {
      handle = h;
      plugin.takePendingCommands().then(r => (r.commands || []).forEach(run)).catch(() => {});
    }).catch(() => {});
    return () => { handle?.remove(); };
  }, []);

  return null;
}
