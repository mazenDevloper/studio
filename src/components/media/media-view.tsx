
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

export function MediaView() {
  const { 
    favoriteChannels, addChannel, setActiveVideo, dockSide, isSidebarShrinked, setIsSidebarShrinked,
    selectedChannel, setSelectedChannel, channelVideos, setChannelVideos,
    favoriteReciters, addReciter, setActiveIptv, favoriteIptvChannels,
    isReorderMode, toggleReorderMode, pickedUpId, setPickedUpId, reorderChannelTo, reorderReciterTo,
    apiError, fetchPriorityData
  } = useMediaStore();

  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [surahs, setSurahs] = useState<any[]>([]);
  const [windowWidth, setWindowWidth] = useState(0);
  
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

  const isDockLeft = dockSide === 'left';
  const showFullSidebar = windowWidth > 980;

  const truncateName = (name: string, limit = 18) => {
    if (!name) return "";
    return name.length > limit ? name.substring(0, limit) + "..." : name;
  };

  useEffect(() => {
    fetchPriorityData('media');
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    fetch("https://api.quran.com/api/v4/chapters?language=ar").then(r => r.json()).then(d => setSurahs(d.chapters || []));
    setIsSidebarShrinked(false);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchFeeds = useCallback(async () => {
    if (!favoriteChannels.length) return;
    setIsStarredLoading(true);
    setIsSpecializedLoading(true);
    try {
      const [writerResults, todResults, generalGoals] = await Promise.allSettled([
        searchYouTubeVideos("كاتب الاهداف", 5),
        searchYouTubeVideos("TOD TV ملخص", 15),
        searchYouTubeVideos("اهداف وملخصات مباريات اليوم", 20)
      ]);
      const mergedGoals: YouTubeVideo[] = [];
      const beINFilter = (v: YouTubeVideo) => !(v.channelTitle?.toLowerCase() || "").includes('bein');
      if (writerResults.status === 'fulfilled') mergedGoals.push(...writerResults.value.slice(0, 2));
      if (todResults.status === 'fulfilled') mergedGoals.push(...todResults.value.filter(v => v.channelTitle?.toLowerCase().includes('tod')));
      if (generalGoals.status === 'fulfilled') mergedGoals.push(...generalGoals.value.filter(beINFilter));
      setMatchGoals(Array.from(new Map(mergedGoals.map(v => [v.id, v])).values()).slice(0, 35));

      const [kidsRyan, kidsArabic] = await Promise.allSettled([searchYouTubeVideos("ريان بالعربي", 10), searchYouTubeVideos("كيدز بالعربي", 10)]);
      const interleavedKids: YouTubeVideo[] = [];
      const lR = kidsRyan.status === 'fulfilled' ? kidsRyan.value : [];
      const lA = kidsArabic.status === 'fulfilled' ? kidsArabic.value : [];
      for (let i = 0; i < 10; i++) { if (lR[i]) interleavedKids.push(lR[i]); if (lA[i]) interleavedKids.push(lA[i]); }
      setKidsVideos(interleavedKids);

      const starredChannels = favoriteChannels.filter(c => c.starred);
      if (starredChannels.length > 0) {
        const results = await Promise.allSettled(starredChannels.slice(0, 5).map(c => fetchChannelVideos(c.channelid, 5)));
        const allStarred: YouTubeVideo[] = [];
        results.forEach(res => { if (res.status === 'fulfilled') allStarred.push(...res.value); });
        setStarredVideos(allStarred.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()));
      }

      const timelineResults = await Promise.allSettled(favoriteChannels.slice(0, 20).map(c => fetchChannelVideos(c.channelid, 3)));
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
    } finally { setIsStarredLoading(false); setIsSpecializedLoading(false); }
  }, [favoriteChannels]);

  useEffect(() => { fetchFeeds(); }, [fetchFeeds]);

  useEffect(() => {
    if (selectedChannel) {
      setLoading(true); setIsIsolatedViewActive(true);
      fetchChannelVideos(selectedChannel.channelid, 20).then(v => { setChannelVideos(v); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [selectedChannel]);

  const handleReciterClick = (name: string) => { setSearch(name); setTimeout(() => document.querySelector('[data-nav-id="search-btn"]')?.focus(), 50); };
  const handleSurahClick = (name: string) => { setSearch(prev => `${prev} سورة ${name}`); setTimeout(() => document.querySelector('[data-nav-id="search-btn"]')?.focus(), 50); };

  const performSearch = async () => {
    if (!search.trim()) return;
    setLoading(true); setIsIsolatedViewActive(true); setIsSidebarShrinked(true);
    try { const res = await searchYouTubeVideos(search); setSearchResults(res || []); } finally { setLoading(false); }
  };

  const resetView = () => { setSelectedChannel(null); setSearchResults([]); setSearch(""); setIsIsolatedViewActive(false); setIsSidebarShrinked(false); };

  const horizontalListClass = "w-full flex gap-3 px-8 pb-4 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center";
  const showIsolatedView = isIsolatedViewActive || !!selectedChannel || searchResults.length > 0;

  return (
    <div className={cn("h-screen flex bg-transparent overflow-hidden relative", isDockLeft ? "flex-row-reverse" : "flex-row")}>
      
      {showFullSidebar && (
        <aside className={cn(
          "h-full z-[110] transition-all duration-0 premium-glass flex flex-col shrink-0 border-white/5 bg-black/40 shadow-2xl", 
          isSidebarShrinked ? "w-[6%]" : "w-[28%]", 
          isDockLeft ? "border-l" : "border-r"
        )}>
          <div className="p-2 flex items-center justify-between border-b border-white/5">
            {!isSidebarShrinked && <h2 className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">الاشتراكات</h2>}
            <button onClick={() => setIsAddChannelOpen(true)} className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center transition-all focusable relative z-[150] shadow-glow border border-primary/20"><Plus className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar py-1 flex flex-col gap-0.5">
            <div onClick={resetView} className={cn("flex items-center gap-3 p-2 cursor-pointer focusable w-[96%] mx-auto rounded-lg", !selectedChannel && !searchResults.length ? "bg-primary text-white" : "hover:bg-white/5 text-white/60")} tabIndex={0} data-nav-id="subs-all">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 shrink-0"><List className="w-4 h-4" /></div>
              {!isSidebarShrinked && <span className="flex-1 text-right font-black text-sm block overflow-hidden whitespace-nowrap px-1">الكل</span>}
            </div>
            {favoriteChannels.map((ch, idx) => (
              <div key={ch.channelid} draggable={isReorderMode} onDragStart={(e) => { if (isReorderMode) { e.dataTransfer.setData("id", ch.channelid); setPickedUpId(ch.channelid); } }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { if (isReorderMode) { e.preventDefault(); const sId = e.dataTransfer.getData("id"); if (sId !== ch.channelid) reorderChannelTo(sId, ch.channelid); setPickedUpId(null); } }} onClick={() => { if (isReorderMode) setPickedUpId(pickedUpId === ch.channelid ? null : ch.channelid); else { setSearchResults([]); setSelectedChannel(ch); } }} className={cn("flex flex-row-reverse items-center p-2 rounded-lg w-[96%] mx-auto gap-3 cursor-pointer focusable shrink-0 border-2", selectedChannel?.channelid === ch.channelid ? "bg-primary text-white shadow-glow" : "hover:bg-white/5 text-white/60", pickedUpId === ch.channelid ? "border-accent animate-pulse" : "border-transparent")} tabIndex={0} data-nav-id={`subs-${idx + 1}`} data-type="channel" data-id={ch.channelid}>
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 shrink-0 relative"><img src={ch.image} className="w-full h-full object-cover" />{ch.starred && <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full shadow-glow" />}</div>
                {!isSidebarShrinked && <h4 className="font-black text-sm flex-1 text-right leading-none text-white block overflow-hidden whitespace-nowrap px-1">{truncateName(ch.name)}</h4>}
              </div>
            ))}
          </div>
        </aside>
      )}

      <main className="flex-1 overflow-y-auto custom-scrollbar relative pt-4 pb-40 space-y-12 px-8" style={{ direction: 'rtl' }}>
        {!showIsolatedView ? (
          <>
            <div className="space-y-6">
              {!showFullSidebar && (
                <section className="min-h-[160px]" data-row-id="media-row-subs-grid">
                  <div className="flex items-center justify-between px-8 mb-4"><h2 className="text-[12px] font-black text-white/40 uppercase tracking-widest">الاشتراكات المفضلة</h2><button onClick={() => setIsAddChannelOpen(true)} className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center focusable border border-primary/20 shadow-glow"><Plus className="w-7 h-7" /></button></div>
                  <div className={horizontalListClass}>
                    <button onClick={resetView} data-nav-id="sub-list-all-0" className={cn("px-10 h-32 rounded-[2.5rem] flex items-center gap-4 focusable shrink-0", !selectedChannel ? "bg-primary text-white" : "bg-white/5 text-white/60")}><List className="w-10 h-10" /><span className="font-black text-2xl">الكل</span></button>
                    {favoriteChannels.map((ch, idx) => (
                      <button key={ch.channelid} data-nav-id={`sub-list-item-${idx + 1}`} onClick={() => setSelectedChannel(ch)} className={cn("h-32 px-4 rounded-[2.5rem] bg-white/5 border-4 focusable flex flex-col items-center justify-center gap-2 shrink-0 w-40", selectedChannel?.channelid === ch.channelid ? "border-primary bg-primary/10" : "border-transparent")}>
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl"><img src={ch.image} className="w-full h-full object-cover" /></div>
                        <span className="font-bold text-[10px] text-white/40 truncate w-full text-center">{truncateName(ch.name, 12)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="min-h-[160px]" data-row-id="media-row-reciters">
                <div className="flex items-center justify-between px-8 mb-4"><h2 className="text-[11px] font-black text-white/40 uppercase tracking-widest">القراء والمبدعون</h2></div>
                <div className={horizontalListClass}>
                  <button onClick={() => setIsAddReciterOpen(true)} data-nav-id="reciter-add" className="flex flex-col items-center gap-3 px-4 py-3 rounded-[2rem] focusable shrink-0 min-w-[110px] border-4 border-transparent hover:bg-emerald-600/20"><div className="w-16 h-16 rounded-full flex items-center justify-center bg-emerald-500/10 border-2 border-dashed border-emerald-500/30 text-emerald-400 shadow-lg"><UserPlus className="w-8 h-8" /></div><span className="text-[10px] font-black text-emerald-400/60 uppercase tracking-widest">إضافة</span></button>
                  {favoriteReciters.map((r, i) => (
                    <button key={r.channelid} data-nav-id={`reciter-${i}`} onClick={() => { if (isReorderMode) setPickedUpId(pickedUpId === r.channelid ? null : r.channelid); else handleReciterClick(r.name); }} data-type="reciter" data-id={r.channelid} className={cn("flex flex-col items-center gap-3 px-4 py-3 rounded-[2rem] focusable shrink-0 min-w-[110px] border-4", pickedUpId === r.channelid ? "border-accent" : "border-transparent hover:bg-emerald-600/20")}>
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-500/30 relative">{r.image ? <img src={r.image} className="w-full h-full object-cover" /> : <User className="w-7 h-7 text-emerald-400" />}{isReorderMode && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><ArrowRightLeft className="w-5 h-5 text-accent" /></div>}</div>
                      <span className="text-[12px] font-black truncate max-w-[100px] text-white block">{truncateName(r.name)}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="min-h-[100px]" data-row-id="media-row-surahs">
                <div className={horizontalListClass}>
                  {surahs.map((s, i) => (
                    <button key={i} data-nav-id={`surah-${i}`} onClick={() => handleSurahClick(s.name_arabic)} className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white font-black text-base hover:bg-blue-600/20 focusable shrink-0 relative" tabIndex={0}>{s.name_arabic}</button>
                  ))}
                </div>
              </section>
            </div>

            {apiError && (
              <section className="mx-8 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="bg-red-600/10 border border-red-600/30 rounded-[2rem] p-6 flex items-center gap-6 shadow-[0_0_20px_rgba(220,38,38,0.1)]">
                  <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shrink-0 shadow-glow"><AlertCircle className="w-7 h-7 text-white" /></div>
                  <div className="flex flex-col"><h3 className="text-white font-black text-base leading-none mb-1">خطأ في الاتصال بخدمة يوتيوب</h3><p className="text-red-400/80 font-bold text-xs leading-tight">جميع مفاتيح اليوتيوب (عدد: {apiError.count}) منتهية الصلاحية. يرجى التواصل مع الدعم.</p></div>
                </div>
              </section>
            )}

            <section className="space-y-4 min-h-[100px]" data-row-id="media-row-search">
              <div className="flex justify-start px-8"><Button onClick={toggleReorderMode} variant={isReorderMode ? "default" : "outline"} className={cn("rounded-full h-10 px-6 font-black text-sm relative", isReorderMode ? "bg-yellow-500 text-black shadow-glow" : "bg-white/5 border-white/10 text-white")}><ShortcutBadge action="toggle_reorder" className="-bottom-2 -left-2" /><ArrowRightLeft className="w-4 h-4 ml-2" /> {isReorderMode ? "إيقاف الترتيب" : "تفعيل الترتيب"}</Button></div>
              <div className="flex items-center gap-3 w-full px-8">
                <div className="flex-1 relative flex items-center"><Input placeholder="ابحث عن فيديوهات..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && performSearch()} className="h-14 bg-white/5 border-none rounded-[1.5rem] pr-8 text-lg font-bold text-right focusable" /><div className="absolute left-6 flex items-center gap-3"><Mic className="w-5 h-5 text-white/40" /><Activity className="w-5 h-5 text-white/20" /></div></div>
                <button onClick={performSearch} className="h-14 px-8 rounded-[1.5rem] bg-red-600 text-white font-black text-base shadow-glow focusable flex items-center shrink-0 relative" data-nav-id="search-btn"><Youtube className="w-5 h-5 ml-2" /> بحث</button>
              </div>
            </section>

            <section className="min-h-[240px]" data-row-id="media-row-starred">
              {starredVideos.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-8 mb-4"><h2 className="text-sm font-black text-white flex items-center gap-2"><div className="w-6 h-6 rounded-lg bg-yellow-500 flex items-center justify-center"><Star className="w-4 h-4 text-black fill-current" /></div>الترددات المجرسة</h2></div>
                  <div className={horizontalListClass}>
                    {isStarredLoading ? ([1, 2, 3].map(i => <div key={i} className="h-32 w-64 rounded-[1.5rem] bg-zinc-800 animate-pulse shrink-0" />)) : starredVideos.map((v, idx) => (
                      <div key={v.id + idx} data-nav-id={`starred-item-${idx}`} onClick={() => setActiveVideo(v, starredVideos)} className="w-64 group relative overflow-hidden bg-zinc-900/80 rounded-[1.5rem] focusable shrink-0 cursor-pointer" tabIndex={0}>
                        <div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} className="w-full h-full object-cover" />{v.duration && <div className="absolute bottom-2 right-2 bg-black text-white text-[14px] px-3 py-1.5 rounded-lg font-black z-10">{v.duration}</div>}<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"><Play className="w-8 h-8 text-white" /></div></div>
                        <div className="p-3 text-right"><h3 className="font-bold text-xs truncate text-white">{v.title}</h3></div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="min-h-[240px]" data-row-id="media-row-goals">
              {matchGoals.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-8 mb-4"><h2 className="text-sm font-black text-white flex items-center gap-2"><div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center"><Goal className="w-4 h-4 text-primary" /></div>أهداف وملخصات مباريات اليوم</h2></div>
                  <div className={horizontalListClass}>
                    {matchGoals.map((v, idx) => (
                      <div key={v.id + idx} data-nav-id={`goals-item-${idx}`} onClick={() => setActiveVideo(v, matchGoals)} className="w-64 group relative overflow-hidden bg-zinc-900/80 rounded-[1.5rem] focusable shrink-0 cursor-pointer" tabIndex={0}>
                        <div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} className="w-full h-full object-cover" />{v.duration && <div className="absolute bottom-2 right-2 bg-black text-white text-[14px] px-3 py-1.5 rounded-lg font-black z-10">{v.duration}</div>}</div>
                        <div className="p-3 text-right"><h3 className="font-bold text-xs truncate text-white">{v.title}</h3></div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="min-h-[240px]" data-row-id="media-row-kids">
              {kidsVideos.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-8 mb-4"><h2 className="text-sm font-black text-emerald-400 flex items-center gap-2"><Baby className="w-5 h-5" /> عالم الأطفال</h2></div>
                  <div className={horizontalListClass}>
                    {kidsVideos.map((v, idx) => (
                      <div key={v.id + idx} data-nav-id={`kids-item-${idx}`} onClick={() => setActiveVideo(v, kidsVideos)} className="w-64 group relative overflow-hidden bg-zinc-900/80 rounded-[1.5rem] focusable shrink-0 cursor-pointer" tabIndex={0}><div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} className="w-full h-full object-cover" />{v.duration && <div className="absolute bottom-2 right-2 bg-black text-white text-[14px] px-3 py-1.5 rounded-lg font-black z-10">{v.duration}</div>}</div><div className="p-3 text-right"><h3 className="font-bold text-white text-xs truncate">{v.title}</h3></div></div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        ) : (
          <section className="space-y-6 animate-in slide-in-from-top-10 duration-0 min-h-[500px]" data-row-id="media-row-isolated">
            <div className="flex justify-between items-center sticky top-0 z-[120] bg-black/60 backdrop-blur-xl p-4 rounded-[2rem] border border-white/10">
              <button onClick={resetView} className="h-12 px-8 rounded-full bg-red-600 text-white font-black text-sm shadow-glow focusable flex items-center gap-3 relative"><ChevronRight className="w-5 h-5" /><span>العودة</span></button>
              <h2 className="text-xl font-black text-white">{selectedChannel ? truncateName(selectedChannel.name) : `نتائج البحث: ${search}`}</h2>
            </div>
            {loading ? (
              <div className="flex justify-center py-40"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(selectedChannel ? channelVideos : searchResults).map((v, i) => (
                  <Card key={i} data-nav-id={`grid-item-${i}`} onClick={() => setActiveVideo(v, (selectedChannel ? channelVideos : searchResults))} className="group bg-white/5 border-none rounded-[2rem] cursor-pointer focusable overflow-hidden shadow-2xl" tabIndex={0}>
                    <div className="aspect-video relative"><img src={v.thumbnail} className="w-full h-full object-cover" />{v.duration && <div className="absolute bottom-2 right-2 bg-black text-white text-[14px] px-3 py-1.5 rounded-lg font-black z-10">{v.duration}</div>}</div>
                    <CardContent className="p-4 text-right h-20 flex items-center justify-end"><h3 className="font-bold text-sm text-white line-clamp-2">{v.title}</h3></CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <AddContentModal type="channel" isOpen={isAddChannelOpen} onOpenChange={setIsAddChannelOpen} onAdd={(ch) => { addChannel(ch); toast({ title: "تمت الإضافة" }); }} />
      <AddContentModal type="reciter" isOpen={isAddReciterOpen} onOpenChange={setIsAddReciterOpen} onAdd={(r) => { addReciter(r); handleReciterClick(r.name); toast({ title: "تمت الإضافة" }); }} />
    </div>
  );
}
