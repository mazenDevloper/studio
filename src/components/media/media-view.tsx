
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, Plus, Loader2, X, Play, RadioIcon, 
  Video, Pin, Flame, Activity, List, Star, GripVertical, Save
} from "lucide-react";
import { useMediaStore, YouTubeChannel, YouTubeVideo } from "@/lib/store";
import { searchYouTubeChannels, fetchChannelVideos } from "@/lib/youtube";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function MediaView() {
  const { 
    favoriteChannels, setFavoriteChannels, setActiveVideo, isFullScreen, dockSide,
    selectedChannel, setSelectedChannel, channelVideos, setChannelVideos,
    addChannel, favoriteIptvChannels, setActiveIptv, toggleStarChannel,
    saveChannelsReorder
  } = useMediaStore();

  const { toast } = useToast();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  
  const [channelSearchQuery, setChannelSearchQuery] = useState("");
  const [channelResults, setChannelResults] = useState<YouTubeChannel[]>([]);
  const [isSearchingChannels, setIsSearchingChannels] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [latestFromSubs, setLatestFromSubs] = useState<YouTubeVideo[]>([]);
  const [liveFromSubs, setLiveFavorites] = useState<YouTubeVideo[]>([]);
  const [trending24h, setTrending24h] = useState<YouTubeVideo[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);

  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const truncateName = (name: string) => {
    if (!name) return "";
    return name.length > 15 ? name.substring(0, 15) + "..." : name;
  };

  const setInitialScroll = useCallback((key: string) => {
    const el = scrollRefs.current[key];
    if (el) {
      el.scrollLeft = 0; // RTL: Right is 0
      setTimeout(() => {
        // Focus latest element at the right
        const lastItem = el.querySelector('[data-nav-id*="video-"]:last-child') as HTMLElement;
        if (lastItem) {
          lastItem.focus({ preventScroll: true });
          el.scrollLeft = 0; 
        }
      }, 100);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    
    const timer = setTimeout(() => {
      const allItem = document.querySelector('[data-nav-id="subs-all"]') as HTMLElement;
      if (allItem) allItem.focus();
    }, 800);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  const refreshContent = useCallback(async () => {
    if (favoriteChannels.length === 0) return;
    setIsDataLoading(true);
    try {
      const latestPromises = favoriteChannels.map(ch => fetchChannelVideos(ch.channelid, 5));
      const results = await Promise.all(latestPromises);
      
      const allVideos: YouTubeVideo[] = [];
      const live: YouTubeVideo[] = [];
      const latest: YouTubeVideo[] = [];

      results.forEach(list => {
        if (list.length > 0) {
          latest.push(...list.slice(0, 2));
          allVideos.push(...list);
          live.push(...list.filter(v => v.isLive));
        }
      });

      setLatestFromSubs(latest);
      setLiveFavorites(live);
      
      const trending = [...allVideos].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
      const channelCount: Record<string, number> = {};
      const filteredTrending = trending.filter(v => {
        const cid = v.channelId || "";
        channelCount[cid] = (channelCount[cid] || 0) + 1;
        return channelCount[cid] <= 3; // 3 videos max per channel in trending
      });
      setTrending24h(filteredTrending.slice(0, 15));
      
      setTimeout(() => {
        setInitialScroll('trending');
        setInitialScroll('live');
        setInitialScroll('subs');
      }, 500);
    } catch (e) {
      console.error("Content Refresh Error:", e);
    } finally {
      setIsDataLoading(false);
    }
  }, [favoriteChannels, setInitialScroll]);

  useEffect(() => { refreshContent(); }, [refreshContent]);

  useEffect(() => {
    async function fetchSelectedChannelVideos() {
      if (selectedChannel) {
        setIsDataLoading(true);
        try {
          const videos = await fetchChannelVideos(selectedChannel.channelid, 40);
          
          // SMART ORDERING: Live -> Most Viewed -> Newest
          const live = videos.filter(v => v.isLive);
          const others = videos.filter(v => !v.isLive);
          const sortedOthers = [...others].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
          
          const mostViewed = sortedOthers.length > 0 ? sortedOthers[0] : null;
          const remaining = mostViewed ? sortedOthers.slice(1) : sortedOthers;
          const finalRemaining = [...remaining].sort((a, b) => 
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
          );

          const result = [...live];
          if (mostViewed && !live.some(l => l.id === mostViewed.id)) result.push(mostViewed);
          result.push(...finalRemaining);

          setChannelVideos(result);
        } finally {
          setIsDataLoading(false);
        }
      }
    }
    fetchSelectedChannelVideos();
  }, [selectedChannel, setChannelVideos]);

  const handleChannelSearch = useCallback(async () => {
    if (!channelSearchQuery.trim()) return;
    setIsSearchingChannels(true);
    try {
      const results = await searchYouTubeChannels(channelSearchQuery);
      setChannelResults(results);
    } finally {
      setIsSearchingChannels(false);
    }
  }, [channelSearchQuery]);

  const interleavedLiveFeed = useMemo(() => {
    const iptv = favoriteIptvChannels.map(ch => ({ ...ch, feedType: 'iptv' as const }));
    const yt = liveFromSubs.map(v => ({ ...v, feedType: 'youtube' as const }));
    const interleaved = [];
    const maxLen = Math.max(iptv.length, yt.length);
    for (let i = 0; i < maxLen; i++) {
      if (yt[i]) interleaved.push(yt[i]); 
      if (iptv[i]) interleaved.push(iptv[i]); 
    }
    return interleaved;
  }, [favoriteIptvChannels, liveFromSubs]);

  const handleDragStart = (idx: number) => {
    if (!isReordering) return;
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    if (!isReordering || draggedIdx === null || draggedIdx === idx) return;
    e.preventDefault();
    const newList = [...favoriteChannels];
    const item = newList.splice(draggedIdx, 1)[0];
    newList.splice(idx, 0, item);
    setFavoriteChannels(newList);
    setDraggedIdx(idx);
  };

  const handleSaveReorder = async () => {
    try {
      await saveChannelsReorder();
      setIsReordering(false);
      toast({ title: "تم الحفظ", description: "تم تحديث ترتيب القنوات سحابياً" });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ", description: "فشل حفظ الترتيب" });
    }
  };

  if (isFullScreen) return null;

  const isWideScreen = windowWidth > 1080;
  const sidebarWidthClass = isWideScreen 
    ? (isSidebarCollapsed && !isSidebarPinned ? "w-20" : "w-[27%]") 
    : (isSidebarCollapsed && !isSidebarPinned ? "w-20" : "w-72");

  const cardWidthClass = "w-80"; 

  return (
    <div className={cn(
      "min-h-screen flex dir-rtl bg-transparent pb-40 transition-all duration-700 gap-0",
      dockSide === 'left' ? "flex-row-reverse" : "flex-row"
    )}>
      
      <aside 
        className={cn(
          "h-screen sticky top-0 z-[110] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] premium-glass flex flex-col group/sidebar",
          sidebarWidthClass,
          dockSide === 'left' ? "border-r border-white/5" : "border-l border-white/5"
        )}
        onMouseEnter={() => setIsSidebarCollapsed(false)}
        onMouseLeave={() => setIsSidebarCollapsed(true)}
        onFocusCapture={() => setIsSidebarCollapsed(false)}
        onBlurCapture={() => setIsSidebarCollapsed(true)}
      >
        <div className="p-6 flex flex-col gap-4 border-b border-white/5">
          <div className="flex items-center justify-between">
            {(!isSidebarCollapsed || isSidebarPinned) && (
              <h2 className="text-2xl font-black text-white tracking-tighter">الاشتراكات</h2>
            )}
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" size="icon" 
                onClick={() => setIsSidebarPinned(!isSidebarPinned)} 
                className={cn("w-8 h-8 rounded-full focusable transition-all opacity-20", isSidebarPinned && "bg-primary/20 opacity-100")}
              >
                <Pin className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" size="icon" 
                onClick={() => setIsReordering(!isReordering)} 
                className={cn("w-8 h-8 rounded-full focusable transition-all opacity-20", isReordering && "bg-accent/40 opacity-100")}
              >
                <List className="w-4 h-4" />
              </Button>
              {isReordering && (
                <Button onClick={handleSaveReorder} variant="ghost" size="icon" className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 focusable">
                  <Save className="w-4 h-4 ml-2" />
                </Button>
              )}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-8 h-8 rounded-full bg-primary/80 p-0 focusable">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl bg-zinc-950 border-white/10 rounded-[2.5rem] p-0 dir-rtl shadow-2xl">
                  <DialogHeader className="p-8 border-b border-white/10 text-right">
                    <DialogTitle className="text-xl font-black text-white">إضافة قناة</DialogTitle>
                    <div className="flex gap-4 mt-6">
                      <Input placeholder="اسم القناة..." value={channelSearchQuery} onChange={(e) => setChannelSearchQuery(e.target.value)} className="h-12 bg-white/5 rounded-xl px-6 text-right focusable flex-1" />
                      <Button onClick={handleChannelSearch} className="h-12 w-12 bg-primary rounded-xl focusable">
                        {isSearchingChannels ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                      </Button>
                    </div>
                  </DialogHeader>
                  <ScrollArea className="max-h-[50vh] p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {channelResults.map(ch => (
                        <div key={ch.channelid} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 focusable cursor-pointer" tabIndex={0} onClick={() => { addChannel(ch); setIsDialogOpen(false); }}>
                          <Image src={ch.image} alt="" width={40} height={40} className="rounded-full" />
                          <span className="flex-1 text-right font-bold text-white truncate text-sm">{ch.name}</span>
                          <div className="bg-primary text-white text-[8px] font-black px-3 py-1.5 rounded-full uppercase">إضافة</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="py-4 flex flex-col gap-1 scale-[0.94] origin-top">
            <div 
              onClick={() => setSelectedChannel(null)}
              className={cn(
                "flex items-center gap-3 p-3 transition-all cursor-pointer focusable overflow-hidden w-[95%] mx-auto rounded-xl group/item",
                !selectedChannel ? "bg-primary text-white shadow-glow" : "hover:bg-white/5 text-white/60"
              )}
              tabIndex={0}
              data-nav-id="subs-all"
            >
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors", !selectedChannel ? "bg-white/20" : "bg-white/10")}>
                <List className={cn("w-5 h-5", !selectedChannel ? "text-white" : "text-white/40")} />
              </div>
              {(!isSidebarCollapsed || isSidebarPinned) && (
                <span className="flex-1 text-right font-black text-sm">الكل</span>
              )}
            </div>

            {favoriteChannels.map((ch, idx) => (
              <div 
                key={ch.channelid} 
                onClick={() => setSelectedChannel(ch)}
                draggable={isReordering}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={() => setDraggedIdx(null)}
                className={cn(
                  "flex items-center gap-3 p-3 transition-all cursor-pointer focusable overflow-hidden w-[95%] mx-auto rounded-xl group/item relative",
                  selectedChannel?.channelid === ch.channelid ? "bg-primary text-white shadow-glow" : "hover:bg-white/5 text-white/60",
                  isReordering && "cursor-move",
                  draggedIdx === idx && "opacity-50 scale-95"
                )}
                tabIndex={0}
                data-nav-id={`subs-${idx}`}
              >
                <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                  <img src={ch.image} alt="" className="w-full h-full object-cover" />
                </div>
                {(!isSidebarCollapsed || isSidebarPinned) && (
                  <>
                    <div className="flex-1 text-right overflow-hidden">
                      <h4 className={cn(
                        "font-black text-sm whitespace-nowrap",
                        selectedChannel?.channelid === ch.channelid ? "text-white" : "text-inherit"
                      )}>
                        {truncateName(ch.name)}
                      </h4>
                    </div>
                    {isReordering ? (
                      <GripVertical className="w-4 h-4 text-white/20" />
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleStarChannel(ch.channelid); }}
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center transition-all",
                          ch.starred ? "text-yellow-400 opacity-100" : "text-white/20 opacity-0 group-hover/item:opacity-100"
                        )}
                      >
                        <Star className={cn("w-4 h-4", ch.starred && "fill-current")} />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      <main className="flex-1 p-0 space-y-10 overflow-y-auto no-scrollbar relative">
        
        {selectedChannel && (
          <section className="space-y-8 animate-in slide-in-from-top-10 duration-700 p-8">
            <div className="flex justify-end sticky top-0 z-[120]">
              <Button 
                onClick={() => setSelectedChannel(null)} 
                className="h-16 px-10 rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-xl shadow-glow focusable transition-all flex items-center gap-4"
              >
                <X className="w-6 h-6" />
                <span>العودة إلى الخلف</span>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {isDataLoading && channelVideos.length === 0 ? (
                <div className="col-span-full py-20 flex justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
              ) : channelVideos.map((v, i) => (
                <Card key={v.id + i} onClick={() => setActiveVideo(v, channelVideos)} className="group bg-white/5 border-none rounded-[2rem] transition-all hover:scale-[1.02] cursor-pointer focusable overflow-hidden shadow-2xl" tabIndex={0} data-nav-id={`video-ch-${i}`}>
                  <div className="aspect-video relative">
                    <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                    {v.isLive && (
                      <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase animate-pulse">LIVE</div>
                    )}
                    {i === 1 && !v.isLive && (
                      <div className="absolute top-4 left-4 bg-accent text-black text-[10px] font-black px-3 py-1 rounded-full uppercase shadow-glow flex items-center gap-2">
                        <Activity className="w-3 h-3" /> الأكثر مشاهدة
                      </div>
                    )}
                  </div>
                  <CardContent className="p-6 text-right h-24 flex items-center justify-end"><h3 className="font-bold text-sm text-white line-clamp-2 leading-tight">{v.title}</h3></CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {!selectedChannel && (
          <div className="space-y-10">
            {/* Header Alignment Anchor */}
            <section className="w-full px-8 pt-8">
              <div className="premium-glass p-4 rounded-[2rem] border border-white/10 shadow-2xl backdrop-blur-3xl opacity-60">
                <div className="relative">
                  <Search className="absolute right-6 top-1/2 -translate-y-1/2 h-6 w-6 text-white/20" />
                  <Input 
                    placeholder="ابحث عن فيديوهات..." 
                    className="pr-16 pl-14 h-16 bg-black/40 border-white/5 rounded-[1.5rem] text-xl font-headline text-right pointer-events-none"
                    tabIndex={-1}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="px-8 flex items-center justify-between">
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                  <Flame className="w-6 h-6 text-orange-500" /> التفاعل الأعلى (24 ساعة)
                </h2>
              </div>
              <div 
                ref={el => { scrollRefs.current['trending'] = el; }}
                className="w-full flex gap-4 px-8 pb-4 overflow-x-auto no-scrollbar scroll-smooth"
                style={{ direction: 'rtl' }}
              >
                {trending24h.map((v, i) => (
                  <div key={v.id + i} onClick={() => setActiveVideo(v, trending24h)} className={cn("group relative overflow-hidden bg-zinc-900/80 rounded-[2rem] border-2 border-transparent hover:border-orange-500 transition-all cursor-pointer focusable shadow-2xl shrink-0", cardWidthClass)} tabIndex={0} data-nav-id={`video-trending-${i}`}>
                    <div className="aspect-video relative">
                      <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                      <div className="absolute top-4 left-4 px-4 py-1.5 rounded-full text-[10px] font-black text-white bg-orange-600 shadow-lg flex items-center gap-2 uppercase tracking-widest">
                        <Activity className="w-3 h-3" /> ساخن
                      </div>
                    </div>
                    <div className="p-4 text-right"><h3 className="font-bold text-xs truncate text-white">{v.title}</h3><p className="text-[9px] text-white/40 uppercase mt-1 font-black tracking-widest">{v.channelTitle}</p></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-6">
              <div className="px-8 flex items-center justify-between">
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                  <RadioIcon className="w-6 h-6 text-red-600" /> البث المباشر الموحد
                </h2>
              </div>
              <div 
                ref={el => { scrollRefs.current['live'] = el; }}
                className="w-full flex gap-4 px-8 pb-4 overflow-x-auto no-scrollbar scroll-smooth"
                style={{ direction: 'rtl' }}
              >
                {interleavedLiveFeed.map((item: any, i: number) => {
                  const isIptv = item.feedType === 'iptv';
                  return (
                    <div 
                      key={`${isIptv ? 'iptv' : 'yt'}-${i}`} 
                      onClick={() => {
                        if (isIptv) {
                          setActiveIptv(item, favoriteIptvChannels);
                        } else {
                          setActiveVideo(item, liveFromSubs);
                        }
                      }}
                      className={cn(
                        "group relative overflow-hidden bg-zinc-900/80 border-4 rounded-[2rem] transition-all hover:scale-[1.02] cursor-pointer shadow-2xl focusable shrink-0", 
                        isIptv ? "border-emerald-600/40" : "border-red-600/40",
                        cardWidthClass
                      )} 
                      tabIndex={0}
                      data-nav-id={`video-live-${i}`}
                    >
                      <div className="aspect-video relative">
                        <img src={(isIptv ? item.stream_icon : item.thumbnail) || ""} alt="" className="w-full h-full object-cover" />
                        <div className={cn("absolute top-4 left-4 px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase", isIptv ? "bg-emerald-600" : "bg-red-600")}>{isIptv ? "IPTV" : "LIVE"}</div>
                      </div>
                      <div className="p-4 text-right"><h3 className="font-bold text-xs truncate text-white">{isIptv ? item.name : item.title}</h3></div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="space-y-6">
              <div className="px-8 flex items-center justify-between">
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                  <Video className="w-6 h-6 text-primary" /> أحدث فيديوهات المشتركين
                </h2>
              </div>
              <div 
                ref={el => { scrollRefs.current['subs'] = el; }}
                className="w-full flex gap-4 px-8 pb-4 overflow-x-auto no-scrollbar scroll-smooth"
                style={{ direction: 'rtl' }}
              >
                {latestFromSubs.map((v, i) => (
                  <div key={v.id + i} onClick={() => setActiveVideo(v, latestFromSubs)} className={cn("group relative overflow-hidden bg-zinc-900/80 rounded-[2rem] border-2 border-transparent hover:border-primary transition-all cursor-pointer focusable shadow-2xl shrink-0", cardWidthClass)} tabIndex={0} data-nav-id={`video-subs-${i}`}>
                    <div className="aspect-video relative"><img src={v.thumbnail} alt="" className="w-full h-full object-cover" /></div>
                    <div className="p-4 text-right"><h3 className="font-bold text-xs truncate text-white">{v.title}</h3><p className="text-[9px] text-white/40 uppercase mt-1 font-black tracking-widest">{v.channelTitle}</p></div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

      </main>
    </div>
  );
}
