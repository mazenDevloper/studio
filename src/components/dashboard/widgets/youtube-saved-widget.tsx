
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bookmark, Play, Trash2, Clock, Activity, Library, Star, Youtube, Loader2 } from "lucide-react";
import { useMediaStore, YouTubeVideo } from "@/lib/store";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { fetchChannelVideos } from "@/lib/youtube";

/**
 * YouTubeSavedWidget v1600.0 - Frequencies & Folders Hub
 */
export function YouTubeSavedWidget() {
  const { playlists, favoriteChannels, setActiveVideo } = useMediaStore();
  const [topVideos, setTopVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchTopContent() {
      const starred = favoriteChannels.filter(c => c.starred);
      if (starred.length === 0) {
        setTopVideos([]);
        return;
      }
      
      setLoading(true);
      const tops: YouTubeVideo[] = [];
      try {
        for (const ch of starred) {
          const vids = await fetchChannelVideos(ch.channelid, 10);
          if (vids.length > 0) {
            const topOne = [...vids].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))[0];
            tops.push({ ...topOne, channelAvatar: ch.image });
          }
        }
        setTopVideos(tops);
      } catch (e) {
        console.error("Dashboard Frequencies Error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchTopContent();
  }, [favoriteChannels]);

  const horizontalListClass = "w-full flex gap-4 px-8 pb-4 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center";

  return (
    <Card className="border-none bg-zinc-900/50 rounded-[2.5rem] shadow-2xl overflow-hidden">
      <CardHeader className="p-8 flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold font-headline text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
            <Library className="h-6 w-6 text-white" />
          </div>
          المجلدات والترددات المجرسة
          <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold ml-2">Sovereign Frequencies</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className={horizontalListClass}>
          {playlists.map((p, idx) => (
             <div 
               key={`pl-${p.id}`} 
               className="w-80 h-48 group relative overflow-hidden bg-zinc-900 border-2 border-white/5 rounded-[2.5rem] focusable cursor-pointer shrink-0 flex flex-col justify-end p-6 shadow-2xl transition-all outline-none"
               tabIndex={0}
             >
               {p.videos.length > 0 && (
                 <div className="absolute inset-0 z-0">
                   <img src={p.videos[0].thumbnail} className="w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform" alt="" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                 </div>
               )}
               <div className="relative z-10 text-right">
                  <h4 className="text-2xl font-black text-white tracking-tighter leading-tight">{p.name}</h4>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="px-3 py-1 bg-indigo-600/40 backdrop-blur-md rounded-full border border-indigo-400/30">
                       <span className="text-[9px] font-black text-white uppercase tracking-widest">{p.videos.length} تلاوة</span>
                    </div>
                  </div>
               </div>
             </div>
          ))}

          {topVideos.map((video, vIdx) => (
             <div 
               key={`top-${video.id}`} 
               className="w-80 h-48 group relative overflow-hidden bg-zinc-900 border-2 border-white/5 rounded-[2.5rem] focusable cursor-pointer shrink-0 flex flex-col justify-end p-6 shadow-2xl transition-all outline-none"
               onClick={() => setActiveVideo(video, topVideos)}
               tabIndex={0}
             >
               <div className="absolute inset-0 z-0">
                 <img src={video.thumbnail} className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform" alt="" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
               </div>
               <div className="relative z-10 text-right">
                 <span className="text-[12px] font-black text-white line-clamp-2 leading-tight mb-2 drop-shadow-md">{video.title}</span>
                 <div className="flex items-center gap-2">
                   <img src={video.channelAvatar} className="w-6 h-6 rounded-full border border-white/20" alt="" />
                   <span className="text-[9px] font-black text-white/60 truncate max-w-[120px]">{video.channelTitle}</span>
                   <div className="ml-auto px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-md border border-yellow-500/40 text-[7px] font-black uppercase">الأكثر مشاهدة</div>
                 </div>
               </div>
             </div>
          ))}

          {playlists.length === 0 && topVideos.length === 0 && !loading && (
            <div className="py-12 w-full text-center opacity-20 italic">لا توجد محتويات مجرسة حالياً</div>
          )}
          
          {loading && (
            <div className="flex items-center justify-center p-20 w-full">
              <Loader2 className="w-8 h-8 animate-spin text-white/20" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
