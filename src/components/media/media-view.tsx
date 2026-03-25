
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Radio, Loader2, X, Trash2, Play, RadioIcon, RefreshCw, Flame } from "lucide-react";
import { useMediaStore, YouTubeChannel, YouTubeVideo } from "@/lib/store";
import { searchYouTubeChannels, searchYouTubeVideos, fetchChannelVideos } from "@/lib/youtube";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const LatestVideosWidget = dynamic(() => import("../dashboard/widgets/latest-videos-widget").then(m => m.LatestVideosWidget), { ssr: false });

const APIFY_TOKEN = process.env.NEXT_PUBLIC_APIFY_TOKEN || "";
const ACTOR_ID = process.env.NEXT_PUBLIC_APIFY_ACTOR_ID || "";

export function MediaView() {
  const { 
    favoriteChannels, removeChannel, setActiveVideo, isFullScreen, saveChannelsReorder,
    videoResults, setVideoResults, selectedChannel, setSelectedChannel, channelVideos, setChannelVideos,
    addChannel, favoriteIptvChannels, setActiveIptv
  } = useMediaStore();

  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);

  const [channelSearchQuery, setChannelSearchQuery] = useState("");
  const [channelResults, setChannelResults] = useState<YouTubeChannel[]>([]);
  const [isSearchingChannels, setIsSearchingChannels] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [latestVideos, setLatestVideos] = useState<YouTubeVideo[]>([]);
  const [trendingVideos, setTrendingVideos] = useState<YouTubeVideo[]>([]);
  const [liveFavorites, setLiveFavorites] = useState<YouTubeVideo[]>([]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadMediaLists = useCallback(async () => {
    try {
      if (APIFY_TOKEN && ACTOR_ID) {
        const url = `https://api.apify.com/v2/datasets/${ACTOR_ID}/items?token=${APIFY_TOKEN}&format=json&clean=1&nocache=${Date.now()}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            const latest = data.map(item => ({
              id: item.latestVideo?.link || "", 
              title: item.latestVideo?.title || "فيديو بدون عنوان",
              thumbnail: item.latestVideo?.thumbnail || `https://picsum.photos/seed/${Math.random()}/400/225`,
              publishedAt: item.latestVideo?.publishedAt || "",
              channelTitle: item.channelName,
              isLive: item.latestVideo?.publishedAt?.includes('1970') || item.latestVideo?.title?.toLowerCase().includes('live'),
              description: ""
            })).filter(v => v.id);

            const trending = data
                .filter(item => item.bestVideo10Days !== null)
                .map(item => ({
                    id: item.bestVideo10Days.link,
                    title: item.bestVideo10Days.videoTitle || item.bestVideo10Days.title || "بدون عنوان",
                    thumbnail: item.bestVideo10Days.thumbnail,
                    publishedAt: item.bestVideo10Days.publishedAt,
                    channelTitle: item.channelName,
                    viewCount: parseInt(item.bestVideo10Days.viewCount) || 0,
                    description: ""
                }))
                .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));

            setLatestVideos(latest);
            setTrendingVideos(trending);
          }
        }
      }

      if (favoriteChannels.length > 0) {
        const livePromises = favoriteChannels.map(ch => fetchChannelVideos(ch.channelid));
        const results = await Promise.all(livePromises);
        const liveOnly = results.flatMap(list => list.filter(v => v.isLive));
        setLiveFavorites(liveOnly);
      }
    } catch (error) {
      console.error("Error loading media lists:", error);
    }
  }, [favoriteChannels]);

  useEffect(() => { loadMediaLists(); }, [loadMediaLists]);

  const handleVideoSearch = useCallback(async (queryOverride?: string) => {
    const finalQuery = queryOverride || searchQuery;
    if (!finalQuery.trim()) return;
    setIsSearching(true);
    setSelectedChannel(null);
    try {
      const results = await searchYouTubeVideos(finalQuery);
      setVideoResults(results);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, setVideoResults, setSelectedChannel]);

  const handleChannelSearch = async () => {
    if (!channelSearchQuery.trim()) return;
    setIsSearchingChannels(true);
    try {
      const results = await searchYouTubeChannels(channelSearchQuery);
      setChannelResults(results);
    } finally {
      setIsSearchingChannels(false);
    }
  };

  const handleSelectChannel = async (channel: YouTubeChannel) => {
    if (isReordering) return;
    setSelectedChannel(channel);
    setIsLoadingVideos(true);
    try {
      const videos = await fetchChannelVideos(channel.channelid);
      setChannelVideos(videos);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const handleSaveReorder = async () => {
    try {
      await saveChannelsReorder();
      setIsReordering(false);
      toast({ title: "تم الحفظ" });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ" });
    }
  };

  const unifiedLiveFeed = useMemo(() => {
    const iptvItems = favoriteIptvChannels.map(ch => ({ ...ch, feedType: 'iptv' as const }));
    const ytItems = liveFavorites.map(v => ({ ...v, feedType: 'youtube' as const }));
    const interleaved = [];
    const maxLen = Math.max(iptvItems.length, ytItems.length);
    for (let i = 0; i < maxLen; i++) {
      // 1-based order: 1 (YouTube), 2 (IPTV), 3 (YouTube), 4 (IPTV)...
      if (ytItems[i]) interleaved.push(ytItems[i]); 
      if (iptvItems[i]) interleaved.push(iptvItems[i]); 
    }
    return interleaved;
  }, [favoriteIptvChannels, liveFavorites]);

  if (isFullScreen) return null;
  const isWideScreen = windowWidth > 1080;

  return (
    <div className="p-6 space-y-10 max-w-7xl mx-auto pb-32 min-h-screen relative dir-rtl">
      <header className="flex flex-col gap-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setIsReordering(!isReordering)} className={cn("h-10 px-4 rounded-full text-xs focusable", isReordering ? "bg-accent text-black" : "bg-white/5 text-white")}>{isReordering ? "إلغاء" : "إعادة ترتيب"}</Button>
              {isReordering && <Button onClick={handleSaveReorder} className="h-10 px-4 rounded-full bg-primary text-white text-xs shadow-glow focusable">حفظ</Button>}
              <Button onClick={loadMediaLists} variant="outline" className="h-10 px-4 rounded-full bg-emerald-600/10 text-emerald-400 border-emerald-600/20 focusable">
                <RefreshCw className="w-4 h-4 ml-2" /> تحديث القوائم
              </Button>
            </div>
          </div>
          <div className="relative group">
            <Search className="absolute right-6 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground" />
            <Input
              placeholder="ابحث عن محتوى..."
              className="pr-16 pl-14 h-20 bg-white/5 border-white/10 rounded-[2rem] text-2xl font-headline focusable text-right"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVideoSearch()}
              data-nav-id="media-search-input"
            />
          </div>
        </div>
        <Button onClick={() => handleVideoSearch()} disabled={isSearching} className="h-20 w-full rounded-[2rem] bg-primary text-white font-black text-xl shadow-2xl focusable flex items-center justify-center gap-4">
          {isSearching ? <Loader2 className="w-8 h-8 animate-spin" /> : <Search className="w-8 h-8" />}
          <span>تنفيذ البحث</span>
        </Button>
      </header>

      {videoResults.length > 0 && !selectedChannel && (
        <section className="space-y-6 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-black font-headline text-white flex items-center gap-3"><Search className="w-6 h-6 text-primary" /> نتائج البحث</h2>
            <Button variant="ghost" onClick={() => setVideoResults([])} className="text-white/40 hover:text-white rounded-full bg-white/5 focusable">مسح النتائج</Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {videoResults.map((video, idx) => (
              <div key={video.id + idx} data-nav-id={`search-video-${idx}`} onClick={() => setActiveVideo(video, videoResults)} className="group relative overflow-hidden bg-zinc-900/80 border-none rounded-[2rem] transition-all hover:scale-[1.02] cursor-pointer shadow-xl focusable" tabIndex={0}>
                <div className="aspect-video relative overflow-hidden">
                  <Image src={video.thumbnail} alt="" fill className="object-cover opacity-80" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><Play className="w-12 h-12 text-white fill-white" /></div>
                </div>
                <div className="p-4 text-right"><h3 className="font-bold text-sm truncate text-white font-headline">{video.title}</h3><p className="text-[9px] text-white/40 uppercase mt-1">{video.channelTitle}</p></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {unifiedLiveFeed.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-black font-headline text-white flex items-center gap-3"><RadioIcon className="w-6 h-6 text-red-600" /> البث المباشر (المشتركين + IPTV)</h2>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max gap-4 pb-4 px-2">
              {unifiedLiveFeed.map((item: any, idx: number) => {
                const isIptv = item.feedType === 'iptv';
                const thumbnail = isIptv ? item.stream_icon : item.thumbnail;
                const title = isIptv ? item.name : item.title;
                return (
                  <div 
                    key={idx} data-nav-id={`live-unified-${idx}`} 
                    onClick={() => isIptv ? setActiveIptv(item) : setActiveVideo(item)} 
                    className={cn("w-[340px] group relative overflow-hidden bg-zinc-900/80 border-4 rounded-[2rem] transition-all hover:scale-[1.02] cursor-pointer shadow-xl focusable", isIptv ? "border-emerald-600" : "border-red-600")} 
                    tabIndex={0}
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <Image src={thumbnail || "https://picsum.photos/seed/live/400/225"} alt="" fill className="object-cover opacity-80" />
                      <div className={cn("absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-black text-white", isIptv ? "bg-emerald-600" : "bg-red-600")}>{isIptv ? "TV" : "LIVE"}</div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><Play className="w-12 h-12 text-white fill-white" /></div>
                    </div>
                    <div className="p-4 text-right">
                      <h3 className="font-bold text-sm truncate text-white font-headline">{title}</h3>
                      <p className={cn("text-[9px] font-black uppercase mt-1", isIptv ? "text-emerald-500" : "text-red-500")}>{isIptv ? "IPTV Stream" : item.channelTitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" className="bg-white/5 h-1.5" />
          </ScrollArea>
        </section>
      )}

      <section className="space-y-6 text-right">
        <h2 className="text-2xl font-black font-headline text-white flex items-center gap-4">القنوات المفضلة <Radio className="text-primary w-6 h-6" /></h2>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max gap-8 pb-6 px-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <div className="flex flex-col items-center gap-4 group cursor-pointer focusable shrink-0" tabIndex={0} data-nav-id="add-channel-btn">
                  <div className={cn("rounded-full border-4 border-dashed border-white/15 flex items-center justify-center bg-white/5 group-hover:border-primary transition-all", isWideScreen ? "w-48 h-48" : "w-32 h-32")}><Plus className="w-16 h-16 text-white/20" /></div>
                  <span className="font-black text-xs uppercase text-white/40">إضافة قناة</span>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-[90%] md:max-w-4xl bg-zinc-950 border-white/10 rounded-[3.5rem] p-0 w-[90%] mx-auto">
                <DialogHeader className="p-10 border-b border-white/10">
                  <DialogTitle className="text-3xl font-black text-white text-right mb-6">البحث عن القنوات</DialogTitle>
                  <div className="flex gap-4">
                    <Input placeholder="اسم القناة..." value={channelSearchQuery} onChange={(e) => setChannelSearchQuery(e.target.value)} className="bg-white/5 border-white/10 h-16 rounded-[1.5rem] text-xl px-8 text-right focusable flex-1" />
                    <Button onClick={handleChannelSearch} className="h-16 w-20 bg-primary rounded-[1.5rem] shadow-xl focusable">{isSearchingChannels ? <Loader2 className="w-8 h-8 animate-spin" /> : <Search className="w-8 h-8" />}</Button>
                  </div>
                </DialogHeader>
                <ScrollArea className="max-h-[65vh] p-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {channelResults.map((channel, idx) => (
                      <div key={channel.channelid} data-nav-id={`channel-result-${idx}`} className="flex items-center gap-6 p-6 rounded-[2rem] bg-white/5 border border-white/5 group focusable" tabIndex={0} onClick={() => favoriteChannels.some(c => c.channelid === channel.channelid) ? removeChannel(channel.channelid) : addChannel(channel)}>
                        <div className="relative w-24 h-24 rounded-full overflow-hidden flex-shrink-0"><Image src={channel.image} alt="" fill className="object-cover" /></div>
                        <div className="flex-1 text-right"><h4 className="font-black text-xl text-white truncate">{channel.name}</h4></div>
                        <div className={cn("rounded-full h-14 px-8 flex items-center justify-center font-black", favoriteChannels.some(c => c.channelid === channel.channelid) ? "bg-accent/20 text-accent" : "bg-primary text-white")}>{favoriteChannels.some(c => c.channelid === channel.channelid) ? "مشترك" : "إضافة"}</div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
            {favoriteChannels.map((channel, idx) => (
              <div key={channel.channelid} data-nav-id={`fav-channel-${idx}`} className="flex flex-col items-center gap-4 group focusable shrink-0" tabIndex={0} onClick={() => handleSelectChannel(channel)}>
                <div className={cn("rounded-full overflow-hidden border-4 border-white/10 transition-all cursor-pointer relative", isWideScreen ? "w-48 h-48" : "w-32 h-32")}>
                  <Image src={channel.image} alt="" fill className="object-cover group-hover:scale-115 transition-transform" />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-all" />
                  {!isReordering && <button onClick={(e) => { e.stopPropagation(); removeChannel(channel.channelid); }} className="absolute top-2 left-2 w-12 h-12 rounded-full bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 z-30 focusable"><Trash2 className="w-6 h-6" /></button>}
                </div>
                <span className="font-black text-sm text-center truncate w-40 text-white/70 group-hover:text-white">{channel.name}</span>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="bg-white/5 h-1.5" />
        </ScrollArea>
      </section>

      {!selectedChannel && (
        <div className="w-full space-y-10">
          <LatestVideosWidget channels={favoriteChannels.filter(c => c.starred)} />
          {trendingVideos.length > 0 && (
            <section className="space-y-6">
              <h2 className="text-2xl font-black font-headline text-white flex items-center gap-3"><Flame className="w-6 h-6 text-orange-500" /> الأعلى مشاهدة</h2>
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex w-max gap-4 pb-4 px-2">
                  {trendingVideos.map((video, idx) => (
                    <div key={video.id + idx} data-nav-id={`trending-video-${idx}`} onClick={() => setActiveVideo(video, trendingVideos)} className="w-[340px] group relative overflow-hidden bg-zinc-900/80 border-none rounded-[2rem] transition-all hover:scale-[1.02] cursor-pointer shadow-xl focusable" tabIndex={0}>
                      <div className="aspect-video relative overflow-hidden">
                        <Image src={video.thumbnail} alt="" fill className="object-cover opacity-80" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><Play className="w-12 h-12 text-white fill-white" /></div>
                      </div>
                      <div className="p-4 text-right"><h3 className="font-bold text-sm truncate text-white font-headline">{video.title}</h3><p className="text-[9px] text-white/40 uppercase mt-1">{video.channelTitle}</p></div>
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="bg-white/5 h-1.5" />
              </ScrollArea>
            </section>
          )}
        </div>
      )}

      {selectedChannel && (
        <div className="space-y-8 animate-in fade-in pb-24 text-right">
          <div className="flex items-center gap-8 p-12 rounded-[3.5rem] bg-white/5 border border-white/10 relative">
             <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-primary"><Image src={selectedChannel.image} alt="" fill className="object-cover" /></div>
             <div className="flex-1"><h2 className="text-5xl font-headline font-bold text-white mb-3">{selectedChannel.name}</h2></div>
             <Button onClick={() => setSelectedChannel(null)} className="absolute top-10 left-10 w-14 h-14 rounded-full bg-white/10 border-white/20 text-white focusable"><X className="w-8 h-8" /></Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {channelVideos.map((video, idx) => (
              <Card key={video.id} data-nav-id={`channel-video-${idx}`} className="group relative overflow-hidden bg-white/5 border-none rounded-[3rem] transition-all hover:scale-105 cursor-pointer shadow-2xl focusable" tabIndex={0} onClick={() => setActiveVideo(video, channelVideos)}>
                <div className="aspect-video relative overflow-hidden"><Image src={video.thumbnail} alt="" fill className="object-cover" /></div>
                <CardContent className="p-8 text-right"><h3 className="font-bold text-lg line-clamp-2 text-white font-headline h-14">{video.title}</h3></CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
