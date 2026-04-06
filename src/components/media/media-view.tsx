
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, Plus, Loader2, X, Play, RadioIcon, 
  Flame, Activity, List, Star, Save, Trash2,
  Youtube, User, Pin, UserPlus, Trophy, Baby, ChevronRight
} from "lucide-react";
import { useMediaStore, YouTubeChannel, YouTubeVideo } from "@/lib/store";
import { searchYouTubeChannels, fetchChannelVideos, searchYouTubeVideos } from "@/lib/youtube";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { JSONBIN_MASTER_KEY } from "@/lib/constants";

export function MediaView() {
  const { 
    favoriteChannels, setActiveVideo, isFullScreen, dockSide,
    selectedChannel, setSelectedChannel, channelVideos, setChannelVideos,
    addChannel, removeChannel, favoriteIptvChannels, toggleStarChannel,
    saveChannelsReorder, setActiveIptv, favoriteReciters, addReciter
  } = useMediaStore();

  const { toast } = useToast();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [isSidebarFocused, setIsSidebarFocused] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  
  const [channelSearchQuery, setChannelSearchQuery] = useState("");
  const [channelResults, setChannelResults] = useState<YouTubeChannel[]>([]);
  const [isSearchingChannels, setIsSearchingChannels] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Reciter Add States
  const [isReciterAddOpen, setIsReciterAddOpen] = useState(false);
  const [reciterSearchQuery, setReciterSearchQuery] = useState("");
  const [reciterResults, setReciterResults] = useState<any[]>([]);
  const [isSearchingReciters, setIsSearchingReciters] = useState(false);
  const [pendingReciter, setPendingReciter] = useState<any | null>(null);
  const [manualReciterName, setManualReciterName] = useState("");
  
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [popularReciters, setPopularReciters] = useState<any[]>([]);
  const [surahs, setSurahs] = useState<any[]>([]);
  const [latestFromSubs, setLatestFromSubs] = useState<YouTubeVideo[]>([]);
  const [liveFromSubs, setLiveFavorites] = useState<YouTubeVideo[]>([]);
  const [trending24h, setTrending24h] = useState<YouTubeVideo[]>([]);
  const [sportsHub, setSportsHub] = useState<YouTubeVideo[]>([]);
  const [kidsHub, setKidsHub] = useState<YouTubeVideo[]>([]);
  
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const [suggestionContext, setSuggestionContext] = useState<'reciter' | 'surah' | 'none'>('none');
  const inputRef = useRef<HTMLInputElement>(null);

  const isWideScreen = windowWidth >= 1080;
  const isDockLeft = dockSide === 'left';

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    
    async function fetchDiscoveryData() {
      try {
        const recRes = await fetch(`https://api.jsonbin.io/v3/b/6909c1cd43b1c97be997b522/latest`, {
          headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
        });
        const surahRes = await fetch("https://api.quran.com/api/v4/chapters?language=ar");
        if (recRes.ok) {
          const data = await recRes.json();
          setPopularReciters(data.record || []);
        }
        if (surahRes.ok) {
          const data = await surahRes.json();
          setSurahs(data.chapters || []);
        }
      } catch (e) { console.error(e); }
    }
    fetchDiscoveryData();

    const timer = setTimeout(() => {
      const target = document.querySelector('[data-nav-id="subs-all"]') as HTMLElement;
      if (target) target.focus();
    }, 800);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  // SMART AUTO-FOCUS ON SEARCH RESULTS
  useEffect(() => {
    if (searchResults.length > 0) {
      setTimeout(() => {
        const firstResult = document.querySelector('[data-nav-id="video-result-0"]') as HTMLElement;
        if (firstResult) {
          firstResult.focus();
          firstResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 400);
    }
  }, [searchResults]);

  // SMART AUTO-FOCUS ON CHANNEL VIDEOS
  useEffect(() => {
    if (selectedChannel && channelVideos.length > 0) {
      setTimeout(() => {
        const firstVid = document.querySelector('[data-nav-id="video-ch-0"]') as HTMLElement;
        if (firstVid) {
          firstVid.focus();
          firstVid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 400);
    }
  }, [selectedChannel, channelVideos]);

  const handleYTSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const results = await searchYouTubeVideos(query, 36);
      setSearchResults(results);
    } finally { setLoading(false); }
  }, []);

  const lastWord = useMemo(() => {
    const parts = search.trim().split(/\s+/);
    return parts.length > 0 ? parts[parts.length - 1] : "";
  }, [search]);

  const handleAutocomplete = (val: string, type: 'reciter' | 'surah') => {
    setSearch(prev => {
      const parts = prev.trim().split(/\s+/);
      if (type === 'surah') {
        if (parts.length > 0 && (parts[parts.length-1].startsWith("سورة") || surahs.some(s => s.name_arabic.includes(parts[parts.length-1])))) {
          parts.pop();
        }
        parts.push("سورة " + val);
        setSuggestionContext('reciter');
      } else {
        if (parts.length > 0 && allReciters.some(r => r.name.includes(parts[parts.length-1]))) {
          parts.pop();
        }
        parts.push(val);
        setSuggestionContext('surah');
      }
      return parts.join(" ") + " ";
    });

    if (type === 'reciter') {
      // JUMP TO SURAHS ON RECITER SELECTION
      setTimeout(() => {
        const firstSurah = document.querySelector('[data-nav-id="q-surah-0"]') as HTMLElement;
        firstSurah?.focus();
      }, 100);
    } else {
      inputRef.current?.focus();
    }
  };

  const allReciters = useMemo(() => {
    const combined = [...popularReciters];
    favoriteReciters.forEach(r => {
      if (!combined.find(c => c.channelid === r.channelid)) combined.push(r);
    });
    return combined;
  }, [popularReciters, favoriteReciters]);

  const filteredReciters = useMemo(() => {
    if (search.endsWith(' ') && suggestionContext === 'reciter') return allReciters;
    if (!lastWord) return allReciters;
    if (lastWord === "سورة") return allReciters;
    return allReciters.filter(r => r.name.toLowerCase().includes(lastWord.toLowerCase()));
  }, [allReciters, lastWord, search, suggestionContext]);

  const filteredSurahs = useMemo(() => {
    if (search.endsWith(' ') && suggestionContext === 'surah') return surahs;
    let cleanLast = lastWord;
    if (cleanLast.startsWith("سورة")) cleanLast = cleanLast.replace("سورة", "").trim();
    if (!cleanLast) return surahs;
    return surahs.filter(s => s.name_arabic.includes(cleanLast));
  }, [surahs, lastWord, search, suggestionContext]);

  const refreshContent = useCallback(async () => {
    setIsDataLoading(true);
    try {
      const [sportsData, kidsData] = await Promise.all([
        searchYouTubeVideos("أهداف ملخصات مباريات اليوم", 12),
        searchYouTubeVideos("برامج تعليمية للأطفال بدون موسيقى", 12)
      ]);
      setSportsHub(sportsData);
      setKidsHub(kidsData);

      if (favoriteChannels.length > 0) {
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

        setLatestFromSubs(latest.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()));
        setLiveFavorites(live);
        
        const trending = [...allVideos].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        const channelCount: Record<string, number> = {};
        const filteredTrending = trending.filter(v => {
          const cid = v.channelId || "";
          channelCount[cid] = (channelCount[cid] || 0) + 1;
          return channelCount[cid] <= 3; 
        });
        setTrending24h(filteredTrending.slice(0, 15));
      }
    } catch (e) {
      console.error("Content Refresh Error:", e);
    } finally {
      setIsDataLoading(false);
    }
  }, [favoriteChannels]);

  useEffect(() => { refreshContent(); }, [refreshContent]);

  useEffect(() => {
    async function fetchSelectedChannelVideos() {
      if (selectedChannel) {
        setIsDataLoading(true);
        try {
          const videos = await fetchChannelVideos(selectedChannel.channelid, 40);
          setChannelVideos(videos);
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

  const handleReciterSearch = useCallback(async () => {
    if (!reciterSearchQuery.trim()) return;
    setIsSearchingReciters(true);
    try {
      const results = await searchYouTubeChannels(reciterSearchQuery);
      setReciterResults(results || []);
    } finally {
      setIsSearchingReciters(false);
    }
  }, [reciterSearchQuery]);

  const handleAddReciterFinal = () => {
    if (!pendingReciter || !manualReciterName.trim()) return;
    addReciter({ ...pendingReciter, name: manualReciterName });
    setIsReciterAddOpen(false);
    setPendingReciter(null);
    setManualReciterName("");
    toast({ title: "تمت الإضافة", description: `تمت إضافة القارئ ${manualReciterName} بنجاح.` });
  };

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

  const handleSaveReorder = async () => {
    try {
      await saveChannelsReorder();
      setIsReordering(false);
      toast({ title: "تم الحفظ", description: "تم تحديث ترتيب القنوات سحابياً" });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ", description: "فشل حفظ الترتيب" });
    }
  };

  const isExpanded = !isSidebarCollapsed || isSidebarPinned || isSidebarFocused;
  const sidebarWidthClass = isWideScreen 
    ? (isExpanded ? "w-[27%]" : "w-20") 
    : "w-0 hidden";

  const horizontalListClass = "w-full flex gap-4 px-8 pb-4 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center";

  // ISOLATED VIEW LOGIC: Show results/channels only
  const showIsolatedView = !!selectedChannel || searchResults.length > 0;

  return (
    <div 
      className={cn(
        "h-screen flex bg-transparent transition-all duration-700 overflow-hidden",
        isDockLeft ? "flex-row-reverse" : "flex-row"
      )}
    >
      
      <aside 
        className={cn(
          "h-full z-[110] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] premium-glass flex flex-col shrink-0 group/sidebar",
          sidebarWidthClass,
          isDockLeft ? "border-r border-white/5" : "border-l border-white/5"
        )}
        onMouseEnter={() => setIsSidebarCollapsed(false)}
        onMouseLeave={() => setIsSidebarCollapsed(true)}
        onFocus={() => setIsSidebarFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsSidebarFocused(false);
          }
        }}
      >
        <div className="p-6 flex flex-col gap-4 border-b border-white/5">
          <div className="flex items-center justify-between">
            {isExpanded && <h2 className="text-2xl font-black text-white tracking-tighter">الاشتراكات</h2>}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setIsSidebarPinned(!isSidebarPinned)} className={cn("w-8 h-8 rounded-full focusable transition-all opacity-20", isSidebarPinned && "bg-primary/20 opacity-100")}><Pin className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setIsReordering(!isReordering)} className={cn("w-8 h-8 rounded-full focusable transition-all opacity-20", isReordering && "bg-accent/40 opacity-100")}><List className="w-4 h-4" /></Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild><Button className="w-8 h-8 rounded-full bg-primary/80 p-0 focusable"><Plus className="w-4 h-4" /></Button></DialogTrigger>
                <DialogContent className="max-w-4xl bg-zinc-950 border-white/10 rounded-[2.5rem] p-0 dir-rtl shadow-2xl z-[5000]">
                  <DialogHeader className="p-8 border-b border-white/10 text-right">
                    <DialogTitle className="text-xl font-black text-white">إضافة قناة</DialogTitle>
                    <div className="flex gap-4 mt-6">
                      <Input placeholder="اسم القناة..." value={channelSearchQuery} onChange={(e) => setChannelSearchQuery(e.target.value)} className="h-12 bg-white/5 rounded-xl px-6 text-right flex-1" />
                      <Button onClick={handleChannelSearch} className="h-12 w-12 bg-primary rounded-xl focusable">{isSearchingChannels ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}</Button>
                    </div>
                  </DialogHeader>
                  <ScrollArea className="max-h-[50vh] p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {channelResults.map(ch => (
                        <div key={ch.channelid} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 focusable cursor-pointer" onClick={() => { addChannel(ch); setIsDialogOpen(false); }}>
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
          <div className="py-4 flex flex-col gap-1">
            <div 
              onClick={() => { setSelectedChannel(null); setSearchResults([]); setSearch(""); }} 
              className={cn("flex items-center gap-3 p-3 transition-all cursor-pointer focusable overflow-hidden w-[95%] mx-auto rounded-xl", !selectedChannel && !searchResults.length ? "bg-primary text-white shadow-glow active-nav-target" : "hover:bg-white/5 text-white/60")} 
              tabIndex={0} 
              data-nav-id="subs-all"
            >
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", !selectedChannel && !searchResults.length ? "bg-white/20" : "bg-white/10")}><List className="w-5 h-5" /></div>
              {isExpanded && <span className="flex-1 text-right font-black text-sm">الكل</span>}
            </div>
            {favoriteChannels.map((ch, idx) => {
              const isActive = selectedChannel?.channelid === ch.channelid;
              return (
                <div 
                  key={ch.channelid} 
                  onClick={() => { setSearchResults([]); setSelectedChannel(ch); }}
                  className={cn(
                    "flex items-center p-3 rounded-xl w-[95%] mx-auto gap-3 transition-all cursor-pointer focusable overflow-hidden group/item relative shrink-0",
                    isActive ? "bg-primary text-white shadow-glow active-nav-target" : "hover:bg-white/5 text-white/60"
                  )}
                  tabIndex={0}
                  data-nav-id={`subs-${idx}`}
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 flex-shrink-0 shadow-2xl">
                    <img src={ch.image} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-right overflow-hidden flex-1">
                    {isExpanded && <h4 className="font-black text-sm truncate">{ch.name}</h4>}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </aside>

      <main className="flex-1 overflow-y-auto no-scrollbar relative px-12" style={{ direction: 'rtl' }}>
        
        {/* DISCOVERY VIEW */}
        {!showIsolatedView && (
          <div className="flex flex-col space-y-12 pb-40">
            <section className="pt-10 space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="flex items-center gap-4 w-full">
                <div className="relative flex-1 group">
                  <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-7 h-7 text-white/20" />
                  <Input 
                    ref={inputRef}
                    placeholder="ابحث (رقم 0 للتركيز)..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => (e.key === 'Enter') && handleYTSearch(search)}
                    className="h-20 bg-white/5 border-white/10 rounded-[2.5rem] pr-16 pl-16 text-2xl font-bold text-right shadow-2xl focus:bg-white/10 transition-all border-none search-input-quiet"
                    data-nav-id="media-search-input"
                  />
                  {search && <button onClick={() => { setSearch(""); setSearchResults([]); setSuggestionContext('none'); }} className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/40 focusable"><X className="w-5 h-5" /></button>}
                </div>
                <Button onClick={() => handleYTSearch(search)} className="h-20 px-10 rounded-[2.5rem] bg-red-600 text-white font-black text-xl shadow-glow focusable shrink-0"><Youtube className="w-8 h-8 ml-3" /> بحث يوتيوب</Button>
              </div>

              <div className="space-y-6">
                <div className={horizontalListClass}>
                  <button onClick={() => setIsReciterAddOpen(true)} data-nav-id="q-reciter-0" className="w-28 h-28 rounded-full bg-emerald-600 text-white shadow-glow focusable shrink-0 flex flex-col items-center justify-center gap-1 transition-all active:scale-95">
                    <UserPlus className="w-10 h-10" />
                    <span className="text-[10px] font-black uppercase">إضافة</span>
                  </button>
                  {filteredReciters.map((r, i) => (
                    <button key={i} onClick={() => handleAutocomplete(r.name, 'reciter')} data-nav-id={`q-reciter-${i+1}`} className="flex flex-col items-center gap-2 px-4 py-4 rounded-[2.5rem] bg-white/5 border border-white/10 text-white hover:bg-emerald-600/20 transition-all focusable shrink-0 min-w-[140px]">
                      <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-emerald-500/30 shadow-2xl">
                        {r.image ? <img src={r.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center bg-emerald-500/10"><User className="w-12 h-12 text-emerald-400" /></div>}
                      </div>
                      <span className="text-sm font-black truncate max-w-[120px]">{r.name}</span>
                    </button>
                  ))}
                </div>
                <div className={horizontalListClass}>
                  {filteredSurahs.map((s, i) => (
                    <button key={i} onClick={() => handleAutocomplete(s.name_arabic, 'surah')} data-nav-id={`q-surah-${i}`} className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-blue-600/20 transition-all focusable shrink-0">{s.name_arabic}</button>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between px-8"><h2 className="text-2xl font-black text-white flex items-center gap-3"><RadioIcon className="w-6 h-6 text-red-600" /> البث المباشر الموحد</h2></div>
              <div className={horizontalListClass}>
                {interleavedLiveFeed.map((item: any, i: number) => {
                  const isIptv = item.feedType === 'iptv';
                  return (
                    <div key={`${isIptv ? 'iptv' : 'yt'}-${i}`} onClick={() => isIptv ? setActiveIptv(item, favoriteIptvChannels) : setActiveVideo(item, liveFromSubs)} className={cn("group relative overflow-hidden bg-zinc-900/80 border-4 rounded-[2.5rem] transition-all cursor-pointer shadow-2xl focusable shrink-0 w-80", isIptv ? "border-emerald-600/40" : "border-red-600/40")} tabIndex={0} data-nav-id={`video-live-${i}`}>
                      <div className="aspect-video relative"><img src={(isIptv ? item.stream_icon : item.thumbnail) || ""} alt="" className="w-full h-full object-cover" /><div className={cn("absolute top-4 left-4 px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase", isIptv ? "bg-emerald-600 shadow-glow" : "bg-red-600 animate-pulse")}>{isIptv ? "IPTV" : "LIVE"}</div></div>
                      <div className="p-5 text-right"><h3 className="font-bold text-sm truncate text-white">{isIptv ? item.name : item.title}</h3></div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between px-8"><h2 className="text-2xl font-black text-white flex items-center gap-3"><Activity className="w-6 h-6 text-primary" /> أحدث الفيديوهات من اشتراكاتك</h2></div>
              <div className={horizontalListClass}>
                {latestFromSubs.map((v, i) => (
                  <div key={v.id + i} onClick={() => setActiveVideo(v, latestFromSubs)} className="group relative overflow-hidden bg-zinc-900/80 rounded-[2.5rem] transition-all cursor-pointer focusable shadow-2xl shrink-0 w-80" tabIndex={0} data-nav-id={`video-latest-${i}`}>
                    <div className="aspect-video relative"><img src={v.thumbnail} alt="" className="w-full h-full object-cover" /></div>
                    <div className="p-5 text-right"><h3 className="font-bold text-sm truncate text-white">{v.title}</h3></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between px-8"><h2 className="text-2xl font-black text-white flex items-center gap-3"><Flame className="w-6 h-6 text-orange-500" /> الأعلى تفاعلاً</h2></div>
              <div className={horizontalListClass}>
                {trending24h.map((v, i) => (
                  <div key={v.id + i} onClick={() => setActiveVideo(v, trending24h)} className="group relative overflow-hidden bg-zinc-900/80 rounded-[2.5rem] transition-all cursor-pointer focusable shadow-2xl shrink-0 w-80" tabIndex={0} data-nav-id={`video-trending-${i}`}>
                    <div className="aspect-video relative"><img src={v.thumbnail} alt="" className="w-full h-full object-cover" /></div>
                    <div className="p-5 text-right"><h3 className="font-bold text-sm truncate text-white">{v.title}</h3></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between px-8"><h2 className="text-2xl font-black text-white flex items-center gap-3"><Trophy className="w-6 h-6 text-yellow-500" /> مركز الرياضة والأهداف</h2></div>
              <div className={horizontalListClass}>
                {sportsHub.map((v, i) => (
                  <div key={v.id + i} onClick={() => setActiveVideo(v, sportsHub)} className="group relative overflow-hidden bg-zinc-900/80 rounded-[2.5rem] transition-all cursor-pointer focusable shadow-2xl shrink-0 w-80" tabIndex={0} data-nav-id={`video-sports-${i}`}>
                    <div className="aspect-video relative"><img src={v.thumbnail} alt="" className="w-full h-full object-cover" /></div>
                    <div className="p-5 text-right"><h3 className="font-bold text-sm truncate text-white">{v.title}</h3></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-6 pb-20">
              <div className="flex items-center justify-between px-8"><h2 className="text-2xl font-black text-white flex items-center gap-3"><Baby className="w-6 h-6 text-pink-400" /> المكتبة التعليمية للأطفال</h2></div>
              <div className={horizontalListClass}>
                {kidsHub.map((v, i) => (
                  <div key={v.id + i} onClick={() => setActiveVideo(v, kidsHub)} className="group relative overflow-hidden bg-zinc-900/80 rounded-[2.5rem] transition-all cursor-pointer focusable shadow-2xl shrink-0 w-80" tabIndex={0} data-nav-id={`video-kids-${i}`}>
                    <div className="aspect-video relative"><img src={v.thumbnail} alt="" className="w-full h-full object-cover" /></div>
                    <div className="p-5 text-right"><h3 className="font-bold text-sm truncate text-white">{v.title}</h3></div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ISOLATED VIEW: Channels or Search Results */}
        {showIsolatedView && (
          <section className="space-y-8 animate-in slide-in-from-top-10 duration-700 p-8">
            <div className="flex justify-between items-center sticky top-0 z-[120] bg-black/60 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
                  {selectedChannel ? <User className="w-10 h-10 text-primary" /> : <Youtube className="w-10 h-10 text-red-600" />}
                </div>
                <div className="flex flex-col">
                  <h2 className="text-3xl font-black text-white tracking-tighter">
                    {selectedChannel ? selectedChannel.name : `نتائج البحث عن: ${search}`}
                  </h2>
                  <span className="text-[10px] text-white/40 uppercase font-bold tracking-[0.4em]">Isolated Perspective Mode</span>
                </div>
              </div>
              <Button 
                onClick={() => { setSelectedChannel(null); setSearchResults([]); setSearch(""); }} 
                className="h-16 px-10 rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-xl shadow-glow focusable transition-all flex items-center gap-4"
                data-nav-id="isolated-back-btn"
              >
                <ChevronRight className="w-6 h-6" />
                <span>العودة للخلف</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-40">
              {isDataLoading && channelVideos.length === 0 ? (
                <div className="col-span-full py-20 flex justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
              ) : (selectedChannel ? channelVideos : searchResults).map((v, i) => (
                <Card 
                  key={v.id + i} 
                  onClick={() => setActiveVideo(v, (selectedChannel ? channelVideos : searchResults))} 
                  className="group bg-white/5 border-none rounded-[2rem] transition-all hover:scale-[1.02] cursor-pointer focusable overflow-hidden shadow-2xl" 
                  tabIndex={0} 
                  data-nav-id={selectedChannel ? `video-ch-${i}` : `video-result-${i}`}
                >
                  <div className="aspect-video relative"><img src={v.thumbnail} alt="" className="w-full h-full object-cover" />{v.isLive && <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase animate-pulse shadow-glow">LIVE</div>}</div>
                  <CardContent className="p-6 text-right h-24 flex items-center justify-end"><h3 className="font-bold text-sm text-white line-clamp-2 leading-tight">{v.title}</h3></CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>

      <Dialog open={isReciterAddOpen} onOpenChange={setIsReciterAddOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950 border-white/10 rounded-[2.5rem] p-8 dir-rtl shadow-2xl z-[5000]">
          <DialogHeader className="text-right">
            <DialogTitle className="text-2xl font-black text-white">إضافة قارئ بقناة يوتيوب</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {!pendingReciter ? (
              <>
                <div className="flex gap-4">
                  <Input placeholder="ابحث عن قناة القارئ..." value={reciterSearchQuery} onChange={(e) => setReciterSearchQuery(e.target.value)} className="h-14 bg-white/5 rounded-xl px-6 text-right flex-1" />
                  <Button onClick={handleReciterSearch} className="h-14 w-14 bg-primary rounded-xl focusable">{isSearchingReciters ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-6 h-6" />}</Button>
                </div>
                <ScrollArea className="h-64 bg-white/5 rounded-2xl p-4 border border-white/5">
                  <div className="space-y-3">
                    {reciterResults.map(res => (
                      <div key={res.channelid} className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5 hover:border-emerald-500 cursor-pointer" onClick={() => { setPendingReciter(res); setManualReciterName(res.name); }}>
                        <div className="flex items-center gap-4"><img src={res.image} className="w-10 h-10 rounded-full" alt="" /><span className="font-bold text-white text-sm">{res.name}</span></div>
                        <div className="px-4 py-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase">اختيار</div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="space-y-6 animate-in fade-in zoom-in-95">
                <div className="flex flex-col items-center gap-4 p-6 bg-white/5 rounded-3xl border border-white/10">
                  <img src={pendingReciter.image} className="w-24 h-24 rounded-full border-4 border-emerald-500 shadow-glow" alt="" />
                  <p className="text-white/40 text-xs uppercase font-bold tracking-widest">قناة: {pendingReciter.name}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-white/60 mr-2">الاسم المعروض (يدوي)</label>
                  <Input placeholder="ادخل اسم القارئ..." value={manualReciterName} onChange={(e) => setManualReciterName(e.target.value)} className="h-14 bg-black/40 border-white/10 rounded-xl px-6 text-xl font-bold text-white text-right" />
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setPendingReciter(null)} className="flex-1 h-14 rounded-xl border-white/10 focusable">تراجع</Button>
                  <Button onClick={handleAddReciterFinal} className="flex-2 h-14 bg-emerald-600 text-white font-black text-lg rounded-xl shadow-glow focusable">حفظ القارئ</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
