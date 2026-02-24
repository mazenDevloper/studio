
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

// ذاكرة تخزين مؤقت بسيطة لمنع الطلبات المكررة
const youtubeCache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 10; // 10 دقائق

/**
 * دالة جلب البيانات مع نظام التدوير التلقائي للمفاتيح لضمان الاستقرار.
 * تعتمد استراتيجية "التدوير الذكي" لتجاوز أي مفتاح مستنفذ للحصة.
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
      
      // Quota Errors: 403 (Forbidden) or 429 (Too Many Requests)
      if (response.status === 403 || response.status === 429) {
        console.warn(`YouTube API Key ${i} exhausted. Quota Error. Rotation in progress...`);
        continue;
      }
      
      console.error(`YouTube API Error: ${data?.error?.message}`);
      // If it's another error (like 400), don't bother rotating, just return null
      return null;
    } catch (error) {
      console.error(`Network error with key index ${i}:`, error);
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
 * جلب فيديوهات القناة باستخدام playlistItems لتقليل استهلاك الحصة (1 وحدة بدلاً من 100).
 * هذه الطريقة "صديقة للحصة" (Quota Friendly) وتضمن أداء مستدام.
 */
export async function fetchChannelVideos(channelId: string): Promise<YouTubeVideo[]> {
  // معرف قائمة الفيديوهات المرفوعة يكون عادةً باستبدال UC بـ UU في معرف القناة
  const uploadsPlaylistId = channelId.startsWith('UC') 
    ? channelId.replace('UC', 'UU') 
    : channelId;

  const data = await fetchWithRotation('playlistItems', {
    part: 'snippet',
    playlistId: uploadsPlaylistId,
    maxResults: '15'
  });

  if (!data || !data.items) {
    // محاولة أخيرة بالبحث التقليدي إذا فشل استنتاج قائمة التشغيل
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
