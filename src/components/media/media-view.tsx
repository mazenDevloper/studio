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
      }, 100); 
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
 * MediaView v160.0 - Optimized Responsive Layout
 * For windowWidth < 980, Subscriptions (Level 2) becomes a Grid under Surahs.
 */
export function MediaView() {
  const { 
    favoriteChannels, addChannel, setActiveVideo, dockSide, isSidebarShrinked, setIsSidebarShrinked,
    selectedChannel, setSelectedChannel, channelVideos, setChannelVideos,
    favoriteReciters, addReciter, setActiveIptv, favoriteIptvChannels,
    isReorderMode, toggleReorderMode, pickedUpId, setPickedUpId, reorderChannelTo, reorderReciterTo,
    apiError, fetchPriorityData, lastLiveUpdate, setLastLiveUpdate, syncMasterBin
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
  const showSidebarLayout = windowWidth >= 980;

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

  const performSearch = async (overrideQuery?: string) => {
    const queryToUse = overrideQuery || search;
    if (!queryToUse.trim()) return;
    setLoading(true); setIsIsolatedViewActive(true); setIsSidebarShrinked(true);
    try { const res = await searchYouTubeVideos(queryToUse); setSearchResults(res || []); } finally { setLoading(false); }
  };

  const fetchFeeds = useCallback(async (force = false) => {
    if (!favoriteChannels.length) return;

    const now = new Date();
    const hour = now.getHours();
    const isWindow = hour >= 11 && hour <= 23;
    const twoHours = 2 * 60 * 60 * 1000;
    const timeSinceLast = Date.now() - lastLiveUpdate;

    const shouldUpdateLive = force || (isWindow && timeSinceLast >= twoHours);

    setIsStarredLoading(true);
    setIsSpecializedLoading(true);
    
    try {
      const [writerResults, todResults, todayGoals, yesterdayGoals] = await Promise.allSettled([
        searchYouTubeVideos("كاتب الاهداف", 5),
        searchYouTubeVideos("TOD TV ملخص", 10),
        searchYouTubeVideos("لمن فاته مباريات اليوم", 15),
        searchYouTubeVideos("اهداف وملخصات مباريات اليوم", 15)
      ]);

      const mergedGoals: YouTubeVideo[] = [];
      const beINFilter = (v: YouTubeVideo) => !(v.channelTitle?.toLowerCase() || "").includes('bein');
      
      if (writerResults.status === 'fulfilled') mergedGoals.push(...writerResults.value.slice(0, 5));
      if (todResults.status === 'fulfilled') mergedGoals.push(...todResults.value.filter(v => v.channelTitle?.toLowerCase().includes('tod')));
      if (todayGoals.status === 'fulfilled') mergedGoals.push(...todayGoals.value.filter(beINFilter));
      if (yesterdayGoals.status === 'fulfilled') mergedGoals.push(...yesterdayGoals.value.filter(beINFilter));

      setMatchGoals(Array.from(new Map(mergedGoals.map(v => [v.id, v])).values()).slice(0, 45));

      const [kidsRyan, kidsArabic] = await Promise.allSettled([searchYouTubeVideos("ريان بالعربي", 10), searchYouTubeVideos("كيدز بالعربي", 10)]);
      const interleavedKids: YouTubeVideo[] = [];
      const lR = kidsRyan.status === 'fulfilled' ? kidsRyan.value : [];
      const lA = kidsArabic.status === 'fulfilled' ? kidsArabic.value : [];
      for (let i = 0; i < 10; i++) { if (lR[i]) interleavedKids.push(lR[i]); if (lA[i]) interleavedKids.push(lA[i]); }
      setKidsVideos(interleavedKids);

      if (shouldUpdateLive || starredVideos.length === 0) {
        const starredChannels = favoriteChannels.filter(c => c.starred);
        if (starredChannels.length > 0) {
          const results = await Promise.allSettled(starredChannels.slice(0, 5).map(c => fetchChannelVideos(c.channelid, 5)));
          const allStarred: YouTubeVideo[] = [];
          results.forEach(res => { if (res.status === 'fulfilled') allStarred.push(...res.value); });
          setStarredVideos(allStarred.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()));
        }

        const timelineResults = await Promise.allSettled(favoriteChannels.slice(0, 15).map(c => fetchChannelVideos(c.channelid, 5)));
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
        
        setLastLiveUpdate(Date.now());
        syncMasterBin();
      }
    } finally { setIsStarredLoading(false); setIsSpecializedLoading(false); }
  }, [favoriteChannels, lastLiveUpdate, setLastLiveUpdate, syncMasterBin, starredVideos.length]);

  useEffect(() => { fetchFeeds(); }, [fetchFeeds]);

  useEffect(() => {
    if (selectedChannel) {
      setLoading(true); setIsIsolatedViewActive(true);
      fetchChannelVideos(selectedChannel.channelid, 20).then(v => { setChannelVideos(v); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [selectedChannel]);

  const handleReciterClick = (name: string) => { 
    setSearch(prev => {
      const hasSurah = prev.includes('سورة');
      const newQuery = hasSurah ? `${name} ${prev}` : name;
      if (hasSurah) {
        setTimeout(() => performSearch(newQuery), 100);
      } else {
        setTimeout(() => {
          const firstSurah = document.querySelector('[data-nav-id="surah-0"]') as HTMLElement;
          if (firstSurah) {
            firstSurah.focus();
            firstSurah.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          }
        }, 150);
      }
      return newQuery;
    });
  };

  const handleSurahClick = (name: string) => { 
    setSearch(prev => {
      const hasReciter = prev.trim() && !prev.includes('سورة');
      const newQuery = prev.trim() ? (prev.includes('سورة') ? `سورة ${name}` : `${prev} سورة ${name}`) : `سورة ${name}`;
      if (hasReciter || (prev.includes('سورة') && prev.trim() !== `سورة ${name}`)) {
        setTimeout(() => performSearch(newQuery), 100);
      }
      return newQuery;
    });
  };

  const resetView = () => { setSelectedChannel(null); setSearchResults([]); setSearch(""); setIsIsolatedViewActive(false); setIsSidebarShrinked(false); };

  const horizontalListClass = "w-full flex gap-3 px-8 pb-1 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center";
  const showIsolatedView = isIsolatedViewActive || !!selectedChannel || searchResults.length > 0;

  return (
    <div className={cn("h-screen flex bg-transparent overflow-hidden relative", isDockLeft ? "flex-row-reverse" : "flex-row")}>
      
      {showSidebarLayout && (
        <aside className={cn(
          "h-full z-[110] transition-all duration-0 premium-glass flex flex-col shrink-0 border-white/5 bg-black/40 shadow-2xl", 
          isSidebarShrinked ? "w-[6%]" : "w-[28%]", 
          isDockLeft ? "border-l" : "border-r"
        )}>
          <div className="p-2 flex items-center justify-between border-b border-white/5">
            {!isSidebarShrinked && <h2 className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">الاشتراكات</h2>}
            <button onClick={() => setIsAddChannelOpen(true)} className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center transition-all focusable relative z-[150] shadow-glow border border-primary/20" tabIndex={0}><Plus className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar py-1 flex flex-col gap-0.5">
            <div onClick={resetView} className={cn("flex items-center gap-3 p-2 cursor-pointer focusable w-[96%] mx-auto rounded-lg", !selectedChannel && !searchResults.length ? "bg-primary text-white" : "hover:bg-white/5 text-white/60")} tabIndex={0} data-nav-id="subs-all">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 shrink-0"><List className="w-4 h-4" /></div>
              {!isSidebarShrinked && <span className="flex-1 text-right font-black text-sm block overflow-hidden whitespace-nowrap px-1">الكل</span>}
            </div>
            {favoriteChannels.map((ch, idx) => (
              <div key={ch.channelid} draggable={isReorderMode} onDragStart={(e) => { if (isReorderMode) { e.dataTransfer.setData("id", ch.channelid); setPickedUpId(ch.channelid); } }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { if (isReorderMode) { e.preventDefault(); const sId = e.dataTransfer.getData("id"); if (sId !== ch.channelid) reorderChannelTo(sId, ch.channelid); setPickedUpId(null); } }} onClick={() => { if (isReorderMode) setPickedUpId(pickedUpId === ch.channelid ? null : ch.channelid); else { setSearchResults([]); setSelectedChannel(ch); } }} className={cn("flex flex-row-reverse items-center p-2 rounded-lg w-[96%] mx-auto gap-3 cursor-pointer focusable shrink-0 border-2", selectedChannel?.channelid === ch.channelid ? "bg-primary text-white shadow-glow" : "hover:bg-white/5 text-white/60", pickedUpId === ch.channelid ? "border-accent animate-pulse" : "border-transparent")} tabIndex={0} data-nav-id={`subs-${idx + 1}`} data-type="channel" data-id={ch.channelid}>
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 shrink-0 relative"><img src={ch.image} className="w-full h-full object-cover" alt="" />{ch.starred && <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full shadow-glow" />}</div>
                {!isSidebarShrinked && <span className="font-black text-sm flex-1 text-right leading-none text-white block overflow-hidden whitespace-nowrap px-1">{truncateName(ch.name)}</span>}
              </div>
            ))}
          </div>
        </aside>
      )}

      <main className="flex-1 overflow-y-auto custom-scrollbar relative pt-2 pb-40 space-y-2 px-8 no-scrollbar" style={{ direction: 'rtl' }}>
        {!showIsolatedView ? (
          <>
            <section className="space-y-1 min-h-[80px]" data-row-id="media-row-search">
              <div className="flex justify-start px-8 items-center gap-4">
                <Button onClick={toggleReorderMode} variant={isReorderMode ? "default" : "outline"} className={cn("rounded-full h-9 px-6 font-black text-xs relative", isReorderMode ? "bg-yellow-500 text-black shadow-glow" : "bg-white/5 border-white/10 text-white")} tabIndex={0}><ShortcutBadge action="toggle_reorder" className="-bottom-2 -left-2" /><ArrowRightLeft className="w-4 h-4 ml-2" /> {isReorderMode ? "إيقاف الترتيب" : "تفعيل الترتيب"}</Button>
              </div>
              <div className="flex items-center gap-2 w-full px-8">
                <div className="flex-1 relative flex items-center">
                  <Input 
                    placeholder="ابحث عن فيديوهات..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && performSearch()} 
                    className="h-14 bg-white/5 border-none rounded-[1.5rem] pr-8 text-lg font-bold text-right focusable" 
                    data-nav-id="media-search-input"
                  />
                  <div className="absolute left-6 flex items-center gap-3"><Mic className="w-5 h-5 text-white/40" /><Activity className="w-5 h-5 text-white/20" /></div>
                </div>
                <button onClick={() => performSearch()} className="h-14 px-8 rounded-[1.5rem] bg-red-600 text-white font-black text-base shadow-glow focusable flex items-center shrink-0 relative" data-nav-id="search-btn" tabIndex={0}><Youtube className="w-5 h-5 ml-2" /> بحث</button>
              </div>
            </section>

            <section className="min-h-[140px]" data-row-id="media-row-reciters">
              <div className="flex items-center justify-between px-8 mb-2"><h2 className="text-[10px] font-black text-white/40 uppercase tracking-widest">القراء والمبدعون</h2></div>
              <div className={horizontalListClass}>
                <button onClick={() => setIsAddReciterOpen(true)} data-nav-id="reciter-add" className="flex flex-col items-center gap-2 px-3 py-2 rounded-[1.5rem] focusable shrink-0 min-w-[100px] border-4 border-transparent hover:bg-emerald-600/20" tabIndex={0}><div className="w-14 h-14 rounded-full flex items-center justify-center bg-emerald-500/10 border-2 border-dashed border-emerald-500/30 text-emerald-400 shadow-lg"><UserPlus className="w-7 h-7" /></div><span className="text-[9px] font-black text-emerald-400/60 uppercase tracking-widest">إضافة</span></button>
                {favoriteReciters.map((r, i) => (
                  <button 
                    key={r.channelid} 
                    data-nav-id={`reciter-${i}`} 
                    draggable={isReorderMode}
                    onDragStart={(e) => { if (isReorderMode) { e.dataTransfer.setData("id", r.channelid); setPickedUpId(r.channelid); } }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { if (isReorderMode) { e.preventDefault(); const sId = e.dataTransfer.getData("id"); if (sId !== r.channelid) reorderReciterTo(sId, r.channelid); setPickedUpId(null); } }}
                    onClick={() => { if (isReorderMode) setPickedUpId(pickedUpId === r.channelid ? null : r.channelid); else handleReciterClick(r.name); }} 
                    data-type="reciter" 
                    data-id={r.channelid} 
                    className={cn("flex flex-col items-center gap-2 px-3 py-2 rounded-[1.5rem] focusable shrink-0 min-w-[100px] border-4", pickedUpId === r.channelid ? "border-accent bg-accent/10" : "border-transparent hover:bg-emerald-600/20")}
                    tabIndex={0}
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-500/30 relative">{r.image ? <img src={r.image} className="w-full h-full object-cover" alt="" /> : <User className="w-6 h-6 text-emerald-400" />}{isReorderMode && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><ArrowRightLeft className="w-4 h-4 text-accent" /></div>}</div>
                    <span className="text-[11px] font-black truncate max-w-[90px] text-white block">{truncateName(r.name)}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="min-h-[80px]" data-row-id="media-row-surahs">
              <div className={horizontalListClass}>
                {surahs.map((s, i) => (
                  <button key={i} data-nav-id={`surah-${i}`} onClick={() => handleSurahClick(s.name_arabic)} className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-white font-black text-sm hover:bg-blue-600/20 focusable shrink-0 relative" tabIndex={0}>{s.name_arabic}</button>
                ))}
              </div>
            </section>

            {!showSidebarLayout && (
              <section className="min-h-[140px]" data-row-id="media-row-subs-grid">
                <div className="flex items-center justify-between px-8 mb-2">
                  <h2 className="text-[10px] font-black text-white/40 uppercase tracking-widest">الاشتراكات</h2>
                  <button onClick={() => setIsAddChannelOpen(true)} className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center focusable"><Plus className="w-4 h-4 text-primary" /></button>
                </div>
                <div className={horizontalListClass}>
                  {favoriteChannels.map((ch, idx) => (
                    <button 
                      key={ch.channelid} 
                      onClick={() => { setSearchResults([]); setSelectedChannel(ch); }} 
                      data-nav-id={`sub-grid-item-${idx}`} 
                      className="flex flex-col items-center gap-2 px-3 py-2 rounded-[1.5rem] focusable shrink-0 min-w-[100px] border-4 border-transparent hover:bg-white/5"
                      tabIndex={0}
                    >
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 relative">
                        <img src={ch.image} className="w-full h-full object-cover" alt="" />
                        {ch.starred && <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full shadow-glow" />}
                      </div>
                      <span className="text-[10px] font-black truncate max-w-[80px] text-white/60">{truncateName(ch.name, 12)}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="min-h-[220px]" data-row-id="media-row-starred">
              {starredVideos.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-8 mb-2"><h2 className="text-xs font-black text-white flex items-center gap-2"><div className="w-5 h-5 rounded bg-yellow-500 flex items-center justify-center"><Star className="w-3 h-3 text-black fill-current" /></div>الترددات المجرسة</h2></div>
                  <div className={horizontalListClass}>
                    {isStarredLoading && starredVideos.length === 0 ? ([1, 2, 3].map(i => <div key={i} className="h-32 w-64 rounded-[1.5rem] bg-zinc-800 animate-pulse shrink-0" tabIndex={0} />)) : starredVideos.map((v, idx) => (
                      <div key={v.id + idx} data-nav-id={`starred-item-${idx}`} onClick={() => setActiveVideo(v, starredVideos)} className="w-60 group relative overflow-hidden bg-zinc-900/80 rounded-[1.5rem] focusable shrink-0 cursor-pointer" tabIndex={0}>
                        <div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} className="w-full h-full object-cover" alt="" />{v.duration && <div className="absolute bottom-2 right-2 bg-black text-white text-[14px] px-3 py-1.5 rounded-lg font-black z-10">{v.duration}</div>}<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"><Play className="w-8 h-8 text-white" /></div></div>
                        <div className="p-2 text-right"><h3 className="font-bold text-xs truncate text-white">{v.title}</h3></div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="min-h-[220px]" data-row-id="media-row-live">
              {liveFromSubs.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-8 mb-2"><h2 className="text-xs font-black text-white flex items-center gap-2"><div className="w-5 h-5 rounded bg-red-600 flex items-center justify-center shadow-glow"><RadioIcon className="w-3 h-3 text-white" /></div>البث المباشر</h2></div>
                  <div className={horizontalListClass}>
                    {liveFromSubs.map((v, idx) => (
                      <div key={v.id + idx} data-nav-id={`live-sub-item-${idx}`} onClick={() => setActiveVideo(v, liveFromSubs)} className="w-60 group relative overflow-hidden bg-zinc-900/80 border-2 border-red-600/30 rounded-[1.5rem] focusable shrink-0 cursor-pointer animate-pulse" tabIndex={0}>
                        <div className="aspect-video relative overflow-hidden">
                          <img src={v.thumbnail} className="w-full h-full object-cover" alt="" />
                          <div className="absolute top-2 right-2 bg-red-600 text-white text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-tighter">LIVE</div>
                        </div>
                        <div className="p-2 text-right">
                          <h3 className="font-bold text-[11px] truncate text-white">{v.title}</h3>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="min-h-[220px]" data-row-id="media-row-goals">
              {matchGoals.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-8 mb-2"><h2 className="text-xs font-black text-white flex items-center gap-2"><div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center"><Goal className="w-3 h-3 text-primary" /></div>ملخصات مباريات الامس</h2></div>
                  <div className={horizontalListClass}>
                    {matchGoals.map((v, idx) => (
                      <div key={v.id + idx} data-nav-id={`goals-item-${idx}`} onClick={() => setActiveVideo(v, matchGoals)} className="w-60 group relative overflow-hidden bg-zinc-900/80 rounded-[1.5rem] focusable shrink-0 cursor-pointer" tabIndex={0}>
                        <div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} className="w-full h-full object-cover" alt="" /></div>
                        <div className="p-2 text-right"><h3 className="font-bold text-[11px] truncate text-white">{v.title}</h3></div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="min-h-[220px]" data-row-id="media-row-kids">
              {kidsVideos.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-8 mb-2"><h2 className="text-xs font-black text-emerald-400 flex items-center gap-2"><Baby className="w-4 h-4" /> عالم الأطفال</h2></div>
                  <div className={horizontalListClass}>
                    {kidsVideos.map((v, idx) => (
                      <div key={v.id + idx} data-nav-id={`kids-item-${idx}`} onClick={() => setActiveVideo(v, kidsVideos)} className="w-60 group relative overflow-hidden bg-zinc-900/80 rounded-[1.5rem] focusable shrink-0 cursor-pointer" tabIndex={0}>
                        <div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} className="w-full h-full object-cover" alt="" /></div>
                        <div className="p-2 text-right"><h3 className="font-bold text-white text-[11px] truncate">{v.title}</h3></div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        ) : (
          <section className="space-y-4 animate-in slide-in-from-top-10 duration-0 min-h-[500px]" data-row-id="media-row-isolated">
            <div className="flex justify-between items-center sticky top-0 z-[120] bg-black/60 backdrop-blur-xl p-4 rounded-[2rem] border border-white/10">
              <button onClick={resetView} className="h-11 px-8 rounded-full bg-red-600 text-white font-black text-xs shadow-glow focusable flex items-center gap-3 relative" tabIndex={0}><ChevronRight className="w-4 h-4" /><span>العودة</span></button>
              <h2 className="text-lg font-black text-white">{selectedChannel ? truncateName(selectedChannel.name) : `نتائج البحث: ${search}`}</h2>
            </div>
            {loading ? (
              <div className="flex justify-center py-40"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(selectedChannel ? channelVideos : searchResults).map((v, i) => (
                  <Card key={i} data-nav-id={`grid-item-${i}`} onClick={() => setActiveVideo(v, (selectedChannel ? channelVideos : searchResults))} className="group bg-white/5 border-none rounded-[1.5rem] cursor-pointer focusable overflow-hidden shadow-2xl" tabIndex={0}>
                    <div className="aspect-video relative"><img src={v.thumbnail} className="w-full h-full object-cover" alt="" /></div>
                    <CardContent className="p-3 text-right h-16 flex items-center justify-end"><h3 className="font-bold text-xs text-white line-clamp-2">{v.title}</h3></CardContent>
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
