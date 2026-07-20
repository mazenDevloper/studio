
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, Plus, Loader2, X, List, 
  Youtube, Star, Mic, Play, Clock, ChevronRight, AlertCircle, BookmarkPlus, ArrowRightLeft, ChevronUp, ChevronDown, Save, ArrowUpCircle, Layers
} from "lucide-react";
import { useMediaStore, YouTubeChannel, YouTubeVideo } from "@/lib/store";
import { searchYouTubeChannels, fetchChannelVideos, searchYouTubeVideos } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const READING_STYLES = [
  "مرتل", "مجود", "الحدر", "التدوير", "التحقيق", "القراءة المفسرة", "بالمقامات", "تلاوة خاشعة"
];

const JUZ_COLORS = [
  "shadow-[0_0_15px_#ff0000] border-red-500/50", "shadow-[0_0_15px_#ff7f00] border-orange-500/50",
  "shadow-[0_0_15px_#ffff00] border-yellow-500/50", "shadow-[0_0_15px_#00ff00] border-green-500/50",
  "shadow-[0_0_15px_#0000ff] border-blue-500/50", "shadow-[0_0_15px_#4b0082] border-indigo-500/50",
  "shadow-[0_0_15px_#9400d3] border-violet-500/50", "shadow-[0_0_15px_#ff1493] border-pink-500/50",
  "shadow-[0_0_15px_#00ffff] border-cyan-500/50", "shadow-[0_0_15px_#adff2f] border-lime-500/50",
  "shadow-[0_0_15px_#ff4500] border-orangered-500/50", "shadow-[0_0_15px_#1e90ff] border-dodgerblue-500/50",
  "shadow-[0_0_15px_#da70d6] border-orchid-500/50", "shadow-[0_0_15px_#32cd32] border-limegreen-500/50",
  "shadow-[0_0_15px_#ffd700] border-gold-500/50", "shadow-[0_0_15px_#ff69b4] border-hotpink-500/50",
  "shadow-[0_0_15px_#8a2be2] border-blueviolet-500/50", "shadow-[0_0_15px_#00fa9a] border-mediumspringgreen-500/50",
  "shadow-[0_0_15px_#ff8c00] border-darkorange-500/50", "shadow-[0_0_15px_#20b2aa] border-lightseagreen-500/50",
  "shadow-[0_0_15px_#f08080] border-lightcoral-500/50", "shadow-[0_0_15px_#7cfc00] border-lawngreen-500/50",
  "shadow-[0_0_15px_#00bfff] border-deepskyblue-500/50", "shadow-[0_0_15px_#ff00ff] border-magenta-500/50",
  "shadow-[0_0_15px_#fa8072] border-salmon-500/50", "shadow-[0_0_15px_#00ff7f] border-springgreen-500/50",
  "shadow-[0_0_15px_#eee8aa] border-palegoldenrod-500/50", "shadow-[0_0_15px_#b0c4de] border-lightsteelblue-500/50",
  "shadow-[0_0_15px_#dda0dd] border-plum-500/50", "shadow-[0_0_15px_#7fffd4] border-aquamarine-500/50"
];

function AddContentModal({ 
  type, isOpen, onOpenChange, onAdd 
}: { 
  type: 'channel' | 'reciter', isOpen: boolean, onOpenChange: (val: boolean) => void, onAdd: (item: YouTubeChannel) => void 
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YouTubeChannel[]>([]);
  const [loading, setLoading] = useState(false);

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

  return (
    <Dialog open={isOpen} onOpenChange={(val) => { onOpenChange(val); if(!val) { setResults([]); setQuery(""); } }}>
      <DialogContent className="bg-zinc-950/95 backdrop-blur-3xl border-white/10 text-white max-w-2xl max-h-[85vh] flex flex-col p-0 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] outline-none">
        <div className="p-8 pb-4 border-b border-white/5 bg-black/40">
          <DialogHeader><DialogTitle className="text-3xl font-black flex items-center gap-4 tracking-tighter text-right text-white">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20 shadow-glow">
              {type === 'channel' ? <Youtube className="w-7 h-7 text-primary" /> : <Mic className="w-7 h-7 text-emerald-400" />}
            </div>
            {type === 'channel' ? "إضافة قناة اشتراك" : "إضافة قارئ أو مبدع"}
          </DialogTitle></DialogHeader>
          <div className="relative mt-8">
            <Input placeholder={type === 'channel' ? "ابحث عن قنوات يوتيوب..." : "ابحث عن قراء ومبتهلين..."} value={query} onChange={(e) => handleSearch(e.target.value)} className="h-16 bg-white/5 border-white/10 rounded-2xl pr-14 text-xl focusable text-right text-white" autoFocus />
            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20">{loading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Search className="w-6 h-6" />}</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-4 space-y-3">
          {results.map((item, i) => (
            <div key={item.channelid + i} onClick={() => { onAdd(item); onOpenChange(false); }} className="flex items-center gap-5 p-5 rounded-[2rem] bg-white/5 hover:bg-white/10 transition-all cursor-pointer border-4 border-transparent group focusable outline-none" tabIndex={0}>
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl flex-shrink-0"><img src={item.image} className="w-full h-full object-cover" alt="" /></div>
              <div className="flex-1 min-w-0 text-right"><h4 className="font-black text-xl truncate text-white">{item.name}</h4><p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mt-1 font-bold">YouTube Official Content</p></div>
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-xl"><Plus className="w-6 h-6" /></div>
            </div>
          ))}
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
    fetchPriorityData, isReorderMode, toggleReorderMode, reorderChannel, moveChannelToTop,
    saveChannelsReorder
  } = useMediaStore();

  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [surahs, setSurahs] = useState<any[]>([]);
  const [windowWidth, setWindowWidth] = useState(0);
  
  const [starredVideos, setStarredVideos] = useState<YouTubeVideo[]>([]);
  const [firstChannelVids, setFirstChannelVids] = useState<YouTubeVideo[]>([]);
  const [secondChannelVids, setSecondChannelVids] = useState<YouTubeVideo[]>([]);
  const [kidsVideos, setKidsVideos] = useState<YouTubeVideo[]>([]);
  const [matchGoals, setMatchGoals] = useState<YouTubeVideo[]>([]);
  const [isIsolatedViewActive, setIsIsolatedViewActive] = useState(false);

  const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);
  const [isAddReciterOpen, setIsAddReciterOpen] = useState(false);

  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedReciter, setSelectedReciter] = useState<string | null>(null);
  const [selectedSurah, setSelectedSurah] = useState<string | null>(null);
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);

  const isDockLeft = dockSide === 'left';
  const isSmallScreen = windowWidth < 968;

  const fetchFeeds = useCallback(async () => {
    if (!favoriteChannels.length) return;
    try {
      const starred = favoriteChannels.filter(c => c.starred);
      const allStarredPromises = starred.map(c => fetchChannelVideos(c.channelid, 10));
      const results = await Promise.all(allStarredPromises);
      const combinedStarred: YouTubeVideo[] = [];
      results.forEach(vids => combinedStarred.push(...vids));
      setStarredVideos(combinedStarred.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()));

      if (favoriteChannels.length >= 1) fetchChannelVideos(favoriteChannels[0].channelid, 15).then(v => setFirstChannelVids(v));
      if (favoriteChannels.length >= 2) fetchChannelVideos(favoriteChannels[1].channelid, 15).then(v => setSecondChannelVids(v));

      searchYouTubeVideos("أهداف مباريات اليوم ملخص", 15).then(v => setMatchGoals(v));
      
      const ryanRes = await searchYouTubeVideos("كلمات الطفل الأولى ريان بالعربي", 10);
      const kidsRes = await searchYouTubeVideos("كيدز بالعربي كلمات الطفل الأولى", 10);
      const combinedKids: YouTubeVideo[] = [];
      for (let i = 0; i < 10; i++) {
        if (ryanRes[i]) combinedKids.push(ryanRes[i]);
        if (kidsRes[i]) combinedKids.push(kidsRes[i]);
      }
      setKidsVideos(combinedKids);
    } catch (e) {}
  }, [favoriteChannels]);

  useEffect(() => {
    fetchPriorityData('media');
    fetchFeeds();
    
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    fetch("https://api.quran.com/api/v4/chapters?language=ar").then(r => r.json()).then(d => setSurahs(d.chapters || []));
    const q = searchParams.get('q');
    if (q) { setSearch(q); performSearch(q); }
    return () => window.removeEventListener('resize', handleResize);
  }, [searchParams, fetchPriorityData, fetchFeeds]);

  const performSearch = async (overrideQuery?: string) => {
    const queryToUse = overrideQuery || search;
    if (!queryToUse.trim()) return;
    setLoading(true); 
    setIsIsolatedViewActive(true); 
    setIsSidebarShrinked(true); 
    setSelectedChannel(null);
    try { 
      const res = await searchYouTubeVideos(queryToUse); 
      setSearchResults(res || []);
    } finally { setLoading(false); }
  };

  const handleStyleClick = (style: string) => { 
    setSelectedStyle(style); 
    if (style === "ربط الآيات") {
      setTimeout(() => { document.querySelector('[data-nav-id="surah-0"]')?.focus(); }, 200);
    } else {
      setTimeout(() => { document.querySelector('[data-nav-id="reciter-0"]')?.focus(); }, 200);
    }
  };

  const handleReciterClick = (name: string) => { 
    setSelectedReciter(name); 
    setTimeout(() => { document.querySelector('[data-nav-id="surah-0"]')?.focus(); }, 200);
  };

  const handleSurahClick = (name: string) => { 
    setSelectedSurah(name); 
    setSelectedJuz(null);
    const query = `${selectedReciter || ""} سورة ${name} ${selectedStyle || ""}`.trim();
    setSearch(query);
    performSearch(query); 
  };

  const handleJuzClick = (juzNum: number) => {
    setSelectedJuz(juzNum);
    setSelectedSurah(null);
    const query = `${selectedReciter || ""} الجزء ${juzNum} ${selectedStyle || ""}`.trim();
    setSearch(query);
    performSearch(query);
  };

  useEffect(() => {
    if (selectedChannel) {
      setLoading(true); 
      setIsIsolatedViewActive(true);
      setIsSidebarShrinked(true);
      fetchChannelVideos(selectedChannel.channelid, 20).then(v => { setChannelVideos(v || []); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [selectedChannel, setChannelVideos, setIsSidebarShrinked]);

  const resetView = () => { setSelectedChannel(null); setSearchResults([]); setSearch(""); setIsIsolatedViewActive(false); setIsSidebarShrinked(false); setSelectedStyle(null); setSelectedReciter(null); setSelectedSurah(null); setSelectedJuz(null); };

  const activeGridVideos = selectedChannel ? channelVideos : searchResults;
  const showIsolatedView = isIsolatedViewActive || !!selectedChannel || searchResults.length > 0;
  const horizontalListClass = "w-full flex gap-4 px-8 py-0 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center";
  const rowWrapperClass = "group/row transition-all duration-700 relative py-2 mb-0";
  const itemScaleClass = "transition-all duration-500 scale-[0.9] group-focus-within/row:scale-[1.2] group-focus-within/row:mx-8 focus:z-50 shrink-0";

  const getSurahColorClass = (idx: number) => {
    const juzIndex = Math.floor(idx / (114 / 30));
    return JUZ_COLORS[juzIndex % 30];
  };

  return (
    <div className={cn("h-screen flex bg-transparent overflow-hidden relative", isDockLeft ? "flex-row-reverse" : "flex-row")}>
      {!isSmallScreen && (
        <aside className={cn("h-full z-[110] transition-all duration-0 premium-glass flex flex-col shrink-0 border-white/5 bg-black/40 shadow-2xl", isSidebarShrinked ? "w-[6%]" : "w-[28%]", isDockLeft ? "border-l" : "border-r")}>
          <div className="p-4 flex items-center justify-between border-b border-white/5">
            {!isSidebarShrinked && (
              <button onClick={toggleReorderMode} className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-all", isReorderMode ? "bg-blue-600 text-white shadow-glow" : "bg-white/5 text-white/40")}>
                <ArrowRightLeft className="w-5 h-5" />
              </button>
            )}
            <button onClick={() => setIsAddChannelOpen(true)} className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center focusable border border-primary/20" tabIndex={0} data-nav-id="add-channel-btn"><Plus className="w-5 h-5 text-white" /></button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar py-2 flex flex-col gap-1">
            <div data-row-id="subs-all" onClick={resetView} className={cn("flex items-center gap-3 p-3 cursor-pointer focusable w-[94%] mx-auto rounded-xl", !selectedChannel && !searchResults.length && !isIsolatedViewActive ? "bg-primary text-white" : "hover:bg-white/5 text-white/60")} tabIndex={0} data-nav-id="subs-0"><div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10 shrink-0"><List className="w-5 h-5" /></div>{!isSidebarShrinked && <span className="flex-1 text-right font-black text-sm block overflow-hidden whitespace-nowrap px-1">الكل</span>}</div>
            {favoriteChannels.map((ch, idx) => (
              <div key={ch.channelid + idx} data-row-id={`sub-item-${idx}`} onClick={() => { if(!isReorderMode) { setSearchResults([]); setSelectedChannel(ch); } }} className={cn("flex flex-row-reverse items-center p-3 rounded-xl w-[94%] mx-auto gap-3 cursor-pointer focusable shrink-0 border-2", selectedChannel?.channelid === ch.channelid ? "bg-primary text-white" : "hover:bg-white/5 text-white/60", "border-transparent relative group")} tabIndex={0} data-nav-id={`subs-${idx + 1}`} data-type="channel" data-id={ch.channelid}>
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0 relative"><img src={ch.image} className="w-full h-full object-cover" alt="" />{ch.starred && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-yellow-500 rounded-full border border-black" />}</div>
                {!isSidebarShrinked && <span className="font-black text-sm flex-1 text-right leading-none text-white block overflow-hidden whitespace-nowrap px-1">{ch.name}</span>}
              </div>
            ))}
          </div>
        </aside>
      )}

      <main className="flex-1 overflow-y-auto custom-scrollbar relative pt-0 pb-40 px-10 no-scrollbar" style={{ direction: 'rtl' }}>
        {!showIsolatedView ? (
          <>
            <section data-row-id="row-search" className="py-2"><div className="flex items-center gap-3 w-full"><Input placeholder="ابحث عن تلاوات، أهداف، أو فيديوهات..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && performSearch()} className="h-16 bg-white/5 border-none rounded-[2rem] pr-10 text-xl font-bold text-right focusable text-white flex-1" data-nav-id="main-search-input" /><button onClick={() => performSearch()} className="h-16 px-10 rounded-[2rem] bg-red-600 text-white font-black text-lg focusable flex items-center shrink-0 relative"><Youtube className="w-6 h-6 ml-3" /> استكشاف</button></div></section>
            
            <section data-row-id="row-styles" className={rowWrapperClass}>
              <div className={horizontalListClass}>
                <button 
                  onClick={() => handleStyleClick("ربط الآيات")} 
                  className={cn(itemScaleClass, "px-8 py-4 rounded-full font-bold text-sm focusable border-2 text-white bg-blue-600 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.4)]")} 
                  tabIndex={0}
                  data-nav-id="style-link-verses"
                >
                  ربط الآيات
                </button>
                <button onClick={() => { setSelectedStyle(null); }} className={cn(itemScaleClass, "px-8 py-4 rounded-full font-black text-sm focusable border-2 text-white", !selectedStyle ? "bg-primary border-primary/40" : "bg-white/5 border-transparent")} tabIndex={0} data-nav-id="style-all">الكل</button>
                {READING_STYLES.map((style, i) => (<button key={style} data-nav-id={`style-${i}`} onClick={() => handleStyleClick(style)} className={cn(itemScaleClass, "px-8 py-4 rounded-full font-black text-sm focusable border-2 text-white", selectedStyle === style ? "bg-primary border-primary/40 shadow-glow" : "bg-white/5 border-white/5")} tabIndex={0}>{style}</button>))}
              </div>
            </section>
            
            <section data-row-id="row-reciters" className={rowWrapperClass}>
              <div className={cn(horizontalListClass, "gap-8")}>
                <button 
                  onClick={() => setIsAddReciterOpen(true)} 
                  className={cn(itemScaleClass, "flex flex-col items-center gap-6 px-6 py-4 rounded-[2.5rem] focusable border-2 border-transparent hover:bg-emerald-600/10")} 
                  tabIndex={0} 
                  data-nav-id="reciter-add"
                >
                  <div className="w-52 h-52 rounded-full flex items-center justify-center bg-emerald-500/10 border-4 border-dashed border-emerald-500/30 text-emerald-400">
                    <Plus className="w-16 h-16" />
                  </div>
                </button>
                {favoriteReciters.map((r, i) => (
                  <button 
                    key={r.channelid + i} 
                    onClick={() => handleReciterClick(r.name)} 
                    className={cn(itemScaleClass, "flex flex-col items-center gap-6 px-6 py-4 rounded-[2.5rem] focusable border-2 transition-all relative group", selectedReciter === r.name ? "border-emerald-500 bg-emerald-500/10" : "border-transparent hover:bg-emerald-600/10")} 
                    tabIndex={0} 
                    data-nav-id={`reciter-${i}`}
                  >
                    <div className="w-52 h-52 rounded-full overflow-hidden border-4 border-emerald-500/30 shadow-2xl">
                      <img src={r.image} className="w-full h-full object-cover" alt="" />
                    </div>
                    <span className="text-2xl font-black truncate max-w-[240px] text-white">
                      {r.name}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section data-row-id="row-juz" className={rowWrapperClass}>
              <div className={horizontalListClass}>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 shrink-0">
                  <Layers className="w-4 h-4 text-accent" />
                  <span className="text-[10px] font-black text-white/40 uppercase">الأجزاء</span>
                </div>
                {[...Array(30).keys()].map(i => {
                  const juzNum = i + 1;
                  return (
                    <button 
                      key={`juz-${juzNum}`} 
                      onClick={() => handleJuzClick(juzNum)} 
                      className={cn(
                        itemScaleClass, 
                        "px-8 py-4 rounded-full text-white font-black text-sm focusable border-2 transition-all",
                        selectedJuz === juzNum ? "bg-white text-black border-white shadow-glow" : JUZ_COLORS[i]
                      )} 
                      tabIndex={0}
                      data-nav-id={`juz-${juzNum}`}
                    >
                      الجزء {juzNum}
                    </button>
                  );
                })}
              </div>
            </section>

            <section data-row-id="row-surahs" className={rowWrapperClass}>
              <div className={horizontalListClass}>
                {surahs.map((s, i) => (
                  <button 
                    key={i} 
                    data-nav-id={`surah-${i}`} 
                    onClick={() => handleSurahClick(s.name_arabic)} 
                    className={cn(
                      itemScaleClass, 
                      "px-10 py-5 rounded-full border text-white font-black text-sm hover:bg-blue-600/20 focusable transition-all", 
                      selectedSurah === s.name_arabic ? "bg-blue-600 border-blue-400 shadow-glow" : getSurahColorClass(i)
                    )} 
                    tabIndex={0}
                  >
                    {s.name_arabic}
                  </button>
                ))}
              </div>
            </section>

            <section data-row-id="row-vids-starred" className={rowWrapperClass}><div className={horizontalListClass}>{starredVideos.map((v, idx) => (<div key={v.id + idx} data-nav-id={`row-starred-video-${idx}`} onClick={() => setActiveVideo(v, starredVideos)} className={cn(itemScaleClass, "w-72 group relative overflow-hidden bg-zinc-900/80 border border-white/10 rounded-[1.8rem] focusable cursor-pointer shadow-2xl")} tabIndex={0}><div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} className="w-full h-full object-cover" alt="" /></div><div className="p-4 text-right"><h3 className="font-bold text-xs truncate text-white">{v.title}</h3></div></div>))}</div></section>
            <section data-row-id="row-vids-ch1" className={rowWrapperClass}><div className={horizontalListClass}>{firstChannelVids.map((v, idx) => (<div key={v.id + idx} data-nav-id={`row-ch1-video-${idx}`} onClick={() => setActiveVideo(v, firstChannelVids)} className={cn(itemScaleClass, "w-72 group relative overflow-hidden bg-zinc-900/80 border-b-2 border-primary/20 rounded-[1.8rem] focusable cursor-pointer shadow-2xl")} tabIndex={0}><div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} className="w-full h-full object-cover" alt="" /></div><div className="p-4 text-right"><h3 className="font-bold text-xs truncate text-white">{v.title}</h3></div></div>))}</div></section>
            <section data-row-id="row-vids-goals" className={rowWrapperClass}><div className={horizontalListClass}>{matchGoals.map((v, idx) => (<div key={v.id + idx} data-nav-id={`row-goals-video-${idx}`} onClick={() => setActiveVideo(v, matchGoals)} className={cn(itemScaleClass, "w-72 group relative overflow-hidden bg-zinc-900/80 border-b-4 border-blue-600/40 rounded-[1.8rem] focusable cursor-pointer shadow-2xl")} tabIndex={0}><div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} className="w-full h-full object-cover" alt="" /></div><div className="p-4 text-right"><h3 className="font-bold text-xs truncate text-white">{v.title}</h3></div></div>))}</div></section>
            <section data-row-id="row-vids-ch2" className={rowWrapperClass}><div className={horizontalListClass}>{secondChannelVids.map((v, idx) => (<div key={v.id + idx} data-nav-id={`row-ch2-video-${idx}`} onClick={() => setActiveVideo(v, secondChannelVids)} className={cn(itemScaleClass, "w-72 group relative overflow-hidden bg-zinc-900/80 border-b-2 border-primary/20 rounded-[1.8rem] focusable cursor-pointer shadow-2xl")} tabIndex={0}><div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} className="w-full h-full object-cover" alt="" /></div><div className="p-4 text-right"><h3 className="font-bold text-xs truncate text-white">{v.title}</h3></div></div>))}</div></section>
            <section data-row-id="row-vids-kids" className={rowWrapperClass}><div className={horizontalListClass}>{kidsVideos.map((v, idx) => (<div key={v.id + idx} data-nav-id={`row-kids-video-${idx}`} onClick={() => setActiveVideo(v, kidsVideos)} className={cn(itemScaleClass, "w-72 group relative overflow-hidden bg-zinc-900/80 border-b-4 border-emerald-500/40 rounded-[1.8rem] focusable cursor-pointer shadow-2xl")} tabIndex={0}><div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} className="w-full h-full object-cover" alt="" /></div><div className="p-4 text-right"><h3 className="font-bold text-xs truncate text-white">{v.title}</h3></div></div>))}</div></section>
          </>
        ) : (
          <section className="space-y-10 animate-in slide-in-from-top-10 duration-500 min-h-[500px] relative origin-center">
            <div data-row-id="row-back-bar" className="flex justify-between items-center sticky top-0 z-[120] bg-black/70 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/10 shadow-2xl"><button onClick={resetView} className="h-14 px-10 rounded-full bg-red-600 text-white font-black text-base focusable flex items-center gap-4" tabIndex={0} data-nav-id="back-to-library"><X className="w-6 h-6" /><span>العودة للمكتبة</span></button><div className="flex flex-col items-end text-right"><h2 className="text-4xl font-black text-white tracking-tighter">{selectedChannel ? selectedChannel.name : selectedJuz ? `الجزء ${selectedJuz}` : `رادار البحث: ${search}`}</h2><p className="text-[11px] text-white/40 uppercase tracking-[0.5em] font-bold mt-1">Deep Neural Content Scan</p></div></div>
            {loading && activeGridVideos.length === 0 ? (<div className="flex flex-col items-center justify-center py-40 gap-6"><Loader2 className="w-20 h-20 animate-spin text-primary" /><p className="text-white/20 font-black uppercase tracking-[0.8em] text-sm animate-pulse">Syncing Streams...</p></div>) : (
              <div data-row-id="row-grid-content" className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity duration-300", loading && "opacity-50 grayscale")}>
                {activeGridVideos.map((v, i) => {
                  const isSaved = savedVideos.some(s => s.id === v.id);
                  const progress = videoProgress[v.id] || 0;
                  return (
                    <Card key={v.id + i} className="group bg-zinc-900/40 border-none rounded-[2.8rem] cursor-pointer focusable overflow-hidden shadow-2xl aspect-[16/10] relative" tabIndex={0} data-nav-id={`grid-video-${i}`} onClick={() => setActiveVideo(v, activeGridVideos)}>
                      <div className="w-full h-full relative">
                        <img src={v.thumbnail} className="w-full h-full object-cover opacity-70 group-hover:opacity-100" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-6 text-right">
                          <div className="w-full mb-auto flex justify-between items-start">
                             <div className="opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={(e) => { e.stopPropagation(); toggleSaveVideo(v); }} className={cn("w-12 h-12 rounded-full backdrop-blur-xl border border-white/20 flex items-center justify-center transition-all", isSaved ? "bg-accent text-black shadow-glow" : "bg-white/10 text-white/60")}><BookmarkPlus className="w-6 h-6" /></button>
                             </div>
                          </div>
                          <div className="w-full mb-3">
                             <h3 className="text-base md:text-lg font-black text-white line-clamp-2 drop-shadow-[0_4px_12px_rgba(0,0,0,1)] leading-snug tracking-tight">
                               {v.title}
                             </h3>
                          </div>
                          {progress > 0 && <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mb-2"><div className="h-full bg-accent shadow-glow" style={{ width: `${Math.min(100, (progress / 3600) * 100)}%` }} /></div>}
                          <div className="flex items-center justify-between w-full opacity-60">
                             <div className="flex items-center gap-2"><Clock className="w-3 h-3 text-white" /><span className="text-[10px] font-black text-white uppercase tracking-widest">{v.duration || "FEED"}</span></div>
                             {v.isLive && <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" /><span className="text-[10px] font-black text-red-500 uppercase tracking-widest">LIVE</span></div>}
                          </div>
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
