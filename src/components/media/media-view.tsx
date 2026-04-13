
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, Plus, Loader2, X, List, 
  Flame, Activity, RadioIcon, Trophy, Baby, ChevronRight, User, Youtube, Star, ArrowRightLeft, Mic
} from "lucide-react";
import { useMediaStore, YouTubeChannel, YouTubeVideo } from "@/lib/store";
import { searchYouTubeChannels, fetchChannelVideos, searchYouTubeVideos } from "@/lib/youtube";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ShortcutBadge } from "@/components/layout/car-dock";
import { Button } from "@/components/ui/button";

export function MediaView() {
  const { 
    favoriteChannels, setActiveVideo, dockSide, isSidebarShrinked, setIsSidebarShrinked,
    selectedChannel, setSelectedChannel, channelVideos, setChannelVideos,
    addChannel, favoriteIptvChannels, favoriteReciters, setActiveIptv, addReciter,
    isReorderMode, toggleReorderMode, pickedUpId, setPickedUpId, reorderChannelTo, reorderReciterTo
  } = useMediaStore();

  const { toast } = useToast();
  const [channelSearchQuery, setChannelSearchQuery] = useState("");
  const [channelResults, setChannelResults] = useState<YouTubeChannel[]>([]);
  const [isSearchingChannels, setIsSearchingChannels] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [isReciterAddOpen, setIsReciterAddOpen] = useState(false);
  const [reciterSearchQuery, setReciterSearchQuery] = useState("");
  const [reciterResults, setReciterResults] = useState<any[]>([]);
  const [isSearchingReciters, setIsSearchingReciters] = useState(false);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [surahs, setSurahs] = useState<any[]>([]);
  const [latestFromSubs, setLatestFromSubs] = useState<YouTubeVideo[]>([]);
  const [liveFromSubs, setLiveFavorites] = useState<YouTubeVideo[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const [windowWidth, setWindowWidth] = useState(0);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isSmallScreen = windowWidth > 0 && windowWidth < 968;
  const isDockLeft = dockSide === 'left';

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
    const type = e.dataTransfer.getData("type");
    if (sourceId === targetId) return;
    if (type === 'channel') reorderChannelTo(sourceId, targetId);
    else if (type === 'reciter') reorderReciterTo(sourceId, targetId);
    setPickedUpId(null);
  };

  const handleChannelSearch = useCallback(async () => {
    if (!channelSearchQuery.trim()) return;
    setIsSearchingChannels(true);
    try {
      const results = await searchYouTubeChannels(channelSearchQuery);
      setChannelResults(results || []);
    } finally { setIsSearchingChannels(false); }
  }, [channelSearchQuery]);

  const handleReciterSearch = useCallback(async () => {
    if (!reciterSearchQuery.trim()) return;
    setIsSearchingReciters(true);
    try {
      const results = await searchYouTubeChannels(reciterSearchQuery);
      setReciterResults(results || []);
    } finally { setIsSearchingReciters(false); }
  }, [reciterSearchQuery]);

  const interleavedLiveFeed = useMemo(() => {
    const ytItems = liveFromSubs.map(v => ({ ...v, feedType: 'youtube' }));
    const iptvItems = favoriteIptvChannels.map(c => ({ ...c, feedType: 'iptv' }));
    const result = [];
    const max = Math.max(ytItems.length, iptvItems.length);
    for (let i = 0; i < max; i++) {
      if (ytItems[i]) result.push(ytItems[i]);
      if (iptvItems[i]) result.push(iptvItems[i]);
    }
    return result;
  }, [liveFromSubs, favoriteIptvChannels]);

  useEffect(() => {
    async function fetchChannelContent() {
      if (!selectedChannel) { setChannelVideos([]); return; }
      setLoading(true);
      try {
        const videos = await fetchChannelVideos(selectedChannel.channelid);
        setChannelVideos(videos);
        setTimeout(() => {
          setIsSidebarShrinked(true);
          (document.querySelector('[data-nav-id="video-grid-item-0"]') as HTMLElement)?.focus();
        }, 300);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    fetchChannelContent();
  }, [selectedChannel, setChannelVideos, setIsSidebarShrinked]);

  useEffect(() => {
    async function fetchDiscoveryData() {
      try {
        const surahRes = await fetch("https://api.quran.com/api/v4/chapters?language=ar");
        if (surahRes.ok) setSurahs((await surahRes.json()).chapters || []);
      } catch (e) { console.error(e); }
    }
    fetchDiscoveryData();
    setIsSidebarShrinked(false);
    setTimeout(() => (document.querySelector('.active-nav-target') as HTMLElement || document.querySelector('[data-nav-id="subs-all"]') as HTMLElement)?.focus(), 500);
  }, [setIsSidebarShrinked]);

  const handleYTSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const results = await searchYouTubeVideos(query, 36);
      setSearchResults(results);
      setTimeout(() => {
        setIsSidebarShrinked(true);
        (document.querySelector('[data-nav-id="video-grid-item-0"]') as HTMLElement)?.focus();
      }, 300);
    } finally { setLoading(false); }
  }, [setIsSidebarShrinked]);

  const handleAutocomplete = (val: string, type: 'reciter' | 'surah') => {
    setSearch(prev => {
      const parts = prev.trim().split(/\s+/);
      if (type === 'surah') {
        if (parts.length > 0 && (parts[parts.length-1].startsWith("سورة") || surahs.some(s => s.name_arabic.includes(parts[parts.length-1])))) parts.pop();
        parts.push("سورة " + val);
        setTimeout(() => { document.querySelector('[data-nav-id="search-btn"]')?.focus(); }, 150);
      } else {
        if (parts.length > 0 && favoriteReciters.some(r => r.name.includes(parts[parts.length-1]))) parts.pop();
        parts.push(val);
        setTimeout(() => { document.querySelector('[data-nav-id^="q-surah-item-"]')?.focus(); }, 150);
      }
      return parts.join(" ") + " ";
    });
  };

  const refreshContent = useCallback(async () => {
    try {
      if (favoriteChannels.length > 0) {
        const latestPromises = favoriteChannels.map(ch => fetchChannelVideos(ch.channelid, 5));
        const results = await Promise.all(latestPromises);
        let live: YouTubeVideo[] = []; let latest: YouTubeVideo[] = [];
        results.forEach(list => { if (list.length > 0) { latest.push(...list.slice(0, 2)); live.push(...list.filter(v => v.isLive)); } });
        setLatestFromSubs(latest.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()));
        setLiveFavorites(live);
      }
    } catch (e) { console.error(e); }
  }, [favoriteChannels]);

  useEffect(() => { refreshContent(); }, [refreshContent]);

  const horizontalListClass = "w-full flex gap-4 px-8 pb-4 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center";
  const showIsolatedView = !!selectedChannel || searchResults.length > 0;

  return (
    <div className={cn("h-screen flex bg-transparent transition-all duration-700 overflow-hidden relative", isDockLeft ? "flex-row" : "flex-row-reverse")}>
      {!isSmallScreen && (
        <aside 
          className={cn(
            "h-full z-[110] transition-all duration-500 ease-in-out premium-glass flex flex-col shrink-0 border-white/5 bg-black/40 shadow-2xl",
            isSidebarShrinked ? "w-[8%]" : "w-[30%]",
            isDockLeft ? "border-r" : "border-l"
          )}
          style={{ direction: isDockLeft ? 'ltr' : 'rtl' }}
        >
          <div className={cn("p-6 flex items-center justify-between border-b border-white/5", isSidebarShrinked && "justify-center px-2")}>
            {!isSidebarShrinked && <h2 className="text-xl font-black text-white px-2">الاشتراكات</h2>}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <button className={cn("w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center transition-all", isSidebarShrinked && "w-12 h-12")} data-nav-id="subs-add-trigger" tabIndex={-1}>
                  <Plus className="w-6 h-6 text-primary" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl bg-zinc-950 border-white/10 rounded-[2.5rem] p-0 shadow-2xl z-[5000]">
                <div className="p-8 border-b border-white/10">
                  <h2 className="text-xl font-black text-white text-right">إضافة قناة جديدة</h2>
                  <div className="flex gap-4 mt-6">
                    <Input placeholder="اسم القناة..." value={channelSearchQuery} onChange={(e) => setChannelSearchQuery(e.target.value)} className="h-12 bg-white/5 rounded-xl px-6 text-right flex-1" />
                    <button onClick={handleChannelSearch} className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center focusable">
                      {isSearchingChannels ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <ScrollArea className="max-h-[50vh] p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {channelResults.map(ch => (
                      <div key={ch.channelid} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 focusable cursor-pointer" onClick={() => { addChannel(ch); setIsDialogOpen(false); }}>
                        <img src={ch.image} alt="" className="w-10 h-10 rounded-full object-cover" />
                        <span className="flex-1 text-right font-bold text-white truncate text-sm">{ch.name}</span>
                        <div className="bg-primary text-white text-[8px] font-black px-3 py-1.5 rounded-full uppercase">إضافة</div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
          <ScrollArea className="flex-1">
            <div className="py-4 flex flex-col gap-1">
              <div onClick={() => { setSelectedChannel(null); setSearchResults([]); setSearch(""); setIsSidebarShrinked(false); }} className={cn("flex items-center gap-3 p-3 transition-all cursor-pointer focusable overflow-hidden w-[90%] mx-auto rounded-xl", !selectedChannel && !searchResults.length ? "bg-primary text-white shadow-glow active-nav-target" : "hover:bg-white/5 text-white/60", isSidebarShrinked && "justify-center p-2")} tabIndex={0} data-nav-id="subs-all">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 shrink-0"><List className="w-5 h-5" /></div>
                {!isSidebarShrinked && <span className="flex-1 text-right font-black text-sm">الكل</span>}
              </div>
              {favoriteChannels.map((ch, idx) => (
                <div 
                  key={ch.channelid} 
                  draggable={isReorderMode}
                  onDragStart={(e) => handleDragStart(e, ch.channelid, 'channel')}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, ch.channelid)}
                  onClick={() => { 
                    if (isReorderMode) setPickedUpId(pickedUpId === ch.channelid ? null : ch.channelid);
                    else { setSearchResults([]); setSelectedChannel(ch); } 
                  }} 
                  data-type="channel" data-id={ch.channelid}
                  className={cn(
                    "flex items-center p-3 rounded-xl w-[90%] mx-auto gap-3 transition-all cursor-pointer focusable overflow-hidden shrink-0 border-2", 
                    selectedChannel?.channelid === ch.channelid ? "bg-primary text-white shadow-glow active-nav-target border-transparent" : "hover:bg-white/5 text-white/60 border-transparent",
                    pickedUpId === ch.channelid ? "border-accent animate-pulse scale-105" : "",
                    isSidebarShrinked && "justify-center p-2"
                  )} 
                  tabIndex={0} data-nav-id={`subs-${idx + 1}`}
                >
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 shrink-0 relative">
                    <img src={ch.image} alt="" className="w-full h-full object-cover" />
                    {ch.starred && <div className="absolute top-0 right-0 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center shadow-glow"><Star className="w-2 h-2 text-black fill-current" /></div>}
                    {isReorderMode && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><ArrowRightLeft className="w-4 h-4 text-accent" /></div>}
                  </div>
                  {!isSidebarShrinked && <h4 className="font-black text-sm truncate flex-1 text-right">{ch.name}</h4>}
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>
      )}

      <main className="flex-1 overflow-y-auto no-scrollbar relative pt-10 pb-40 space-y-12 px-12" style={{ direction: 'rtl' }}>
        {!showIsolatedView ? (
          <>
            <section className="space-y-8" data-row-id="media-row-search">
              <div className="flex flex-col gap-4">
                <div className="flex justify-start">
                  <Button 
                    onClick={toggleReorderMode} 
                    variant={isReorderMode ? "default" : "outline"}
                    className={cn("rounded-full h-14 px-10 font-black text-lg transition-all focusable relative", isReorderMode ? "bg-yellow-500 text-black shadow-glow border-yellow-400" : "bg-white/5 border-white/10 text-white")}
                    data-nav-id="media-reorder-toggle"
                  >
                    <ShortcutBadge action="toggle_reorder" className="-bottom-3 -left-3" />
                    <ArrowRightLeft className="w-6 h-6 ml-3" /> {isReorderMode ? "إيقاف الترتيب" : "تفعيل وضع الترتيب"}
                  </Button>
                </div>
                <div className="flex items-center gap-4 w-full">
                  <div className="flex-1 relative flex items-center">
                    <Input ref={inputRef} placeholder="ابحث عن فيديوهات..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-20 bg-white/5 border-white/10 rounded-[2.5rem] pr-8 text-2xl font-bold text-right shadow-2xl border-none focusable" data-nav-id="search-input" />
                    <div className="absolute left-6 flex items-center gap-4">
                      <Mic className="w-8 h-8 text-white/40 hover:text-primary cursor-pointer transition-colors" />
                      <Activity className="w-8 h-8 text-white/20" />
                    </div>
                  </div>
                  <button onClick={() => handleYTSearch(search)} className="h-20 px-10 rounded-[2.5rem] bg-red-600 text-white font-black text-xl shadow-glow focusable flex items-center shrink-0 relative" data-nav-id="search-btn">
                    <Youtube className="w-8 h-8 ml-3" /> بحث
                  </button>
                </div>
              </div>
            </section>

            {isSmallScreen && (
              <section className="space-y-6" data-row-id="media-row-subscriptions-grid">
                <div className="flex items-center justify-between px-8">
                  <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    <List className="w-6 h-6 text-primary" /> اشتراكاتك
                  </h2>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" className="rounded-full bg-white/5 border border-white/10 gap-2 h-12 focusable">
                        <Plus className="w-5 h-5" /> إضافة قناة
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl bg-zinc-950 border-white/10 rounded-[2.5rem] p-0 shadow-2xl z-[5000]">
                      <div className="p-8 border-b border-white/10">
                        <h2 className="text-xl font-black text-white text-right">إضافة قناة جديدة</h2>
                        <div className="flex gap-4 mt-6">
                          <Input placeholder="اسم القناة..." value={channelSearchQuery} onChange={(e) => setChannelSearchQuery(e.target.value)} className="h-12 bg-white/5 rounded-xl px-6 text-right flex-1" />
                          <button onClick={handleChannelSearch} className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center focusable">
                            {isSearchingChannels ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      <ScrollArea className="max-h-[50vh] p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {channelResults.map(ch => (
                            <div key={ch.channelid} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 focusable cursor-pointer" onClick={() => { addChannel(ch); setIsDialogOpen(false); }}>
                              <img src={ch.image} alt="" className="w-10 h-10 rounded-full object-cover" />
                              <span className="flex-1 text-right font-bold text-white truncate text-sm">{ch.name}</span>
                              <div className="bg-primary text-white text-[8px] font-black px-3 py-1.5 rounded-full uppercase">إضافة</div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 px-8">
                  {favoriteChannels.map((ch, idx) => (
                    <div 
                      key={ch.channelid} 
                      draggable={isReorderMode}
                      onDragStart={(e) => handleDragStart(e, ch.channelid, 'channel')}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, ch.channelid)}
                      onClick={() => { 
                        if (isReorderMode) setPickedUpId(pickedUpId === ch.channelid ? null : ch.channelid);
                        else { setSearchResults([]); setSelectedChannel(ch); } 
                      }} 
                      data-type="channel" data-id={ch.channelid}
                      className={cn(
                        "group flex flex-col items-center gap-3 p-4 rounded-[2rem] bg-white/5 border-2 transition-all focusable cursor-pointer shadow-xl relative",
                        pickedUpId === ch.channelid ? "border-accent scale-105" : "border-transparent hover:border-primary"
                      )}
                      tabIndex={0}
                      data-nav-id={`grid-sub-${idx}`}
                    >
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/5 shadow-2xl relative">
                        <img src={ch.image} alt="" className="w-full h-full object-cover" />
                        {ch.starred && <div className="absolute top-0 right-0 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center shadow-glow"><Star className="w-4 h-4 text-black fill-current" /></div>}
                        {isReorderMode && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><ArrowRightLeft className="w-10 h-10 text-accent" /></div>}
                      </div>
                      <span className="text-sm font-black text-white text-center truncate w-full">{ch.name}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-6" data-row-id="media-row-reciters">
              <div className="flex items-center justify-between px-8"><h2 className="text-xl font-black text-white/60 uppercase tracking-widest">القراء والمبدعون</h2></div>
              <div className={horizontalListClass}>
                <Dialog open={isReciterAddOpen} onOpenChange={setIsReciterAddOpen}>
                  <DialogTrigger asChild>
                    <button data-nav-id="q-reciter-add" className="flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-[2.5rem] bg-primary/10 border-2 border-dashed border-primary/30 text-primary hover:bg-primary/20 transition-all focusable shrink-0 min-w-[140px] h-[180px]">
                      <div className="w-20 h-20 rounded-full flex items-center justify-center bg-primary/20 shadow-glow"><Plus className="w-10 h-10" /></div>
                      <span className="text-xs font-black uppercase">إضافة قارئ</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl bg-zinc-950 border-white/10 rounded-[3rem] p-0 shadow-2xl z-[5000]">
                    <div className="p-8 border-b border-white/10">
                      <h2 className="text-xl font-black text-white text-right">إضافة قارئ جديد</h2>
                      <div className="flex gap-4 mt-6">
                        <Input placeholder="اسم القارئ..." value={reciterSearchQuery} onChange={(e) => setReciterSearchQuery(e.target.value)} className="h-12 bg-white/5 rounded-xl px-6 text-right flex-1" />
                        <button onClick={handleReciterSearch} className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center focusable"><Search className="w-5 h-5" /></button>
                      </div>
                    </div>
                    <ScrollArea className="max-h-[50vh] p-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {reciterResults.map(r => (
                          <div key={r.channelid} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 focusable cursor-pointer" onClick={() => { addReciter(r); setIsReciterAddOpen(false); }}>
                            <img src={r.image} alt="" className="w-10 h-10 rounded-full object-cover" />
                            <span className="flex-1 text-right font-bold text-white truncate text-sm">{r.name}</span>
                            <div className="bg-primary text-white text-[8px] font-black px-3 py-1.5 rounded-full uppercase">إضافة</div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>

                {favoriteReciters.map((r, i) => (
                  <button 
                    key={r.channelid} 
                    draggable={isReorderMode}
                    onDragStart={(e) => handleDragStart(e, r.channelid, 'reciter')}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, r.channelid)}
                    onClick={() => { 
                      if (isReorderMode) setPickedUpId(pickedUpId === r.channelid ? null : r.channelid);
                      else handleAutocomplete(r.name, 'reciter'); 
                    }} 
                    data-type="reciter" data-id={r.channelid}
                    className={cn(
                      "flex flex-col items-center gap-2 px-4 py-4 rounded-[2.5rem] bg-white/5 border-4 transition-all focusable shrink-0 min-w-[140px] relative",
                      pickedUpId === r.channelid ? "border-accent scale-105" : "border-transparent hover:bg-emerald-600/20"
                    )}
                    tabIndex={0} data-nav-id={`q-reciter-item-${i}`}
                  >
                    <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-emerald-500/30 shadow-2xl relative">
                      {r.image ? <img src={r.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center bg-emerald-500/10"><User className="w-12 h-12 text-emerald-400" /></div>}
                      {isReorderMode && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><ArrowRightLeft className="w-8 h-8 text-accent" /></div>}
                    </div>
                    <span className="text-sm font-black truncate max-w-[120px] text-white">{r.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-6" data-row-id="media-row-surahs">
              <div className="flex items-center justify-between px-8"><h2 className="text-xl font-black text-white/60 uppercase tracking-widest">السور والآيات</h2></div>
              <div className={horizontalListClass}>
                {surahs.map((s, i) => (
                  <button key={i} onClick={() => handleAutocomplete(s.name_arabic, 'surah')} data-nav-id={`q-surah-item-${i}`} className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-blue-600/20 transition-all focusable shrink-0 relative">
                    {s.name_arabic}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-6" data-row-id="media-row-live">
              <div className="flex items-center justify-between px-8"><h2 className="text-2xl font-black text-white flex items-center gap-3"><RadioIcon className="w-6 h-6 text-red-600" /> البث المباشر الموحد</h2></div>
              <div className={horizontalListClass}>
                {interleavedLiveFeed.map((item: any, i: number) => (
                  <div key={i} onClick={() => item.feedType === 'iptv' ? setActiveIptv(item) : setActiveVideo(item)} className={cn("group relative overflow-hidden bg-zinc-900/80 border-4 rounded-[2.5rem] transition-all cursor-pointer shadow-2xl focusable shrink-0 w-80", item.feedType === 'iptv' ? "border-emerald-600/40" : "border-red-600/40")} tabIndex={0} data-nav-id={`video-live-item-${i}`}><div className="aspect-video relative"><img src={item.stream_icon || item.thumbnail} alt="" className="w-full h-full object-cover" /></div><div className="p-5 text-right"><h3 className="font-bold text-sm truncate text-white">{item.name || item.title}</h3></div></div>
                ))}
              </div>
            </section>

            <section className="space-y-6" data-row-id="media-row-latest">
              <div className="flex items-center justify-between px-8"><h2 className="text-2xl font-black text-white flex items-center gap-3"><Activity className="w-6 h-6 text-primary" /> أحدث الفيديوهات</h2></div>
              <div className={horizontalListClass}>
                {latestFromSubs.map((v, i) => (<div key={i} onClick={() => setActiveVideo(v, latestFromSubs)} className="group relative overflow-hidden bg-zinc-900/80 rounded-[2.5rem] transition-all cursor-pointer focusable shadow-2xl shrink-0 w-80" tabIndex={0} data-nav-id={`video-latest-item-${i}`}><div className="aspect-video relative"><img src={v.thumbnail} alt="" className="w-full h-full object-cover" /></div><div className="p-5 text-right"><h3 className="font-bold text-sm truncate text-white">{v.title}</h3></div></div>))}
              </div>
            </section>
          </>
        ) : (
          <section className="space-y-8 animate-in slide-in-from-top-10 duration-700 p-8" data-row-id="media-row-isolated">
            <div className="flex justify-between items-center sticky top-0 z-[120] bg-black/60 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl">
              <h2 className="text-3xl font-black text-white">{selectedChannel ? selectedChannel.name : `نتائج البحث: ${search}`}</h2>
              <button onClick={() => { setSelectedChannel(null); setSearchResults([]); setSearch(""); setIsSidebarShrinked(false); }} className="h-16 px-10 rounded-full bg-red-600 text-white font-black text-xl shadow-glow focusable flex items-center gap-4 relative" data-nav-id="isolated-back-btn">
                <ChevronRight className="w-6 h-6" /><span>العودة</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-40">
              {(selectedChannel ? channelVideos : searchResults).map((v, i) => (<Card key={i} onClick={() => setActiveVideo(v, (selectedChannel ? channelVideos : searchResults))} className="group bg-white/5 border-none rounded-[2rem] transition-all hover:scale-[1.02] cursor-pointer focusable overflow-hidden shadow-2xl grid-item" tabIndex={0} data-nav-id={`video-grid-item-${i}`}><div className="aspect-video relative"><img src={v.thumbnail} alt="" className="w-full h-full object-cover" /></div><CardContent className="p-6 text-right h-24 flex items-center justify-end"><h3 className="font-bold text-sm text-white line-clamp-2">{v.title}</h3></CardContent></Card>))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
