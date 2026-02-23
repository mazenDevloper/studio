
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { YouTubeChannel, YouTubeVideo } from "./youtube";

interface MediaState {
  favoriteChannels: YouTubeChannel[];
  savedVideos: YouTubeVideo[];
  starredChannelIds: string[];
  addChannel: (channel: YouTubeChannel) => void;
  removeChannel: (id: string) => void;
  toggleSaveVideo: (video: YouTubeVideo) => void;
  removeVideo: (id: string) => void;
  toggleStarChannel: (id: string) => void;
}

const INITIAL_CHANNELS: YouTubeChannel[] = [
  {
    id: "UCX2s_ve9ufzgT25XGfd1SBtKHg",
    title: "ياسر الدوسري",
    description: "Official Channel for Sheikh Yasser Al-Dosari",
    thumbnail: "https://yt3.ggpht.com/X2s_ve9ufzgT25XGfd1SBtKHg5VcBNvAej1ylyhDGu3w7LV87iHxFr1kplWvKbW5pSGt0JBPCg=s800-c-k-c0xffffffff-no-rj-mo",
  },
  {
    id: "UCcVuD7Cc-Fwb--OdB5BdiaPJBM",
    title: "الشيخ / محمد سطوحي",
    description: "تلاوات نادرة ومميزة للشيخ محمد سطوحي",
    thumbnail: "https://yt3.ggpht.com/cVuD7Cc-Fwb--OdB5BdiaPJBM298xwIdeKCjz_pmdSdwzNMFMFFebOAeqd3eL5fCFjnBnz73YQ=s800-c-k-c0xffffffff-no-rj-mo",
  },
  {
    id: "UCF0E3JTirKfg4_OQE63lTukKWHe",
    title: "القارئ بندر بليلة",
    description: "تلاوات خاشعة من الحرم المكي الشريف",
    thumbnail: "https://yt3.ggpht.com/F0E3JTirKfg4_OQE63lTukKWHe8XKP7GgrmtcFOqsPYGLZ5b4oglfKl7_7ycLLw79-ZmIVWuBQ=s800-c-k-c0xffffffff-no-rj-mo",
  },
  {
    id: "UCSQYZDoLUuyvzu5HJ5Uf1-qXwF",
    title: "Mohammed Al-Ghazali - محمد الغزالي",
    description: "Official YouTube Channel",
    thumbnail: "https://yt3.ggpht.com/SQYZDoLUuyvzu5HJ5Uf1-qXwFkmXZcf6ZJZI_GHMvLiVpCvTwCL3NdTE1h5kgDhNcVKa-o0U=s800-c-k-c0xffffffff-no-rj-mo",
  },
  {
    id: "UCmttn8Fi1dFyisdiB1LsDFcUPl",
    title: "أحمد النفيس",
    description: "القارئ أحمد النفيس - Ahmad Alnufais",
    thumbnail: "https://yt3.ggpht.com/mttn8Fi1dFyisdiB1LsDFcUPlxSmm-Yoy6I5WkwWNCsAcdbh6ND1ZeECYGN6l4C9FQ4GQrDo=s800-c-k-c0xffffffff-no-rj-mo",
  },
  {
    id: "UC5GnsOyTlPel6nD1qIFYWjQO_kh",
    title: "مشاري راشد العفاسي",
    description: "Official Channel for Sheikh Mishary Rashid Alafasy",
    thumbnail: "https://yt3.ggpht.com/5GnsOyTlPel6nD1qIFYWjQO_khnkQb4y6DOc37wjB44d23GAw5KfixWRpzN9Hi2ZxwFISY16=s800-c-k-c0xffffffff-no-rj-mo",
  },
  {
    id: "UCAIdro_ntYo8pMC0zWibiCLFYos",
    title: "قناة داوود للأطفال - Dawood Kids TV",
    description: "Educational and religious content for children",
    thumbnail: "https://yt3.ggpht.com/ytc/AIdro_ntYo8pMC0zWibiCLFYosY7m4WOaDh4nVeaw84atUNEqwQ=s800-c-k-c0xffffffff-no-rj-mo",
  },
  {
    id: "UCckmdnEWNTubbWiNkxeW_-I3IR7",
    title: "تلاوات د. عبدالله الجهني",
    description: "تلاوات القارئ عبدالله الجهني من الحرم المكي",
    thumbnail: "https://yt3.ggpht.com/ckmdnEWNTubbWiNkxeW_-I3IR7UXAT4BsDmoS2I17J_xBlRqenu6kKLtakiJUg0YoIDx8SYpmQ=s800-c-k-c0xffffffff-no-rj-mo",
  },
  {
    id: "UCpoZvZ08zfMzOd8PqxYKcsgUUKH",
    title: "احمد المزجاجي ــ Ahmed Al-Mazjaji",
    description: "Official YouTube Channel",
    thumbnail: "https://yt3.ggpht.com/poZvZ08zfMzOd8PqxYKcsgUUKHA1riIjQEvmTpQ75JlnDoZL5UmhHaih55_9hDa5I9Knrp3sLA=s800-c-k-c0xffffffff-no-rj-mo",
  },
  {
    id: "UCAIdro_kwdfJiL1KQ6PvXpL3Vvh",
    title: "Belal.Banikhaled",
    description: "Quran Recitations by Belal Banikhaled",
    thumbnail: "https://yt3.ggpht.com/ytc/AIdro_kwdfJiL1KQ6PvXpL3VvhMKXUklxW8Tc9Mqs9L7xSKcFLs=s800-c-k-c0xffffffff-no-rj-mo",
  },
  {
    id: "UCPdawCAArIWhRTi3Df2J66-8DBt",
    title: "بدر التركي",
    description: "Official YouTube Channel for Sheikh Badr Al-Turki",
    thumbnail: "https://yt3.ggpht.com/PdawCAArIWhRTi3Df2J66-8DBtIcd_zzuESQKmhUZP6p9sp8oeo4-giyePJN3LqY5MuCi6G8=s800-c-k-c0xffffffff-no-rj-mo",
  },
  {
    id: "UCBbRDWckjm5xAaxk6bMLHFVSlu2",
    title: "بلال الجهماني | Belal Algohmani",
    description: "تلاوات عطرة بصوت بلال الجهماني",
    thumbnail: "https://yt3.ggpht.com/BbRDWckjm5xAaxk6bMLHFVSlu2ghh6-X2m-2iUPTMvPgi70gis7fX75FQxZ-na5WcULFiD0nzA=s800-c-k-c0xffffffff-no-rj-mo",
  },
  {
    id: "UCIW2Q22rajzVrVg3FmuVjP2z1_Bl",
    title: "منصور السالمي",
    description: "Official Channel for Sheikh Mansour Al-Salmi",
    thumbnail: "https://yt3.ggpht.com/IW2Q22rajzVrVg3FmuVjP2z1_BlKBPKqbLQjnDoI622ufZ-gi5kFfP_ojOr3YdB1JN0i3g6ORg=s800-c-k-c0xffffffff-no-rj-mo",
  },
  {
    id: "UC_SAUD_AL_SHURAIM",
    title: "سعود الشريم",
    description: "تلاوات الشيخ سعود الشريم",
    thumbnail: "https://tvquran.com/uploads/authors/images/%D8%B3%D8%B9%D9%88%D8%AF%20%D8%A7%D9%84%D8%B4%D8%B1%D9%8A%D9%85.jpg",
  },
  {
    id: "UCAIdro_nobk47Xi_lsPQp1KJ8d7",
    title: "عبدالعزيز العسيري",
    description: "Official Channel for Sheikh Abdulaziz Al-Asiri",
    thumbnail: "https://yt3.ggpht.com/ytc/AIdro_nobk47Xi_lsPQp1KJ8d7LBPK8CCFLN2KToZ2IPOxinXNo=s800-c-k-c0xffffffff-no-rj-mo",
  },
  {
    id: "UCmHTg3RIX-a3NAR22lAnOvSq3-U",
    title: "تلاوات الشيخ د. عبدالله القرافي إمام المسجد النبوي",
    description: "تلاوات خاشعة بصوت د. عبدالله القرافي",
    thumbnail: "https://yt3.ggpht.com/mHTg3RIX-a3NAR22lAnOvSq3-U_KBcL_Ax4FTNirc3flsb5OU8RWksKu6X8Ush9JhO0EOxxAwQY=s800-c-k-c0xffffffff-no-rj-mo",
  },
  {
    id: "UCmAkE9bS5QtQZrJgeL7btOlv24J",
    title: "القارىء إسلام صبحي Islam Sobhi",
    description: "Official Channel for Islam Sobhi",
    thumbnail: "https://yt3.ggpht.com/mAkE9bS5QtQZrJgeL7btOlv24JXrJzOvo12V2R1eZ16uY3NkjSn29xeCuiLSuiiXp1C8jf6WgQ=s800-c-k-c0xffffffff-no-rj-mo",
  }
];

export const useMediaStore = create<MediaState>()(
  persist(
    (set) => ({
      favoriteChannels: INITIAL_CHANNELS,
      savedVideos: [],
      starredChannelIds: [],
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
    }),
    {
      name: "drivecast-media-storage-v5",
    }
  )
);
