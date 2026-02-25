
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
  favoriteChannels: YouTubeChannel[];
  savedVideos: YouTubeVideo[];
  starredChannelIds: string[];
  savedPlaces: SavedPlace[];
  reciterKeywords: string[];
  reminders: Reminder[];
  videoProgress: Record<string, number>;
  favoriteTeams: string[];
  mapSettings: MapSettings;
  aiSuggestions: any[];
  
  // Player State
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
  savePlace: (place: SavedPlace) => void;
  removePlace: (id: string) => void;
  addReciterKeyword: (keyword: string) => void;
  removeReciterKeyword: (keyword: string) => void;
  addReminder: (reminder: Reminder) => void;
  removeReminder: (id: string) => void;
  toggleReminder: (id: string) => void;
  updateVideoProgress: (videoId: string, seconds: number) => void;
  toggleFavoriteTeam: (teamName: string) => void;
  updateMapSettings: (settings: Partial<MapSettings>) => void;
  setAiSuggestions: (suggestions: any[]) => void;
  
  // Sync Actions
  loadFromFirestore: (userId: string) => Promise<void>;
  
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
  },
  {
    id: "UCAS_9UJtSteMwQFsbEWbFeQ",
    title: "سعود الشريم",
    description: "تلاوات نادرة ومميزة للشيخ سعود الشريم",
    thumbnail: "https://tvquran.com/uploads/authors/images/%D8%B3%D8%B9%D9%88%D8%AF%20%D8%A7%D9%84%D8%B4%D8%B1%D9%8A%D9%85.jpg",
  }
];

const INITIAL_REMINDERS: Reminder[] = [
  { id: '1', label: 'أذكار الصباح', iconType: 'play', completed: false, color: 'text-teal-400', startHour: 4, endHour: 11 },
  { id: '3', label: 'أذكار المساء', iconType: 'bell', completed: false, color: 'text-orange-400', startHour: 15, endHour: 19 },
];

const { db, auth } = initializeFirebase();

const syncToCloud = async (state: MediaState) => {
  const user = auth.currentUser;
  if (!user) return;
  
  const userRef = doc(db, "users", user.uid);
  const dataToSync = {
    favoriteChannels: state.favoriteChannels,
    savedVideos: state.savedVideos,
    starredChannelIds: state.starredChannelIds,
    savedPlaces: state.savedPlaces,
    reciterKeywords: state.reciterKeywords,
    reminders: state.reminders,
    videoProgress: state.videoProgress,
    favoriteTeams: state.favoriteTeams,
    mapSettings: state.mapSettings,
    aiSuggestions: state.aiSuggestions,
  };

  setDoc(userRef, dataToSync, { merge: true }).catch(err => console.error("Cloud Sync Error:", err));
};

export const useMediaStore = create<MediaState>()(
  persist(
    (set, get) => ({
      favoriteChannels: INITIAL_CHANNELS,
      savedVideos: [],
      starredChannelIds: [],
      savedPlaces: [],
      reciterKeywords: ["ياسر الدوسري", "بندر بليلة", "سعود الشريم"],
      reminders: INITIAL_REMINDERS,
      videoProgress: {},
      favoriteTeams: ['الهلال', 'ريال مدريد'],
      aiSuggestions: [],
      mapSettings: {
        zoom: 19.5,
        tilt: 65,
        carScale: 1.02,
        backgroundIndex: 0
      },
      
      activeVideo: null,
      isPlaying: false,
      isMinimized: false,
      isFullScreen: false,

      loadFromFirestore: async (userId) => {
        const userRef = doc(db, "users", userId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          set(snap.data() as any);
        }
      },

      setAiSuggestions: (suggestions) => {
        set({ aiSuggestions: suggestions });
        syncToCloud(get());
      },

      updateMapSettings: (settings) => {
        set((state) => ({ mapSettings: { ...state.mapSettings, ...settings } }));
        syncToCloud(get());
      },

      toggleFavoriteTeam: (teamName) => {
        set((state) => ({
          favoriteTeams: state.favoriteTeams.includes(teamName)
            ? state.favoriteTeams.filter(t => t !== teamName)
            : [...state.favoriteTeams, teamName]
        }));
        syncToCloud(get());
      },

      addChannel: (channel) => {
        set((state) => ({
          favoriteChannels: state.favoriteChannels.some(c => c.id === channel.id)
            ? state.favoriteChannels
            : [...state.favoriteChannels, channel],
        }));
        syncToCloud(get());
      },

      removeChannel: (id) => {
        set((state) => ({
          favoriteChannels: state.favoriteChannels.filter((c) => c.id !== id),
          starredChannelIds: state.starredChannelIds.filter(i => i !== id),
        }));
        syncToCloud(get());
      },

      toggleSaveVideo: (video) => {
        set((state) => {
          const isSaved = state.savedVideos.some(v => v.id === video.id);
          return {
            savedVideos: isSaved
              ? state.savedVideos.filter(v => v.id !== video.id)
              : [video, ...state.savedVideos]
          };
        });
        syncToCloud(get());
      },

      removeVideo: (id) => {
        set((state) => ({
          savedVideos: state.savedVideos.filter(v => v.id !== id),
        }));
        syncToCloud(get());
      },

      toggleStarChannel: (id) => {
        set((state) => ({
          starredChannelIds: state.starredChannelIds.includes(id)
            ? state.starredChannelIds.filter(i => i !== id)
            : [...state.starredChannelIds, id]
        }));
        syncToCloud(get());
      },

      savePlace: (place) => {
        set((state) => ({
          savedPlaces: state.savedPlaces.some(p => p.id === place.id)
            ? state.savedPlaces
            : [place, ...state.savedPlaces]
        }));
        syncToCloud(get());
      },

      removePlace: (id) => {
        set((state) => ({
          savedPlaces: state.savedPlaces.filter(p => p.id !== id)
        }));
        syncToCloud(get());
      },

      addReciterKeyword: (keyword) => {
        set((state) => ({
          reciterKeywords: state.reciterKeywords.includes(keyword)
            ? state.reciterKeywords
            : [...state.reciterKeywords, keyword]
        }));
        syncToCloud(get());
      },

      removeReciterKeyword: (keyword) => {
        set((state) => ({
          reciterKeywords: state.reciterKeywords.filter(k => k !== keyword)
        }));
        syncToCloud(get());
      },

      addReminder: (reminder) => {
        set((state) => ({ reminders: [...state.reminders, reminder] }));
        syncToCloud(get());
      },

      removeReminder: (id) => {
        set((state) => ({ reminders: state.reminders.filter(r => r.id !== id) }));
        syncToCloud(get());
      },

      toggleReminder: (id) => {
        set((state) => ({
          reminders: state.reminders.map(r => 
            r.id === id ? { ...r, completed: !r.completed } : r
          )
        }));
        syncToCloud(get());
      },

      updateVideoProgress: (videoId, seconds) => {
        set((state) => ({
          videoProgress: { ...state.videoProgress, [videoId]: seconds }
        }));
        syncToCloud(get());
      },

      setActiveVideo: (video) => set({ 
        activeVideo: video, 
        isPlaying: !!video, 
        isMinimized: false,
        isFullScreen: false 
      }),
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setIsMinimized: (minimized) => set({ isMinimized: minimized, isFullScreen: false }),
      setIsFullScreen: (fullScreen) => set({ isFullScreen: fullScreen, isMinimized: false }),
    }),
    {
      name: "drivecast-persistent-v4",
    }
  )
);

// Cloud Sync Listener
if (typeof window !== "undefined") {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      useMediaStore.getState().loadFromFirestore(user.uid);
      // Listen for remote updates
      onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists()) {
          const cloudData = snap.data();
          // Update store from cloud, but avoid re-triggering sync
          useMediaStore.setState((state) => ({
            ...state,
            ...cloudData
          }));
        }
      });
    }
  });
}
