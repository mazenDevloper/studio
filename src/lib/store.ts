
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { YouTubeChannel, YouTubeVideo } from "./youtube";
import { 
  JSONBIN_MASTER_KEY, 
  JSONBIN_CHANNELS_BIN_ID, 
  JSONBIN_CLUBS_BIN_ID, 
  JSONBIN_SAVED_VIDEOS_BIN_ID,
  JSONBIN_PRAYER_TIMES_BIN_ID,
  JSONBIN_IPTV_FAVS_BIN_ID,
  JSONBIN_REMINDERS_BIN_ID,
  JSONBIN_MANUSCRIPTS_BIN_ID,
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
  mapSettings: MapSettings;
  aiSuggestions: any[];
  activeVideo: YouTubeVideo | null;
  activeIptv: IptvChannel | null;
  playlist: YouTubeVideo[];
  playlistIndex: number;
  isPlaying: boolean;
  isMinimized: boolean;
  isFullScreen: boolean;
  dockSide: 'left' | 'right';
  showIslands: boolean;
  addChannel: (channel: YouTubeChannel) => void;
  removeChannel: (channelid: string) => void;
  reorderFavoriteChannel: (channelid: string, direction: 'up' | 'down') => void;
  toggleSaveVideo: (video: YouTubeVideo) => void;
  removeVideo: (id: string) => void;
  toggleStarChannel: (channelid: string) => void;
  addReminder: (reminder: Reminder) => void;
  updateReminder: (id: string, reminder: Partial<Reminder>) => void;
  removeReminder: (id: string) => void;
  toggleReminder: (id: string) => void;
  addManuscript: (manuscript: Manuscript) => void;
  removeManuscript: (id: string) => void;
  updatePrayerSetting: (id: string, setting: Partial<PrayerSetting>) => void;
  toggleFavoriteTeam: (team: FavoriteTeam) => void;
  toggleFavoriteLeague: (leagueId: number) => void;
  toggleBelledMatch: (matchId: string) => void;
  skipMatch: (matchId: string) => void;
  toggleFavoriteIptvChannel: (channel: IptvChannel) => void;
  reorderFavoriteIptv: (index: number, direction: 'up' | 'down') => void;
  setIptvPlaylist: (channels: IptvChannel[], index: number) => void;
  nextIptvChannel: () => void;
  prevIptvChannel: () => void;
  updateMapSettings: (settings: Partial<MapSettings>) => void;
  setAiSuggestions: (suggestions: any[]) => void;
  setActiveVideo: (video: YouTubeVideo | null) => void;
  setActiveIptv: (channel: IptvChannel | null) => void;
  setPlaylist: (videos: YouTubeVideo[]) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  updateVideoProgress: (videoId: string, progress: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsMinimized: (minimized: boolean) => void;
  setIsFullScreen: (fullScreen: boolean) => void;
  toggleDockSide: () => void;
  toggleShowIslands: () => void;
  fetchPrayerTimes: () => Promise<void>;
}

const updateBin = async (binId: string, data: any) => {
  try {
    await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_MASTER_KEY
      },
      body: JSON.stringify({ record: data })
    });
  } catch (e) {
    console.error(`JSONBin Sync Error [${binId}]:`, e);
  }
};

const DEFAULT_PRAYER_SETTINGS: PrayerSetting[] = [
  { id: 'fajr', name: 'الفجر', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 25, iqamahDuration: 25 },
  { id: 'sunrise', name: 'الشروق', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 5, iqamahDuration: 0 },
  { id: 'duha', name: 'الضحى', offsetMinutes: 15, showCountdown: true, countdownWindow: 15, showCountup: false, countupWindow: 0, iqamahDuration: 0 },
  { id: 'dhuhr', name: 'الظهر', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 20, iqamahDuration: 20 },
  { id: 'asr', name: 'العصر', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 20, iqamahDuration: 20 },
  { id: 'maghrib', name: 'المغرب', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 10, iqamahDuration: 10 },
  { id: 'isha', name: 'العشاء', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 20, iqamahDuration: 20 },
];

const DEFAULT_MANUSCRIPTS: Manuscript[] = [
  { id: '1', type: 'text', content: 'سبحان الله وبحمده' },
  { id: '2', type: 'text', content: 'سبحان الله العظيم' },
  { id: '3', type: 'text', content: 'أستغفر الله وأتوب إليه' },
  { id: '4', type: 'text', content: 'لا حول ولا قوة إلا بالله' },
  { id: '5', type: 'text', content: 'اللهم صلِ وسلم على نبينا محمد' }
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
      customManuscripts: DEFAULT_MANUSCRIPTS,
      mapSettings: { zoom: 20.0, tilt: 65, carScale: 1.02, backgroundIndex: 0 },
      aiSuggestions: [],
      activeVideo: null,
      activeIptv: null,
      playlist: [],
      playlistIndex: 0,
      isPlaying: false,
      isMinimized: false,
      isFullScreen: false,
      dockSide: 'left',
      showIslands: true,

      fetchPrayerTimes: async () => {
        try {
          const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_PRAYER_TIMES_BIN_ID}/latest`, {
            headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.record)) {
              set({ prayerTimes: data.record });
            }
          }
        } catch (e) {
          console.error("Failed to fetch prayer times from JSONBin:", e);
        }
      },

      addChannel: (channel) => {
        set((state) => {
          const newList = [...state.favoriteChannels.filter(c => c.channelid !== channel.channelid), { ...channel, starred: false }];
          updateBin(JSONBIN_CHANNELS_BIN_ID, newList);
          return { favoriteChannels: newList };
        });
      },

      removeChannel: (channelid) => {
        set((state) => {
          const newList = state.favoriteChannels.filter(c => c.channelid !== channelid);
          updateBin(JSONBIN_CHANNELS_BIN_ID, newList);
          return { favoriteChannels: newList };
        });
      },

      reorderFavoriteChannel: (channelid, direction) => {
        set((state) => {
          const idx = state.favoriteChannels.findIndex(c => c.channelid === channelid);
          if (idx === -1) return {};
          const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= state.favoriteChannels.length) return {};
          const newList = [...state.favoriteChannels];
          [newList[idx], newList[targetIdx]] = [newList[targetIdx], newList[idx]];
          updateBin(JSONBIN_CHANNELS_BIN_ID, newList);
          return { favoriteChannels: newList };
        });
      },

      toggleSaveVideo: (video) => {
        set((state) => {
          const exists = state.savedVideos.some(v => v.id === video.id);
          const newList = exists ? state.savedVideos.filter(v => v.id !== video.id) : [{ ...video, progress: 0 }, ...state.savedVideos];
          updateBin(JSONBIN_SAVED_VIDEOS_BIN_ID, newList);
          return { savedVideos: newList };
        });
      },

      removeVideo: (id) => {
        set((state) => {
          const newList = state.savedVideos.filter(v => v.id !== id);
          updateBin(JSONBIN_SAVED_VIDEOS_BIN_ID, newList);
          return { savedVideos: newList };
        });
      },

      updateVideoProgress: (videoId, progress) => {
        set((state) => {
          const isSaved = state.savedVideos.some(v => v.id === videoId);
          let updatedSaved = state.savedVideos;
          if (isSaved) {
            updatedSaved = state.savedVideos.map(v => v.id === videoId ? { ...v, progress } : v);
            updateBin(JSONBIN_SAVED_VIDEOS_BIN_ID, updatedSaved);
          }
          return { savedVideos: updatedSaved, videoProgress: { ...state.videoProgress, [videoId]: progress } };
        });
      },

      toggleStarChannel: (channelid) => {
        set((state) => {
          const newList = state.favoriteChannels.map(c => c.channelid === channelid ? { ...c, starred: !c.starred } : c);
          updateBin(JSONBIN_CHANNELS_BIN_ID, newList);
          return { favoriteChannels: newList };
        });
      },

      toggleFavoriteTeam: (team) => {
        set((state) => {
          const exists = state.favoriteTeams.some(t => t.id === team.id);
          const newTeams = exists ? state.favoriteTeams.filter(t => t.id !== team.id) : [...state.favoriteTeams, team];
          updateBin(JSONBIN_CLUBS_BIN_ID, { teams: newTeams, leagues: state.favoriteLeagueIds, matches: state.belledMatchIds, skipped: state.skippedMatchIds });
          return { favoriteTeams: newTeams };
        });
      },

      toggleFavoriteLeague: (leagueId) => {
        set((state) => {
          const newLeagues = state.favoriteLeagueIds.includes(leagueId) ? state.favoriteLeagueIds.filter(id => id !== leagueId) : [...state.favoriteLeagueIds, leagueId];
          updateBin(JSONBIN_CLUBS_BIN_ID, { teams: state.favoriteTeams, leagues: newLeagues, matches: state.belledMatchIds, skipped: state.skippedMatchIds });
          return { favoriteLeagueIds: newLeagues };
        });
      },

      toggleBelledMatch: (matchId) => {
        set((state) => {
          const newMatches = state.belledMatchIds.includes(matchId) ? state.belledMatchIds.filter(id => id !== matchId) : [...state.belledMatchIds, matchId];
          updateBin(JSONBIN_CLUBS_BIN_ID, { teams: state.favoriteTeams, leagues: state.favoriteLeagueIds, matches: newMatches, skipped: state.skippedMatchIds });
          return { belledMatchIds: newMatches };
        });
      },

      skipMatch: (matchId) => {
        set((state) => {
          const newSkipped = Array.from(new Set([...state.skippedMatchIds, matchId]));
          updateBin(JSONBIN_CLUBS_BIN_ID, { teams: state.favoriteTeams, leagues: state.favoriteLeagueIds, matches: state.belledMatchIds, skipped: newSkipped });
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
          updateBin(JSONBIN_IPTV_FAVS_BIN_ID, newList);
          return { favoriteIptvChannels: newList };
        });
      },

      reorderFavoriteIptv: (index, direction) => {
        set((state) => {
          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= state.favoriteIptvChannels.length) return {};
          const newList = [...state.favoriteIptvChannels];
          [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
          updateBin(JSONBIN_IPTV_FAVS_BIN_ID, newList);
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

      setIptvPlaylist: (channels, index) => set({ iptvPlaylist: channels, iptvPlaylistIndex: index }),
      nextIptvChannel: () => {
        const state = get();
        if (state.iptvPlaylist.length === 0) return;
        const nextIdx = (state.iptvPlaylistIndex + 1) % state.iptvPlaylist.length;
        state.setActiveIptv(state.iptvPlaylist[nextIdx]);
      },
      prevIptvChannel: () => {
        const state = get();
        if (state.iptvPlaylist.length === 0) return;
        const prevIdx = (state.iptvPlaylistIndex - 1 + state.iptvPlaylist.length) % state.iptvPlaylist.length;
        state.setActiveIptv(state.iptvPlaylist[prevIdx]);
      },

      updateMapSettings: (settings) => set((state) => ({ mapSettings: { ...state.mapSettings, ...settings } })),
      
      addReminder: (reminder) => set((state) => {
        const newList = [...state.reminders, reminder];
        updateBin(JSONBIN_REMINDERS_BIN_ID, { reminders: newList });
        return { reminders: newList };
      }),
      updateReminder: (id, update) => set((state) => {
        const newList = state.reminders.map(r => r.id === id ? { ...r, ...update } : r);
        updateBin(JSONBIN_REMINDERS_BIN_ID, { reminders: newList });
        return { reminders: newList };
      }),
      removeReminder: (id) => set((state) => {
        const newList = state.reminders.filter(r => r.id !== id);
        updateBin(JSONBIN_REMINDERS_BIN_ID, { reminders: newList });
        return { reminders: newList };
      }),
      toggleReminder: (id) => set((state) => {
        const newList = state.reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r);
        updateBin(JSONBIN_REMINDERS_BIN_ID, { reminders: newList });
        return { reminders: newList };
      }),

      updatePrayerSetting: (id, update) => set((state) => ({
        prayerSettings: state.prayerSettings.map(s => s.id === id ? { ...s, ...update } : s)
      })),

      setAiSuggestions: (suggestions) => set({ aiSuggestions: suggestions }),
      setActiveVideo: (video) => set({ activeVideo: video, activeIptv: null, isPlaying: !!video, isMinimized: false, isFullScreen: !!video }),
      setActiveIptv: (channel) => {
        const state = get();
        if (!channel) {
          set({ activeIptv: null, isPlaying: false, isMinimized: false, isFullScreen: false });
          return;
        }
        let finalChannel = { ...channel };
        finalChannel.type = 'web';
        finalChannel.url = finalChannel.url || `http://playstop.watch:2095/live/W87d737/Pd37qj34/${finalChannel.stream_id}.m3u8`;
        
        if (state.favoriteIptvChannels.some(c => c.stream_id === finalChannel.stream_id)) {
          const idx = state.favoriteIptvChannels.findIndex(c => c.stream_id === finalChannel.stream_id);
          set({ iptvPlaylist: state.favoriteIptvChannels, iptvPlaylistIndex: idx });
        }
        set({ activeIptv: finalChannel, activeVideo: null, isPlaying: true, isMinimized: false, isFullScreen: true });
      },
      setPlaylist: (videos) => {
        const shuffled = [...videos].sort(() => Math.random() - 0.5);
        set({ playlist: shuffled, playlistIndex: 0, activeVideo: shuffled[0], activeIptv: null, isPlaying: true, isMinimized: false, isFullScreen: true });
      },
      nextTrack: () => {
        const state = get();
        if (state.playlist.length === 0) return;
        const nextIdx = (state.playlistIndex + 1) % state.playlist.length;
        set({ playlistIndex: nextIdx, activeVideo: state.playlist[nextIdx] });
      },
      prevTrack: () => {
        const state = get();
        if (state.playlist.length === 0) return;
        const prevIdx = (state.playlistIndex - 1 + state.playlist.length) % state.playlist.length;
        set({ playlistIndex: prevIdx, activeVideo: state.playlist[prevIdx] });
      },
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setIsMinimized: (minimized) => set({ isMinimized: minimized, isFullScreen: false }),
      setIsFullScreen: (fullScreen) => set({ isFullScreen: fullScreen, isMinimized: false }),
      toggleDockSide: () => set((state) => ({ dockSide: state.dockSide === 'left' ? 'right' : 'left' })),
      toggleShowIslands: () => set((state) => ({ showIslands: !state.showIslands })),
    }),
    {
      name: "drivecast-jsonbin-v3",
      partialize: (state) => ({ 
        favoriteChannels: state.favoriteChannels,
        savedVideos: state.savedVideos,
        favoriteTeams: state.favoriteTeams,
        favoriteLeagueIds: state.favoriteLeagueIds,
        belledMatchIds: state.belledMatchIds,
        skippedMatchIds: state.skippedMatchIds,
        favoriteIptvChannels: state.favoriteIptvChannels,
        mapSettings: state.mapSettings,
        reminders: state.reminders,
        customManuscripts: state.customManuscripts,
        prayerTimes: state.prayerTimes,
        prayerSettings: state.prayerSettings,
        dockSide: state.dockSide,
        showIslands: state.showIslands
      }),
    }
  )
);

if (typeof window !== "undefined") {
  const syncWithBins = async () => {
    try {
      const state = useMediaStore.getState();
      const nocache = `?nocache=${Date.now()}`;
      await state.fetchPrayerTimes();

      const chRes = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CHANNELS_BIN_ID}/latest${nocache}`, { headers: { 'X-Master-Key': JSONBIN_MASTER_KEY } });
      if (chRes.ok) { const data = await chRes.ok ? await chRes.json() : { record: [] }; useMediaStore.setState({ favoriteChannels: data.record }); }

      const clRes = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CLUBS_BIN_ID}/latest${nocache}`, { headers: { 'X-Master-Key': JSONBIN_MASTER_KEY } });
      if (clRes.ok) { 
        const data = await clRes.json();
        if (data.record.teams) useMediaStore.setState({ favoriteTeams: data.record.teams });
        if (data.record.leagues) useMediaStore.setState({ favoriteLeagueIds: data.record.leagues });
        if (data.record.matches) useMediaStore.setState({ belledMatchIds: data.record.matches });
        if (data.record.skipped) useMediaStore.setState({ skippedMatchIds: data.record.skipped });
      }

      const remRes = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_REMINDERS_BIN_ID}/latest${nocache}`, { headers: { 'X-Master-Key': JSONBIN_MASTER_KEY } });
      if (remRes.ok) { 
        const data = await remRes.json();
        if (data.record && Array.isArray(data.record.reminders)) {
          useMediaStore.setState({ reminders: data.record.reminders });
        }
      }

      const msRes = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_MANUSCRIPTS_BIN_ID}/latest${nocache}`, { headers: { 'X-Master-Key': JSONBIN_MASTER_KEY } });
      if (msRes.ok) { 
        const data = await msRes.json(); 
        if (Array.isArray(data.record)) useMediaStore.setState({ customManuscripts: data.record }); 
      }

      const savedRes = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_SAVED_VIDEOS_BIN_ID}/latest${nocache}`, { headers: { 'X-Master-Key': JSONBIN_MASTER_KEY } });
      if (savedRes.ok) { 
        const data = await savedRes.json(); 
        if (data.record && Array.isArray(data.record)) useMediaStore.setState({ savedVideos: data.record }); 
      }

      const iptvRes = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_IPTV_FAVS_BIN_ID}/latest${nocache}`, { headers: { 'X-Master-Key': JSONBIN_MASTER_KEY } });
      if (iptvRes.ok) { 
        const data = await iptvRes.ok ? await iptvRes.json() : { record: [] }; 
        const migrated = (data.record || []).map((ch: any) => ({
          ...ch,
          type: 'web',
          url: ch.url || `http://playstop.watch:2095/live/W87d737/Pd37qj34/${ch.stream_id}.m3u8`
        }));
        useMediaStore.setState({ favoriteIptvChannels: migrated }); 
      }
    } catch (e) { console.error("Bin Sync Error:", e); }
  };
  syncWithBins();
}
