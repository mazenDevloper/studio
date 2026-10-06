"use client";

import { useEffect, useRef } from "react";
import { useMediaStore } from "@/lib/store";
import { nativeIsland, hubSet, type NativeCommand } from "@/lib/native-app";
import type { YouTubeVideo } from "@/lib/youtube";

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
 * Inside the Android app: feeds the home-screen widgets (now playing, Quran surahs / reciters, the board's
 * manuscripts and ink, the folders) and handles what they send back - player controls, picture-in-picture, a folder or
 * video tapped on the folders widget. Each part is sent on its own: the app merges them. Renders nothing.
 */
export function NativeWidgetsBridge() {
  const activeVideo = useMediaStore(s => s.activeVideo);
  const activeAudio = useMediaStore(s => s.activeAudio);
  const activeIptv = useMediaStore(s => s.activeIptv);
  const isPlaying = useMediaStore(s => s.isPlaying);
  const customManuscripts = useMediaStore(s => s.customManuscripts);
  const manuscriptScales = useMediaStore(s => s.manuscriptScales);
  const customFonts = useMediaStore(s => s.customFonts);
  const mapSettings = useMediaStore(s => s.mapSettings);
  const playlists = useMediaStore(s => s.playlists);
  const quran = useRef<Awaited<ReturnType<typeof quranMeta>>>(null);
  const beforePip = useRef<boolean | null>(null);
  const lastBoard = useRef("");

  // what the media widget shows, and whether leaving the app should go picture-in-picture
  useEffect(() => {
    const plugin = nativeIsland();
    if (!plugin) return;
    const item = activeVideo ?? activeAudio;
    const nowPlaying = activeIptv
      ? { title: activeIptv.name, subtitle: "IPTV", playing: isPlaying, kind: "iptv", thumb: activeIptv.stream_icon || undefined }
      : item ? { title: item.title, subtitle: item.channelTitle || "", playing: isPlaying, kind: activeVideo ? "video" : "audio", thumb: item.thumbnail || undefined } : null;
    const send = () => plugin.updateWidgets({ data: JSON.stringify({ origin: location.origin, nowPlaying, quran: quran.current ?? undefined }) }).catch(() => {});
    send();
    if (!quran.current) quranMeta().then(m => { if (m) { quran.current = m; send(); } });
    plugin.setVideoPlaying({ playing: !!((activeVideo || activeIptv) && isPlaying) }).catch(() => {});
  }, [activeVideo, activeAudio, activeIptv, isPlaying]);

  // the manuscript widget: the board's manuscripts (pictures as sent, the app keeps them as files), its ink and background
  useEffect(() => {
    const plugin = nativeIsland();
    if (!plugin) return;
    const fontUrl = (name?: string) => (name && (customFonts || []).find(f => f.name === name)?.url) || undefined;
    const manuscripts = (customManuscripts || []).slice(0, 12).map(m => ({
      id: m.id,
      src: m.pngDataUrl || undefined,
      content: m.pngDataUrl ? undefined : m.content,
      fontUrl: m.pngDataUrl ? undefined : fontUrl(m.fontFamily),
      scale: (m.scale || 1) * (manuscriptScales?.[m.id] || 1),
    }));
    const board = {
      manuscripts,
      pinnedManuscriptId: mapSettings.pinnedManuscriptId || "",
      ink: { mode: mapSettings.manuscriptInk || "white", color: mapSettings.manuscriptInkColor || "", texture: mapSettings.manuscriptTexture || "" },
      board: { bg: mapSettings.manuscriptBgUrl || "", show: mapSettings.showManuscriptBg !== false },
    };
    // the pictures can be large: send only when something the widget shows changed
    const key = JSON.stringify({ ...board, manuscripts: manuscripts.map(m => [m.id, m.src?.length ?? 0, m.content, m.fontUrl, m.scale]) });
    if (key === lastBoard.current) return;
    lastBoard.current = key;
    plugin.updateWidgets({ data: JSON.stringify(board) }).catch(() => {});
  }, [customManuscripts, manuscriptScales, customFonts, mapSettings]);

  // the folders widget: each folder with its first video's thumbnail
  useEffect(() => {
    const plugin = nativeIsland();
    if (!plugin) return;
    const list = (playlists || []).slice(0, 20).map(p => ({ id: p.id, name: p.name, count: p.videos?.length || 0, thumb: p.videos?.[0]?.thumbnail || "" }));
    plugin.updateWidgets({ data: JSON.stringify({ playlists: list }) }).catch(() => {});
  }, [playlists]);

  // the trips' places and weekly trips (site settings / cloud) reach the phone's planner
  const places = useMediaStore(st => st.places);
  const weeklyTrips = useMediaStore(st => st.weeklyTrips);
  useEffect(() => {
    if (!nativeIsland()) return;
    if (places && Object.keys(places).length) hubSet("places", places);
    if (Array.isArray(weeklyTrips)) hubSet("weeklyTrips", weeklyTrips);
  }, [places, weeklyTrips]);

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
      } else if (c.cmd === "play") {
        // the folders widget: "pl:<folder id>" plays the folder, "v:<video id>" a most viewed video
        const [kind, id] = [c.arg.slice(0, c.arg.indexOf(":")), c.arg.slice(c.arg.indexOf(":") + 1)];
        if (kind === "pl") {
          const p = (s.playlists || []).find(x => x.id === id);
          if (p?.videos?.length) s.setActiveVideo(p.videos[0], p.videos);
        } else if (kind === "v") {
          const tops: YouTubeVideo[] = (window as any).__nativeTopVideos || [];
          const v = tops.find(x => x.id === id) ?? (s.savedVideos || []).find(x => x.id === id);
          if (v) s.setActiveVideo(v, tops.length ? tops : [v]);
          else s.setActiveVideo({ id, title: "", description: "", thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, publishedAt: "" });
        }
      } else if (c.cmd === "search" || c.cmd === "channel") {
        // the subscriptions widget: the media screen opens the search box / the tapped channel (see media-view)
        (window as any).__nativeMediaAction = { type: c.cmd, id: c.arg };
        window.dispatchEvent(new CustomEvent("native-media-action"));
      } else if (c.cmd === "saveVideo") {
        // the native player's save button: the general favourites (the store syncs it to the cloud)
        try {
          const v = JSON.parse(c.arg);
          const has = (s.savedVideos || []).some(x => x.id === v.id);
          if (has !== !!v.saved) s.toggleSaveVideo({ id: v.id, title: v.title || "", description: "", thumbnail: v.thumbnail || "", publishedAt: "" } as YouTubeVideo);
        } catch {}
      } else if (c.cmd === "reminderDone") {
        // "تم ✓" on a reminder / dhikr island
        if (c.arg) s.completeReminder(c.arg);
      } else if (c.cmd === "hub") {
        // a shared value changed on the phone (widget counter, islands hidden...): screens listening update
        try {
          const d = JSON.parse(c.arg);
          window.dispatchEvent(new CustomEvent("native-hub", { detail: d }));
        } catch {}
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
