
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Play, Clock, Star, Shuffle, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { YouTubeChannel, YouTubeVideo, fetchChannelVideos } from "@/lib/youtube";
import Image from "next/image";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Props {
  channels?: YouTubeChannel[];
  title?: string;
  customVideos?: YouTubeVideo[];
}

/**
 * LatestVideosWidget v100.0 - Universal Array Support
 */
export function LatestVideosWidget({ channels = [], title, customVideos }: Props) {
  const { setActiveVideo, setPlaylist } = useMediaStore();
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const lastFetchRef = useRef<number>(0);

  const fetchLatest = useCallback(async (force = false) => {
    if (customVideos) {
      setVideos(customVideos);
      return;
    }
    if (channels.length === 0) { setVideos([]); return; }
    
    setLoading(true);
    try {
      const videoPromises = channels.map(c => fetchChannelVideos(c.channelid));
      const results = await Promise.all(videoPromises);
      const combined: YouTubeVideo[] = [];
      results.forEach(channelVideos => combined.push(...channelVideos));
      setVideos(combined.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 15));
    } catch (error) {
      console.error("Failed to fetch videos", error);
    } finally {
      setLoading(false);
    }
  }, [channels, customVideos]);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  const displayTitle = title || "الترددات المجرسة";
  const Icon = displayTitle.includes('مباريات') ? Trophy : displayTitle.includes('الطفل') ? Sparkles : Star;

  return (
    <Card className="border-none bg-zinc-900/50 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
      <CardHeader className="p-8 flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold font-headline text-white flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg", displayTitle.includes('الطفل') ? "bg-emerald-500" : "bg-accent")}>
            <Icon className="h-6 w-6 text-black fill-current" />
          </div>
          {displayTitle}
        </CardTitle>
        <div className="flex items-center gap-3">
          <Button onClick={() => setPlaylist(videos)} disabled={videos.length === 0} className="h-12 px-6 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all focusable flex items-center gap-3">
            <Shuffle className="w-5 h-5" />
            <span className="font-black text-xs uppercase tracking-widest">تشغيل الكل</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="w-full flex gap-4 px-8 pb-4 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center">
          {videos.map((video, idx) => (
            <div key={video.id + idx} className="w-80 group relative overflow-hidden bg-zinc-900/80 border-none rounded-[2rem] transition-all hover:scale-[1.02] cursor-pointer shadow-xl focusable shrink-0" onClick={() => setActiveVideo(video, videos)} tabIndex={0}>
              <div className="aspect-video relative overflow-hidden">
                <Image src={video.thumbnail} alt={video.title} fill className="object-cover opacity-80 group-hover:opacity-100" unoptimized />
                {video.duration && <div className="absolute bottom-2 right-2 bg-black text-white text-[14px] px-3 py-1.5 rounded-lg font-black z-10 border border-white/20 shadow-2xl">{video.duration}</div>}
                <div className="absolute inset-0 flex items-center justify-center"><div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-3xl flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-2xl"><Play className="w-8 h-8 text-white fill-white ml-1" /></div></div>
              </div>
              <div className="p-5 space-y-2 text-right">
                <h3 className="font-bold text-base truncate text-white font-headline">{video.title}</h3>
                <div className="flex items-center justify-end gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                   <span className="text-white/40">{video.channelTitle}</span>
                   <span className="opacity-30">•</span>
                   <span className="flex items-center gap-1 text-accent"><Clock className="w-3 h-3" /> {video.duration || "FEED"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
