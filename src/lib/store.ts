
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { YouTubeChannel, YouTubeVideo } from "./youtube";
import { 
  JSONBIN_MASTER_KEY, 
  JSONBIN_MASTER_BIN_ID,
  JSONBIN_CHANNELS_BIN_ID,
  JSONBIN_SAVED_VIDEOS_BIN_ID,
  JSONBIN_IPTV_FAVS_BIN_ID,
  JSONBIN_PRAYER_TIMES_BIN_ID,
  JSONBIN_MANUSCRIPTS_BIN_ID,
  JSONBIN_POPULAR_RECITERS_BIN_ID,
  prayerTimesData,
  getDisplayNumber as getGlobalDisplayNumber
} from "./constants";

export interface Reminder {
  id: string;
  label: string;
  color: string;
  iconType: 'play' | 'bell' | 'circle';
  startType: 'azan' | 'iqamah' | 'manual';
  startReference?: string;
  startOffset: number;
  endType: 'azan' | 'iqamah' | 'manual' | 'duration' | 'prayer';
  endReference?: string;
  endOffset: number;
  manualStartTime?: string;
  manualEndTime?: string;
  durationMinutes?: number;
  showCountdown: boolean;
  showCountup: boolean;
  completed: boolean;
  countdownWindow: number;
}

export interface PrayerSetting {
  id: string;
  name: string;
  offsetMinutes: number;
  showCountdown: boolean;
  countdownWindow: number;
  showCountup: boolean;
  countupWindow: number;
  iqamahDuration: number;
}

export interface MapSettings {
  zoom: number;
  tilt: number;
  carScale: number;
  backgroundIndex: number;
  showManuscriptBg: boolean;
  manuscriptBgUrl: string;
  fontScale: number;
  manuscriptColor: string;
  showManuscriptOnMoon: boolean;
  moonManuIdx: number;
  hue: number;
  saturation: number;
  brightness: number;
}

export interface IptvChannel {
  name: string;
  stream_id: string;
  stream_icon: string;
  category_id: string;
  starred?: boolean;
  url?: string;
  type?: 'iptv' | 'web' | 'live';
  stream_type?: string;
  displayNumber?: number;
}

export interface FavoriteTeam {
  id: number;
  name: string;
  logo: string;
}

export interface Manuscript {
  id: string;
  type: 'text' | 'image';
  content: string;
  fontFamily?: string;
}

export type MappingContext = 'global' | 'player' | 'dashboard' | 'media' | 'quran' | 'football' | 'iptv' | 'settings';

export type AppAction = 
  | 'nav_up' | 'nav_down' | 'nav_left' | 'nav_right' | 'nav_ok' | 'nav_back'
  | 'toggle_star' | 'delete_item' | 'toggle_reorder'
  | 'goto_home' | 'goto_media' | 'goto_quran' | 'goto_hihi2' | 'goto_iptv' | 'goto_football' | 'goto_settings'
  | 'player_next' | 'player_prev' | 'player_save' | 'player_fullscreen' | 'player_playlist' | 'player_minimize' | 'player_close' | 'player_settings'
  | 'focus_search' | 'focus_reciters' | 'focus_surahs'
  | 'goto_tab_appearance' | 'goto_tab_prayers' | 'goto_tab_reminders' | 'goto_tab_manuscripts' | 'goto_tab_buttonmap' | 'goto_tab_reciters'
  | 'inc_zoom' | 'dec_zoom' | 'inc_font' | 'dec_font' | 'next_manuscript' | 'prev_manuscript'
  | 'media_scroll_up' | 'media_scroll_down';

interface MediaState {
  favoriteChannels: YouTubeChannel[];
  savedVideos: YouTubeVideo[];
  videoProgress: Record<string, number>;
  favoriteTeams: FavoriteTeam[];
  favoriteLeagueIds: number[];
  belledMatchIds: string[];
  skippedMatchIds: string[];
  skippedReminderIds: string[];
  favoriteIptvChannels: IptvChannel[];
  favoriteReciters: YouTubeChannel[];
  iptvPlaylist: IptvChannel[];
  iptvPlaylistIndex: number;
  prayerTimes: any[];
  prayerSettings: PrayerSetting[];
  reminders: Reminder[];
  customManuscripts: Manuscript[];
  manuscriptScales: Record<string, number>;
  customFonts: { name: string, url: string }[];
  customWallBackgrounds: string[];
  customManuscriptColors: string[];
  mapSettings: MapSettings;
  displayScale: number;
  dockScale: number;
  keyMappings: Record<string, Record<string, string[]>>; 
  activeVideo: YouTubeVideo | null;
  activeIptv: IptvChannel | null;
  activeQuranUrl: string | null;
  playlist: YouTubeVideo[];
  playlistIndex: number;
  isPlaying: boolean;
  isMinimized: boolean;
  isFullScreen: boolean;
  isPlayerControlsExpanded: boolean;
  gridMode: 'hidden' | 'partial' | 'full';
  dockSide: 'left' | 'right';
  showIslands: boolean;
  autoHideIsland: boolean;
  isSidebarShrinked: boolean;
  wallPlateType: 'moon' | 'manuscript' | null;
  wallPlateData: any | null;
  playerMode: 'api' | 'web';
  isAltModeActive: boolean; 
  isReorderMode: boolean;
  apiError: { count: number, message: string } | null;
  isRecordingKey: boolean;
  lastLiveUpdate: number;
  isInitialLoading: boolean;
  aiSuggestions: any[];
  
  pickedUpId: string | null;
  setPickedUpId: (id: string | null) => void;
  setApiError: (error: { count: number, message: string } | null) => void;
  setIsRecordingKey: (val: boolean) => void;
  setIsSidebarShrinked: (val: boolean) => void;
  setDockScale: (val: number) => void;
  setDisplayScale: (val: number) => void;
  
  selectedChannel: YouTubeChannel | null;
  channelVideos: YouTubeVideo[];
  videoResults: YouTubeVideo[];
  
  iptvSwitchingInfo: { current: IptvChannel, next: IptvChannel | null, prev: IptvChannel | null, currentNum: number, nextNum: number | null, prevNum: number | null } | null;
  setIptvSwitchingInfo: (info: { current: IptvChannel, next: IptvChannel | null, prev: IptvChannel | null, currentNum: number, nextNum: number | null, prevNum: number | null } | null) => void;
  
  setSelectedChannel: (ch: YouTubeChannel | null) => void;
  setChannelVideos: (vids: YouTubeVideo[]) => void;
  setVideoResults: (vids: YouTubeVideo[]) => void;

  addChannel: (channel: YouTubeChannel) => void;
  removeChannel: (channelid: string) => void;
  reorderChannel: (id: string, dir: 'prev' | 'next') => void;
  moveChannelToTop: (id: string) => void;
  reorderChannelTo: (fromId: string, toId: string) => void;
  addReciter: (channel: YouTubeChannel) => void;
  addRecitersBatch: (reciters: YouTubeChannel[]) => void;
  removeReciter: (channelid: string) => void;
  updateReciter: (id: string, name: string) => void;
  reorderReciter: (fromId: string, direction: 'prev' | 'next') => void;
  moveReciterToTop: (id: string) => void;
  reorderReciterTo: (fromId: string, toId: string) => void;
  toggleSaveVideo: (video: YouTubeVideo) => void;
  removeVideo: (id: string) => void;
  toggleStarChannel: (channelid: string) => void;
  addReminder: (reminder: Reminder) => void;
  updateReminder: (id: string, reminder: Partial<Reminder>) => void;
  removeReminder: (id: string) => void;
  toggleReminder: (id: string) => void;
  skipReminder: (id: string) => void;
  addManuscript: (manuscript: Manuscript) => void;
  updateManuscript: (id: string, update: Partial<Manuscript>) => void;
  updateManuscriptScale: (id: string, delta: number) => void;
  removeManuscript: (id: string) => void;
  reorderManuscript: (id: string, dir: 'prev' | 'next') => void;
  addCustomFont: (name: string, url: string) => void;
  removeCustomFont: (name: string) => void;
  addCustomWallBackground: (url: string) => void;
  removeCustomWallBackground: (url: string) => void;
  updatePrayerSetting: (id: string, setting: Partial<PrayerSetting>) => void;
  toggleFavoriteTeam: (team: FavoriteTeam) => void;
  toggleBelledMatch: (matchId: string) => void;
  skipMatch: (matchId: string) => void;
  toggleFavoriteIptvChannel: (channel: IptvChannel) => void;
  updateIptvChannel: (id: string, update: Partial<IptvChannel>) => void;
  reorderIptvChannelTo: (fromId: string, toId: string) => void;
  updateMapSettings: (settings: Partial<MapSettings>) => void;
  setActiveVideo: (video: YouTubeVideo | null, context?: YouTubeVideo[]) => void;
  setActiveIptv: (channel: IptvChannel | null, context?: IptvChannel[]) => void;
  setActiveQuranUrl: (url: string | null) => void;
  setPlaylist: (videos: YouTubeVideo[]) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  nextIptvChannel: () => void;
  updateVideoProgress: (videoId: string, progress: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsMinimized: (minimized: boolean) => void;
  setIsFullScreen: (fullScreen: boolean) => void;
  cyclePlayerMode: () => void;
  setIsPlayerControlsExpanded: (expanded: boolean) => void;
  setGridMode: (mode: 'hidden' | 'partial' | 'full') => void;
  setWallPlate: (type: 'moon' | 'manuscript' | null, data?: any) => void;
  toggleDockSide: () => void;
  toggleShowIslands: () => void;
  setAutoHideIsland: (val: boolean) => void;
  toggleAltMode: () => void;
  toggleReorderMode: () => void;
  setLastLiveUpdate: (time: number) => void;
  resetMediaView: () => void;
  setAiSuggestions: (suggestions: any[]) => void;
  setKeyMapping: (ctx: MappingContext, act: AppAction, key: string) => void;
  removeSpecificKeyMapping: (ctx: MappingContext, act: AppAction, key: string) => void;

  fetchPriorityData: (context: 'dashboard' | 'media' | 'all') => Promise<void>;
  syncMasterBin: () => Promise<void>;
  saveIptvReorder: () => Promise<void>;
  saveChannelsReorder: () => Promise<void>;
  saveRecitersReorder: () => Promise<void>;
  saveManuscriptsReorder: () => Promise<void>;
}

const updateBin = async (binId: string, data: any) => {
  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_MASTER_KEY
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error("JSONBin Update Failed");
  } catch (e) {
    console.warn(`JSONBin Sync Warning [${binId}]:`, e);
  }
};

const DEFAULT_GLOBAL_MAPPINGS: Record<string, string[]> = {
  nav_up: ['ArrowUp', '2'], nav_down: ['ArrowDown', '8'], nav_left: ['ArrowLeft', '4'], nav_right: ['ArrowRight', '6'], nav_ok: ['Enter', '5'], nav_back: ['Backspace', 'Escape', 'Back'],
  goto_home: ['H', '1'], goto_media: ['M', '3'], goto_quran: ['Q', '7'], goto_hihi2: ['F', '9'], goto_iptv: ['0'], goto_football: ['T'], goto_settings: ['SETTINGS'],
  delete_item: ['Red'], toggle_star: ['Yellow'], toggle_reorder: ['Blue'], inc_zoom: ['33'], dec_zoom: ['99'], inc_font: ['66'], dec_font: ['44'], next_manuscript: ['88'], prev_manuscript: ['22'],
  media_scroll_up: ['PageUp'], media_scroll_down: ['PageDown']
};

const DEFAULT_CONTEXT_MAPPINGS: Record<string, Record<string, string[]>> = {
  global: DEFAULT_GLOBAL_MAPPINGS,
  player: { player_next: ['ChannelUp', '3'], player_prev: ['PageDown', '1'], player_save: ['3'], player_close: ['Red'], player_playlist: ['Blue'], player_minimize: ['M', 'Green'], player_settings: ['Yellow'] },
  dashboard: {}, media: { focus_search: ['0'], focus_reciters: ['1'], focus_surahs: ['2'] }, quran: { focus_search: ['0'], focus_reciters: ['1'], focus_surahs: ['2'] }, football: {}, iptv: {},
  settings: { goto_tab_appearance: ['1'], goto_tab_prayers: ['2'], goto_tab_reminders: ['3'], goto_tab_manuscripts: ['4'], goto_tab_buttonmap: ['5'], goto_tab_reciters: ['6'] }
};

const DEFAULT_PRAYER_SETTINGS: PrayerSetting[] = [
  { id: 'fajr', name: 'الفجر', offsetMinutes: 0, showCountdown: true, countdownWindow: 25, showCountup: true, countupWindow: 30, iqamahDuration: 25 },
  { id: 'sunrise', name: 'الشروق', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 5, iqamahDuration: 0 },
  { id: 'duha', name: 'الضحى', offsetMinutes: 15, showCountdown: true, countdownWindow: 15, showCountup: false, countupWindow: 0, iqamahDuration: 0 },
  { id: 'dhuhr', name: 'الظهر', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 25, iqamahDuration: 20 },
  { id: 'asr', name: 'العصر', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 25, iqamahDuration: 20 },
  { id: 'maghrib', name: 'المغرب', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 15, iqamahDuration: 10 },
  { id: 'isha', name: 'العشاء', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 25, iqamahDuration: 20 },
];

const DEFAULT_REMINDERS: Reminder[] = [
  { id: "rem-witr", label: "صلاة الوتر والتهجد", startType: "azan", startReference: "isha", startOffset: 45, color: "text-purple-400", iconType: "bell", completed: false, countdownWindow: 120, showCountdown: true, showCountup: true, endType: "prayer", endReference: "fajr", endOffset: 0 },
  { id: "rem-evening", label: "أذكار المساء", startType: "azan", startReference: "asr", startOffset: 15, color: "text-blue-400", iconType: "bell", completed: false, countdownWindow: 30, showCountdown: true, showCountup: true, endType: "prayer", endReference: "maghrib", endOffset: 0 }
];

export const useMediaStore = create<MediaState>()(
  persist(
    (set, get) => ({
      favoriteChannels: [], savedVideos: [], videoProgress: {}, favoriteTeams: [], favoriteLeagueIds: [307, 39, 2, 140, 135], belledMatchIds: [], skippedMatchIds: [], skippedReminderIds: [], favoriteIptvChannels: [], favoriteReciters: [], iptvPlaylist: [], iptvPlaylistIndex: 0, prayerTimes: prayerTimesData, prayerSettings: DEFAULT_PRAYER_SETTINGS, reminders: DEFAULT_REMINDERS, customManuscripts: [], manuscriptScales: {}, customFonts: [], customWallBackgrounds: [], customManuscriptColors: ['#ffffff', '#FFD700', '#C0C0C0', 'linear-gradient(to bottom, #fff, #999)'],
      mapSettings: { zoom: 20.0, tilt: 65, carScale: 1.02, backgroundIndex: 0, showManuscriptBg: true, manuscriptBgUrl: "https://www.image2url.com/r2/default/images/1782382707952-d99447c6-bc60-475d-9406-5fd2ef320bd5.png", fontScale: 1.0, manuscriptColor: '#ffffff', showManuscriptOnMoon: false, moonManuIdx: 0, hue: 0, saturation: 100, brightness: 100 },
      displayScale: 1.0, dockScale: 1.0, keyMappings: DEFAULT_CONTEXT_MAPPINGS, activeVideo: null, activeIptv: null, activeQuranUrl: "https://quran.com/ar/radio", playlist: [], playlistIndex: 0, isPlaying: false, isMinimized: false, isFullScreen: false, isPlayerControlsExpanded: false, gridMode: 'hidden', dockSide: 'left', showIslands: true, autoHideIsland: true, isSidebarShrinked: false, wallPlateType: null, wallPlateData: null, playerMode: 'api', isAltModeActive: true, isReorderMode: false, apiError: null, isRecordingKey: false, lastLiveUpdate: 0, isInitialLoading: false, aiSuggestions: [],
      pickedUpId: null, setPickedUpId: (id) => set({ pickedUpId: id }), setApiError: (v) => set({ apiError: v }), setIsRecordingKey: (v) => set({ isRecordingKey: v }), setDockScale: (v) => set({ dockScale: v }), setDisplayScale: (v) => set({ displayScale: v }), setIsSidebarShrinked: (v) => set({ isSidebarShrinked: v }),
      selectedChannel: null, channelVideos: [], videoResults: [], iptvSwitchingInfo: null, setIptvSwitchingInfo: (info) => set({ iptvSwitchingInfo: info }),
      setSelectedChannel: (v) => set({ selectedChannel: v }), setChannelVideos: (v) => set({ channelVideos: v }), setVideoResults: (v) => set({ videoResults: v }),
      setIsPlayerControlsExpanded: (v) => set({ isPlayerControlsExpanded: v }), setGridMode: (v) => set({ gridMode: v }),

      fetchPriorityData: async (context) => {
        set({ isInitialLoading: true });
        const fetchB = async (id: string) => { try { const r = await fetch(`https://api.jsonbin.io/v3/b/${id}/latest`, { headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }, cache: 'no-store' }); return r.ok ? (await r.json()).record : null; } catch { return null; } };
        
        if (context === 'dashboard' || context === 'all') {
          const [p, manu, ma] = await Promise.allSettled([fetchB(JSONBIN_PRAYER_TIMES_BIN_ID), fetchB(JSONBIN_MANUSCRIPTS_BIN_ID), fetchB(JSONBIN_MASTER_BIN_ID)]);
          if (p.status === 'fulfilled' && p.value) set({ prayerTimes: Array.isArray(p.value) ? p.value : (p.value.prayers || []) });
          if (manu.status === 'fulfilled' && manu.value) set({ customManuscripts: Array.isArray(manu.value) ? manu.value : (manu.value.manuscripts || []) });
          if (ma.status === 'fulfilled' && ma.value) {
            const v = ma.value;
            set({ reminders: v.reminders || DEFAULT_REMINDERS, prayerSettings: v.prayerSettings || DEFAULT_PRAYER_SETTINGS, mapSettings: { ...get().mapSettings, ...v.mapSettings }, customFonts: v.customFonts || [] });
          }
        }
        
        if (context === 'media' || context === 'all') {
          const [subs, rec, ma] = await Promise.allSettled([fetchB(JSONBIN_CHANNELS_BIN_ID), fetchB(JSONBIN_POPULAR_RECITERS_BIN_ID), fetchB(JSONBIN_MASTER_BIN_ID)]);
          if (subs.status === 'fulfilled' && subs.value) set({ favoriteChannels: Array.isArray(subs.value) ? subs.value : (subs.value.channels || []) });
          if (rec.status === 'fulfilled' && rec.value) set({ favoriteReciters: Array.isArray(rec.value) ? rec.value : (rec.value.reciters || []) });
          if (ma.status === 'fulfilled' && ma.value) {
             const v = ma.value;
             set({ favoriteIptvChannels: v.favoriteIptvChannels || [], savedVideos: v.savedVideos || [] });
          }
        }

        set({ isInitialLoading: false });
      },

      syncMasterBin: async () => {
        const s = get();
        await updateBin(JSONBIN_MASTER_BIN_ID, { 
          favoriteTeams: s.favoriteTeams, favoriteLeagueIds: s.favoriteLeagueIds, belledMatchIds: s.belledMatchIds, skippedMatchIds: s.skippedMatchIds, prayerSettings: s.prayerSettings, reminders: s.reminders, mapSettings: s.mapSettings, customFonts: s.customFonts, customWallBackgrounds: s.customWallBackgrounds, customManuscriptColors: s.customManuscriptColors, keyMappings: s.keyMappings, isAltModeActive: s.isAltModeActive, autoHideIsland: s.autoHideIsland, displayScale: s.displayScale, dockScale: s.dockScale, favoriteIptvChannels: s.favoriteIptvChannels, savedVideos: s.savedVideos 
        });
      },

      saveIptvReorder: async () => await get().syncMasterBin(),
      saveChannelsReorder: async () => await updateBin(JSONBIN_CHANNELS_BIN_ID, get().favoriteChannels),
      saveRecitersReorder: async () => await updateBin(JSONBIN_POPULAR_RECITERS_BIN_ID, get().favoriteReciters),
      saveManuscriptsReorder: async () => await updateBin(JSONBIN_MANUSCRIPTS_BIN_ID, get().customManuscripts),

      addChannel: (ch) => set((s) => { const n = [...s.favoriteChannels.filter(i => i.channelid !== ch.channelid), { ...ch, starred: false }]; setTimeout(() => get().saveChannelsReorder(), 100); return { favoriteChannels: n }; }),
      removeChannel: (id) => set((s) => { const n = s.favoriteChannels.filter(i => i.channelid !== id); setTimeout(() => get().saveChannelsReorder(), 100); return { favoriteChannels: n }; }),
      reorderChannel: (id, dir) => set((s) => { const l = [...s.favoriteChannels], idx = l.findIndex(c => c.channelid === id); if (idx === -1) return s; const nIdx = dir === 'next' ? idx + 1 : idx - 1; if (nIdx < 0 || nIdx >= l.length) return s; [l[idx], l[nIdx]] = [l[nIdx], l[idx]]; return { favoriteChannels: l }; }),
      moveChannelToTop: (id) => set((s) => { const l = [...s.favoriteChannels], idx = l.findIndex(c => c.channelid === id); if (idx === -1) return s; const [m] = l.splice(idx, 1); l.unshift(m); return { favoriteChannels: l }; }),
      reorderChannelTo: (f, t) => set((s) => { const l = [...s.favoriteChannels], fI = l.findIndex(i => i.channelid === f), tI = l.findIndex(i => i.channelid === t); if (fI === -1 || tI === -1) return s; const [m] = l.splice(fI, 1); l.splice(tI, 0, m); return { favoriteChannels: l }; }),
      
      addReciter: (r) => set((s) => { const n = [...s.favoriteReciters.filter(i => i.channelid !== r.channelid), r]; setTimeout(() => get().saveRecitersReorder(), 100); return { favoriteReciters: n }; }),
      addRecitersBatch: (rs) => set((s) => { const n = [...s.favoriteReciters, ...rs.filter(r => !s.favoriteReciters.some(existing => existing.channelid === r.channelid))]; setTimeout(() => get().saveRecitersReorder(), 100); return { favoriteReciters: n }; }),
      removeReciter: (id) => set((s) => { const n = s.favoriteReciters.filter(i => i.channelid !== id); setTimeout(() => get().saveRecitersReorder(), 100); return { favoriteReciters: n }; }),
      updateReciter: (id, name) => set((s) => ({ favoriteReciters: s.favoriteReciters.map(r => r.channelid === id ? { ...r, name } : r) })),
      reorderReciter: (id, dir) => set((s) => { const l = [...s.favoriteReciters], idx = l.findIndex(r => r.channelid === id); if (idx === -1) return s; const nIdx = dir === 'next' ? idx + 1 : idx - 1; if (nIdx < 0 || nIdx >= l.length) return s; [l[idx], l[nIdx]] = [l[nIdx], l[idx]]; return { favoriteReciters: l }; }),
      moveReciterToTop: (id) => set((s) => { const l = [...s.favoriteReciters], idx = l.findIndex(r => r.channelid === id); if (idx === -1) return s; const [m] = l.splice(idx, 1); l.unshift(m); return { favoriteReciters: l }; }),
      reorderReciterTo: (f, t) => set((s) => { const l = [...s.favoriteReciters], fI = l.findIndex(i => i.channelid === f), tI = l.findIndex(i => i.channelid === t); if (fI === -1 || tI === -1) return s; const [m] = l.splice(fI, 1); l.splice(tI, 0, m); return { favoriteReciters: l }; }),

      toggleSaveVideo: (v) => set((s) => { const e = s.savedVideos.some(i => i.id === v.id); const n = e ? s.savedVideos.filter(i => i.id !== v.id) : [{ ...v, progress: 0 }, ...s.savedVideos]; setTimeout(() => get().syncMasterBin(), 100); return { savedVideos: n }; }),
      removeVideo: (id) => set((s) => ({ savedVideos: s.savedVideos.filter(v => v.id !== id) })),
      updateVideoProgress: (id, progress) => set((s) => { const uP = { ...s.videoProgress, [id]: progress }; const isS = s.savedVideos.some(v => v.id === id); return { savedVideos: isS ? s.savedVideos.map(v => v.id === id ? { ...v, progress } : v) : s.savedVideos, videoProgress: uP }; }),
      toggleStarChannel: (id) => set((s) => { const n = s.favoriteChannels.map(c => c.channelid === id ? { ...c, starred: !c.starred } : c); setTimeout(() => get().saveChannelsReorder(), 100); return { favoriteChannels: n }; }),
      toggleFavoriteIptvChannel: (ch) => set((s) => { const e = s.favoriteIptvChannels.some(c => c.stream_id === ch.stream_id); const p = { ...ch, type: 'web', url: ch.url || `http://playstop.watch:2095/live/W87d737/Pd37qj34/${ch.stream_id}.m3u8`, starred: true }; const n = e ? s.favoriteIptvChannels.filter(c => c.stream_id !== ch.stream_id) : [...s.favoriteIptvChannels, p]; setTimeout(() => get().syncMasterBin(), 100); return { favoriteIptvChannels: n }; }),
      updateIptvChannel: (id, u) => set((s) => ({ favoriteIptvChannels: s.favoriteIptvChannels.map(c => c.stream_id === id ? { ...c, ...u } : c) })),
      reorderIptvChannelTo: (f, t) => set((s) => { const l = [...s.favoriteIptvChannels], fI = l.findIndex(i => i.stream_id === f), tI = l.findIndex(i => i.stream_id === t); if (fI === -1 || tI === -1) return s; const [m] = l.splice(fI, 1); l.splice(tI, 0, m); return { favoriteIptvChannels: l }; }),

      addManuscript: (m) => set((s) => { const n = [...s.customManuscripts.filter(x => x.id !== m.id), m]; setTimeout(() => get().saveManuscriptsReorder(), 100); return { customManuscripts: n }; }),
      updateManuscript: (id, u) => set((s) => ({ customManuscripts: s.customManuscripts.map(m => m.id === id ? { ...m, ...u } : m) })),
      updateManuscriptScale: (id, delta) => set((s) => ({ manuscriptScales: { ...s.manuscriptScales, [id]: Math.max(0.1, (s.manuscriptScales[id] || 1.0) + delta) } })),
      removeManuscript: (id) => set((s) => { const n = s.customManuscripts.filter(m => m.id !== id); setTimeout(() => get().saveManuscriptsReorder(), 100); return { customManuscripts: n }; }),
      reorderManuscript: (id, dir) => set((s) => { const l = [...s.customManuscripts], idx = l.findIndex(m => m.id === id); if (idx === -1) return s; const nIdx = dir === 'next' ? idx + 1 : idx - 1; if (nIdx < 0 || nIdx >= l.length) return s; [l[idx], l[nIdx]] = [l[nIdx], l[idx]]; return { customManuscripts: l }; }),

      addCustomFont: (name, url) => set((s) => { const n = [...s.customFonts.filter(f => f.name !== name), { name, url }]; setTimeout(() => get().syncMasterBin(), 100); return { customFonts: n }; }),
      removeCustomFont: (name) => set((s) => ({ customFonts: s.customFonts.filter(f => f.name !== name) })),
      addCustomWallBackground: (url) => set((s) => { const n = [...s.customWallBackgrounds.filter(u => u !== url), url]; return { customWallBackgrounds: n }; }),
      removeCustomWallBackground: (url) => set((s) => { const n = s.customWallBackgrounds.filter(u => u !== url); return { customWallBackgrounds: n }; }),

      addReminder: (r) => set((s) => { const n = [...s.reminders.filter(x => x.id !== r.id), r]; setTimeout(() => get().syncMasterBin(), 100); return { reminders: n }; }),
      removeReminder: (id) => set((s) => { const n = s.reminders.filter(r => r.id !== id); setTimeout(() => get().syncMasterBin(), 100); return { reminders: n }; }),
      updateReminder: (id, u) => set((s) => { const n = s.reminders.map(r => r.id === id ? { ...r, ...u } : r); setTimeout(() => get().syncMasterBin(), 100); return { reminders: n }; }),
      toggleReminder: (id) => set((s) => ({ reminders: s.reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r) })),
      skipReminder: (id) => set((s) => ({ skippedReminderIds: [...s.skippedReminderIds, id] })),
      updatePrayerSetting: (id, setting) => set((s) => ({ prayerSettings: s.prayerSettings.map(ps => ps.id === id ? { ...ps, ...setting } : ps) })),
      toggleFavoriteTeam: (t) => set((s) => ({ favoriteTeams: s.favoriteTeams.some(i => i.id === t.id) ? s.favoriteTeams.filter(i => i.id !== t.id) : [...s.favoriteTeams, t] })),
      toggleBelledMatch: (matchId) => set((s) => ({ belledMatchIds: s.belledMatchIds.includes(matchId) ? s.belledMatchIds.filter(i => i !== matchId) : [...s.belledMatchIds, matchId] })),
      skipMatch: (matchId) => set((s) => ({ skippedMatchIds: [...s.skippedMatchIds, matchId] })),
      updateMapSettings: (s) => set((st) => ({ mapSettings: { ...st.mapSettings, ...s } })),
      setKeyMapping: (ctx, act, key) => set((s) => { const m = { ...s.keyMappings }; if (!m[ctx]) m[ctx] = {}; let k = Array.isArray(m[ctx][act]) ? [...m[ctx][act]] : []; if (k.includes(key)) return s; k.push(key); m[ctx][act] = k.slice(-2); return { keyMappings: m }; }),
      removeSpecificKeyMapping: (ctx, act, key) => set((s) => { const m = { ...s.keyMappings }; if (m[ctx] && m[ctx][act]) { m[ctx][act] = m[ctx][act].filter(v => v !== key); return { keyMappings: m }; } return s; }),
      
      setActiveVideo: (v, ctx) => { if (v) { const pl = ctx && ctx.length > 0 ? ctx : [v]; const idx = pl.findIndex(i => i.id === v.id); set({ playlist: pl, playlistIndex: idx > -1 ? idx : 0, activeVideo: v, activeIptv: null, isPlaying: true, isMinimized: false, isFullScreen: true }); } else set({ activeVideo: null, isPlaying: false, isFullScreen: false }); },
      setActiveIptv: (ch, ctx) => { if (!ch) { set({ activeIptv: null, isPlaying: false, isMinimized: false, isFullScreen: false, gridMode: 'hidden' }); return; } const processed = { ...ch, type: 'web', url: ch.url || `http://playstop.watch:2095/live/W87d737/Pd37qj34/${ch.stream_id}.m3u8` }; const pl = (ctx?.length) ? ctx : (get().favoriteIptvChannels.length ? get().favoriteIptvChannels : [processed]); const idx = pl.findIndex(c => c.stream_id === processed.stream_id); set({ iptvPlaylist: pl, iptvPlaylistIndex: idx > -1 ? idx : 0, activeIptv: processed, activeVideo: null, isPlaying: true, isMinimized: false, isFullScreen: true, gridMode: 'hidden' }); },
      setActiveQuranUrl: (v) => set({ activeQuranUrl: v }),
      setPlaylist: (videos) => set({ playlist: videos }),
      nextTrack: () => { const s = get(); if (s.activeIptv) { s.nextIptvChannel(); return; } if (!s.playlist.length) return; const nIdx = (s.playlistIndex + 1) % s.playlist.length; set({ playlistIndex: nIdx, activeVideo: s.playlist[nIdx] }); },
      prevTrack: () => { const s = get(); if (!s.playlist.length) return; const pIdx = (s.playlistIndex - 1 + s.playlist.length) % s.playlist.length; set({ playlistIndex: pIdx, activeVideo: s.playlist[pIdx] }); },
      nextIptvChannel: () => {
        const s = get(); if (!s.iptvPlaylist.length) return;
        const nIdx = (s.iptvPlaylistIndex + 1) % s.iptvPlaylist.length, ch = s.iptvPlaylist[nIdx];
        const pIdx = (nIdx - 1 + s.iptvPlaylist.length) % s.iptvPlaylist.length, nnIdx = (nIdx + 1) % s.iptvPlaylist.length;
        set({ iptvPlaylistIndex: nIdx, activeIptv: { ...ch, url: ch.url || `http://playstop.watch:2095/live/W87d737/Pd37qj34/${ch.stream_id}.m3u8`, type: 'web' }, iptvSwitchingInfo: { current: ch, next: s.iptvPlaylist[nnIdx], prev: s.iptvPlaylist[pIdx], currentNum: getGlobalDisplayNumber(nIdx), nextNum: getGlobalDisplayNumber(nnIdx), prevNum: getGlobalDisplayNumber(pIdx) } });
        setTimeout(() => set({ iptvSwitchingInfo: null }), 3000);
      },
      setIsPlaying: (v) => set({ isPlaying: v }), setIsMinimized: (v) => set({ isMinimized: v, isFullScreen: false }), setIsFullScreen: (v) => set({ isFullScreen: v, isMinimized: false }), cyclePlayerMode: () => { const { isFullScreen: f, isMinimized: m } = get(); if (f && !m) set({ isFullScreen: false, isMinimized: true }); else if (!f && m) set({ isFullScreen: false, isMinimized: false }); else set({ isFullScreen: true, isMinimized: false }); },
      toggleDockSide: () => set((s) => ({ dockSide: s.dockSide === 'left' ? 'right' : 'left' })),
      toggleShowIslands: () => set((s) => ({ showIslands: !s.showIslands })), setAutoHideIsland: (v) => set({ autoHideIsland: v }), toggleAltMode: () => set((s) => ({ isAltModeActive: !s.isAltModeActive })), toggleReorderMode: () => set((s) => ({ isReorderMode: !s.isReorderMode, pickedUpId: null })),
      setLastLiveUpdate: (t) => set({ lastLiveUpdate: t }),
      setWallPlate: (t, d) => set({ wallPlateType: t, wallPlateData: d }), resetMediaView: () => set({ selectedChannel: null, channelVideos: [] }),
      setAiSuggestions: (s) => set({ aiSuggestions: s }),
    }),
    {
      name: "drivecast-ready-v2800", 
      partialize: (s) => ({ dockSide: s.dockSide, showIslands: s.showIslands, isAltModeActive: s.isAltModeActive, autoHideIsland: s.autoHideIsland, displayScale: s.displayScale, dockScale: s.dockScale, mapSettings: s.mapSettings, manuscriptScales: s.manuscriptScales }),
    }
  )
);
