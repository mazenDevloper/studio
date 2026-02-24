
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

interface MediaState {
  favoriteChannels: YouTubeChannel[];
  savedVideos: YouTubeVideo[];
  starredChannelIds: string[];
  savedPlaces: SavedPlace[];
  reciterKeywords: string[];
  reminders: Reminder[];
  videoProgress: Record<string, number>;
  favoriteTeams: string[];
  
  // Player State
  activeVideo: YouTubeVideo | null;
  isPlaying: boolean;
  isMinimized: boolean;
  isFullScreen: boolean;
  
  // Storage Actions
  addChannel: (channel: YouTubeChannel) => void;
  removeChannel: (id: string) => void;
  toggleSaveVideo: (video: YouTubeVideo) => void;
  removeVideo: (id: string) => void;
  toggleStarChannel: (id: string) => void;
  savePlace: (place: SavedPlace) => void;
  removePlace: (id: string) => void;
  addReciterKeyword: (keyword: string) => void;
  removeReciterKeyword: (keyword: string) => void;
  toggleReminder: (id: string) => void;
  updateVideoProgress: (videoId: string, seconds: number) => void;
  toggleFavoriteTeam: (teamName: string) => void;
  
  // Sync Actions
  loadFromFirestore: (userId: string) => Promise<void>;
  
  // Player Actions
  setActiveVideo: (video: YouTubeVideo | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsMinimized: (minimized: boolean) => void;
  setIsFullScreen: (fullScreen: boolean) => void;
  toggleMinimize: () => void;
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
  },
  {
    id: "UCz9WVutRGBdn58dScZDh6uQ",
    title: "ماهر المعيقلي",
    description: "تلاوات خاشعة بصوت الشيخ ماهر المعيقلي إمام الحرم المكي",
    thumbnail: "https://yt3.ggpht.com/ytc/AIdro_m_Hn6f_x-xS7_l7HlX7-0O_HjX3_8_H_7_8=s800-c-k-c0xffffffff-no-rj-mo",
  }
];

const INITIAL_RECITERS = ["ياسر الدوسري", "بندر بليلة", "سعود الشريم", "عبدالرحمن السديس", "ماهر المعيقلي"];

const INITIAL_REMINDERS: Reminder[] = [
  { id: '1', label: 'أذكار الصباح', iconType: 'play', completed: false, color: 'text-teal-400', startHour: 4, endHour: 11 },
  { id: '3', label: 'أذكار المساء', iconType: 'bell', completed: false, color: 'text-orange-400', startHour: 15, endHour: 19 },
];

const { db, auth } = initializeFirebase();

const syncToCloud = async (state: Partial<MediaState>) => {
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
  };
  
  Object.keys(dataToSync).forEach(key => 
    (dataToSync as any)[key] === undefined && delete (dataToSync as any)[key]
  );

  setDoc(userRef, dataToSync, { merge: true }).catch(err => console.error("Firestore Sync Error:", err));
};

export const useMediaStore = create<MediaState>()(
  persist(
    (set, get) => ({
      favoriteChannels: INITIAL_CHANNELS,
      savedVideos: [],
      starredChannelIds: [],
      savedPlaces: [],
      reciterKeywords: INITIAL_RECITERS,
      reminders: INITIAL_REMINDERS,
      videoProgress: {},
      favoriteTeams: ['الهلال', 'ريال مدريد'],
      
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

      toggleFavoriteTeam: (teamName) => {
        set((state) => {
          const newState = {
            favoriteTeams: state.favoriteTeams.includes(teamName)
              ? state.favoriteTeams.filter(t => t !== teamName)
              : [...state.favoriteTeams, teamName]
          };
          syncToCloud({ ...state, ...newState });
          return newState;
        });
      },

      addChannel: (channel) => {
        set((state) => {
          const newState = {
            favoriteChannels: state.favoriteChannels.some(c => c.id === channel.id)
              ? state.favoriteChannels
              : [...state.favoriteChannels, channel],
          };
          syncToCloud({ ...state, ...newState });
          return newState;
        });
      },

      removeChannel: (id) => {
        set((state) => {
          const newState = {
            favoriteChannels: state.favoriteChannels.filter((c) => c.id !== id),
            starredChannelIds: state.starredChannelIds.filter(i => i !== id),
          };
          syncToCloud({ ...state, ...newState });
          return newState;
        });
      },

      toggleSaveVideo: (video) => {
        set((state) => {
          const isSaved = state.savedVideos.some(v => v.id === video.id);
          const newState = {
            savedVideos: isSaved
              ? state.savedVideos.filter(v => v.id !== video.id)
              : [video, ...state.savedVideos]
          };
          syncToCloud({ ...state, ...newState });
          return newState;
        });
      },

      removeVideo: (id) => {
        set((state) => {
          const newState = {
            savedVideos: state.savedVideos.filter(v => v.id !== id),
          };
          syncToCloud({ ...state, ...newState });
          return newState;
        });
      },

      toggleStarChannel: (id) => {
        set((state) => {
          const newState = {
            starredChannelIds: state.starredChannelIds.includes(id)
              ? state.starredChannelIds.filter(i => i !== id)
              : [...state.starredChannelIds, id]
          };
          syncToCloud({ ...state, ...newState });
          return newState;
        });
      },

      savePlace: (place) => {
        set((state) => {
          const newState = {
            savedPlaces: state.savedPlaces.some(p => p.id === place.id)
              ? state.savedPlaces
              : [place, ...state.savedPlaces]
          };
          syncToCloud({ ...state, ...newState });
          return newState;
        });
      },

      removePlace: (id) => {
        set((state) => {
          const newState = {
            savedPlaces: state.savedPlaces.filter(p => p.id !== id)
          };
          syncToCloud({ ...state, ...newState });
          return newState;
        });
      },

      addReciterKeyword: (keyword) => {
        set((state) => {
          const newState = {
            reciterKeywords: state.reciterKeywords.includes(keyword)
              ? state.reciterKeywords
              : [...state.reciterKeywords, keyword]
          };
          syncToCloud({ ...state, ...newState });
          return newState;
        });
      },

      removeReciterKeyword: (keyword) => {
        set((state) => {
          const newState = {
            reciterKeywords: state.reciterKeywords.filter(k => k !== keyword)
          };
          syncToCloud({ ...state, ...newState });
          return newState;
        });
      },

      toggleReminder: (id) => {
        set((state) => {
          const newState = {
            reminders: state.reminders.map(r => 
              r.id === id ? { ...r, completed: !r.completed } : r
            )
          };
          syncToCloud({ ...state, ...newState });
          return newState;
        });
      },

      updateVideoProgress: (videoId, seconds) => {
        set((state) => {
          const newState = {
            videoProgress: { ...state.videoProgress, [videoId]: seconds }
          };
          syncToCloud({ ...state, ...newState });
          return newState;
        });
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
      toggleMinimize: () => set((state) => ({ isMinimized: !state.isMinimized, isFullScreen: false }))
    }),
    {
      name: "drivecast-cloud-sync-v1",
    }
  )
);

if (typeof window !== "undefined") {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      useMediaStore.getState().loadFromFirestore(user.uid);
      onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists()) {
          useMediaStore.setState(snap.data() as any);
        }
      });
    }
  });
}
