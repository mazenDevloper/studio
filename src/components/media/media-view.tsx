
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Plus, Loader2, X, List, Youtube, Star, Mic, Layers, Sparkles, Trophy, Clock
} from "lucide-react";
import { useMediaStore, YouTubeChannel, YouTubeVideo } from "@/lib/store";
import { fetchChannelVideos, searchYouTubeVideos } from "@/lib/youtube";
import { cn } from "@/lib/utils";

const READING_STYLES = ["مرتل", "مجود", "الحدر", "التدوير", "التحقيق", "القراءة المفسرة", "بالمقامات", "تلاوة خاشعة"];

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
  "shadow-[0_0_15px_#dda0dd] border-plum-500/50", "shadow-[0_0_15_#7fffd4] border-aquamarine-500/50"
];

const JUZ_SURAH_MAP: Record<number, number[]> = {
  1: [1, 2], 2: [2], 3: [2, 3], 4: [3, 4], 5: [4], 6: [4, 5], 7: [5, 6], 8: [6, 7], 9: [7, 8], 10: [8, 9],
  11: [9, 10, 11], 12: [11, 12], 13: [12, 13, 14], 14: [15, 16], 15: [17, 18], 16: [18, 19, 20], 17: [21, 22],
  18: [23, 24, 25], 19: [25, 26, 27], 20: [27, 28, 29], 21: [29, 30, 31, 32, 33], 22: [33, 34, 35, 36],
  23: [36, 37, 38, 39], 24: [39, 40, 41], 25: [42, 43, 44, 45], 26: [46, 47, 48, 49, 50, 51],
  27: [51, 52, 53, 54, 55, 56, 57], 28: [58, 59, 60, 61, 62, 63, 64, 65, 66],
  29: [67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77],
  30: [78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114]
};

export function MediaView() {
  const searchParams = useSearchParams();
  const { 
    favoriteChannels, setActiveVideo, dockSide, isSidebarShrinked, setIsSidebarShrinked,
    selectedChannel, setSelectedChannel, channelVideos, setChannelVideos,
    favoriteReciters, incrementReciterClick, fetchPriorityData
  } = useMediaStore();

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [surahs, setSurahs] = useState<any[]>([]);
  const [allSurahs, setAllSurahs] = useState<any[]>([]);
  const [starredLists, setStarredLists] = useState<Record<string, any>>({});
  const [childWords, setChildWords] = useState<YouTubeVideo[]>([]);
  const [matchHighlights, setMatchHighlights] = useState<YouTubeVideo[]>([]);
  const [isIsolatedViewActive, setIsIsolatedViewActive] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedReciter, setSelectedReciter] = useState<string | null>(null);
  const [selectedSurah, setSelectedSurah] = useState<string | null>(null);
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);

  const isDockLeft = dockSide === 'left';

  const fetchExtraLists = useCallback(async () => {
    const starred = favoriteChannels.filter(c => c.starred).slice(0, 3);
    for (let i = 0; i < 3; i++) {
        if (starred[i]) {
            const vids = await fetchChannelVideos(starred[i].channelid, 15);
            setStarredLists(prev => ({ ...prev, [i]: vids, [`name-${i}`]: starred[i].name }));
        } else {
            setStarredLists(prev => ({ ...prev, [i]: [], [`name-${i}`]: "" }));
        }
    }
    searchYouTubeVideos("كلمات الطفل الأولى تعليم النطق", 15).then(setChildWords);
    searchYouTubeVideos("ملخص مباريات كرة القدم الأمس", 15).then(setMatchHighlights);
  }, [favoriteChannels]);

  // Data Lifecycle & Focus Management
  useEffect(() => {
    fetchExtraLists();
    fetch("https://api.quran.com/api/v4/chapters?language=ar").then(r => r.json()).then(d => {
      setSurahs(d.chapters || []); setAllSurahs(d.chapters || []);
    });
    
    const q = searchParams.get('q'); if (q) { setSearch(q); performSearch(q); }

    // Sovereign Focus on First Reciter - Atomic Focus Guard
    const focusTimer = setTimeout(() => {
      const firstReciter = document.querySelector('[data-nav-id="reciter-item-0"]') as HTMLElement;
      if (firstReciter) {
        firstReciter.focus();
        firstReciter.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 1500);

    const syncInterval = setInterval(() => fetchPriorityData('media'), 15000);
    return () => {
      clearTimeout(focusTimer);
      clearInterval(syncInterval);
    };
  }, [searchParams, fetchExtraLists, fetchPriorityData]);

  useEffect(() => {
    if (selectedChannel) {
      setLoading(true);
      fetchChannelVideos(selectedChannel.channelid, 40).then(vids => {
        setChannelVideos(vids);
        setLoading(false);
      });
    }
  }, [selectedChannel, setChannelVideos]);

  const performSearch = async (query?: string) => {
    const q = query || search; if (!q.trim()) return;
    setLoading(true); setIsIsolatedViewActive(true); setIsSidebarShrinked(true); setSelectedChannel(null);
    try { 
      const res = await searchYouTubeVideos(q, 40); 
      setSearchResults(res || []); 
      setTimeout(() => { (document.querySelector('[data-nav-id="grid-item-0"]') as HTMLElement)?.focus(); }, 500);
    } finally { setLoading(false); }
  };

  const handleReciterClick = (r: any) => {
    setSelectedReciter(r.name);
    incrementReciterClick(r.channelid);
    setSearch(prev => `${prev} ${r.name}`.trim());
    setTimeout(() => { (document.querySelector('[data-nav-id="juz-item-0"]') as HTMLElement)?.focus(); }, 100);
  };

  const handleJuzClick = (juzNum: number) => {
    setSelectedJuz(juzNum); setSelectedSurah(null);
    const surahIds = JUZ_SURAH_MAP[juzNum] || [];
    setSurahs(allSurahs.filter(s => surahIds.includes(s.id)));
    setTimeout(() => { (document.querySelector('[data-nav-id="surah-0"]') as HTMLElement)?.focus(); }, 100);
  };

  const handleSurahClick = (name: string) => {
    setSelectedSurah(name);
    const finalQuery = `${search} سورة ${name}`.trim();
    setSearch(finalQuery);
    performSearch(finalQuery);
  };

  const resetView = () => { 
    setSelectedChannel(null); setSearchResults([]); setSearch(""); setIsIsolatedViewActive(false); 
    setIsSidebarShrinked(false); setSelectedStyle(null); setSelectedReciter(null); 
    setSelectedSurah(null); setSelectedJuz(null); setSurahs(allSurahs); 
  };

  const horizontalListClass = "w-full flex gap-4 px-8 py-0 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center";

  return (
    <div className={cn("h-screen flex bg-transparent overflow-hidden relative", isDockLeft ? "flex-row-reverse" : "flex-row")}>
      <aside data-nav-zone="sidebar" className={cn("h-full z-[110] premium-glass flex flex-col shrink-0 border-white/5 bg-black/40 transition-all duration-300", isSidebarShrinked ? "w-[80px]" : "w-[28%]", isDockLeft ? "border-l" : "border-r")}>
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <button className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center focusable border border-primary/20" tabIndex={0} data-nav-id="sidebar-add-btn"><Plus className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 no-scrollbar">
          <div onClick={resetView} className={cn("flex items-center justify-center gap-3 p-3 cursor-pointer focusable w-[90%] mx-auto rounded-xl", !selectedChannel && !isIsolatedViewActive ? "bg-primary text-white" : "hover:bg-white/5")} tabIndex={0} data-nav-id="sidebar-all-btn"><List className="w-5 h-5" />{!isSidebarShrinked && <span className="font-black text-sm">الكل</span>}</div>
          {favoriteChannels.map((ch, idx) => (
            <div key={idx} onClick={() => { setSearchResults([]); setSelectedChannel(ch); setIsIsolatedViewActive(true); }} className={cn("flex items-center justify-center p-3 rounded-xl w-[90%] mx-auto gap-3 cursor-pointer focusable", selectedChannel?.channelid === ch.channelid ? "bg-primary text-white" : "hover:bg-white/5 text-white/60")} tabIndex={0} data-nav-id={`sidebar-channel-${idx}`}>
              <div className="w-8 h-8 rounded-xl overflow-hidden relative shrink-0"><img src={ch.image} className="w-full h-full object-cover" alt="" /></div>
              {!isSidebarShrinked && <span className="font-black text-sm flex-1 truncate text-right">{ch.name}</span>}
            </div>
          ))}
        </div>
      </aside>

      <main data-nav-zone="content" className="flex-1 overflow-y-auto relative pt-0 pb-40 px-10 no-scrollbar" style={{ direction: 'rtl' }}>
        {!isIsolatedViewActive && !selectedChannel ? (
          <>
            <section data-row-id="row-search" className="py-4"><div className="flex gap-3"><Input placeholder="ابحث عن أي شيء..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && performSearch()} className="h-16 bg-white/5 border-none rounded-[2rem] pr-10 text-xl font-bold focusable flex-1" data-nav-id="content-search-input" /><button onClick={() => performSearch()} className="h-16 px-10 rounded-[2rem] bg-red-600 text-white font-black text-lg focusable flex items-center" data-nav-id="content-search-btn"><Youtube className="w-6 h-6 ml-3" /> استكشاف</button></div></section>
            
            <section data-row-id="row-styles" className="py-2"><div className={horizontalListClass}>
              <button onClick={() => { setSelectedStyle(null); setSearch(""); }} className={cn("px-10 py-6 rounded-full font-black text-lg focusable border-2 shrink-0", !selectedStyle ? "bg-primary border-primary/40 shadow-glow" : "bg-white/5 border-transparent")} tabIndex={0} data-nav-id="style-item-all">الكل</button>
              {READING_STYLES.map((s, i) => (<button key={i} onClick={() => { setSelectedStyle(s); setSearch(prev => `${prev} ${s}`.trim()); }} className={cn("px-10 py-6 rounded-full font-black text-lg focusable border-2 shrink-0", selectedStyle === s ? "bg-primary border-primary/40 shadow-glow" : "bg-white/5 border-white/5")} tabIndex={0} data-nav-id={`style-item-${i}`}>{s}</button>))}
            </div></section>

            <section data-row-id="row-reciters" className="py-2"><div className={cn(horizontalListClass, "gap-8")}>
              {favoriteReciters.map((r, i) => (<button key={i} onClick={() => handleReciterClick(r)} className={cn("flex flex-col items-center gap-4 px-4 py-4 rounded-[2.5rem] focusable border-2 shrink-0 group", selectedReciter === r.name ? "border-emerald-500 bg-emerald-500/10" : "border-transparent hover:bg-emerald-600/10")} tabIndex={0} data-nav-id={`reciter-item-${i}`}><div className="w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-500/30 shadow-2xl"><img src={r.image} className="w-full h-full object-cover" alt="" /></div><span className="text-xs font-black text-white">{r.name}</span></button>))}
            </div></section>

            <section data-row-id="row-juz" className="py-2"><div className={horizontalListClass}><div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-full border border-white/10 shrink-0"><Layers className="w-6 h-6 text-accent" /><span className="text-[12px] font-black text-white/40 uppercase">الأجزاء</span></div>{[...Array(30).keys()].map(i => (<button key={i} onClick={() => handleJuzClick(i+1)} className={cn("px-12 py-6 rounded-full text-white font-black text-xl focusable border-2 shrink-0", selectedJuz === i+1 ? "bg-white text-black border-white shadow-glow" : JUZ_COLORS[i])} tabIndex={0} data-nav-id={`juz-item-${i}`}>الجزء {i+1}</button>))}</div></section>

            <section data-row-id="row-surahs" className="py-2"><div className={horizontalListClass}>
              {selectedJuz && (
                <button onClick={() => performSearch(`${search} الجزء ${selectedJuz}`)} className="px-14 py-7 rounded-full border-2 text-white font-black text-xl focusable bg-white/5 border-white/10 hover:bg-blue-600/20 shadow-glow shrink-0" tabIndex={0} data-nav-id="juz-whole-btn">الجزء {selectedJuz}</button>
              )}
              {surahs.map((s, i) => (<button key={i} onClick={() => handleSurahClick(s.name_arabic)} className={cn("px-14 py-7 rounded-full border-2 text-white font-black text-xl focusable shrink-0", selectedSurah === s.name_arabic ? "bg-blue-600 border-blue-400 shadow-glow" : "bg-white/5 border-white/10")} tabIndex={0} data-nav-id={`surah-${i}`}>سورة {s.name_arabic}</button>))}
            </div></section>

            {[0, 1, 2].map(idx => starredLists[idx]?.length > 0 && (
              <section key={idx} data-row-id={`row-vids-${idx}`} className="py-4"><div className="px-10 mb-4 flex items-center gap-4"><div className="w-8 h-8 rounded-lg bg-yellow-500 flex items-center justify-center"><Star className="w-5 h-5 text-black fill-current" /></div><h2 className="text-xl font-black text-white uppercase tracking-widest">ترددات {starredLists[`name-${idx}`]}</h2></div><div className={horizontalListClass}>{starredLists[idx].map((v, i) => (<div key={i} onClick={() => setActiveVideo(v, starredLists[idx])} className="w-80 group relative overflow-hidden bg-zinc-900/80 border border-white/10 rounded-[2rem] focusable cursor-pointer shrink-0" tabIndex={0} data-nav-id={`row-vids-${idx}-${i}`}><img src={v.thumbnail} className="aspect-video object-cover w-full" alt="" /><div className="p-5 text-right font-bold text-sm truncate text-white">{v.title}</div></div>))}</div></section>
            ))}

            {childWords.length > 0 && (
              <section data-row-id="row-child-words" className="py-4">
                <div className="px-10 mb-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center"><Sparkles className="w-5 h-5 text-black" /></div>
                  <h2 className="text-xl font-black text-white uppercase tracking-widest">كلمات الطفل الأولى</h2>
                </div>
                <div className={horizontalListClass}>
                  {childWords.map((v, i) => (
                    <div key={i} onClick={() => setActiveVideo(v, childWords)} className="w-80 group relative overflow-hidden bg-zinc-900/80 border border-white/10 rounded-[2rem] focusable cursor-pointer shrink-0" tabIndex={0} data-nav-id={`child-word-${i}`}>
                      <img src={v.thumbnail} className="aspect-video object-cover w-full" alt="" />
                      <div className="p-5 text-right font-bold text-sm truncate text-white">{v.title}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {matchHighlights.length > 0 && (
              <section data-row-id="row-match-highlights" className="py-4">
                <div className="px-10 mb-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500 flex items-center justify-center"><Trophy className="w-5 h-5 text-black" /></div>
                  <h2 className="text-xl font-black text-white uppercase tracking-widest">ملخصات مباريات الأمس</h2>
                </div>
                <div className={horizontalListClass}>
                  {matchHighlights.map((v, i) => (
                    <div key={i} onClick={() => setActiveVideo(v, matchHighlights)} className="w-80 group relative overflow-hidden bg-zinc-900/80 border border-white/10 rounded-[2rem] focusable cursor-pointer shrink-0" tabIndex={0} data-nav-id={`match-highlight-${i}`}>
                      <img src={v.thumbnail} className="aspect-video object-cover w-full" alt="" />
                      <div className="p-5 text-right font-bold text-sm truncate text-white">{v.title}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="space-y-10 min-h-screen">
            <div data-row-id="row-back-bar" className="flex justify-between items-center sticky top-0 z-[120] bg-black/70 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/10">
              <button onClick={resetView} className="h-14 px-10 rounded-full bg-red-600 text-white font-black focusable flex items-center gap-4" tabIndex={0} data-nav-id="grid-back-btn">
                <X className="w-6 h-6" /><span>العودة للمكتبة</span>
              </button>
              <h2 className="text-4xl font-black text-white truncate max-w-[50%]">
                {selectedChannel ? selectedChannel.name : selectedJuz ? `الجزء ${selectedJuz}` : `نتائج البحث: ${search}`}
              </h2>
            </div>

            <section data-row-id="row-grid" className="relative mt-10">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-6">
                  <Loader2 className="w-16 h-16 animate-spin text-primary" />
                  <p className="text-white/40 font-black uppercase tracking-[0.5em] animate-pulse">Deep Scan Active...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-40">
                  {searchResults.concat(channelVideos).map((v, i) => (
                    <Card key={v.id + i} className="group bg-zinc-900/40 border-none rounded-[2.8rem] cursor-pointer focusable overflow-hidden relative aspect-[16/10]" tabIndex={0} onClick={() => setActiveVideo(v)} data-nav-id={`grid-item-${i}`}>
                      <img src={v.thumbnail} className="w-full h-full object-cover opacity-70 group-hover:opacity-100" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 p-6 flex flex-col justify-end text-right">
                        <h3 className="text-base font-black text-white line-clamp-2">{v.title}</h3>
                        <div className="mt-2 flex items-center gap-2 opacity-60">
                          <Clock className="w-3 h-3" />
                          <span className="text-[10px] font-black">{v.duration || "FEED"}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
