
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { YouTubeChannel, YouTubeVideo } from "./youtube";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { initializeFirebase } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";

export interface SavedPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

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
  // YouTube Data
  favoriteChannels: YouTubeChannel[];
  savedVideos: YouTubeVideo[];
  starredChannelIds: string[];
  videoProgress: Record<string, number>;
  
  // Football Data
  favoriteTeams: string[];
  favoriteTeamIds: number[];
  favoriteLeagueIds: number[];
  
  // App Settings
  savedPlaces: SavedPlace[];
  reciterKeywords: string[];
  reminders: Reminder[];
  mapSettings: MapSettings;
  aiSuggestions: any[];
  
  // Active UI States (Non-persistent)
  activeVideo: YouTubeVideo | null;
  isPlaying: boolean;
  isMinimized: boolean;
  isFullScreen: boolean;
  
  // Persistent Actions
  addChannel: (channel: YouTubeChannel) => void;
  removeChannel: (id: string) => void;
  toggleSaveVideo: (video: YouTubeVideo) => void;
  removeVideo: (id: string) => void;
  toggleStarChannel: (id: string) => void;
  addReminder: (reminder: Reminder) => void;
  removeReminder: (id: string) => void;
  toggleReminder: (id: string) => void;
  updateVideoProgress: (videoId: string, seconds: number) => void;
  toggleFavoriteTeamId: (teamId: number, teamName?: string) => void;
  toggleFavoriteLeagueId: (leagueId: number) => void;
  updateMapSettings: (settings: Partial<MapSettings>) => void;
  setAiSuggestions: (suggestions: any[]) => void;
  
  // Data Loaders
  loadSliceData: (userId: string, slice: 'youtube' | 'football' | 'settings') => Promise<void>;
  
  // UI Actions
  setActiveVideo: (video: YouTubeVideo | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsMinimized: (minimized: boolean) => void;
  setIsFullScreen: (fullScreen: boolean) => void;
}

const INITIAL_CHANNELS: YouTubeChannel[] = [
  {
    id: "UCjw2pKqSOnb6qwtoXmXKvHg",
    title: "ياسر الدوسري",
    description: "تلاوات من الحرم المكي",
    thumbnail: "https://yt3.ggpht.com/X2s_ve9ufzgT25XGfd1SBtKHg5VcBNvAej1ylyhDGu3w7LV87iHxFr1kplWvKbW5pSGt0JBPCg=s800-c-k-c0xffffffff-no-rj-mo",
  }
];

const { db, auth } = initializeFirebase();

/**
 * Sync logic: Saves specific data groups to Firestore as separate JSON documents.
 */
const syncToCloud = async (userId: string, slice: 'youtube' | 'football' | 'settings', data: any) => {
  if (!userId) return;
  const docRef = doc(db, "users", userId, "data", slice);
  await setDoc(docRef, data, { merge: true }).catch(e => console.error(`Sync error [${slice}]:`, e));
};

export const useMediaStore = create<MediaState>()(
  persist(
    (set, get) => ({
      favoriteChannels: INITIAL_CHANNELS,
      savedVideos: [],
      starredChannelIds: [],
      videoProgress: {},
      favoriteTeams: [],
      favoriteTeamIds: [541, 2939, 2931],
      favoriteLeagueIds: [307, 39, 2],
      savedPlaces: [],
      reciterKeywords: [],
      reminders: [],
      mapSettings: { zoom: 19.5, tilt: 65, carScale: 1.02, backgroundIndex: 0 },
      aiSuggestions: [],
      
      activeVideo: null,
      isPlaying: false,
      isMinimized: false,
      isFullScreen: false,

      loadSliceData: async (userId, slice) => {
        const snap = await getDoc(doc(db, "users", userId, "data", slice));
        if (snap.exists()) {
          set((state) => ({ ...state, ...snap.data() }));
        }
      },

      addChannel: (channel) => {
        set((state) => {
          const newList = [...state.favoriteChannels.filter(c => c.id !== channel.id), channel];
          const userId = auth.currentUser?.uid;
          if (userId) syncToCloud(userId, 'youtube', { favoriteChannels: newList });
          return { favoriteChannels: newList };
        });
      },

      removeChannel: (id) => {
        set((state) => {
          const newList = state.favoriteChannels.filter(c => c.id !== id);
          const userId = auth.currentUser?.uid;
          if (userId) syncToCloud(userId, 'youtube', { favoriteChannels: newList });
          return { favoriteChannels: newList };
        });
      },

      toggleSaveVideo: (video) => {
        set((state) => {
          const exists = state.savedVideos.some(v => v.id === video.id);
          const newList = exists ? state.savedVideos.filter(v => v.id !== video.id) : [video, ...state.savedVideos];
          const userId = auth.currentUser?.uid;
          if (userId) syncToCloud(userId, 'youtube', { savedVideos: newList });
          return { savedVideos: newList };
        });
      },

      removeVideo: (id) => {
        set((state) => {
          const newList = state.savedVideos.filter(v => v.id !== id);
          const userId = auth.currentUser?.uid;
          if (userId) syncToCloud(userId, 'youtube', { savedVideos: newList });
          return { savedVideos: newList };
        });
      },

      toggleStarChannel: (id) => {
        set((state) => {
          const exists = state.starredChannelIds.includes(id);
          const newList = exists ? state.starredChannelIds.filter(i => i !== id) : [...state.starredChannelIds, id];
          const userId = auth.currentUser?.uid;
          if (userId) syncToCloud(userId, 'youtube', { starredChannelIds: newList });
          return { starredChannelIds: newList };
        });
      },

      updateVideoProgress: (videoId, seconds) => {
        set((state) => {
          const newProgress = { ...state.videoProgress, [videoId]: seconds };
          const userId = auth.currentUser?.uid;
          if (userId) syncToCloud(userId, 'youtube', { videoProgress: newProgress });
          return { videoProgress: newProgress };
        });
      },

      toggleFavoriteTeamId: (teamId) => {
        set((state) => {
          const newList = state.favoriteTeamIds.includes(teamId) 
            ? state.favoriteTeamIds.filter(id => id !== teamId) 
            : [...state.favoriteTeamIds, teamId];
          const userId = auth.currentUser?.uid;
          if (userId) syncToCloud(userId, 'football', { favoriteTeamIds: newList });
          return { favoriteTeamIds: newList };
        });
      },

      toggleFavoriteLeagueId: (leagueId) => {
        set((state) => {
          const newList = state.favoriteLeagueIds.includes(leagueId) 
            ? state.favoriteLeagueIds.filter(id => id !== leagueId) 
            : [...state.favoriteLeagueIds, leagueId];
          const userId = auth.currentUser?.uid;
          if (userId) syncToCloud(userId, 'football', { favoriteLeagueIds: newList });
          return { favoriteLeagueIds: newList };
        });
      },

      updateMapSettings: (settings) => {
        set((state) => {
          const newSettings = { ...state.mapSettings, ...settings };
          const userId = auth.currentUser?.uid;
          if (userId) syncToCloud(userId, 'settings', { mapSettings: newSettings });
          return { mapSettings: newSettings };
        });
      },

      addReminder: (reminder) => {
        set((state) => {
          const newList = [...state.reminders, reminder];
          const userId = auth.currentUser?.uid;
          if (userId) syncToCloud(userId, 'settings', { reminders: newList });
          return { reminders: newList };
        });
      },

      removeReminder: (id) => {
        set((state) => {
          const newList = state.reminders.filter(r => r.id !== id);
          const userId = auth.currentUser?.uid;
          if (userId) syncToCloud(userId, 'settings', { reminders: newList });
          return { reminders: newList };
        });
      },

      toggleReminder: (id) => {
        set((state) => {
          const newList = state.reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r);
          const userId = auth.currentUser?.uid;
          if (userId) syncToCloud(userId, 'settings', { reminders: newList });
          return { reminders: newList };
        });
      },

      setAiSuggestions: (suggestions) => {
        set({ aiSuggestions: suggestions });
        const userId = auth.currentUser?.uid;
        if (userId) syncToCloud(userId, 'settings', { aiSuggestions: suggestions });
      },

      setActiveVideo: (video) => set({ activeVideo: video, isPlaying: !!video, isMinimized: false, isFullScreen: false }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setIsMinimized: (minimized) => set({ isMinimized: minimized, isFullScreen: false }),
      setIsFullScreen: (fullScreen) => set({ isFullScreen: fullScreen, isMinimized: false }),
    }),
    {
      name: "drivecast-atomic-v1",
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

// Automatic Sync Manager
if (typeof window !== "undefined") {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      const store = useMediaStore.getState();
      ['youtube', 'football', 'settings'].forEach(slice => {
        store.loadSliceData(user.uid, slice as any);
        onSnapshot(doc(db, "users", user.uid, "data", slice), (snap) => {
          if (snap.exists()) {
            useMediaStore.setState((state) => ({ ...state, ...snap.data() }));
          }
        });
      });
    }
  });
}
