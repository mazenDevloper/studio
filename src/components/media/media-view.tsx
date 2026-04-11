
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, Plus, Loader2, X, List, 
  Flame, Activity, RadioIcon, Trophy, Baby, ChevronRight, User, UserPlus, Youtube, Star
} from "lucide-react";
import { useMediaStore, YouTubeChannel, YouTubeVideo } from "@/lib/store";
import { searchYouTubeChannels, fetchChannelVideos, searchYouTubeVideos } from "@/lib/youtube";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { JSONBIN_MASTER_KEY } from "@/lib/constants";
import { ShortcutBadge } from "@/components/layout/car-dock";

/**
 * MediaView v38.0 - Added Quick Actions (Red for Delete, Yellow for Star).
 */
export function MediaView() {
  const { 
    favoriteChannels, setActiveVideo, dockSide, isSidebarShrinked, setIsSidebarShrinked,
    selectedChannel, setSelectedChannel, channelVideos, setChannelVideos,
    addChannel, favoriteIptvChannels, favoriteReciters, setActiveIptv, addReciter, removeReciter
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
  const [popularReciters, setPopularReciters] = useState<any[]>([]);
  const [surahs, setSurahs] = useState<any[]>([]);
  const [latestFromSubs, setLatestFromSubs] = useState<YouTubeVideo[]>([]);
  const [liveFromSubs, setLiveFavorites] = useState<YouTubeVideo[]>([]);
  const [trending24h, setTrending24h] = useState<YouTubeVideo[]>([]);
  const [sportsHub, setSportsHub] = useState<YouTubeVideo[]>([]);
  const [kidsHub, setKidsHub] = useState<YouTubeVideo[]>([]);
  const [windowWidth, setWindowWidth] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDockLeft = dockSide === 'left';

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
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize(); window.addEventListener('resize', handleResize);
    async function fetchDiscoveryData() {
      try {
        const recRes = await fetch(`https://api.jsonbin.io/v3/b/6909c1cd43b1c97be997b522/latest`, { headers: { 'X-Master-Key': JSONBIN_MASTER_KEY } });
        const surahRes = await fetch("https://api.quran.com/api/v4/chapters?language=ar");
        if (recRes.ok) setPopularReciters((await recRes.json()).record || []);
        if (surahRes.ok) setSurahs((await surahRes.json()).chapters || []);
      } catch (e) { console.error(e); }
    }
    fetchDiscoveryData();
    setIsSidebarShrinked(false);
    setTimeout(() => (document.querySelector('.active-nav-target') as HTMLElement || document.querySelector('[data-nav-id="subs-all"]') as HTMLElement)?.focus(), 500);
    return () => window.removeEventListener('resize', handleResize);
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
        setTimeout(() => {
          const searchBtn = document.querySelector('[data-nav-id="search-btn"]') as HTMLElement;
          searchBtn?.focus();
          searchBtn?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      } else {
        if (parts.length > 0 && allReciters.some(r => r.name.includes(parts[parts.length-1]))) parts.pop();
        parts.push(val);
        setTimeout(() => {
          const firstSurah = document.querySelector('[data-nav-id^="q-surah-item-"]') as HTMLElement;
          firstSurah?.focus();
          firstSurah?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
      return parts.join(" ") + " ";
    });
  };

  const allReciters = useMemo(() => {
    const combined = [...popularReciters];
    favoriteReciters.forEach(r => { if (!combined.find(c => c.channelid === r.channelid)) combined.push(r); });
    return combined;
  }, [popularReciters, favoriteReciters]);

  const refreshContent = useCallback(async () => {
    try {
      const [sportsData, kidsData] = await Promise.all([searchYouTubeVideos("أهداف ملخصات مباريات اليوم", 12), searchYouTubeVideos("برامج تعليمية للأطفال بدون موسيقى", 12)]);
      setSportsHub(sportsData); setKidsHub(kidsData);
      if (favoriteChannels.length > 0) {
        const latestPromises = favoriteChannels.map(ch => fetchChannelVideos(ch.channelid, 5));
        const results = await Promise.all(latestPromises);
        let live: YouTubeVideo[] = []; let latest: YouTubeVideo[] = [];
        results.forEach(list => { if (list.length > 0) { latest.push(...list.slice(0, 2)); live.push(...list.filter(v => v.isLive)); } });
        setLatestFromSubs(latest.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()));
        setLiveFavorites(live);
        setTrending24h(latest.slice(0, 15));
      }
    } catch (e) { console.error(e); }
  }, [favoriteChannels]);

  useEffect(() => { refreshContent(); }, [refreshContent]);

  const horizontalListClass = "w-full flex gap-4 px-8 pb-4 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center";
  const showIsolatedView = !!selectedChannel || searchResults.length > 0;

  return (
    <div className={cn("h-screen flex bg-transparent transition-all duration-700 overflow-hidden relative", isDockLeft ? "flex-row" : "flex-row-reverse")}>
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
              <button 
                className={cn(
                  "w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center transition-all",
                  isSidebarShrinked && "w-12 h-12"
                )}
                data-nav-id="subs-add-trigger"
                tabIndex={-1}
              >
                <Plus className="w-6 h-6 text-primary" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl bg-zinc-950 border-white/10 rounded-[2.5rem] p-0 shadow-2xl z-[5000]">
              <div className="p-8 border-b border-white/10">
                <h2 className="text-xl font-black text-white">إضافة قناة جديدة</h2>
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
            <div 
              className={cn("flex items-center p-3 rounded-xl w-[90%] mx-auto gap-3 transition-all cursor-default overflow-hidden relative border border-dashed border-white/10 mb-2 opacity-40", isSidebarShrinked && "justify-center p-2")} 
              data-nav-id="subs-add-item"
              tabIndex={-1}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10"><Plus className="w-5 h-5 text-primary" /></div>
              {!isSidebarShrinked && <h4 className="font-black text-sm truncate flex-1 text-right text-primary">إضافة قناة</h4>}
            </div>

            <div onClick={() => { setSelectedChannel(null); setSearchResults([]); setSearch(""); setIsSidebarShrinked(false); }} className={cn("flex items-center gap-3 p-3 transition-all cursor-pointer focusable overflow-hidden w-[90%] mx-auto rounded-xl", !selectedChannel && !searchResults.length ? "bg-primary text-white shadow-glow active-nav-target" : "hover:bg-white/5 text-white/60", isSidebarShrinked && "justify-center p-2")} tabIndex={0} data-nav-id="subs-all">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 shrink-0"><List className="w-5 h-5" /></div>
              {!isSidebarShrinked && <span className="flex-1 text-right font-black text-sm">الكل</span>}
            </div>
            {favoriteChannels.map((ch, idx) => (
              <div 
                key={ch.channelid} 
                onClick={() => { setSearchResults([]); setSelectedChannel(ch); }} 
                className={cn(
                  "flex items-center p-3 rounded-xl w-[90%] mx-auto gap-3 transition-all cursor-pointer focusable overflow-hidden shrink-0 group/channel relative", 
                  selectedChannel?.channelid === ch.channelid ? "bg-primary text-white shadow-glow active-nav-target" : "hover:bg-white/5 text-white/60", 
                  isSidebarShrinked && "justify-center p-2"
                )} 
                tabIndex={0} 
                data-nav-id={`subs-${idx + 1}`}
                data-type="channel"
                data-id={ch.channelid}
              >
                {!isSidebarShrinked && (
                  <>
                    <ShortcutBadge action="delete_item" className="-top-2 -right-2 opacity-0 group-hover/channel:opacity-100 group-focus/channel:opacity-100 transition-opacity" />
                    <ShortcutBadge action="toggle_star" className="-top-2 -left-2 opacity-0 group-hover/channel:opacity-100 group-focus/channel:opacity-100 transition-opacity" />
                  </>
                )}
                <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 shrink-0 relative">
                  <img src={ch.image} alt="" className="full h-full object-cover" />
                  {ch.starred && <div className="absolute top-0 right-0 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center shadow-glow"><Star className="w-2 h-2 text-black fill-current" /></div>}
                </div>
                {!isSidebarShrinked && <h4 className="font-black text-sm truncate flex-1 text-right">{ch.name}</h4>}
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      <main className="flex-1 overflow-y-auto no-scrollbar relative pt-10 pb-40 space-y-12 px-12" style={{ direction: 'rtl' }}>
        {!showIsolatedView ? (
          <>
            <section className="space-y-8" data-row-id="media-row-search">
              <div className="flex items-center gap-4 w-full">
                <Input ref={inputRef} placeholder="ابحث عن فيديوهات..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-20 bg-white/5 border-white/10 rounded-[2.5rem] pr-8 text-2xl font-bold text-right shadow-2xl border-none pointer-events-none" tabIndex={-1} />
                <button onClick={() => handleYTSearch(search)} className="h-20 px-10 rounded-[2.5rem] bg-red-600 text-white font-black text-xl shadow-glow focusable flex items-center shrink-0 relative" data-nav-id="search-btn">
                  <ShortcutBadge action="focus_search" className="-bottom-3 -left-3" />
                  <Youtube className="w-8 h-8 ml-3" /> بحث
                </button>
              </div>
            </section>

            <section className="space-y-6" data-row-id="media-row-reciters">
              <div className="flex items-center justify-between px-8"><h2 className="text-xl font-black text-white/60 uppercase tracking-widest">القراء والمبدعون</h2></div>
              <div className={horizontalListClass}>
                <Dialog open={isReciterAddOpen} onOpenChange={setIsReciterAddOpen}>
                  <DialogTrigger asChild>
                    <button 
                      data-nav-id="q-reciter-add"
                      className="flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-[2.5rem] bg-primary/10 border-2 border-dashed border-primary/30 text-primary hover:bg-primary/20 transition-all focusable shrink-0 min-w-[140px] h-[180px]"
                    >
                      <div className="w-20 h-20 rounded-full flex items-center justify-center bg-primary/20 shadow-glow">
                        <Plus className="w-10 h-10" />
                      </div>
                      <span className="text-xs font-black uppercase">إضافة قارئ</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl bg-zinc-950 border-white/10 rounded-[3rem] p-0 shadow-2xl z-[5000]">
                    <div className="p-8 border-b border-white/10">
                      <h2 className="text-xl font-black text-white">إضافة قارئ جديد</h2>
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

                {allReciters.map((r, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleAutocomplete(r.name, 'reciter')} 
                    data-nav-id={`q-reciter-item-${i}`} 
                    data-type="reciter"
                    data-id={r.channelid}
                    className="flex flex-col items-center gap-2 px-4 py-4 rounded-[2.5rem] bg-white/5 border border-white/10 text-white hover:bg-emerald-600/20 transition-all focusable shrink-0 min-w-[140px] relative group/reciter"
                  >
                    {i === 0 && <ShortcutBadge action="focus_reciters" className="-bottom-3 -left-3" />}
                    <ShortcutBadge action="delete_item" className="-top-2 -right-2 opacity-0 group-hover/reciter:opacity-100 group-focus/reciter:opacity-100 transition-opacity" />
                    <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-emerald-500/30 shadow-2xl">{r.image ? <img src={r.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center bg-emerald-500/10"><User className="w-12 h-12 text-emerald-400" /></div>}</div>
                    <span className="text-sm font-black truncate max-w-[120px]">{r.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-6" data-row-id="media-row-surahs">
              <div className="flex items-center justify-between px-8"><h2 className="text-xl font-black text-white/60 uppercase tracking-widest">السور والآيات</h2></div>
              <div className={horizontalListClass}>
                {surahs.map((s, i) => (
                  <button key={i} onClick={() => handleAutocomplete(s.name_arabic, 'surah')} data-nav-id={`q-surah-item-${i}`} className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-blue-600/20 transition-all focusable shrink-0 relative">
                    {i === 0 && <ShortcutBadge action="focus_surahs" className="-bottom-3 -left-3" />}
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

            <section className="space-y-6" data-row-id="media-row-trending">
              <div className="flex items-center justify-between px-8"><h2 className="text-2xl font-black text-white flex items-center gap-3"><Flame className="w-6 h-6 text-orange-500" /> الأعلى تفاعلاً</h2></div>
              <div className={horizontalListClass}>
                {trending24h.map((v, i) => (<div key={i} onClick={() => setActiveVideo(v, trending24h)} className="group relative overflow-hidden bg-zinc-900/80 rounded-[2.5rem] transition-all cursor-pointer focusable shadow-2xl shrink-0 w-80" tabIndex={0} data-nav-id={`video-trending-item-${i}`}><div className="aspect-video relative"><img src={v.thumbnail} alt="" className="w-full h-full object-cover" /></div><div className="p-5 text-right"><h3 className="font-bold text-sm truncate text-white">{v.title}</h3></div></div>))}
              </div>
            </section>

            <section className="space-y-6" data-row-id="media-row-sports">
              <div className="flex items-center justify-between px-8"><h2 className="text-2xl font-black text-white flex items-center gap-3"><Trophy className="w-6 h-6 text-yellow-500" /> مركز الرياضة</h2></div>
              <div className={horizontalListClass}>
                {sportsHub.map((v, i) => (<div key={i} onClick={() => setActiveVideo(v, sportsHub)} className="group relative overflow-hidden bg-zinc-900/80 rounded-[2.5rem] transition-all cursor-pointer focusable shadow-2xl shrink-0 w-80" tabIndex={0} data-nav-id={`video-sports-item-${i}`}><div className="aspect-video relative"><img src={v.thumbnail} alt="" className="w-full h-full object-cover" /></div><div className="p-5 text-right"><h3 className="font-bold text-sm truncate text-white">{v.title}</h3></div></div>))}
              </div>
            </section>

            <section className="space-y-6 pb-20" data-row-id="media-row-kids">
              <div className="flex items-center justify-between px-8"><h2 className="text-2xl font-black text-white flex items-center gap-3"><Baby className="w-6 h-6 text-pink-400" /> مكتبة الأطفال</h2></div>
              <div className={horizontalListClass}>
                {kidsHub.map((v, i) => (
                  <div key={i} onClick={() => setActiveVideo(v, kidsHub)} className="group relative overflow-hidden bg-zinc-900/80 rounded-[2.5rem] transition-all cursor-pointer focusable shadow-2xl shrink-0 w-80" tabIndex={0} data-nav-id={`video-kids-item-${i}`}>
                    <div className="aspect-video relative"><img src={v.thumbnail} alt="" className="w-full h-full object-cover" /></div>
                    <div className="p-5 text-right"><h3 className="font-bold text-sm truncate text-white">{v.title}</h3></div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="space-y-8 animate-in slide-in-from-top-10 duration-700 p-8" data-row-id="media-row-isolated">
            <div className="flex justify-between items-center sticky top-0 z-[120] bg-black/60 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl">
              <h2 className="text-3xl font-black text-white">{selectedChannel ? selectedChannel.name : `نتائج البحث: ${search}`}</h2>
              <button onClick={() => { setSelectedChannel(null); setSearchResults([]); setSearch(""); setIsSidebarShrinked(false); }} className="h-16 px-10 rounded-full bg-red-600 text-white font-black text-xl shadow-glow focusable flex items-center gap-4 relative" data-nav-id="isolated-back-btn">
                <ShortcutBadge action="nav_back" className="-bottom-3 -left-3" />
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
