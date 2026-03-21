
"use client";

import { YT_KEYS_POOL } from "./constants";

export interface YouTubeChannel {
  channelid: string;
  name: string;
  image: string;
  channeltitle: string;
  clickschannel: number;
  starred: boolean;
  subscriberCount?: string;
  isLive?: boolean;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  channelTitle?: string;
  channelId?: string;
  duration?: string;
  progress?: number;
  isLive?: boolean;
  viewCount?: number;
}

const youtubeCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes to preserve quota

// Smart Persistent Blacklist Logic
const BLACKLIST_KEY = 'yt_smart_blacklist';
const ROTATION_INDEX_KEY = 'yt_active_key_index';

function getSmartBlacklist(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(BLACKLIST_KEY);
    const parsed = data ? JSON.parse(data) : {};
    
    // Auto-clean expired entries
    const now = Date.now();
    const cleaned: Record<string, number> = {};
    let changed = false;
    
    Object.entries(parsed).forEach(([idx, expiry]) => {
      if (now < (expiry as number)) {
        cleaned[idx] = expiry as number;
      } else {
        changed = true;
      }
    });
    
    if (changed) localStorage.setItem(BLACKLIST_KEY, JSON.stringify(cleaned));
    return cleaned;
  } catch (e) {
    return {};
  }
}

function addToBlacklist(index: number) {
  if (typeof window === 'undefined') return;
  const blacklist = getSmartBlacklist();
  // Blacklist for 24 hours (YouTube quota resets daily)
  blacklist[index.toString()] = Date.now() + (24 * 60 * 60 * 1000);
  localStorage.setItem(BLACKLIST_KEY, JSON.stringify(blacklist));
}

function formatSubscriberCount(count: string): string {
  const num = parseInt(count, 10);
  if (isNaN(num)) return "";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return count;
}

export function formatYouTubeDuration(duration: string): string {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function fetchWithRotation(endpoint: string, params: Record<string, string>) {
  const queryParams = new URLSearchParams(params);
  const cacheKey = `${endpoint}?${queryParams.toString()}`;

  if (youtubeCache[cacheKey] && (Date.now() - youtubeCache[cacheKey].timestamp < CACHE_TTL)) {
    return youtubeCache[cacheKey].data;
  }
  
  const totalKeys = YT_KEYS_POOL.length;
  let currentKeyIndex = 0;
  if (typeof window !== 'undefined') {
    currentKeyIndex = parseInt(localStorage.getItem(ROTATION_INDEX_KEY) || '0', 10);
  }

  const blacklist = getSmartBlacklist();
  let attempts = 0;

  while (attempts < totalKeys) {
    const activeIndex = (currentKeyIndex + attempts) % totalKeys;
    
    // Skip if this key is in the smart blacklist
    if (blacklist[activeIndex.toString()]) {
      attempts++;
      continue;
    }

    const key = YT_KEYS_POOL[activeIndex];
    const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams.toString()}&key=${key}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        // Save working index
        if (typeof window !== 'undefined') {
          localStorage.setItem(ROTATION_INDEX_KEY, activeIndex.toString());
        }
        youtubeCache[cacheKey] = { data, timestamp: Date.now() };
        return data;
      }
      
      // Quota limit hit or Forbidden (403 is usually quota, 429 is rate limit)
      if (response.status === 403 || response.status === 429) {
        console.warn(`Smart Rotation: Key ${activeIndex} exhausted. Blacklisting for 24h.`);
        addToBlacklist(activeIndex);
        attempts++;
        continue; 
      }
      
      console.error("YouTube API Error:", data.error?.message || "Unknown error");
      return null;
    } catch (error) {
      console.error("Network error during YouTube fetch:", error);
      attempts++;
    }
  }
  
  console.error("CRITICAL: All YouTube API Keys are currently blacklisted or exhausted.");
  return null;
}

export async function searchYouTubeChannels(query: string): Promise<YouTubeChannel[]> {
  if (!query) return [];
  
  const searchData = await fetchWithRotation('search', {
    part: 'snippet',
    type: 'channel',
    maxResults: '12',
    q: query
  });
  
  if (!searchData || !searchData.items) return [];

  const channelIds = searchData.items.map((item: any) => item.snippet.channelId).join(',');
  const statsData = await fetchWithRotation('channels', {
    part: 'snippet,statistics',
    id: channelIds
  });

  const statsMap: Record<string, { subs: string, image: string }> = {};
  if (statsData && statsData.items) {
    statsData.items.forEach((item: any) => {
      statsMap[item.id] = {
        subs: formatSubscriberCount(item.statistics.subscriberCount),
        image: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url
      };
    });
  }

  return searchData.items.map((item: any) => ({
    channelid: item.snippet.channelId,
    name: item.snippet.title,
    channeltitle: item.snippet.title,
    image: statsMap[item.snippet.channelId]?.image || item.snippet.thumbnails.high?.url,
    clickschannel: 0,
    starred: false,
    subscriberCount: statsMap[item.snippet.channelId]?.subs || "---"
  }));
}

export async function fetchChannelDetails(channelId: string) {
  const data = await fetchWithRotation('channels', {
    part: 'snippet,statistics',
    id: channelId
  });
  if (!data || !data.items || data.items.length === 0) return null;
  const item = data.items[0];
  return {
    channelid: item.id,
    name: item.snippet.title,
    image: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
    subscriberCount: formatSubscriberCount(item.statistics.subscriberCount)
  };
}

export async function searchYouTubeVideos(query: string): Promise<YouTubeVideo[]> {
  if (!query) return [];
  const data = await fetchWithRotation('search', {
    part: 'snippet',
    type: 'video',
    maxResults: '24',
    q: query
  });
  if (!data || !data.items) return [];
  return data.items.map((item: any) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
    publishedAt: item.snippet.publishedAt,
    channelTitle: item.snippet.channelTitle,
    channelId: item.snippet.channelId
  }));
}

export async function fetchVideoDetails(videoId: string): Promise<YouTubeVideo | null> {
  const data = await fetchWithRotation('videos', {
    part: 'snippet,contentDetails',
    id: videoId
  });

  if (!data || !data.items || data.items.length === 0) return null;

  const item = data.items[0];
  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
    publishedAt: item.snippet.publishedAt,
    channelTitle: item.snippet.channelTitle,
    channelId: item.snippet.channelId,
    duration: formatYouTubeDuration(item.contentDetails.duration),
    progress: 0
  };
}

export async function fetchChannelVideos(channelId: string): Promise<YouTubeVideo[]> {
  const liveSearch = await fetchWithRotation('search', {
    part: 'snippet',
    channelId: channelId,
    type: 'video',
    eventType: 'live',
    maxResults: '1'
  });

  const liveVideos: YouTubeVideo[] = [];
  if (liveSearch?.items?.length > 0) {
    liveVideos.push({
      id: liveSearch.items[0].id.videoId,
      title: liveSearch.items[0].snippet.title,
      description: liveSearch.items[0].snippet.description,
      thumbnail: liveSearch.items[0].snippet.thumbnails.high?.url || liveSearch.items[0].snippet.thumbnails.default?.url,
      publishedAt: liveSearch.items[0].snippet.publishedAt,
      channelTitle: liveSearch.items[0].snippet.channelTitle,
      channelId: liveSearch.items[0].snippet.channelId,
      isLive: true
    });
  }

  const uploadsPlaylistId = channelId.startsWith('UC') 
    ? channelId.replace('UC', 'UU') 
    : channelId;

  const data = await fetchWithRotation('playlistItems', {
    part: 'snippet',
    playlistId: uploadsPlaylistId,
    maxResults: '30'
  });

  let uploadedVideos: YouTubeVideo[] = [];
  if (!data || !data.items) {
    const fallbackData = await fetchWithRotation('search', {
      part: 'snippet',
      channelId: channelId,
      maxResults: '30',
      order: 'date',
      type: 'video'
    });
    if (fallbackData?.items) {
      uploadedVideos = fallbackData.items.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        publishedAt: item.snippet.publishedAt,
        channelTitle: item.snippet.channelTitle,
        channelId: item.snippet.channelId
      }));
    }
  } else {
    uploadedVideos = data.items.map((item: any) => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      publishedAt: item.snippet.publishedAt,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId
    }));
  }

  return [...liveVideos, ...uploadedVideos.filter(v => !liveVideos.some(lv => lv.id === v.id))];
}
