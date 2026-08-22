
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { YouTubeChannel, YouTubeVideo } from "./youtube";
import { 
  JSONBIN_MASTER_KEY, 
  JSONBIN_MASTER_BIN_ID,
  JSONBIN_CHANNELS_BIN_ID,
  JSONBIN_POPULAR_RECITERS_BIN_ID,
  JSONBIN_IPTV_FAVS_BIN_ID,
  JSONBIN_MANUSCRIPTS_BIN_ID,
  JSONBIN_FONTS_BIN_ID,
  JSONBIN_BACKGROUNDS_BIN_ID,
  JSONBIN_PRAYER_TIMES_BIN_ID,
  prayerTimesData
} from "./constants";

export interface Reminder {
  id: string; label: string; color: string; iconType: 'play' | 'bell' | 'circle';
  startType: 'azan' | 'iqamah' | 'manual'; startReference?: string; startOffset: number;
  endType: 'azan' | 'iqamah' | 'manual' | 'duration' | 'prayer'; endReference?: string; endOffset: number;
  manualStartTime?: string; manualEndTime?: string; durationMinutes?: number;
  showCountdown: boolean; showCountup: boolean; completed: boolean; countdownWindow: number;
}

export interface Playlist {
  id: string;
  name: string;
  videos: YouTubeVideo[];
}

export interface PrayerSetting {
  id: string; name: string; offsetMinutes: number; showCountdown: boolean; countdownWindow: number;
  showCountup: boolean; countupWindow: number; iqamahDuration: number;
}

export interface MapSettings {
  zoom: number; tilt: number; carScale: number; backgroundIndex: number; showManuscriptBg: boolean;
  manuscriptBgUrl: string; fontScale: number; manuscriptColor: string; showManuscriptOnMoon: boolean;
  moonManuIdx: number; hue: number; saturation: number; brightness: number;
  winwinUrl?: string; beinUrl?: string;
  omanUrl?: string; bein1Url?: string; mbc1Url?: string;
  invertJoystickX?: boolean; invertJoystickY?: boolean;
  autoRotateNav90?: boolean;
}

export interface IptvChannel {
  name: string; stream_id: string; stream_icon: string; category_id: string; starred?: boolean;
  url?: string; type?: 'iptv' | 'web' | 'live'; stream_type?: string; displayNumber?: number;
}

export interface FavoriteTeam { id: number; name: string; logo: string; }

export interface ManuscriptWord { id: string; text: string; x: number; y: number; scale: number; }

export interface Manuscript {
  id: string; type: 'text' | 'image'; content: string; words?: ManuscriptWord[];
  fontFamily?: string; pngDataUrl?: string; x?: number; y?: number; scale?: number;
}

export type MappingContext = 'global' | 'player' | 'dashboard' | 'media' | 'quran' | 'football' | 'iptv' | 'settings';

export type AppAction = 
  | 'nav_up' | 'nav_down' | 'nav_left' | 'nav_right' | 'nav_ok' | 'nav_scroll_up' | 'nav_scroll_down'
  | 'toggle_star' | 'delete_item' | 'toggle_reorder'
  | 'goto_home' | 'goto_media' | 'goto_quran' | 'goto_hihi2' | 'goto_iptv' | 'goto_football' | 'goto_settings'
  | 'player_next' | 'player_prev' | 'player_save' | 'player_fullscreen' | 'player_playlist' | 'player_minimize' | 'player_close' | 'player_settings' | 'player_mode'
  | 'focus_search' | 'focus_reciters' | 'focus_surahs'
  | 'inc_zoom' | 'dec_zoom' | 'inc_font' | 'dec_font' | 'next_manuscript' | 'prev_manuscript';

interface MediaState {
  favoriteChannels: YouTubeChannel[]; savedVideos: YouTubeVideo[]; videoProgress: Record<string, number>;
  favoriteTeams: FavoriteTeam[]; favoriteLeagueIds: number[]; belledMatchIds: string[]; skippedMatchIds: string[];
  skippedReminderIds: string[]; favoriteIptvChannels: IptvChannel[]; favoriteReciters: YouTubeChannel[];
  iptvPlaylist: IptvChannel[]; iptvPlaylistIndex: number; prayerTimes: any[]; prayerSettings: PrayerSetting[];
  reminders: Reminder[]; generalAzkar: Reminder[]; customManuscripts: Manuscript[]; manuscriptScales: Record<string, number>;
  customFonts: { name: string, url: string }[]; customWallBackgrounds: string[]; mapSettings: MapSettings;
  playlists: Playlist[]; isLooping: boolean;
  displayScale: number; dockScale: number; keyMappings: Record<string, Record<string, string[]>>; 
  activeVideo: YouTubeVideo | null; lastPlayedVideo: YouTubeVideo | null; activeIptv: IptvChannel | null;
  activeQuranUrl: string | null; playlist: YouTubeVideo[]; playlistIndex: number; isPlaying: boolean;
  isMinimized: boolean; isFullScreen: boolean; isPlayerControlsExpanded: boolean; isPlayerPlaylistOpen: boolean;
  gridMode: 'hidden' | 'partial' | 'full'; dockSide: 'left' | 'right'; showIslands: boolean;
  autoHideIsland: boolean; isSidebarShrinked: boolean; wallPlateType: 'moon' | 'manuscript' | null;
  wallPlateData: any | null; isReorderMode: boolean; isRecordingKey: boolean;
  recordingAction: { ctx: MappingContext, act: AppAction } | null; isInitialLoading: boolean; aiSuggestions: any[]; pickedUpId: string | null;

  setPickedUpId: (id: string | null) => void; setIsRecordingKey: (val: boolean) => void;
  setRecordingAction: (val: { ctx: MappingContext, act: AppAction } | null) => void;
  setIsSidebarShrinked: (val: boolean) => void; setDockScale: (val: number) => void; setDisplayScale: (val: number) => void;
  setGridMode: (mode: 'hidden' | 'partial' | 'full') => void; setIsPlayerControlsExpanded: (val: boolean) => void;
  setIsPlayerPlaylistOpen: (val: boolean) => void;
  
  selectedChannel: YouTubeChannel | null; channelVideos: YouTubeVideo[]; videoResults: YouTubeVideo[];
  setSelectedChannel: (ch: YouTubeChannel | null) => void; setChannelVideos: (vids: YouTubeVideo[]) => void;

  addChannel: (channel: YouTubeChannel) => void; removeChannel: (channelid: string) => void;
  reorderChannelTo: (fromId: string, toId: string) => void; addReciter: (channel: YouTubeChannel) => void;
  removeReciter: (channelid: string) => void; updateReciterName: (channelid: string, newName: string) => void;
  incrementReciterClick: (channelid: string) => void; toggleSaveVideo: (video: YouTubeVideo) => void;
  removeVideo: (id: string) => void; toggleStarChannel: (channelid: string) => void;
  addReminder: (reminder: Reminder) => void; updateReminder: (id: string, reminder: Partial<Reminder>) => void;
  removeReminder: (id: string) => void; toggleReminder: (id: string) => void; skipReminder: (id: string) => void;
  addAzkar: (azkar: Reminder) => void; updateAzkar: (id: string, azkar: Partial<Reminder>) => void;
  removeAzkar: (id: string) => void;
  addPlaylist: (name: string, videos?: YouTubeVideo[]) => Playlist; removePlaylist: (id: string) => void; addVideoToPlaylist: (playlistId: string, video: YouTubeVideo) => void;
  removeVideoFromPlaylist: (playlistId: string, videoId: string) => void; toggleLooping: () => void;
  addCustomFont: (name: string, url: string) => void; removeCustomFont: (name: string, url: string) => void;
  addCustomWallBackground: (url: string) => void; removeCustomWallBackground: (url: string) => void;
  toggleFavoriteTeam: (team: FavoriteTeam) => void; toggleBelledMatch: (matchId: string) => void;
  toggleFavoriteIptvChannel: (channel: IptvChannel) => void; updateIptvChannel: (streamId: string, updates: Partial<IptvChannel>) => void;
  addIptvChannel: (channel: IptvChannel) => void;
  reorderIptvChannelTo: (fromId: string, toId: string) => void; updateMapSettings: (settings: Partial<MapSettings>) => void;
  setActiveVideo: (video: YouTubeVideo | null, context?: YouTubeVideo[]) => void;
  setActiveIptv: (channel: IptvChannel | null, context?: IptvChannel[]) => void;
  setActiveQuranUrl: (url: string | null) => void; setPlaylist: (videos: YouTubeVideo[]) => void;
  nextTrack: () => void; prevTrack: () => void; nextIptvChannel: () => void; updateVideoProgress: (videoId: string, progress: number) => void;
  setIsPlaying: (playing: boolean) => void; setIsMinimized: (minimized: boolean) => void;
  setIsFullScreen: (fullScreen: boolean) => void; cyclePlayerMode: () => void;
  setWallPlate: (type: 'moon' | 'manuscript' | null, data?: any) => void;
  toggleDockSide: () => void; toggleShowIslands: () => void; toggleReorderMode: () => void;
  resetMediaView: () => void; setAiSuggestions: (suggestions: any[]) => void;
  setKeyMapping: (ctx: MappingContext, act: AppAction, key: string) => void;
  removeSpecificKeyMapping: (ctx: MappingContext, act: AppAction, key: string) => void;
  
  addManuscript: (manuscript: Manuscript) => void; updateManuscript: (id: string, updates: Partial<Manuscript>) => void;
  removeManuscript: (id: string) => void; updateManuscriptScale: (id: string, scale: number) => void;
  updatePrayerSetting: (id: string, updates: Partial<PrayerSetting>) => void;

  fetchPriorityData: (context: 'dashboard' | 'media' | 'all') => Promise<void>;
  fetchSpecificBin: (id: string) => Promise<void>;
  syncMasterBin: () => Promise<void>;
  saveIptvReorder: () => Promise<void>;
  saveChannelsReorder: () => Promise<void>;
  saveRecitersReorder: () => Promise<void>;
  saveManuscriptsReorder: () => Promise<void>;
}

const updateBin = async (binId: string, data: any) => {
  try {
    await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_MASTER_KEY, 'X-Bin-Versioning': 'false' },
      mode: 'cors', body: JSON.stringify(data)
    });
  } catch (e) {}
};

const DEFAULT_CONTEXT_MAPPINGS: Record<string, Record<string, string[]>> = {
  global: { 
    nav_up: ['ArrowUp', '2'], 
    nav_down: ['ArrowDown', '8'], 
    nav_left: ['ArrowLeft', '4'], 
    nav_right: ['ArrowRight', '6'], 
    nav_ok: ['Enter', '5'], 
    nav_scroll_up: ['PageUp'], 
    nav_scroll_down: ['PageDown'], 
    goto_home: ['1'], 
    goto_media: ['3'], 
    goto_quran: ['7'], 
    goto_hihi2: ['9'], 
    goto_iptv: ['0'], 
    goto_football: ['*'], 
    goto_settings: [], 
    delete_item: ['Red'], 
    toggle_star: ['Yellow'], 
    toggle_reorder: ['Blue'] 
  },
  player: { 
    player_next: ['ChannelUp', '3'], 
    player_prev: ['PageDown', '1'], 
    player_save: ['3'], 
    player_close: ['Red'], 
    player_playlist: ['Blue'], 
    player_minimize: ['Green'], 
    player_settings: ['Yellow'], 
    player_fullscreen: ['8'], 
    player_mode: ['Info'] 
  },
  dashboard: {}, 
  media: { focus_search: ['0'], focus_reciters: ['1'], focus_surahs: ['2'] }, 
  quran: { focus_search: ['0'], focus_reciters: ['1'], focus_surahs: ['2'] }, 
  football: {}, 
  iptv: {}, 
  settings: {}
};

const DEFAULT_PRAYER_SETTINGS: PrayerSetting[] = [
  { id: 'fajr', name: 'الفجر', offsetMinutes: 0, showCountdown: true, countdownWindow: 25, showCountup: true, countupWindow: 30, iqamahDuration: 25 },
  { id: 'sunrise', name: 'الشروق', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 5, iqamahDuration: 0 },
  { id: 'dhuhr', name: 'الظهر', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 25, iqamahDuration: 20 },
  { id: 'asr', name: 'العصر', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 25, iqamahDuration: 20 },
  { id: 'maghrib', name: 'المغرب', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 15, iqamahDuration: 10 },
  { id: 'isha', name: 'العشاء', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 25, iqamahDuration: 20 },
];

export const useMediaStore = create<MediaState>()(
  persist(
    (set, get) => ({
      favoriteChannels: [], savedVideos: [], videoProgress: {}, favoriteTeams: [], favoriteLeagueIds: [307, 39, 2, 140, 135], belledMatchIds: [], skippedMatchIds: [], skippedReminderIds: [], favoriteIptvChannels: [], favoriteReciters: [], iptvPlaylist: [], iptvPlaylistIndex: 0, prayerTimes: prayerTimesData, prayerSettings: DEFAULT_PRAYER_SETTINGS, reminders: [], generalAzkar: [], customManuscripts: [], manuscriptScales: {}, customFonts: [], customWallBackgrounds: [], playlists: [], isLooping: true,
      mapSettings: { 
        zoom: 20.0, tilt: 65, carScale: 1.02, backgroundIndex: 0, showManuscriptBg: true, 
        manuscriptBgUrl: "https://www.image2url.com/r2/default/images/1782382707952-d99447c6-bc60-475d-9406-5fd2ef320bd5.png", 
        fontScale: 1.0, manuscriptColor: '#ffffff', showManuscriptOnMoon: true, moonManuIdx: 0, 
        hue: 0, saturation: 100, brightness: 100, winwinUrl: "https://psee.io/9f4ngl", 
        beinUrl: "https://idebsports.ly/matches", 
        omanUrl: "https://player.mangomolo.com/v1/live?id=MTY8&channelid=MTYx&countries=Q0M%3D&filter=DENY&signature=3fd1e8dd84138a41bf33d93afd4a7f09&language=en&app_id=&fullscreen=yes&player_profile=&base_url=aHR0cHM6Ly9heW4ub20vbGl2ZS8xNjEvJUQ5JTgyJUQ5JTg2JUQ4JUE3JUQ4JUE5LSVEOCVCOSVEOSU4NSVEOCVBNyVEOSU4Ni0lRDklODUlRDglQTglRDglQTclRDglQjQlRDglQjE%3D&autoplay=false&vast=true", 
        bein1Url: "https://online.aflam4you.net/zremb472.php/?vid=68&aflam_s=1&aflam_w=360&aflam_w=360&aflam_h=250&aflam_k=18311111", 
        mbc1Url: "https://online.aflam4you.net/zremb472.php?vid=5&aflam_s=1&aflam_w=360&aflam_h=250&aflam_k=18311111", 
        invertJoystickX: true, invertJoystickY: true, autoRotateNav90: true 
      },
      displayScale: 1.0, dockScale: 1.0, keyMappings: DEFAULT_CONTEXT_MAPPINGS, activeVideo: null, lastPlayedVideo: null, activeIptv: null, activeQuranUrl: "https://quran.com/ar/radio?autoplay=1", playlist: [], playlistIndex: 0, isPlaying: false, isMinimized: false, isFullScreen: false, isPlayerControlsExpanded: false, isPlayerPlaylistOpen: false, gridMode: 'hidden', dockSide: 'left', showIslands: true, autoHideIsland: true, isSidebarShrinked: false, wallPlateType: null, wallPlateData: null, isReorderMode: false, isRecordingKey: false, recordingAction: null, isInitialLoading: true, aiSuggestions: [], pickedUpId: null,
      
      setPickedUpId: (id) => set({ pickedUpId: id }), setIsRecordingKey: (v) => set({ isRecordingKey: v }), setRecordingAction: (v) => set({ recordingAction: v }), setDockScale: (v) => set({ dockScale: v }), setDisplayScale: (v) => set({ displayScale: v }), setIsSidebarShrinked: (v) => set({ isSidebarShrinked: v }), setGridMode: (mode: 'hidden' | 'partial' | 'full') => set({ gridMode: mode }), setIsPlayerControlsExpanded: (v) => set({ isPlayerControlsExpanded: v }), setIsPlayerPlaylistOpen: (v) => set({ isPlayerPlaylistOpen: v }),
      selectedChannel: null, channelVideos: [], videoResults: [], setSelectedChannel: (v) => set({ selectedChannel: v }), setChannelVideos: (v) => set({ channelVideos: v }),

      fetchSpecificBin: async (binId) => {
        try {
          const r = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, { headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }, cache: 'no-store' });
          if (!r.ok) return;
          const data = (await r.json()).record;
          if (binId === JSONBIN_CHANNELS_BIN_ID) set({ favoriteChannels: data.channels || data || [] });
          else if (binId === JSONBIN_POPULAR_RECITERS_BIN_ID) set({ favoriteReciters: (data.reciters || data || []).sort((a: any, b: any) => (b.clickschannel || 0) - (a.clickschannel || 0)) });
          else if (binId === JSONBIN_IPTV_FAVS_BIN_ID) set({ favoriteIptvChannels: data.iptv || data.channels || [] });
          else if (binId === JSONBIN_MANUSCRIPTS_BIN_ID) set({ customManuscripts: data.manuscripts || data || [] });
          else if (binId === JSONBIN_FONTS_BIN_ID) set({ customFonts: data.fonts || data || [] });
          else if (binId === JSONBIN_BACKGROUNDS_BIN_ID) set({ customWallBackgrounds: data.backgrounds || data || [] });
          else if (binId === JSONBIN_PRAYER_TIMES_BIN_ID) set({ prayerTimes: data.prayers || data || prayerTimesData });
          else if (binId === JSONBIN_MASTER_BIN_ID) set({ 
            reminders: data.reminders || get().reminders, 
            generalAzkar: data.generalAzkar || get().generalAzkar, 
            prayerSettings: data.prayerSettings || DEFAULT_PRAYER_SETTINGS, 
            mapSettings: { ...get().mapSettings, ...data.mapSettings }, 
            keyMappings: data.keyMappings || DEFAULT_CONTEXT_MAPPINGS, 
            savedVideos: data.savedVideos || get().savedVideos, 
            manuscriptScales: data.manuscriptScales || get().manuscriptScales, 
            lastPlayedVideo: data.lastPlayedVideo || get().lastPlayedVideo, 
            playlists: data.playlists || get().playlists || [] 
          });
        } catch (e) {}
      },

      fetchPriorityData: async (context) => {
        await Promise.allSettled([get().fetchSpecificBin(JSONBIN_CHANNELS_BIN_ID), get().fetchSpecificBin(JSONBIN_POPULAR_RECITERS_BIN_ID)]);
        const rest = [JSONBIN_IPTV_FAVS_BIN_ID, JSONBIN_MANUSCRIPTS_BIN_ID, JSONBIN_FONTS_BIN_ID, JSONBIN_BACKGROUNDS_BIN_ID, JSONBIN_PRAYER_TIMES_BIN_ID, JSONBIN_MASTER_BIN_ID];
        await Promise.allSettled(rest.map(id => get().fetchSpecificBin(id)));
        set({ isInitialLoading: false });
      },

      syncMasterBin: async () => {
        const s = get();
        await updateBin(JSONBIN_MASTER_BIN_ID, { favoriteTeams: s.favoriteTeams, favoriteLeagueIds: s.favoriteLeagueIds, belledMatchIds: s.belledMatchIds, skippedMatchIds: s.skippedMatchIds, prayerSettings: s.prayerSettings, reminders: s.reminders, generalAzkar: s.generalAzkar, mapSettings: s.mapSettings, keyMappings: s.keyMappings, savedVideos: s.savedVideos, manuscriptScales: s.manuscriptScales, lastPlayedVideo: s.lastPlayedVideo, playlists: s.playlists });
      },

      saveIptvReorder: async () => await updateBin(JSONBIN_IPTV_FAVS_BIN_ID, { iptv: get().favoriteIptvChannels }),
      saveChannelsReorder: async () => await updateBin(JSONBIN_CHANNELS_BIN_ID, { channels: get().favoriteChannels }),
      saveRecitersReorder: async () => await updateBin(JSONBIN_POPULAR_RECITERS_BIN_ID, { reciters: get().favoriteReciters }),
      saveManuscriptsReorder: async () => await updateBin(JSONBIN_MANUSCRIPTS_BIN_ID, { manuscripts: get().customManuscripts }),

      addChannel: (ch) => set((s) => { const n = [...s.favoriteChannels.filter(i => i.channelid !== ch.channelid), ch]; setTimeout(() => get().saveChannelsReorder(), 100); return { favoriteChannels: n }; }),
      removeChannel: (id) => set((s) => { const n = s.favoriteChannels.filter(i => i.channelid !== id); setTimeout(() => get().saveChannelsReorder(), 100); return { favoriteChannels: n }; }),
      addReciter: (r) => set((s) => { const n = [...s.favoriteReciters.filter(i => i.channelid !== r.channelid), { ...r, clickschannel: (r as any).clickschannel || 0 }]; setTimeout(() => get().saveRecitersReorder(), 100); return { favoriteReciters: n }; }),
      removeReciter: (id) => set((s) => { const n = s.favoriteReciters.filter(i => i.channelid !== id); setTimeout(() => get().saveRecitersReorder(), 100); return { favoriteReciters: n }; }),
      updateReciterName: (id, name) => set((s) => { const n = s.favoriteReciters.map(r => r.channelid === id ? { ...r, name } : r); setTimeout(() => get().saveRecitersReorder(), 100); return { favoriteReciters: n }; }),
      incrementReciterClick: (id) => set((s) => { const n = s.favoriteReciters.map(r => r.channelid === id ? { ...r, clickschannel: (r.clickschannel || 0) + 1 } : r).sort((a, b) => (b.clickschannel || 0) - (a.clickschannel || 0)); setTimeout(() => get().saveRecitersReorder(), 100); return { favoriteReciters: n }; }),
      toggleSaveVideo: (v) => set((s) => { const e = s.savedVideos.some(i => i.id === v.id); const n = e ? s.savedVideos.filter(i => i.id !== v.id) : [{ ...v, progress: 0 }, ...s.savedVideos]; setTimeout(() => get().syncMasterBin(), 100); return { savedVideos: n }; }),
      removeVideo: (id) => set((s) => ({ savedVideos: s.savedVideos.filter(v => v.id !== id) })),
      toggleStarChannel: (id) => set((s) => { const n = s.favoriteChannels.map(c => c.channelid === id ? { ...c, starred: !c.starred } : c); setTimeout(() => get().saveChannelsReorder(), 100); return { favoriteChannels: n }; }),
      toggleFavoriteIptvChannel: (ch) => set((s) => { const e = s.favoriteIptvChannels.some(c => c.stream_id === ch.stream_id); const n = e ? s.favoriteIptvChannels.filter(c => c.stream_id !== ch.stream_id) : [...s.favoriteIptvChannels, ch]; setTimeout(() => get().saveIptvReorder(), 100); return { favoriteIptvChannels: n }; }),
      updateIptvChannel: (id, updates) => set((s) => { const n = s.favoriteIptvChannels.map(ch => ch.stream_id === id ? { ...ch, ...updates } : ch); setTimeout(() => get().saveIptvReorder(), 100); return { favoriteIptvChannels: n }; }),
      addIptvChannel: (ch) => set((s) => { const n = [...s.favoriteIptvChannels, ch]; setTimeout(() => get().saveIptvReorder(), 100); return { favoriteIptvChannels: n }; }),
      reorderIptvChannelTo: (f, t) => set((s) => { const l = [...s.favoriteIptvChannels], fI = l.findIndex(i => i.stream_id === f), tI = l.findIndex(i => i.stream_id === t); if (fI === -1 || tI === -1) return s; const [m] = l.splice(fI, 1); l.splice(tI, 0, m); return { favoriteIptvChannels: l }; }),
      
      addPlaylist: (name, videos = []) => {
        const id = Date.now().toString();
        const p = { id, name, videos };
        set((s) => { const n = [...s.playlists, p]; return { playlists: n }; });
        setTimeout(() => get().syncMasterBin(), 200);
        return p;
      },
      removePlaylist: (id) => set((s) => { const n = s.playlists.filter(p => p.id !== id); setTimeout(() => get().syncMasterBin(), 100); return { playlists: n }; }),
      addVideoToPlaylist: (pId, v) => set((s) => { const n = s.playlists.map(p => p.id === pId ? { ...p, videos: [...p.videos.filter(vi => vi.id !== v.id), v] } : p); setTimeout(() => get().syncMasterBin(), 100); return { playlists: n }; }),
      removeVideoFromPlaylist: (pId, vId) => set((s) => { const n = s.playlists.map(p => p.id === pId ? { ...p, videos: p.videos.filter(vi => vi.id !== vId) } : p); setTimeout(() => get().syncMasterBin(), 100); return { playlists: n }; }),
      toggleLooping: () => set((s) => ({ isLooping: !s.isLooping })),

      addCustomFont: (name, url) => set((s) => { const n = [...s.customFonts.filter(f => f.name !== name), { name, url }]; updateBin(JSONBIN_FONTS_BIN_ID, { fonts: n }); return { customFonts: n }; }),
      removeCustomFont: (name, url) => set((s) => { const n = s.customFonts.filter(f => f.name !== name); updateBin(JSONBIN_FONTS_BIN_ID, { fonts: n }); return { customFonts: n }; }),
      addCustomWallBackground: (url) => set((s) => { const n = [...s.customWallBackgrounds.filter(u => u !== url), url]; updateBin(JSONBIN_BACKGROUNDS_BIN_ID, { backgrounds: n }); return { customWallBackgrounds: n }; }),
      removeCustomWallBackground: (url) => set((s) => { const n = s.customWallBackgrounds.filter(u => u !== url); updateBin(JSONBIN_BACKGROUNDS_BIN_ID, { backgrounds: n }); return { customWallBackgrounds: n }; }),
      addReminder: (r) => set((s) => { const n = [...s.reminders, r]; setTimeout(() => get().syncMasterBin(), 100); return { reminders: n }; }),
      updateReminder: (id, u) => set((s) => { const n = s.reminders.map(r => r.id === id ? { ...r, ...u } : r); setTimeout(() => get().syncMasterBin(), 100); return { reminders: n }; }),
      removeReminder: (id) => set((s) => { const n = s.reminders.filter(r => r.id !== id); setTimeout(() => get().syncMasterBin(), 100); return { reminders: n }; }),
      toggleReminder: (id) => set((s) => ({ reminders: s.reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r) })),
      skipReminder: (id) => set((s) => ({ skippedReminderIds: [...s.skippedReminderIds, id] })),
      addAzkar: (a) => set((s) => { const n = [...s.generalAzkar, a]; setTimeout(() => get().syncMasterBin(), 100); return { generalAzkar: n }; }),
      updateAzkar: (id, u) => set((s) => { const n = s.generalAzkar.map(a => a.id === id ? { ...a, ...u } : a); setTimeout(() => get().syncMasterBin(), 100); return { generalAzkar: n }; }),
      removeAzkar: (id) => set((s) => { const n = s.generalAzkar.filter(a => a.id !== id); setTimeout(() => get().syncMasterBin(), 100); return { generalAzkar: n }; }),
      toggleFavoriteTeam: (t) => set((s) => ({ favoriteTeams: s.favoriteTeams.some(i => i.id === t.id) ? s.favoriteTeams.filter(i => i.id !== t.id) : [...s.favoriteTeams, t] })),
      toggleBelledMatch: (matchId) => set((s) => ({ belledMatchIds: s.belledMatchIds.includes(matchId) ? s.belledMatchIds.filter(i => i !== matchId) : [...s.belledMatchIds, matchId] })),
      updateMapSettings: (s) => set((st) => { const n = { ...st.mapSettings, ...s }; if (s.manuscriptBgUrl || s.winwinUrl || s.beinUrl || s.omanUrl || s.bein1Url || s.mbc1Url || s.autoRotateNav90 !== undefined) setTimeout(() => get().syncMasterBin(), 100); return { mapSettings: n }; }),
      setKeyMapping: (ctx, act, key) => set((s) => { const m = { ...s.keyMappings }; if (!m[ctx]) m[ctx] = {}; let k = Array.isArray(m[ctx][act]) ? [...m[ctx][act]] : []; if (k.includes(key)) return s; k.push(key); m[ctx][act] = k.slice(-3); return { keyMappings: m }; }),
      removeSpecificKeyMapping: (ctx, act, key) => set((s) => { const m = { ...s.keyMappings }; if (m[ctx] && m[ctx][act]) { m[ctx][act] = m[ctx][act].filter(v => v !== key); return { keyMappings: m }; } return s; }),
      setActiveVideo: (v, ctx) => set({ playlist: ctx || (v ? [v] : []), playlistIndex: ctx ? ctx.findIndex(i => i.id === v?.id) : 0, activeVideo: v, lastPlayedVideo: v || get().lastPlayedVideo, activeIptv: null, isPlaying: !!v, isMinimized: false, isFullScreen: !!v, isPlayerPlaylistOpen: false }),
      setActiveIptv: (ch, ctx) => set({ iptvPlaylist: ctx || (ch ? [ch] : []), iptvPlaylistIndex: ctx ? ctx.findIndex(c => c.stream_id === ch?.stream_id) : 0, activeIptv: ch, activeVideo: null, isPlaying: !!ch, isMinimized: false, isFullScreen: !!ch, isPlayerPlaylistOpen: false }),
      setActiveQuranUrl: (v) => set({ activeQuranUrl: v }),
      setPlaylist: (videos) => set({ playlist: videos }),
      nextTrack: () => { const s = get(); if (!s.playlist.length) return; let nIdx = (s.playlistIndex + 1); if (nIdx >= s.playlist.length) nIdx = s.isLooping ? 0 : s.playlist.length - 1; set({ playlistIndex: nIdx, activeVideo: s.playlist[nIdx] }); },
      prevTrack: () => { const s = get(); if (!s.playlist.length) return; const pIdx = (s.playlistIndex - 1 + s.playlist.length) % s.playlist.length; set({ playlistIndex: pIdx, activeVideo: s.playlist[pIdx] }); },
      nextIptvChannel: () => { const s = get(); if (!s.iptvPlaylist.length) return; const nIdx = (s.iptvPlaylistIndex + 1) % s.iptvPlaylist.length, ch = s.iptvPlaylist[nIdx]; set({ iptvPlaylistIndex: nIdx, activeIptv: ch }); },
      updateVideoProgress: (id, progress) => set((s) => ({ videoProgress: { ...s.videoProgress, [id]: progress } })),
      setIsPlaying: (v) => set({ isPlaying: v }), setIsMinimized: (v) => set({ isMinimized: v, isFullScreen: false }), setIsFullScreen: (v) => set({ isFullScreen: v, isMinimized: false }),
      cyclePlayerMode: () => { const s = get(); if (s.isFullScreen) set({ isFullScreen: false, isMinimized: true }); else if (s.isMinimized) set({ isMinimized: false, isFullScreen: false }); else set({ isFullScreen: true, isMinimized: false }); },
      toggleDockSide: () => set((s) => ({ dockSide: s.dockSide === 'left' ? 'right' : 'left' })),
      toggleShowIslands: () => set((s) => ({ showIslands: !s.showIslands })), toggleReorderMode: () => set((s) => ({ isReorderMode: !s.isReorderMode, pickedUpId: null })),
      setWallPlate: (t, d) => set({ wallPlateType: t, wallPlateData: d }), resetMediaView: () => set({ selectedChannel: null, channelVideos: [] }),
      setAiSuggestions: (s) => set({ aiSuggestions: s }),
      addManuscript: (m) => set((s) => { const n = [...s.customManuscripts, m]; setTimeout(() => get().saveManuscriptsReorder(), 100); return { customManuscripts: n }; }),
      updateManuscript: (id, u) => set((s) => { const n = s.customManuscripts.map(m => m.id === id ? { ...m, ...u } : m); setTimeout(() => get().saveManuscriptsReorder(), 100); return { customManuscripts: n }; }),
      removeManuscript: (id) => set((s) => { const n = s.customManuscripts.filter(m => m.id !== id); setTimeout(() => get().saveManuscriptsReorder(), 100); return { customManuscripts: n }; }),
      updateManuscriptScale: (id, scale) => set((s) => { const n = { ...s.manuscriptScales, [id]: (s.manuscriptScales[id] || 1.0) + scale }; setTimeout(() => get().syncMasterBin(), 100); return { manuscriptScales: n }; }),
      updatePrayerSetting: (id, updates) => set((s) => { const n = s.prayerSettings.map(p => p.id === id ? { ...p, ...updates } : p); setTimeout(() => get().syncMasterBin(), 100); return { prayerSettings: n }; }),
    }),
    {
      name: "drivecast-sovereign-v142", 
      partialize: (s) => ({ dockSide: s.dockSide, displayScale: s.displayScale, dockScale: s.dockScale, isLooping: s.isLooping }),
    }
  )
);
