
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bookmark, Play, Trash2, Clock, Activity } from "lucide-react";
import { useMediaStore } from "@/lib/store";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ShortcutBadge } from "@/components/layout/car-dock";

export function YouTubeSavedWidget() {
  const { savedVideos, removeVideo, setActiveVideo } = useMediaStore();

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const horizontalListClass = "w-full flex gap-4 px-8 pb-4 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center";

  return (
    <Card className="border-none bg-zinc-900/50 rounded-[2.5rem] shadow-2xl overflow-hidden">
      <CardHeader className="p-8 flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold font-headline text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center shadow-lg">
            <Bookmark className="h-6 w-6 text-black fill-current" />
          </div>
          البثوث المحفوظة
          <span className="text-xs text-muted-foreground uppercase tracking-widest ml-2 font-bold opacity-50">Saved Feed</span>
        </CardTitle>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-4 py-2 bg-white/5 rounded-full border border-white/5">
          {savedVideos?.length || 0} فيديو
        </span>
      </CardHeader>
      <CardContent className="p-0">
        {!savedVideos || savedVideos.length === 0 ? (
          <div className="py-12 mx-8 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/5"><p className="text-muted-foreground italic text-lg font-medium">لا توجد فيديوهات محفوظة حالياً.</p></div>
        ) : (
          <div className={horizontalListClass}>
            {savedVideos.map((video, idx) => (
              <div 
                key={video.id} 
                className="w-80 group relative overflow-hidden bg-zinc-900/80 border-none rounded-[2rem] transition-all hover:scale-[1.02] cursor-pointer shadow-xl focusable shrink-0 outline-none"
                onClick={() => setActiveVideo(video, savedVideos)}
                tabIndex={0}
                data-nav-id={`saved-video-${idx}`}
                data-video-id={video.id}
              >
                <div className="aspect-video relative overflow-hidden">
                  <Image src={video.thumbnail} alt={video.title} fill className="object-cover opacity-80 group-hover:opacity-100" />
                  <ShortcutBadge action="delete_item" className="-top-1 -right-1 scale-90 opacity-0 group-focus:opacity-100 transition-opacity" />
                  
                  {video.duration && <div className="absolute bottom-2 right-2 bg-black text-white text-[14px] px-3 py-1.5 rounded-lg font-black z-10 border border-white/20">{video.duration}</div>}

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-3xl flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-2xl">
                      <Play className="w-8 h-8 text-white fill-white ml-1" />
                    </div>
                  </div>

                  {video.progress && video.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/40">
                      <div className="h-full bg-accent shadow-[0_0_12px_hsl(var(--accent))]" style={{ width: `${Math.min(100, (video.progress / 3600) * 100)}%` }} />
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-2 text-right">
                  <h3 className="font-bold text-base truncate text-white font-headline">{video.title}</h3>
                  <div className="flex items-center justify-end gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                     {video.progress && video.progress > 0 ? (
                       <span className="text-accent flex items-center gap-1"><Activity className="w-3 h-3" /> استكمال عند {formatTime(video.progress)}</span>
                     ) : (<span>جاهز للمشاهدة</span>)}
                     <span className="opacity-30">•</span>
                     <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {video.duration || "---"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
