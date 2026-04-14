
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, Plus, Loader2, X, List, 
  Flame, Activity, RadioIcon, Trophy, Baby, ChevronRight, User, Youtube, Star, ArrowRightLeft, Mic, Play, Clock
} from "lucide-react";
import { useMediaStore, YouTubeChannel, YouTubeVideo } from "@/lib/store";
import { searchYouTubeChannels, fetchChannelVideos, searchYouTubeVideos } from "@/lib/youtube";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ShortcutBadge } from "@/components/layout/car-dock";
import { Button } from "@/components/ui/button";

/**
 * MediaView v77.0 - Opposite Sidebar Position
 * Sidebar is now on the opposite side of the Dock for a traditional desktop feel.
 */
export function MediaView() {
  const { 
    favoriteChannels, setActiveVideo, dockSide, isSidebarShrinked, setIsSidebarShrinked,
    selectedChannel, setSelectedChannel, channelVideos, setChannelVideos,
    favoriteReciters, setActiveIptv, favoriteIptvChannels,
    isReorderMode, toggleReorderMode, pickedUpId, setPickedUpId, reorderChannelTo, reorderReciterTo
  } = useMediaStore();

  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [surahs, setSurahs] = useState<any[]>([]);
  
  const [starredVideos, setStarredVideos] = useState<YouTubeVideo[]>([]);
  const [isStarredLoading, setIsStarredLoading] = useState(false);
  
  const [liveFromSubs, setLiveFromSubs] = useState<YouTubeVideo[]>([]);
  const [kidsVideos, setKidsVideos] = useState<YouTubeVideo[]>([]);
  const [latestPerSub, setLatestPerSub] = useState<YouTubeVideo[]>([]);
  const [isSpecializedLoading, setIsSpecializedLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const isDockLeft = dockSide === 'left';

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobileView = windowWidth < 968;
  const starredChannels = useMemo(() => favoriteChannels.filter(c => c.starred), [favoriteChannels]);

  useEffect(() => {
    fetch("https://api.quran.com/api/v4/chapters?language=ar")
      .then(r => r.json())
      .then(d => setSurahs(d.chapters || []))
      .catch(e => console.error("Surahs Load Error:", e));
    
    setIsSidebarShrinked(false);
    setTimeout(() => {
      const allBtn = document.querySelector('[data-nav-id="subs-all"]') as HTMLElement;
      allBtn?.focus();
    }, 500);
  }, [setIsSidebarShrinked]);

  const fetchFeeds = useCallback(async () => {
    if (!favoriteChannels || favoriteChannels.length === 0) return;
    setIsStarredLoading(true);
    setIsSpecializedLoading(true);
    
    try {
      if (starredChannels.length > 0) {
        const results = await Promise.allSettled(starredChannels.slice(0, 5).map(c => fetchChannelVideos(c.channelid, 5)));
        const allStarred: YouTubeVideo[] = [];
        results.forEach(res => {
          if (res.status === 'fulfilled' && Array.isArray(res.value)) allStarred.push(...res.value);
        });
        setStarredVideos(allStarred.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()));
      }

      const timelineChannels = favoriteChannels.slice(0, 15);
      const timelineResults = await Promise.allSettled(timelineChannels.map(c => fetchChannelVideos(c.channelid, 1)));
      const timeline: YouTubeVideo[] = [];
      timelineResults.forEach(res => {
        if (res.status === 'fulfilled' && Array.isArray(res.value) && res.value.length > 0) timeline.push(res.value[0]);
      });
      
      setLatestPerSub(timeline);
      setLiveFromSubs(timeline.filter(v => v.isLive));
      searchYouTubeVideos("ريان بالعربي كيدز بالعربي", 10).then(setKidsVideos).catch(() => {});
    } catch (e) {
      console.error("Feed Fetch Error:", e);
    } finally {
      setIsStarredLoading(false);
      setIsSpecializedLoading(false);
    }
  }, [favoriteChannels, starredChannels]);

  useEffect(() => { fetchFeeds(); }, [fetchFeeds]);

  useEffect(() => {
    if (selectedChannel) {
      setLoading(true);
      fetchChannelVideos(selectedChannel.channelid, 20)
        .then(v => { setChannelVideos(v); setLoading(false); })
        .catch(() => { setLoading(false); toast({ title: "خطأ", description: "تعذر جلب فيديوهات القناة" }); });
    }
  }, [selectedChannel, setChannelVideos, toast]);

  const handleReciterClick = (name: string) => {
    setSearch(name);
    setTimeout(() => {
      const firstSurah = document.querySelector('[data-nav-id="surah-item-0"]') as HTMLElement;
      firstSurah?.focus();
      firstSurah?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  const handleSurahClick = (name: string) => {
    setSearch(prev => `${prev} سورة ${name}`);
    setTimeout(() => {
      const searchBtn = document.querySelector('[data-nav-id="search-btn"]') as HTMLElement;
      searchBtn?.focus();
    }, 150);
  };

  const performSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await searchYouTubeVideos(search);
      setSearchResults(res);
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ في البحث", description: "تعذر جلب النتائج حالياً" });
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string, type: 'channel' | 'reciter') => {
    if (!isReorderMode) return;
    e.dataTransfer.setData("id", id);
    e.dataTransfer.setData("type", type);
    setPickedUpId(id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    if (!isReorderMode) return;
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("id");
    const type = e.dataTransfer.getData("type") as 'channel' | 'reciter';
    if (sourceId === targetId) return;
    if (type === 'channel') reorderChannelTo(sourceId, targetId);
    else if (type === 'reciter') reorderReciterTo(sourceId, targetId);
    setPickedUpId(null);
  };

  const horizontalListClass = "w-full flex gap-1.5 px-8 pb-1 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center";
  const showIsolatedView = !!selectedChannel || searchResults.length > 0;

  return (
    <div className={cn("h-screen flex bg-transparent transition-all duration-700 overflow-hidden relative", 
      // Flipped Layout: Sidebar is now on the opposite side of the Dock.
      // If dock is left, layout is flex-row-reverse (Sidebar on the right).
      isDockLeft ? "flex-row-reverse" : "flex-row")}>
      
      {!isMobileView && (
        <aside className={cn(
          "h-full z-[110] transition-all duration-500 ease-in-out premium-glass flex flex-col shrink-0 border-white/5 bg-black/40 shadow-2xl", 
          isSidebarShrinked ? "w-[6%]" : "w-[25%]", 
          // Border flipped to match opposite side positioning
          isDockLeft ? "border-l" : "border-r"
        )}>
          <div className={cn("p-2 flex items-center justify-between border-b border-white/5", isSidebarShrinked && "justify-center px-1")}>
            {!isSidebarShrinked && <h2 className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">الاشتراكات</h2>}
            <button className={cn("w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center transition-all", isSidebarShrinked && "w-8 h-8")}><Plus className="w-3.5 h-3.5 text-primary" /></button>
          </div>
          <ScrollArea className="flex-1">
            <div className="py-1 flex flex-col gap-0.5">
              <div onClick={() => { setSelectedChannel(null); setSearchResults([]); setIsSidebarShrinked(false); }} className={cn("flex items-center gap-2 p-1 transition-all cursor-pointer focusable overflow-hidden w-[96%] mx-auto rounded-lg", !selectedChannel && !searchResults.length ? "bg-primary text-white active-nav-target" : "hover:bg-white/5 text-white/60", isSidebarShrinked && "justify-center")} tabIndex={0} data-nav-id="subs-all">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/10 shrink-0"><List className="w-3.5 h-3.5" /></div>
                {!isSidebarShrinked && <span className="flex-1 text-right font-black text-[11px]">الكل</span>}
              </div>
              {favoriteChannels && favoriteChannels.map((ch, idx) => (
                <div key={ch.channelid} draggable={isReorderMode} onDragStart={(e) => handleDragStart(e, ch.channelid, 'channel')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, ch.channelid)} onClick={() => { if (isReorderMode) setPickedUpId(pickedUpId === ch.channelid ? null : ch.channelid); else { setSearchResults([]); setSelectedChannel(ch); } }} className={cn("flex items-center p-1 rounded-lg w-[96%] mx-auto gap-2 transition-all cursor-pointer focusable overflow-hidden shrink-0 border-2", selectedChannel?.channelid === ch.channelid ? "bg-primary text-white shadow-glow" : "hover:bg-white/5 text-white/60", pickedUpId === ch.channelid ? "border-accent animate-pulse scale-105" : "border-transparent", isSidebarShrinked && "justify-center")} tabIndex={0} data-nav-id={`subs-${idx + 1}`} data-type="channel" data-id={ch.channelid}>
                  <div className="w-6 h-6 rounded-lg overflow-hidden border border-white/10 shrink-0 relative">
                    <img src={ch.image} alt="" className="w-full h-full object-cover" />
                    {ch.starred && <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-yellow-500 rounded-full shadow-glow" />}
                  </div>
                  {!isSidebarShrinked && <h4 className="font-black text-[11px] truncate flex-1 text-right leading-none">{ch.name}</h4>}
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>
      )}

      <main className="flex-1 overflow-y-auto no-scrollbar relative pt-2 pb-40 space-y-2 px-8" style={{ direction: 'rtl' }}>
        {isMobileView && !showIsolatedView && (
          <section className="space-y-2" data-row-id="media-row-subs-mobile">
            <div className="flex items-center justify-between px-4"><h2 className="text-[11px] font-black text-white/60 uppercase tracking-widest">قنواتك المفضلة</h2></div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 px-4">
              {favoriteChannels.map((ch, idx) => (
                <div key={ch.channelid} onClick={() => setSelectedChannel(ch)} className="flex flex-col items-center gap-1 cursor-pointer focusable" tabIndex={0} data-nav-id={`subs-mob-${idx}`}>
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/5 shadow-xl"><img src={ch.image} alt="" className="w-full h-full object-cover" /></div>
                  <span className="text-[8px] font-black text-white/40 truncate w-full text-center">{ch.name}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {!showIsolatedView ? (
          <>
            <section className="space-y-2" data-row-id="media-row-search">
              <div className="flex justify-start"><Button onClick={toggleReorderMode} variant={isReorderMode ? "default" : "outline"} className={cn("rounded-full h-8 px-4 font-black text-xs relative", isReorderMode ? "bg-yellow-500 text-black shadow-glow" : "bg-white/5 border-white/10 text-white")}><ShortcutBadge action="toggle_reorder" className="-bottom-2 -left-2" /><ArrowRightLeft className="w-3 h-3 ml-1.5" /> {isReorderMode ? "إيقاف الترتيب" : "تفعيل الترتيب"}</Button></div>
              <div className="flex items-center gap-1.5 w-full">
                <div className="flex-1 relative flex items-center">
                  <Input ref={inputRef} placeholder="ابحث عن فيديوهات..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && performSearch()} className="h-12 bg-white/5 border-none rounded-[1.2rem] pr-6 text-base font-bold text-right focusable" data-nav-id="search-input" />
                  <div className="absolute left-5 flex items-center gap-2"><Mic className="w-4 h-4 text-white/40 hover:text-primary cursor-pointer" /><Activity className="w-4 h-4 text-white/20" /></div>
                </div>
                <button onClick={performSearch} className="h-12 px-5 rounded-[1.2rem] bg-red-600 text-white font-black text-sm shadow-glow focusable flex items-center shrink-0 relative" data-nav-id="search-btn"><Youtube className="w-4 h-4 ml-1.5" /> بحث</button>
              </div>
            </section>

            <section className="space-y-1" data-row-id="media-row-reciters">
              <div className="flex items-center justify-between px-8"><h2 className="text-[10px] font-black text-white/40 uppercase tracking-widest">القراء والمبدعون</h2></div>
              <div className={horizontalListClass}>
                {favoriteReciters && favoriteReciters.map((r, i) => (
                  <button key={r.channelid} draggable={isReorderMode} onDragStart={(e) => handleDragStart(e, r.channelid, 'reciter')} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, r.channelid)} onClick={() => { if (isReorderMode) setPickedUpId(pickedUpId === r.channelid ? null : r.channelid); else handleReciterClick(r.name); }} data-type="reciter" data-id={r.channelid} className={cn("flex flex-col items-center gap-1 px-2 py-1.5 rounded-[1.2rem] transition-all focusable shrink-0 min-w-[80px] border-4", pickedUpId === r.channelid ? "border-accent scale-105" : "border-transparent hover:bg-emerald-600/20")} tabIndex={0} data-nav-id={`q-reciter-item-${i}`}>
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500/30 relative">
                      {r.image ? <img src={r.image} className="w-full h-full object-cover" alt="" /> : <User className="w-5 h-5 text-emerald-400" />}
                      {isReorderMode && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><ArrowRightLeft className="w-3 h-3 text-accent" /></div>}
                    </div>
                    <span className="text-[8px] font-black truncate max-w-[70px] text-white">{r.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-1" data-row-id="media-row-surahs">
              <div className={horizontalListClass}>
                {surahs && surahs.map((s, i) => (
                  <button key={i} onClick={() => handleSurahClick(s.name_arabic)} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-blue-600/20 focusable shrink-0 relative" tabIndex={0} data-nav-id={`surah-item-${i}`}>{s.name_arabic}</button>
                ))}
              </div>
            </section>

            {starredVideos.length > 0 && (
              <section className="space-y-1" data-row-id="media-row-starred">
                <div className="flex items-center justify-between px-8"><h2 className="text-[11px] font-black text-white flex items-center gap-1.5"><div className="w-5 h-5 rounded-lg bg-yellow-500 flex items-center justify-center"><Star className="w-3 h-3 text-black fill-current" /></div>الترددات المجرسة</h2></div>
                <div className={horizontalListClass}>
                  {isStarredLoading ? ([1, 2, 3].map(i => <div key={i} className="h-24 w-52 rounded-[1rem] bg-zinc-800 animate-pulse shrink-0" />)) : starredVideos.map((v, idx) => (
                    <div key={v.id + idx} onClick={() => setActiveVideo(v, starredVideos)} className="w-52 group relative overflow-hidden bg-zinc-900/80 rounded-[1rem] transition-all hover:scale-[1.02] cursor-pointer shadow-xl focusable shrink-0" tabIndex={0} data-nav-id={`starred-video-${idx}`}>
                      <div className="aspect-video relative overflow-hidden">
                        <img src={v.thumbnail} alt="" className="w-full h-full object-cover opacity-80" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Play className="w-6 h-6 text-white fill-white" /></div>
                      </div>
                      <div className="p-1.5 text-right"><h3 className="font-bold text-[9px] truncate text-white leading-none">{v.title}</h3></div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {latestPerSub.length > 0 && (
              <section className="space-y-1" data-row-id="media-row-subs-timeline">
                <div className="flex items-center justify-between px-8"><h2 className="text-[11px] font-black text-white flex items-center gap-1.5"><List className="w-3.5 h-3.5 text-primary" /> أحدث ما نشرته قنواتك</h2></div>
                <div className={horizontalListClass}>
                  {isSpecializedLoading ? ([1, 2, 3].map(i => <div key={i} className="h-24 w-52 rounded-[1rem] bg-zinc-800 animate-pulse shrink-0" />)) : latestPerSub.map((v, idx) => (
                    <div key={v.id + idx} onClick={() => setActiveVideo(v, latestPerSub)} className="w-52 group relative overflow-hidden bg-zinc-900/80 rounded-[1rem] transition-all hover:scale-[1.02] cursor-pointer shadow-xl focusable shrink-0" tabIndex={0} data-nav-id={`sub-timeline-${idx}`}>
                      <div className="aspect-video relative overflow-hidden">
                        <img src={v.thumbnail} alt="" className="w-full h-full object-cover opacity-80" />
                        {v.isLive && <div className="absolute top-2 left-2 bg-red-600 px-1.5 py-0.5 rounded text-[8px] font-black animate-pulse">LIVE</div>}
                      </div>
                      <div className="p-1.5 text-right"><h3 className="font-bold text-[9px] truncate text-white leading-none">{v.title}</h3><span className="text-[7px] text-white/40 block mt-0.5">{v.channelTitle}</span></div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {liveFromSubs.length > 0 && (
              <section className="space-y-1" data-row-id="media-row-subs-live">
                <div className="flex items-center justify-between px-8"><h2 className="text-[11px] font-black text-red-500 flex items-center gap-1.5"><RadioIcon className="w-3.5 h-3.5 animate-pulse" /> بث مباشر من اشتراكاتك</h2></div>
                <div className={horizontalListClass}>
                  {liveFromSubs.map((v, idx) => (
                    <div key={v.id + idx} onClick={() => setActiveVideo(v, liveFromSubs)} className="w-52 group relative overflow-hidden bg-zinc-900/80 border-2 border-red-600/20 rounded-[1rem] transition-all cursor-pointer focusable shrink-0" tabIndex={0} data-nav-id={`sub-live-${idx}`}>
                      <div className="aspect-video relative"><img src={v.thumbnail} alt="" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-red-600/10" /></div>
                      <div className="p-1.5 text-right"><h3 className="font-bold text-[8px] truncate text-white leading-none">{v.title}</h3></div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {kidsVideos.length > 0 && (
              <section className="space-y-1" data-row-id="media-row-kids">
                <div className="flex items-center justify-between px-8"><h2 className="text-[11px] font-black text-emerald-400 flex items-center gap-1.5"><Baby className="w-3.5 h-3.5" /> عالم الأطفال (ريان & كيدز)</h2></div>
                <div className={horizontalListClass}>
                  {isSpecializedLoading ? ([1, 2, 3].map(i => <div key={i} className="h-24 w-52 rounded-[1rem] bg-zinc-800 animate-pulse shrink-0" />)) : kidsVideos.map((v, idx) => (
                    <div key={v.id + idx} onClick={() => setActiveVideo(v, kidsVideos)} className="w-52 group relative overflow-hidden bg-zinc-900/80 rounded-[1rem] transition-all hover:scale-[1.02] cursor-pointer shadow-xl focusable shrink-0" tabIndex={0} data-nav-id={`kids-video-${idx}`}>
                      <div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} alt="" className="w-full h-full object-cover opacity-80" /></div>
                      <div className="p-1.5 text-right"><h3 className="font-bold text-[9px] truncate text-white leading-none">{v.title}</h3></div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {favoriteIptvChannels.length > 0 && (
              <section className="space-y-1" data-row-id="media-row-live-general">
                <div className="flex items-center justify-between px-8"><h2 className="text-[11px] font-black text-white flex items-center gap-1.5"><RadioIcon className="w-3.5 h-3.5 text-red-600" /> البث المباشر العام</h2></div>
                <div className={horizontalListClass}>
                  {favoriteIptvChannels.map((item: any, i: number) => (
                    <div key={i} onClick={() => setActiveIptv(item)} className="group relative overflow-hidden bg-zinc-900/80 border-2 border-emerald-600/40 rounded-[1rem] transition-all cursor-pointer focusable shrink-0 w-52" tabIndex={0} data-nav-id={`video-live-item-${i}`}>
                      <div className="aspect-video relative"><img src={item.stream_icon} alt="" className="w-full h-full object-cover" /></div>
                      <div className="p-1.5 text-right"><h3 className="font-bold text-[8px] truncate text-white leading-none">{item.name}</h3></div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <section className="space-y-2 animate-in slide-in-from-top-10 duration-700" data-row-id="media-row-isolated">
            <div className="flex justify-between items-center sticky top-0 z-[120] bg-black/60 backdrop-blur-xl p-2 rounded-[1.2rem] border border-white/10">
              <button onClick={() => { setSelectedChannel(null); setSearchResults([]); setSearch(""); setIsSidebarShrinked(false); }} className="h-9 px-5 rounded-full bg-red-600 text-white font-black text-xs shadow-glow focusable flex items-center gap-1.5 relative"><ChevronRight className="w-3.5 h-3.5" /><span>العودة</span></button>
              <h2 className="text-base font-black text-white">{selectedChannel ? selectedChannel.name : `نتائج البحث: ${search}`}</h2>
            </div>
            {loading ? (
              <div className="flex justify-center py-40"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {(selectedChannel ? channelVideos : searchResults).map((v, i) => (
                  <Card key={i} onClick={() => setActiveVideo(v, (selectedChannel ? channelVideos : searchResults))} className="group bg-white/5 border-none rounded-[1rem] transition-all hover:scale-[1.02] cursor-pointer focusable overflow-hidden shadow-2xl grid-item" tabIndex={0} data-nav-id={`video-grid-item-${i}`}>
                    <div className="aspect-video relative"><img src={v.thumbnail} alt="" className="w-full h-full object-cover" /></div>
                    <CardContent className="p-1.5 text-right h-12 flex items-center justify-end"><h3 className="font-bold text-[9px] text-white line-clamp-2 leading-none">{v.title}</h3></CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
