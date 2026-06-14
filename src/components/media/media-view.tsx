
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
            <DialogTitle className="text-3xl font-black flex items-center gap-4 tracking-tighter text-right text-white">
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
              className="h-16 bg-white/5 border-white/10 rounded-2xl pr-14 text-xl focusable transition-all focus:bg-white/10 focus:border-primary/50 text-right text-white" 
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
              <p className="font-black text-xl text-white">لا توجد نتائج مطابقة</p>
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-10">
              <Search className="w-20 h-20 text-white" />
              <p className="font-black text-2xl uppercase tracking-[0.5em] text-white">Start Searching</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * MediaView v730.0 - Strict Sports Filtering & Cinema Layout
 * Features: Complete purge of beIN/TOD and bottom-right info anchoring.
 */
export function MediaView() {
  const searchParams = useSearchParams();
  const { 
    favoriteChannels, addChannel, setActiveVideo, dockSide, isSidebarShrinked, setIsSidebarShrinked,
    selectedChannel, setSelectedChannel, channelVideos, setChannelVideos,
    favoriteReciters, addReciter, toggleSaveVideo, savedVideos, videoProgress,
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
      // 1. Fetching logic: Explicitly targeting generic sports highlights
      const [writerResults, customHighlights, kidsData] = await Promise.allSettled([
        searchYouTubeVideos("أهداف مباريات اليوم بدون بي ان", 20),
        searchYouTubeVideos("ملخصات مباريات اليوم عالمية", 20),
        searchYouTubeVideos("قناة ريان بالعربي أطفال", 30)
      ]);

      const mergedGoals: YouTubeVideo[] = [];
      const filterBlacklist = (v: YouTubeVideo) => {
        const lowerTitle = v.title.toLowerCase();
        const lowerChannel = v.channelTitle?.toLowerCase() || "";
        const blacklist = ['bein', 'tod', 'بي ان', 'تود'];
        return !blacklist.some(term => lowerTitle.includes(term) || lowerChannel.includes(term));
      };

      if (writerResults.status === 'fulfilled') mergedGoals.push(...writerResults.value.filter(filterBlacklist));
      if (customHighlights.status === 'fulfilled') mergedGoals.push(...customHighlights.value.filter(filterBlacklist));
      setMatchGoals(mergedGoals.slice(0, 20));

      if (kidsData.status === 'fulfilled') {
        const rawKids = kidsData.value;
        const rayyanVideos = rawKids.filter(v => v.channelTitle?.includes("ريان"));
        const finalKids = rayyanVideos.length > 0 ? rayyanVideos.slice(0, 15) : rawKids.slice(0, 15);
        setKidsVideos(finalKids);
      }

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

      if (shouldUpdateLive || liveFromSubs.length === 0) {
        const top10 = favoriteChannels.slice(0, 10);
        const liveResults: YouTubeVideo[] = [];
        const seenIds = new Set();
        
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
    if (isLive) return { text: "بث حي", color: "bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)] animate-pulse" };
    if (t.includes("ملخص") || t.includes("highlight")) return { text: "ملخص ذكي", color: "bg-blue-600/80" };
    if (t.includes("اهداف") || t.includes("goals")) return { text: "أهداف", color: "bg-emerald-600/80" };
    if (t.includes("مصحف") || t.includes("سورة")) return { text: "تلاوة خاشعة", color: "bg-amber-600/80" };
    if (t.includes("طفل") || t.includes("كيدز")) return { text: "تعليمي", color: "bg-purple-600/80" };
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
  const horizontalListClass = "w-full flex gap-4 px-8 pb-2 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center";

  return (
    <div className={cn("h-screen flex bg-transparent overflow-hidden relative", isDockLeft ? "flex-row-reverse" : "flex-row")}>
      
      {showSidebarLayout && (
        <aside className={cn(
          "h-full z-[110] transition-all duration-0 premium-glass flex flex-col shrink-0 border-white/5 bg-black/40 shadow-2xl", 
          isSidebarShrinked ? "w-[6%]" : "w-[28%]", 
          isDockLeft ? "border-l" : "border-r"
        )}>
          <div className="p-4 flex items-center justify-between border-b border-white/5">
            {!isSidebarShrinked && (
              <div className="flex flex-col">
                <h2 className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">الاشتراكات</h2>
                {isReorderMode && <span className="text-[8px] text-yellow-500 font-bold px-2 animate-pulse">وضع الترتيب نشط</span>}
              </div>
            )}
            <div className="flex items-center gap-2">
              {isReorderMode && !isSidebarShrinked && (
                <button onClick={handleSaveOrder} className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 focusable" disabled={isSavingReorder}>
                  {isSavingReorder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </button>
              )}
              <button onClick={() => setIsAddChannelOpen(true)} className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center transition-all focusable relative z-[150] shadow-glow border border-primary/20" tabIndex={0}><Plus className="w-5 h-5 text-white" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar py-2 flex flex-col gap-1">
            <div onClick={resetView} className={cn("flex items-center gap-3 p-3 cursor-pointer focusable w-[94%] mx-auto rounded-xl", !selectedChannel && !searchResults.length && !isIsolatedViewActive ? "bg-primary text-white" : "hover:bg-white/5 text-white/60")} tabIndex={0}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10 shrink-0"><List className="w-5 h-5" /></div>
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
                  "flex flex-row-reverse items-center p-3 rounded-xl w-[94%] mx-auto gap-3 cursor-pointer focusable shrink-0 border-2", 
                  selectedChannel?.channelid === ch.channelid ? "bg-primary text-white shadow-glow" : "hover:bg-white/5 text-white/60", 
                  pickedUpId === ch.channelid ? "border-yellow-500 animate-pulse bg-yellow-500/10" : "border-transparent",
                  isReorderMode && "cursor-move"
                )} 
                tabIndex={0} data-nav-id={`subs-${idx + 1}`} data-type="channel" data-id={ch.channelid}
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0 relative">
                  <img src={ch.image} className="w-full h-full object-cover" alt="" />
                  {ch.starred && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-yellow-500 rounded-full shadow-glow border border-black" />}
                </div>
                {!isSidebarShrinked && (
                  <>
                    <span className="font-black text-sm flex-1 text-right leading-none text-white block overflow-hidden whitespace-nowrap px-1">{truncateName(ch.name)}</span>
                    {isReorderMode && (
                      <button onClick={(e) => { e.stopPropagation(); moveChannelToTop(ch.channelid); }} className="w-7 h-7 rounded bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                        <ChevronUp className="w-4 h-4 text-yellow-500" />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </aside>
      )}

      <main className="flex-1 overflow-y-auto custom-scrollbar relative pt-4 pb-40 space-y-6 px-10 no-scrollbar" style={{ direction: 'rtl' }}>
        {!showIsolatedView ? (
          <>
            <section className="space-y-4" data-row-id="media-row-search">
              <div className="flex justify-start items-center gap-4">
                <Button onClick={toggleReorderMode} variant={isReorderMode ? "default" : "outline"} className={cn("rounded-full h-10 px-8 font-black text-xs relative", isReorderMode ? "bg-yellow-500 text-black shadow-glow" : "bg-white/5 border-white/10 text-white")} tabIndex={0}><ShortcutBadge action="toggle_reorder" className="-bottom-2 -left-2" /><ArrowRightLeft className="w-4 h-4 ml-2" /> {isReorderMode ? "إيقاف الترتيب" : "تفعيل الترتيب"}</Button>
              </div>
              <div className="flex items-center gap-3 w-full">
                <div className="flex-1 relative flex items-center">
                  <Input 
                    placeholder="ابحث عن تلاوات، أهداف، أو فيديوهات..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && performSearch()} 
                    className="h-16 bg-white/5 border-none rounded-[2rem] pr-10 text-xl font-bold text-right focusable text-white" 
                    data-nav-id="media-search-input"
                  />
                  <div className="absolute left-8 flex items-center gap-4 text-white/40"><Mic className="w-6 h-6" /><Activity className="w-6 h-6 animate-pulse" /></div>
                </div>
                <button onClick={() => performSearch()} className="h-16 px-10 rounded-[2rem] bg-red-600 text-white font-black text-lg shadow-glow focusable flex items-center shrink-0 relative" data-nav-id="search-btn" tabIndex={0}><Youtube className="w-6 h-6 ml-3" /> استكشاف</button>
              </div>
            </section>

            <section className="min-h-[160px]" data-row-id="media-row-reciters">
              <div className="flex items-center justify-between px-8 mb-4">
                <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em]">القراء والمبدعون</h2>
              </div>
              <div className={horizontalListClass}>
                <button onClick={() => setIsAddReciterOpen(true)} className="flex flex-col items-center gap-3 px-4 py-3 rounded-[2rem] focusable shrink-0 min-w-[110px] border-4 border-transparent hover:bg-emerald-600/10" tabIndex={0}><div className="w-16 h-16 rounded-full flex items-center justify-center bg-emerald-500/10 border-2 border-dashed border-emerald-500/30 text-emerald-400 shadow-lg"><UserPlus className="w-8 h-8" /></div><span className="text-[9px] font-black text-emerald-400/60 uppercase tracking-widest">إضافة جديد</span></button>
                {favoriteReciters.map((r, i) => (
                  <button 
                    key={r.channelid} 
                    onClick={() => handleReciterClick(r.name)} 
                    className="flex flex-col items-center gap-3 px-4 py-3 rounded-[2rem] focusable shrink-0 min-w-[110px] border-4 transition-all relative group border-transparent hover:bg-emerald-600/10"
                    tabIndex={0}
                    data-nav-id={`reciter-${i}`}
                  >
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-500/30 shadow-2xl">
                      {r.image ? <img src={r.image} className="w-full h-full object-cover" alt="" /> : <User className="w-6 h-6 text-white/20" />}
                    </div>
                    <span className="text-[11px] font-black truncate max-w-[100px] text-white/90 block">{truncateName(r.name, 14)}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="min-h-[80px]" data-row-id="media-row-surahs">
              <div className={horizontalListClass}>
                {surahs.map((s, i) => (
                  <button key={i} data-nav-id={`surah-${i}`} onClick={() => handleSurahClick(s.name_arabic)} className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white font-black text-sm hover:bg-blue-600/20 focusable shrink-0 relative" tabIndex={0}>{s.name_arabic}</button>
                ))}
              </div>
            </section>

            <section className="min-h-[240px]" data-row-id="media-row-live-subs">
              {liveFromSubs.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-8 mb-4"><h2 className="text-xs font-black text-white flex items-center gap-3"><div className="w-6 h-6 rounded bg-red-600 flex items-center justify-center shadow-glow"><RadioIcon className="w-4 h-4 text-white" /></div>بثوث حية من اشتراكاتك</h2></div>
                  <div className={horizontalListClass}>
                    {liveFromSubs.map((v, idx) => (
                      <div key={v.id + idx} onClick={() => setActiveVideo(v, liveFromSubs)} className="w-72 group relative overflow-hidden bg-zinc-900/80 border-2 border-red-600/40 rounded-[2rem] focusable shrink-0 cursor-pointer transition-all hover:scale-105 shadow-2xl" tabIndex={0} data-nav-id={`live-item-${idx}`}>
                        <div className="aspect-video relative overflow-hidden">
                          <img src={v.thumbnail} className="w-full h-full object-cover" alt="" />
                          <div className="absolute top-3 right-3 bg-red-600 text-white text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter shadow-glow animate-pulse">LIVE NOW</div>
                        </div>
                        <div className="p-4 text-right bg-gradient-to-t from-black to-transparent">
                          <h3 className="font-bold text-xs truncate text-white leading-tight">{v.title}</h3>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="min-h-[240px]" data-row-id="media-row-starred">
              {starredVideos.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-8 mb-4"><h2 className="text-xs font-black text-white flex items-center gap-3"><div className="w-6 h-6 rounded bg-yellow-500 flex items-center justify-center shadow-lg"><Star className="w-4 h-4 text-black fill-current" /></div>الترددات المجرسة (مؤخراً)</h2></div>
                  <div className={horizontalListClass}>
                    {starredVideos.map((v, idx) => (
                      <div key={v.id + idx} onClick={() => setActiveVideo(v, starredVideos)} className="w-72 group relative overflow-hidden bg-zinc-900/80 rounded-[2rem] focusable shrink-0 cursor-pointer transition-all hover:scale-105 shadow-2xl border border-white/5" tabIndex={0} data-nav-id={`starred-item-${idx}`}>
                        <div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} className="w-full h-full object-cover" alt="" />{v.duration && <div className="absolute bottom-3 right-3 bg-black/80 text-white text-[14px] px-3 py-1.5 rounded-xl font-black z-10 border border-white/10">{v.duration}</div>}<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-sm transition-all"><Play className="w-10 h-10 text-white fill-current" /></div></div>
                        <div className="p-4 text-right bg-black/40">
                           <h3 className="font-bold text-xs truncate text-white leading-tight">{v.title}</h3>
                           <div className="flex items-center justify-end gap-2 mt-2 opacity-60"><span className="text-[9px] text-yellow-500 font-bold uppercase">{v.channelTitle}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="min-h-[240px]" data-row-id="media-row-highlights">
              {matchGoals.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-8 mb-4"><h2 className="text-xs font-black text-white flex items-center gap-3"><div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center shadow-glow"><Trophy className="w-4 h-4 text-white" /></div>ملخصات رياضية ذكية</h2></div>
                  <div className={horizontalListClass}>
                    {matchGoals.map((v, idx) => (
                      <div key={v.id + idx} onClick={() => setActiveVideo(v, matchGoals)} className="w-72 group relative overflow-hidden bg-zinc-900/80 border-b-4 border-blue-600/50 rounded-[2rem] focusable shrink-0 cursor-pointer shadow-2xl transition-all" tabIndex={0} data-nav-id={`highlight-item-${idx}`}>
                        <div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="" /><div className="absolute top-3 left-3 bg-blue-600 text-white text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-lg">GOALS & SUMMARY</div></div>
                        <div className="p-4 text-right"><h3 className="font-bold text-[11px] truncate text-white leading-tight">{v.title}</h3></div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="min-h-[240px]" data-row-id="media-row-kids">
              {kidsVideos.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-8 mb-4"><h2 className="text-xs font-black text-white flex items-center gap-3"><div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center shadow-glow"><GraduationCap className="w-4 h-4 text-black" /></div>أكاديمية الطفل (تعليمي)</h2></div>
                  <div className={horizontalListClass}>
                    {kidsVideos.map((v, idx) => (
                      <div key={v.id + idx} onClick={() => setActiveVideo(v, kidsVideos)} className="w-72 group relative overflow-hidden bg-zinc-900/80 border-b-4 border-emerald-500/50 rounded-[2rem] focusable shrink-0 cursor-pointer shadow-2xl transition-all" tabIndex={0} data-nav-id={`kids-item-${idx}`}>
                        <div className="aspect-video relative overflow-hidden">
                          <img src={v.thumbnail} className="w-full h-full object-cover" alt="" />
                          <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/50 to-transparent pointer-events-none" />
                        </div>
                        <div className="p-4 text-right">
                          <h3 className="font-bold text-[11px] truncate text-white leading-tight">{v.title}</h3>
                          <p className="text-[9px] text-emerald-400/80 font-black uppercase mt-1 tracking-tighter">{v.channelTitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        ) : (
          <section className="space-y-10 animate-in slide-in-from-top-10 duration-500 min-h-[500px]" data-row-id="media-row-isolated">
            <div className="flex justify-between items-center sticky top-0 z-[120] bg-black/70 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)]">
              <button onClick={resetView} className="h-14 px-10 rounded-full bg-red-600 text-white font-black text-base shadow-glow focusable flex items-center gap-4 relative transition-all active:scale-95" tabIndex={0}><ChevronRight className="w-6 h-6" /><span>العودة للمكتبة</span></button>
              <div className="flex flex-col items-end text-right">
                <h2 className="text-4xl font-black text-white tracking-tighter drop-shadow-2xl">{selectedChannel ? selectedChannel.name : `رادار البحث: ${search}`}</h2>
                <p className="text-[11px] text-white/40 uppercase tracking-[0.5em] font-bold mt-1">Deep Neural Content Scan</p>
              </div>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center justify-center py-40 gap-6">
                <Loader2 className="w-20 h-20 animate-spin text-primary" />
                <p className="text-white/20 font-black uppercase tracking-[0.8em] text-sm animate-pulse">Syncing Streams...</p>
              </div>
            ) : activeGridVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {activeGridVideos.map((v, i) => {
                  const label = getSmartLabel(v.title, v.isLive || false);
                  const isFollowing = favoriteChannels.some(c => c.channelid === v.channelId);
                  const isSaved = savedVideos.some(s => s.id === v.id);
                  const progress = videoProgress[v.id] || 0;
                  const nameLen = v.channelTitle?.length || 0;
                  
                  return (
                    <Card 
                      key={i} 
                      className="group bg-zinc-900/40 border-none rounded-[3.5rem] cursor-pointer focusable overflow-hidden shadow-2xl transition-all hover:scale-[1.05] outline-none aspect-video relative" 
                      tabIndex={0} 
                      data-nav-id={`grid-item-${i}`} 
                      onClick={() => setActiveVideo(v, activeGridVideos)}
                    >
                      <div className="w-full h-full relative">
                        <img src={v.thumbnail} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-70 group-hover:opacity-100" alt="" />
                        
                        {/* THE CINEMATIC OVERLAY - Anchored to Bottom Right */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/95 via-black/30 to-transparent flex flex-col justify-end items-end p-8 text-right dir-rtl">
                          
                          {/* TOP ACTIONS */}
                          <div className="absolute top-6 left-6 flex gap-3 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0">
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleSaveVideo(v); }}
                              className={cn("w-12 h-12 rounded-full backdrop-blur-xl border border-white/20 flex items-center justify-center transition-all shadow-2xl", isSaved ? "bg-accent text-black shadow-glow" : "bg-white/10 text-white/60 hover:bg-white/30")}
                            >
                              <BookmarkPlus className="w-6 h-6" />
                            </button>
                            <button 
                              onClick={(e) => handleChannelAction(e, v.channelId, v.channelTitle, v.channelAvatar)}
                              className={cn("w-12 h-12 rounded-full backdrop-blur-xl border border-white/20 flex items-center justify-center transition-all shadow-2xl", isFollowing ? "bg-emerald-500/20 text-emerald-400" : "bg-primary/20 text-primary hover:bg-primary hover:text-white")}
                            >
                              {isFollowing ? <CheckCircle2 className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
                            </button>
                          </div>

                          {label && (
                            <div className={cn("absolute top-6 right-6 px-4 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-2xl z-20", label.color)}>
                              {label.text}
                            </div>
                          )}

                          {/* ANCHORED IDENTITY HUB - PINNED BOTTOM RIGHT */}
                          <div className="flex flex-row items-center gap-4 w-full justify-start mt-auto">
                             <div 
                               className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/30 bg-zinc-800 flex-shrink-0 shadow-2xl group/avatar relative cursor-pointer hover:border-primary transition-colors"
                               onClick={(e) => navigateToChannel(e, v.channelId, v.channelTitle, v.channelAvatar)}
                             >
                               <img src={v.channelAvatar || `https://yt3.ggpht.com/ytc/${v.channelId}=s88-c-k-c0x00ffffff-no-rj`} className="w-full h-full object-cover" />
                             </div>
                             
                             <div className="flex-1 min-w-0 space-y-0.5">
                                <span className={cn(
                                  "font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] transition-all uppercase tracking-tighter truncate block leading-tight",
                                  nameLen < 12 ? "text-xl" : "text-sm"
                                )}>
                                  {v.channelTitle}
                                </span>
                                <h3 className="font-bold text-xs md:text-sm text-white/90 leading-tight line-clamp-2 drop-shadow-2xl">
                                  {v.title}
                                </h3>
                             </div>
                          </div>

                          {/* PROGRESS RADAR */}
                          {progress > 0 && (
                            <div className="mt-3 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-accent shadow-[0_0_15px_rgba(var(--accent),0.8)]" style={{ width: `${Math.min(100, (progress / 3600) * 100)}%` }} />
                            </div>
                          )}

                          <div className="mt-3 flex items-center justify-between w-full opacity-40">
                             <div className="flex items-center gap-2">
                               <Clock className="w-3.5 h-3.5 text-white" />
                               <span className="text-[9px] font-black text-white uppercase tracking-widest">{v.duration || "FEED"}</span>
                             </div>
                             {v.isLive && (
                               <div className="flex items-center gap-2">
                                 <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                                 <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">LIVE</span>
                               </div>
                             )}
                          </div>

                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="py-40 flex flex-col items-center justify-center gap-8 opacity-30 text-white">
                <AlertCircle className="w-24 h-24 text-white/20" />
                <p className="text-3xl font-black uppercase tracking-[0.4em]">لا توجد بيانات متاحة</p>
                <Button variant="outline" onClick={resetView} className="rounded-full h-16 px-12 border-white/20 font-black text-xl hover:bg-white/10 transition-all focusable">العودة للرئيسية</Button>
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
