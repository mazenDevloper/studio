"use client";

import { YT_KEYS_POOL } from "./constants";

export interface YouTubeChannel {
  channelid: string;
  name: string;
  image: string;
  channeltitle: string;
  clickschannel: number;
  subscriberCount?: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  channelTitle?: string;
}

const youtubeCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 10;

function formatSubscriberCount(count: string): string {
  const num = parseInt(count, 10);
  if (isNaN(num)) return "";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return count;
}

async function fetchWithRotation(endpoint: string, params: Record<string, string>) {
  const queryParams = new URLSearchParams(params);
  const cacheKey = `${endpoint}?${queryParams.toString()}`;

  if (youtubeCache[cacheKey] && (Date.now() - youtubeCache[cacheKey].timestamp < CACHE_TTL)) {
    return youtubeCache[cacheKey].data;
  }
  
  for (let i = 0; i < YT_KEYS_POOL.length; i++) {
    const key = YT_KEYS_POOL[i];
    const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams.toString()}&key=${key}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        youtubeCache[cacheKey] = { data, timestamp: Date.now() };
        return data;
      }
      
      if (response.status === 403 || response.status === 429) {
        console.warn(`YouTube API Key ${i} exhausted. Rotating...`);
        continue;
      }
      
      return null;
    } catch (error) {
      continue;
    }
  }
  
  return null;
}

export async function searchYouTubeChannels(query: string): Promise<YouTubeChannel[]> {
  if (!query) return [];
  
  const searchData = await fetchWithRotation('search', {
    part: 'snippet',
    type: 'channel',
    maxResults: '8',
    q: query
  });
  
  if (!searchData || !searchData.items) return [];

  const channelIds = searchData.items.map((item: any) => item.snippet.channelId).join(',');
  const statsData = await fetchWithRotation('channels', {
    part: 'statistics',
    id: channelIds
  });

  const statsMap: Record<string, string> = {};
  if (statsData && statsData.items) {
    statsData.items.forEach((item: any) => {
      statsMap[item.id] = formatSubscriberCount(item.statistics.subscriberCount);
    });
  }

  return searchData.items.map((item: any) => ({
    channelid: item.snippet.channelId,
    name: item.snippet.title,
    channeltitle: item.snippet.title,
    image: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
    clickschannel: 0,
    subscriberCount: statsMap[item.snippet.channelId] || "---"
  }));
}

export async function searchYouTubeVideos(query: string): Promise<YouTubeVideo[]> {
  if (!query) return [];
  const data = await fetchWithRotation('search', {
    part: 'snippet',
    type: 'video',
    maxResults: '12',
    q: query
  });
  if (!data || !data.items) return [];
  return data.items.map((item: any) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
    publishedAt: item.snippet.publishedAt,
    channelTitle: item.snippet.channelTitle
  }));
}

export async function fetchChannelVideos(channelId: string): Promise<YouTubeVideo[]> {
  const uploadsPlaylistId = channelId.startsWith('UC') 
    ? channelId.replace('UC', 'UU') 
    : channelId;

  const data = await fetchWithRotation('playlistItems', {
    part: 'snippet',
    playlistId: uploadsPlaylistId,
    maxResults: '20'
  });

  if (!data || !data.items) {
    const fallbackData = await fetchWithRotation('search', {
      part: 'snippet',
      channelId: channelId,
      maxResults: '20',
      order: 'date',
      type: 'video'
    });
    if (!fallbackData || !fallbackData.items) return [];
    return fallbackData.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      publishedAt: item.snippet.publishedAt,
      channelTitle: item.snippet.channelTitle
    }));
  }

  return data.items.map((item: any) => ({
    id: item.snippet.resourceId.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
    publishedAt: item.snippet.publishedAt,
    channelTitle: item.snippet.channelTitle
  }));
}
