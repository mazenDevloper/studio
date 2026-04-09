
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Search, Play, Loader2, User, X, Plus, Youtube, RadioIcon, Pin, List, UserPlus, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { searchYouTubeVideos, YouTubeVideo, searchYouTubeChannels } from "@/lib/youtube";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { JSONBIN_MASTER_KEY } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { ShortcutBadge } from "@/components/layout/car-dock";

/**
 * QuranView v23.0 - Sequential Focus Flow & Add Reciter at Top
 */
export function QuranView() {
  const { setActiveVideo, favoriteReciters, addReciter, dockSide, isSidebarShrinked, setIsSidebarShrinked } = useMediaStore();
  const { toast } = useToast();
  const [surahs, setSurahs] = useState<any[]>([]);
  const [ytResults, setYtResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [popularReciters, setPopularReciters] = useState<any[]>([]);
  const [suggestionContext, setSuggestionContext] = useState<'reciter' | 'surah' | 'none'>('none');
  const [windowWidth, setWindowWidth] = useState(0);

  // Reciter Add States
  const [isReciterAddOpen, setIsReciterAddOpen] = useState(false);
  const [reciterSearchQuery, setReciterSearchQuery] = useState("");
  const [reciterResults, setReciterResults] = useState<any[]>([]);
  const [isSearchingReciters, setIsSearchingReciters] = useState(false);

  const isDockLeft = dockSide === 'left';

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);

    const fetchDiscoveryData = async () => {
      try {
        const surahRes = await fetch("https://api.quran.com/api/v4/chapters?language=ar");
        const recRes = await fetch(`https://api.jsonbin.io/v3/b/6909c1cd43b1c97be997b522/latest`, {
          headers: { 'X-Master-Key': JSONBIN_MASTER_KEY }
        });
        if (surahRes.ok) {
          const data = await surahRes.json();
          setSurahs(data.chapters || []);
        }
        if (recRes.ok) {
          const data = await recRes.json();
          setPopularReciters(data.record || []);
        }
      } catch (e) { console.error(e); }
    };
    fetchDiscoveryData();
    setIsSidebarShrinked(false);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsSidebarShrinked]);

  const handleYTSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const results = await searchYouTubeVideos(query + " قرآن كريم", 24);
      setYtResults(results);
      setIsSidebarShrinked(true);
      // Auto-focus first video
      setTimeout(() => {
        (document.querySelector('[data-nav-id^="video-quran-"]') as HTMLElement)?.focus();
      }, 300);
    } finally { setLoading(false); }
  }, [setIsSidebarShrinked]);

  const handleAutocomplete = (val: string, type: 'reciter' | 'surah') => {
    setSearch(prev => {
      const parts = prev.trim().split(/\s+/);
      if (type === 'surah') {
        if (parts.length > 0 && (parts[parts.length-1].startsWith("سورة") || surahs.some(s => s.name_arabic.includes(parts[parts.length-1])))) {
          parts.pop();
        }
        parts.push("سورة " + val);
        setSuggestionContext('reciter');
        
        // SEQ FLOW: After Surah selection, focus SEARCH BUTTON
        setTimeout(() => {
          const searchBtn = document.querySelector('[data-nav-id="search-btn"]') as HTMLElement;
          searchBtn?.focus();
          searchBtn?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      } else {
        if (parts.length > 0 && allReciters.some(r => r.name.includes(parts[parts.length-1]))) {
          parts.pop();
        }
        parts.push(val);
        setSuggestionContext('surah');

        // SEQ FLOW: After Reciter selection, focus FIRST SURAH
        setTimeout(() => {
          const firstSurah = document.querySelector('[data-nav-id^="q-surah-"]') as HTMLElement;
          firstSurah?.focus();
          firstSurah?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
      return parts.join(" ") + " ";
    });
  };

  const handleReciterSearch = useCallback(async () => {
    if (!reciterSearchQuery.trim()) return;
    setIsSearchingReciters(true);
    try {
      const results = await searchYouTubeChannels(reciterSearchQuery);
      setReciterResults(results || []);
    } finally { setIsSearchingReciters(false); }
  }, [reciterSearchQuery]);

  const allReciters = useMemo(() => {
    const combined = [...popularReciters];
    favoriteReciters.forEach(r => {
      if (!combined.find(c => c.channelid === r.channelid)) combined.push(r);
    });
    return combined;
  }, [popularReciters, favoriteReciters]);

  const filteredReciters = useMemo(() => {
    const lastWord = search.trim().split(/\s+/).pop() || "";
    if (search.endsWith(' ') && suggestionContext === 'reciter') return allReciters;
    if (!lastWord || lastWord === "سورة") return allReciters;
    return allReciters.filter(r => r.name.toLowerCase().includes(lastWord.toLowerCase()));
  }, [allReciters, search, suggestionContext]);

  const filteredSurahs = useMemo(() => {
    const lastWord = search.trim().split(/\s+/).pop() || "";
    if (search.endsWith(' ') && suggestionContext === 'surah') return surahs;
    let cleanLast = lastWord;
    if (cleanLast.startsWith("سورة")) cleanLast = cleanLast.replace("سورة", "").trim();
    if (!cleanLast) return surahs;
    return surahs.filter(s => s.name_arabic.includes(cleanLast));
  }, [surahs, search, suggestionContext]);

  const horizontalListClass = "w-full flex gap-4 px-8 pb-4 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center";

  return (
    <div className={cn(
      "h-screen flex bg-transparent transition-all duration-700 overflow-hidden relative", 
      isDockLeft ? "flex-row" : "flex-row-reverse"
    )}>
      <aside 
        className={cn(
          "h-full z-[110] transition-all duration-500 ease-in-out premium-glass flex flex-col shrink-0 shadow-2xl relative",
          isSidebarShrinked ? "w-[8%]" : "w-[30%]",
          isDockLeft ? "border-r border-white/5" : "border-l border-white/5",
        )}
      >
        <div className={cn("p-6 flex flex-col gap-6 border-b border-white/10 bg-white/5", isSidebarShrinked && "items-center px-2")}>
          <div className="flex items-center justify-between w-full">
            {!isSidebarShrinked && <h2 className="text-2xl font-black text-white">المصحف</h2>}
            <Dialog open={isReciterAddOpen} onOpenChange={setIsReciterAddOpen}>
              <DialogTrigger asChild>
                <button 
                  className={cn(
                    "w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center transition-all focusable",
                    isSidebarShrinked && "w-12 h-12"
                  )}
                  data-nav-id="reciter-add-trigger"
                >
                  <Plus className="w-6 h-6 text-primary" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl bg-zinc-950 border-white/10 rounded-[2.5rem] p-0 shadow-2xl z-[5000]">
                <div className="p-8 border-b border-white/10">
                  <h2 className="text-xl font-black text-white">إضافة قارئ جديد</h2>
                  <div className="flex gap-4 mt-6">
                    <Input 
                      placeholder="اسم القارئ..." 
                      value={reciterSearchQuery} 
                      onChange={(e) => setReciterSearchQuery(e.target.value)} 
                      className="h-12 bg-white/5 rounded-xl px-6 text-right flex-1" 
                    />
                    <button onClick={handleReciterSearch} className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center focusable">
                      {isSearchingReciters ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    </button>
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
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="py-4 flex flex-col gap-1">
            {/* FIRST AT THE LIST: ADD TRIGGER (Repeated for easy access in sidebar) */}
            <div 
              onClick={() => setIsReciterAddOpen(true)} 
              className={cn("flex items-center p-3 rounded-xl w-[90%] mx-auto gap-3 transition-all cursor-pointer focusable overflow-hidden relative border border-dashed border-white/10 mb-2", isSidebarShrinked && "justify-center p-2")} 
              tabIndex={0} 
              data-nav-id="subs-add-item"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/10"><Plus className="w-5 h-5 text-primary" /></div>
              {!isSidebarShrinked && <h4 className="font-black text-sm truncate flex-1 text-right text-primary">إضافة قارئ</h4>}
            </div>

            <div onClick={() => { setYtResults([]); setSearch(""); setIsSidebarShrinked(false); }} className={cn("flex items-center p-3 rounded-xl w-[90%] mx-auto gap-3 transition-all cursor-pointer focusable overflow-hidden relative", !ytResults.length ? "bg-primary text-white shadow-glow active-nav-target" : "hover:bg-white/5 text-white/60", isSidebarShrinked && "justify-center p-2")} tabIndex={0} data-nav-id="reciter-all">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/10"><List className="w-5 h-5" /></div>
              {!isSidebarShrinked && <h4 className="font-black text-sm truncate flex-1 text-right">الكل</h4>}
            </div>
            {allReciters.map((r, idx) => (
              <div key={idx} onClick={() => handleAutocomplete(r.name, 'reciter')} className={cn("flex items-center p-3 rounded-xl w-[90%] mx-auto gap-3 transition-all cursor-pointer focusable overflow-hidden relative", search.includes(r.name) ? "bg-primary text-white shadow-glow active-nav-target" : "hover:bg-white/5 text-white/60", isSidebarShrinked && "justify-center p-2")} tabIndex={0} data-nav-id={`reciter-${idx}`}>
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 overflow-hidden">{r.image ? <img src={r.image} className="w-full h-full object-cover" alt="" /> : <User className="w-5 h-5 text-white" />}</div>
                {!isSidebarShrinked && <h4 className="font-black text-sm truncate flex-1 text-right">{r.name}</h4>}
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      <main className={cn(
        "flex-1 overflow-y-auto no-scrollbar pt-10 pb-40 relative space-y-12",
        isDockLeft ? "pr-12 pl-4" : "pl-12 pr-4"
      )} style={{ direction: 'rtl' }}>
        {!ytResults.length ? (
          <section className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col gap-1"><h1 className="text-4xl font-black text-white flex items-center gap-4 tracking-tighter">المصحف الذكي</h1><p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.4em]">Active Recognition Hub</p></div>
              <button onClick={() => handleYTSearch("إذاعة القرآن الكريم")} className="rounded-full bg-blue-600/80 text-white font-black h-12 px-8 shadow-2xl focusable flex items-center"><RadioIcon className="w-5 h-5 ml-2 animate-pulse" /> إذاعة القرآن</button>
            </div>
            <div className="relative w-full group" data-row-id="media-row-search">
              <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-7 h-7 text-white/20" />
              <Input ref={inputRef} placeholder="ابحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-20 bg-white/5 border-white/10 rounded-[2.5rem] pr-16 pl-16 text-2xl font-bold text-right shadow-2xl border-none pointer-events-none" tabIndex={-1} />
              <button 
                onClick={() => handleYTSearch(search)} 
                className="absolute left-4 top-1/2 -translate-y-1/2 h-14 px-8 rounded-full bg-red-600 text-white font-black shadow-glow focusable"
                data-nav-id="search-btn"
              >
                <ShortcutBadge action="focus_search" className="-bottom-3 -left-3" />
                بحث
              </button>
            </div>
            <div className="space-y-6">
              <div className={horizontalListClass} data-row-id="quran-row-reciters">
                {filteredReciters.map((r, i) => (
                  <button key={i} onClick={() => handleAutocomplete(r.name, 'reciter')} data-nav-id={`q-reciter-${i}`} className="flex flex-col items-center gap-2 px-4 py-4 rounded-[2.5rem] bg-white/5 border border-white/10 text-white hover:bg-emerald-600/20 transition-all focusable shrink-0 min-w-[140px] relative">
                    {i === 0 && <ShortcutBadge action="focus_reciters" className="-bottom-3 -left-3" />}
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-500/30 shadow-2xl">{r.image ? <img src={r.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center bg-emerald-500/10"><User className="w-10 h-10 text-emerald-400" /></div>}</div>
                    <span className="text-sm font-black truncate max-w-[120px]">{r.name}</span>
                  </button>
                ))}
              </div>
              <div className={horizontalListClass} data-row-id="quran-row-surahs">
                {filteredSurahs.map((s, i) => (
                  <button key={i} onClick={() => handleAutocomplete(s.name_arabic, 'surah')} data-nav-id={`q-surah-${i}`} className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-blue-600/20 transition-all focusable shrink-0 relative">
                    {i === 0 && <ShortcutBadge action="focus_surahs" className="-bottom-3 -left-3" />}
                    {s.name_arabic}
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-8 animate-in slide-in-from-top-10 duration-700 p-8">
            <div className="flex justify-between items-center sticky top-0 z-[120] bg-black/60 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl">
              <h2 className="text-3xl font-black text-white flex items-center gap-4"><Youtube className="w-10 h-10 text-red-600" /> نتائج البحث: {search}</h2>
              <button onClick={() => { setYtResults([]); setSearch(""); setIsSidebarShrinked(false); }} className="h-16 px-10 rounded-full bg-red-600 text-white font-black text-xl shadow-glow focusable flex items-center gap-4 relative" data-nav-id="quran-back-btn">
                <ShortcutBadge action="nav_back" className="-bottom-3 -left-3" />
                <ChevronRight className="w-6 h-6" /><span>إغلاق النتائج</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-40">
              {ytResults.map((v, i) => (<div key={i} onClick={() => setActiveVideo(v, ytResults)} data-nav-id={`video-quran-${i}`} className="group relative overflow-hidden bg-zinc-900/80 border-transparent border-4 rounded-[2.5rem] transition-all cursor-pointer shadow-2xl focusable" tabIndex={0}><div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} alt="" className="w-full h-full object-cover" />{v.isLive && <div className="absolute top-4 left-4 px-4 py-1.5 rounded-full text-[10px] font-black text-white bg-red-600 animate-pulse">LIVE</div>}</div><div className="p-5 text-right"><h3 className="font-bold text-sm line-clamp-2 text-white leading-relaxed">{v.title}</h3></div></div>))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
