"use client";

import { YT_KEYS_POOL } from "./constants";

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
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

/**
 * دالة جلب البيانات بنظام التدوير الذكي.
 * صممت لتكون Quota Friendly عبر دعم playlistItems كخيار أساسي.
 */
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
  const data = await fetchWithRotation('search', {
    part: 'snippet',
    type: 'channel',
    maxResults: '8',
    q: query
  });
  if (!data || !data.items) return [];
  return data.items.map((item: any) => ({
    id: item.snippet.channelId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
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

/**
 * استخدام playlistItems بدلاً من search لتقليل التكلفة من 100 وحدة إلى وحدة واحدة فقط.
 */
export async function fetchChannelVideos(channelId: string): Promise<YouTubeVideo[]> {
  const uploadsPlaylistId = channelId.startsWith('UC') 
    ? channelId.replace('UC', 'UU') 
    : channelId;

  const data = await fetchWithRotation('playlistItems', {
    part: 'snippet',
    playlistId: uploadsPlaylistId,
    maxResults: '15'
  });

  if (!data || !data.items) {
    const fallbackData = await fetchWithRotation('search', {
      part: 'snippet',
      channelId: channelId,
      maxResults: '15',
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