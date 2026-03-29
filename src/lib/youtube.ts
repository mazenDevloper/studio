
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
const CACHE_TTL = 1000 * 60 * 60 * 4; // 4 hours

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

export function getExhaustedKeysCount(): number {
  return Object.keys(getBlacklist()).length;
}

export function resetYoutubeBlacklist() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(BLACKLIST_KEY);
}

function addToBlacklist(index: number) {
  if (typeof window === 'undefined') return;
  const blacklist = getBlacklist();
  blacklist[index.toString()] = Date.now() + (24 * 60 * 60 * 1000); 
  localStorage.setItem(BLACKLIST_KEY, JSON.stringify(blacklist));
}

async function fetchWithRotation(endpoint: string, params: Record<string, string>) {
  const queryParams = new URLSearchParams(params);
  const cacheKey = `${endpoint}?${queryParams.toString()}`;

  if (youtubeCache[cacheKey] && (Date.now() - youtubeCache[cacheKey].timestamp < CACHE_TTL)) {
    return youtubeCache[cacheKey].data;
  }
  
  const totalKeys = YT_KEYS_POOL.length;
  let startIndex = Math.floor(Math.random() * totalKeys);
  
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(ROTATION_INDEX_KEY);
    if (stored !== null) startIndex = parseInt(stored, 10);
  }

  const blacklist = getBlacklist();
  let attempts = 0;

  while (attempts < totalKeys) {
    const activeIndex = (startIndex + attempts) % totalKeys;
    
    if (blacklist[activeIndex.toString()] && Object.keys(blacklist).length < totalKeys) {
      attempts++;
      continue;
    }

    const key = YT_KEYS_POOL[activeIndex];
    const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams.toString()}&key=${key}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        if (typeof window !== 'undefined') localStorage.setItem(ROTATION_INDEX_KEY, activeIndex.toString());
        youtubeCache[cacheKey] = { data, timestamp: Date.now() };
        return data;
      }
      
      if (response.status === 403 || response.status === 429) {
        addToBlacklist(activeIndex);
        attempts++;
        continue; 
      }
      attempts++;
    } catch {
      attempts++;
    }
  }
  return null;
}

/**
 * AGGRESSIVE QUOTA SAVER: Costs ~2-3 units (100% stable).
 * Uses playlistItems instead of search.
 */
export async function fetchChannelVideos(channelId: string, limit = 15): Promise<YouTubeVideo[]> {
  const chanData = await fetchWithRotation('channels', { part: 'contentDetails,snippet', id: channelId });
  if (!chanData?.items?.[0]) return [];
  
  const uploadsId = chanData.items[0].contentDetails.relatedPlaylists.uploads;
  const channelTitle = chanData.items[0].snippet.title;

  const playlistData = await fetchWithRotation('playlistItems', {
    part: 'snippet',
    playlistId: uploadsId,
    maxResults: limit.toString()
  });

  if (!playlistData?.items) return [];

  const videoIds = playlistData.items.map((i: any) => i.snippet.resourceId.videoId).join(',');
  const statsData = await fetchWithRotation('videos', { part: 'snippet,statistics', id: videoIds });
  const statsMap: Record<string, any> = {};
  if (statsData?.items) {
    statsData.items.forEach((v: any) => {
      statsMap[v.id] = {
        isLive: v.snippet.liveBroadcastContent === 'live',
        viewCount: parseInt(v.statistics.viewCount) || 0
      };
    });
  }

  return playlistData.items.map((item: any) => {
    const vidId = item.snippet.resourceId.videoId;
    return {
      id: vidId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      publishedAt: item.snippet.publishedAt,
      channelTitle: channelTitle,
      channelId: channelId,
      isLive: statsMap[vidId]?.isLive || false,
      viewCount: statsMap[vidId]?.viewCount || 0
    };
  });
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
