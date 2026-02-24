
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

/**
 * Robust fetch with key rotation.
 * Tries each key in the pool until success or all fail.
 */
async function fetchWithRotation(endpoint: string, params: Record<string, string>) {
  const queryParams = new URLSearchParams(params);
  
  for (let i = 0; i < YT_KEYS_POOL.length; i++) {
    const key = YT_KEYS_POOL[i];
    const url = `https://www.googleapis.com/youtube/v3/${endpoint}?${queryParams.toString()}&key=${key}`;
    
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
      
      // If quota exceeded or forbidden, try next key
      if (response.status === 403 || response.status === 429) {
        console.warn(`YouTube API Key ${i} exhausted. Trying next...`);
        continue;
      }
      
      // Other errors might be permanent for this query
      return null;
    } catch (error) {
      console.error(`Fetch error with key ${i}:`, error);
      continue;
    }
  }
  
  console.error("All YouTube API keys exhausted or failed.");
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

export async function fetchChannelVideos(channelId: string): Promise<YouTubeVideo[]> {
  const data = await fetchWithRotation('search', {
    part: 'snippet',
    channelId: channelId,
    maxResults: '12',
    order: 'date',
    type: 'video'
  });

  if (!data || !data.items) return [];

  return data.items.map((item: any) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
    publishedAt: item.snippet.publishedAt,
  }));
}
