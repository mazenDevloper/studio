
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

/**
 * جلب فيديوهات القناة مع إعطاء الأولوية للبث المباشر
 */
export async function fetchChannelVideos(channelId: string): Promise<YouTubeVideo[]> {
  // 1. تحقق أولاً من وجود بث مباشر نشط
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

  // 2. جلب أحدث الفيديوهات العادية (Uploads)
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

  // دمج المباشر مع العادي (المباشر أولاً)
  return [...liveVideos, ...uploadedVideos.filter(v => !liveVideos.some(lv => lv.id === v.id))];
}
