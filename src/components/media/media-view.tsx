
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Plus, Loader2, X, List, Youtube, Star, Mic, Layers, Sparkles, Clock, Bookmark, Trash2, RefreshCw, CloudDownload, Trophy, Baby, Library, FolderHeart
} from "lucide-react";
import { useMediaStore, YouTubeChannel, YouTubeVideo } from "@/lib/store";
import { fetchChannelVideos, searchYouTubeVideos } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { JSONBIN_MASTER_BIN_ID, JSONBIN_MASTER_KEY } from "@/lib/constants";

const JUZ_COLORS = [
  "shadow-[0_0_2px_rgba(255,0,0,0.05)] border-red-500/10", "shadow-[0_0_2px_rgba(255,127,0,0.05)] border-orange-500/10",
  "shadow-[0_0_2px_rgba(255,255,0,0.05)] border-yellow-500/10", "shadow-[0_0_2px_rgba(0,255,0,0.05)] border-green-500/10",
  "shadow-[0_0_2px_rgba(0,0,255,0.05)] border-blue-500/10", "shadow-[0_0_2px_rgba(75,0,130,0.05)] border-indigo-500/10",
  "shadow-[0_0_2px_rgba(148,0,211,0.05)] border-violet-500/10", "shadow-[0_0_2px_rgba(255,20,147,0.05)] border-pink-500/10",
  "shadow-[0_0_2px_rgba(0,255,255,0.05)] border-cyan-500/10", "shadow-[0_0_2px_rgba(173,255,47,0.05)] border-lime-500/10",
  "shadow-[0_0_2px_rgba(255,69,0,0.05)] border-orangered-500/10", "shadow-[0_0_2px_rgba(30,144,255,0.05)] border-dodgerblue-500/10",
  "shadow-[0_0_2px_rgba(218,112,214,0.05)] border-orchid-500/10", "shadow-[0_0_2px_rgba(50,205,50,0.05)] border-limegreen-500/10",
  "shadow-[0_0_2px_rgba(255,215,0,0.05)] border-gold-500/10", "shadow-[0_0_2px_rgba(255,105,180,0.05)] border-hotpink-500/10",
  "shadow-[0_0_2px_rgba(138,43,226,0.05)] border-blueviolet-500/10", "shadow-[0_0_2px_rgba(0,250,154,0.05)] border-mediumspringgreen-500/10",
  "shadow-[0_0_2px_rgba(255,140,0,0.05)] border-darkorange-500/10", "shadow-[0_0_2px_rgba(32,178,170,0.05)] border-lightseagreen-500/10",
  "shadow-[0_0_2px_rgba(240,128,128,0.05)] border-lightcoral-500/10", "shadow-[0_0_2px_rgba(124,252,0,0.05)] border-lawngreen-500/10",
  "shadow-[0_0_2px_rgba(0,191,255,0.05)] border-deepskyblue-500/10", "shadow-[0_0_2px_rgba(255,0,255,0.05)] border-magenta-500/10",
  "shadow-[0_0_2px_rgba(250,128,114,0.05)] border-salmon-500/10", "shadow-[0_0_2px_rgba(0,255,127,0.05)] border-springgreen-500/10",
  "shadow-[0_0_2px_rgba(238,232,170,0.05)] border-palegoldenrod-500/10", "shadow-[0_0_2px_rgba(176,196,222,0.05)] border-lightsteelblue-500/10",
  "shadow-[0_0_2px_rgba(221,160,221,0.05)] border-plum-500/10", "shadow-[0_0_2px_rgba(127,255,212,0.05)] border-aquamarine-500/10"
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

/**
 * MediaView v870.0 - Sovereign Unified Hub with Secure Inputs
 * Features: Direct Cloud Fetch for Playlists + Background Audio Support + Locked Inputs for Remote Control.
 */
export function MediaView() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { 
    favoriteChannels, setActiveVideo, dockSide, isSidebarShrinked, setIsSidebarShrinked,
    selectedChannel, setSelectedChannel, channelVideos, setChannelVideos,
    favoriteReciters, incrementReciterClick, playlists, addPlaylist, removePlaylist,
    isLooping, toggleLooping, mapSettings, setActiveIptv, fetchSpecificBin
  } = useMediaStore();

  const [search, setSearch] = useState("");
  const [isSearchLocked, setIsSearchLocked] = useState(true);
  const [isPlaylistInputLocked, setIsPlaylistInputLocked] = useState(true);
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [surahs, setSurahs] = useState<any[]>([]);
  const [allSurahs, setAllSurahs] = useState<any[]>([]);
  const [selectedReciter, setSelectedReciter] = useState<string | null>(null);
  const [selectedSurah, setSelectedSurah] = useState<string | null>(null);
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isFetchingPlaylists, setIsFetchingPlaylists] = useState(false);

  const [matchSummaries, setMatchSummaries] = useState<YouTubeVideo[]>([]);
  const [childWords, setChildWords] = useState<YouTubeVideo[]>([]);
  const [starredLists, setStarredLists] = useState<Record<string, { name: string, vids: YouTubeVideo[] }>>({});

  const isDockLeft = dockSide === 'left';
  const searchInputRef = useRef<HTMLInputElement>(null);
  const playlistInputRef = useRef<HTMLInputElement>(null);

  const occasionSuggestions = useMemo(() => {
    const today = new Date();
    const suggestions: { label: string, query: string, isOman?: boolean }[] = [];
    suggestions.push({ label: "قناة عمان مباشر", query: mapSettings.omanUrl || "", isOman: true });
    suggestions.push({ label: "ملخص مباريات اليوم ⚽", query: "ملخص مباريات اليوم" });
    const pulseList = [
      { label: "ياسر الدوسري سورة البقرة", query: "ياسر الدوسري سورة البقرة" },
      { label: "أحمد النفيس سورة النجم", query: "احمد النفيس سورة النجم" },
      { label: "عبدالعزيز العسيري سورة الكهف", query: "عبدالعزيز العسيري سورة الكهف" },
      { label: "إسلام صبحي تلاوات خاشعة", query: "اسلام صبحي تلاوة خاشعة" }
    ];
    suggestions.push(pulseList[today.getDate() % pulseList.length]);
    return suggestions.slice(0, 7);
  }, [mapSettings.omanUrl]);

  useEffect(() => {
    async function fetchHomeContent() {
      searchYouTubeVideos("ملخص مباريات اليوم", 12).then(setMatchSummaries);
      searchYouTubeVideos("كلمات الطفل الاولى تعليمية", 12).then(setChildWords);
      const starred = favoriteChannels.filter(c => c.starred).slice(0, 3);
      const lists: Record<string, any> = {};
      for (const ch of starred) {
        const vids = await fetchChannelVideos(ch.channelid, 12);
        lists[ch.channelid] = { name: ch.name, vids };
      }
      setStarredLists(lists);
    }
    fetchHomeContent();
  }, [favoriteChannels]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const firstReciter = document.querySelector('[data-nav-id="reciter-item-0"]') as HTMLElement;
      firstReciter?.focus();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const performSearch = async (query?: string) => {
    const q = query || search; if (!q.trim()) return;
    
    if (q.includes('mangomolo') || q.includes('player.mangomolo')) {
      setActiveIptv({
        stream_id: "oman-direct", name: "عمان مباشر",
        stream_icon: "https://gallery-images.me/pics/arabicfta/oman.png",
        category_id: "direct", url: q, type: 'web'
      });
      return;
    }

    const ytMatch = q.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch && ytMatch[1]) {
      setActiveVideo({ 
        id: ytMatch[1], title: "تلاوة من رابط مباشر", 
        thumbnail: `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg`, 
        publishedAt: new Date().toISOString(), description: "", duration: "FEED"
      });
      return;
    }

    setLoading(true); setSelectedChannel(null); setSelectedPlaylist(null);
    try { 
      const res = await searchYouTubeVideos(q, 40); 
      setSearchResults(res || []); 
      setTimeout(() => {
        const firstResult = document.querySelector('[data-nav-id="grid-item-0"]') as HTMLElement;
        if (firstResult) {
          firstResult.focus();
          firstResult.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setIsSidebarShrinked(true);
        }
      }, 600);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetch("https://api.quran.com/api/v4/chapters?language=ar").then(r => r.json()).then(d => {
      setSurahs(d.chapters || []); setAllSurahs(d.chapters || []);
    });
    const q = searchParams.get('q'); if (q) { setSearch(q); performSearch(q); }
  }, [searchParams]);

  useEffect(() => {
    if (selectedChannel) {
      setLoading(true);
      fetchChannelVideos(selectedChannel.channelid, 50).then(vids => {
        setChannelVideos(vids);
        setLoading(false);
        setIsSidebarShrinked(true);
        setTimeout(() => {
          const target = document.querySelector('[data-nav-id="grid-item-0"]') as HTMLElement;
          target?.focus();
        }, 500);
      });
    }
  }, [selectedChannel, setChannelVideos, setIsSidebarShrinked]);

  const resetView = () => { 
    setSelectedChannel(null); setSelectedPlaylist(null); setSearchResults([]); setSearch(""); 
    setIsSidebarShrinked(false); setSelectedReciter(null); 
    setSelectedSurah(null); setSelectedJuz(null); setSurahs(allSurahs); 
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isSearchLocked) {
      if (e.key === 'Enter' || e.key === '5') { e.preventDefault(); setIsSearchLocked(false); setTimeout(() => searchInputRef.current?.focus(), 50); }
      return;
    }
    if (e.key === 'Enter') { performSearch(); setIsSearchLocked(true); }
  };

  const handlePlaylistInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isPlaylistInputLocked) {
      if (e.key === 'Enter' || e.key === '5') {
        e.preventDefault();
        setIsPlaylistInputLocked(false);
        setTimeout(() => playlistInputRef.current?.focus(), 50);
      }
      return;
    }
    if (e.key === 'Enter') {
      if (newPlaylistName.trim()) {
        addPlaylist(newPlaylistName);
        setNewPlaylistName("");
      }
      setIsPlaylistInputLocked(true);
    }
  };

  const handleReciterClick = (r: YouTubeChannel) => {
    setSelectedReciter(r.name); setSearch(r.name); incrementReciterClick(r.channelid);
    setTimeout(() => {
      const firstJuz = document.querySelector('[data-nav-id="juz-item-0"]') as HTMLElement;
      firstJuz?.focus();
    }, 400);
  };

  const handleJuzClick = (juzNum: number) => {
    setSelectedJuz(juzNum);
    const surahIds = JUZ_SURAH_MAP[juzNum] || [];
    const filtered = allSurahs.filter(s => surahIds.includes(s.id));
    setSurahs(filtered);
    setSearch(selectedReciter ? `${selectedReciter} الجزء ${juzNum}` : `الجزء ${juzNum}`);
    setTimeout(() => {
      const firstSurah = document.querySelector('[data-nav-id="surah-0"]') as HTMLElement;
      firstSurah?.focus();
    }, 300);
  };

  const handleSurahClick = (surahName: string) => {
    setSelectedSurah(surahName);
    const query = selectedReciter ? `${selectedReciter} سورة ${surahName}` : `سورة ${surahName}`;
    setSearch(query); performSearch(query);
  };

  const handleDirectPlaylistFetch = async () => {
    setIsFetchingPlaylists(true);
    toast({ title: "جلب سحابي", description: "جاري مزامنة المجلدات والاشتراكات من السحابة السيادية..." });
    try {
      await Promise.all([
        fetchSpecificBin(JSONBIN_MASTER_BIN_ID)
      ]);
      toast({ title: "اكتملت المزامنة", description: "تم تحديث كافة المجلدات بنجاح." });
    } finally {
      setIsFetchingPlaylists(false);
    }
  };

  const currentPlaylist = useMemo(() => playlists.find(p => p.id === selectedPlaylist), [playlists, selectedPlaylist]);
  const horizontalListClass = "w-full flex gap-4 px-8 py-0 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center";

  return (
    <div className={cn("h-screen flex bg-transparent overflow-hidden relative", isDockLeft ? "flex-row-reverse" : "flex-row")}>
      <aside data-nav-zone="sidebar" className={cn("h-full z-[110] premium-glass flex flex-col shrink-0 border-white/5 bg-black/60 transition-all duration-300", isSidebarShrinked ? "w-[80px]" : "w-[28%]", isDockLeft ? "border-l" : "border-r")}>
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <button className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center focusable border border-primary/20" tabIndex={0} data-nav-id="sidebar-add-btn"><Plus className="w-5 h-5" /></button>
          {!isSidebarShrinked && (
            <button onClick={handleDirectPlaylistFetch} disabled={isFetchingPlaylists} className="w-10 h-10 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/20 focusable"><CloudDownload className={cn("w-5 h-5", isFetchingPlaylists && "animate-spin")} /></button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-2 no-scrollbar">
          <div onClick={resetView} className={cn("flex items-center justify-center gap-3 p-3 cursor-pointer focusable w-[90%] mx-auto rounded-xl", !selectedChannel && !selectedPlaylist && searchResults.length === 0 ? "bg-primary text-white" : "hover:bg-white/5")} tabIndex={0} data-nav-id="sidebar-all-btn">
            <List className="w-5 h-5" />{!isSidebarShrinked && <span className="font-black text-sm">الكل</span>}
          </div>
          
          {!isSidebarShrinked && (
            <div className="px-4 py-6 space-y-4" data-row-id="sidebar-playlists">
                <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-2">مجلداتك السيادية</h4>
                {playlists.map((p, idx) => (
                  <div key={p.id} onClick={() => { setSelectedPlaylist(p.id); setSelectedChannel(null); setSearchResults([]); setIsSidebarShrinked(true); }} className={cn("flex items-center justify-between p-5 rounded-[2rem] cursor-pointer transition-all focusable group border-2", selectedPlaylist === p.id ? "bg-indigo-600 border-indigo-400 text-white shadow-glow" : "bg-indigo-900/20 border-white/5 text-white/80")} tabIndex={0} data-nav-id={`sidebar-playlist-${idx}`}>
                     <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg", selectedPlaylist === p.id ? "bg-white/20" : "bg-indigo-600")}><Library className="w-7 h-7 text-white" /></div>
                        <div className="flex flex-col"><span className="text-base font-black truncate max-w-[140px] tracking-tighter">{p.name}</span><span className="text-[9px] font-black opacity-60 uppercase">{p.videos.length} تلاوة</span></div>
                     </div>
                     <button onClick={(e) => { e.stopPropagation(); removePlaylist(p.id); }} className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-2"><Trash2 className="w-5 h-5" /></button>
                  </div>
                ))}
                <div className="flex gap-2 pt-2 px-2">
                  <Input 
                    ref={playlistInputRef}
                    value={newPlaylistName} 
                    onChange={(e) => setNewPlaylistName(e.target.value)} 
                    onKeyDown={handlePlaylistInputKeyDown}
                    onDoubleClick={() => setIsPlaylistInputLocked(false)}
                    readOnly={isPlaylistInputLocked}
                    placeholder={isPlaylistInputLocked ? "5 للكتابة..." : "قائمة جديدة..."} 
                    className={cn("h-12 border-none text-xs rounded-xl focusable transition-all", isPlaylistInputLocked ? "bg-white/5 text-white/30" : "bg-white/10 text-white")} 
                  />
                  <Button size="icon" className="h-12 w-12 bg-indigo-600 rounded-xl focusable" onClick={() => { if(newPlaylistName) { addPlaylist(newPlaylistName); setNewPlaylistName(""); } }}><Plus className="w-5 h-5" /></Button>
                </div>
            </div>
          )}

          <div className="mt-4 border-t border-white/5 pt-4">
            {favoriteChannels.map((ch, idx) => (
              <div key={idx} onClick={() => { setSelectedChannel(ch); }} className={cn("flex items-center justify-center p-3 rounded-xl w-[90%] mx-auto gap-3 cursor-pointer focusable", selectedChannel?.channelid === ch.channelid ? "bg-primary text-white" : "hover:bg-white/5 text-white/60")} tabIndex={0} data-nav-id={`sidebar-channel-${idx}`}>
                <div className="w-8 h-8 rounded-xl overflow-hidden relative shrink-0"><img src={ch.image} className="w-full h-full object-cover" alt="" /></div>
                {!isSidebarShrinked && <span className="font-black text-sm flex-1 truncate text-right">{ch.name}</span>}
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main data-nav-zone="content" className="flex-1 overflow-y-auto relative pt-0 pb-40 px-10 no-scrollbar" style={{ direction: 'rtl' }}>
        <section data-row-id="row-search" className="py-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Input 
                ref={searchInputRef} 
                placeholder={isSearchLocked ? "اضغط 5 للكتابة..." : "ابحث عن أي شيء أو الصق رابطاً..."} 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                onKeyDown={handleSearchKeyDown} 
                onDoubleClick={() => setIsSearchLocked(false)}
                readOnly={isSearchLocked} 
                className={cn("h-16 border-none rounded-[2rem] pr-10 text-xl font-bold focusable", isSearchLocked ? "bg-white/5 text-white/30" : "bg-white/10 text-white")} 
                data-nav-id="content-search-input" 
              />
              {isSearchLocked && <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2"><div className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black text-white/40">اضغط 5 للتفعيل</div></div>}
            </div>
            <button onClick={() => performSearch()} className="h-16 px-10 rounded-[2rem] bg-red-600 text-white font-black text-lg focusable flex items-center" data-nav-id="content-search-btn"><Youtube className="w-6 h-6 ml-3" /> استكشاف</button>
          </div>
        </section>

        <section data-row-id="row-occasions" className="py-2">
          <div className={horizontalListClass}>
            {occasionSuggestions.map((occ, i) => (
              <button key={i} onClick={() => performSearch(occ.query)} className={cn("px-6 py-4 rounded-full font-black text-sm focusable border-2 shrink-0 transition-all", occ.isOman ? "bg-[#ed2b5c] text-white border-white/40 shadow-glow text-lg animate-pulse" : "bg-indigo-600 text-white border-indigo-400/50 shadow-glow")} data-nav-id={`occ-item-${i}`}>
                <div className="flex items-center gap-3">{occ.isOman && <img src="https://gallery-images.me/pics/arabicfta/oman.png" className="w-8 h-8 rounded-full border border-white/20" alt="" />}{occ.label}</div>
              </button>
            ))}
          </div>
        </section>
        
        <section data-row-id="row-reciters" className="py-2">
          <div className={cn(horizontalListClass, "gap-8")}>
            {favoriteReciters.map((r, i) => (
              <button key={i} onClick={() => handleReciterClick(r)} className={cn("flex flex-col items-center gap-4 px-4 py-4 rounded-[2.5rem] focusable border-2 shrink-0 transition-all", selectedReciter === r.name ? "border-emerald-500 bg-emerald-500/10 shadow-glow" : "border-transparent hover:bg-emerald-600/10")} tabIndex={0} data-nav-id={`reciter-item-${i}`}>
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-emerald-500/30 shadow-2xl"><img src={r.image} className="w-full h-full object-cover" alt="" /></div>
                <span className="text-[10px] font-black text-white">{r.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section data-row-id="row-juz" className="py-2">
          <div className={horizontalListClass}>
            <div className="flex items-center gap-3 px-6 py-2 bg-white/5 rounded-full border border-white/10 shrink-0"><Layers className="w-4 h-4 text-accent" /><span className="text-[10px] font-black text-white/40 uppercase">الأجزاء</span></div>
            {[...Array(30).keys()].map(i => (
              <button key={i} onClick={() => handleJuzClick(i+1)} className={cn("px-8 py-3 rounded-full text-white font-black text-sm focusable border-2 shrink-0 transition-all", selectedJuz === i+1 ? "bg-white text-black border-white shadow-glow" : JUZ_COLORS[i].split('shadow-')[0])} tabIndex={0} data-nav-id={`juz-item-${i}`}>الجزء {i+1}</button>
            ))}
          </div>
        </section>

        <section data-row-id="row-surahs" className="py-2">
          <div className={horizontalListClass}>
            {selectedJuz && (<button onClick={() => performSearch(`${search} الجزء ${selectedJuz}`)} className="px-10 py-4 rounded-full border-2 text-white font-black text-sm focusable bg-white/5 border-white/10 shadow-glow shrink-0" tabIndex={0} data-nav-id="juz-whole-btn">بحث في الجزء {selectedJuz}</button>)}
            {surahs.map((s, i) => (
              <button key={i} onClick={() => handleSurahClick(s.name_arabic)} className={cn("px-10 py-4 rounded-full border-2 text-white font-black text-sm focusable shrink-0 transition-all", selectedSurah === s.name_arabic ? "bg-blue-600 border-blue-400 shadow-glow" : "bg-white/5 border-white/10")} tabIndex={0} data-nav-id={`surah-${i}`}>سورة {s.name_arabic}</button>
            ))}
          </div>
        </section>

        {(searchResults.length > 0 || selectedChannel || selectedPlaylist) && (
          <section data-row-id="row-grid" className="mt-10">
            <div className="flex justify-between items-center mb-8 bg-black/40 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/10">
              <h2 className="text-3xl font-black text-white truncate max-w-[60%] drop-shadow-[0_0_15px_rgba(99,102,241,0.6)]">{selectedChannel ? selectedChannel.name : selectedPlaylist ? currentPlaylist?.name : `نتائج البحث: ${search}`}</h2>
              <div className="flex gap-4">
                 {selectedPlaylist && (<button onClick={toggleLooping} className={cn("w-14 h-14 rounded-full flex items-center justify-center focusable border-2", isLooping ? "bg-indigo-600 border-indigo-400 text-white shadow-glow" : "bg-white/5 border-white/10 text-white/40")}><RefreshCw className={cn("w-7 h-7", isLooping && "animate-spin")} /></button>)}
                 <button onClick={() => resetView()} className="w-14 h-14 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center focusable border border-red-600/20 shadow-glow"><X className="w-8 h-8" /></button>
              </div>
            </div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="w-12 h-12 animate-spin text-primary" /><p className="text-white/40 font-black uppercase tracking-[0.5em] animate-pulse">جاري استدعاء البيانات السيادية...</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-40">
                {(selectedPlaylist ? currentPlaylist?.videos : searchResults.length > 0 ? searchResults : channelVideos)?.map((v, i) => (
                  <Card key={v.id + i} className="group bg-zinc-900/40 border-none rounded-[2.8rem] cursor-pointer focusable overflow-hidden relative aspect-[16/10] outline-none" tabIndex={0} onClick={() => setActiveVideo(v, selectedPlaylist ? currentPlaylist?.videos : searchResults.length > 0 ? searchResults : channelVideos)} data-nav-id="grid-item-0" onFocus={() => setIsSidebarShrinked(true)}>
                    <img src={v.thumbnail} className="w-full h-full object-cover opacity-70 group-hover:opacity-100" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 p-6 flex flex-col justify-end text-right"><h3 className="text-base font-black text-white line-clamp-2">{v.title}</h3><div className="mt-2 flex items-center gap-2 opacity-60"><Clock className="w-3 h-3" /><span className="text-[10px] font-black">{v.duration || "FEED"}</span></div></div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}

        {searchResults.length === 0 && !selectedChannel && !selectedPlaylist && (
          <div className="space-y-16 mt-10">
            {/* Playlists & Starred Row 1 */}
            {Object.entries(starredLists).map(([cid, data], idx) => (
              <section key={cid} data-row-id={`row-starred-${idx}`} className="py-4">
                <div className="px-10 mb-6 flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-glow", idx === 0 ? "bg-indigo-600" : "bg-yellow-500")}>
                    {idx === 0 ? <Library className="w-6 h-6 text-white" /> : <Star className="w-6 h-6 text-black fill-current" />}
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-widest">{idx === 0 ? "المجلدات والترددات المجرسة" : `ترددات ${data.name}`}</h2>
                  {idx === 0 && (
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleDirectPlaylistFetch}
                      disabled={isFetchingPlaylists}
                      className="w-12 h-12 rounded-full bg-indigo-600/20 text-indigo-400 border-indigo-500/30 focusable ml-4"
                    >
                      <CloudDownload className={cn("w-6 h-6", isFetchingPlaylists && "animate-spin")} />
                    </Button>
                  )}
                </div>
                <div className={horizontalListClass}>
                  {idx === 0 && playlists.map((p, pIdx) => (
                    <div key={p.id} onClick={() => { setSelectedPlaylist(p.id); setIsSidebarShrinked(true); }} className="w-80 h-48 group relative overflow-hidden bg-indigo-900/40 border-2 border-indigo-500/30 rounded-[3rem] focusable cursor-pointer shrink-0 flex flex-col items-center justify-center p-8 shadow-2xl transition-all outline-none" tabIndex={0} data-nav-id={`all-playlist-${pIdx}`}>
                      {p.videos?.[0] && (<div className="absolute inset-0 z-0"><img src={p.videos[0].thumbnail} className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-1000" alt="" /><div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" /></div>)}
                      <div className="flex flex-col items-center gap-3 text-center relative z-10"><span className="text-3xl font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(0,0,0,0.8)] shadow-indigo-500/50 group-hover:scale-110 transition-transform">{p.name}</span><div className="px-5 py-1.5 bg-indigo-600/20 rounded-full border border-indigo-500/40 shadow-glow"><span className="text-[11px] font-black text-indigo-100 uppercase">{p.videos.length} تلاوة</span></div></div>
                    </div>
                  ))}
                  {data.vids.map((v: any, vIdx: number) => (
                    <Card key={v.id + vIdx} className="w-80 aspect-[16/10] bg-zinc-900/40 border-none rounded-[2.5rem] cursor-pointer focusable overflow-hidden relative shrink-0 outline-none" tabIndex={0} onClick={() => setActiveVideo(v, data.vids)} data-nav-id={`starred-${idx}-${vIdx}`} onFocus={() => setIsSidebarShrinked(true)}>
                      <img src={v.thumbnail} className="w-full h-full object-cover opacity-70 group-hover:opacity-100" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 p-6 flex flex-col justify-end text-right"><h3 className="text-sm font-black text-white line-clamp-2">{v.title}</h3><div className="mt-2 flex items-center gap-2 opacity-60"><Clock className="w-3 h-3" /><span className="text-[10px] font-black">{v.duration || "FEED"}</span></div></div>
                    </Card>
                  ))}
                </div>
              </section>
            ))}

            <section data-row-id="row-child" className="py-4">
              <div className="px-10 mb-6 flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-glow"><Baby className="w-6 h-6 text-black" /></div><h2 className="text-2xl font-black text-white uppercase tracking-widest">كلمات الطفل الأولى</h2></div>
              <div className={horizontalListClass}>
                {childWords.map((v, i) => (
                  <Card key={v.id + i} className="w-80 aspect-[16/10] bg-zinc-900/40 border-none rounded-[2.5rem] cursor-pointer focusable overflow-hidden relative shrink-0 outline-none" tabIndex={0} onClick={() => setActiveVideo(v)} data-nav-id={`child-vid-${i}`} onFocus={() => setIsSidebarShrinked(true)}>
                    <img src={v.thumbnail} className="w-full h-full object-cover opacity-70 group-hover:opacity-100" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 p-6 flex flex-col justify-end text-right"><h3 className="text-sm font-black text-white line-clamp-2">{v.title}</h3><div className="mt-2 flex items-center gap-2 opacity-60"><Clock className="w-3 h-3" /><span className="text-[10px] font-black">{v.duration || "FEED"}</span></div></div>
                  </Card>
                ))}
              </div>
            </section>

            <section data-row-id="row-matches" className="py-4">
              <div className="px-10 mb-6 flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-glow"><Trophy className="w-6 h-6 text-white" /></div><h2 className="text-2xl font-black text-white uppercase tracking-widest">ملخصات مباريات اليوم</h2></div>
              <div className={horizontalListClass}>
                {matchSummaries.map((v, i) => (
                  <Card key={v.id + i} className="w-80 aspect-[16/10] bg-zinc-900/40 border-none rounded-[2.5rem] cursor-pointer focusable overflow-hidden relative shrink-0 outline-none" tabIndex={0} onClick={() => setActiveVideo(v)} data-nav-id={`match-vid-${i}`} onFocus={() => setIsSidebarShrinked(true)}>
                    <img src={v.thumbnail} className="w-full h-full object-cover opacity-70 group-hover:opacity-100" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 p-6 flex flex-col justify-end text-right"><h3 className="text-sm font-black text-white line-clamp-2">{v.title}</h3><div className="mt-2 flex items-center gap-2 opacity-60"><Clock className="w-3 h-3" /><span className="text-[10px] font-black">{v.duration || "FEED"}</span></div></div>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
