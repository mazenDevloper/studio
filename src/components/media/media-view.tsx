
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, Plus, Loader2, X, List, 
  Flame, Activity, RadioIcon, Trophy, Baby, ChevronRight, User, Youtube, Star, ArrowRightLeft, Mic, Play, Clock, Goal, UserPlus, CheckCircle2,
  Sparkles, AlertCircle
} from "lucide-react";
import { useMediaStore, YouTubeChannel, YouTubeVideo } from "@/lib/store";
import { searchYouTubeChannels, fetchChannelVideos, searchYouTubeVideos } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ShortcutBadge } from "@/components/layout/car-dock";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * AddContentModal - Leanback Unified Selection & Visual Scrolling Fix v99.0
 */
function AddContentModal({ 
  type, 
  isOpen, 
  onOpenChange, 
  onAdd 
}: { 
  type: 'channel' | 'reciter', 
  isOpen: boolean, 
  onOpenChange: (val: boolean) => void,
  onAdd: (item: YouTubeChannel) => void 
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YouTubeChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 3) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await searchYouTubeChannels(val);
      setResults(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Smart Selection: Auto-focus first result and ensure it's in view
  useEffect(() => {
    if (results.length > 0 && !loading && isOpen) {
      const timer = setTimeout(() => {
        const firstResult = document.querySelector('[data-nav-id="modal-result-0"]') as HTMLElement;
        if (firstResult) {
          firstResult.focus();
          scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [results, loading, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(val) => { onOpenChange(val); if(!val) { setResults([]); setQuery(""); } }}>
      <DialogContent className="bg-zinc-950/95 backdrop-blur-3xl border-white/10 text-white max-w-2xl max-h-[85vh] flex flex-col p-0 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] outline-none">
        <div className="p-8 pb-4 border-b border-white/5 bg-black/40">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black flex items-center gap-4 tracking-tighter text-right">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20 shadow-glow">
                {type === 'channel' ? <Youtube className="w-7 h-7 text-primary" /> : <Mic className="w-7 h-7 text-emerald-400" />}
              </div>
              {type === 'channel' ? "إضافة قناة اشتراك" : "إضافة قارئ أو مبدع"}
            </DialogTitle>
          </DialogHeader>
          <div className="relative mt-8 group">
            <Input 
              placeholder={type === 'channel' ? "ابحث عن قنوات يوتيوب..." : "ابحث عن قراء ومبتهلين..."} 
              value={query} 
              onChange={(e) => handleSearch(e.target.value)} 
              className="h-16 bg-white/5 border-white/10 rounded-2xl pr-14 text-xl focusable transition-all focus:bg-white/10 focus:border-primary/50 text-right" 
              data-nav-id="modal-search-input"
            />
            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Search className="w-6 h-6" />}
            </div>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-4 space-y-3"
          data-row-id="modal-results-container"
        >
          {results.length > 0 ? (
            results.map((item, i) => (
              <div 
                key={item.channelid} 
                onClick={() => { onAdd(item); onOpenChange(false); }} 
                className="flex items-center gap-5 p-5 rounded-[2rem] bg-white/5 hover:bg-white/10 transition-all cursor-pointer border-4 border-transparent group animate-in fade-in slide-in-from-bottom-2 focusable outline-none"
                tabIndex={0}
                data-nav-id={`modal-result-${i}`}
                data-type="modal-item"
              >
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                  <img src={item.image} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <h4 className="font-black text-xl truncate text-white">{item.name}</h4>
                  <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mt-1 font-bold">YouTube Official Content</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-xl">
                  <Plus className="w-6 h-6" />
                </div>
              </div>
            ))
          ) : query.length >= 3 && !loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-30">
              <Sparkles className="w-16 h-16" />
              <p className="font-black text-xl">لا توجد نتائج مطابقة</p>
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-10">
              <Search className="w-20 h-20" />
              <p className="font-black text-2xl uppercase tracking-[0.5em]">Start Searching</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * MediaView v99.0 - Strategic Leanback Mastery
 */
export function MediaView() {
  const { 
    favoriteChannels, addChannel, setActiveVideo, dockSide, isSidebarShrinked, setIsSidebarShrinked,
    selectedChannel, setSelectedChannel, channelVideos, setChannelVideos,
    favoriteReciters, addReciter, setActiveIptv, favoriteIptvChannels,
    isReorderMode, toggleReorderMode, pickedUpId, setPickedUpId, reorderChannelTo, reorderReciterTo,
    apiError
  } = useMediaStore();

  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [surahs, setSurahs] = useState<any[]>([]);
  
  const [starredVideos, setStarredVideos] = useState<YouTubeVideo[]>([]);
  const [isStarredLoading, setIsStarredLoading] = useState(false);
  
  const [liveFromSubs, setLiveFromSubs] = useState<YouTubeVideo[]>([]);
  const [kidsVideos, setKidsVideos] = useState<YouTubeVideo[]>([]);
  const [matchGoals, setMatchGoals] = useState<YouTubeVideo[]>([]);
  const [latestPerSub, setLatestPerSub] = useState<YouTubeVideo[]>([]);
  const [isSpecializedLoading, setIsSpecializedLoading] = useState(false);
  const [isIsolatedViewActive, setIsIsolatedViewActive] = useState(false);

  const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);
  const [isAddReciterOpen, setIsAddReciterOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const isDockLeft = dockSide === 'left';

  const truncateName = (name: string) => {
    if (!name) return "";
    return name.length > 13 ? name.substring(0, 13) + "..." : name;
  };

  useEffect(() => {
    fetch("https://api.quran.com/api/v4/chapters?language=ar")
      .then(r => r.json())
      .then(d => setSurahs(d.chapters || []))
      .catch(e => console.error("Surahs Load Error:", e));
    
    setIsSidebarShrinked(false);
    setTimeout(() => {
      const allBtn = document.querySelector('[data-nav-id="q-reciter-add"]') as HTMLElement || document.querySelector('[data-nav-id="subs-all"]') as HTMLElement;
      allBtn?.focus();
    }, 500);
  }, [setIsSidebarShrinked]);

  const fetchFeeds = useCallback(async () => {
    if (!favoriteChannels) return;
    setIsStarredLoading(true);
    setIsSpecializedLoading(true);
    
    try {
      const [writerResults, todResults, generalGoals] = await Promise.allSettled([
        searchYouTubeVideos("كاتب الاهداف", 5),
        searchYouTubeVideos("TOD TV ملخص", 15),
        searchYouTubeVideos("اهداف وملخصات مباريات اليوم", 20)
      ]);
      
      const mergedGoals: YouTubeVideo[] = [];
      const beINFilter = (v: YouTubeVideo) => {
        const chan = v.channelTitle?.toLowerCase() || "";
        const title = v.title?.toLowerCase() || "";
        return !chan.includes('bein') && !title.includes('bein');
      };

      if (writerResults.status === 'fulfilled' && Array.isArray(writerResults.value)) {
        mergedGoals.push(...writerResults.value.slice(0, 2));
      }
      if (todResults.status === 'fulfilled' && Array.isArray(todResults.value)) {
        mergedGoals.push(...todResults.value.filter(v => v.channelTitle?.toLowerCase().includes('tod')));
      }
      if (generalGoals.status === 'fulfilled' && Array.isArray(generalGoals.value)) {
        mergedGoals.push(...generalGoals.value.filter(beINFilter));
      }
      
      const uniqueGoals = Array.from(new Map(mergedGoals.map(v => [v.id, v])).values());
      setMatchGoals(uniqueGoals.slice(0, 35));

      const [kidsRyan, kidsArabic] = await Promise.allSettled([
        searchYouTubeVideos("ريان بالعربي", 10),
        searchYouTubeVideos("كيدز بالعربي", 10)
      ]);
      
      const interleavedKids: YouTubeVideo[] = [];
      const listRyan = kidsRyan.status === 'fulfilled' ? kidsRyan.value : [];
      const listArabic = kidsArabic.status === 'fulfilled' ? kidsArabic.value : [];
      for (let i = 0; i < 10; i++) {
        if (listRyan[i]) interleavedKids.push(listRyan[i]);
        if (listArabic[i]) interleavedKids.push(listArabic[i]);
      }
      setKidsVideos(interleavedKids);

      if (starredChannels.length > 0) {
        const results = await Promise.allSettled(starredChannels.slice(0, 5).map(c => fetchChannelVideos(c.channelid, 5)));
        const allStarred: YouTubeVideo[] = [];
        results.forEach(res => { if (res.status === 'fulfilled') allStarred.push(...res.value); });
        setStarredVideos(allStarred.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()));
      }

      const timelineChannels = favoriteChannels.slice(0, 20);
      const timelineResults = await Promise.allSettled(timelineChannels.map(c => fetchChannelVideos(c.channelid, 3)));
      const timeline: YouTubeVideo[] = [];
      const liveFeeds: YouTubeVideo[] = [];
      timelineResults.forEach(res => {
        if (res.status === 'fulfilled' && res.value.length > 0) {
          timeline.push(res.value[0]);
          res.value.forEach(v => { if (v.isLive) liveFeeds.push(v); });
        }
      });
      setLatestPerSub(timeline);
      setLiveFromSubs(liveFeeds);
    } catch (e) { console.warn(e); } finally {
      setIsStarredLoading(false);
      setIsSpecializedLoading(false);
    }
  }, [favoriteChannels]);

  const starredChannels = useMemo(() => favoriteChannels.filter(c => c.starred), [favoriteChannels]);

  useEffect(() => { fetchFeeds(); }, [fetchFeeds]);

  useEffect(() => {
    if (selectedChannel) {
      setLoading(true);
      setIsIsolatedViewActive(true);
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
    setIsIsolatedViewActive(true);
    setIsSidebarShrinked(true);
    try {
      const res = await searchYouTubeVideos(search);
      setSearchResults(res || []);
    } catch (e) {
      toast({ variant: "destructive", title: "بحث يوتيوب", description: "تعذر جلب النتائج" });
    } finally {
      setLoading(false);
    }
  };

  const resetView = () => {
    setSelectedChannel(null);
    setSearchResults([]);
    setSearch("");
    setIsIsolatedViewActive(false);
    setIsSidebarShrinked(false);
  };

  const horizontalListClass = "w-full flex gap-1.5 px-8 pb-1 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center";
  const showIsolatedView = isIsolatedViewActive || !!selectedChannel || searchResults.length > 0;

  return (
    <div className={cn("h-screen flex bg-transparent transition-all duration-700 overflow-hidden relative", 
      isDockLeft ? "flex-row-reverse" : "flex-row")}>
      
      {!isMobile && (
        <aside className={cn(
          "h-full z-[110] transition-all duration-500 ease-in-out premium-glass flex flex-col shrink-0 border-white/5 bg-black/40 shadow-2xl", 
          isSidebarShrinked ? "w-[6%]" : "w-[25%]", 
          isDockLeft ? "border-l" : "border-r"
        )}>
          <div className={cn("p-2 flex items-center justify-between border-b border-white/5", isSidebarShrinked && "justify-center px-1")}>
            {!isSidebarShrinked && <h2 className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">الاشتراكات</h2>}
            <button 
              onClick={() => setIsAddChannelOpen(true)}
              className={cn("w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center transition-all focusable", isSidebarShrinked && "w-8 h-8")} 
              tabIndex={0}
              data-nav-id="subs-add-btn"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar py-1 flex flex-col gap-0.5">
            <div onClick={resetView} className={cn("flex items-center gap-2 p-1 transition-all cursor-pointer focusable overflow-hidden w-[96%] mx-auto rounded-lg", !selectedChannel && !searchResults.length ? "bg-primary text-white active-nav-target" : "hover:bg-white/5 text-white/60", isSidebarShrinked && "justify-center")} tabIndex={0} data-nav-id="subs-all">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/10 shrink-0"><List className="w-3.5 h-3.5" /></div>
              {!isSidebarShrinked && <span className="flex-1 text-right font-black text-[11px] block overflow-hidden whitespace-nowrap px-1">الكل</span>}
            </div>
            {favoriteChannels && favoriteChannels.map((ch, idx) => (
              <div 
                key={ch.channelid} 
                draggable={isReorderMode} 
                onDragStart={(e) => { if (!isReorderMode) return; e.dataTransfer.setData("id", ch.channelid); setPickedUpId(ch.channelid); }} 
                onDragOver={(e) => e.preventDefault()} 
                onDrop={(e) => { if (!isReorderMode) return; e.preventDefault(); const sourceId = e.dataTransfer.getData("id"); if (sourceId === ch.channelid) return; reorderChannelTo(sourceId, ch.channelid); setPickedUpId(null); }} 
                onClick={() => { if (isReorderMode) setPickedUpId(pickedUpId === ch.channelid ? null : ch.channelid); else { setSearchResults([]); setSelectedChannel(ch); } }} 
                className={cn(
                  "flex flex-row items-center p-1 rounded-lg w-[96%] mx-auto gap-2 transition-all cursor-pointer focusable overflow-hidden shrink-0 border-2", 
                  selectedChannel?.channelid === ch.channelid ? "bg-primary text-white shadow-glow" : "hover:bg-white/5 text-white/60", 
                  pickedUpId === ch.channelid ? "border-accent animate-pulse scale-105" : "border-transparent", 
                  isSidebarShrinked && "justify-center"
                )} 
                tabIndex={0} 
                data-nav-id={`subs-${idx + 1}`} 
                data-type="channel" 
                data-id={ch.channelid}
              >
                <div className="w-6 h-6 rounded-lg overflow-hidden border border-white/10 shrink-0 relative">
                  <img src={ch.image} className="w-full h-full object-cover" alt="" />
                  {ch.starred && <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-yellow-500 rounded-full shadow-glow" />}
                </div>
                {!isSidebarShrinked && (
                  <h4 className="font-black text-[11px] flex-1 text-right leading-none text-white block overflow-hidden whitespace-nowrap px-1">
                    {truncateName(ch.name)}
                  </h4>
                )}
              </div>
            ))}
          </div>
        </aside>
      )}

      <main className="flex-1 overflow-y-auto custom-scrollbar relative pt-2 pb-40 space-y-2 px-8" style={{ direction: 'rtl' }}>
        {!showIsolatedView ? (
          <>
            <section className="space-y-1" data-row-id="media-row-reciters">
              <div className="flex items-center justify-between px-8"><h2 className="text-[10px] font-black text-white/40 uppercase tracking-widest">القراء والمبدعون</h2></div>
              <div className={horizontalListClass}>
                <button 
                  onClick={() => setIsAddReciterOpen(true)}
                  className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-[1.2rem] transition-all focusable shrink-0 min-w-[80px] border-4 border-transparent hover:bg-emerald-600/20" 
                  tabIndex={0} 
                  data-nav-id="q-reciter-add"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-emerald-500/10 border-2 border-dashed border-emerald-500/30 text-emerald-400 shadow-lg"><UserPlus className="w-6 h-6" /></div>
                  <span className="text-[8px] font-black text-emerald-400/60 uppercase tracking-widest">إضافة</span>
                </button>

                {favoriteReciters && favoriteReciters.map((r, i) => (
                  <button key={r.channelid} onClick={() => { if (isReorderMode) setPickedUpId(pickedUpId === r.channelid ? null : r.channelid); else handleReciterClick(r.name); }} data-type="reciter" data-id={r.channelid} className={cn("flex flex-col items-center gap-1 px-2 py-1.5 rounded-[1.2rem] transition-all focusable shrink-0 min-w-[80px] border-4", pickedUpId === r.channelid ? "border-accent scale-105" : "border-transparent hover:bg-emerald-600/20")} tabIndex={0} data-nav-id={`q-reciter-item-${i}`}>
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-500/30 relative">
                      {r.image ? <img src={r.image} className="w-full h-full object-cover" alt="" /> : <User className="w-5 h-5 text-emerald-400" />}
                      {isReorderMode && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><ArrowRightLeft className="w-3 h-3 text-accent" /></div>}
                    </div>
                    <span className="text-[8px] font-black truncate max-w-[70px] text-white block">{truncateName(r.name)}</span>
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

            {apiError && (
              <section className="mx-8 mt-4 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="bg-red-600/10 border border-red-600/30 rounded-2xl p-4 flex items-center gap-4 shadow-[0_0_20px_rgba(220,38,38,0.1)]">
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shrink-0 shadow-glow">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-white font-black text-sm leading-none mb-1">خطأ في الاتصال بخدمة يوتيوب</h3>
                    <p className="text-red-400/80 font-bold text-[11px] leading-tight">
                      جميع مفاتيح اليوتيوب (عدد: {apiError.count}) تم فحصها مرتين وهي منتهية الصلاحية حالياً. يرجى التواصل مع الدعم الفني.
                    </p>
                  </div>
                </div>
              </section>
            )}

            <section className="space-y-2 pt-4" data-row-id="media-row-search">
              <div className="flex justify-start px-8"><Button onClick={toggleReorderMode} variant={isReorderMode ? "default" : "outline"} className={cn("rounded-full h-8 px-4 font-black text-xs relative", isReorderMode ? "bg-yellow-500 text-black shadow-glow" : "bg-white/5 border-white/10 text-white")}><ShortcutBadge action="toggle_reorder" className="-bottom-2 -left-2" /><ArrowRightLeft className="w-3 h-3 ml-1.5" /> {isReorderMode ? "إيقاف الترتيب" : "تفعيل الترتيب"}</Button></div>
              <div className="flex items-center gap-1.5 w-full px-8">
                <div className="flex-1 relative flex items-center">
                  <Input ref={inputRef} placeholder="ابحث عن فيديوهات..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && performSearch()} className="h-12 bg-white/5 border-none rounded-[1.2rem] pr-6 text-base font-bold text-right focusable" data-nav-id="search-input" />
                  <div className="absolute left-5 flex items-center gap-2"><Mic className="w-4 h-4 text-white/40 hover:text-primary cursor-pointer" /><Activity className="w-4 h-4 text-white/20" /></div>
                </div>
                <button onClick={performSearch} className="h-12 px-5 rounded-[1.2rem] bg-red-600 text-white font-black text-sm shadow-glow focusable flex items-center shrink-0 relative" data-nav-id="search-btn"><Youtube className="w-4 h-4 ml-1.5" /> بحث</button>
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
                        {v.duration && <div className="absolute bottom-2 right-2 bg-black text-white text-[14px] px-3 py-1.5 rounded-lg font-black z-10 border border-white/20 shadow-2xl">{v.duration}</div>}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Play className="w-6 h-6 text-white fill-white" /></div>
                      </div>
                      <div className="p-1.5 text-right"><h3 className="font-bold text-[9px] truncate text-white leading-none">{v.title}</h3></div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {matchGoals.length > 0 && (
              <section className="space-y-1" data-row-id="media-row-goals">
                <div className="flex items-center justify-between px-8">
                  <h2 className="text-[11px] font-black text-white flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Goal className="w-3 h-3 text-primary" />
                    </div>
                    أهداف وملخصات مباريات اليوم (TOD حصرياً)
                  </h2>
                </div>
                <div className={horizontalListClass}>
                  {matchGoals.map((v, idx) => (
                    <div key={v.id + idx} onClick={() => setActiveVideo(v, matchGoals)} className="w-52 group relative overflow-hidden bg-zinc-900/80 rounded-[1rem] transition-all hover:scale-[1.02] cursor-pointer shadow-xl focusable shrink-0" tabIndex={0} data-nav-id={`goal-video-${idx}`}>
                      <div className="aspect-video relative overflow-hidden">
                        <img src={v.thumbnail} alt="" className="w-full h-full object-cover opacity-80" />
                        {v.duration && <div className="absolute bottom-2 right-2 bg-black text-white text-[14px] px-3 py-1.5 rounded-lg font-black z-10 border border-white/20 shadow-2xl">{v.duration}</div>}
                        <div className="absolute inset-0 bg-primary/5" />
                      </div>
                      <div className="p-1.5 text-right">
                        <h3 className="font-bold text-[9px] truncate text-white leading-none">{v.title}</h3>
                        <span className="text-[7px] text-white/40 block mt-0.5">{v.channelTitle}</span>
                      </div>
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
                      <div className="aspect-video relative overflow-hidden">
                        <img src={v.thumbnail} alt="" className="w-full h-full object-cover opacity-80" />
                        {v.duration && <div className="absolute bottom-2 right-2 bg-black text-white text-[14px] px-3 py-1.5 rounded-lg font-black z-10 border border-white/20 shadow-2xl">{v.duration}</div>}
                      </div>
                      <div className="p-1.5 text-right"><h3 className="font-bold text-white leading-none text-[9px] truncate">{v.title}</h3></div>
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
                        {v.duration && !v.isLive && <div className="absolute bottom-2 right-2 bg-black text-white text-[14px] px-3 py-1.5 rounded-lg font-black z-10 border border-white/20 shadow-2xl">{v.duration}</div>}
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
              <button onClick={resetView} className="h-9 px-5 rounded-full bg-red-600 text-white font-black text-xs shadow-glow focusable flex items-center gap-1.5 relative"><ChevronRight className="w-3.5 h-3.5" /><span>العودة</span></button>
              <h2 className="text-base font-black text-white">{selectedChannel ? truncateName(selectedChannel.name) : `نتائج البحث: ${search}`}</h2>
            </div>
            {loading ? (
              <div className="flex justify-center py-40"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {(selectedChannel ? channelVideos : searchResults).map((v, i) => (
                  <Card key={i} onClick={() => setActiveVideo(v, (selectedChannel ? channelVideos : searchResults))} className="group bg-white/5 border-none rounded-[1rem] transition-all hover:scale-[1.02] cursor-pointer focusable overflow-hidden shadow-2xl grid-item" tabIndex={0} data-nav-id={`video-grid-item-${i}`}>
                    <div className="aspect-video relative">
                      <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
                      {v.duration && <div className="absolute bottom-2 right-2 bg-black text-white text-[14px] px-3 py-1.5 rounded-lg font-black z-10 border border-white/20 shadow-2xl">{v.duration}</div>}
                    </div>
                    <CardContent className="p-1.5 text-right h-12 flex items-center justify-end"><h3 className="font-bold text-[9px] text-white line-clamp-2 leading-none">{v.title}</h3></CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <AddContentModal 
        type="channel" 
        isOpen={isAddChannelOpen} 
        onOpenChange={setIsAddChannelOpen} 
        onAdd={(ch) => { addChannel(ch); toast({ title: "تمت الإضافة", description: `قناة ${ch.name} متاحة الآن` }); }} 
      />
      
      <AddContentModal 
        type="reciter" 
        isOpen={isAddReciterOpen} 
        onOpenChange={setIsAddReciterOpen} 
        onAdd={(r) => { addReciter(r); handleReciterClick(r.name); toast({ title: "تمت الإضافة", description: `القارئ ${r.name} متاح الآن` }); }} 
      />
    </div>
  );
}
