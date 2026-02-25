
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { YouTubeChannel, YouTubeVideo } from "./youtube";
import { JSONBIN_MASTER_KEY, JSONBIN_CHANNELS_BIN_ID, JSONBIN_CLUBS_BIN_ID, JSONBIN_ACCESS_KEY_CHANNELS } from "./constants";

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

interface MediaState {
  // YouTube Slice
  favoriteChannels: YouTubeChannel[];
  savedVideos: YouTubeVideo[];
  starredChannelIds: string[];
  videoProgress: Record<string, number>;
  
  // Football Slice
  favoriteTeamIds: number[];
  favoriteLeagueIds: number[];
  
  // Settings Slice
  reminders: Reminder[];
  mapSettings: MapSettings;
  aiSuggestions: any[];
  
  // UI States (Non-persistent)
  activeVideo: YouTubeVideo | null;
  isPlaying: boolean;
  isMinimized: boolean;
  isFullScreen: boolean;
  
  // Actions
  addChannel: (channel: YouTubeChannel) => void;
  removeChannel: (id: string) => void;
  incrementChannelClick: (id: string) => void;
  toggleSaveVideo: (video: YouTubeVideo) => void;
  removeVideo: (id: string) => void;
  toggleStarChannel: (id: string) => void;
  addReminder: (reminder: Reminder) => void;
  removeReminder: (id: string) => void;
  toggleReminder: (id: string) => void;
  toggleFavoriteTeamId: (teamId: number) => void;
  toggleFavoriteLeagueId: (leagueId: number) => void;
  updateMapSettings: (settings: Partial<MapSettings>) => void;
  setAiSuggestions: (suggestions: any[]) => void;
  
  // UI Actions
  setActiveVideo: (video: YouTubeVideo | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsMinimized: (minimized: boolean) => void;
  setIsFullScreen: (fullScreen: boolean) => void;
}

/**
 * Atomic Sync with JSONBin.io
 */
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
      favoriteTeamIds: [541, 2939, 2931],
      favoriteLeagueIds: [307, 39, 2],
      reminders: [],
      mapSettings: { zoom: 19.5, tilt: 65, carScale: 1.02, backgroundIndex: 0 },
      aiSuggestions: [],
      
      activeVideo: null,
      isPlaying: false,
      isMinimized: false,
      isFullScreen: false,

      addChannel: (channel) => {
        set((state) => {
          const newChannel = { ...channel, clickschannel: 0 };
          const newList = [...state.favoriteChannels.filter(c => c.id !== channel.id), newChannel];
          updateBin(JSONBIN_CHANNELS_BIN_ID, newList);
          return { favoriteChannels: newList };
        });
      },

      removeChannel: (id) => {
        set((state) => {
          const newList = state.favoriteChannels.filter(c => c.id !== id);
          updateBin(JSONBIN_CHANNELS_BIN_ID, newList);
          return { favoriteChannels: newList };
        });
      },

      incrementChannelClick: (id) => {
        set((state) => {
          const newList = state.favoriteChannels.map(c => 
            c.id === id ? { ...c, clickschannel: (c.clickschannel || 0) + 1 } : c
          );
          updateBin(JSONBIN_CHANNELS_BIN_ID, newList);
          return { favoriteChannels: newList };
        });
      },

      toggleSaveVideo: (video) => {
        set((state) => {
          const exists = state.savedVideos.some(v => v.id === video.id);
          const newList = exists ? state.savedVideos.filter(v => v.id !== video.id) : [video, ...state.savedVideos];
          return { savedVideos: newList };
        });
      },

      removeVideo: (id) => {
        set((state) => ({ savedVideos: state.savedVideos.filter(v => v.id !== id) }));
      },

      toggleStarChannel: (id) => {
        set((state) => {
          const exists = state.starredChannelIds.includes(id);
          const newList = exists ? state.starredChannelIds.filter(i => i !== id) : [...state.starredChannelIds, id];
          return { starredChannelIds: newList };
        });
      },

      toggleFavoriteTeamId: (teamId) => {
        set((state) => {
          const newList = state.favoriteTeamIds.includes(teamId) 
            ? state.favoriteTeamIds.filter(id => id !== teamId) 
            : [...state.favoriteTeamIds, teamId];
          updateBin(JSONBIN_CLUBS_BIN_ID, newList);
          return { favoriteTeamIds: newList };
        });
      },

      toggleFavoriteLeagueId: (leagueId) => {
        set((state) => {
          const newList = state.favoriteLeagueIds.includes(leagueId) 
            ? state.favoriteLeagueIds.filter(id => id !== leagueId) 
            : [...state.favoriteLeagueIds, leagueId];
          return { favoriteLeagueIds: newList };
        });
      },

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
        if (video) {
          // Increment channel clicks if the video belongs to a favorite channel
          const currentChannels = get().favoriteChannels;
          const channel = currentChannels.find(c => c.title === video.channelTitle);
          if (channel) {
            get().incrementChannelClick(channel.id);
          }
        }
        set({ activeVideo: video, isPlaying: !!video, isMinimized: false, isFullScreen: false });
      },
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setIsMinimized: (minimized) => set({ isMinimized: minimized, isFullScreen: false }),
      setIsFullScreen: (fullScreen) => set({ isFullScreen: fullScreen, isMinimized: false }),
    }),
    {
      name: "drivecast-atomic-jsonbin",
      partialize: (state) => ({ 
        favoriteChannels: state.favoriteChannels,
        savedVideos: state.savedVideos,
        starredChannelIds: state.starredChannelIds,
        favoriteTeamIds: state.favoriteTeamIds,
        favoriteLeagueIds: state.favoriteLeagueIds,
        mapSettings: state.mapSettings,
        reminders: state.reminders
      }),
    }
  )
);

// Initialization & Sync
if (typeof window !== "undefined") {
  const syncWithBins = async () => {
    try {
      // Channels Bin
      const chRes = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CHANNELS_BIN_ID}/latest`, {
        headers: { 'X-Access-Key': JSONBIN_ACCESS_KEY_CHANNELS }
      });
      if (chRes.ok) {
        const data = await chRes.json();
        if (Array.isArray(data.record)) {
          useMediaStore.setState({ favoriteChannels: data.record });
        }
      }

      // Clubs Bin
      const clRes = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CLUBS_BIN_ID}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
      });
      if (clRes.ok) {
        const data = await clRes.json();
        if (Array.isArray(data.record)) {
          useMediaStore.setState({ favoriteTeamIds: data.record });
        }
      }
    } catch (e) {
      console.error("Initial Bin Sync Error:", e);
    }
  };

  syncWithBins();
}
