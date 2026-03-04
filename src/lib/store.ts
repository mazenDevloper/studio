
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
  prayerTimesData
} from "./constants";

export interface Reminder {
  id: string;
  label: string;
  iconType: 'play' | 'bell' | 'circle';
  completed: boolean;
  color: string;
  startHour: number;
  endHour: number;
}

export interface MapSettings {
  zoom: number;
  tilt: number;
  carScale: number;
  backgroundIndex: number;
}

export interface FavoriteTeam {
  id: number;
  name: string;
  logo: string;
}

export interface IptvChannel {
  name: string;
  stream_id: string;
  stream_icon: string;
  category_id: string;
  starred?: boolean;
}

interface MediaState {
  favoriteChannels: YouTubeChannel[];
  savedVideos: YouTubeVideo[];
  starredChannelIds: string[];
  videoProgress: Record<string, number>;
  favoriteTeams: FavoriteTeam[];
  favoriteLeagueIds: number[];
  belledMatchIds: string[];
  favoriteIptvChannels: IptvChannel[];
  iptvFormat: 'ts' | 'm3u8';
  prayerTimes: any[];
  reminders: Reminder[];
  mapSettings: MapSettings;
  aiSuggestions: any[];
  activeVideo: YouTubeVideo | null;
  activeIptv: IptvChannel | null;
  isPlaying: boolean;
  isMinimized: boolean;
  isFullScreen: boolean;
  dockSide: 'left' | 'right';
  addChannel: (channel: YouTubeChannel) => void;
  removeChannel: (channelid: string) => void;
  incrementChannelClick: (channelid: string) => void;
  toggleSaveVideo: (video: YouTubeVideo) => void;
  removeVideo: (id: string) => void;
  toggleStarChannel: (channelid: string) => void;
  addReminder: (reminder: Reminder) => void;
  removeReminder: (id: string) => void;
  toggleReminder: (id: string) => void;
  toggleFavoriteTeam: (team: FavoriteTeam) => void;
  toggleFavoriteLeagueId: (leagueId: number) => void;
  toggleBelledMatch: (matchId: string) => void;
  toggleFavoriteIptvChannel: (channel: IptvChannel) => void;
  setIptvFormat: (format: 'ts' | 'm3u8') => void;
  updateMapSettings: (settings: Partial<MapSettings>) => void;
  setAiSuggestions: (suggestions: any[]) => void;
  setActiveVideo: (video: YouTubeVideo | null) => void;
  setActiveIptv: (channel: IptvChannel | null) => void;
  updateVideoProgress: (videoId: string, progress: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsMinimized: (minimized: boolean) => void;
  setIsFullScreen: (fullScreen: boolean) => void;
  setDockSide: (side: 'left' | 'right') => void;
  toggleDockSide: () => void;
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
      starredChannelIds: [],
      videoProgress: {},
      favoriteTeams: [],
      favoriteLeagueIds: [307, 39, 2, 140, 135],
      belledMatchIds: [],
      favoriteIptvChannels: [],
      iptvFormat: 'ts',
      prayerTimes: prayerTimesData,
      reminders: [],
      mapSettings: { zoom: 19.5, tilt: 65, carScale: 1.05, backgroundIndex: 0 },
      aiSuggestions: [],
      activeVideo: null,
      activeIptv: null,
      isPlaying: false,
      isMinimized: false,
      isFullScreen: false,
      dockSide: 'left',

      addChannel: (channel) => {
        set((state) => {
          const newChannel = { ...channel, clickschannel: 0, starred: false };
          const newList = [...state.favoriteChannels.filter(c => c.channelid !== channel.channelid), newChannel];
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

      incrementChannelClick: (channelid) => {
        set((state) => {
          const newList = state.favoriteChannels.map(c => 
            c.channelid === channelid ? { ...c, clickschannel: (c.clickschannel || 0) + 1 } : c
          );
          updateBin(JSONBIN_CHANNELS_BIN_ID, newList);
          return { favoriteChannels: newList };
        });
      },

      toggleSaveVideo: (video) => {
        set((state) => {
          const exists = state.savedVideos.some(v => v.id === video.id);
          let newList: YouTubeVideo[];
          if (exists) {
            newList = state.savedVideos.filter(v => v.id !== video.id);
          } else {
            const videoToSave: YouTubeVideo = {
              id: video.id,
              title: video.title,
              description: video.description || "",
              thumbnail: video.thumbnail,
              publishedAt: video.publishedAt || new Date().toISOString(),
              channelTitle: video.channelTitle || "Unknown Channel",
              channelId: video.channelId || "",
              duration: video.duration || "0:00",
              progress: 0
            };
            newList = [videoToSave, ...state.savedVideos];
          }
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
        const state = get();
        const lastProgress = state.videoProgress[videoId] || 0;
        if (Math.abs(lastProgress - progress) < 5 && progress !== 0) return;

        set((state) => {
          const isSaved = state.savedVideos.some(v => v.id === videoId);
          let updatedSaved = state.savedVideos;
          
          if (isSaved) {
            updatedSaved = state.savedVideos.map(v => 
              v.id === videoId ? { ...v, progress } : v
            );
            updateBin(JSONBIN_SAVED_VIDEOS_BIN_ID, updatedSaved);
          }
          
          return { 
            savedVideos: updatedSaved, 
            videoProgress: { ...state.videoProgress, [videoId]: progress } 
          };
        });
      },

      toggleStarChannel: (channelid) => {
        set((state) => {
          const newList = state.favoriteChannels.map(c => 
            c.channelid === channelid ? { ...c, starred: !c.starred } : c
          );
          updateBin(JSONBIN_CHANNELS_BIN_ID, newList);
          return { favoriteChannels: newList };
        });
      },

      toggleFavoriteTeam: (team) => {
        set((state) => {
          const exists = state.favoriteTeams.some(t => t.id === team.id);
          const newTeams = exists 
            ? state.favoriteTeams.filter(t => t.id !== team.id) 
            : [...state.favoriteTeams, team];
          
          updateBin(JSONBIN_CLUBS_BIN_ID, { teams: newTeams, matches: state.belledMatchIds });
          return { favoriteTeams: newTeams };
        });
      },

      toggleFavoriteLeagueId: (leagueId) => {
        set((state) => ({ favoriteLeagueIds: state.favoriteLeagueIds.includes(leagueId) 
          ? state.favoriteLeagueIds.filter(id => id !== leagueId) 
          : [...state.favoriteLeagueIds, leagueId] 
        }));
      },

      toggleBelledMatch: (matchId) => {
        set((state) => {
          const newMatches = state.belledMatchIds.includes(matchId)
            ? state.belledMatchIds.filter(id => id !== matchId)
            : [...state.belledMatchIds, matchId];
          
          updateBin(JSONBIN_CLUBS_BIN_ID, { teams: state.favoriteTeams, matches: newMatches });
          return { belledMatchIds: newMatches };
        });
      },

      toggleFavoriteIptvChannel: (channel) => {
        set((state) => {
          const exists = state.favoriteIptvChannels.some(c => c.stream_id === channel.stream_id);
          let newList;
          if (exists) {
            newList = state.favoriteIptvChannels.filter(c => c.stream_id !== channel.stream_id);
          } else {
            newList = [...state.favoriteIptvChannels, { ...channel, starred: true }];
          }
          updateBin(JSONBIN_IPTV_FAVS_BIN_ID, newList);
          return { favoriteIptvChannels: newList };
        });
      },

      setIptvFormat: (format) => set({ iptvFormat: format }),

      updateMapSettings: (settings) => {
        set((state) => ({ mapSettings: { ...state.mapSettings, ...settings } }));
      },

      addReminder: (reminder) => {
        set((state) => ({ reminders: [...state.reminders, reminder] }));
      },

      removeReminder: (id) => {
        set((state) => ({ reminders: state.reminders.filter(r => r.id !== id) }));
      },

      toggleReminder: (id) => {
        set((state) => ({
          reminders: state.reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r)
        }));
      },

      setAiSuggestions: (suggestions) => set({ aiSuggestions: suggestions }),

      setActiveVideo: (video) => {
        set({ 
          activeVideo: video,
          activeIptv: null, 
          isPlaying: !!video, 
          isMinimized: false, 
          isFullScreen: !!video 
        });
      },
      setActiveIptv: (channel) => {
        set({
          activeIptv: channel,
          activeVideo: null,
          isPlaying: !!channel,
          isMinimized: false, 
          isFullScreen: !!channel
        });
      },
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setIsMinimized: (minimized) => set({ isMinimized: minimized, isFullScreen: false }),
      setIsFullScreen: (fullScreen) => set({ isFullScreen: fullScreen, isMinimized: false }),
      setDockSide: (side) => set({ dockSide: side }),
      toggleDockSide: () => set((state) => ({ dockSide: state.dockSide === 'left' ? 'right' : 'left' })),
    }),
    {
      name: "drivecast-jsonbin-v3",
      partialize: (state) => ({ 
        favoriteChannels: state.favoriteChannels,
        savedVideos: state.savedVideos,
        favoriteTeams: state.favoriteTeams,
        favoriteLeagueIds: state.favoriteLeagueIds,
        belledMatchIds: state.belledMatchIds,
        favoriteIptvChannels: state.favoriteIptvChannels,
        iptvFormat: state.iptvFormat,
        mapSettings: state.mapSettings,
        reminders: state.reminders,
        prayerTimes: state.prayerTimes,
        videoProgress: state.videoProgress,
        activeVideo: state.activeVideo,
        activeIptv: state.activeIptv,
        isMinimized: state.isMinimized,
        isFullScreen: state.isFullScreen,
        dockSide: state.dockSide
      }),
    }
  )
);

if (typeof window !== "undefined") {
  const syncWithBins = async () => {
    try {
      // Sync Channels
      const chRes = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CHANNELS_BIN_ID}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
      });
      if (chRes.ok) {
        const data = await chRes.json();
        if (Array.isArray(data.record)) {
          useMediaStore.setState({ favoriteChannels: data.record });
        }
      }

      // Sync Clubs & Belled Matches
      const clRes = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CLUBS_BIN_ID}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
      });
      if (clRes.ok) {
        const data = await clRes.json();
        if (data.record && typeof data.record === 'object') {
          if (data.record.teams) useMediaStore.setState({ favoriteTeams: data.record.teams });
          if (data.record.matches) useMediaStore.setState({ belledMatchIds: data.record.matches });
        } else if (Array.isArray(data.record)) {
          useMediaStore.setState({ favoriteTeams: data.record });
        }
      }

      // Sync Saved Videos
      const svRes = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_SAVED_VIDEOS_BIN_ID}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
      });
      if (svRes.ok) {
        const data = await svRes.json();
        if (Array.isArray(data.record)) {
          useMediaStore.setState({ savedVideos: data.record });
        }
      }

      // Sync IPTV Favorites
      const iptvRes = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_IPTV_FAVS_BIN_ID}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
      });
      if (iptvRes.ok) {
        const data = await iptvRes.json();
        if (data.record && Array.isArray(data.record)) {
          useMediaStore.setState({ favoriteIptvChannels: data.record });
        }
      }
    } catch (e) {
      console.error("Bin Sync Error:", e);
    }
  };
  syncWithBins();
}
