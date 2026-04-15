
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
  prayerTimesData
} from "./constants";

export interface Reminder {
  id: string;
  label: string;
  relativePrayer: 'fajr' | 'sunrise' | 'duha' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'manual';
  manualTime?: string; 
  offsetMinutes: number; 
  showCountdown: boolean;
  countdownWindow: number; 
  showCountup: boolean;
  countupWindow: number; 
  completed: boolean;
  color: string;
  iconType: 'play' | 'bell' | 'circle';
  expiryType: 'duration' | 'prayer' | 'manual';
  expiryValue?: string; // Prayer ID or manual time HH:mm
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
}

export interface Manuscript {
  id: string;
  type: 'text' | 'image';
  content: string;
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
}

export interface FavoriteTeam {
  id: number;
  name: string;
  logo: string;
}

export type MappingContext = 'global' | 'player' | 'dashboard' | 'media' | 'quran' | 'football' | 'iptv' | 'settings';

export type AppAction = 
  | 'nav_up' | 'nav_down' | 'nav_left' | 'nav_right' | 'nav_ok' | 'nav_back'
  | 'toggle_star' | 'delete_item' | 'toggle_reorder'
  | 'goto_home' | 'goto_media' | 'goto_quran' | 'goto_hihi2' | 'goto_iptv' | 'goto_football' | 'goto_settings'
  | 'player_next' | 'player_prev' | 'player_save' | 'player_fullscreen' | 'player_playlist' | 'player_minimize' | 'player_close' | 'player_settings'
  | 'focus_search' | 'focus_reciters' | 'focus_surahs'
  | 'goto_tab_appearance' | 'goto_tab_prayers' | 'goto_tab_reminders' | 'goto_tab_manuscripts' | 'goto_tab_buttonmap';

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
  
  pickedUpId: string | null;
  setPickedUpId: (id: string | null) => void;
  
  videoResults: YouTubeVideo[];
  selectedChannel: YouTubeChannel | null;
  channelVideos: YouTubeVideo[];
  
  clubsCache: any[];
  isClubsLoading: boolean;

  iptvSwitchingInfo: { current: IptvChannel, next: IptvChannel | null, prev: IptvChannel | null } | null;
  setIptvSwitchingInfo: (info: { current: IptvChannel, next: IptvChannel | null, prev: IptvChannel | null } | null) => void;
  
  setFavoriteChannels: (channels: YouTubeChannel[]) => void;
  setFavoriteIptvChannels: (channels: IptvChannel[]) => void;
  setFavoriteReciters: (reciters: YouTubeChannel[]) => void;
  addChannel: (channel: YouTubeChannel) => void;
  removeChannel: (channelid: string) => void;
  reorderChannel: (fromId: string, direction: 'prev' | 'next') => void;
  reorderChannelTo: (fromId: string, toId: string) => void;
  addReciter: (channel: YouTubeChannel) => void;
  removeReciter: (channelid: string) => void;
  reorderReciter: (fromId: string, direction: 'prev' | 'next') => void;
  reorderReciterTo: (fromId: string, toId: string) => void;
  toggleSaveVideo: (video: YouTubeVideo) => void;
  removeVideo: (id: string) => void;
  toggleStarChannel: (channelid: string) => void;
  addReminder: (reminder: Reminder) => void;
  updateReminder: (id: string, reminder: Partial<Reminder>) => void;
  removeReminder: (id: string) => void;
  toggleReminder: (id: string) => void;
  addManuscript: (manuscript: Manuscript) => void;
  removeManuscript: (id: string) => void;
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
  
  setVideoResults: (results: YouTubeVideo[]) => void;
  setSelectedChannel: (channel: YouTubeChannel | null) => void;
  setChannelVideos: (videos: YouTubeVideo[]) => void;
  resetMediaView: () => void;

  fetchPrayerTimes: () => Promise<void>;
  fetchManuscripts: () => Promise<void>;
  syncMasterBin: () => Promise<void>;
  syncAllMatchesToCloud: () => Promise<void>;
  syncLeagueClubsToCloud: (leagueId: string) => Promise<void>;
  fetchClubsFromCache: (leagueId: string) => Promise<void>;
  saveIptvReorder: () => Promise<void>;
  saveChannelsReorder: () => Promise<void>;
}

const updateBin = async (binId: string, data: any) => {
  try {
    await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_MASTER_KEY
      },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.error(`JSONBin Sync Error [${binId}]:`, e);
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
  toggle_reorder: ['Blue']
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
  media: {
    focus_search: ['0'],
    focus_reciters: ['1'],
    focus_surahs: ['2']
  },
  quran: {
    focus_search: ['0'],
    focus_reciters: ['1'],
    focus_surahs: ['2']
  },
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

const INITIAL_IPTV_FAVORITES: IptvChannel[] = [
  {
    name: "beIN Sports 1 HD",
    stream_id: "2001",
    stream_icon: "https://i.pinimg.com/736x/8e/8e/8e/8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e.jpg",
    category_id: "direct",
    starred: true,
    type: 'web',
    url: "http://playstop.watch:2095/live/W87d737/Pd37qj34/2001.m3u8"
  }
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
      favoriteIptvChannels: INITIAL_IPTV_FAVORITES,
      favoriteReciters: [],
      iptvFormat: 'm3u8',
      iptvPlaylist: [],
      iptvPlaylistIndex: 0,
      prayerTimes: prayerTimesData,
      prayerSettings: DEFAULT_PRAYER_SETTINGS,
      reminders: [],
      customManuscripts: [],
      customWallBackgrounds: [],
      customManuscriptColors: ['#ffffff', '#FFD700', '#C0C0C0'],
      mapSettings: { 
        zoom: 20.0, 
        tilt: 65, 
        carScale: 1.02, 
        backgroundIndex: 0,
        showManuscriptBg: true,
        manuscriptBgUrl: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=2000",
        fontScale: 1.0
      },
      displayScale: 0.8,
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
      pickedUpId: null,
      setPickedUpId: (id) => set({ pickedUpId: id }),
      
      videoResults: [],
      selectedChannel: null,
      channelVideos: [],
      
      clubsCache: [],
      isClubsLoading: false,

      iptvSwitchingInfo: null,
      setIptvSwitchingInfo: (info) => set({ iptvSwitchingInfo: info }),

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
          videoProgress: state.videoProgress,
          customWallBackgrounds: state.customWallBackgrounds,
          customManuscriptColors: state.customManuscriptColors,
          keyMappings: state.keyMappings,
          isAltModeActive: state.isAltModeActive,
          autoHideIsland: state.autoHideIsland
        };
        await updateBin(JSONBIN_MASTER_BIN_ID, data);
      },

      syncAllMatchesToCloud: async () => {
        const { fetchFootballData } = await import("./football-api");
        try {
          const [yesterday, today, tomorrow] = await Promise.all([
            fetchFootballData('yesterday'),
            fetchFootballData('today'),
            fetchFootballData('tomorrow')
          ]);
          const data = { yesterday, today, tomorrow, updatedAt: new Date().toISOString() };
          await updateBin(JSONBIN_MATCHES_SCHEDULE_BIN_ID, data);
        } catch (e) { console.error(e); }
      },

      fetchClubsFromCache: async (leagueId: string) => {
        set({ isClubsLoading: true });
        try {
          const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CLUBS_CACHE_BIN_ID}/latest`, {
            headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.record?.leagueId === leagueId) set({ clubsCache: data.record.teams });
          }
        } finally { set({ isClubsLoading: false }); }
      },

      syncLeagueClubsToCloud: async (leagueId: string) => {
        const { searchFootballTeams } = await import("./football-api");
        const teams = await searchFootballTeams("", leagueId);
        if (teams?.length) {
          await updateBin(JSONBIN_CLUBS_CACHE_BIN_ID, { leagueId, teams, updatedAt: new Date().toISOString() });
          set({ clubsCache: teams });
        }
      },

      saveIptvReorder: async () => {
        const state = get();
        await updateBin(JSONBIN_IPTV_FAVS_BIN_ID, state.favoriteIptvChannels);
      },

      saveChannelsReorder: async () => {
        const state = get();
        await updateBin(JSONBIN_CHANNELS_BIN_ID, state.favoriteChannels);
      },

      fetchPrayerTimes: async () => {
        try {
          const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_PRAYER_TIMES_BIN_ID}/latest`, {
            headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
          });
          if (res.ok) {
            const data = await res.json();
            const record = data.record || data;
            if (Array.isArray(record)) {
              set({ prayerTimes: record });
            } else {
              if (record.prayers) set({ prayerTimes: record.prayers });
              if (record.backgrounds) set({ customWallBackgrounds: record.backgrounds });
            }
          }
        } catch (e) { console.error("Prayer Bin Fetch Error:", e); }
      },

      fetchManuscripts: async () => {
        try {
          const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_MANUSCRIPTS_BIN_ID}/latest`, {
            headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
          });
          if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data.record) ? data.record : (data.record?.manuscripts || []);
            set({ customManuscripts: list });
          }
        } catch (e) { console.error("Manuscripts Fetch Error:", e); }
      },

      setFavoriteChannels: (channels) => set({ favoriteChannels: Array.isArray(channels) ? channels : [] }),
      setFavoriteIptvChannels: (channels) => set({ favoriteIptvChannels: Array.isArray(channels) ? channels : [] }),
      setFavoriteReciters: (reciters) => set({ favoriteReciters: Array.isArray(reciters) ? reciters : [] }),

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

      reorderChannel: (id, direction) => set((state) => {
        const list = [...state.favoriteChannels];
        const idx = list.findIndex(c => c.channelid === id);
        if (idx === -1) return state;
        const nextIdx = direction === 'next' ? idx + 1 : idx - 1;
        if (nextIdx < 0 || nextIdx >= list.length) return state;
        [list[idx], list[nextIdx]] = [list[nextIdx], list[idx]];
        setTimeout(() => updateBin(JSONBIN_CHANNELS_BIN_ID, list), 500);
        return { favoriteChannels: list };
      }),

      reorderChannelTo: (fromId, toId) => set((state) => {
        const list = [...state.favoriteChannels];
        const fromIdx = list.findIndex(c => c.channelid === fromId);
        const toIdx = list.findIndex(c => c.channelid === toId);
        if (fromIdx === -1 || toIdx === -1) return state;
        const [moved] = list.splice(fromIdx, 1);
        list.splice(toIdx, 0, moved);
        setTimeout(() => updateBin(JSONBIN_CHANNELS_BIN_ID, list), 500);
        return { favoriteChannels: list };
      }),

      addReciter: (reciter) => {
        set((state) => {
          const newList = [...state.favoriteReciters.filter(r => r.channelid !== reciter.channelid), reciter];
          setTimeout(() => updateBin(JSONBIN_POPULAR_RECITERS_BIN_ID, newList), 100);
          return { favoriteReciters: newList };
        });
      },

      removeReciter: (channelid) => {
        set((state) => {
          const newList = state.favoriteReciters.filter(r => r.channelid !== channelid);
          setTimeout(() => updateBin(JSONBIN_POPULAR_RECITERS_BIN_ID, newList), 100);
          return { favoriteReciters: newList };
        });
      },

      reorderReciter: (id, direction) => set((state) => {
        const list = [...state.favoriteReciters];
        const idx = list.findIndex(r => r.channelid === id);
        if (idx === -1) return state;
        const nextIdx = direction === 'next' ? idx + 1 : idx - 1;
        if (nextIdx < 0 || nextIdx >= list.length) return state;
        [list[idx], list[nextIdx]] = [list[nextIdx], list[idx]];
        setTimeout(() => updateBin(JSONBIN_POPULAR_RECITERS_BIN_ID, list), 500);
        return { favoriteReciters: list };
      }),

      reorderReciterTo: (fromId, toId) => set((state) => {
        const list = [...state.favoriteReciters];
        const fromIdx = list.findIndex(r => r.channelid === fromId);
        const toIdx = list.findIndex(r => r.channelid === toId);
        if (fromIdx === -1 || toIdx === -1) return state;
        const [moved] = list.splice(fromIdx, 1);
        list.splice(toIdx, 0, moved);
        setTimeout(() => updateBin(JSONBIN_POPULAR_RECITERS_BIN_ID, list), 500);
        return { favoriteReciters: list };
      }),

      toggleSaveVideo: (video) => {
        set((state) => {
          const exists = state.savedVideos.some(v => v.id === video.id);
          const newList = exists ? state.savedVideos.filter(v => v.id !== video.id) : [{ ...video, progress: 0 }, ...state.savedVideos];
          setTimeout(() => updateBin(JSONBIN_SAVED_VIDEOS_BIN_ID, newList), 100);
          return { savedVideos: newList };
        });
      },

      removeVideo: (id) => {
        set((state) => {
          const newList = state.savedVideos.filter(v => v.id !== id);
          setTimeout(() => updateBin(JSONBIN_SAVED_VIDEOS_BIN_ID, newList), 100);
          return { savedVideos: newList };
        });
      },

      updateVideoProgress: (videoId, progress) => {
        set((state) => {
          const updatedProgress = { ...state.videoProgress, [videoId]: progress };
          const isSaved = state.savedVideos.some(v => v.id === videoId);
          let updatedSaved = state.savedVideos;
          if (isSaved) {
            updatedSaved = state.savedVideos.map(v => v.id === videoId ? { ...v, progress } : v);
            updateBin(JSONBIN_SAVED_VIDEOS_BIN_ID, updatedSaved);
          }
          return { savedVideos: updatedSaved, videoProgress: updatedProgress };
        });
      },

      toggleStarChannel: (channelid) => {
        set((state) => {
          const newList = state.favoriteChannels.map(c => c.channelid === channelid ? { ...c, starred: !c.starred } : c);
          setTimeout(() => updateBin(JSONBIN_CHANNELS_BIN_ID, newList), 100);
          return { favoriteChannels: newList };
        });
      },

      toggleFavoriteTeam: (team) => {
        set((state) => {
          const exists = state.favoriteTeams.some(t => t.id === team.id);
          const newTeams = exists ? state.favoriteTeams.filter(t => t.id !== team.id) : [...state.favoriteTeams, team];
          setTimeout(() => get().syncMasterBin(), 100);
          return { favoriteTeams: newTeams };
        });
      },

      toggleFavoriteLeague: (leagueId) => {
        set((state) => {
          const newLeagues = state.favoriteLeagueIds.includes(leagueId) ? state.favoriteLeagueIds.filter(id => id !== leagueId) : [...state.favoriteLeagueIds, leagueId];
          setTimeout(() => get().syncMasterBin(), 100);
          return { favoriteLeagueIds: newLeagues };
        });
      },

      toggleBelledMatch: (matchId) => {
        set((state) => {
          const newMatches = state.belledMatchIds.includes(matchId) ? state.belledMatchIds.filter(id => id !== matchId) : [...state.belledMatchIds, matchId];
          setTimeout(() => get().syncMasterBin(), 100);
          return { belledMatchIds: newMatches };
        });
      },

      skipMatch: (matchId) => {
        set((state) => {
          const newSkipped = Array.from(new Set([...state.skippedMatchIds, matchId]));
          setTimeout(() => get().syncMasterBin(), 100);
          return { skippedMatchIds: newSkipped };
        });
      },

      toggleFavoriteIptvChannel: (channel) => {
        set((state) => {
          const exists = state.favoriteIptvChannels.some(c => c.stream_id === channel.stream_id);
          const processedChannel = {
            ...channel,
            type: 'web',
            url: channel.url || `http://playstop.watch:2095/live/W87d737/Pd37qj34/${channel.stream_id}.m3u8`,
            starred: true
          };
          const newList = exists ? state.favoriteIptvChannels.filter(c => c.stream_id !== channel.stream_id) : [...state.favoriteIptvChannels, processedChannel];
          setTimeout(() => updateBin(JSONBIN_IPTV_FAVS_BIN_ID, newList), 100);
          return { favoriteIptvChannels: newList };
        });
      },

      reorderIptvChannel: (id, direction) => set((state) => {
        const list = [...state.favoriteIptvChannels];
        const idx = list.findIndex(c => c.stream_id === id);
        if (idx === -1) return state;
        const nextIdx = direction === 'next' ? idx + 1 : idx - 1;
        if (nextIdx < 0 || nextIdx >= list.length) return state;
        [list[idx], list[nextIdx]] = [list[nextIdx], list[idx]];
        setTimeout(() => updateBin(JSONBIN_IPTV_FAVS_BIN_ID, list), 500);
        return { favoriteIptvChannels: list };
      }),

      reorderIptvChannelTo: (fromId, toId) => set((state) => {
        const list = [...state.favoriteIptvChannels];
        const fromIdx = list.findIndex(c => c.stream_id === fromId);
        const toIdx = list.findIndex(c => c.stream_id === toId);
        if (fromIdx === -1 || toIdx === -1) return state;
        const [moved] = list.splice(fromIdx, 1);
        list.splice(toIdx, 0, moved);
        setTimeout(() => updateBin(JSONBIN_IPTV_FAVS_BIN_ID, list), 500);
        return { favoriteIptvChannels: list };
      }),

      addManuscript: (manuscript) => set((state) => {
        const newList = [...state.customManuscripts, manuscript];
        updateBin(JSONBIN_MANUSCRIPTS_BIN_ID, newList);
        return { customManuscripts: newList };
      }),

      removeManuscript: (id) => set((state) => {
        const newList = state.customManuscripts.filter(m => m.id !== id);
        updateBin(JSONBIN_MANUSCRIPTS_BIN_ID, newList);
        return { customManuscripts: newList };
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

      addCustomManuscriptColor: (color) => set((state) => {
        if (state.customManuscriptColors.includes(color)) return state;
        const newList = [...state.customManuscriptColors, color];
        setTimeout(() => get().syncMasterBin(), 100);
        return { customManuscriptColors: newList };
      }),

      removeCustomManuscriptColor: (color) => set((state) => {
        let newList = state.customManuscriptColors.filter(c => c !== color);
        setTimeout(() => get().syncMasterBin(), 100);
        return { customManuscriptColors: newList };
      }),

      updatePrayerSetting: (id, update) => set((state) => {
        const newList = state.prayerSettings.map(s => s.id === id ? { ...s, ...update } : s);
        setTimeout(() => get().syncMasterBin(), 100);
        return { prayerSettings: newList };
      }),

      addReminder: (reminder) => set((state) => {
        const newList = [...state.reminders, reminder];
        setTimeout(() => get().syncMasterBin(), 100);
        return { reminders: newList };
      }),

      updateReminder: (id, update) => set((state) => {
        const newList = state.reminders.map(r => r.id === id ? { ...r, ...update } : r);
        setTimeout(() => get().syncMasterBin(), 100);
        return { reminders: newList };
      }),

      removeReminder: (id) => set((state) => {
        const newList = state.reminders.filter(r => r.id !== id);
        setTimeout(() => get().syncMasterBin(), 100);
        return { reminders: newList };
      }),

      toggleReminder: (id) => set((state) => {
        const newList = state.reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r);
        return { reminders: newList };
      }),

      updateMapSettings: (settings) => set((state) => {
        const newSettings = { ...state.mapSettings, ...settings };
        setTimeout(() => get().syncMasterBin(), 100);
        return { mapSettings: newSettings };
      }),

      setDisplayScale: (scale) => set({ displayScale: scale }),
      setDockScale: (scale) => set({ dockScale: scale }),

      setKeyMapping: (context, action, key) => set((state) => {
        const currentMappings = { ...state.keyMappings };
        if (!currentMappings[context]) currentMappings[context] = {};
        
        let currentKeys = Array.isArray(currentMappings[context][action]) ? [...currentMappings[context][action]] : [];
        if (currentKeys.includes(key)) return state;
        
        currentKeys.push(key);
        currentMappings[context][action] = currentKeys.slice(-2);
        
        setTimeout(() => get().syncMasterBin(), 100);
        return { keyMappings: currentMappings };
      }),

      removeSpecificKeyMapping: (context, action, key) => set((state) => {
        const currentMappings = { ...state.keyMappings };
        if (currentMappings[context] && currentMappings[context][action]) {
          currentMappings[context][action] = currentMappings[context][action].filter(k => k !== key);
          setTimeout(() => get().syncMasterBin(), 100);
          return { keyMappings: currentMappings };
        }
        return state;
      }),

      clearKeyMappings: (context, action) => set((state) => {
        const currentMappings = { ...state.keyMappings };
        if (currentMappings[context]) currentMappings[context][action] = [];
        setTimeout(() => get().syncMasterBin(), 100);
        return { keyMappings: currentMappings };
      }),

      setAiSuggestions: (suggestions) => set({ aiSuggestions: suggestions }),
      
      setActiveVideo: (video, context) => {
        const state = get();
        if (state.isReorderMode) return; 
        if (video) {
          const playlist = context && context.length > 0 ? context : [video];
          const idx = playlist.findIndex(v => v.id === video.id);
          set({ 
            playlist: playlist, 
            playlistIndex: idx > -1 ? idx : 0,
            activeVideo: video, 
            activeIptv: null, 
            isPlaying: true, 
            isMinimized: false, 
            isFullScreen: true,
            gridMode: 'hidden'
          });
        } else {
          set({ activeVideo: null, isPlaying: false, isMinimized: false, isFullScreen: false, gridMode: 'hidden' });
        }
      },

      setActiveIptv: (channel, context) => {
        const state = get();
        if (state.isReorderMode) return; 
        if (!channel) {
          set({ activeIptv: null, isPlaying: false, isMinimized: false, isFullScreen: false, gridMode: 'hidden' });
          return;
        }
        let finalChannel = { ...channel, type: 'web', url: channel.url || `http://playstop.watch:2095/live/W87d737/Pd37qj34/${channel.stream_id}.m3u8` };
        const iptvPlaylist = (context?.length) ? context : (state.favoriteIptvChannels.length ? state.favoriteIptvChannels : [finalChannel]);
        const idx = iptvPlaylist.findIndex(c => c.stream_id === finalChannel.stream_id);
        set({ iptvPlaylist, iptvPlaylistIndex: idx > -1 ? idx : 0, activeIptv: finalChannel, activeVideo: null, isPlaying: true, isMinimized: false, isFullScreen: true, gridMode: 'hidden' });
      },

      setActiveQuranUrl: (url) => set({ activeQuranUrl: url }),
      setPlaylist: (videos) => {
        if (!videos?.length) return;
        set({ playlist: videos, playlistIndex: 0, activeVideo: videos[0], activeIptv: null, isPlaying: true, isMinimized: false, isFullScreen: true, gridMode: 'hidden' });
      },
      nextTrack: () => {
        const state = get();
        if (state.activeIptv) { get().nextIptvChannel(); return; }
        if (!state.playlist.length) return;
        const nextIdx = (state.playlistIndex + 1) % state.playlist.length;
        set({ playlistIndex: nextIdx, activeVideo: state.playlist[nextIdx] });
      },
      prevTrack: () => {
        const state = get();
        if (state.activeIptv) { get().prevIptvChannel(); return; }
        if (!state.playlist.length) return;
        const prevIdx = (state.playlistIndex - 1 + state.playlist.length) % state.playlist.length;
        set({ playlistIndex: prevIdx, activeVideo: state.playlist[prevIdx] });
      },
      nextIptvChannel: () => {
        const state = get();
        if (!state.iptvPlaylist.length) return;
        const nextIdx = (state.iptvPlaylistIndex + 1) % state.iptvPlaylist.length;
        const channel = state.iptvPlaylist[nextIdx];
        const prevIdx = (nextIdx - 1 + state.iptvPlaylist.length) % state.iptvPlaylist.length;
        const nextNextIdx = (nextIdx + 1) % state.iptvPlaylist.length;
        
        set({ 
          iptvPlaylistIndex: nextIdx, 
          activeIptv: { ...channel, url: channel.url || `http://playstop.watch:2095/live/W87d737/Pd37qj34/${channel.stream_id}.m3u8`, type: 'web' },
          iptvSwitchingInfo: { current: channel, next: state.iptvPlaylist[nextNextIdx], prev: state.iptvPlaylist[prevIdx] }
        });
        setTimeout(() => set({ iptvSwitchingInfo: null }), 3000);
      },
      prevIptvChannel: () => {
        const state = get();
        if (!state.iptvPlaylist.length) return;
        const prevIdx = (state.iptvPlaylistIndex - 1 + state.iptvPlaylist.length) % state.iptvPlaylist.length;
        const channel = state.iptvPlaylist[prevIdx];
        const prevPrevIdx = (prevIdx - 1 + state.iptvPlaylist.length) % state.iptvPlaylist.length;
        const nextIdx = (prevIdx + 1) % state.iptvPlaylist.length;

        set({ 
          iptvPlaylistIndex: prevIdx, 
          activeIptv: { ...channel, url: channel.url || `http://playstop.watch:2095/live/W87d737/Pd37qj34/${channel.stream_id}.m3u8`, type: 'web' },
          iptvSwitchingInfo: { current: channel, next: state.iptvPlaylist[nextIdx], prev: state.iptvPlaylist[prevPrevIdx] }
        });
        setTimeout(() => set({ iptvSwitchingInfo: null }), 3000);
      },
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setIsMinimized: (minimized) => set({ isMinimized: minimized, isFullScreen: false }),
      setIsFullScreen: (fullScreen) => set({ isFullScreen: fullScreen, isMinimized: false }),
      cyclePlayerMode: () => {
        const { isFullScreen, isMinimized } = get();
        if (isFullScreen && !isMinimized) {
          set({ isFullScreen: false, isMinimized: true });
        } else if (!isFullScreen && isMinimized) {
          set({ isFullScreen: false, isMinimized: false });
        } else {
          set({ isFullScreen: true, isMinimized: false });
        }
      },
      setIsPlayerControlsExpanded: (expanded) => set({ isPlayerControlsExpanded: expanded }),
      setGridMode: (mode) => set({ gridMode: mode }),
      setIsSidebarShrinked: (shrinked) => set({ isSidebarShrinked: shrinked }),
      setWallPlate: (type, data) => set({ wallPlateType: type, wallPlateData: data }),
      setPlayerMode: (mode) => set({ playerMode: mode }),
      toggleDockSide: () => set((state) => {
        const nextSide = state.dockSide === 'left' ? 'right' : 'left';
        if (typeof document !== 'undefined') document.cookie = `dockSide=${nextSide}; path=/; max-age=31536000`;
        return { dockSide: nextSide };
      }),
      setDockSide: (side) => {
        if (typeof document !== 'undefined') document.cookie = `dockSide=${side}; path=/; max-age=31536000`;
        set({ dockSide: side });
      },
      toggleShowIslands: () => set((state) => ({ showIslands: !state.showIslands })),
      setAutoHideIsland: (val) => set({ autoHideIsland: val }),
      setVideoResults: (results) => set({ videoResults: results }),
      setSelectedChannel: (channel) => set({ selectedChannel: channel }),
      setChannelVideos: (videos) => set({ channelVideos: videos }),
      resetMediaView: () => set({ videoResults: [], selectedChannel: null, channelVideos: [] }),
      toggleAltMode: () => set((state) => ({ isAltModeActive: !state.isAltModeActive })),
      toggleReorderMode: () => set((state) => ({ isReorderMode: !state.isReorderMode, pickedUpId: null })),
      setApiError: (error) => set({ apiError: error }),
    }),
    {
      name: "drivecast-master-v27",
      partialize: (state) => ({ 
        videoProgress: state.videoProgress, 
        dockSide: state.dockSide, 
        showIslands: state.showIslands, 
        playerMode: state.playerMode, 
        isAltModeActive: state.isAltModeActive, 
        isReorderMode: state.isReorderMode, 
        autoHideIsland: state.autoHideIsland,
        displayScale: state.displayScale,
        dockScale: state.dockScale
      }),
    }
  )
);

/**
 * Robust Sequential Sync v88.0 - Safe Fetch Logic
 */
if (typeof window !== "undefined") {
  const turboSync = async () => {
    try {
      const priorityBins = [
        { id: JSONBIN_CHANNELS_BIN_ID, key: 'channels' },
        { id: JSONBIN_POPULAR_RECITERS_BIN_ID, key: 'reciters' },
        { id: JSONBIN_IPTV_FAVS_BIN_ID, key: 'iptv' }
      ];
      
      const backgroundBins = [
        { id: JSONBIN_MASTER_BIN_ID, key: 'master' },
        { id: JSONBIN_SAVED_VIDEOS_BIN_ID, key: 'saved' },
        { id: JSONBIN_PRAYER_TIMES_BIN_ID, key: 'prayers' },
        { id: JSONBIN_MANUSCRIPTS_BIN_ID, key: 'manuscripts' } 
      ];

      for (const b of priorityBins) {
        try {
          const r = await fetch(`https://api.jsonbin.io/v3/b/${b.id}/latest`, { 
            headers: { 'X-Master-Key': JSONBIN_MASTER_KEY },
            cache: 'no-store'
          });
          if (!r.ok) continue;
          const res = await r.json();
          const data = res.record || res || [];
          const safeArray = Array.isArray(data) ? data : [];
          if (b.key === 'channels') useMediaStore.setState({ favoriteChannels: safeArray });
          if (b.key === 'reciters') useMediaStore.setState({ favoriteReciters: safeArray });
          if (b.key === 'iptv') useMediaStore.setState({ favoriteIptvChannels: safeArray.length > 0 ? safeArray : INITIAL_IPTV_FAVORITES });
        } catch (e) { 
          console.warn(`Priority Sync Warn [${b.key}]:`, e); 
        }
      }

      for (const b of backgroundBins) {
        try {
          const r = await fetch(`https://api.jsonbin.io/v3/b/${b.id}/latest`, { 
            headers: { 'X-Master-Key': JSONBIN_MASTER_KEY },
            cache: 'no-store'
          });
          if (!r.ok) continue;
          const res = await r.json();
          const data = res.record || res || {};
          const key = b.key;

          if (key === 'master') {
            const m = data;
            const safe = { ...DEFAULT_CONTEXT_MAPPINGS };
            if (m.keyMappings) {
              Object.keys(m.keyMappings).forEach(ctx => { 
                if (typeof m.keyMappings[ctx] === 'object') {
                  safe[ctx] = { ...DEFAULT_CONTEXT_MAPPINGS[ctx], ...m.keyMappings[ctx] }; 
                }
              });
            }
            useMediaStore.setState({
              favoriteTeams: m.favoriteTeams || [],
              favoriteLeagueIds: m.favoriteLeagueIds || [307, 39, 2, 140, 135],
              belledMatchIds: m.belledMatchIds || [],
              skippedMatchIds: m.skippedMatchIds || [],
              prayerSettings: m.prayerSettings || DEFAULT_PRAYER_SETTINGS,
              reminders: m.reminders || [],
              mapSettings: { ...useMediaStore.getState().mapSettings, ...m.mapSettings },
              videoProgress: m.videoProgress || {},
              customWallBackgrounds: m.customWallBackgrounds || [],
              customManuscriptColors: m.customManuscriptColors || ['#ffffff', '#FFD700', '#C0C0C0'],
              keyMappings: safe,
              isAltModeActive: m.isAltModeActive !== undefined ? m.isAltModeActive : true,
              autoHideIsland: m.autoHideIsland !== undefined ? m.autoHideIsland : true
            });
          } else if (key === 'saved') {
            useMediaStore.setState({ savedVideos: Array.isArray(data) ? data : (data.videos || []) });
          } else if (key === 'prayers') {
            const record = data;
            if (Array.isArray(record)) {
              useMediaStore.setState({ prayerTimes: record });
            } else {
              useMediaStore.setState({ 
                prayerTimes: record.prayers || [],
                customWallBackgrounds: record.backgrounds || useMediaStore.getState().customWallBackgrounds
              });
            }
          } else if (key === 'manuscripts') {
            const list = Array.isArray(data) ? data : (data.manuscripts || []);
            useMediaStore.setState({ customManuscripts: list });
          }
        } catch (e) { 
          console.warn(`Background Sync Warn [${b.key}]:`, e); 
        }
      }
    } catch (e) { 
      console.warn("Turbo Sync Strategy Deferred:", e); 
    }
  };
  setTimeout(turboSync, 100);
}
