
"use client";

import { YT_KEYS_POOL } from "./constants";
import { useMediaStore } from "./store";

export interface YouTubeChannel {
  channelid: string;
  name: string;
  image: string;
  channeltitle: string;
  clickschannel: number;
  starred: boolean;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  channelTitle?: string;
  channelId?: string;
  isLive?: boolean;
  viewCount?: number;
  duration?: string;
  progress?: number;
}

const youtubeCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours cache for quota efficiency

const BLACKLIST_KEY = 'yt_blacklist_v50';

function getBlacklist(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(BLACKLIST_KEY);
    const parsed = data ? JSON.parse(data) : {};
    const now = Date.now();
    const cleaned: Record<string, number> = {};
    Object.entries(parsed).forEach(([idx, expiry]) => {
      if (now < (expiry as number)) cleaned[idx] = expiry as number;
    });
    return cleaned;
  } catch { return {}; }
}

function addToBlacklist(index: number) {
  if (typeof window === 'undefined') return;
  const blacklist = getBlacklist();
  blacklist[index.toString()] = Date.now() + (1000 * 60 * 60 * 24); // Blacklist for 24 hours
  localStorage.setItem(BLACKLIST_KEY, JSON.stringify(blacklist));
}

function parseISO8601Duration(duration: string) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function fetchWithRotation(endpoint: string, params: Record<string, string>) {
  const queryParams = new URLSearchParams(params);
  const cacheKey = `${endpoint}?${queryParams.toString()}`;

  if (youtubeCache[cacheKey] && (Date.now() - youtubeCache[cacheKey].timestamp < CACHE_TTL)) {
    return youtubeCache[cacheKey].data;
  }
  
  const totalKeys = YT_KEYS_POOL.length;
  const blacklist = getBlacklist();
  const setApiError = useMediaStore.getState().setApiError;

  // Double-Pass Rotation Logic
  for (let attempts = 0; attempts < totalKeys * 2; attempts++) {
    const activeIndex = attempts % totalKeys;
    
    if (blacklist[activeIndex.toString()] && attempts < totalKeys) {
      continue;
    }

    const key = YT_KEYS_POOL[activeIndex];
    const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams.toString()}&key=${key}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); 
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (response.ok) {
        youtubeCache[cacheKey] = { data, timestamp: Date.now() };
        setApiError(null); 
        return data;
      }
      
      if (response.status === 403 || response.status === 429) {
        console.warn(`YouTube Key ${activeIndex} exhausted. Trying next...`);
        addToBlacklist(activeIndex);
        continue; 
      }
    } catch (e) {
      continue;
    }
  }
  
  setApiError({ count: totalKeys, message: "تم فحص جميع المفاتيح وهي منتهية الصلاحية حالياً" });
  return null;
}

export async function searchYouTubeVideos(query: string, limit = 20): Promise<YouTubeVideo[]> {
  const data = await fetchWithRotation('search', {
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: limit.toString(),
    order: 'relevance'
  });

  if (!data?.items) return [];

  const videoIds = data.items.map((v: any) => v.id.videoId).filter(Boolean).join(',');
  if (!videoIds) return [];

  const detailsData = await fetchWithRotation('videos', { part: 'snippet,contentDetails', id: videoIds });
  const detailsMap: Record<string, any> = {};

  if (detailsData?.items) {
    detailsData.items.forEach((v: any) => {
      detailsMap[v.id] = {
        duration: parseISO8601Duration(v.contentDetails.duration),
        isLive: v.snippet.liveBroadcastContent === 'live' || v.snippet.liveBroadcastContent === 'upcoming'
      };
    });
  }

  const results = data.items.map((v: any) => ({
    id: v.id.videoId,
    title: v.snippet.title,
    description: v.snippet.description,
    thumbnail: v.snippet.thumbnails.high?.url || v.snippet.thumbnails.default?.url,
    publishedAt: v.snippet.publishedAt,
    channelTitle: v.snippet.channelTitle,
    channelId: v.snippet.channelId,
    duration: detailsMap[v.id.videoId]?.duration || "",
    isLive: detailsMap[v.id.videoId]?.isLive || false
  })).filter(v => v.id);

  return results.sort((a, b) => (a.isLive === b.isLive) ? 0 : a.isLive ? -1 : 1);
}

export async function fetchChannelVideos(channelId: string, limit = 15): Promise<YouTubeVideo[]> {
  const [liveSearchData, chanData] = await Promise.all([
    fetchWithRotation('search', { part: 'snippet', channelId, eventType: 'live', type: 'video', maxResults: '2' }),
    fetchWithRotation('channels', { part: 'contentDetails,snippet', id: channelId })
  ]);

  if (!chanData?.items?.[0]) return [];
  const uploadsId = chanData.items[0].contentDetails.relatedPlaylists.uploads;
  const channelTitle = chanData.items[0].snippet.title;

  const playlistData = await fetchWithRotation('playlistItems', { part: 'snippet', playlistId: uploadsId, maxResults: limit.toString() });
  if (!playlistData?.items) return [];

  const liveIds = liveSearchData?.items?.map((i: any) => i.id.videoId) || [];
  const uploadIds = playlistData.items.map((i: any) => i.snippet.resourceId.videoId);
  const allUniqueIds = Array.from(new Set([...liveIds, ...uploadIds]));

  const statsData = await fetchWithRotation('videos', { part: 'snippet,statistics,contentDetails', id: allUniqueIds.join(',') });
  const statsMap: Record<string, any> = {};
  
  if (statsData?.items) {
    statsData.items.forEach((v: any) => {
      statsMap[v.id] = {
        isLive: v.snippet.liveBroadcastContent === 'live' || v.snippet.liveBroadcastContent === 'upcoming',
        viewCount: parseInt(v.statistics.viewCount) || 0,
        title: v.snippet.title,
        description: v.snippet.description,
        thumbnail: v.snippet.thumbnails.high?.url || v.snippet.thumbnails.default?.url,
        publishedAt: v.snippet.publishedAt,
        duration: parseISO8601Duration(v.contentDetails.duration)
      };
    });
  }

  return allUniqueIds.map(vidId => ({
    id: vidId,
    title: statsMap[vidId]?.title || "Video",
    description: statsMap[vidId]?.description || "",
    thumbnail: statsMap[vidId]?.thumbnail || "",
    publishedAt: statsMap[vidId]?.publishedAt || new Date().toISOString(),
    channelTitle,
    channelId,
    isLive: statsMap[vidId]?.isLive || false,
    viewCount: statsMap[vidId]?.viewCount || 0,
    duration: statsMap[vidId]?.duration || ""
  })).sort((a, b) => (a.isLive === b.isLive) ? 0 : a.isLive ? -1 : 1);
}

export async function searchYouTubeChannels(query: string): Promise<YouTubeChannel[]> {
  if (!query) return [];
  const searchData = await fetchWithRotation('search', { part: 'snippet', type: 'channel', maxResults: '12', q: query });
  if (!searchData?.items) return [];
  
  const channelIds = searchData.items.map((item: any) => item.id.channelId || item.snippet.channelId).filter(Boolean).join(',');
  if (!channelIds) return [];

  const statsData = await fetchWithRotation('channels', { part: 'snippet', id: channelIds });
  const statsMap: Record<string, any> = {};
  
  if (statsData?.items) {
    statsData.items.forEach((item: any) => {
      statsMap[item.id] = { 
        image: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        title: item.snippet.title
      };
    });
  }
  
  return searchData.items.map((item: any) => {
    const cid = item.id.channelId || item.snippet.channelId;
    return {
      channelid: cid,
      name: statsMap[cid]?.title || item.snippet.title,
      channeltitle: statsMap[cid]?.title || item.snippet.title,
      image: statsMap[cid]?.image || item.snippet.thumbnails.high?.url,
      clickschannel: 0,
      starred: false
    };
  });
}
