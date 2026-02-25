
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { YouTubeChannel, YouTubeVideo } from "./youtube";
import { doc, setDoc, getDoc, onSnapshot, Firestore } from "firebase/firestore";
import { initializeFirebase } from "@/firebase";
import { onAuthStateChanged, Auth } from "firebase/auth";

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

const { db, auth } = initializeFirebase();

/**
 * Syncs a specific JSON slice to Firestore acting as a "JSON Bin".
 */
const syncSlice = async (userId: string, slice: 'youtube' | 'football' | 'settings', data: any) => {
  if (!userId) return;
  const docRef = doc(db, "users", userId, "data", slice);
  setDoc(docRef, data, { merge: true }).catch(e => console.error(`Sync error [${slice}]:`, e));
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
          const newList = [...state.favoriteChannels.filter(c => c.id !== channel.id), channel];
          syncSlice(auth.currentUser?.uid!, 'youtube', { favoriteChannels: newList });
          return { favoriteChannels: newList };
        });
      },

      removeChannel: (id) => {
        set((state) => {
          const newList = state.favoriteChannels.filter(c => c.id !== id);
          syncSlice(auth.currentUser?.uid!, 'youtube', { favoriteChannels: newList });
          return { favoriteChannels: newList };
        });
      },

      toggleSaveVideo: (video) => {
        set((state) => {
          const exists = state.savedVideos.some(v => v.id === video.id);
          const newList = exists ? state.savedVideos.filter(v => v.id !== video.id) : [video, ...state.savedVideos];
          syncSlice(auth.currentUser?.uid!, 'youtube', { savedVideos: newList });
          return { savedVideos: newList };
        });
      },

      removeVideo: (id) => {
        set((state) => {
          const newList = state.savedVideos.filter(v => v.id !== id);
          syncSlice(auth.currentUser?.uid!, 'youtube', { savedVideos: newList });
          return { savedVideos: newList };
        });
      },

      toggleStarChannel: (id) => {
        set((state) => {
          const exists = state.starredChannelIds.includes(id);
          const newList = exists ? state.starredChannelIds.filter(i => i !== id) : [...state.starredChannelIds, id];
          syncSlice(auth.currentUser?.uid!, 'youtube', { starredChannelIds: newList });
          return { starredChannelIds: newList };
        });
      },

      toggleFavoriteTeamId: (teamId) => {
        set((state) => {
          const newList = state.favoriteTeamIds.includes(teamId) 
            ? state.favoriteTeamIds.filter(id => id !== teamId) 
            : [...state.favoriteTeamIds, teamId];
          syncSlice(auth.currentUser?.uid!, 'football', { favoriteTeamIds: newList });
          return { favoriteTeamIds: newList };
        });
      },

      toggleFavoriteLeagueId: (leagueId) => {
        set((state) => {
          const newList = state.favoriteLeagueIds.includes(leagueId) 
            ? state.favoriteLeagueIds.filter(id => id !== leagueId) 
            : [...state.favoriteLeagueIds, leagueId];
          syncSlice(auth.currentUser?.uid!, 'football', { favoriteLeagueIds: newList });
          return { favoriteLeagueIds: newList };
        });
      },

      updateMapSettings: (settings) => {
        set((state) => {
          const newSettings = { ...state.mapSettings, ...settings };
          syncSlice(auth.currentUser?.uid!, 'settings', { mapSettings: newSettings });
          return { mapSettings: newSettings };
        });
      },

      addReminder: (reminder) => {
        set((state) => {
          const newList = [...state.reminders, reminder];
          syncSlice(auth.currentUser?.uid!, 'settings', { reminders: newList });
          return { reminders: newList };
        });
      },

      removeReminder: (id) => {
        set((state) => {
          const newList = state.reminders.filter(r => r.id !== id);
          syncSlice(auth.currentUser?.uid!, 'settings', { reminders: newList });
          return { reminders: newList };
        });
      },

      toggleReminder: (id) => {
        set((state) => {
          const newList = state.reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r);
          syncSlice(auth.currentUser?.uid!, 'settings', { reminders: newList });
          return { reminders: newList };
        });
      },

      setAiSuggestions: (suggestions) => {
        set({ aiSuggestions: suggestions });
        syncSlice(auth.currentUser?.uid!, 'settings', { aiSuggestions: suggestions });
      },

      setActiveVideo: (video) => set({ activeVideo: video, isPlaying: !!video, isMinimized: false, isFullScreen: false }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setIsMinimized: (minimized) => set({ isMinimized: minimized, isFullScreen: false }),
      setIsFullScreen: (fullScreen) => set({ isFullScreen: fullScreen, isMinimized: false }),
    }),
    {
      name: "drivecast-atomic-v2",
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

// Real-time Sync Hub: Listens to each JSON slice independently
if (typeof window !== "undefined") {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      ['youtube', 'football', 'settings'].forEach(slice => {
        onSnapshot(doc(db, "users", user.uid, "data", slice), (snap) => {
          if (snap.exists()) {
            useMediaStore.setState((state) => ({ ...state, ...snap.data() }));
          }
        });
      });
    }
  });
}
