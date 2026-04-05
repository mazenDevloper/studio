
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

export function QuranView() {
  const { setActiveVideo, favoriteReciters, addReciter, dockSide } = useMediaStore();
  const { toast } = useToast();
  const [surahs, setSurahs] = useState<any[]>([]);
  const [ytResults, setYtResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [isSidebarFocused, setIsSidebarFocused] = useState(false);
  const [popularReciters, setPopularReciters] = useState<any[]>([]);
  const [suggestionContext, setSuggestionContext] = useState<'reciter' | 'surah' | 'none'>('none');
  const [windowWidth, setWindowWidth] = useState(0);

  // Reciter Add States
  const [isReciterAddOpen, setIsReciterAddOpen] = useState(false);
  const [reciterSearchQuery, setReciterSearchQuery] = useState("");
  const [reciterResults, setReciterResults] = useState<any[]>([]);
  const [isSearchingReciters, setIsSearchingReciters] = useState(false);
  const [pendingReciter, setPendingReciter] = useState<any | null>(null);
  const [manualReciterName, setManualReciterName] = useState("");

  const isWideScreen = windowWidth >= 1080;
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

    const timer = setTimeout(() => {
      const target = document.querySelector('[data-nav-id="reciter-0"]') as HTMLElement;
      if (target) target.focus();
    }, 800);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  // AUTO-FOCUS results
  useEffect(() => {
    if (ytResults.length > 0) {
      setTimeout(() => {
        const firstResult = document.querySelector('[data-nav-id="quran-result-0"]') as HTMLElement;
        if (firstResult) {
          firstResult.focus();
          firstResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 400);
    }
  }, [ytResults]);

  const handleYTSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const results = await searchYouTubeVideos(query + " قرآن كريم", 24);
      setYtResults(results);
    } finally { setLoading(false); }
  }, []);

  const handleAutocomplete = (val: string, type: 'reciter' | 'surah') => {
    setSearch(prev => {
      const parts = prev.trim().split(/\s+/);
      if (type === 'surah') {
        if (parts.length > 0 && (parts[parts.length-1].startsWith("سورة") || surahs.some(s => s.name_arabic.includes(parts[parts.length-1])))) {
          parts.pop();
        }
        parts.push("سورة " + val);
        setSuggestionContext('reciter');
      } else {
        if (parts.length > 0 && allReciters.some(r => r.name.includes(parts[parts.length-1]))) {
          parts.pop();
        }
        parts.push(val);
        setSuggestionContext('surah');
      }
      return parts.join(" ") + " ";
    });
    inputRef.current?.focus();
  };

  const handleReciterSearch = useCallback(async () => {
    if (!reciterSearchQuery.trim()) return;
    setIsSearchingReciters(true);
    try {
      const results = await searchYouTubeChannels(reciterSearchQuery);
      setReciterResults(results || []);
    } finally { setIsSearchingReciters(false); }
  }, [reciterSearchQuery]);

  const handleAddReciterFinal = () => {
    if (!pendingReciter || !manualReciterName.trim()) return;
    addReciter({ ...pendingReciter, name: manualReciterName });
    setIsReciterAddOpen(false);
    setPendingReciter(null);
    setManualReciterName("");
    toast({ title: "تمت الإضافة", description: `تمت إضافة القارئ ${manualReciterName} بنجاح.` });
  };

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
    if (!lastWord) return allReciters;
    if (lastWord === "سورة") return allReciters;
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

  const isExpanded = !isSidebarCollapsed || isSidebarPinned || isSidebarFocused;
  const sidebarWidthClass = isWideScreen ? (isExpanded ? "w-[27%]" : "w-20") : "w-0 hidden";
  const horizontalListClass = "w-full flex gap-4 px-8 pb-4 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center";

  // ISOLATION
  const showResults = ytResults.length > 0;

  return (
    <div className={cn(
      "h-screen flex bg-transparent transition-all duration-700 overflow-hidden",
      isDockLeft ? "flex-row" : "flex-row-reverse"
    )}>
      
      <aside 
        className={cn(
          "h-full z-[110] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] premium-glass flex flex-col shrink-0 group/sidebar",
          sidebarWidthClass,
          isDockLeft ? "border-r border-white/5" : "border-l border-white/5"
        )}
        onMouseEnter={() => setIsSidebarCollapsed(false)}
        onMouseLeave={() => setIsSidebarCollapsed(true)}
        onFocus={() => setIsSidebarFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsSidebarFocused(false);
          }
        }}
      >
        <div className="p-6 flex flex-col gap-6 border-b border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            {isExpanded && <h2 className="text-2xl font-black text-white">المصحف</h2>}
            <Button variant="ghost" size="icon" onClick={() => setIsReciterAddOpen(true)} className="w-10 h-10 rounded-full bg-white/5 text-primary focusable"><Plus className="w-5 h-5" /></Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="py-4 flex flex-col gap-1">
            <div 
              onClick={() => { setYtResults([]); setSearch(""); }}
              className={cn("flex items-center p-3 rounded-xl w-[90%] mx-auto gap-3 transition-all cursor-pointer focusable overflow-hidden group/item relative", !showResults ? "bg-primary text-white shadow-glow active-nav-target" : "hover:bg-white/5 text-white/60")}
              tabIndex={0}
              data-nav-id="reciter-all"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/10"><List className="w-5 h-5" /></div>
              {isExpanded && <h4 className="font-black text-sm truncate flex-1 text-right">الكل</h4>}
            </div>
            {allReciters.map((r, idx) => (
              <div key={r.channelid || idx} onClick={() => handleAutocomplete(r.name, 'reciter')} className={cn("flex items-center p-3 rounded-xl w-[90%] mx-auto gap-3 transition-all cursor-pointer focusable overflow-hidden group/item relative", search.includes(r.name) ? "bg-primary text-white shadow-glow active-nav-target" : "hover:bg-white/5 text-white/60")} tabIndex={0} data-nav-id={`reciter-${idx}`}>
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 overflow-hidden">
                  {r.image ? <img src={r.image} className="w-full h-full object-cover" alt="" /> : <User className="w-5 h-5 text-white" />}
                </div>
                {isExpanded && <h4 className="font-black text-sm truncate flex-1 text-right">{r.name}</h4>}
              </div>
            ))}
          </div>
        </ScrollArea>
      </aside>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-40 relative px-12 space-y-12" style={{ direction: 'rtl' }}>
        
        {!showResults ? (
          <section className="pt-10 space-y-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col gap-1">
                <h1 className="text-4xl font-black text-white flex items-center gap-4 tracking-tighter">المصحف الذكي</h1>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.4em]">Active Recognition Hub</p>
              </div>
              <Button onClick={() => handleYTSearch("إذاعة القرآن الكريم")} className="rounded-full bg-blue-600/80 text-white font-black h-12 px-8 shadow-2xl focusable"><RadioIcon className="w-5 h-5 ml-2 animate-pulse" /> إذاعة القرآن</Button>
            </div>

            <div className="relative w-full group">
              <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-7 h-7 text-white/20" />
              <Input 
                ref={inputRef}
                placeholder="ابحث (رقم 0 للتركيز)..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => (e.key === 'Enter') && handleYTSearch(search)}
                className="h-20 bg-white/5 border-white/10 rounded-[2.5rem] pr-16 pl-16 text-2xl font-bold focusable text-right shadow-2xl focus:bg-white/10"
                data-nav-id="quran-search-input"
              />
              {search && <button onClick={() => { setSearch(""); setYtResults([]); }} className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/40 focusable"><X className="w-5 h-5" /></button>}
            </div>

            <div className="space-y-6">
              <div className={horizontalListClass}>
                <button onClick={() => setIsReciterAddOpen(true)} data-nav-id="q-reciter-0" className="w-24 h-24 rounded-full bg-emerald-600 text-white shadow-glow focusable shrink-0 flex flex-col items-center justify-center gap-1">
                  <UserPlus className="w-8 h-8" />
                  <span className="text-[10px] font-black uppercase">إضافة</span>
                </button>
                {filteredReciters.map((r, i) => (
                  <button key={i} onClick={() => handleAutocomplete(r.name, 'reciter')} data-nav-id={`q-reciter-${i+1}`} className="flex flex-col items-center gap-2 px-4 py-4 rounded-[2.5rem] bg-white/5 border border-white/10 text-white hover:bg-emerald-600/20 transition-all focusable shrink-0 min-w-[120px]">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-500/30 shadow-2xl">
                      {r.image ? <img src={r.image} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center bg-emerald-500/10"><User className="w-10 h-10 text-emerald-400" /></div>}
                    </div>
                    <span className="text-sm font-black truncate max-w-[120px]">{r.name}</span>
                  </button>
                ))}
              </div>
              <div className={horizontalListClass}>
                {filteredSurahs.map((s, i) => (
                  <button key={i} onClick={() => handleAutocomplete(s.name_arabic, 'surah')} data-nav-id={`q-surah-${i}`} className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-blue-600/20 transition-all focusable shrink-0">{s.name_arabic}</button>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-8 animate-in slide-in-from-top-10 duration-700 p-8">
            <div className="flex justify-between items-center sticky top-0 z-[120] bg-black/60 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10">
              <h2 className="text-3xl font-black text-white flex items-center gap-4">
                <Youtube className="w-10 h-10 text-red-600" /> نتائج البحث: {search}
              </h2>
              <Button 
                onClick={() => { setYtResults([]); setSearch(""); }} 
                className="h-16 px-10 rounded-full bg-red-600 text-white font-black text-xl shadow-glow focusable transition-all flex items-center gap-4"
                data-nav-id="quran-back-btn"
              >
                <ChevronRight className="w-6 h-6" />
                <span>إغلاق النتائج</span>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-40">
              {ytResults.map((v, i) => (
                <div key={v.id + i} onClick={() => setActiveVideo(v, ytResults)} data-nav-id={`quran-result-${i}`} className="group relative overflow-hidden bg-zinc-900/80 border-transparent border-4 rounded-[2.5rem] transition-all cursor-pointer shadow-2xl focusable" tabIndex={0}>
                  <div className="aspect-video relative overflow-hidden"><img src={v.thumbnail} alt="" className="w-full h-full object-cover" />{v.isLive && <div className="absolute top-4 left-4 px-4 py-1.5 rounded-full text-[10px] font-black text-white bg-red-600 animate-pulse">LIVE</div>}</div>
                  <div className="p-5 text-right"><h3 className="font-bold text-sm line-clamp-2 text-white leading-relaxed">{v.title}</h3></div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <Dialog open={isReciterAddOpen} onOpenChange={setIsReciterAddOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950 border-white/10 rounded-[2.5rem] p-8 dir-rtl shadow-2xl z-[5000]">
          <DialogHeader className="text-right">
            <DialogTitle className="text-2xl font-black text-white">إضافة قارئ</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {!pendingReciter ? (
              <>
                <div className="flex gap-4">
                  <Input placeholder="ابحث عن قناة القارئ..." value={reciterSearchQuery} onChange={(e) => setReciterSearchQuery(e.target.value)} className="h-14 bg-white/5 rounded-xl px-6 text-right focusable flex-1" />
                  <Button onClick={handleReciterSearch} className="h-14 w-14 bg-primary rounded-xl focusable">{isSearchingReciters ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-6 h-6" />}</Button>
                </div>
                <ScrollArea className="h-64 bg-white/5 rounded-2xl p-4 border border-white/5">
                  <div className="space-y-3">
                    {reciterResults.map(res => (
                      <div key={res.channelid} className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5 hover:border-emerald-500 cursor-pointer" onClick={() => { setPendingReciter(res); setManualReciterName(res.name); }}>
                        <div className="flex items-center gap-4"><img src={res.image} className="w-10 h-10 rounded-full" alt="" /><span className="font-bold text-white text-sm">{res.name}</span></div>
                        <div className="px-4 py-1.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase">اختيار</div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="space-y-6 animate-in fade-in zoom-in-95">
                <div className="flex flex-col items-center gap-4 p-6 bg-white/5 rounded-3xl border border-white/10">
                  <img src={pendingReciter.image} className="w-24 h-24 rounded-full border-4 border-emerald-500 shadow-glow" alt="" />
                  <p className="text-white/40 text-xs uppercase font-bold tracking-widest">قناة: {pendingReciter.name}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-white/60 mr-2">الاسم المعروض (يدوي)</label>
                  <Input placeholder="ادخل اسم القارئ..." value={manualReciterName} onChange={(e) => setManualReciterName(e.target.value)} className="h-14 bg-black/40 border-white/10 rounded-xl px-6 text-xl font-bold text-white text-right" />
                </div>
                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setPendingReciter(null)} className="flex-1 h-14 rounded-xl border-white/10 focusable">تراجع</Button>
                  <Button onClick={handleAddReciterFinal} className="flex-2 h-14 bg-emerald-600 text-white font-black text-lg rounded-xl shadow-glow focusable">حفظ القارئ</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
