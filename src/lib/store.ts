
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
  JSONBIN_MATCHES_SCHEDULE_BIN_ID,
  JSONBIN_CLUBS_CACHE_BIN_ID,
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
  displayScale: number;
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

// Context-aware Action Types
export type MappingContext = 'global' | 'player' | 'dashboard' | 'media' | 'quran' | 'football' | 'iptv' | 'settings';

export type AppAction = 
  | 'nav_up' | 'nav_down' | 'nav_left' | 'nav_right' | 'nav_ok' | 'nav_back'
  | 'toggle_star' | 'delete_item'
  | 'goto_home' | 'goto_media' | 'goto_quran' | 'goto_hihi2' | 'goto_iptv' | 'goto_football' | 'goto_settings'
  | 'player_next' | 'player_prev' | 'player_save' | 'player_fullscreen' | 'player_playlist' | 'player_minimize' | 'player_close'
  | 'focus_search' | 'focus_reciters' | 'focus_surahs'
  | 'goto_tab_appearance' | 'goto_tab_prayers' | 'goto_tab_reminders' | 'goto_tab_buttonmap';

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
  gridMode: 'hidden' | 'partial' | 'full';
  dockSide: 'left' | 'right';
  showIslands: boolean;
  isSidebarShrinked: boolean;
  wallPlateType: 'moon' | 'manuscript' | null;
  wallPlateData: any | null;
  playerMode: 'api' | 'web';
  
  videoResults: YouTubeVideo[];
  selectedChannel: YouTubeChannel | null;
  channelVideos: YouTubeVideo[];
  
  clubsCache: any[];
  isClubsLoading: boolean;
  
  setFavoriteChannels: (channels: YouTubeChannel[]) => void;
  setFavoriteIptvChannels: (channels: IptvChannel[]) => void;
  setFavoriteReciters: (reciters: YouTubeChannel[]) => void;
  addChannel: (channel: YouTubeChannel) => void;
  removeChannel: (channelid: string) => void;
  addReciter: (channel: YouTubeChannel) => void;
  removeReciter: (channelid: string) => void;
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
  setIptvPlaylist: (channels: IptvChannel[], index: number) => void;
  nextIptvChannel: () => void;
  prevIptvChannel: () => void;
  updateMapSettings: (settings: Partial<MapSettings>) => void;
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
  setGridMode: (mode: 'hidden' | 'partial' | 'full') => void;
  setIsSidebarShrinked: (shrinked: boolean) => void;
  setWallPlate: (type: 'moon' | 'manuscript' | null, data?: any) => void;
  toggleDockSide: () => void;
  setDockSide: (side: 'left' | 'right') => void;
  toggleShowIslands: () => void;
  setPlayerMode: (mode: 'api' | 'web') => void;
  
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
  nav_back: ['Backspace', '0', 'Escape', 'Back'],
  goto_home: ['h', '1'], 
  goto_media: ['m', '3'], 
  goto_quran: ['q', '7'], 
  goto_hihi2: ['f', '9'], 
  goto_iptv: ['i', 'Red'], 
  goto_football: ['t', 'Green'], 
  goto_settings: ['p', 'Yellow'],
};

const DEFAULT_PLAYER_MAPPINGS: Record<string, string[]> = {
  player_next: ['n', 'ChannelUp', 'PageUp'],
  player_prev: ['b', 'ChannelDown', 'PageDown'],
  player_save: ['v', 'Blue'],
  player_fullscreen: ['z'],
  player_close: ['x'],
  player_playlist: ['l'],
  player_minimize: ['m']
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
    goto_tab_buttonmap: ['4']
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
      customWallBackgrounds: [],
      customManuscriptColors: ['#ffffff', '#FFD700', '#C0C0C0'],
      mapSettings: { 
        zoom: 20.0, 
        tilt: 65, 
        carScale: 1.02, 
        backgroundIndex: 0,
        showManuscriptBg: true,
        manuscriptBgUrl: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=2000",
        displayScale: 1.0,
        fontScale: 1.0
      },
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
      gridMode: 'hidden',
      dockSide: 'left',
      showIslands: true,
      isSidebarShrinked: false,
      wallPlateType: null,
      wallPlateData: null,
      playerMode: 'api',
      
      videoResults: [],
      selectedChannel: null,
      channelVideos: [],
      
      clubsCache: [],
      isClubsLoading: false,

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
          favoriteReciters: state.favoriteReciters
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
          const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CLUBS_CACHE_BIN_ID}/latest?nocache=${Date.now()}`, {
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
          const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_PRAYER_TIMES_BIN_ID}/latest?nocache=${Date.now()}`, {
            headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.record)) set({ prayerTimes: data.record });
          }
        } catch (e) { console.error(e); }
      },

      fetchManuscripts: async () => {
        try {
          const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_MANUSCRIPTS_BIN_ID}/latest?nocache=${Date.now()}`, {
            headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
          });
          if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data.record) ? data.record : (data.record?.manuscripts || []);
            set({ customManuscripts: list });
          }
        } catch (e) { console.error(e); }
      },

      setFavoriteChannels: (channels) => set({ favoriteChannels: channels }),
      setFavoriteIptvChannels: (channels) => set({ favoriteIptvChannels: channels }),
      setFavoriteReciters: (reciters) => set({ favoriteReciters: reciters }),

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

      addReciter: (reciter) => {
        set((state) => {
          const newList = [...state.favoriteReciters.filter(r => r.channelid !== reciter.channelid), reciter];
          setTimeout(() => get().syncMasterBin(), 100);
          return { favoriteReciters: newList };
        });
      },

      removeReciter: (channelid) => {
        set((state) => {
          const newList = state.favoriteReciters.filter(r => r.channelid !== channelid);
          setTimeout(() => get().syncMasterBin(), 100);
          return { favoriteReciters: newList };
        });
      },

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
        const newList = state.customManuscriptColors.filter(c => c !== color);
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

      setKeyMapping: (context, action, key) => set((state) => {
        const currentMappings = { ...state.keyMappings };
        if (!currentMappings[context]) currentMappings[context] = {};
        
        const currentKeys = Array.isArray(currentMappings[context][action]) ? currentMappings[context][action] : [];
        if (currentKeys.includes(key)) return state;
        
        currentMappings[context][action] = [...currentKeys, key].slice(-2);
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
        set({ iptvPlaylistIndex: nextIdx, activeIptv: { ...channel, url: channel.url || `http://playstop.watch:2095/live/W87d737/Pd37qj34/${channel.stream_id}.m3u8`, type: 'web' } });
      },
      prevIptvChannel: () => {
        const state = get();
        if (!state.iptvPlaylist.length) return;
        const prevIdx = (state.iptvPlaylistIndex - 1 + state.iptvPlaylist.length) % state.iptvPlaylist.length;
        const channel = state.iptvPlaylist[prevIdx];
        set({ iptvPlaylistIndex: prevIdx, activeIptv: { ...channel, url: channel.url || `http://playstop.watch:2095/live/W87d737/Pd37qj34/${channel.stream_id}.m3u8`, type: 'web' } });
      },
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setIsMinimized: (minimized) => set({ isMinimized: minimized, isFullScreen: false }),
      setIsFullScreen: (fullScreen) => set({ isFullScreen: fullScreen, isMinimized: false }),
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
      setVideoResults: (results) => set({ videoResults: results }),
      setSelectedChannel: (channel) => set({ selectedChannel: channel }),
      setChannelVideos: (videos) => set({ channelVideos: videos }),
      resetMediaView: () => set({ videoResults: [], selectedChannel: null, channelVideos: [] }),
    }),
    {
      name: "drivecast-master-v20",
      partialize: (state) => ({ videoProgress: state.videoProgress, dockSide: state.dockSide, showIslands: state.showIslands, playerMode: state.playerMode }),
    }
  )
);

if (typeof window !== "undefined") {
  const syncWithBins = async () => {
    try {
      const fetchBin = async (binId: string) => {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest?nocache=${Date.now()}`, { headers: { 'X-Master-Key': JSONBIN_MASTER_KEY } });
        return res.ok ? (await res.json()).record : null;
      };
      const masterData = await fetchBin(JSONBIN_MASTER_BIN_ID);
      if (masterData) {
        const incoming = masterData.keyMappings || {};
        const safe = { ...DEFAULT_CONTEXT_MAPPINGS };
        Object.keys(incoming).forEach(ctx => {
          if (typeof incoming[ctx] === 'object') {
            safe[ctx] = { ...safe[ctx], ...incoming[ctx] };
          }
        });
        useMediaStore.setState({
          favoriteTeams: masterData.favoriteTeams || [],
          favoriteLeagueIds: masterData.favoriteLeagueIds || [307, 39, 2, 140, 135],
          belledMatchIds: masterData.belledMatchIds || [],
          skippedMatchIds: masterData.skippedMatchIds || [],
          prayerSettings: masterData.prayerSettings || DEFAULT_PRAYER_SETTINGS,
          reminders: masterData.reminders || [],
          mapSettings: masterData.mapSettings || useMediaStore.getState().mapSettings,
          videoProgress: masterData.videoProgress || {},
          customWallBackgrounds: masterData.customWallBackgrounds || [],
          customManuscriptColors: masterData.customManuscriptColors || ['#ffffff', '#FFD700', '#C0C0C0'],
          keyMappings: safe,
          favoriteReciters: masterData.favoriteReciters || []
        });
      }
      const [channels, saved, iptv, prayerRes, manuscripts] = await Promise.all([
        fetchBin(JSONBIN_CHANNELS_BIN_ID), fetchBin(JSONBIN_SAVED_VIDEOS_BIN_ID), fetchBin(JSONBIN_IPTV_FAVS_BIN_ID), fetchBin(JSONBIN_PRAYER_TIMES_BIN_ID), fetchBin(JSONBIN_MANUSCRIPTS_BIN_ID)
      ]);
      if (Array.isArray(channels)) useMediaStore.setState({ favoriteChannels: channels });
      if (Array.isArray(saved)) useMediaStore.setState({ savedVideos: saved });
      if (Array.isArray(iptv)) useMediaStore.setState({ favoriteIptvChannels: iptv.map((ch: any) => ({ ...ch, type: 'web', url: ch.url || `http://playstop.watch:2095/live/W87d737/Pd37qj34/${ch.stream_id}.m3u8` })) });
      if (Array.isArray(prayerRes)) useMediaStore.setState({ prayerTimes: prayerRes });
      if (manuscripts) useMediaStore.setState({ customManuscripts: Array.isArray(manuscripts) ? manuscripts : (manuscripts.manuscripts || []) });
    } catch (e) { console.error(e); }
  };
  setTimeout(syncWithBins, 1000);
}
