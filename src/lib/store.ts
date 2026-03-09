
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
  prayerTimesData
} from "./constants";

export interface Reminder {
  id: string;
  label: string;
  relativePrayer: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | 'manual';
  manualTime?: string; // HH:mm format
  offsetMinutes: number; // Minutes from prayer time
  showCountdown: boolean;
  countdownWindow: number; // Minutes before target
  showCountup: boolean;
  countupWindow: number; // Minutes after target
  completed: boolean;
  color: string;
  iconType: 'play' | 'bell' | 'circle';
}

export interface MapSettings {
  zoom: number;
  tilt: number;
  carScale: number;
  backgroundIndex: number;
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
  reminders: Reminder[];
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
  toggleSaveVideo: (video: YouTubeVideo) => void;
  removeVideo: (id: string) => void;
  toggleStarChannel: (channelid: string) => void;
  addReminder: (reminder: Reminder) => void;
  updateReminder: (id: string, reminder: Partial<Reminder>) => void;
  removeReminder: (id: string) => void;
  toggleReminder: (id: string) => void;
  toggleFavoriteTeam: (team: FavoriteTeam) => void;
  toggleBelledMatch: (matchId: string) => void;
  skipMatch: (matchId: string) => void;
  toggleFavoriteIptvChannel: (channel: IptvChannel) => void;
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
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.error(`JSONBin Sync Error [${binId}]:`, e);
  }
};

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
      reminders: [],
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
          updateBin(JSONBIN_CLUBS_BIN_ID, { teams: newTeams, matches: state.belledMatchIds, skipped: state.skippedMatchIds });
          return { favoriteTeams: newTeams };
        });
      },

      toggleBelledMatch: (matchId) => {
        set((state) => {
          const newMatches = state.belledMatchIds.includes(matchId) ? state.belledMatchIds.filter(id => id !== matchId) : [...state.belledMatchIds, matchId];
          updateBin(JSONBIN_CLUBS_BIN_ID, { teams: state.favoriteTeams, matches: newMatches, skipped: state.skippedMatchIds });
          return { belledMatchIds: newMatches };
        });
      },

      skipMatch: (matchId) => {
        set((state) => {
          const newSkipped = Array.from(new Set([...state.skippedMatchIds, matchId]));
          updateBin(JSONBIN_CLUBS_BIN_ID, { teams: state.favoriteTeams, matches: state.belledMatchIds, skipped: newSkipped });
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
        updateBin(JSONBIN_REMINDERS_BIN_ID, newList);
        return { reminders: newList };
      }),
      updateReminder: (id, update) => set((state) => {
        const newList = state.reminders.map(r => r.id === id ? { ...r, ...update } : r);
        updateBin(JSONBIN_REMINDERS_BIN_ID, newList);
        return { reminders: newList };
      }),
      removeReminder: (id) => set((state) => {
        const newList = state.reminders.filter(r => r.id !== id);
        updateBin(JSONBIN_REMINDERS_BIN_ID, newList);
        return { reminders: newList };
      }),
      toggleReminder: (id) => set((state) => {
        const newList = state.reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r);
        updateBin(JSONBIN_REMINDERS_BIN_ID, newList);
        return { reminders: newList };
      }),

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
        prayerTimes: state.prayerTimes,
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
      await state.fetchPrayerTimes();

      const chRes = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CHANNELS_BIN_ID}/latest`, { headers: { 'X-Master-Key': JSONBIN_MASTER_KEY } });
      if (chRes.ok) { const data = await chRes.json(); useMediaStore.setState({ favoriteChannels: data.record }); }

      const clRes = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CLUBS_BIN_ID}/latest`, { headers: { 'X-Master-Key': JSONBIN_MASTER_KEY } });
      if (clRes.ok) { 
        const data = await clRes.json();
        if (data.record.teams) useMediaStore.setState({ favoriteTeams: data.record.teams });
        if (data.record.matches) useMediaStore.setState({ belledMatchIds: data.record.matches });
        if (data.record.skipped) useMediaStore.setState({ skippedMatchIds: data.record.skipped });
      }

      const remRes = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_REMINDERS_BIN_ID}/latest`, { headers: { 'X-Master-Key': JSONBIN_MASTER_KEY } });
      if (remRes.ok) { 
        const data = await remRes.json();
        if (Array.isArray(data.record)) useMediaStore.setState({ reminders: data.record });
      }

      const iptvRes = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_IPTV_FAVS_BIN_ID}/latest`, { headers: { 'X-Master-Key': JSONBIN_MASTER_KEY } });
      if (iptvRes.ok) { 
        const data = await iptvRes.json(); 
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
