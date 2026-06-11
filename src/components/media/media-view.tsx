
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, Plus, Loader2, X, List, 
  Flame, Activity, RadioIcon, Trophy, Baby, ChevronRight, User, Youtube, Star, ArrowRightLeft, Mic, Play, Clock, Goal, UserPlus, CheckCircle2,
  Sparkles, AlertCircle, BookmarkPlus, GraduationCap, ChevronUp, Save
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
        >
          {results.length > 0 ? (
            results.map((item, i) => (
              <div 
                key={item.channelid} 
                onClick={() => { onAdd(item); onOpenChange(false); }} 
                className="flex items-center gap-5 p-5 rounded-[2rem] bg-white/5 hover:bg-white/10 transition-all cursor-pointer border-4 border-transparent group focusable outline-none"
                tabIndex={0}
                data-nav-id={`modal-result-${i}`}
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
 * MediaView v600.0 - Balanced Cinematic Search Grid.
 * Optimized typography and avatar sizing for better readability.
 */
export function MediaView() {
  const searchParams = useSearchParams();
  const { 
    favoriteChannels, addChannel, setActiveVideo, dockSide, isSidebarShrinked, setIsSidebarShrinked,
    selectedChannel, setSelectedChannel, channelVideos, setChannelVideos,
    favoriteReciters, addReciter, toggleSaveVideo, savedVideos,
    isReorderMode, toggleReorderMode, pickedUpId, setPickedUpId, reorderChannelTo, moveChannelToTop,
    fetchPriorityData, lastLiveUpdate, setLastLiveUpdate, syncMasterBin, saveChannelsReorder
  } = useMediaStore();

  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [surahs, setSurahs] = useState<any[]>([]);
  const [windowWidth, setWindowWidth] = useState(0);
  const [isSavingReorder, setIsSavingReorder] = useState(false);
  
  const [starredVideos, setStarredVideos] = useState<YouTubeVideo[]>([]);
  const [isStarredLoading, setIsStarredLoading] = useState(false);
  
  const [liveFromSubs, setLiveFromSubs] = useState<YouTubeVideo[]>([]);
  const [kidsVideos, setKidsVideos] = useState<YouTubeVideo[]>([]);
  const [matchGoals, setMatchGoals] = useState<YouTubeVideo[]>([]);
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
    
    const q = searchParams.get('q');
    if (q) {
      setSearch(q);
      performSearch(q);
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, [searchParams]);

  const performSearch = async (overrideQuery?: string) => {
    const queryToUse = overrideQuery || search;
    if (!queryToUse.trim()) return;
    setLoading(true); 
    setIsIsolatedViewActive(true); 
    setIsSidebarShrinked(true);
    try { 
      const res = await searchYouTubeVideos(queryToUse); 
      setSearchResults(res || []); 
    } catch (e) {
      console.error("Search Error:", e);
      setSearchResults([]);
    } finally { 
      setLoading(false); 
    }
  };

  const fetchFeeds = useCallback(async (force = false) => {
    if (!favoriteChannels.length) return;

    const timeSinceLast = Date.now() - lastLiveUpdate;
    const twoHours = 2 * 60 * 60 * 1000;
    const shouldUpdateLive = force || timeSinceLast >= twoHours;

    setIsStarredLoading(true);
    setIsSpecializedLoading(true);
    
    try {
      const [writerResults, todResults, kidsData] = await Promise.allSettled([
        searchYouTubeVideos("ملخصات مباريات الأمس كووورة", 10),
        searchYouTubeVideos("TOD TV highlights", 10),
        searchYouTubeVideos("كلمات الطفل الأولى ريان بالعربي كيدز بالعربي", 30)
      ]);

      const mergedGoals: YouTubeVideo[] = [];
      if (writerResults.status === 'fulfilled') mergedGoals.push(...writerResults.value);
      if (todResults.status === 'fulfilled') mergedGoals.push(...todResults.value);
      setMatchGoals(mergedGoals.slice(0, 15));

      if (kidsData.status === 'fulfilled') {
        const rawKids = kidsData.value;
        const rayyanVideos = rawKids.filter(v => v.channelTitle?.includes("ريان"));
        const kidsArabicVideos = rawKids.filter(v => v.channelTitle?.includes("كيدز") || v.channelTitle?.includes("Kids"));
        
        const finalKids: YouTubeVideo[] = [];
        finalKids.push(...rawKids.slice(0, 3));
        [0, 2, 4].forEach(idx => { if (rayyanVideos[idx]) finalKids.push(rayyanVideos[idx]); });
        [1, 3, 5].forEach(idx => { if (kidsArabicVideos[idx]) finalKids.push(kidsArabicVideos[idx]); });

        const usedIds = new Set(finalKids.map(v => v.id));
        rawKids.forEach(v => { if (!usedIds.has(v.id) && finalKids.length < 20) { finalKids.push(v); usedIds.add(v.id); } });
        setKidsVideos(finalKids);
      }

      // 1. YouTube Starred Videos (One per channel)
      const starredChannels = favoriteChannels.filter(c => c.starred);
      if (starredChannels.length > 0) {
        const starredPromises = starredChannels.map(c => fetchChannelVideos(c.channelid, 1));
        const starredResults = await Promise.allSettled(starredPromises);
        const syncStarred: YouTubeVideo[] = [];
        starredResults.forEach(res => {
           if (res.status === 'fulfilled' && res.value.length > 0) {
             syncStarred.push(res.value[0]);
           }
        });
        setStarredVideos(syncStarred);
      }

      // 2. Advanced Live Probing (Top 10 Channels /live & /stream)
      if (shouldUpdateLive || liveFromSubs.length === 0) {
        const top10 = favoriteChannels.slice(0, 10);
        const liveResults: YouTubeVideo[] = [];
        const seenIds = new Set();
        
        // Execute individual probes for each top channel
        const probePromises = top10.map(async (c) => {
          const [liveRes, streamRes] = await Promise.all([
            searchYouTubeVideos(`"${c.name}" /live`, 2),
            searchYouTubeVideos(`"${c.name}" /stream`, 2)
          ]);
          return [...liveRes, ...streamRes].filter(v => v.isLive);
        });

        const probeResults = await Promise.allSettled(probePromises);
        probeResults.forEach(res => {
          if (res.status === 'fulfilled') {
            res.value.forEach(v => {
              if (!seenIds.has(v.id) && liveResults.length < 15) {
                liveResults.push(v);
                seenIds.add(v.id);
              }
            });
          }
        });
        
        setLiveFromSubs(liveResults.slice(0, 10));
        setLastLiveUpdate(Date.now());
        syncMasterBin();
      }
    } finally { setIsStarredLoading(false); setIsSpecializedLoading(false); }
  }, [favoriteChannels, lastLiveUpdate, setLastLiveUpdate, syncMasterBin, liveFromSubs.length]);

  useEffect(() => { fetchFeeds(); }, [fetchFeeds]);

  useEffect(() => {
    if (selectedChannel) {
      setLoading(true); 
      setIsIsolatedViewActive(true);
      fetchChannelVideos(selectedChannel.channelid, 20)
        .then(v => { setChannelVideos(v); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [selectedChannel, setChannelVideos]);

  const handleReciterClick = (name: string) => { 
    setSearch(prev => {
      const hasSurah = prev.includes('سورة');
      const newQuery = hasSurah ? `${name} ${prev}` : name;
      if (hasSurah) setTimeout(() => performSearch(newQuery), 100);
      return newQuery;
    });
  };

  const handleSurahClick = (name: string) => { 
    setSearch(prev => {
      const hasReciter = prev.trim() && !prev.includes('سورة');
      const newQuery = prev.trim() ? (prev.includes('سورة') ? `سورة ${name}` : `${prev} سورة ${name}`) : `سورة ${name}`;
      if (hasReciter || (prev.includes('سورة') && prev.trim() !== `سورة ${name}`)) setTimeout(() => performSearch(newQuery), 100);
      return newQuery;
    });
  };

  const resetView = () => { 
    setSelectedChannel(null); 
    setSearchResults([]); 
    setSearch(""); 
    setIsIsolatedViewActive(false); 
    setIsSidebarShrinked(false); 
  };

  const getSmartLabel = (title: string, isLive: boolean) => {
    const t = title.toLowerCase();
    if (isLive) return { text: "مباشر الآن", color: "bg-red-600" };
    if (t.includes("ملخص") || t.includes("highlight")) return { text: "ملخص المباراة", color: "bg-blue-600" };
    if (t.includes("اهداف") || t.includes("goals")) return { text: "أهداف", color: "bg-emerald-600" };
    if (t.includes("مصحف") || t.includes("سورة")) return { text: "تلاوة", color: "bg-amber-600" };
    return null;
  };

  const handleChannelAction = (e: React.MouseEvent, channelId: string | undefined, channelTitle: string | undefined, avatar: string | undefined) => {
    e.stopPropagation();
    if (!channelId || !channelTitle) return;
    
    const isFollowing = favoriteChannels.some(c => c.channelid === channelId);
    if (!isFollowing) {
      addChannel({ 
        channelid: channelId, 
        name: channelTitle, 
        image: avatar || `https://yt3.ggpht.com/ytc/${channelId}=s88-c-k-c0x00ffffff-no-rj`, 
        channeltitle: channelTitle, 
        clickschannel: 0, 
        starred: true 
      });
      toast({ title: "تم جرس القناة", description: `متابعة ${channelTitle} بنجاح` });
    }
  };

  const navigateToChannel = (e: React.MouseEvent, channelId: string | undefined, channelTitle: string | undefined, avatar: string | undefined) => {
    e.stopPropagation();
    if (!channelId || !channelTitle) return;
    setSelectedChannel({
      channelid: channelId,
      name: channelTitle,
      image: avatar || `https://yt3.ggpht.com/ytc/${channelId}=s88-c-k-c0x00ffffff-no-rj`,
      channeltitle: channelTitle,
      clickschannel: 0,
      starred: false
    });
    setSearchResults([]);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!isReorderMode) return;
    e.dataTransfer.setData("id", id);
    setPickedUpId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isReorderMode) return;
    e.preventDefault();
  };

  const handleDropChannel = (e: React.DragEvent, targetId: string) => {
    if (!isReorderMode) return;
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("id");
    if (sourceId === targetId) return;
    reorderChannelTo(sourceId, targetId);
    setPickedUpId(null);
  };

  const handleSaveOrder = async () => {
    setIsSavingReorder(true);
    try {
      await saveChannelsReorder();
      toast({ title: "تم حفظ الترتيب", description: "تمت مزامنة ترتيب القنوات سحابياً" });
    } finally {
      setIsSavingReorder(false);
    }
  };

  const activeGridVideos = selectedChannel ? channelVideos : searchResults;
  const showIsolatedView = isIsolatedViewActive || !!selectedChannel || searchResults.length > 0;
  const horizontalListClass = "w-full flex gap-3 px-8 pb-1 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center";

  return (
    <div className={cn("h-screen flex bg-transparent overflow-hidden relative", isDockLeft ? "flex-row-reverse" : "flex-row")}>
      
      {showSidebarLayout && (
        <aside className={cn(
          "h-full z-[110] transition-all duration-0 premium-glass flex flex-col shrink-0 border-white/5 bg-black/40 shadow-2xl", 
          isSidebarShrinked ? "w-[6%]" : "w-[28%]", 
          isDockLeft ? "border-l" : "border-r"
        )}>
          <div className="p-2 flex items-center justify-between border-b border-white/5">
            {!isSidebarShrinked && (
              <div className="flex flex-col">
                <h2 className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">الاشتراكات</h2>
                {isReorderMode && <span className="text-[8px] text-yellow-500 font-bold px-2 animate-pulse">وضع الترتيب نشط</span>}
              </div>
            )}
            <div className="flex items-center gap-1">
              {isReorderMode && !isSidebarShrinked && (
                <button onClick={handleSaveOrder} className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 focusable" disabled={isSavingReorder}>
                  {isSavingReorder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              )}
              <button onClick={() => setIsAddChannelOpen(true)} className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center transition-all focusable relative z-[150] shadow-glow border border-primary/20" tabIndex={0}><Plus className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar py-1 flex flex-col gap-0.5">
            <div onClick={resetView} className={cn("flex items-center gap-3 p-2 cursor-pointer focusable w-[96%] mx-auto rounded-lg", !selectedChannel && !searchResults.length && !isIsolatedViewActive ? "bg-primary text-white" : "hover:bg-white/5 text-white/60")} tabIndex={0}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 shrink-0"><List className="w-4 h-4" /></div>
              {!isSidebarShrinked && <span className="flex-1 text-right font-black text-sm block overflow-hidden whitespace-nowrap px-1">الكل</span>}
            </div>
            {favoriteChannels.map((ch, idx) => (
              <div 
                key={ch.channelid} 
                draggable={isReorderMode}
                onDragStart={(e) => handleDragStart(e, ch.channelid)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropChannel(e, ch.channelid)}
                onClick={() => { 
                  if (isReorderMode) {
                    setPickedUpId(pickedUpId === ch.channelid ? null : ch.channelid);
                  } else {
                    setSearchResults([]); setSelectedChannel(ch); 
                  }
                }} 
                className={cn(
                  "flex flex-row-reverse items-center p-2 rounded-lg w-[96%] mx-auto gap-3 cursor-pointer focusable shrink-0 border-2", 
                  selectedChannel?.channelid === ch.channelid ? "bg-primary text-white shadow-glow" : "hover:bg-white/5 text-white/60", 
                  pickedUpId === ch.channelid ? "border-yellow-500 animate-pulse bg-yellow-500/10" : "border-transparent",
                  isReorderMode && "cursor-move"
                )} 
                tabIndex={0} data-nav-id={`subs-${idx + 1}`} data-type="channel" data-id={ch.channelid}
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 shrink-0 relative">
                  <img src={ch.image} className="w-full h-full object-cover" alt="" />
                  {ch.starred && <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-500 rounded-full shadow-glow" />}
                </div>
                {!isSidebarShrinked && (
                  <>
                    <span className="font-black text-sm flex-1 text-right leading-none text-white block overflow-hidden whitespace-nowrap px-1">{truncateName(ch.name)}</span>
                    {isReorderMode && (
                      <div className="flex gap-1 shrink-0">
                         <button onClick={(e) => { e.stopPropagation(); moveChannelToTop(ch.channelid); }} className="w-6 h-6 rounded bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                           <ChevronUp className="w-3.5 h-3.5 text-yellow-500" />
                         </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </aside>
      )}

      <main className="flex-1 overflow-y-auto custom-scrollbar relative pt-2 pb-40 space-y-2 px-8 no-scrollbar" style={{ direction: 'rtl' }}>
        {!showIsolatedView ? (
          <>
            <section className="space-y-1" data-row-id="media-row-search">
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
              <div className="flex items-center justify-between px-8 mb-2">
                <h2 className="text-[10px] font-black text-white/40 uppercase tracking-widest">القراء والمبدعون</h2>
              </div>
              <div className={horizontalListClass}>
                <button onClick={() => setIsAddReciterOpen(true)} className="flex flex-col items-center gap-2 px-3 py-2 rounded-[1.5rem] focusable shrink-0 min-w-[100px] border-4 border-transparent hover:bg-emerald-600/20" tabIndex={0}><div className="w-14 h-14 rounded-full flex items-center justify-center bg-emerald-500/10 border-2 border-dashed border-emerald-500/30 text-emerald-400 shadow-lg"><UserPlus className="w-7 h-7" /></div><span className="text-[9px] font-black text-emerald-400/60 uppercase tracking-widest">إضافة</span></button>
                {favoriteReciters.map((r, i) => (
                  <button 
                    key={r.channelid} 
                    onClick={() => handleReciterClick(r.name)} 
                    className="flex flex-col items-center gap-2 px-3 py-2 rounded-[1.5rem] focusable shrink-0 min-w-[100px] border-4 transition-all relative group border-transparent hover:bg-emerald-600/20"
                    tabIndex={0}
                    data-nav-id={`reciter-${i}`}
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-500/30">
                      {r.image ? <img src={r.image} className="w-full h-full object-cover" alt="" /> : <User className="w-6 h-6 text-emerald-400" />}
                    </div>
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

            <section className="min-h-[220px]" data-row-id="media-row-live-subs">
              {liveFromSubs.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-8 mb-2"><h2 className="text-xs font-black text-white flex items-center gap-2"><div className="w-5 h-5 rounded bg-red-600 flex items-center justify-center shadow-glow"><RadioIcon className="w-3 h-3 text-white" /></div>بثوث الاشتراكات المباشرة (أفضل 10)</h2></div>
                  <div className={horizontalListClass}>
                    {liveFromSubs.map((v, idx) => (
                      <div key={v.id + idx} onClick={() => setActiveVideo(v, liveFromSubs)} className="w-60 group relative overflow-hidden bg-zinc-900/80 border-2 border-red-600/30 rounded-[1.5rem] focusable shrink-0 cursor-pointer animate-pulse" tabIndex={0} data-nav-id={`live-item-${idx}`}>
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

            <section className="min-h-[220px]" data-row-id="media-row-starred">
              {starredVideos.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-8 mb-2"><h2 className="text-xs font-black text-white flex items-center gap-2"><div className="w-5 h-5 rounded bg-yellow-500 flex items-center justify-center"><Star className="w-3 h-3 text-black fill-current" /></div>الترددات المجرسة</h2></div>
                  <div className={horizontalListClass}>
                    {starredVideos.map((v, idx) => (
                      <div key={v.id + idx} onClick={() => setActiveVideo(v, starredVideos)} className="w-60 group relative overflow-hidden bg-zinc-900/80 rounded-[1.5rem] focusable shrink-0 cursor-pointer" tabIndex={0} data-nav-id={`starred-item-${idx}`}>
                        <div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} className="w-full h-full object-cover" alt="" />{v.duration && <div className="absolute bottom-2 right-2 bg-black text-white text-[14px] px-3 py-1.5 rounded-lg font-black z-10">{v.duration}</div>}<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"><Play className="w-8 h-8 text-white" /></div></div>
                        <div className="p-2 text-right">
                           <h3 className="font-bold text-xs truncate text-white">{v.title}</h3>
                           <p className="text-[8px] text-yellow-500 font-bold uppercase mt-1">{v.channelTitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="min-h-[220px]" data-row-id="media-row-highlights">
              {matchGoals.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-8 mb-2"><h2 className="text-xs font-black text-white flex items-center gap-2"><div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center shadow-glow"><Trophy className="w-3 h-3 text-white" /></div>ملخصات مباريات الأمس</h2></div>
                  <div className={horizontalListClass}>
                    {matchGoals.map((v, idx) => (
                      <div key={v.id + idx} onClick={() => setActiveVideo(v, matchGoals)} className="w-60 group relative overflow-hidden bg-zinc-900/80 border-b-4 border-blue-600/40 rounded-[1.5rem] focusable shrink-0 cursor-pointer" tabIndex={0} data-nav-id={`highlight-item-${idx}`}>
                        <div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} className="w-full h-full object-cover opacity-80" alt="" /><div className="absolute top-2 left-2 bg-blue-600 text-white text-[8px] px-2 py-0.5 rounded font-black uppercase">SUMMARY</div></div>
                        <div className="p-2 text-right"><h3 className="font-bold text-[10px] truncate text-white">{v.title}</h3></div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="min-h-[220px]" data-row-id="media-row-kids">
              {kidsVideos.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-8 mb-2"><h2 className="text-xs font-black text-white flex items-center gap-2"><div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center shadow-glow"><GraduationCap className="w-3 h-3 text-black" /></div>كلمات الطفل الأولى (تعليمي)</h2></div>
                  <div className={horizontalListClass}>
                    {kidsVideos.map((v, idx) => (
                      <div key={v.id + idx} onClick={() => setActiveVideo(v, kidsVideos)} className="w-60 group relative overflow-hidden bg-zinc-900/80 border-b-4 border-emerald-500/40 rounded-[1.5rem] focusable shrink-0 cursor-pointer" tabIndex={0} data-nav-id={`kids-item-${idx}`}>
                        <div className="aspect-video relative overflow-hidden">
                          <img src={v.thumbnail} className="w-full h-full object-cover" alt="" />
                          <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/40 to-transparent pointer-events-none" />
                        </div>
                        <div className="p-2 text-right">
                          <h3 className="font-bold text-[10px] truncate text-white">{v.title}</h3>
                          <p className="text-[8px] text-emerald-400/60 font-black uppercase mt-1">{v.channelTitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        ) : (
          <section className="space-y-6 animate-in slide-in-from-top-10 duration-0 min-h-[500px]" data-row-id="media-row-isolated">
            <div className="flex justify-between items-center sticky top-0 z-[120] bg-black/60 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl">
              <button onClick={resetView} className="h-12 px-8 rounded-full bg-red-600 text-white font-black text-sm shadow-glow focusable flex items-center gap-3 relative" tabIndex={0}><ChevronRight className="w-5 h-5" /><span>العودة للمكتبة</span></button>
              <div className="flex flex-col items-end text-right">
                <h2 className="text-2xl font-black text-white tracking-tighter">{selectedChannel ? selectedChannel.name : `نتائج البحث: ${search}`}</h2>
                <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-bold">Search Results Radar</p>
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center py-40"><Loader2 className="w-16 h-16 animate-spin text-primary" /></div>
            ) : activeGridVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {activeGridVideos.map((v, i) => {
                  const label = getSmartLabel(v.title, v.isLive || false);
                  const isFollowing = favoriteChannels.some(c => c.channelid === v.channelId);
                  const isSaved = savedVideos.some(s => s.id === v.id);
                  const nameLen = v.channelTitle?.length || 0;
                  
                  return (
                    <Card 
                      key={i} 
                      className="group bg-zinc-900 border-none rounded-[2.8rem] cursor-pointer focusable overflow-hidden shadow-2xl transition-all hover:scale-[1.03] outline-none aspect-video relative" 
                      tabIndex={0} 
                      data-nav-id={`grid-item-${i}`} 
                      onClick={() => setActiveVideo(v, activeGridVideos)}
                    >
                      <div className="w-full h-full relative">
                        <img src={v.thumbnail} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100" alt="" />
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end p-6">
                          
                          <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleSaveVideo(v); }}
                              className={cn("w-10 h-10 rounded-full backdrop-blur-md border border-white/20 flex items-center justify-center transition-all", isSaved ? "bg-accent text-black shadow-glow" : "bg-white/10 text-white/40 hover:bg-white/20")}
                            >
                              <BookmarkPlus className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={(e) => handleChannelAction(e, v.channelId, v.channelTitle, v.channelAvatar)}
                              className={cn("w-10 h-10 rounded-full backdrop-blur-md border border-white/20 flex items-center justify-center transition-all shadow-xl", isFollowing ? "bg-emerald-500/20 text-emerald-400" : "bg-primary/20 text-primary hover:bg-primary hover:text-white")}
                            >
                              {isFollowing ? <CheckCircle2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                            </button>
                          </div>

                          {label && (
                            <div className={cn("absolute top-4 right-4 px-3 py-1 rounded-lg text-[9px] font-black text-white uppercase tracking-widest shadow-2xl z-20", label.color)}>
                              {label.text}
                            </div>
                          )}

                          <div className="flex items-center gap-4 dir-rtl text-right">
                             <div 
                               className="w-16 h-16 rounded-full overflow-hidden border-4 border-white/10 bg-zinc-800 flex-shrink-0 shadow-2xl group/avatar relative cursor-pointer"
                               onClick={(e) => navigateToChannel(e, v.channelId, v.channelTitle, v.channelAvatar)}
                             >
                               <img src={v.channelAvatar || `https://yt3.ggpht.com/ytc/${v.channelId}=s88-c-k-c0x00ffffff-no-rj`} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = "https://images.unsplash.com/photo-1594911772125-07fc7a2d8d9f?w=100")} />
                               <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center"><Plus className="w-6 h-6 text-white" /></div>
                             </div>
                             
                             <div className="flex-1 min-w-0 space-y-0.5">
                                <span className={cn(
                                  "font-black text-white drop-shadow-2xl transition-all uppercase tracking-tight truncate block",
                                  nameLen < 8 ? "text-2xl" : nameLen < 15 ? "text-lg" : "text-sm"
                                )}>
                                  {v.channelTitle}
                                </span>
                                <h3 className="font-bold text-sm text-white/80 leading-tight line-clamp-2 drop-shadow-lg">
                                  {v.title}
                                </h3>
                             </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between opacity-40">
                             <div className="flex items-center gap-2">
                               <Clock className="w-3 h-3" />
                               <span className="text-[9px] font-black">{v.duration || "BEYOND"}</span>
                             </div>
                             <div className="h-0.5 flex-1 mx-3 bg-white/10 rounded-full" />
                             <span className="text-[9px] font-black uppercase tracking-widest">YouTube Satellite</span>
                          </div>

                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="py-40 flex flex-col items-center justify-center gap-6 opacity-30 text-white">
                <AlertCircle className="w-20 h-20" />
                <p className="text-2xl font-black uppercase tracking-widest">لا توجد فيديوهات متاحة</p>
                <Button variant="outline" onClick={resetView} className="rounded-full border-white/10 font-bold focusable">العودة للرئيسية</Button>
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
