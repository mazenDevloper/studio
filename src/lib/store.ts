
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { YouTubeChannel, YouTubeVideo } from "./youtube";
import { doc, setDoc, getDoc, onSnapshot, collection } from "firebase/firestore";
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
  // YouTube Slice
  favoriteChannels: YouTubeChannel[];
  savedVideos: YouTubeVideo[];
  starredChannelIds: string[];
  videoProgress: Record<string, number>;
  
  // Football Slice
  favoriteTeams: string[];
  favoriteTeamIds: number[];
  favoriteLeagueIds: number[];
  
  // Settings/Reminders Slice
  savedPlaces: SavedPlace[];
  reciterKeywords: string[];
  reminders: Reminder[];
  mapSettings: MapSettings;
  aiSuggestions: any[];
  
  // Player State (Non-persistent)
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
  updateVideoProgress: (videoId: string, seconds: number) => void;
  toggleFavoriteTeamId: (teamId: number, teamName?: string) => void;
  toggleFavoriteLeagueId: (leagueId: number) => void;
  updateMapSettings: (settings: Partial<MapSettings>) => void;
  setAiSuggestions: (suggestions: any[]) => void;
  
  // Sync Actions
  loadAllData: (userId: string) => Promise<void>;
  
  // Player Actions
  setActiveVideo: (video: YouTubeVideo | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsMinimized: (minimized: boolean) => void;
  setIsFullScreen: (fullScreen: boolean) => void;
}

const INITIAL_CHANNELS: YouTubeChannel[] = [
  {
    id: "UCjw2pKqSOnb6qwtoXmXKvHg",
    title: "ياسر الدوسري",
    description: "القناة الرسمية للشيخ ياسر الدوسري - تلاوات من الحرم المكي",
    thumbnail: "https://yt3.ggpht.com/X2s_ve9ufzgT25XGfd1SBtKHg5VcBNvAej1ylyhDGu3w7LV87iHxFr1kplWvKbW5pSGt0JBPCg=s800-c-k-c0xffffffff-no-rj-mo",
  }
];

const INITIAL_REMINDERS: Reminder[] = [
  { id: '1', label: 'أذكار الصباح', iconType: 'play', completed: false, color: 'text-teal-400', startHour: 4, endHour: 11 },
  { id: '3', label: 'أذكار المساء', iconType: 'bell', completed: false, color: 'text-orange-400', startHour: 15, endHour: 19 },
];

const { db, auth } = initializeFirebase();

/**
 * Sync function to save data in "Separate JSON Document" style.
 */
const syncSlice = async (userId: string, sliceName: string, data: any) => {
  if (!userId) return;
  const docRef = doc(db, "users", userId, "data", sliceName);
  setDoc(docRef, data, { merge: true }).catch(e => console.error(`Sync error [${sliceName}]:`, e));
};

export const useMediaStore = create<MediaState>()(
  persist(
    (set, get) => ({
      favoriteChannels: INITIAL_CHANNELS,
      savedVideos: [],
      starredChannelIds: [],
      videoProgress: {},
      favoriteTeams: ['Real Madrid', 'Al Nassr', 'Al Hilal'],
      favoriteTeamIds: [541, 2939, 2931],
      favoriteLeagueIds: [307, 39, 2],
      savedPlaces: [],
      reciterKeywords: ["ياسر الدوسري", "سعود الشريم"],
      reminders: INITIAL_REMINDERS,
      mapSettings: { zoom: 19.5, tilt: 65, carScale: 1.02, backgroundIndex: 0 },
      aiSuggestions: [],
      
      activeVideo: null,
      isPlaying: false,
      isMinimized: false,
      isFullScreen: false,

      loadAllData: async (userId) => {
        const slices = ["youtube", "football", "settings"];
        for (const slice of slices) {
          const snap = await getDoc(doc(db, "users", userId, "data", slice));
          if (snap.exists()) set(state => ({ ...state, ...snap.data() }));
        }
      },

      addChannel: (channel) => {
        set((state) => ({ favoriteChannels: [...state.favoriteChannels.filter(c => c.id !== channel.id), channel] }));
        const { userId } = { userId: auth.currentUser?.uid };
        if (userId) syncSlice(userId, "youtube", { favoriteChannels: get().favoriteChannels });
      },

      removeChannel: (id) => {
        set((state) => ({ favoriteChannels: state.favoriteChannels.filter((c) => c.id !== id) }));
        const userId = auth.currentUser?.uid;
        if (userId) syncSlice(userId, "youtube", { favoriteChannels: get().favoriteChannels });
      },

      toggleSaveVideo: (video) => {
        set((state) => {
          const isSaved = state.savedVideos.some(v => v.id === video.id);
          return { savedVideos: isSaved ? state.savedVideos.filter(v => v.id !== video.id) : [video, ...state.savedVideos] };
        });
        const userId = auth.currentUser?.uid;
        if (userId) syncSlice(userId, "youtube", { savedVideos: get().savedVideos });
      },

      removeVideo: (id) => {
        set((state) => ({ savedVideos: state.savedVideos.filter(v => v.id !== id) }));
        const userId = auth.currentUser?.uid;
        if (userId) syncSlice(userId, "youtube", { savedVideos: get().savedVideos });
      },

      toggleStarChannel: (id) => {
        set((state) => ({ starredChannelIds: state.starredChannelIds.includes(id) ? state.starredChannelIds.filter(i => i !== id) : [...state.starredChannelIds, id] }));
        const userId = auth.currentUser?.uid;
        if (userId) syncSlice(userId, "youtube", { starredChannelIds: get().starredChannelIds });
      },

      updateVideoProgress: (videoId, seconds) => {
        set((state) => ({ videoProgress: { ...state.videoProgress, [videoId]: seconds } }));
        const userId = auth.currentUser?.uid;
        if (userId) syncSlice(userId, "youtube", { videoProgress: get().videoProgress });
      },

      toggleFavoriteTeamId: (teamId, teamName) => {
        set((state) => {
          const isRemoving = state.favoriteTeamIds.includes(teamId);
          const newIds = isRemoving ? state.favoriteTeamIds.filter(id => id !== teamId) : [...state.favoriteTeamIds, teamId];
          return { favoriteTeamIds: newIds };
        });
        const userId = auth.currentUser?.uid;
        if (userId) syncSlice(userId, "football", { favoriteTeamIds: get().favoriteTeamIds });
      },

      toggleFavoriteLeagueId: (leagueId) => {
        set((state) => ({ favoriteLeagueIds: state.favoriteLeagueIds.includes(leagueId) ? state.favoriteLeagueIds.filter(id => id !== leagueId) : [...state.favoriteLeagueIds, leagueId] }));
        const userId = auth.currentUser?.uid;
        if (userId) syncSlice(userId, "football", { favoriteLeagueIds: get().favoriteLeagueIds });
      },

      updateMapSettings: (settings) => {
        set((state) => ({ mapSettings: { ...state.mapSettings, ...settings } }));
        const userId = auth.currentUser?.uid;
        if (userId) syncSlice(userId, "settings", { mapSettings: get().mapSettings });
      },

      addReminder: (reminder) => {
        set((state) => ({ reminders: [...state.reminders, reminder] }));
        const userId = auth.currentUser?.uid;
        if (userId) syncSlice(userId, "settings", { reminders: get().reminders });
      },

      removeReminder: (id) => {
        set((state) => ({ reminders: state.reminders.filter(r => r.id !== id) }));
        const userId = auth.currentUser?.uid;
        if (userId) syncSlice(userId, "settings", { reminders: get().reminders });
      },

      toggleReminder: (id) => {
        set((state) => ({ reminders: state.reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r) }));
        const userId = auth.currentUser?.uid;
        if (userId) syncSlice(userId, "settings", { reminders: get().reminders });
      },

      setAiSuggestions: (suggestions) => {
        set({ aiSuggestions: suggestions });
        const userId = auth.currentUser?.uid;
        if (userId) syncSlice(userId, "settings", { aiSuggestions: get().aiSuggestions });
      },

      setActiveVideo: (video) => set({ activeVideo: video, isPlaying: !!video, isMinimized: false, isFullScreen: false }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setIsMinimized: (minimized) => set({ isMinimized: minimized, isFullScreen: false }),
      setIsFullScreen: (fullScreen) => set({ isFullScreen: fullScreen, isMinimized: false }),
    }),
    {
      name: "drivecast-json-v5",
    }
  )
);

// Cloud Listener for Atomic Sync
if (typeof window !== "undefined") {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      useMediaStore.getState().loadAllData(user.uid);
      // Listen to separate data documents for real-time reactivity
      ["youtube", "football", "settings"].forEach(slice => {
        onSnapshot(doc(db, "users", user.uid, "data", slice), (snap) => {
          if (snap.exists()) useMediaStore.setState(state => ({ ...state, ...snap.data() }));
        });
      });
    }
  });
}
