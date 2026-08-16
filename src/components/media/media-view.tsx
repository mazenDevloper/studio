
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Plus, Loader2, X, List, Youtube, Star, Mic, Layers, Sparkles, Trophy, Clock, Calendar
} from "lucide-react";
import { useMediaStore, YouTubeChannel, YouTubeVideo } from "@/lib/store";
import { fetchChannelVideos, searchYouTubeVideos } from "@/lib/youtube";
import { cn } from "@/lib/utils";

const JUZ_COLORS = [
  "shadow-[0_0_5px_rgba(255,0,0,0.1)] border-red-500/10", "shadow-[0_0_5px_rgba(255,127,0,0.1)] border-orange-500/10",
  "shadow-[0_0_5px_rgba(255,255,0,0.1)] border-yellow-500/10", "shadow-[0_0_5px_rgba(0,255,0,0.1)] border-green-500/10",
  "shadow-[0_0_5px_rgba(0,0,255,0.1)] border-blue-500/10", "shadow-[0_0_5px_rgba(75,0,130,0.1)] border-indigo-500/10",
  "shadow-[0_0_5px_rgba(148,0,211,0.1)] border-violet-500/10", "shadow-[0_0_5px_rgba(255,20,147,0.1)] border-pink-500/10",
  "shadow-[0_0_5px_rgba(0,255,255,0.1)] border-cyan-500/10", "shadow-[0_0_5px_rgba(173,255,47,0.1)] border-lime-500/10",
  "shadow-[0_0_5px_rgba(255,69,0,0.1)] border-orangered-500/10", "shadow-[0_0_5px_rgba(30,144,255,0.1)] border-dodgerblue-500/10",
  "shadow-[0_0_5px_rgba(218,112,214,0.1)] border-orchid-500/10", "shadow-[0_0_5px_rgba(50,205,50,0.1)] border-limegreen-500/10",
  "shadow-[0_0_5px_rgba(255,215,0,0.1)] border-gold-500/10", "shadow-[0_0_5px_rgba(255,105,180,0.1)] border-hotpink-500/10",
  "shadow-[0_0_5px_rgba(138,43,226,0.1)] border-blueviolet-500/10", "shadow-[0_0_5px_rgba(0,250,154,0.1)] border-mediumspringgreen-500/10",
  "shadow-[0_0_5px_rgba(255,140,0,0.1)] border-darkorange-500/10", "shadow-[0_0_5px_rgba(32,178,170,0.1)] border-lightseagreen-500/10",
  "shadow-[0_0_5px_rgba(240,128,128,0.1)] border-lightcoral-500/10", "shadow-[0_0_5px_rgba(124,252,0,0.1)] border-lawngreen-500/10",
  "shadow-[0_0_5px_rgba(0,191,255,0.1)] border-deepskyblue-500/10", "shadow-[0_0_5px_rgba(255,0,255,0.1)] border-magenta-500/10",
  "shadow-[0_0_5px_rgba(250,128,114,0.1)] border-salmon-500/10", "shadow-[0_0_5px_rgba(0,255,127,0.1)] border-springgreen-500/10",
  "shadow-[0_0_5px_rgba(238,232,170,0.1)] border-palegoldenrod-500/10", "shadow-[0_0_5px_rgba(176,196,222,0.1)] border-lightsteelblue-500/10",
  "shadow-[0_0_5px_rgba(221,160,221,0.1)] border-plum-500/10", "shadow-[0_0_5px_rgba(127,255,212,0.1)] border-aquamarine-500/10"
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
    favoriteReciters, incrementReciterClick
  } = useMediaStore();

  const [search, setSearch] = useState("");
  const [isSearchLocked, setIsSearchLocked] = useState(true);
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [surahs, setSurahs] = useState<any[]>([]);
  const [allSurahs, setAllSurahs] = useState<any[]>([]);
  const [starredLists, setStarredLists] = useState<Record<string, any>>({});
  const [isIsolatedViewActive, setIsIsolatedViewActive] = useState(false);
  const [selectedReciter, setSelectedReciter] = useState<string | null>(null);
  const [selectedSurah, setSelectedSurah] = useState<string | null>(null);
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);

  const isDockLeft = dockSide === 'left';
  const searchInputRef = useRef<HTMLInputElement>(null);

  const occasionSuggestions = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 5 is Friday
    const suggestions: { label: string, query: string }[] = [];

    // --- 1. Fixed Bluish Purple Suggestions ---
    suggestions.push({ label: "ملخص مباريات اليوم ⚽", query: "ملخص مباريات اليوم" });
    suggestions.push({ label: "ياسر الدوسري - سورة البقرة", query: "ياسر الدوسري سورة البقرة" });
    suggestions.push({ label: "أحمد النفيس - سورة النجم", query: "احمد النفيس سورة النجم" });
    suggestions.push({ label: "عبدالعزيز العسيري - سورة الكهف", query: "عبدالعزيز العسيري سورة الكهف" });

    // --- 2. Precise Hijri Logic ---
    try {
      const hFormatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {day: 'numeric', month: 'numeric'});
      const parts = hFormatter.formatToParts(today);
      const hDay = parseInt(parts.find(p => p.type === 'day')?.value || "0", 10);
      const hMonth = parseInt(parts.find(p => p.type === 'month')?.value || "0", 10);

      // White Days (13, 14, 15 Hijri)
      if ([13, 14, 15].includes(hDay)) {
        suggestions.push({ label: "فضل صيام الأيام البيض", query: "فضل صيام الأيام البيض وأحكامها" });
      }

      // Ashura (1-10 Muharram)
      if (hMonth === 1 && hDay <= 10) suggestions.push({ label: "عاشوراء - فضل وصيام", query: "فضل صيام يوم عاشوراء" });
      
      // Mawlid (1-12 Rabi al-Awwal)
      if (hMonth === 3 && hDay <= 12) suggestions.push({ label: "المولد النبوي - سيرة عطرة", query: "سيرة النبي محمد صلى الله عليه وسلم" });
      
      // Ramadan (Month 9)
      if (hMonth === 9) suggestions.push({ label: "بث مباشر صلاة التراويح", query: "بث مباشر صلاة التراويح الحرم المكي" });
      
      // Eid al-Fitr (1 Shawwal)
      if (hMonth === 10 && hDay === 1) suggestions.push({ label: "تكبيرات العيد مباشر", query: "تكبيرات العيد مكررة الحرم المكي" });
      
      // Dhu al-Hijjah Season
      if (hMonth === 12) {
        if (hDay <= 10) suggestions.push({ label: "تكبيرات العشر من ذي الحجة", query: "تكبيرات العشر من ذي الحجة الحرم المكي" });
        if (hDay >= 10 && hDay <= 13) suggestions.push({ label: "تكبيرات عيد الأضحى", query: "تكبيرات عيد الأضحى المبارك" });
      }
    } catch(e) {}

    // Friday Logic
    if (dayOfWeek === 5) {
      suggestions.push({ label: "سورة الكهف - ياسر الدوسري", query: "سورة الكهف ياسر الدوسري" });
      suggestions.push({ label: "بث مباشر خطبة الجمعة", query: "بث مباشر خطبة الجمعة الحرم المكي" });
    }

    // Default Fallbacks
    if (suggestions.length < 6) {
      suggestions.push({ label: "تلاوات نادرة - المنشاوي", query: "تلاوات نادرة محمد صديق المنشاوي" });
      suggestions.push({ label: "رقية شرعية شاملة", query: "رقية شرعية قوية وشاملة" });
    }

    return suggestions;
  }, []);

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
  }, [favoriteChannels]);

  useEffect(() => {
    fetchExtraLists();
    fetch("https://api.quran.com/api/v4/chapters?language=ar").then(r => r.json()).then(d => {
      setSurahs(d.chapters || []); setAllSurahs(d.chapters || []);
    });
    const q = searchParams.get('q'); if (q) { setSearch(q); performSearch(q); }
  }, [searchParams, fetchExtraLists]);

  useEffect(() => {
    if (selectedChannel) {
      setLoading(true);
      fetchChannelVideos(selectedChannel.channelid, 50).then(vids => {
        setChannelVideos(vids);
        setLoading(false);
        setIsSidebarShrinked(true);
        setTimeout(() => { (document.querySelector('[data-nav-id="grid-item-0"]') as HTMLElement)?.focus(); }, 150);
      });
    }
  }, [selectedChannel, setChannelVideos, setIsSidebarShrinked]);

  useEffect(() => {
    if (!loading && !isIsolatedViewActive) {
      setTimeout(() => {
        const firstReciter = document.querySelector('[data-nav-id="reciter-item-0"]') as HTMLElement;
        firstReciter?.focus();
      }, 1000);
    }
  }, [loading, isIsolatedViewActive]);

  const performSearch = async (query?: string) => {
    const q = query || search; if (!q.trim()) return;
    setLoading(true); setIsIsolatedViewActive(true); setIsSidebarShrinked(true); setSelectedChannel(null);
    try { 
      const res = await searchYouTubeVideos(q, 40); 
      setSearchResults(res || []); 
      setTimeout(() => { (document.querySelector('[data-nav-id="grid-item-0"]') as HTMLElement)?.focus(); }, 150);
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
    setIsSidebarShrinked(false); setSelectedReciter(null); 
    setSelectedSurah(null); setSelectedJuz(null); setSurahs(allSurahs); 
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isSearchLocked) {
      if (e.key === 'Enter' || e.key === '5') { e.preventDefault(); setIsSearchLocked(false); searchInputRef.current?.focus(); }
      return;
    }
    if (e.key === 'Enter') { performSearch(); setIsSearchLocked(true); }
  };

  const horizontalListClass = "w-full flex gap-4 px-8 py-0 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center";

  return (
    <div className={cn("h-screen flex bg-transparent overflow-hidden relative", isDockLeft ? "flex-row-reverse" : "flex-row")}>
      <aside data-nav-zone="sidebar" className={cn("h-full z-[110] premium-glass flex flex-col shrink-0 border-white/5 bg-black/40 transition-all duration-300", isSidebarShrinked ? "w-[80px]" : "w-[28%]", isDockLeft ? "border-l" : "border-r")}>
        <div className="p-4 flex items-center justify-between border-b border-white/5"><button className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center focusable border border-primary/20" tabIndex={0} data-nav-id="sidebar-add-btn"><Plus className="w-5 h-5" /></button></div>
        <div className="flex-1 overflow-y-auto py-2 no-scrollbar">
          <div onClick={resetView} className={cn("flex items-center justify-center gap-3 p-3 cursor-pointer focusable w-[90%] mx-auto rounded-xl", !selectedChannel && !isIsolatedViewActive ? "bg-primary text-white" : "hover:bg-white/5")} tabIndex={0} data-nav-id="sidebar-all-btn"><List className="w-5 h-5" />{!isSidebarShrinked && <span className="font-black text-sm">الكل</span>}</div>
          {favoriteChannels.map((ch, idx) => (<div key={idx} onClick={() => { setSelectedChannel(ch); }} className={cn("flex items-center justify-center p-3 rounded-xl w-[90%] mx-auto gap-3 cursor-pointer focusable", selectedChannel?.channelid === ch.channelid ? "bg-primary text-white" : "hover:bg-white/5 text-white/60")} tabIndex={0} data-nav-id={`sidebar-channel-${idx}`}><div className="w-8 d8 rounded-xl overflow-hidden relative shrink-0"><img src={ch.image} className="w-full h-full object-cover" alt="" /></div>{!isSidebarShrinked && <span className="font-black text-sm flex-1 truncate text-right">{ch.name}</span>}</div>))}
        </div>
      </aside>

      <main data-nav-zone="content" className="flex-1 overflow-y-auto relative pt-0 pb-40 px-10 no-scrollbar" style={{ direction: 'rtl' }}>
        {!isIsolatedViewActive && !selectedChannel ? (
          <>
            <section data-row-id="row-search" className="py-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Input ref={searchInputRef} placeholder={isSearchLocked ? "اضغط OK أو Enter للكتابة..." : "ابحث عن أي شيء..."} value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={handleSearchKeyDown} readOnly={isSearchLocked} className={cn("h-16 border-none rounded-[2rem] pr-10 text-xl font-bold focusable", isSearchLocked ? "bg-white/5 text-white/30" : "bg-white/10 text-white")} data-nav-id="content-search-input" />
                  {isSearchLocked && <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none"><div className="px-3 py-1 bg-white/10 rounded-lg border border-white/10 text-[10px] font-black text-white/40 uppercase">اضغط 5 للتفعيل</div></div>}
                </div>
                <button onClick={() => performSearch()} className="h-16 px-10 rounded-[2rem] bg-red-600 text-white font-black text-lg focusable flex items-center" data-nav-id="content-search-btn"><Youtube className="w-6 h-6 ml-3" /> استكشاف</button>
              </div>
            </section>

            {occasionSuggestions.length > 0 && (
              <section data-row-id="row-occasions" className="py-4">
                <div className={horizontalListClass}>
                  <div className="flex items-center gap-3 px-6 py-3 bg-indigo-600/20 rounded-full border border-indigo-400/40 shrink-0">
                    <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                    <span className="text-[12px] font-black text-white/60">اقتراحات اليوم</span>
                  </div>
                  {occasionSuggestions.map((occ, i) => (
                    <button 
                      key={i} 
                      onClick={() => { setSearch(occ.query); performSearch(occ.query); }} 
                      className="px-10 py-6 rounded-full font-black text-lg focusable border-2 bg-indigo-600 text-white border-indigo-400/50 hover:border-white shadow-glow shrink-0 transition-all"
                      data-nav-id={`occ-item-${i}`}
                    >
                      {occ.label}
                    </button>
                  ))}
                </div>
              </section>
            )}
            
            <section data-row-id="row-reciters" className="py-2"><div className={cn(horizontalListClass, "gap-8")}>{favoriteReciters.map((r, i) => (<button key={i} onClick={() => handleReciterClick(r)} className={cn("flex flex-col items-center gap-4 px-4 py-4 rounded-[2.5rem] focusable border-2 shrink-0 group", selectedReciter === r.name ? "border-emerald-500 bg-emerald-500/10" : "border-transparent hover:bg-emerald-600/10")} tabIndex={0} data-nav-id={`reciter-item-${i}`}><div className="w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-500/30 shadow-2xl"><img src={r.image} className="w-full h-full object-cover" alt="" /></div><span className="text-xs font-black text-white">{r.name}</span></button>))}</div></section>
            <section data-row-id="row-juz" className="py-2"><div className={horizontalListClass}><div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-full border border-white/10 shrink-0"><Layers className="w-6 h-6 text-accent" /><span className="text-[12px] font-black text-white/40 uppercase">الأجزاء</span></div>{[...Array(30).keys()].map(i => (<button key={i} onClick={() => handleJuzClick(i+1)} className={cn("px-12 py-6 rounded-full text-white font-black text-xl focusable border-2 shrink-0", selectedJuz === i+1 ? "bg-white text-black border-white shadow-glow" : JUZ_COLORS[i])} tabIndex={0} data-nav-id={`juz-item-${i}`}>الجزء {i+1}</button>))}</div></section>
            <section data-row-id="row-surahs" className="py-2"><div className={horizontalListClass}>{selectedJuz && (<button onClick={() => performSearch(`${search} الجزء ${selectedJuz}`)} className="px-14 py-7 rounded-full border-2 text-white font-black text-xl focusable bg-white/5 border-white/10 hover:bg-blue-600/20 shadow-glow shrink-0" tabIndex={0} data-nav-id="juz-whole-btn">الجزء {selectedJuz}</button>)}{surahs.map((s, i) => (<button key={i} onClick={() => handleSurahClick(s.name_arabic)} className={cn("px-14 py-7 rounded-full border-2 text-white font-black text-xl focusable shrink-0", selectedSurah === s.name_arabic ? "bg-blue-600 border-blue-400 shadow-glow" : "bg-white/5 border-white/10")} tabIndex={0} data-nav-id={`surah-${i}`}>سورة {s.name_arabic}</button>))}</div></section>
            {[0, 1, 2].map(idx => starredLists[idx]?.length > 0 && (<section key={idx} data-row-id={`row-vids-${idx}`} className="py-4"><div className="px-10 mb-4 flex items-center gap-4"><div className="w-8 h-8 rounded-lg bg-yellow-500 flex items-center justify-center"><Star className="w-5 h-5 text-black fill-current" /></div><h2 className="text-xl font-black text-white uppercase tracking-widest">ترددات {starredLists[`name-${idx}`]}</h2></div><div className={horizontalListClass}>{starredLists[idx].map((v, i) => (<div key={i} onClick={() => setActiveVideo(v, starredLists[idx])} className="w-80 group relative overflow-hidden bg-zinc-900/80 border border-white/10 rounded-[2rem] focusable cursor-pointer shrink-0" tabIndex={0} data-nav-id={`row-vids-${idx}-${i}`}><img src={v.thumbnail} className="aspect-video object-cover w-full" alt="" /><div className="p-5 text-right font-bold text-sm truncate text-white">{v.title}</div></div>))}</div></section>))}
          </>
        ) : (
          <div className="space-y-10 min-h-screen">
            <div data-row-id="row-back-bar" className="flex justify-between items-center sticky top-0 z-[120] bg-black/70 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/10"><button onClick={resetView} className="h-14 px-10 rounded-full bg-red-600 text-white font-black focusable flex items-center gap-4" tabIndex={0} data-nav-id="grid-back-btn"><X className="w-6 h-6" /><span>العودة للمكتبة</span></button><h2 className="text-4xl font-black text-white truncate max-w-[50%]">{selectedChannel ? selectedChannel.name : selectedJuz ? `الجزء ${selectedJuz}` : `نتائج البحث: ${search}`}</h2></div>
            <section data-row-id="row-grid" className="relative mt-10">{loading ? (<div className="flex flex-col items-center justify-center py-40 gap-6"><Loader2 className="w-16 h-16 animate-spin text-primary" /><p className="text-white/40 font-black uppercase tracking-[0.5em] animate-pulse">Deep Scan Active...</p></div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-40">{searchResults.concat(channelVideos).map((v, i) => (<Card key={v.id + i} className="group bg-zinc-900/40 border-none rounded-[2.8rem] cursor-pointer focusable overflow-hidden relative aspect-[16/10]" tabIndex={0} onClick={() => setActiveVideo(v, searchResults.concat(channelVideos))} data-nav-id={`grid-item-${i}`}><img src={v.thumbnail} className="w-full h-full object-cover opacity-70 group-hover:opacity-100" alt="" /><div className="absolute inset-0 bg-gradient-to-t from-black/90 p-6 flex flex-col justify-end text-right"><h3 className="text-base font-black text-white line-clamp-2">{v.title}</h3><div className="mt-2 flex items-center gap-2 opacity-60"><Clock className="w-3 h-3" /><span className="text-[10px] font-black">{v.duration || "FEED"}</span></div></div></Card>))}</div>)}</section>
          </div>
        )}
      </main>
    </div>
  );
}
