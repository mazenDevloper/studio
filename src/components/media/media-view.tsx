
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, Plus, Loader2, X, List, 
  Flame, Activity, RadioIcon, Trophy, Baby, ChevronRight, User, Youtube, Star, ArrowRightLeft, Mic, Play, Clock, Goal, UserPlus, CheckCircle2,
  Sparkles, AlertCircle, BookmarkPlus, GraduationCap, ChevronUp, Save, BookOpen, Music
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

const READING_STYLES = [
  "مرتل", 
  "مجود", 
  "الحدر", 
  "التدوير", 
  "التحقيق", 
  "القراءة المفسرة", 
  "بالمقامات",
  "تلاوة خاشعة"
];

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
  const inputRef = useRef<HTMLInputElement>(null);

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
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

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
              ref={inputRef}
              placeholder={type === 'channel' ? "ابحث عن قنوات يوتيوب..." : "ابحث عن قراء ومبتهلين..."} 
              value={query} 
              onChange={(e) => handleSearch(e.target.value)} 
              className="h-16 bg-white/5 border-white/10 rounded-2xl pr-14 text-xl focusable transition-all focus:bg-white/10 focus:border-primary/50 text-right text-white" 
              data-nav-id="modal-search-input"
              autoFocus
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
              <span className="text-4xl">✨</span>
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

export function MediaView() {
  const searchParams = useSearchParams();
  const { 
    favoriteChannels, addChannel, setActiveVideo, dockSide, isSidebarShrinked, setIsSidebarShrinked,
    selectedChannel, setSelectedChannel, channelVideos, setChannelVideos,
    favoriteReciters, addReciter, toggleSaveVideo, savedVideos, videoProgress,
    isReorderMode, toggleReorderMode, pickedUpId, setPickedUpId, reorderChannelTo,
    fetchPriorityData, lastLiveUpdate, setLastLiveUpdate
  } = useMediaStore();

  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [surahs, setSurahs] = useState<any[]>([]);
  const [windowWidth, setWindowWidth] = useState(0);
  
  const [starredVideos, setStarredVideos] = useState<YouTubeVideo[]>([]);
  const [firstStarredVideos, setFirstStarredVideos] = useState<YouTubeVideo[]>([]);
  
  const [liveFromSubs, setLiveFromSubs] = useState<YouTubeVideo[]>([]);
  const [kidsVideos, setKidsVideos] = useState<YouTubeVideo[]>([]);
  const [matchGoals, setMatchGoals] = useState<YouTubeVideo[]>([]);
  const [isIsolatedViewActive, setIsIsolatedViewActive] = useState(false);

  const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);
  const [isAddReciterOpen, setIsAddReciterOpen] = useState(false);

  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedReciter, setSelectedReciter] = useState<string | null>(null);
  const [selectedSurah, setSelectedSurah] = useState<string | null>(null);

  const isDockLeft = dockSide === 'left';
  const showSidebarLayout = windowWidth >= 980;

  useEffect(() => {
    fetchPriorityData('media');
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    fetch("https://api.quran.com/api/v4/chapters?language=ar").then(r => r.json()).then(d => setSurahs(d.chapters || []));
    
    const q = searchParams.get('q');
    if (q) { setSearch(q); performSearch(q); }
    
    return () => window.removeEventListener('resize', handleResize);
  }, [searchParams]);

  const performSearch = async (overrideQuery?: string) => {
    const queryToUse = overrideQuery || search;
    if (!queryToUse.trim()) return;
    setLoading(true); 
    setIsIsolatedViewActive(true); 
    setIsSidebarShrinked(true);
    setSelectedChannel(null);
    try { 
      const res = await searchYouTubeVideos(queryToUse); 
      if (res && res.length > 0) setSearchResults(res); 
    } finally { setLoading(false); }
  };

  const updateDynamicSearch = (rec: string | null, sur: string | null, sty: string | null) => {
    let query = "";
    if (rec) query += rec;
    if (sur) query += ` سورة ${sur}`;
    if (sty) query += ` ${sty}`;
    setSearch(query.trim());
    return query.trim();
  };

  const handleStyleClick = (style: string) => {
    setSelectedStyle(style);
    updateDynamicSearch(selectedReciter, selectedSurah, style);
    setTimeout(() => {
      const target = document.querySelector('[data-nav-id="reciter-0"]') as HTMLElement;
      target?.focus();
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  const handleReciterClick = (name: string) => { 
    setSelectedReciter(name);
    updateDynamicSearch(name, selectedSurah, selectedStyle);
    setTimeout(() => {
      const target = document.querySelector('[data-nav-id="surah-0"]') as HTMLElement;
      target?.focus();
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  const handleSurahClick = (name: string) => { 
    setSelectedSurah(name);
    const finalQuery = updateDynamicSearch(selectedReciter, name, selectedStyle);
    performSearch(finalQuery);
  };

  const fetchFeeds = useCallback(async (force = false) => {
    if (!favoriteChannels.length) return;
    const timeSinceLast = Date.now() - lastLiveUpdate;
    const twoHours = 2 * 60 * 60 * 1000;
    const shouldUpdateLive = force || timeSinceLast >= twoHours;

    try {
      searchYouTubeVideos("أهداف مباريات اليوم", 20).then(v => v.length && setMatchGoals(v));
      searchYouTubeVideos("قناة ريان بالعربي أطفال كيدز", 30).then(v => v.length && setKidsVideos(v));

      const starredChannels = favoriteChannels.filter(c => c.starred);
      if (starredChannels.length > 0) {
        const firstVideos: YouTubeVideo[] = [];
        const remainingVideos: YouTubeVideo[] = [];
        
        await Promise.all(starredChannels.map(async (c) => {
          const vids = await fetchChannelVideos(c.channelid, 5);
          if (vids.length > 0) {
            firstVideos.push(vids[0]);
            remainingVideos.push(...vids.slice(1));
          }
        }));
        
        const sortedRemaining = remainingVideos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        setStarredVideos([...firstVideos, ...sortedRemaining]);
        
        fetchChannelVideos(starredChannels[0].channelid, 15).then(v => v.length && setFirstStarredVideos(v));
      }

      if (shouldUpdateLive) {
        const liveResults: YouTubeVideo[] = [];
        await Promise.all(favoriteChannels.slice(0, 10).map(async (c) => {
          const res = await searchYouTubeVideos(`"${c.name}" مباشر`, 3);
          liveResults.push(...res.filter(v => v.isLive));
        }));
        if (liveResults.length) { setLiveFromSubs(liveResults.slice(0, 15)); setLastLiveUpdate(Date.now()); }
      }
    } catch (e) {}
  }, [favoriteChannels, lastLiveUpdate]);

  useEffect(() => { fetchFeeds(); }, [fetchFeeds]);

  useEffect(() => {
    if (selectedChannel) {
      setLoading(true); 
      setIsIsolatedViewActive(true);
      fetchChannelVideos(selectedChannel.channelid, 20)
        .then(v => { if(v.length > 0) setChannelVideos(v); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [selectedChannel, setChannelVideos]);

  const resetView = () => { 
    setSelectedChannel(null); setSearchResults([]); setSearch(""); setIsIsolatedViewActive(false); setIsSidebarShrinked(false); 
    setSelectedStyle(null); setSelectedReciter(null); setSelectedSurah(null);
  };

  const getSmartLabel = (title: string, isLive: boolean) => {
    const t = title.toLowerCase();
    if (isLive) return { text: "بث حي", color: "bg-red-600 animate-pulse" };
    if (t.includes("ملخص") || t.includes("اهداف")) return { text: "ملخص ذكي", color: "bg-blue-600/80" };
    if (t.includes("مصحف") || t.includes("سورة")) return { text: "تلاوة خاشعة", color: "bg-amber-600/80" };
    return null;
  };

  const activeGridVideos = selectedChannel ? channelVideos : searchResults;
  const showIsolatedView = isIsolatedViewActive || !!selectedChannel || searchResults.length > 0;
  const horizontalListClass = "w-full flex gap-4 px-8 py-0 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center";
  const rowWrapperClass = "group/row transition-all duration-700 relative py-2 mb-0";
  const itemScaleClass = "transition-all duration-500 scale-[0.9] group-focus-within/row:scale-[1.2] group-focus-within/row:mx-8 focus:z-50 shrink-0";

  return (
    <div className={cn("h-screen flex bg-transparent overflow-hidden relative", isDockLeft ? "flex-row-reverse" : "flex-row")}>
      {showSidebarLayout && (
        <aside className={cn("h-full z-[110] transition-all duration-0 premium-glass flex flex-col shrink-0 border-white/5 bg-black/40 shadow-2xl", isSidebarShrinked ? "w-[6%]" : "w-[28%]", isDockLeft ? "border-l" : "border-r")}>
          <div className="p-4 flex items-center justify-between border-b border-white/5">
            {!isSidebarShrinked && <h2 className="text-[10px] font-black text-white/40 uppercase tracking-widest px-2">الاشتراكات</h2>}
            <button onClick={() => setIsAddChannelOpen(true)} className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center focusable border border-primary/20" tabIndex={0}><Plus className="w-5 h-5 text-white" /></button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar py-2 flex flex-col gap-1">
            <div onClick={resetView} className={cn("flex items-center gap-3 p-3 cursor-pointer focusable w-[94%] mx-auto rounded-xl", !selectedChannel && !searchResults.length && !isIsolatedViewActive ? "bg-primary text-white" : "hover:bg-white/5 text-white/60")} tabIndex={0}><div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10 shrink-0"><List className="w-5 h-5" /></div>{!isSidebarShrinked && <span className="flex-1 text-right font-black text-sm block overflow-hidden whitespace-nowrap px-1">الكل</span>}</div>
            {favoriteChannels.map((ch, idx) => (
              <div key={ch.channelid} onClick={() => { setSearchResults([]); setSelectedChannel(ch); }} className={cn("flex flex-row-reverse items-center p-3 rounded-xl w-[94%] mx-auto gap-3 cursor-pointer focusable shrink-0 border-2", selectedChannel?.channelid === ch.channelid ? "bg-primary text-white" : "hover:bg-white/5 text-white/60", "border-transparent")} tabIndex={0} data-nav-id={`subs-${idx + 1}`} data-type="channel" data-id={ch.channelid}>
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0 relative"><img src={ch.image} className="w-full h-full object-cover" alt="" />{ch.starred && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-yellow-500 rounded-full border border-black" />}</div>
                {!isSidebarShrinked && <span className="font-black text-sm flex-1 text-right leading-none text-white block overflow-hidden whitespace-nowrap px-1">{ch.name}</span>}
              </div>
            ))}
          </div>
        </aside>
      )}

      <main className="flex-1 overflow-y-auto custom-scrollbar relative pt-0 pb-40 space-y-0 px-10 no-scrollbar" style={{ direction: 'rtl' }}>
        {!showIsolatedView ? (
          <>
            <section className="py-2" data-row-id="media-row-search">
              <div className="flex items-center gap-3 w-full">
                <Input placeholder="ابحث عن تلاوات، أهداف، أو فيديوهات..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && performSearch()} className="h-16 bg-white/5 border-none rounded-[2rem] pr-10 text-xl font-bold text-right focusable text-white flex-1" data-nav-id="media-search-input" />
                <button onClick={() => performSearch()} className="h-16 px-10 rounded-[2rem] bg-red-600 text-white font-black text-lg focusable flex items-center shrink-0 relative" data-nav-id="search-btn" tabIndex={0}><Youtube className="w-6 h-6 ml-3" /> استكشاف</button>
              </div>
            </section>

            <section className={rowWrapperClass} data-row-id="media-row-styles">
              <div className={horizontalListClass}>
                <button onClick={() => { setSelectedStyle(null); updateDynamicSearch(selectedReciter, selectedSurah, null); }} className={cn(itemScaleClass, "px-8 py-4 rounded-full font-black text-sm focusable transition-all border-2 text-white", !selectedStyle ? "bg-primary border-primary/40" : "bg-white/5 border-transparent")} tabIndex={0}>الكل</button>
                {READING_STYLES.map((style, i) => (
                  <button key={style} data-nav-id={`style-${i}`} onClick={() => handleStyleClick(style)} className={cn(itemScaleClass, "px-8 py-4 rounded-full font-black text-sm focusable border-2 text-white", selectedStyle === style ? "bg-primary border-primary/40 shadow-glow" : "bg-white/5 border-white/5")} tabIndex={0}>{style}</button>
                ))}
              </div>
            </section>

            <section className={rowWrapperClass} data-row-id="media-row-reciters">
              <div className={horizontalListClass}>
                <button onClick={() => setIsAddReciterOpen(true)} className={cn(itemScaleClass, "flex flex-col items-center gap-3 px-4 py-2 rounded-[2rem] focusable border-2 border-transparent hover:bg-emerald-600/10")} tabIndex={0}><div className="w-24 h-24 rounded-full flex items-center justify-center bg-emerald-500/10 border-2 border-dashed border-emerald-500/30 text-emerald-400"><Plus className="w-10 h-10" /></div></button>
                {favoriteReciters.map((r, i) => (
                  <button key={r.channelid} onClick={() => handleReciterClick(r.name)} className={cn(itemScaleClass, "flex flex-col items-center gap-3 px-4 py-2 rounded-[2rem] focusable border-2 transition-all relative group", selectedReciter === r.name ? "border-emerald-500 bg-emerald-500/10" : "border-transparent hover:bg-emerald-600/10")} tabIndex={0} data-nav-id={`reciter-${i}`} data-type="reciter" data-id={r.channelid}>
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-500/30 shadow-2xl group-hover:scale-105 transition-transform duration-500"><img src={r.image} className="w-full h-full object-cover" alt="" /></div>
                    <span className="text-[10px] font-black truncate max-w-[120px] text-white">{r.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className={rowWrapperClass} data-row-id="media-row-surahs">
              <div className={horizontalListClass}>
                {surahs.map((s, i) => (
                  <button key={i} data-nav-id={`surah-${i}`} onClick={() => handleSurahClick(s.name_arabic)} className={cn(itemScaleClass, "px-10 py-5 rounded-full bg-white/5 border border-white/10 text-white font-black text-sm hover:bg-blue-600/20 focusable transition-all", selectedSurah === s.name_arabic ? "bg-blue-600 border-blue-400 shadow-glow" : "")} tabIndex={0}>{s.name_arabic}</button>
                ))}
              </div>
            </section>

            <section className={rowWrapperClass} data-row-id="media-row-live-subs">
              <div className={horizontalListClass}>
                {liveFromSubs.map((v, idx) => (
                  <div key={v.id + idx} onClick={() => setActiveVideo(v, liveFromSubs)} className={cn(itemScaleClass, "w-72 group relative overflow-hidden bg-zinc-900/80 border-2 border-red-600/40 rounded-[1.8rem] focusable cursor-pointer shadow-2xl")} tabIndex={0} data-nav-id={`live-item-${idx}`}>
                    <div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} className="w-full h-full object-cover" alt="" /><div className="absolute top-3 right-3 bg-red-600 text-white text-[9px] px-2.5 py-1 rounded-full font-black animate-pulse">LIVE NOW</div></div>
                    <div className="p-4 text-right bg-gradient-to-t from-black to-transparent"><h3 className="font-bold text-xs truncate text-white leading-tight">{v.title}</h3></div>
                  </div>
                ))}
              </div>
            </section>

            <section className={rowWrapperClass} data-row-id="media-row-starred">
              <div className={horizontalListClass}>
                {starredVideos.map((v, idx) => (
                  <div key={v.id + idx} onClick={() => setActiveVideo(v, starredVideos)} className={cn(itemScaleClass, "w-72 group relative overflow-hidden bg-zinc-900/80 rounded-[1.8rem] focusable cursor-pointer shadow-2xl border border-white/5")} tabIndex={0} data-nav-id={`starred-item-${idx}`}>
                    <div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} className="w-full h-full object-cover" alt="" /><div className="absolute bottom-3 right-3 bg-black/80 text-white text-[12px] px-2.5 py-1 rounded-xl font-black border border-white/10">{v.duration}</div></div>
                    <div className="p-4 text-right bg-black/40"><h3 className="font-bold text-xs truncate text-white leading-tight">{v.title}</h3><div className="flex items-center justify-end gap-2 mt-1 opacity-60"><span className="text-[8px] text-yellow-500 font-bold uppercase">{v.channelTitle}</span></div></div>
                  </div>
                ))}
              </div>
            </section>

            <section className={rowWrapperClass} data-row-id="media-row-first-starred">
              <div className={horizontalListClass}>
                {firstStarredVideos.map((v, idx) => (
                  <div key={v.id + idx} onClick={() => setActiveVideo(v, firstStarredVideos)} className={cn(itemScaleClass, "w-72 group relative overflow-hidden bg-zinc-900/80 rounded-[1.8rem] focusable cursor-pointer shadow-2xl border border-white/5")} tabIndex={0} data-nav-id={`first-starred-item-${idx}`}>
                    <div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} className="w-full h-full object-cover" alt="" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" /><div className="absolute bottom-3 right-3 bg-black/80 text-white text-[10px] px-2 py-1 rounded-lg font-black border border-white/10">{v.duration}</div></div>
                    <div className="p-4 text-right"><h3 className="font-bold text-xs truncate text-white leading-tight">{v.title}</h3><div className="flex items-center justify-end gap-2 mt-2"><span className="text-[8px] text-white/40 font-bold uppercase">{v.channelTitle}</span></div></div>
                  </div>
                ))}
              </div>
            </section>

            <section className={rowWrapperClass} data-row-id="media-row-highlights">
              <div className={horizontalListClass}>
                {matchGoals.map((v, idx) => (
                  <div key={v.id + idx} onClick={() => setActiveVideo(v, matchGoals)} className={cn(itemScaleClass, "w-72 group relative overflow-hidden bg-zinc-900/80 border-b-4 border-blue-600/50 rounded-[1.8rem] focusable cursor-pointer shadow-2xl")} tabIndex={0} data-nav-id={`highlight-item-${idx}`}>
                    <div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} className="w-full h-full object-cover opacity-80" alt="" /><div className="absolute top-3 left-3 bg-blue-600 text-white text-[8px] px-2.5 py-1 rounded-full font-black uppercase">GOALS & SUMMARY</div></div>
                    <div className="p-4 text-right"><h3 className="font-bold text-xs truncate text-white leading-tight">{v.title}</h3></div>
                  </div>
                ))}
              </div>
            </section>

            <section className={rowWrapperClass} data-row-id="media-row-kids">
              <div className={horizontalListClass}>
                {kidsVideos.map((v, idx) => (
                  <div key={v.id + idx} onClick={() => setActiveVideo(v, kidsVideos)} className={cn(itemScaleClass, "w-72 group relative overflow-hidden bg-zinc-900/80 border-b-4 border-emerald-500/50 rounded-[1.8rem] focusable cursor-pointer shadow-2xl")} tabIndex={0} data-nav-id={`kids-item-${idx}`}>
                    <div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} className="w-full h-full object-cover" alt="" /><div className="absolute inset-0 bg-gradient-to-t from-emerald-900/50 to-transparent" /></div>
                    <div className="p-4 text-right"><h3 className="font-bold text-xs truncate text-white leading-tight">{v.title}</h3></div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="space-y-10 animate-in slide-in-from-top-10 duration-500 min-h-[500px] relative origin-center" data-row-id="media-row-isolated">
            <div className="flex justify-between items-center sticky top-0 z-[120] bg-black/70 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)]">
              <button onClick={resetView} className="h-14 px-10 rounded-full bg-red-600 text-white font-black text-base focusable flex items-center gap-4 relative" tabIndex={0}><ChevronRight className="w-6 h-6" /><span>العودة للمكتبة</span></button>
              <div className="flex flex-col items-end text-right"><h2 className="text-4xl font-black text-white tracking-tighter">{selectedChannel ? selectedChannel.name : `رادار البحث: ${search}`}</h2><p className="text-[11px] text-white/40 uppercase tracking-[0.5em] font-bold mt-1">Deep Neural Content Scan</p></div>
            </div>
            {loading && activeGridVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40 gap-6"><Loader2 className="w-20 h-20 animate-spin text-primary" /><p className="text-white/20 font-black uppercase tracking-[0.8em] text-sm animate-pulse">Syncing Streams...</p></div>
            ) : (
              <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-300", loading && "opacity-50 grayscale")}>
                {activeGridVideos.map((v, i) => {
                  const label = getSmartLabel(v.title, v.isLive || false);
                  const isFollowing = favoriteChannels.some(c => c.channelid === v.channelId);
                  const isSaved = savedVideos.some(s => s.id === v.id);
                  const progress = videoProgress[v.id] || 0;
                  return (
                    <Card key={i} className="group bg-zinc-900/40 border-none rounded-[2.8rem] cursor-pointer focusable overflow-hidden shadow-2xl transition-all hover:scale-[1.05] aspect-[16/10] relative" tabIndex={0} data-nav-id={`grid-item-${i}`} onClick={() => setActiveVideo(v, activeGridVideos)}>
                      <div className="w-full h-full relative">
                        <img src={v.thumbnail} className="w-full h-full object-cover opacity-70 group-hover:opacity-100" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/95 via-black/20 to-transparent flex flex-col justify-end items-end p-4 text-right">
                          <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={(e) => { e.stopPropagation(); toggleSaveVideo(v); }} className={cn("w-10 h-10 rounded-full backdrop-blur-xl border border-white/20 flex items-center justify-center transition-all", isSaved ? "bg-accent text-black shadow-glow" : "bg-white/10 text-white/60")}><BookmarkPlus className="w-5 h-5" /></button>
                          </div>
                          {label && <div className={cn("absolute top-4 right-4 px-3 py-1 rounded-lg text-[8px] font-black text-white uppercase shadow-2xl z-20", label.color)}>{label.text}</div>}
                          <div className="flex flex-row items-center gap-2 w-full justify-start mt-auto mb-1">
                             <div className="flex-1 min-w-0"><span className="font-black text-white text-[8px] uppercase truncate block opacity-80 mb-0.5">{v.channelTitle}</span><h3 className="font-bold text-[10px] text-white/95 leading-tight line-clamp-2">{v.title}</h3></div>
                          </div>
                          {progress > 0 && <div className="h-0.5 w-full bg-white/10 rounded-full overflow-hidden mb-1"><div className="h-full bg-accent" style={{ width: `${Math.min(100, (progress / 3600) * 100)}%` }} /></div>}
                          <div className="flex items-center justify-between w-full opacity-40"><div className="flex items-center gap-1.5"><Clock className="w-2.5 h-2.5 text-white" /><span className="text-[8px] font-black text-white uppercase tracking-widest">{v.duration || "FEED"}</span></div>{v.isLive && <div className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-red-600 animate-pulse" /><span className="text-[8px] font-black text-red-500 uppercase tracking-widest">LIVE</span></div>}</div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
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
