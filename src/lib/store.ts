
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { YouTubeChannel, YouTubeVideo } from "./youtube";

export interface SavedPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface MediaState {
  favoriteChannels: YouTubeChannel[];
  savedVideos: YouTubeVideo[];
  starredChannelIds: string[];
  savedPlaces: SavedPlace[];
  addChannel: (channel: YouTubeChannel) => void;
  removeChannel: (id: string) => void;
  toggleSaveVideo: (video: YouTubeVideo) => void;
  removeVideo: (id: string) => void;
  toggleStarChannel: (id: string) => void;
  savePlace: (place: SavedPlace) => void;
  removePlace: (id: string) => void;
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
  },
  {
    id: "UCZPY2lpYyo6Y5mxk2CczJXg",
    title: "عبدالرحمن السديس",
    description: "القناة الرسمية لتلاوات معالي الشيخ د. عبدالرحمن السديس",
    thumbnail: "https://yt3.ggpht.com/ytc/AIdro_n_Hn6f_x-xS7_l7HlX7-0O_HjX3_8_H_7_8=s800-c-k-c0xffffffff-no-rj-mo",
  },
  {
    id: "UCCoB7Hf8gjQzpAyzhvx7Ktg",
    title: "عبدالله الجهني",
    description: "تلاوات القارئ عبدالله الجهني من الحرم المكي الشريف",
    thumbnail: "https://yt3.ggpht.com/ckmdnEWNTubbWiNkxeW_-I3IR7UXAT4BsDmoS2I17J_xBlRqenu6kKLtakiJUg0YoIDx8SYpmQ=s800-c-k-c0xffffffff-no-rj-mo",
  },
  {
    id: "UCg68G-zCVpAFbOhg1ZHnW6A",
    title: "بندر بليلة",
    description: "تلاوات خاشعة من الحرم المكي الشريف بصوت الشيخ بندر بليلة",
    thumbnail: "https://yt3.ggpht.com/F0E3JTirKfg4_OQE63lTukKWHe8XKP7GgrmtcFOqsPYGLZ5b4oglfKl7_7ycLLw79-ZmIVWuBQ=s800-c-k-c0xffffffff-no-rj-mo",
  },
  {
    id: "UC-G8RL7iYJt5L_-7F5bRKLA",
    title: "مشاري راشد العفاسي",
    description: "القناة الرسمية للشيخ مشاري راشد العفاسي",
    thumbnail: "https://yt3.ggpht.com/5GnsOyTlPel6nD1qIFYWjQO_khnkQb4y6DOc37wjB44d23GAw5KfixWRpzN9Hi2ZxwFISY16=s800-c-k-c0xffffffff-no-rj-mo",
  },
  {
    id: "UClncV9OLPto_MinRzGfjr2g",
    title: "رعد الكردي",
    description: "القناة الرسمية للقارئ رعد الكردي - تلاوات قرآنية",
    thumbnail: "https://yt3.ggpht.com/ytc/AIdro_n_Hn6f_x-xS7_l7HlX7-0O_HjX3_8_H_7_8=s800-c-k-c0xffffffff-no-rj-mo",
  }
];

export const useMediaStore = create<MediaState>()(
  persist(
    (set) => ({
      favoriteChannels: INITIAL_CHANNELS,
      savedVideos: [],
      starredChannelIds: [],
      savedPlaces: [],
      addChannel: (channel) =>
        set((state) => ({
          favoriteChannels: state.favoriteChannels.some(c => c.id === channel.id)
            ? state.favoriteChannels
            : [...state.favoriteChannels, channel],
        })),
      removeChannel: (id) =>
        set((state) => ({
          favoriteChannels: state.favoriteChannels.filter((c) => c.id !== id),
          starredChannelIds: state.starredChannelIds.filter(i => i !== id),
        })),
      toggleSaveVideo: (video) =>
        set((state) => {
          const isSaved = state.savedVideos.some(v => v.id === video.id);
          return {
            savedVideos: isSaved
              ? state.savedVideos.filter(v => v.id !== video.id)
              : [video, ...state.savedVideos]
          };
        }),
      removeVideo: (id) =>
        set((state) => ({
          savedVideos: state.savedVideos.filter(v => v.id !== id),
        })),
      toggleStarChannel: (id) =>
        set((state) => ({
          starredChannelIds: state.starredChannelIds.includes(id)
            ? state.starredChannelIds.filter(i => i !== id)
            : [...state.starredChannelIds, id]
        })),
      savePlace: (place) =>
        set((state) => ({
          savedPlaces: state.savedPlaces.some(p => p.id === place.id)
            ? state.savedPlaces
            : [place, ...state.savedPlaces]
        })),
      removePlace: (id) =>
        set((state) => ({
          savedPlaces: state.savedPlaces.filter(p => p.id !== id)
        }))
    }),
    {
      name: "drivecast-media-storage-v7",
    }
  )
);
