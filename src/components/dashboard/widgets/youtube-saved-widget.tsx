"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bookmark, Play, Trash2 } from "lucide-react";
import { useMediaStore } from "@/lib/store";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function YouTubeSavedWidget() {
  const { savedVideos, removeVideo, setActiveVideo } = useMediaStore();

  return (
    <Card className="h-full border-none bg-zinc-900/50 rounded-[2.5rem] ios-shadow overflow-hidden flex flex-col">
      <CardHeader className="p-8 flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold font-headline text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center ios-shadow">
            <Bookmark className="h-6 w-6 text-black fill-current" />
          </div>
          Saved Transmissions
        </CardTitle>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-4 py-2 bg-white/5 rounded-full border border-white/5">
          {savedVideos.length} Saved
        </span>
      </CardHeader>
      <CardContent className="p-8 pt-0 flex-1 overflow-y-auto max-h-[400px]">
        {savedVideos.length === 0 ? (
          <div className="py-12 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/5">
            <p className="text-muted-foreground italic text-lg font-medium">No bookmarks found. Save videos in Media to view them here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {savedVideos.map((video, idx) => (
              <div 
                key={video.id} 
                className="flex items-center gap-4 p-4 rounded-[1.5rem] bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-white/10 group cursor-pointer focusable"
                onClick={() => setActiveVideo(video)}
                data-nav-id={`saved-video-${idx}`}
                tabIndex={0}
              >
                <div className="relative w-24 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  <Image 
                    src={video.thumbnail} 
                    alt={video.title} 
                    fill 
                    className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold truncate text-white font-headline">{video.title}</h4>
                  <p className="text-[10px] text-accent font-bold uppercase tracking-widest mt-1">Ready for Playback</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full w-10 h-10 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 focusable"
                  data-nav-id={`remove-saved-${idx}`}
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeVideo(video.id);
                  }}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
