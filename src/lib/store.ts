
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { sameTeam } from "@/lib/match-core";
import { DEFAULT_FAVORITE_TEAMS } from "@/lib/favorite-teams";
import { YouTubeChannel, YouTubeVideo } from "./youtube";
export type { YouTubeChannel, YouTubeVideo } from "./youtube";
import { 
  JSONBIN_MASTER_KEY, 
  JSONBIN_MASTER_BIN_ID,
  JSONBIN_CHANNELS_BIN_ID,
  JSONBIN_POPULAR_RECITERS_BIN_ID,
  JSONBIN_IPTV_FAVS_BIN_ID,
  JSONBIN_MANUSCRIPTS_BIN_ID,
  JSONBIN_FONTS_BIN_ID,
  JSONBIN_BACKGROUNDS_BIN_ID,
  JSONBIN_PRAYER_TIMES_BIN_ID,
  prayerTimesData
} from "./constants";

export interface AudioTrack {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle?: string;
}

/** Local calendar day, YYYY-MM-DD. */
export const localDay = (d: Date = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** A reminder / zikr counts as done only on the day it was marked done. */
export const isDoneToday = (r: { completedOn?: string }) => !!r.completedOn && r.completedOn === localDay();

export interface Reminder {
  id: string; 
  label: string; 
  color: string; 
  iconType: 'play' | 'bell' | 'circle' | 'match'; 
  startType: 'azan' | 'iqamah' | 'manual'; 
  startReference?: string; 
  startOffset: number;
  endType: 'azan' | 'iqamah' | 'manual' | 'duration' | 'prayer'; 
  endReference?: string; 
  endOffset: number;
  manualStartTime?: string; 
  manualEndTime?: string; 
  durationMinutes?: number;
  showCountdown: boolean; 
  showCountup: boolean; 
  completed: boolean; 
  /** the local day (YYYY-MM-DD) it was marked done: "done" lasts that day only and resets the next day */
  completedOn?: string;
  /** when it was marked done (ms): the island shows it as done for an hour, then hides it */
  completedAt?: number;
  countdownWindow: number;
  homeLogo?: string;
  awayLogo?: string;
  matchDate?: string;
  homeName?: string;
  awayName?: string;
}

export interface Playlist {
  id: string;
  name: string;
  videos: YouTubeVideo[];
}

export interface PrayerSetting {
  id: string; name: string; offsetMinutes: number; showCountdown: boolean; countdownWindow: number;
  showCountup: boolean; countupWindow: number; iqamahDuration: number;
}

export interface MapSettings {
  zoom: number; tilt: number; carScale: number; backgroundIndex: number; showManuscriptBg: boolean;
  manuscriptBgUrl: string; fontScale: number; manuscriptColor: string; showManuscriptOnMoon: boolean;
  moonManuIdx: number; hue: number; saturation: number; brightness: number;
  winwinUrl?: string; beinUrl?: string;
  omanUrl?: string; bein1Url?: string; mbc1Url?: string;
  invertJoystickX?: boolean; invertJoystickY?: boolean;
  autoRotateNav90?: boolean;
}

export interface IptvChannel {
  name: string; stream_id: string; stream_icon: string; category_id: string; starred?: boolean;
  url?: string; type?: 'iptv' | 'web' | 'live'; stream_type?: string; displayNumber?: number; group?: string;
  /** broadcast-name keys (see match-channels.ts) the user linked to this channel from a match card */
  matchAliases?: string[];
}

export interface FavoriteTeam { id: number; name: string; logo: string; /** the club's country (tells Liverpool of England from Liverpool of Uruguay) */ country?: string;
  /** false = its matches stay on the matches page only, not in the floating island (default: shown) */ island?: boolean; }
/** A video saved to resume later from where it was stopped (synced with the master bin). */
export interface ContinueItem { video: YouTubeVideo; progress: number; savedAt: number; }
/** A match pinned as a floating island (synced to the cloud with the master bin). */
export interface PinnedMatch { id: string; home: string; away: string; }

export interface ManuscriptWord { id: string; text: string; x: number; y: number; scale: number; }

export interface Manuscript {
  id: string; type: 'text' | 'image'; content: string; words?: ManuscriptWord[];
  fontFamily?: string; pngDataUrl?: string; x?: number; y?: number; scale?: number;
}

export type MappingContext = 'global' | 'player' | 'dashboard' | 'media' | 'quran' | 'football' | 'iptv' | 'settings';

export type AppAction = 
  | 'nav_up' | 'nav_down' | 'nav_left' | 'nav_right' | 'nav_ok' | 'nav_scroll_up' | 'nav_scroll_down'
  | 'toggle_star' | 'delete_item' | 'toggle_reorder'
  | 'goto_home' | 'goto_media' | 'goto_quran' | 'goto_hihi2' | 'goto_iptv' | 'goto_football' | 'goto_settings' | 'goto_car_dashboard' | 'goto_matches'
  | 'player_next' | 'player_prev' | 'player_save' | 'player_fullscreen' | 'player_playlist' | 'player_minimize' | 'player_close' | 'player_settings' | 'player_mode'
  | 'focus_search' | 'focus_reciters' | 'focus_surahs'
  | 'inc_zoom' | 'dec_zoom' | 'inc_font' | 'dec_font' | 'next_manuscript' | 'prev_manuscript';

interface MediaState {
  favoriteChannels: YouTubeChannel[]; savedVideos: YouTubeVideo[]; videoProgress: Record<string, number>;
  continueWatching: ContinueItem[];
  saveForContinue: (video: YouTubeVideo, progress: number) => void; removeContinue: (videoId: string) => void;
  /** Make sure the data a screen shows is loaded; fetch its cloud bins again if it is empty (or when forced). */
  ensureScreenData: (href: string, force?: boolean) => Promise<void>;
  favoriteTeams: FavoriteTeam[]; pinnedMatches: PinnedMatch[]; seededTeamsV1: boolean; favoriteLeagueIds: number[]; belledMatchIds: string[]; skippedMatchIds: string[];
  /** the user's default channels per league (league key -> channel names), shown first on every match card */
  leagueChannelOverrides: Record<string, string[]>;
  /** followed competitions (league keys "country|name"): always listed on the matches page, not favourites */
  followedLeagues: string[];
  skippedReminderIds: string[]; favoriteIptvChannels: IptvChannel[]; favoriteReciters: YouTubeChannel[];
  favoritePodcasts: YouTubeChannel[];
  iptvPlaylist: IptvChannel[]; iptvPlaylistIndex: number; prayerTimes: any[]; prayerSettings: PrayerSetting[];
  reminders: Reminder[]; generalAzkar: Reminder[]; customManuscripts: Manuscript[]; manuscriptScales: Record<string, number>;
  customFonts: { name: string, url: string }[]; customWallBackgrounds: string[]; mapSettings: MapSettings;
  playlists: Playlist[]; isLooping: boolean;
  displayScale: number; dockScale: number; keyMappings: Record<string, Record<string, string[]>>; 
  activeVideo: YouTubeVideo | null; lastPlayedVideo: YouTubeVideo | null; activeIptv: IptvChannel | null;
  activeAudio: AudioTrack | null;
  activeQuranUrl: string | null; playlist: YouTubeVideo[]; playlistIndex: number; isPlaying: boolean;
  isMinimized: boolean; isFullScreen: boolean; isPlayerControlsExpanded: boolean; isPlayerPlaylistOpen: boolean;
  gridMode: 'hidden' | 'partial' | 'full'; dockSide: 'left' | 'right'; showIslands: boolean;
  autoHideIsland: boolean; isSidebarShrinked: boolean; wallPlateType: 'moon' | 'manuscript' | null;
  wallPlateData: any | null; isReorderMode: boolean; isRecordingKey: boolean;
  recordingAction: { ctx: MappingContext, act: AppAction } | null; isInitialLoading: boolean; aiSuggestions: any[]; pickedUpId: string | null;

  setPickedUpId: (id: string | null) => void; setIsRecordingKey: (val: boolean) => void;
  setRecordingAction: (val: { ctx: MappingContext, act: AppAction } | null) => void;
  setIsSidebarShrinked: (val: boolean) => void; setDockScale: (val: number) => void; setDisplayScale: (val: number) => void;
  setGridMode: (mode: 'hidden' | 'partial' | 'full') => void; setIsPlayerControlsExpanded: (val: boolean) => void;
  setIsPlayerPlaylistOpen: (val: boolean) => void;
  
  selectedChannel: YouTubeChannel | null; channelVideos: YouTubeVideo[]; videoResults: YouTubeVideo[];
  setSelectedChannel: (ch: YouTubeChannel | null) => void; setChannelVideos: (vids: YouTubeVideo[]) => void;

  addChannel: (channel: YouTubeChannel) => void; removeChannel: (channelid: string) => void;
  reorderChannelTo: (fromId: string, toId: string) => void; addReciter: (channel: YouTubeChannel) => void;
  removeReciter: (channelid: string) => void; updateReciterName: (channelid: string, newName: string) => void;
  incrementReciterClick: (channelid: string) => void; 
  addPodcast: (channel: YouTubeChannel) => void; removePodcast: (channelid: string) => void;
  toggleSaveVideo: (video: YouTubeVideo) => void;
  removeVideo: (id: string) => void; toggleStarChannel: (channelid: string) => void;
  addReminder: (reminder: Reminder) => void; updateReminder: (id: string, reminder: Partial<Reminder>) => void;
  removeReminder: (id: string) => void; toggleReminder: (id: string) => void; completeReminder: (id: string) => void; skipReminder: (id: string) => void; skipMatch: (id: string) => void; unskipMatch: (id: string) => void;
  addAzkar: (azkar: Reminder) => void; updateAzkar: (id: string, azkar: Partial<Reminder>) => void;
  removeAzkar: (id: string) => void;
  addPlaylist: (name: string, videos?: YouTubeVideo[]) => Playlist; removePlaylist: (id: string) => void; addVideoToPlaylist: (playlistId: string, video: YouTubeVideo) => void;
  removeVideoFromPlaylist: (playlistId: string, videoId: string) => void; toggleLooping: () => void;
  addCustomFont: (name: string, url: string) => void; removeCustomFont: (name: string, url: string) => void;
  addCustomWallBackground: (url: string) => void; removeCustomWallBackground: (url: string) => void;
  toggleFavoriteTeam: (team: FavoriteTeam) => void; toggleBelledMatch: (matchId: string) => void;
  /** star on a match card: add the team, or remove it (by id, else by its full name); synced to the cloud */
  setFavoriteTeam: (team: FavoriteTeam, on: boolean) => void;
  setFavoriteTeamIsland: (name: string, island: boolean) => void;
  toggleFollowLeague: (leagueKey: string) => void;
  /** bell on a match card: goal animation on/off for that match (favourites default on); synced to the cloud */
  toggleGoalAlert: (matchKey: string, defaultOn: boolean) => void;
  setLeagueChannels: (leagueKey: string, channels: string[] | null) => void;
  toggleFavoriteIptvChannel: (channel: IptvChannel) => void; updateIptvChannel: (streamId: string, updates: Partial<IptvChannel>) => void;
  addIptvChannel: (channel: IptvChannel) => void;
  /** Link a match broadcast name (its channelKey) to one favourite channel; null removes the link. Synced to the cloud. */
  linkIptvAlias: (aliasKey: string, streamId: string | null) => void;
  reorderIptvChannelTo: (fromId: string, toId: string) => void; updateMapSettings: (settings: Partial<MapSettings>) => void;
  setActiveVideo: (video: YouTubeVideo | null, context?: YouTubeVideo[]) => void;
  setActiveIptv: (channel: IptvChannel | null, context?: IptvChannel[], keepWindow?: boolean) => void;
  setActiveAudio: (audio: AudioTrack | null) => void;
  setActiveQuranUrl: (url: string | null) => void; setPlaylist: (videos: YouTubeVideo[]) => void;
  nextTrack: () => void; prevTrack: () => void; nextIptvChannel: () => void; prevIptvChannel: () => void; updateVideoProgress: (videoId: string, progress: number) => void;
  setIsPlaying: (playing: boolean) => void; setIsMinimized: (minimized: boolean) => void;
  setIsFullScreen: (fullScreen: boolean) => void; cyclePlayerMode: () => void;
  setWallPlate: (type: 'moon' | 'manuscript' | null, data?: any) => void;
  toggleDockSide: () => void; toggleShowIslands: () => void; toggleReorderMode: () => void;
  resetMediaView: () => void; setAiSuggestions: (suggestions: any[]) => void;
  setKeyMapping: (ctx: MappingContext, act: AppAction, key: string) => void;
  removeSpecificKeyMapping: (ctx: MappingContext, act: AppAction, key: string) => void;
  
  addManuscript: (manuscript: Manuscript) => void; updateManuscript: (id: string, updates: Partial<Manuscript>) => void;
  removeManuscript: (id: string) => void; updateManuscriptScale: (id: string, scale: number) => void;
  updatePrayerSetting: (id: string, updates: Partial<PrayerSetting>) => void;

  fetchPriorityData: (context: 'dashboard' | 'media' | 'all') => Promise<void>;
  fetchSpecificBin: (id: string) => Promise<void>;
  syncMasterBin: () => Promise<void>;
  togglePinnedMatch: (m: PinnedMatch) => void;
  saveIptvReorder: () => Promise<void>;
  saveChannelsReorder: () => Promise<void>;
  saveRecitersAndPodcasts: () => Promise<void>;
  saveManuscriptsReorder: () => Promise<void>;
}

/** First candidate that is an array: a bin that comes back empty or in another shape must not crash the app. */
const arr = (...candidates: any[]): any[] => candidates.find(Array.isArray) ?? [];

/** Bins that were read from the cloud in this session. */
const loadedBins = new Set<string>();
/** Last cloud copy of the master bin (keys this version doesn't know are kept when saving). */
let lastMasterCloud: Record<string, any> = {};
/** Master-bin fields as they were when the app started (after the local cache was restored). */
let masterBaseline: Record<string, string> | null = null;

/** Bins whose whole content is replaced by every save: never written before they were read in this session. */
const LOAD_BEFORE_SAVE = new Set<string>([
  JSONBIN_MASTER_BIN_ID, JSONBIN_IPTV_FAVS_BIN_ID, JSONBIN_CHANNELS_BIN_ID, JSONBIN_POPULAR_RECITERS_BIN_ID,
  JSONBIN_MANUSCRIPTS_BIN_ID, JSONBIN_FONTS_BIN_ID, JSONBIN_BACKGROUNDS_BIN_ID,
]);

export const updateBin = async (binId: string, data: any) => {
  if (LOAD_BEFORE_SAVE.has(binId) && !loadedBins.has(binId)) {
    // The payload was built from a state that never saw the cloud copy (start-up fetch failed or is still running):
    // saving it would wipe whatever this device doesn't have. Load the cloud copy instead and skip this save.
    await useMediaStore.getState().fetchSpecificBin(binId);
    return;
  }
  try {
    await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json', 
        'X-Master-Key': JSONBIN_MASTER_KEY, 
        'X-Bin-Versioning': 'true' 
      },
      mode: 'cors', body: JSON.stringify(data)
    });
  } catch (e) {}
};

const DEFAULT_CONTEXT_MAPPINGS: Record<string, Record<string, string[]>> = {
  global: { 
    nav_up: ['ArrowUp', '2'], 
    nav_down: ['ArrowDown', '8'], 
    nav_left: ['ArrowLeft', '4'], 
    nav_right: ['ArrowRight', '6'], 
    nav_ok: ['Enter', '5'], 
    nav_scroll_up: ['PageUp'], 
    nav_scroll_down: ['PageDown'], 
    goto_home: ['1'], 
    goto_media: ['3'], 
    goto_quran: ['7'], 
    goto_hihi2: ['9'], 
    goto_iptv: ['0'], 
    goto_football: ['*'], 
    goto_settings: [], 
    goto_car_dashboard: [],
    goto_matches: [],
    delete_item: ['Red'], 
    toggle_star: ['Yellow'], 
    toggle_reorder: ['Blue'] 
  },
  player: { 
    player_next: ['ChannelUp', '3'], 
    player_prev: ['PageDown', '1'], 
    player_save: ['3'], 
    player_close: ['Red'], 
    player_playlist: ['Blue'], 
    player_minimize: ['Green'], 
    player_settings: ['Yellow'], 
    player_fullscreen: ['8'], 
    player_mode: ['Info'] 
  },
  dashboard: {}, 
  media: { focus_search: ['0'], focus_reciters: ['1'], focus_surahs: ['2'] }, 
  quran: { focus_search: ['0'], focus_reciters: ['1'], focus_surahs: ['2'] }, 
  football: {}, 
  iptv: {}, 
  settings: {}
};

const DEFAULT_PRAYER_SETTINGS: PrayerSetting[] = [
  { id: 'fajr', name: 'الفجر', offsetMinutes: 0, showCountdown: true, countdownWindow: 25, showCountup: true, countupWindow: 30, iqamahDuration: 25 },
  { id: 'sunrise', name: 'الشروق', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 5, iqamahDuration: 0 },
  { id: 'dhuhr', name: 'الظهر', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 25, iqamahDuration: 20 },
  { id: 'asr', name: 'العصر', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 25, iqamahDuration: 20 },
  { id: 'maghrib', name: 'المغرب', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 15, iqamahDuration: 10 },
  { id: 'isha', name: 'العشاء', offsetMinutes: 0, showCountdown: true, countdownWindow: 20, showCountup: true, countupWindow: 25, iqamahDuration: 20 },
];

/** Lists changed on this device before the cloud copy arrived: cloud items plus the local ones (local wins per id). */
function mergeLists(cloud: unknown, local: unknown): unknown {
  if (!Array.isArray(cloud) || !Array.isArray(local)) return local;
  const key = (x: any) => (typeof x === 'string' || typeof x === 'number' ? String(x) : x?.id ?? x?.video?.id ?? JSON.stringify(x));
  const localByKey = new Map(local.map(x => [key(x), x]));
  const merged = cloud.map(x => (localByKey.has(key(x)) ? localByKey.get(key(x)) : x));
  const seen = new Set(cloud.map(key));
  return [...merged, ...local.filter(x => !seen.has(key(x)))];
}

/** Everything the master bin stores. */
function masterPayload(s: MediaState) {
  return {
    favoriteTeams: s.favoriteTeams, pinnedMatches: s.pinnedMatches, seededTeamsV1: s.seededTeamsV1, continueWatching: s.continueWatching,
    favoriteLeagueIds: s.favoriteLeagueIds, belledMatchIds: s.belledMatchIds, skippedMatchIds: s.skippedMatchIds, prayerSettings: s.prayerSettings,
    leagueChannelOverrides: s.leagueChannelOverrides, followedLeagues: s.followedLeagues,
    reminders: s.reminders, generalAzkar: s.generalAzkar, mapSettings: s.mapSettings, keyMappings: s.keyMappings, savedVideos: s.savedVideos,
    manuscriptScales: s.manuscriptScales, lastPlayedVideo: s.lastPlayedVideo, playlists: s.playlists,
  };
}

export const useMediaStore = create<MediaState>()(
  persist(
    (set, get) => ({
      favoriteChannels: [], savedVideos: [], videoProgress: {}, continueWatching: [], favoriteTeams: [], pinnedMatches: [], seededTeamsV1: false, favoriteLeagueIds: [307, 39, 2, 140, 135], belledMatchIds: [], skippedMatchIds: [], leagueChannelOverrides: {}, followedLeagues: [], skippedReminderIds: [], favoriteIptvChannels: [], favoriteReciters: [], favoritePodcasts: [], iptvPlaylist: [], iptvPlaylistIndex: 0, prayerTimes: prayerTimesData, prayerSettings: DEFAULT_PRAYER_SETTINGS, reminders: [], generalAzkar: [], customManuscripts: [], manuscriptScales: {}, customFonts: [], customWallBackgrounds: [], playlists: [], isLooping: true,
      mapSettings: { zoom: 20.0, tilt: 65, carScale: 1.02, backgroundIndex: 0, showManuscriptBg: true, manuscriptBgUrl: "https://www.image2url.com/r2/default/images/1782382707952-d99447c6-bc60-475d-9406-5fd2ef320bd5.png", fontScale: 1.0, manuscriptColor: '#ffffff', showManuscriptOnMoon: true, moonManuIdx: 0, hue: 0, saturation: 100, brightness: 100, winwinUrl: "https://psee.io/9f4ngl", beinUrl: "https://idebsports.ly/matches", omanUrl: "https://player.mangomolo.com/v1/live?id=MTY8&channelid=MTYx&countries=Q0M%3D&filter=DENY&signature=3fd1e8dd84138a41bf33d93afd4a7f09&language=en&app_id=&fullscreen=yes&player_profile=&base_url=aHR0cHM6Ly9heW4ub20vbGl2ZS8xNjEvJUQ5JTgyJUQ5JTg2JUQ4JUE3JUQ4JUE5LSVEOCVCOSVEOSU4NSVEOCVBNyVEOSU4Ni0lRDklODUlRDglQTglRDglQTclRDglQjQlRDglQjE%3D&autoplay=false&vast=true", bein1Url: "https://online.aflam4you.net/zremb472.php/?vid=68&aflam_s=1&aflam_w=360&aflam_w=360&aflam_h=250&aflam_k=18311111", mbc1Url: "https://online.aflam4you.net/zremb472.php?vid=5&aflam_s=1&aflam_w=360&h=250&aflam_k=18311111", invertJoystickX: true, invertJoystickY: true, autoRotateNav90: true },
      displayScale: 1.0, dockScale: 1.0, keyMappings: DEFAULT_CONTEXT_MAPPINGS, activeVideo: null, lastPlayedVideo: null, activeIptv: null, activeAudio: null, activeQuranUrl: "https://quran.com/ar/radio?autoplay=1", playlist: [], playlistIndex: 0, isPlaying: false, isMinimized: false, isFullScreen: false, isPlayerControlsExpanded: false, isPlayerPlaylistOpen: false, gridMode: 'hidden', dockSide: 'left', showIslands: true, autoHideIsland: true, isSidebarShrinked: false, wallPlateType: null, wallPlateData: null, isReorderMode: false, isRecordingKey: false, recordingAction: null, isInitialLoading: true, aiSuggestions: [], pickedUpId: null,
      
      setPickedUpId: (id) => set({ pickedUpId: id }), setIsRecordingKey: (v) => set({ isRecordingKey: v }), setRecordingAction: (v) => set({ recordingAction: v }), setDockScale: (v) => set({ dockScale: v }), setDisplayScale: (v) => set({ displayScale: v }), setIsSidebarShrinked: (v) => set({ isSidebarShrinked: v }), setGridMode: (mode: 'hidden' | 'partial' | 'full') => set({ gridMode: mode }), setIsPlayerControlsExpanded: (v) => set({ isPlayerControlsExpanded: v }), setIsPlayerPlaylistOpen: (v) => set({ isPlayerPlaylistOpen: v }),
      selectedChannel: null, channelVideos: [], videoResults: [], setSelectedChannel: (v) => set({ selectedChannel: v }), setChannelVideos: (v) => set({ channelVideos: v }),

      fetchSpecificBin: async (binId) => {
        try {
          const r = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest?v=${Date.now()}`, { headers: { 'X-Master-Key': JSONBIN_MASTER_KEY, 'X-Bin-Meta': 'false' }, cache: 'no-store', signal: AbortSignal.timeout(12000) });
          if (!r.ok) return;
          const data = await r.json();
          loadedBins.add(binId);
          if (binId === JSONBIN_MASTER_BIN_ID && data && typeof data === 'object' && !Array.isArray(data)) lastMasterCloud = data;
          if (binId === JSONBIN_CHANNELS_BIN_ID) set({ favoriteChannels: arr(data?.channels, data) });
          else if (binId === JSONBIN_POPULAR_RECITERS_BIN_ID) {
            set({ 
              favoriteReciters: arr(data?.reciters).sort((a: any, b: any) => (b.clickschannel || 0) - (a.clickschannel || 0)),
              favoritePodcasts: arr(data?.podcasts)
            });
          }
          else if (binId === JSONBIN_IPTV_FAVS_BIN_ID) set({ favoriteIptvChannels: arr(data?.iptv, data?.channels) });
          else if (binId === JSONBIN_MANUSCRIPTS_BIN_ID) set({ customManuscripts: arr(data?.manuscripts, data) });
          else if (binId === JSONBIN_FONTS_BIN_ID) set({ customFonts: arr(data?.fonts, data) });
          else if (binId === JSONBIN_BACKGROUNDS_BIN_ID) set({ customWallBackgrounds: arr(data?.backgrounds, data) });
          else if (binId === JSONBIN_PRAYER_TIMES_BIN_ID) {
            // Merge the cloud days with the bundled ones (cloud wins for a date it has); if the bundle adds dates the
            // cloud doesn't have yet (e.g. a new month), push the merged list back so every device gets it.
            const cloud: any[] = Array.isArray(data) ? data : Array.isArray(data?.prayers) ? data.prayers : [];
            const byDate = new Map<string, any>();
            for (const d of prayerTimesData) byDate.set(d.date, d);
            for (const d of cloud) if (d?.date) byDate.set(d.date, d);
            const merged = Array.from(byDate.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
            set({ prayerTimes: merged });
            if (merged.length > cloud.length) updateBin(JSONBIN_PRAYER_TIMES_BIN_ID, Array.isArray(data) ? merged : { ...data, prayers: merged });
          }
          else if (binId === JSONBIN_MASTER_BIN_ID) set({ 
            // favourite teams + pinned matches follow the user to every device
            favoriteTeams: Array.isArray(data.favoriteTeams) ? data.favoriteTeams : get().favoriteTeams,
            favoriteLeagueIds: Array.isArray(data.favoriteLeagueIds) ? data.favoriteLeagueIds : get().favoriteLeagueIds,
            pinnedMatches: Array.isArray(data.pinnedMatches) ? data.pinnedMatches : get().pinnedMatches,
            seededTeamsV1: !!data.seededTeamsV1 || get().seededTeamsV1,
            skippedMatchIds: Array.isArray(data.skippedMatchIds) ? data.skippedMatchIds : get().skippedMatchIds,
            belledMatchIds: Array.isArray(data.belledMatchIds) ? data.belledMatchIds : get().belledMatchIds,
            followedLeagues: Array.isArray(data.followedLeagues) ? data.followedLeagues : get().followedLeagues,
            leagueChannelOverrides: data.leagueChannelOverrides && typeof data.leagueChannelOverrides === "object" && !Array.isArray(data.leagueChannelOverrides) ? data.leagueChannelOverrides : get().leagueChannelOverrides,
            reminders: Array.isArray(data.reminders) ? data.reminders : get().reminders, 
            generalAzkar: Array.isArray(data.generalAzkar) ? data.generalAzkar : get().generalAzkar, 
            prayerSettings: Array.isArray(data.prayerSettings) && data.prayerSettings.length ? data.prayerSettings : get().prayerSettings || DEFAULT_PRAYER_SETTINGS, 
            mapSettings: { ...get().mapSettings, ...data.mapSettings }, 
            keyMappings: data.keyMappings && typeof data.keyMappings === 'object' ? data.keyMappings : DEFAULT_CONTEXT_MAPPINGS, 
            savedVideos: Array.isArray(data.savedVideos) ? data.savedVideos : get().savedVideos,
            continueWatching: Array.isArray(data.continueWatching) ? data.continueWatching : get().continueWatching, 
            manuscriptScales: data.manuscriptScales || get().manuscriptScales, 
            lastPlayedVideo: data.lastPlayedVideo || get().lastPlayedVideo, 
            playlists: Array.isArray(data.playlists) ? data.playlists : get().playlists || []
          });
          // One-time: add the user's favourite teams (by name; ids are synthetic) and remember it in the cloud,
          // so a team removed later is not added back and every device gets the same list.
          if (binId === JSONBIN_MASTER_BIN_ID && !get().seededTeamsV1) {
            const current = get().favoriteTeams || [];
            const missing = DEFAULT_FAVORITE_TEAMS.filter(t => !current.some(c => c?.name && sameTeam(c.name, t.name)));
            set({ favoriteTeams: [...current, ...missing.map((t, i) => ({ id: -(Date.now() % 1e9) - i, name: t.name, logo: "" }))], seededTeamsV1: true });
            setTimeout(() => get().syncMasterBin(), 200);
          }
        } catch (e) {}
      },

      fetchPriorityData: async (context) => {
        // Everything loads in parallel (prayer times first in the queue); nothing waits for the master bin anymore.
        const all = [
          JSONBIN_PRAYER_TIMES_BIN_ID, JSONBIN_MASTER_BIN_ID, JSONBIN_IPTV_FAVS_BIN_ID, JSONBIN_CHANNELS_BIN_ID,
          JSONBIN_POPULAR_RECITERS_BIN_ID, JSONBIN_FONTS_BIN_ID, JSONBIN_MANUSCRIPTS_BIN_ID, JSONBIN_BACKGROUNDS_BIN_ID,
        ];
        // the start screen waits for the cloud at most 5s: one slow bin must not hold the whole app (the rest keeps loading)
        await Promise.race([Promise.allSettled(all.map(id => get().fetchSpecificBin(id))), new Promise(r => setTimeout(r, 5000))]);
        set({ isInitialLoading: false });
      },

      saveForContinue: (video, progress) => {
        const p = Math.max(0, Math.floor(progress));
        set((s) => ({
          continueWatching: [{ video, progress: p, savedAt: Date.now() }, ...s.continueWatching.filter(c => c.video.id !== video.id)].slice(0, 30),
          videoProgress: { ...s.videoProgress, [video.id]: p },
        }));
        setTimeout(() => get().syncMasterBin(), 100);
      },
      removeContinue: (videoId) => {
        set((s) => ({ continueWatching: s.continueWatching.filter(c => c.video.id !== videoId) }));
        setTimeout(() => get().syncMasterBin(), 100);
      },

      ensureScreenData: async (href, force = false) => {
        const s = get();
        const empty = (a: unknown) => !Array.isArray(a) || a.length === 0;
        const plan: Record<string, [string, boolean][]> = {
          '/media': [[JSONBIN_CHANNELS_BIN_ID, empty(s.favoriteChannels)], [JSONBIN_POPULAR_RECITERS_BIN_ID, empty(s.favoriteReciters)], [JSONBIN_MASTER_BIN_ID, empty(s.playlists) && empty(s.savedVideos)]],
          '/iptv': [[JSONBIN_IPTV_FAVS_BIN_ID, empty(s.favoriteIptvChannels)]],
          '/quran': [[JSONBIN_POPULAR_RECITERS_BIN_ID, empty(s.favoriteReciters)]],
          '/dashboard': [[JSONBIN_PRAYER_TIMES_BIN_ID, (s.prayerTimes?.length ?? 0) < 2], [JSONBIN_MASTER_BIN_ID, empty(s.reminders)], [JSONBIN_MANUSCRIPTS_BIN_ID, empty(s.customManuscripts)], [JSONBIN_BACKGROUNDS_BIN_ID, empty(s.customWallBackgrounds)]],
          '/car-dashboard': [[JSONBIN_PRAYER_TIMES_BIN_ID, (s.prayerTimes?.length ?? 0) < 2], [JSONBIN_MASTER_BIN_ID, empty(s.reminders)]],
          '/settings': [[JSONBIN_MASTER_BIN_ID, true], [JSONBIN_CHANNELS_BIN_ID, true], [JSONBIN_POPULAR_RECITERS_BIN_ID, true], [JSONBIN_IPTV_FAVS_BIN_ID, true], [JSONBIN_FONTS_BIN_ID, true], [JSONBIN_MANUSCRIPTS_BIN_ID, true], [JSONBIN_BACKGROUNDS_BIN_ID, true], [JSONBIN_PRAYER_TIMES_BIN_ID, true]],
        };
        const bins = (plan[href] || []).filter(([, isEmpty]) => force || isEmpty).map(([id]) => id);
        await Promise.allSettled(bins.map(id => get().fetchSpecificBin(id)));
      },

      togglePinnedMatch: (m) => {
        const same = (p: PinnedMatch) => p.id === m.id || (sameTeam(p.home, m.home) && sameTeam(p.away, m.away));
        set((s) => ({ pinnedMatches: s.pinnedMatches.some(same) ? s.pinnedMatches.filter(p => !same(p)) : [...s.pinnedMatches, m] }));
        setTimeout(() => get().syncMasterBin(), 100);
      },

      syncMasterBin: async () => {
        if (!loadedBins.has(JSONBIN_MASTER_BIN_ID)) {
          // Saving before the cloud copy was read would replace playlists, saved videos, reminders... with this
          // device's defaults. Read it first, then put back only what was changed here since start-up.
          const local = masterPayload(get());
          await get().fetchSpecificBin(JSONBIN_MASTER_BIN_ID);
          if (!loadedBins.has(JSONBIN_MASTER_BIN_ID)) return; // cloud unreachable: keep the cloud copy intact
          const cloud = masterPayload(get()) as Record<string, any>;
          const changed = Object.fromEntries(Object.entries(local)
            .filter(([k, v]) => masterBaseline && JSON.stringify(v) !== masterBaseline[k])
            .map(([k, v]) => [k, mergeLists(cloud[k], v)]));
          if (Object.keys(changed).length) set(changed as Partial<MediaState>);
        }
        await updateBin(JSONBIN_MASTER_BIN_ID, { ...lastMasterCloud, ...masterPayload(get()) });
      },

      saveIptvReorder: async () => await updateBin(JSONBIN_IPTV_FAVS_BIN_ID, { iptv: get().favoriteIptvChannels }),
      saveChannelsReorder: async () => await updateBin(JSONBIN_CHANNELS_BIN_ID, { channels: get().favoriteChannels }),
      saveRecitersAndPodcasts: async () => await updateBin(JSONBIN_POPULAR_RECITERS_BIN_ID, { reciters: get().favoriteReciters, podcasts: get().favoritePodcasts }),
      saveManuscriptsReorder: async () => await updateBin(JSONBIN_MANUSCRIPTS_BIN_ID, { manuscripts: get().customManuscripts }),

      addChannel: (ch) => set((s) => { const n = [...s.favoriteChannels.filter(i => i.channelid !== ch.channelid), ch]; setTimeout(() => get().saveChannelsReorder(), 100); return { favoriteChannels: n }; }),
      removeChannel: (id) => set((s) => { const n = s.favoriteChannels.filter(i => i.channelid !== id); setTimeout(() => get().saveChannelsReorder(), 100); return { favoriteChannels: n }; }),
      
      addReciter: (r) => set((s) => { const n = [...s.favoriteReciters.filter(i => i.channelid !== r.channelid), { ...r, clickschannel: (r as any).clickschannel || 0 }]; setTimeout(() => get().saveRecitersAndPodcasts(), 100); return { favoriteReciters: n }; }),
      removeReciter: (id) => set((s) => { const n = s.favoriteReciters.filter(i => i.channelid !== id); setTimeout(() => get().saveRecitersAndPodcasts(), 100); return { favoriteReciters: n }; }),
      updateReciterName: (id, name) => set((s) => { const n = s.favoriteReciters.map(r => r.channelid === id ? { ...r, name } : r); setTimeout(() => get().saveRecitersAndPodcasts(), 100); return { favoriteReciters: n }; }),
      incrementReciterClick: (id) => set((s) => { const n = s.favoriteReciters.map(r => r.channelid === id ? { ...r, clickschannel: (r.clickschannel || 0) + 1 } : r).sort((a, b) => (b.clickschannel || 0) - (a.clickschannel || 0)); setTimeout(() => get().saveRecitersAndPodcasts(), 100); return { favoriteReciters: n }; }),
      
      addPodcast: (p) => set((s) => { const n = [...s.favoritePodcasts.filter(i => i.channelid !== p.channelid), p]; setTimeout(() => get().saveRecitersAndPodcasts(), 100); return { favoritePodcasts: n }; }),
      removePodcast: (id) => set((s) => { const n = s.favoritePodcasts.filter(i => i.channelid !== id); setTimeout(() => get().saveRecitersAndPodcasts(), 100); return { favoritePodcasts: n }; }),

      toggleSaveVideo: (v) => set((s) => { const e = s.savedVideos.some(i => i.id === v.id); const n = e ? s.savedVideos.filter(i => i.id !== v.id) : [{ ...v, progress: 0 }, ...s.savedVideos]; setTimeout(() => get().syncMasterBin(), 100); return { savedVideos: n }; }),
      removeVideo: (id) => set((s) => ({ savedVideos: s.savedVideos.filter(v => v.id !== id) })),
      toggleStarChannel: (id) => set((s) => { const n = s.favoriteChannels.map(c => c.channelid === id ? { ...c, starred: !c.starred } : c); setTimeout(() => get().saveChannelsReorder(), 100); return { favoriteChannels: n }; }),
      toggleFavoriteIptvChannel: (ch) => set((s) => { const e = s.favoriteIptvChannels.some(c => c.stream_id === ch.stream_id); const n = e ? s.favoriteIptvChannels.filter(c => c.stream_id !== ch.stream_id) : [...s.favoriteIptvChannels, ch]; setTimeout(() => get().saveIptvReorder(), 100); return { favoriteIptvChannels: n }; }),
      updateIptvChannel: (id, updates) => set((s) => { const n = s.favoriteIptvChannels.map(ch => ch.stream_id === id ? { ...ch, ...updates } : ch); setTimeout(() => get().saveIptvReorder(), 100); return { favoriteIptvChannels: n }; }),
      linkIptvAlias: (key, streamId) => {
        if (!key) return;
        set((s) => ({
          favoriteIptvChannels: s.favoriteIptvChannels.map(ch => {
            const rest = (ch.matchAliases || []).filter(a => a !== key);
            const aliases = ch.stream_id === streamId ? [...rest, key] : rest;
            if (aliases.length === (ch.matchAliases || []).length && aliases.every((a, i) => a === ch.matchAliases?.[i])) return ch;
            return { ...ch, matchAliases: aliases.length ? aliases : undefined };
          }),
        }));
        setTimeout(() => get().saveIptvReorder(), 100);
      },
      addIptvChannel: (ch) => set((s) => { const n = [...s.favoriteIptvChannels, ch]; setTimeout(() => get().saveIptvReorder(), 100); return { favoriteIptvChannels: n }; }),
      reorderChannelTo: (f, t) => set((s) => { const l = [...s.favoriteChannels], fI = l.findIndex(i => i.channelid === f), tI = l.findIndex(i => i.channelid === t); if (fI === -1 || tI === -1) return s; const [m] = l.splice(fI, 1); l.splice(tI, 0, m); return { favoriteChannels: l }; }),
      reorderIptvChannelTo: (f, t) => set((s) => { const l = [...s.favoriteIptvChannels], fI = l.findIndex(i => i.stream_id === f), tI = l.findIndex(i => i.stream_id === t); if (fI === -1 || tI === -1) return s; const [m] = l.splice(fI, 1); l.splice(tI, 0, m); return { favoriteIptvChannels: l }; }),
      
      addPlaylist: (name, videos = []) => {
        const id = Date.now().toString();
        const p = { id, name, videos };
        set((s) => { const n = [...s.playlists, p]; return { playlists: n }; });
        setTimeout(() => get().syncMasterBin(), 200);
        return p;
      },
      removePlaylist: (id) => set((s) => { const n = s.playlists.filter(p => p.id !== id); setTimeout(() => get().syncMasterBin(), 100); return { playlists: n }; }),
      addVideoToPlaylist: (pId, v) => set((s) => { const n = s.playlists.map(p => p.id === pId ? { ...p, videos: [...p.videos.filter(vi => vi.id !== v.id), v] } : p); setTimeout(() => get().syncMasterBin(), 100); return { playlists: n }; }),
      removeVideoFromPlaylist: (pId, vId) => set((s) => { const n = s.playlists.map(p => p.id === pId ? { ...p, videos: p.videos.filter(vi => vi.id !== vId) } : p); setTimeout(() => get().syncMasterBin(), 100); return { playlists: n }; }),
      toggleLooping: () => set((s) => ({ isLooping: !s.isLooping })),

      addCustomFont: (name, url) => set((s) => { const n = [...s.customFonts.filter(f => f.name !== name), { name, url }]; updateBin(JSONBIN_FONTS_BIN_ID, { fonts: n }); return { customFonts: n }; }),
      removeCustomFont: (name, url) => set((s) => { const n = s.customFonts.filter(f => f.name !== name); updateBin(JSONBIN_FONTS_BIN_ID, { fonts: n }); return { customFonts: n }; }),
      addCustomWallBackground: (url) => set((s) => { const n = [...s.customWallBackgrounds.filter(u => u !== url), url]; updateBin(JSONBIN_BACKGROUNDS_BIN_ID, { backgrounds: n }); return { customWallBackgrounds: n }; }),
      removeCustomWallBackground: (url) => set((s) => { const n = s.customWallBackgrounds.filter(u => u !== url); updateBin(JSONBIN_BACKGROUNDS_BIN_ID, { backgrounds: n }); return { customWallBackgrounds: n }; }),
      addReminder: (r) => set((s) => { const n = [...s.reminders, r]; setTimeout(() => get().syncMasterBin(), 100); return { reminders: n }; }),
      updateReminder: (id, u) => set((s) => { const n = s.reminders.map(r => r.id === id ? { ...r, ...u } : r); setTimeout(() => get().syncMasterBin(), 100); return { reminders: n }; }),
      removeReminder: (id) => set((s) => { const n = s.reminders.filter(r => r.id !== id); setTimeout(() => get().syncMasterBin(), 100); return { reminders: n }; }),
      // done for today only (completedOn), with the moment it was done (completedAt); toggling again undoes it
      toggleReminder: (id) => {
        const today = localDay();
        const flip = <T extends Reminder>(r: T): T => (isDoneToday(r)
          ? { ...r, completed: false, completedOn: undefined, completedAt: undefined }
          : { ...r, completed: true, completedOn: today, completedAt: Date.now() });
        set((s) => ({ reminders: s.reminders.map(r => r.id === id ? flip(r) : r), generalAzkar: s.generalAzkar.map(a => a.id === id ? flip(a) : a) }));
        setTimeout(() => get().syncMasterBin(), 100);
      },
      completeReminder: (id) => {
        const today = localDay();
        const done = <T extends Reminder>(r: T): T => (isDoneToday(r) ? r : { ...r, completed: true, completedOn: today, completedAt: Date.now() });
        set((s) => ({ reminders: s.reminders.map(r => r.id === id ? done(r) : r), generalAzkar: s.generalAzkar.map(a => a.id === id ? done(a) : a) }));
        setTimeout(() => get().syncMasterBin(), 100);
      },
      skipReminder: (id) => set((s) => ({ skippedReminderIds: [...s.skippedReminderIds, id] })),
      skipMatch: (id) => set((s) => ({ skippedMatchIds: [...s.skippedMatchIds.filter(x => x !== id), id].slice(-300) })),
      unskipMatch: (id) => { set((s) => ({ skippedMatchIds: s.skippedMatchIds.filter(x => x !== id) })); setTimeout(() => get().syncMasterBin(), 100); },
      addAzkar: (a) => set((s) => { const n = [...s.generalAzkar, a]; setTimeout(() => get().syncMasterBin(), 100); return { generalAzkar: n }; }),
      updateAzkar: (id, u) => set((s) => { const n = s.generalAzkar.map(a => a.id === id ? { ...a, ...u } : a); setTimeout(() => get().syncMasterBin(), 100); return { generalAzkar: n }; }),
      removeAzkar: (id) => set((s) => { const n = s.generalAzkar.filter(a => a.id !== id); setTimeout(() => get().syncMasterBin(), 100); return { generalAzkar: n }; }),
      setFavoriteTeam: (t, on) => {
        const full = (n: string) => n.trim().toLowerCase();
        set((s) => {
          const list = s.favoriteTeams || [];
          if (on) return list.some(i => i.id === t.id || full(i.name) === full(t.name)) ? {} : { favoriteTeams: [...list, t] };
          // remove by id; when no favourite has that id (saved from another source), by the full name
          const byId = list.filter(i => i.id !== t.id);
          return { favoriteTeams: byId.length < list.length ? byId : list.filter(i => full(i.name) !== full(t.name)) };
        });
        setTimeout(() => get().syncMasterBin(), 100);
      },
      toggleFollowLeague: (key) => {
        if (!key) return;
        set((s) => {
          const list = s.followedLeagues || [];
          return { followedLeagues: list.includes(key) ? list.filter(k => k !== key) : [...list, key] };
        });
        setTimeout(() => get().syncMasterBin(), 100);
      },
      setFavoriteTeamIsland: (name, island) => {
        const key = name.trim().toLowerCase();
        set((s) => ({ favoriteTeams: (s.favoriteTeams || []).map(t => (t.name.trim().toLowerCase() === key ? { ...t, island } : t)) }));
        setTimeout(() => get().syncMasterBin(), 100);
      },
      toggleFavoriteTeam: (t) => set((s) => ({ favoriteTeams: s.favoriteTeams.some(i => i.id === t.id) ? s.favoriteTeams.filter(i => i.id !== t.id) : [...s.favoriteTeams, t] })),
      toggleGoalAlert: (key, defaultOn) => {
        set((s) => {
          const on = `goal:${key}`, off = `mute:${key}`;
          const ids = s.belledMatchIds || [];
          const isOn = ids.includes(on) || (defaultOn && !ids.includes(off));
          const rest = ids.filter(x => x !== on && x !== off);
          const next = isOn ? (defaultOn ? [...rest, off] : rest) : (defaultOn ? rest : [...rest, on]);
          return { belledMatchIds: next.slice(-300) };
        });
        setTimeout(() => get().syncMasterBin(), 100);
      },
      setLeagueChannels: (key, channels) => {
        if (!key) return;
        set((s) => {
          const next = { ...(s.leagueChannelOverrides || {}) };
          const clean = (channels || []).map(c => c.trim()).filter(Boolean);
          if (channels === null) delete next[key]; else next[key] = Array.from(new Set(clean));
          return { leagueChannelOverrides: next };
        });
        setTimeout(() => get().syncMasterBin(), 100);
      },
      toggleBelledMatch: (matchId) => set((s) => ({ belledMatchIds: s.belledMatchIds.includes(matchId) ? s.belledMatchIds.filter(i => i !== matchId) : [...s.belledMatchIds, matchId] })),
      updateMapSettings: (s) => set((st) => { const n = { ...st.mapSettings, ...s }; if (s.manuscriptBgUrl || s.winwinUrl || s.beinUrl || s.omanUrl || s.bein1Url || s.mbc1Url) setTimeout(() => get().syncMasterBin(), 100); return { mapSettings: n }; }),
      setKeyMapping: (ctx, act, key) => set((s) => { const m = { ...s.keyMappings }; if (!m[ctx]) m[ctx] = {}; let k = Array.isArray(m[ctx][act]) ? [...m[ctx][act]] : []; if (k.includes(key)) return s; k.push(key); m[ctx][act] = k.slice(-3); return { keyMappings: m }; }),
      removeSpecificKeyMapping: (ctx, act, key) => set((s) => { const m = { ...s.keyMappings }; if (m[ctx] && m[ctx][act]) { m[ctx][act] = m[ctx][act].filter(v => v !== key); return { keyMappings: m }; } return s; }),
      setActiveVideo: (v, ctx) => set({ playlist: ctx || (v ? [v] : []), playlistIndex: ctx ? ctx.findIndex(i => i.id === v?.id) : 0, activeVideo: v, lastPlayedVideo: v || get().lastPlayedVideo, activeIptv: null, activeAudio: null, isPlaying: !!v, isMinimized: false, isFullScreen: !!v, isPlayerPlaylistOpen: false }),
      setActiveIptv: (ch, ctx, keepWindow) => set((s) => ({ iptvPlaylist: ctx || (ch ? [ch] : []), iptvPlaylistIndex: ctx ? ctx.findIndex(c => c.stream_id === ch?.stream_id) : 0, activeIptv: ch, activeVideo: null, activeAudio: null, isPlaying: !!ch, isMinimized: false, isFullScreen: keepWindow ? s.isFullScreen : !!ch, isPlayerPlaylistOpen: keepWindow ? s.isPlayerPlaylistOpen : false })),
      setActiveAudio: (audio) => set({ activeAudio: audio, activeVideo: null, activeIptv: null, isPlaying: !!audio, isFullScreen: false }),
      setActiveQuranUrl: (v) => set({ activeQuranUrl: v }),
      setPlaylist: (videos) => set({ playlist: videos }),
      nextTrack: () => { const s = get(); if (s.activeIptv) { s.nextIptvChannel(); return; } if (!s.playlist.length) return; let nIdx = (s.playlistIndex + 1); if (nIdx >= s.playlist.length) nIdx = s.isLooping ? 0 : s.playlist.length - 1; set({ playlistIndex: nIdx, activeVideo: s.playlist[nIdx] }); },
      prevTrack: () => { const s = get(); if (s.activeIptv) { s.prevIptvChannel(); return; } if (!s.playlist.length) return; const pIdx = (s.playlistIndex - 1 + s.playlist.length) % s.playlist.length; set({ playlistIndex: pIdx, activeVideo: s.playlist[pIdx] }); },
      nextIptvChannel: () => { const s = get(); if (!s.iptvPlaylist.length) return; const nIdx = (s.iptvPlaylistIndex + 1) % s.iptvPlaylist.length, ch = s.iptvPlaylist[nIdx]; set({ iptvPlaylistIndex: nIdx, activeIptv: ch }); },
      prevIptvChannel: () => { const s = get(); if (!s.iptvPlaylist.length) return; const pIdx = (s.iptvPlaylistIndex - 1 + s.iptvPlaylist.length) % s.iptvPlaylist.length; set({ iptvPlaylistIndex: pIdx, activeIptv: s.iptvPlaylist[pIdx] }); },
      updateVideoProgress: (id, progress) => set((s) => ({ videoProgress: { ...s.videoProgress, [id]: progress } })),
      setIsPlaying: (v) => set({ isPlaying: v }), setIsMinimized: (v) => set({ isMinimized: v, isFullScreen: false }), setIsFullScreen: (v) => set({ isFullScreen: v, isMinimized: false }),
      cyclePlayerMode: () => { const s = get(); if (s.isFullScreen) set({ isFullScreen: false, isMinimized: true }); else if (s.isMinimized) set({ isMinimized: false, isFullScreen: false }); else set({ isFullScreen: true, isMinimized: false }); },
      toggleDockSide: () => set((s) => ({ dockSide: s.dockSide === 'left' ? 'right' : 'left' })),
      toggleShowIslands: () => set({ showIslands: !get().showIslands }), toggleReorderMode: () => set((s) => ({ isReorderMode: !s.isReorderMode, pickedUpId: null })),
      setWallPlate: (t, d) => set({ wallPlateType: t, wallPlateData: d }), resetMediaView: () => set({ selectedChannel: null, channelVideos: [] }),
      setAiSuggestions: (s) => set({ aiSuggestions: s }),
      addManuscript: (m) => set((s) => { const n = [...s.customManuscripts, m]; setTimeout(() => get().saveManuscriptsReorder(), 100); return { customManuscripts: n }; }),
      updateManuscript: (id, u) => set((s) => { const n = s.customManuscripts.map(m => m.id === id ? { ...m, ...u } : m); setTimeout(() => get().saveManuscriptsReorder(), 100); return { customManuscripts: n }; }),
      removeManuscript: (id) => set((s) => { const n = s.customManuscripts.filter(m => m.id !== id); setTimeout(() => get().saveManuscriptsReorder(), 100); return { customManuscripts: n }; }),
      updateManuscriptScale: (id, scale) => set((s) => { const n = { ...s.manuscriptScales, [id]: (s.manuscriptScales[id] || 1.0) + scale }; setTimeout(() => get().syncMasterBin(), 100); return { manuscriptScales: n }; }),
      updatePrayerSetting: (id, updates) => set((s) => { const n = s.prayerSettings.map(p => p.id === id ? { ...p, ...updates } : p); setTimeout(() => get().syncMasterBin(), 100); return { prayerSettings: n }; }),
    }),
    {
      name: "drivecast-sovereign-v143", 
      // Last-known cloud data is kept locally so the app shows it instantly on start, then the cloud refresh replaces it.
      partialize: (s) => ({
        dockSide: s.dockSide, displayScale: s.displayScale, dockScale: s.dockScale, isLooping: s.isLooping,
        prayerTimes: s.prayerTimes, prayerSettings: s.prayerSettings, reminders: s.reminders, generalAzkar: s.generalAzkar,
        favoriteTeams: s.favoriteTeams, pinnedMatches: s.pinnedMatches, favoriteLeagueIds: s.favoriteLeagueIds, seededTeamsV1: s.seededTeamsV1,
        belledMatchIds: s.belledMatchIds, leagueChannelOverrides: s.leagueChannelOverrides, followedLeagues: s.followedLeagues,
        favoriteIptvChannels: s.favoriteIptvChannels, favoriteChannels: s.favoriteChannels, customFonts: s.customFonts,
        continueWatching: s.continueWatching, videoProgress: s.videoProgress,
      }),
    }
  )
);

// Remember the master-bin fields as restored from the local cache, so a save that has to wait for the cloud copy
// can tell which fields were really changed on this device.
if (typeof window !== 'undefined') {
  const captureBaseline = () => {
    if (masterBaseline) return;
    masterBaseline = Object.fromEntries(Object.entries(masterPayload(useMediaStore.getState())).map(([k, v]) => [k, JSON.stringify(v)]));
  };
  if (useMediaStore.persist?.hasHydrated?.()) captureBaseline();
  else useMediaStore.persist?.onFinishHydration?.(captureBaseline);
}
