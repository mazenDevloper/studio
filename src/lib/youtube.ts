
"use client";

import { YT_KEYS_POOL } from "./constants";

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
}

let keyIndex = 0;

function getApiKey() {
  const key = YT_KEYS_POOL[keyIndex];
  keyIndex = (keyIndex + 1) % YT_KEYS_POOL.length;
  return key;
}

export async function searchYouTubeChannels(query: string): Promise<YouTubeChannel[]> {
  if (!query) return [];

  const apiKey = getApiKey();
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=8&q=${encodeURIComponent(query)}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("YouTube API Error");
    const data = await response.json();

    return data.items.map((item: any) => ({
      id: item.snippet.channelId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
    }));
  } catch (error) {
    console.error("YouTube Search Failed:", error);
    return [];
  }
}
