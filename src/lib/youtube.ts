
"use client";

import { YT_KEYS_POOL } from "./constants";

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
const CACHE_TTL = 1000 * 60 * 60 * 4;

const BLACKLIST_KEY = 'yt_blacklist_v26';
const ROTATION_INDEX_KEY = 'yt_last_index_v26';

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

async function fetchWithRotation(endpoint: string, params: Record<string, string>) {
  const queryParams = new URLSearchParams(params);
  const cacheKey = `${endpoint}?${queryParams.toString()}`;

  if (youtubeCache[cacheKey] && (Date.now() - youtubeCache[cacheKey].timestamp < CACHE_TTL)) {
    return youtubeCache[cacheKey].data;
  }
  
  const totalKeys = YT_KEYS_POOL.length;
  let startIndex = Math.floor(Math.random() * totalKeys);
  const blacklist = getBlacklist();
  let attempts = 0;

  while (attempts < totalKeys) {
    const activeIndex = (startIndex + attempts) % totalKeys;
    if (blacklist[activeIndex.toString()] && Object.keys(blacklist).length < totalKeys) { attempts++; continue; }

    const key = YT_KEYS_POOL[activeIndex];
    const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams.toString()}&key=${key}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (response.ok) {
        youtubeCache[cacheKey] = { data, timestamp: Date.now() };
        return data;
      }
      if (response.status === 403 || response.status === 429) attempts++;
      else attempts++;
    } catch { attempts++; }
  }
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

  const results = data.items.map((v: any) => ({
    id: v.id.videoId,
    title: v.snippet.title,
    description: v.snippet.description,
    thumbnail: v.snippet.thumbnails.high?.url || v.snippet.thumbnails.default?.url,
    publishedAt: v.snippet.publishedAt,
    channelTitle: v.snippet.channelTitle,
    channelId: v.snippet.channelId,
    isLive: v.snippet.liveBroadcastContent === 'live' || v.snippet.liveBroadcastContent === 'upcoming'
  }));

  // Ensure LIVE is ALWAYS FIRST
  return results.sort((a, b) => (a.isLive === b.isLive) ? 0 : a.isLive ? -1 : 1);
}

export async function fetchChannelVideos(channelId: string, limit = 15): Promise<YouTubeVideo[]> {
  // Parallel fetch for speed
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

  const statsData = await fetchWithRotation('videos', { part: 'snippet,statistics', id: allUniqueIds.join(',') });
  const statsMap: Record<string, any> = {};
  
  if (statsData?.items) {
    statsData.items.forEach((v: any) => {
      statsMap[v.id] = {
        isLive: v.snippet.liveBroadcastContent === 'live' || v.snippet.liveBroadcastContent === 'upcoming',
        viewCount: parseInt(v.statistics.viewCount) || 0,
        title: v.snippet.title,
        description: v.snippet.description,
        thumbnail: v.snippet.thumbnails.high?.url || v.snippet.thumbnails.default?.url,
        publishedAt: v.snippet.publishedAt
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
    viewCount: statsMap[vidId]?.viewCount || 0
  })).sort((a, b) => (a.isLive === b.isLive) ? 0 : a.isLive ? -1 : 1);
}

export async function searchYouTubeChannels(query: string): Promise<YouTubeChannel[]> {
  if (!query) return [];
  const searchData = await fetchWithRotation('search', { part: 'snippet', type: 'channel', maxResults: '8', q: query });
  if (!searchData?.items) return [];
  
  const channelIds = searchData.items.map((item: any) => item.snippet.channelId).join(',');
  const statsData = await fetchWithRotation('channels', { part: 'snippet', id: channelIds });
  const statsMap: Record<string, any> = {};
  
  if (statsData?.items) {
    statsData.items.forEach((item: any) => {
      statsMap[item.id] = { image: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url };
    });
  }
  
  return searchData.items.map((item: any) => ({
    channelid: item.snippet.channelId,
    name: item.snippet.title,
    channeltitle: item.snippet.title,
    image: statsMap[item.snippet.channelId]?.image || item.snippet.thumbnails.high?.url,
    clickschannel: 0,
    starred: false
  }));
}
