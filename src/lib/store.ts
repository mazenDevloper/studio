"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface MediaState {
  favoriteChannels: string[];
  addChannel: (name: string) => void;
  removeChannel: (name: string) => void;
}

export const useMediaStore = create<MediaState>()(
  persist(
    (set) => ({
      favoriteChannels: ["NASA", "Veritasium", "Marques Brownlee"],
      addChannel: (name) =>
        set((state) => ({
          favoriteChannels: state.favoriteChannels.includes(name)
            ? state.favoriteChannels
            : [...state.favoriteChannels, name],
        })),
      removeChannel: (name) =>
        set((state) => ({
          favoriteChannels: state.favoriteChannels.filter((c) => c !== name),
        })),
    }),
    {
      name: "drivecast-media-storage",
    }
  )
);
