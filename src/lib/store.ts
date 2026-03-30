
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

interface MediaState {
  favoriteChannels: YouTubeChannel[];
  savedVideos: YouTubeVideo[];
  videoProgress: Record<string, number>;
  favoriteTeams: FavoriteTeam[];
  favoriteLeagueIds: number[];
  belledMatchIds: string[];
  skippedMatchIds: string[];
  favoriteIptvChannels: IptvChannel[];
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
  aiSuggestions: any[];
  activeVideo: YouTubeVideo | null;
  activeIptv: IptvChannel | null;
  activeQuranUrl: string | null;
  playlist: YouTubeVideo[];
  playlistIndex: number;
  isPlaying: boolean;
  isMinimized: boolean;
  isFullScreen: boolean;
  dockSide: 'left' | 'right';
  showIslands: boolean;
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
  addChannel: (channel: YouTubeChannel) => void;
  removeChannel: (channelid: string) => void;
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
      aiSuggestions: [],
      activeVideo: null,
      activeIptv: null,
      activeQuranUrl: "https://quran.com/ar/radio",
      playlist: [],
      playlistIndex: 0,
      isPlaying: false,
      isMinimized: false,
      isFullScreen: false,
      dockSide: 'left',
      showIslands: true,
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
          customManuscriptColors: state.customManuscriptColors
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
          const data = { 
            yesterday, 
            today, 
            tomorrow, 
            updatedAt: new Date().toISOString() 
          };
          await updateBin(JSONBIN_MATCHES_SCHEDULE_BIN_ID, data);
        } catch (e) {
          console.error("Sync All Matches Error:", e);
          throw e;
        }
      },

      fetchClubsFromCache: async (leagueId: string) => {
        set({ isClubsLoading: true });
        try {
          const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CLUBS_CACHE_BIN_ID}/latest?nocache=${Date.now()}`, {
            headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
          });
          if (res.ok) {
            const data = await res.json();
            const record = data.record;
            if (record && record.leagueId === leagueId && Array.isArray(record.teams)) {
              set({ clubsCache: record.teams });
            } else {
              set({ clubsCache: [] });
            }
          }
        } catch (e) {
          console.error("Fetch Clubs Cache Error:", e);
        } finally {
          set({ isClubsLoading: false });
        }
      },

      syncLeagueClubsToCloud: async (leagueId: string) => {
        const { searchFootballTeams } = await import("./football-api");
        try {
          const teams = await searchFootballTeams("", leagueId);
          if (teams && teams.length > 0) {
            const data = { 
              leagueId, 
              teams, 
              updatedAt: new Date().toISOString() 
            };
            await updateBin(JSONBIN_CLUBS_CACHE_BIN_ID, data);
            set({ clubsCache: teams });
          }
        } catch (e) {
          console.error("Sync Clubs Error:", e);
          throw e;
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
            const record = Array.isArray(data.record) ? data.record : (data.record || []);
            if (Array.isArray(record)) {
              set({ prayerTimes: record });
            }
          }
        } catch (e) {
          console.error("Failed to fetch prayer times:", e);
        }
      },

      fetchManuscripts: async () => {
        try {
          const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_MANUSCRIPTS_BIN_ID}/latest?nocache=${Date.now()}`, {
            headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
          });
          if (res.ok) {
            const data = await res.json();
            const record = data.record;
            let list = [];
            
            // Robust parsing for manuscripts
            if (Array.isArray(record)) {
              list = record;
            } else if (record && Array.isArray(record.manuscripts)) {
              list = record.manuscripts;
            } else if (record && record.record) {
              if (Array.isArray(record.record)) list = record.record;
              else if (Array.isArray(record.record.manuscripts)) list = record.record.manuscripts;
            }
            
            set({ customManuscripts: Array.isArray(list) ? list : [] });
          }
        } catch (e) {
          console.error("Failed to fetch manuscripts:", e);
        }
      },

      setFavoriteChannels: (channels) => set({ favoriteChannels: channels }),
      setFavoriteIptvChannels: (channels) => set({ favoriteIptvChannels: channels }),

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

      updateMapSettings: (settings) => set((state) => {
        const newSettings = { ...state.mapSettings, ...settings };
        setTimeout(() => get().syncMasterBin(), 100);
        return { mapSettings: newSettings };
      }),

      setAiSuggestions: (suggestions) => set({ aiSuggestions: suggestions }),
      
      setActiveVideo: (video, context) => {
        if (video) {
          const playlist = context && context.length > 0 ? context : [video];
          const idx = playlist.findIndex(v => v.id === video.id);
          // Special logic for beIN - Force Web mode if blocked channel detected
          const isBlockedChannel = video.channelTitle?.toLowerCase().includes('bein') || false;
          
          set({ 
            playlist: playlist, 
            playlistIndex: idx > -1 ? idx : 0,
            activeVideo: video, 
            activeIptv: null, 
            isPlaying: true, 
            isMinimized: false, 
            isFullScreen: true,
            playerMode: isBlockedChannel ? 'web' : 'api' 
          });
        } else {
          set({ activeVideo: null, isPlaying: false, isMinimized: false, isFullScreen: false });
        }
      },

      setActiveIptv: (channel, context) => {
        const state = get();
        if (!channel) {
          set({ activeIptv: null, isPlaying: false, isMinimized: false, isFullScreen: false });
          return;
        }
        let finalChannel = { ...channel };
        finalChannel.type = 'web';
        finalChannel.url = finalChannel.url || `http://playstop.watch:2095/live/W87d737/Pd37qj34/${finalChannel.stream_id}.m3u8`;
        
        const iptvPlaylist = context && context.length > 0 ? context : state.favoriteIptvChannels;
        const idx = iptvPlaylist.findIndex(c => c.stream_id === finalChannel.stream_id);

        set({ 
          iptvPlaylist: iptvPlaylist, 
          iptvPlaylistIndex: idx > -1 ? idx : 0,
          activeIptv: finalChannel, 
          activeVideo: null, 
          isPlaying: true, 
          isMinimized: false, 
          isFullScreen: true 
        });
      },

      setActiveQuranUrl: (url) => set({ activeQuranUrl: url }),
      setPlaylist: (videos) => {
        set({ playlist: videos, playlistIndex: 0, activeVideo: videos[0], activeIptv: null, isPlaying: true, isMinimized: false, isFullScreen: true });
      },
      nextTrack: () => {
        const state = get();
        if (state.activeIptv) { get().nextIptvChannel(); return; }
        if (state.playlist.length === 0) return;
        const nextIdx = (state.playlistIndex + 1) % state.playlist.length;
        set({ playlistIndex: nextIdx, activeVideo: state.playlist[nextIdx] });
      },
      prevTrack: () => {
        const state = get();
        if (state.activeIptv) { get().prevIptvChannel(); return; }
        if (state.playlist.length === 0) return;
        const prevIdx = (state.playlistIndex - 1 + state.playlist.length) % state.playlist.length;
        set({ playlistIndex: prevIdx, activeVideo: state.playlist[prevIdx] });
      },
      nextIptvChannel: () => {
        const state = get();
        if (state.iptvPlaylist.length === 0) return;
        const nextIdx = (state.iptvPlaylistIndex + 1) % state.iptvPlaylist.length;
        const channel = state.iptvPlaylist[nextIdx];
        set({ iptvPlaylistIndex: nextIdx, activeIptv: { ...channel, url: channel.url || `http://playstop.watch:2095/live/W87d737/Pd37qj34/${channel.stream_id}.m3u8`, type: 'web' } });
      },
      prevIptvChannel: () => {
        const state = get();
        if (state.iptvPlaylist.length === 0) return;
        const prevIdx = (state.iptvPlaylistIndex - 1 + state.iptvPlaylist.length) % state.iptvPlaylist.length;
        const channel = state.iptvPlaylist[prevIdx];
        set({ iptvPlaylistIndex: prevIdx, activeIptv: { ...channel, url: channel.url || `http://playstop.watch:2095/live/W87d737/Pd37qj34/${channel.stream_id}.m3u8`, type: 'web' } });
      },
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setIsMinimized: (minimized) => set({ isMinimized: minimized, isFullScreen: false }),
      setIsFullScreen: (fullScreen) => set({ isFullScreen: fullScreen, isMinimized: false }),
      setWallPlate: (type, data) => set({ wallPlateType: type, wallPlateData: data }),
      setPlayerMode: (mode) => set({ playerMode: mode }),
      toggleDockSide: () => set((state) => {
        const nextSide = state.dockSide === 'left' ? 'right' : 'left';
        if (typeof document !== 'undefined') {
          document.cookie = `dockSide=${nextSide}; path=/; max-age=31536000`;
        }
        return { dockSide: nextSide };
      }),
      setDockSide: (side) => {
        if (typeof document !== 'undefined') {
          document.cookie = `dockSide=${side}; path=/; max-age=31536000`;
        }
        set({ dockSide: side });
      },
      toggleShowIslands: () => set((state) => ({ showIslands: !state.showIslands })),
      
      setVideoResults: (results) => set({ videoResults: results }),
      setSelectedChannel: (channel) => set({ selectedChannel: channel }),
      setChannelVideos: (videos) => set({ channelVideos: videos }),
      resetMediaView: () => set({ 
        videoResults: [], 
        selectedChannel: null, 
        channelVideos: [] 
      }),
    }),
    {
      name: "drivecast-master-v12",
      partialize: (state) => ({ 
        videoProgress: state.videoProgress,
        dockSide: state.dockSide,
        showIslands: state.showIslands,
        playerMode: state.playerMode
      }),
    }
  )
);

if (typeof window !== "undefined") {
  const syncWithBins = async () => {
    try {
      const masterKey = JSONBIN_MASTER_KEY;
      const fetchBin = async (binId: string) => {
        try {
          const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest?nocache=${Date.now()}`, {
            headers: { 'X-Master-Key': masterKey }
          });
          if (!res.ok) return null;
          const data = await res.json();
          return data.record;
        } catch (e) { return null; }
      };

      const cookies = document.cookie.split('; ');
      const sideCookie = cookies.find(row => row.startsWith('dockSide='));
      if (sideCookie) {
        const side = sideCookie.split('=')[1] as 'left' | 'right';
        useMediaStore.setState({ dockSide: side });
      }

      const masterData = await fetchBin(JSONBIN_MASTER_BIN_ID);
      if (masterData) {
        useMediaStore.setState({
          favoriteTeams: Array.isArray(masterData.favoriteTeams) ? masterData.favoriteTeams : [],
          favoriteLeagueIds: Array.isArray(masterData.favoriteLeagueIds) ? masterData.favoriteLeagueIds : [307, 39, 2, 140, 135],
          belledMatchIds: Array.isArray(masterData.belledMatchIds) ? masterData.belledMatchIds : [],
          skippedMatchIds: Array.isArray(masterData.skippedMatchIds) ? masterData.skippedMatchIds : [],
          prayerSettings: Array.isArray(masterData.prayerSettings) ? masterData.prayerSettings : DEFAULT_PRAYER_SETTINGS,
          reminders: Array.isArray(masterData.reminders) ? masterData.reminders : [],
          mapSettings: masterData.mapSettings || useMediaStore.getState().mapSettings,
          videoProgress: masterData.videoProgress || {},
          customWallBackgrounds: Array.isArray(masterData.customWallBackgrounds) ? masterData.customWallBackgrounds : [],
          customManuscriptColors: Array.isArray(masterData.customManuscriptColors) ? masterData.customManuscriptColors : ['#ffffff', '#FFD700', '#C0C0C0']
        });
      }

      const channelsData = await fetchBin(JSONBIN_CHANNELS_BIN_ID);
      if (Array.isArray(channelsData)) {
        useMediaStore.setState({ favoriteChannels: channelsData });
      }

      const savedVideosData = await fetchBin(JSONBIN_SAVED_VIDEOS_BIN_ID);
      if (Array.isArray(savedVideosData)) {
        useMediaStore.setState({ savedVideos: savedVideosData });
      }

      const iptvData = await fetchBin(JSONBIN_IPTV_FAVS_BIN_ID);
      if (Array.isArray(iptvData)) {
        const migrated = iptvData.map((ch: any) => ({
          ...ch,
          type: 'web',
          url: ch.url || `http://playstop.watch:2095/live/W87d737/Pd37qj34/${ch.stream_id}.m3u8`
        }));
        useMediaStore.setState({ favoriteIptvChannels: migrated });
      }

      const prayerTimesDataRes = await fetchBin(JSONBIN_PRAYER_TIMES_BIN_ID);
      if (Array.isArray(prayerTimesDataRes)) {
        useMediaStore.setState({ prayerTimes: prayerTimesDataRes });
      }

      const manuscriptsData = await fetchBin(JSONBIN_MANUSCRIPTS_BIN_ID);
      if (manuscriptsData) {
        let list = [];
        const record = manuscriptsData.record || manuscriptsData;
        if (Array.isArray(record)) list = record;
        else if (record.manuscripts && Array.isArray(record.manuscripts)) list = record.manuscripts;
        else if (record.record && Array.isArray(record.record)) list = record.record;
        else if (record.record && record.record.manuscripts && Array.isArray(record.record.manuscripts)) list = record.record.manuscripts;
        
        useMediaStore.setState({ customManuscripts: Array.isArray(list) ? list : [] });
      }
    } catch (e) {
      console.error("Global Bin Sync Error:", e);
    }
  };
  
  setTimeout(syncWithBins, 1000);
}
