"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, RefreshCw, Play, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { YouTubeChannel, YouTubeVideo, fetchChannelVideos } from "@/lib/youtube";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Props {
  channels: YouTubeChannel[];
}

export function LatestVideosWidget({ channels }: Props) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const fetchLatest = useCallback(async () => {
    if (channels.length === 0) {
      setVideos([]);
      return;
    }
    setLoading(true);
    try {
      // Fetch 2 latest videos for each channel in parallel
      const videoPromises = channels.map(c => fetchChannelVideos(c.id));
      const results = await Promise.all(videoPromises);
      
      // Take top 2 from each and flatten
      const allVideos = results.flatMap(channelVideos => channelVideos.slice(0, 2));
      
      // Sort by published date
      const sorted = allVideos.sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
      
      setVideos(sorted);
    } catch (error) {
      console.error("Failed to fetch latest videos", error);
    } finally {
      setLoading(false);
    }
  }, [channels]);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  return (
    <Card className="border-none bg-zinc-900/50 rounded-[2.5rem] ios-shadow overflow-hidden">
      <CardHeader className="p-8 flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold font-headline text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center ios-shadow">
            <Star className="h-6 w-6 text-black fill-current" />
          </div>
          Starred Transmissions
          <span className="text-xs text-muted-foreground uppercase tracking-widest ml-2 font-bold opacity-50">Latest Updates</span>
        </CardTitle>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={fetchLatest} 
          disabled={loading || channels.length === 0} 
          className="rounded-full hover:bg-white/10 w-12 h-12"
        >
          <RefreshCw className={`h-6 w-6 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="p-8 pt-0">
        {channels.length === 0 ? (
          <div className="py-12 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/5">
            <p className="text-muted-foreground italic text-lg font-medium">Star channels in Media to track latest broadcasts here.</p>
          </div>
        ) : loading ? (
          <div className="flex gap-6 overflow-hidden">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 w-80 rounded-[2rem] bg-zinc-800 flex-shrink-0" />)}
          </div>
        ) : (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max gap-6 pb-4">
              {videos.map((video) => (
                <div 
                  key={video.id} 
                  className="w-80 group relative overflow-hidden bg-zinc-900/80 border-none rounded-[2rem] transition-all hover:scale-[1.02] cursor-pointer ios-shadow"
                  onClick={() => setPlayingVideoId(video.id)}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <Image
                      src={video.thumbnail}
                      alt={video.title}
                      fill
                      className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-3xl flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-2xl">
                        <Play className="w-8 h-8 text-white fill-white ml-1" />
                      </div>
                    </div>
                  </div>
                  <div className="p-5 space-y-2">
                    <h3 className="font-bold text-base truncate text-white font-headline">{video.title}</h3>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                       <span className="flex items-center gap-1 text-accent"><Clock className="w-3 h-3" /> Latest</span>
                       <span className="opacity-30">•</span>
                       <span>Live Feed</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="bg-white/5 h-2" />
          </ScrollArea>
        )}
      </CardContent>

      <Dialog open={!!playingVideoId} onOpenChange={() => setPlayingVideoId(null)}>
        <DialogContent className="max-w-[90vw] w-full h-[85vh] bg-black border-white/5 p-0 rounded-[3rem] overflow-hidden ios-shadow">
          {playingVideoId && (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
