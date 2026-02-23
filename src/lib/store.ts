
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { YouTubeChannel, YouTubeVideo } from "./youtube";

interface MediaState {
  favoriteChannels: YouTubeChannel[];
  savedVideos: YouTubeVideo[];
  addChannel: (channel: YouTubeChannel) => void;
  removeChannel: (id: string) => void;
  toggleSaveVideo: (video: YouTubeVideo) => void;
  removeVideo: (id: string) => void;
}

export const useMediaStore = create<MediaState>()(
  persist(
    (set) => ({
      favoriteChannels: [
        {
          id: "UCsTcErHi8EzuyclrGwstR0w",
          title: "NASA",
          description: "NASA's official YouTube channel",
          thumbnail: "https://picsum.photos/seed/nasa/400/225",
        },
        {
          id: "UCHnyfMqiRRG1u-2MsSQLbXA",
          title: "Veritasium",
          description: "An element of truth - Science and engineering videos",
          thumbnail: "https://picsum.photos/seed/science/400/225",
        },
        {
          id: "UCBJycsmduvYELg8gcM3nQvg",
          title: "Marques Brownlee",
          description: "Quality Tech Videos",
          thumbnail: "https://picsum.photos/seed/tech/400/225",
        }
      ],
      savedVideos: [],
      addChannel: (channel) =>
        set((state) => ({
          favoriteChannels: state.favoriteChannels.some(c => c.id === channel.id)
            ? state.favoriteChannels
            : [...state.favoriteChannels, channel],
        })),
      removeChannel: (id) =>
        set((state) => ({
          favoriteChannels: state.favoriteChannels.filter((c) => c.id !== id),
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
    }),
    {
      name: "drivecast-media-storage-v3",
    }
  )
);
