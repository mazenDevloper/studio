
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
  JSONBIN_CLUBS_CACHE_BIN_ID,
  JSONBIN_POPULAR_RECITERS_BIN_ID,
  prayerTimesData,
  getDisplayNumber as getGlobalDisplayNumber
} from "./constants";

export interface Reminder {
  id: string;
  label: string;
  relativePrayer: 'fajr' | 'sunrise' | 'duha' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'manual';
  referencePoint: 'azan' | 'iqamah'; 
  offsetMinutes: number; 
  showCountdown: boolean;
  countdownWindow: number; 
  showCountup: boolean;
  countupWindow: number; 
  completed: boolean;
  color: string;
  iconType: 'play' | 'bell' | 'circle';
  expiryType: 'duration' | 'prayer' | 'manual' | 'iqamah';
  expiryReference?: 'azan' | 'iqamah';
  expiryValue?: string; 
  manualTime?: string;
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
  | 'goto_tab_appearance' | 'goto_tab_prayers' | 'goto_tab_reminders' | 'goto_tab_manuscripts' | 'goto_tab_buttonmap'
  | 'inc_zoom' | 'dec_zoom' | 'inc_font' | 'dec_font' | 'next_manuscript' | 'prev_manuscript';

interface MediaState {
  favoriteChannels: YouTubeChannel[];
  savedVideos: YouTubeVideo[];
  videoProgress: Record<string, number>;
  favoriteTeams: FavoriteTeam[];
  favoriteLeagueIds: number[];
  belledMatchIds: string[];
  skippedMatchIds: string[];
  favoriteIptvChannels: IptvChannel[];
  favoriteReciters: YouTubeChannel[];
  iptvFormat: 'ts' | 'm3u8';
  iptvPlaylist: IptvChannel[];
  iptvPlaylistIndex: number;
  prayerTimes: any[];
  prayerSettings: PrayerSetting[];
  reminders: Reminder[];
  customManuscripts: Manuscript[];
  customFonts: { name: string, url: string }[];
  customWallBackgrounds: string[];
  customManuscriptColors: string[];
  mapSettings: MapSettings;
  displayScale: number;
  dockScale: number;
  keyMappings: Record<string, Record<string, string[]>>; 
  aiSuggestions: any[];
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
  
  autoRefreshEnabled: boolean;
  autoRefreshTimes: string[];
  
  pickedUpId: string | null;
  setPickedUpId: (id: string | null) => void;
  
  videoResults: YouTubeVideo[];
  selectedChannel: YouTubeChannel | null;
  channelVideos: YouTubeVideo[];
  
  clubsCache: any[];
  isClubsLoading: boolean;

  iptvSwitchingInfo: { current: IptvChannel, next: IptvChannel | null, prev: IptvChannel | null, currentNum: number, nextNum: number | null, prevNum: number | null } | null;
  setIptvSwitchingInfo: (info: { current: IptvChannel, next: IptvChannel | null, prev: IptvChannel | null, currentNum: number, nextNum: number | null, prevNum: number | null } | null) => void;
  
  setFavoriteChannels: (channels: YouTubeChannel[]) => void;
  setFavoriteIptvChannels: (channels: IptvChannel[]) => void;
  setFavoriteReciters: (reciters: YouTubeChannel[]) => void;
  addChannel: (channel: YouTubeChannel) => void;
  removeChannel: (channelid: string) => void;
  reorderChannel: (fromId: string, direction: 'prev' | 'next') => void;
  reorderChannelTo: (fromId: string, toId: string) => void;
  moveChannelToTop: (channelId: string) => void;
  addReciter: (channel: YouTubeChannel) => void;
  removeReciter: (channelid: string) => void;
  updateReciter: (id: string, name: string) => void;
  reorderReciter: (fromId: string, direction: 'prev' | 'next') => void;
  reorderReciterTo: (fromId: string, toId: string) => void;
  moveReciterToTop: (channelId: string) => void;
  toggleSaveVideo: (video: YouTubeVideo) => void;
  removeVideo: (id: string) => void;
  toggleStarChannel: (channelid: string) => void;
  addReminder: (reminder: Reminder) => void;
  updateReminder: (id: string, reminder: Partial<Reminder>) => void;
  removeReminder: (id: string) => void;
  toggleReminder: (id: string) => void;
  addManuscript: (manuscript: Manuscript) => void;
  updateManuscript: (id: string, update: Partial<Manuscript>) => void;
  removeManuscript: (id: string) => void;
  reorderManuscript: (fromId: string, direction: 'prev' | 'next') => void;
  addCustomFont: (name: string, url: string) => void;
  removeCustomFont: (name: string) => void;
  addCustomWallBackground: (url: string) => void;
  removeCustomWallBackground: (url: string) => void;
  addCustomManuscriptColor: (color: string) => void;
  removeCustomManuscriptColor: (color: string) => void;
  updatePrayerSetting: (id: string, setting: Partial<PrayerSetting>) => void;
  toggleFavoriteTeam: (team: FavoriteTeam) => void;
  toggleFavoriteLeague: (leagueId: number) => void;
  toggleBelledMatch: (matchId: string) => void;
  skipMatch: (matchId: string) => void;
  toggleFavoriteIptvChannel: (channel: IptvChannel) => void;
  updateIptvChannel: (id: string, update: Partial<IptvChannel>) => void;
  reorderIptvChannel: (fromId: string, direction: 'prev' | 'next') => void;
  reorderIptvChannelTo: (fromId: string, toId: string) => void;
  setIptvPlaylist: (channels: IptvChannel[], index: number) => void;
  nextIptvChannel: () => void;
  prevIptvChannel: () => void;
  updateMapSettings: (settings: Partial<MapSettings>) => void;
  setDisplayScale: (scale: number) => void;
  setDockScale: (scale: number) => void;
  setKeyMapping: (context: MappingContext, action: AppAction, key: string) => void;
  removeSpecificKeyMapping: (context: MappingContext, action: AppAction, key: string) => void;
  clearKeyMappings: (context: MappingContext, action: AppAction) => void;
  setAiSuggestions: (suggestions: any[]) => void;
  setActiveVideo: (video: YouTubeVideo | null, context?: YouTubeVideo[]) => void;
  setActiveIptv: (channel: IptvChannel | null, context?: IptvChannel[]) => void;
  setActiveIptvForce: (channel: IptvChannel) => void;
  setActiveQuranUrl: (url: string | null) => void;
  setPlaylist: (videos: YouTubeVideo[]) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  updateVideoProgress: (videoId: string, progress: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsMinimized: (minimized: boolean) => void;
  setIsFullScreen: (fullScreen: boolean) => void;
  cyclePlayerMode: () => void;
  setIsPlayerControlsExpanded: (expanded: boolean) => void;
  setGridMode: (mode: 'hidden' | 'partial' | 'full') => void;
  setIsSidebarShrinked: (shrinked: boolean) => void;
  setWallPlate: (type: 'moon' | 'manuscript' | null, data?: any) => void;
  toggleDockSide: () => void;
  setDockSide: (side: 'left' | 'right') => void;
  toggleShowIslands: () => void;
  setAutoHideIsland: (val: boolean) => void;
  setPlayerMode: (mode: 'api' | 'web') => void;
  toggleAltMode: () => void;
  toggleReorderMode: () => void;
  setApiError: (error: { count: number, message: string } | null) => void;
  setIsRecordingKey: (val: boolean) => void;
  setLastLiveUpdate: (time: number) => void;
  
  setAutoRefreshEnabled: (val: boolean) => void;
  setAutoRefreshTimes: (times: string[]) => void;
  
  setVideoResults: (results: YouTubeVideo[]) => void;
  setSelectedChannel: (channel: YouTubeChannel | null) => void;
  setChannelVideos: (videos: YouTubeVideo[]) => void;
  resetMediaView: () => void;

  fetchPriorityData: (context: 'dashboard' | 'media' | 'all') => Promise<void>;
  fetchPrayerTimes: () => Promise<void>;
  fetchManuscripts: () => Promise<void>;
  syncMasterBin: () => Promise<void>;
  syncEverythingToCloud: () => Promise<void>;
  syncAllMatchesToCloud: () => Promise<void>;
  syncLeagueClubsToCloud: (leagueId: string) => Promise<void>;
  fetchClubsFromCache: (leagueId: string) => Promise<void>;
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
  nav_up: ['ArrowUp', '2'], 
  nav_down: ['ArrowDown', '8'], 
  nav_left: ['ArrowLeft', '4'], 
  nav_right: ['ArrowRight', '6'], 
  nav_ok: ['Enter', '5'], 
  nav_back: ['Backspace', 'Escape', 'Back'],
  goto_home: ['H', '1'], 
  goto_media: ['M', '3'], 
  goto_quran: ['Q', '7'], 
  goto_hihi2: ['F', '9'], 
  goto_iptv: ['0'], 
  goto_football: ['T'], 
  goto_settings: ['SETTINGS'],
  delete_item: ['Red'],
  toggle_star: ['Yellow'],
  toggle_reorder: ['Blue'],
  inc_zoom: ['33'],
  dec_zoom: ['99'],
  inc_font: ['66'],
  dec_font: ['44'],
  next_manuscript: ['88'],
  prev_manuscript: ['22']
};

const DEFAULT_PLAYER_MAPPINGS: Record<string, string[]> = {
  player_next: ['ChannelUp', '3'],
  player_prev: ['PageDown', '1'],
  player_save: ['3'],
  player_fullscreen: [], 
  player_close: ['Red'],
  player_playlist: ['Blue'],
  player_minimize: ['M', 'Green'],
  player_settings: ['Yellow']
};

const DEFAULT_CONTEXT_MAPPINGS: Record<string, Record<string, string[]>> = {
  global: DEFAULT_GLOBAL_MAPPINGS,
  player: DEFAULT_PLAYER_MAPPINGS,
  dashboard: {},
  media: { focus_search: ['0'], focus_reciters: ['1'], focus_surahs: ['2'] },
  quran: { focus_search: ['0'], focus_reciters: ['1'], focus_surahs: ['2'] },
  football: {},
  iptv: {},
  settings: {
    goto_tab_appearance: ['1'],
    goto_tab_prayers: ['2'],
    goto_tab_reminders: ['3'],
    goto_tab_manuscripts: ['4'],
    goto_tab_buttonmap: ['5']
  }
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

export const useMediaStore = create<MediaState>()(
  persist(
    (set, get) => ({
      favoriteChannels: [],
      savedVideos: [],
      videoProgress: {},
      favoriteTeams: [],
      favoriteLeagueIds: [307, 39, 2, 140, 135],
      belledMatchIds: [],
      skippedMatchIds: [],
      favoriteIptvChannels: [],
      favoriteReciters: [],
      iptvFormat: 'm3u8',
      iptvPlaylist: [],
      iptvPlaylistIndex: 0,
      prayerTimes: prayerTimesData,
      prayerSettings: DEFAULT_PRAYER_SETTINGS,
      reminders: [],
      customManuscripts: [],
      customFonts: [],
      customWallBackgrounds: [],
      customManuscriptColors: ['#ffffff', '#FFD700', '#C0C0C0', 'linear-gradient(to bottom, #fff, #999)'],
      mapSettings: { 
        zoom: 20.0, tilt: 65, carScale: 1.02, backgroundIndex: 0, showManuscriptBg: true,
        manuscriptBgUrl: "https://www.image2url.com/r2/default/images/1782382707952-d99447c6-bc60-475d-9406-5fd2ef320bd5.png",
        fontScale: 1.0, manuscriptColor: '#ffffff', showManuscriptOnMoon: false, hue: 0, saturation: 100, brightness: 100
      },
      displayScale: 1.0,
      dockScale: 1.0,
      keyMappings: DEFAULT_CONTEXT_MAPPINGS,
      aiSuggestions: [],
      activeVideo: null,
      activeIptv: null,
      activeQuranUrl: "https://quran.com/ar/radio",
      playlist: [],
      playlistIndex: 0,
      isPlaying: false,
      isMinimized: false,
      isFullScreen: false,
      isPlayerControlsExpanded: false,
      gridMode: 'hidden',
      dockSide: 'left',
      showIslands: true,
      autoHideIsland: true,
      isSidebarShrinked: false,
      wallPlateType: null,
      wallPlateData: null,
      playerMode: 'api',
      isAltModeActive: true, 
      isReorderMode: false,
      apiError: null,
      isRecordingKey: false,
      lastLiveUpdate: 0,
      isInitialLoading: false,
      
      autoRefreshEnabled: true,
      autoRefreshTimes: ["06:00", "12:00", "18:00", "22:00"],

      pickedUpId: null,
      setPickedUpId: (id) => set({ pickedUpId: id }),
      
      videoResults: [],
      selectedChannel: null,
      channelVideos: [],
      
      clubsCache: [],
      isClubsLoading: false,

      iptvSwitchingInfo: null,
      setIptvSwitchingInfo: (info) => set({ iptvSwitchingInfo: info }),
      setApiError: (error) => set({ apiError: error }),
      setIsRecordingKey: (val) => set({ isRecordingKey: val }),

      fetchPriorityData: async (context) => {
        set({ isInitialLoading: true });
        const fetchBinLatest = async (id: string) => {
          if (!id) return null;
          try {
            const r = await fetch(`https://api.jsonbin.io/v3/b/${id}/latest`, { 
              headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }, cache: 'no-store' 
            });
            if (r.ok) {
              const data = await r.json();
              return data.record || data;
            }
          } catch (e) {}
          return null;
        };

        const results = await Promise.allSettled([
          fetchBinLatest(JSONBIN_PRAYER_TIMES_BIN_ID),
          fetchBinLatest(JSONBIN_CHANNELS_BIN_ID),
          fetchBinLatest(JSONBIN_POPULAR_RECITERS_BIN_ID),
          fetchBinLatest(JSONBIN_MANUSCRIPTS_BIN_ID),
          fetchBinLatest(JSONBIN_MASTER_BIN_ID),
          fetchBinLatest(JSONBIN_IPTV_FAVS_BIN_ID),
          fetchBinLatest(JSONBIN_SAVED_VIDEOS_BIN_ID)
        ]);

        if (results[0].status === 'fulfilled' && results[0].value) set({ prayerTimes: Array.isArray(results[0].value) ? results[0].value : (results[0].value.prayers || []) });
        if (results[1].status === 'fulfilled' && results[1].value) set({ favoriteChannels: Array.isArray(results[1].value) ? results[1].value : [] });
        if (results[2].status === 'fulfilled' && results[2].value) set({ favoriteReciters: Array.isArray(results[2].value) ? results[2].value : (results[2].value.reciters || []) });
        if (results[3].status === 'fulfilled' && results[3].value) set({ customManuscripts: Array.isArray(results[3].value) ? results[3].value : (results[3].value.manuscripts || []) });
        if (results[5].status === 'fulfilled' && results[5].value) set({ favoriteIptvChannels: Array.isArray(results[5].value) ? results[5].value : (results[5].value.channels || []) });
        if (results[6].status === 'fulfilled' && results[6].value) set({ savedVideos: Array.isArray(results[6].value) ? results[6].value : [] });
        
        if (results[4].status === 'fulfilled' && results[4].value) {
          const master = results[4].value;
          set({ 
            favoriteTeams: master.favoriteTeams || [], 
            reminders: master.reminders || [],
            mapSettings: { ...get().mapSettings, ...master.mapSettings },
            customFonts: master.customFonts || [],
            customWallBackgrounds: master.customWallBackgrounds || [],
            keyMappings: master.keyMappings || DEFAULT_CONTEXT_MAPPINGS,
            displayScale: master.displayScale ?? 1.0,
            dockScale: master.dockScale ?? 1.0,
            isAltModeActive: master.isAltModeActive ?? true,
            autoHideIsland: master.autoHideIsland ?? true,
            autoRefreshEnabled: master.autoRefreshEnabled ?? true,
            autoRefreshTimes: master.autoRefreshTimes || ["06:00", "12:00", "18:00", "22:00"]
          });
        }
        set({ isInitialLoading: false });
      },

      syncMasterBin: async () => {
        const state = get();
        const data = {
          favoriteTeams: state.favoriteTeams,
          favoriteLeagueIds: state.favoriteLeagueIds,
          belledMatchIds: state.belledMatchIds,
          skippedMatchIds: state.skippedMatchIds,
          prayerSettings: state.prayerSettings,
          reminders: state.reminders,
          mapSettings: state.mapSettings,
          customFonts: state.customFonts,
          customWallBackgrounds: state.customWallBackgrounds,
          customManuscriptColors: state.customManuscriptColors,
          keyMappings: state.keyMappings,
          isAltModeActive: state.isAltModeActive,
          autoHideIsland: state.autoHideIsland,
          displayScale: state.displayScale,
          dockScale: state.dockScale,
          autoRefreshEnabled: state.autoRefreshEnabled,
          autoRefreshTimes: state.autoRefreshTimes
        };
        await updateBin(JSONBIN_MASTER_BIN_ID, data);
      },

      syncEverythingToCloud: async () => {
        const state = get();
        await Promise.allSettled([
          get().syncMasterBin(),
          updateBin(JSONBIN_CHANNELS_BIN_ID, state.favoriteChannels),
          updateBin(JSONBIN_SAVED_VIDEOS_BIN_ID, state.savedVideos),
          updateBin(JSONBIN_IPTV_FAVS_BIN_ID, state.favoriteIptvChannels),
          updateBin(JSONBIN_POPULAR_RECITERS_BIN_ID, state.favoriteReciters),
          updateBin(JSONBIN_MANUSCRIPTS_BIN_ID, state.customManuscripts),
          updateBin(JSONBIN_PRAYER_TIMES_BIN_ID, state.prayerTimes)
        ]);
      },

      saveIptvReorder: async () => { await updateBin(JSONBIN_IPTV_FAVS_BIN_ID, get().favoriteIptvChannels); },
      saveChannelsReorder: async () => { await updateBin(JSONBIN_CHANNELS_BIN_ID, get().favoriteChannels); },
      saveRecitersReorder: async () => { await updateBin(JSONBIN_POPULAR_RECITERS_BIN_ID, get().favoriteReciters); },
      saveManuscriptsReorder: async () => { await updateBin(JSONBIN_MANUSCRIPTS_BIN_ID, get().customManuscripts); },

      addChannel: (channel) => {
        set((state) => {
          const newList = [...state.favoriteChannels.filter(c => c.channelid !== channel.channelid), { ...channel, starred: false }];
          setTimeout(() => updateBin(JSONBIN_CHANNELS_BIN_ID, newList), 100);
          return { favoriteChannels: newList };
        });
      },
      removeChannel: (channelid) => {
        set((state) => {
          const newList = state.favoriteChannels.filter(c => c.channelid !== channelid);
          setTimeout(() => updateBin(JSONBIN_CHANNELS_BIN_ID, newList), 100);
          return { favoriteChannels: newList };
        });
      },
      reorderChannel: (id, dir) => set((state) => {
        const list = [...state.favoriteChannels];
        const idx = list.findIndex(c => c.channelid === id);
        if (idx === -1) return state;
        const nextIdx = dir === 'next' ? idx + 1 : idx - 1;
        if (nextIdx < 0 || nextIdx >= list.length) return state;
        [list[idx], list[nextIdx]] = [list[nextIdx], list[idx]];
        return { favoriteChannels: list };
      }),
      reorderChannelTo: (from, to) => set((state) => {
        const list = [...state.favoriteChannels];
        const fIdx = list.findIndex(c => c.channelid === from), tIdx = list.findIndex(c => c.channelid === to);
        if (fIdx === -1 || tIdx === -1) return state;
        const [moved] = list.splice(fIdx, 1);
        list.splice(tIdx, 0, moved);
        return { favoriteChannels: list };
      }),

      addReciter: (r) => set((state) => {
        const newList = [...state.favoriteReciters.filter(item => item.channelid !== r.channelid), r];
        setTimeout(() => updateBin(JSONBIN_POPULAR_RECITERS_BIN_ID, newList), 100);
        return { favoriteReciters: newList };
      }),
      removeReciter: (id) => set((state) => {
        const newList = state.favoriteReciters.filter(r => r.channelid !== id);
        setTimeout(() => updateBin(JSONBIN_POPULAR_RECITERS_BIN_ID, newList), 100);
        return { favoriteReciters: newList };
      }),
      updateReciter: (id, name) => set((state) => {
        const newList = state.favoriteReciters.map(r => r.channelid === id ? { ...r, name } : r);
        updateBin(JSONBIN_POPULAR_RECITERS_BIN_ID, newList);
        return { favoriteReciters: newList };
      }),
      reorderReciter: (id, dir) => set((state) => {
        const list = [...state.favoriteReciters];
        const idx = list.findIndex(r => r.channelid === id);
        if (idx === -1) return state;
        const nextIdx = dir === 'next' ? idx + 1 : idx - 1;
        if (nextIdx < 0 || nextIdx >= list.length) return state;
        [list[idx], list[nextIdx]] = [list[nextIdx], list[idx]];
        return { favoriteReciters: list };
      }),

      toggleSaveVideo: (v) => set((state) => {
        const exists = state.savedVideos.some(item => item.id === v.id);
        const newList = exists ? state.savedVideos.filter(item => item.id !== v.id) : [{ ...v, progress: 0 }, ...state.savedVideos];
        setTimeout(() => updateBin(JSONBIN_SAVED_VIDEOS_BIN_ID, newList), 100);
        return { savedVideos: newList };
      }),
      removeVideo: (id) => set((state) => {
        const newList = state.savedVideos.filter(v => v.id !== id);
        setTimeout(() => updateBin(JSONBIN_SAVED_VIDEOS_BIN_ID, newList), 100);
        return { savedVideos: newList };
      }),
      updateVideoProgress: (id, progress) => set((state) => {
        const updatedProgress = { ...state.videoProgress, [id]: progress };
        const isSaved = state.savedVideos.some(v => v.id === id);
        let updatedSaved = state.savedVideos;
        if (isSaved) {
          updatedSaved = state.savedVideos.map(v => v.id === id ? { ...v, progress } : v);
          updateBin(JSONBIN_SAVED_VIDEOS_BIN_ID, updatedSaved);
        }
        return { savedVideos: updatedSaved, videoProgress: updatedProgress };
      }),

      toggleStarChannel: (id) => set((state) => {
        const newList = state.favoriteChannels.map(c => c.channelid === id ? { ...c, starred: !c.starred } : c);
        setTimeout(() => updateBin(JSONBIN_CHANNELS_BIN_ID, newList), 100);
        return { favoriteChannels: newList };
      }),

      toggleFavoriteIptvChannel: (ch) => set((state) => {
        const exists = state.favoriteIptvChannels.some(c => c.stream_id === ch.stream_id);
        const processed = { ...ch, type: 'web', url: ch.url || `http://playstop.watch:2095/live/W87d737/Pd37qj34/${ch.stream_id}.m3u8`, starred: true };
        const newList = exists ? state.favoriteIptvChannels.filter(c => c.stream_id !== ch.stream_id) : [...state.favoriteIptvChannels, processed];
        setTimeout(() => updateBin(JSONBIN_IPTV_FAVS_BIN_ID, newList), 100);
        return { favoriteIptvChannels: newList };
      }),
      updateIptvChannel: (id, update) => set((state) => {
        const newList = state.favoriteIptvChannels.map(c => c.stream_id === id ? { ...c, ...update } : c);
        return { favoriteIptvChannels: newList };
      }),
      reorderIptvChannel: (id, dir) => set((state) => {
        const list = [...state.favoriteIptvChannels];
        const idx = list.findIndex(c => c.stream_id === id);
        if (idx === -1) return state;
        const nIdx = dir === 'next' ? idx + 1 : idx - 1;
        if (nIdx < 0 || nIdx >= list.length) return state;
        [list[idx], list[nIdx]] = [list[nIdx], list[idx]];
        return { favoriteIptvChannels: list };
      }),

      addManuscript: (m) => set((state) => {
        const newList = [...state.customManuscripts, m];
        updateBin(JSONBIN_MANUSCRIPTS_BIN_ID, newList);
        return { customManuscripts: newList };
      }),
      updateManuscript: (id, update) => set((state) => {
        const newList = state.customManuscripts.map(m => m.id === id ? { ...m, ...update } : m);
        updateBin(JSONBIN_MANUSCRIPTS_BIN_ID, newList);
        return { customManuscripts: newList };
      }),
      removeManuscript: (id) => set((state) => {
        const newList = state.customManuscripts.filter(m => m.id !== id);
        updateBin(JSONBIN_MANUSCRIPTS_BIN_ID, newList);
        return { customManuscripts: newList };
      }),
      reorderManuscript: (id, dir) => set((state) => {
        const list = [...state.customManuscripts];
        const idx = list.findIndex(m => m.id === id);
        if (idx === -1) return state;
        const nIdx = dir === 'next' ? idx + 1 : idx - 1;
        if (nIdx < 0 || nIdx >= list.length) return state;
        [list[idx], list[nIdx]] = [list[nIdx], list[idx]];
        return { customManuscripts: list };
      }),

      addCustomFont: (name, url) => set((state) => {
        const newList = [...state.customFonts.filter(f => f.name !== name), { name, url }];
        setTimeout(() => get().syncMasterBin(), 100);
        return { customFonts: newList };
      }),
      removeCustomFont: (name) => set((state) => {
        const newList = state.customFonts.filter(f => f.name !== name);
        setTimeout(() => get().syncMasterBin(), 100);
        return { customFonts: newList };
      }),
      addCustomWallBackground: (url) => set((state) => {
        if (state.customWallBackgrounds.includes(url)) return state;
        const newList = [...state.customWallBackgrounds, url];
        setTimeout(() => get().syncMasterBin(), 100);
        return { customWallBackgrounds: newList };
      }),
      removeCustomWallBackground: (url) => set((state) => {
        const newList = state.customWallBackgrounds.filter(u => u !== url);
        setTimeout(() => get().syncMasterBin(), 100);
        return { customWallBackgrounds: newList };
      }),

      addReminder: (r) => set((state) => { const newList = [...state.reminders, r]; setTimeout(() => get().syncMasterBin(), 100); return { reminders: newList }; }),
      removeReminder: (id) => set((state) => { const newList = state.reminders.filter(r => r.id !== id); setTimeout(() => get().syncMasterBin(), 100); return { reminders: newList }; }),
      updateReminder: (id, u) => set((state) => { const newList = state.reminders.map(r => r.id === id ? { ...r, ...u } : r); setTimeout(() => get().syncMasterBin(), 100); return { reminders: newList }; }),
      toggleReminder: (id) => set((state) => ({ reminders: state.reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r) })),

      updateMapSettings: (s) => set((state) => { const newS = { ...state.mapSettings, ...s }; setTimeout(() => get().syncMasterBin(), 100); return { mapSettings: newS }; }),
      setDisplayScale: (v) => set({ displayScale: v }),
      setDockScale: (v) => set({ dockScale: v }),
      
      setAutoRefreshEnabled: (val) => set((state) => { setTimeout(() => get().syncMasterBin(), 100); return { autoRefreshEnabled: val }; }),
      setAutoRefreshTimes: (times) => set((state) => { setTimeout(() => get().syncMasterBin(), 100); return { autoRefreshTimes: times }; }),

      setKeyMapping: (ctx, act, key) => set((state) => {
        const m = { ...state.keyMappings };
        if (!m[ctx]) m[ctx] = {};
        let keys = Array.isArray(m[ctx][act]) ? [...m[ctx][act]] : [];
        if (keys.includes(key)) return state;
        keys.push(key);
        m[ctx][act] = keys.slice(-2);
        setTimeout(() => get().syncMasterBin(), 100);
        return { keyMappings: m };
      }),
      removeSpecificKeyMapping: (ctx, act, key) => set((state) => {
        const m = { ...state.keyMappings };
        if (m[ctx] && m[ctx][act]) {
          m[ctx][act] = m[ctx][act].filter(k => k !== key);
          setTimeout(() => get().syncMasterBin(), 100);
          return { keyMappings: m };
        }
        return state;
      }),

      setActiveVideo: (v, context) => {
        if (get().isReorderMode) return; 
        if (v) {
          const pl = context && context.length > 0 ? context : [v];
          const idx = pl.findIndex(item => item.id === v.id);
          set({ playlist: pl, playlistIndex: idx > -1 ? idx : 0, activeVideo: v, activeIptv: null, isPlaying: true, isMinimized: false, isFullScreen: true, gridMode: 'hidden' });
        } else {
          set({ activeVideo: null, isPlaying: false, isMinimized: false, isFullScreen: false, gridMode: 'hidden' });
        }
      },
      setActiveIptv: (ch, context) => {
        if (get().isReorderMode) return; 
        if (!ch) { set({ activeIptv: null, isPlaying: false, isMinimized: false, isFullScreen: false, gridMode: 'hidden' }); return; }
        const processed = { ...ch, type: 'web', url: ch.url || `http://playstop.watch:2095/live/W87d737/Pd37qj34/${ch.stream_id}.m3u8` };
        const pl = (context?.length) ? context : (get().favoriteIptvChannels.length ? get().favoriteIptvChannels : [processed]);
        const idx = pl.findIndex(c => c.stream_id === processed.stream_id);
        set({ iptvPlaylist: pl, iptvPlaylistIndex: idx > -1 ? idx : 0, activeIptv: processed, activeVideo: null, isPlaying: true, isMinimized: false, isFullScreen: true, gridMode: 'hidden' });
      },

      nextTrack: () => {
        const s = get();
        if (s.activeIptv) { s.nextIptvChannel(); return; }
        if (!s.playlist.length) return;
        const nIdx = (s.playlistIndex + 1) % s.playlist.length;
        set({ playlistIndex: nIdx, activeVideo: s.playlist[nIdx] });
      },
      prevTrack: () => {
        const s = get();
        if (s.activeIptv) { s.prevIptvChannel(); return; }
        if (!s.playlist.length) return;
        const pIdx = (s.playlistIndex - 1 + s.playlist.length) % s.playlist.length;
        set({ playlistIndex: pIdx, activeVideo: s.playlist[pIdx] });
      },
      
      nextIptvChannel: () => {
        const s = get(); if (!s.iptvPlaylist.length) return;
        const nIdx = (s.iptvPlaylistIndex + 1) % s.iptvPlaylist.length, ch = s.iptvPlaylist[nIdx];
        const pIdx = (nIdx - 1 + s.iptvPlaylist.length) % s.iptvPlaylist.length, nnIdx = (nIdx + 1) % s.iptvPlaylist.length;
        set({ 
          iptvPlaylistIndex: nIdx, 
          activeIptv: { ...ch, url: ch.url || `http://playstop.watch:2095/live/W87d737/Pd37qj34/${ch.stream_id}.m3u8`, type: 'web' },
          iptvSwitchingInfo: { 
            current: ch, next: s.iptvPlaylist[nnIdx], prev: s.iptvPlaylist[pIdx],
            currentNum: getGlobalDisplayNumber(nIdx), nextNum: getGlobalDisplayNumber(nnIdx), prevNum: getGlobalDisplayNumber(pIdx)
          }
        });
        setTimeout(() => set({ iptvSwitchingInfo: null }), 3000);
      },

      setIsPlaying: (p) => set({ isPlaying: p }),
      setIsMinimized: (m) => set({ isMinimized: m, isFullScreen: false }),
      setIsFullScreen: (f) => set({ isFullScreen: f, isMinimized: false }),
      cyclePlayerMode: () => { const { isFullScreen: f, isMinimized: m } = get(); if (f && !m) set({ isFullScreen: false, isMinimized: true }); else if (!f && m) set({ isFullScreen: false, isMinimized: false }); else set({ isFullScreen: true, isMinimized: false }); },
      toggleDockSide: () => set((s) => { const next = s.dockSide === 'left' ? 'right' : 'left'; document.cookie = `dockSide=${next}; path=/; max-age=31536000`; return { dockSide: next }; }),
      toggleShowIslands: () => set((s) => ({ showIslands: !s.showIslands })),
      toggleReorderMode: () => set((s) => ({ isReorderMode: !s.isReorderMode, pickedUpId: null })),
      resetMediaView: () => set({ selectedChannel: null, channelVideos: [] }),
    }),
    {
      name: "drivecast-ready-v100", 
      partialize: (s) => ({ 
        dockSide: s.dockSide, showIslands: s.showIslands, playerMode: s.playerMode, isAltModeActive: s.isAltModeActive, autoHideIsland: s.autoHideIsland,
        displayScale: s.displayScale, dockScale: s.dockScale, mapSettings: s.mapSettings, autoRefreshEnabled: s.autoRefreshEnabled, autoRefreshTimes: s.autoRefreshTimes
      }),
    }
  )
);
