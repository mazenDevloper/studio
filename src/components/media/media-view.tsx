
"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Plus, Loader2, X, List, Youtube, Star, Mic, Layers, Sparkles, Clock, Bookmark, Trash2, RefreshCw, CloudDownload, Trophy, Baby, Library, FolderHeart, CalendarDays, Send, Edit3, Save
} from "lucide-react";
import { useMediaStore, YouTubeChannel, YouTubeVideo } from "@/lib/store";
import { fetchChannelVideos, searchYouTubeVideos, fetchYouTubePlaylistVideos } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getCurrentHijriDate, getIslamicOccasions } from "@/lib/hijri-utils";
import { JSONBIN_MASTER_BIN_ID } from "@/lib/constants";

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
  "shadow-[0_0_191,255,0.05)] border-deepskyblue-500/10", "shadow-[0_0_2px_rgba(255,0,255,0.05)] border-magenta-500/10",
  "shadow-[0_0_250,128,114,0.05)] border-salmon-500/10", "shadow-[0_0_2px_rgba(0,255,127,0.05)] border-springgreen-500/10",
  "shadow-[0_0_238,232,170,0.05)] border-palegoldenrod-500/10", "shadow-[0_0_176,196,222,0.05)] border-lightsteelblue-500/10",
  "shadow-[0_0_221,160,221,0.05)] border-plum-500/10", "shadow-[0_0_127,255,212,0.05)] border-aquamarine-500/10"
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
 * MediaView v990.0 - Sovereign Importer Engine
 * Features: YouTube Playlist URL detection + Automatic video extraction & sync.
 */
export function MediaView() {
  const { toast } = useToast();
  const { 
    favoriteChannels, setActiveVideo, dockSide, isSidebarShrinked, setIsSidebarShrinked,
    selectedChannel, setSelectedChannel, channelVideos, setChannelVideos,
    favoriteReciters, incrementReciterClick, playlists, addPlaylist, removePlaylist,
    setActiveIptv, fetchSpecificBin, mapSettings, updateMapSettings, syncMasterBin
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
  
  const [isEditingOmanUrl, setIsEditingOmanUrl] = useState(false);
  const [omanUrlInput, setOmanUrlInput] = useState(mapSettings.omanUrl || "");

  const [starredLists, setStarredLists] = useState<Record<string, { name: string, vids: YouTubeVideo[] }>>({});

  const isDockLeft = dockSide === 'left';
  const searchInputRef = useRef<HTMLInputElement>(null);
  const playlistInputRef = useRef<HTMLInputElement>(null);

  const hijriInfo = useMemo(() => getCurrentHijriDate(), []);

  const occasionSuggestions = useMemo(() => {
    const list: { label: string, query: string, isDate?: boolean, isOman?: boolean, isSpecial?: boolean, isUpcoming?: boolean, isSport?: boolean }[] = [];
    list.push({ label: "عُمان مباشر 📺", query: mapSettings.omanUrl || "", isOman: true });
    list.push({ label: `${hijriInfo.dayName} ${hijriInfo.day} ${hijriInfo.monthName} ${hijriInfo.year}`, query: `${hijriInfo.monthName} ${hijriInfo.year}`, isDate: true });
    list.push({ label: "ملخص أهداف اليوم ⚽", query: "ملخص اهداف مباريات اليوم كاملة HD", isSport: true });
    list.push({ label: "ياسر الدوسري - سورة اليوم 📖", query: "ياسر الدوسري سورة اليوم تلاوة خاشعة", isSpecial: true });
    list.push({ label: "تلاوات نادرة - ياسر الدوسري ✨", query: "ياسر الدوسري تلاوات نادرة قديمة" });
    list.push({ label: "ياسر الدوسري - المصحف الكامل 🕋", query: "ياسر الدوسري المصحف المرتل كامل" });
    const contextOccasions = getIslamicOccasions(hijriInfo);
    contextOccasions.forEach(occ => list.push({ ...occ }));
    list.push({ label: "دروس إيمانية 📚", query: "أجمل الدروس الدينية القصيرة" });
    list.push({ label: "تلاوات هادئة 🌿", query: "تلاوات قرآنية هادئة للنوم" });
    list.push({ label: " تعليم النطق للأطفال 👶", query: "تعليم الحروف العربية للأطفال" });
    list.push({ label: "بث مباشر مكة المكرمة 🕌", query: "بث مباشر مكة المكرمة الآن" });
    return list.slice(0, 13);
  }, [hijriInfo, mapSettings.omanUrl]);

  useEffect(() => {
    async function fetchHomeContent() {
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
    if (selectedChannel) {
      setLoading(true);
      fetchChannelVideos(selectedChannel.channelid, 40).then(vids => {
        setChannelVideos(vids);
        setTimeout(() => {
          const firstVid = document.querySelector('[data-nav-id="channel-results-item-0"]') as HTMLElement;
          firstVid?.focus();
        }, 500);
      }).finally(() => setLoading(false));
    }
  }, [selectedChannel, setChannelVideos]);

  const performSearch = async (query?: string) => {
    const q = query || search; if (!q.trim()) return;
    setLoading(true); setSelectedChannel(null); setSelectedPlaylist(null);
    try { 
      const res = await searchYouTubeVideos(q, 40); 
      setSearchResults(res || []); 
      setTimeout(() => {
        const firstResult = document.querySelector('[data-nav-id="search-results-item-0"]') as HTMLElement;
        firstResult?.focus();
      }, 500);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetch("https://api.quran.com/api/v4/chapters?language=ar").then(r => r.json()).then(d => {
      setSurahs(d.chapters || []); setAllSurahs(d.chapters || []);
    });
  }, []);

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

  const createPlaylistFromInput = async () => {
    const input = newPlaylistName.trim();
    if (!input) return;
    
    // SOVEREIGN IMPORTER: Detect YouTube Playlist URL
    const listMatch = input.match(/[?&]list=([^&]+)/);
    if (listMatch) {
      const listId = listMatch[1];
      setLoading(true);
      toast({ title: "جاري الاستيراد", description: "جاري سحب المجلد من سحابة يوتيوب..." });
      try {
        const data = await fetchYouTubePlaylistVideos(listId);
        if (data.videos.length > 0) {
          addPlaylist(data.title, data.videos);
          toast({ title: "تم الاستيراد", description: `تم حفظ مجلد ${data.title} بنجاح.` });
        } else {
          toast({ variant: "destructive", title: "فشل الاستيراد", description: "لم يتم العثور على فيديوهات في هذا المجلد." });
        }
      } catch (e) {
        toast({ variant: "destructive", title: "خطأ", description: "فشل الاتصال بخوادم يوتيوب." });
      } finally {
        setLoading(false);
      }
    } else {
      addPlaylist(input);
      toast({ title: "تم الإنشاء", description: `تم إنشاء المجلد ${input}` });
    }
    setNewPlaylistName("");
    setIsPlaylistInputLocked(true);
  };

  const handlePlaylistInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isPlaylistInputLocked) {
      if (e.key === 'Enter' || e.key === '5') {
        process.nextTick(() => { setIsPlaylistInputLocked(false); setTimeout(() => playlistInputRef.current?.focus(), 50); });
      }
      return;
    }
    if (e.key === 'Enter') {
      await createPlaylistFromInput();
    }
  };

  const handleReciterClick = (r: YouTubeChannel) => {
    setSelectedReciter(r.name); setSearch(r.name); incrementReciterClick(r.channelid);
    setTimeout(() => {
      const firstJuz = document.querySelector('[data-nav-id="juz-item-0"]') as HTMLElement;
      firstJuz?.focus();
    }, 200);
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
    }, 200);
  };

  const handleSurahClick = (surahName: string) => {
    setSelectedSurah(surahName);
    const query = selectedReciter ? `${selectedReciter} سورة ${surahName}` : `سورة ${surahName}`;
    setSearch(query); performSearch(query);
  };

  const handleDirectPlaylistFetch = async () => {
    setIsFetchingPlaylists(true);
    try { await fetchSpecificBin(JSONBIN_MASTER_BIN_ID); } finally { setIsFetchingPlaylists(false); }
  };

  const handleSaveOmanUrl = async () => {
    updateMapSettings({ omanUrl: omanUrlInput });
    await syncMasterBin();
    setIsEditingOmanUrl(false);
    toast({ title: "تم الحفظ", description: "تم تحديث رابط عمان مباشر سحابياً." });
  };

  const currentPlaylist = useMemo(() => playlists.find(p => p.id === selectedPlaylist), [playlists, selectedPlaylist]);

  useEffect(() => {
    if (selectedPlaylist && currentPlaylist) {
      setTimeout(() => {
        const firstVid = document.querySelector('[data-nav-id="playlist-results-item-0"]') as HTMLElement;
        firstVid?.focus();
      }, 500);
    }
  }, [selectedPlaylist, currentPlaylist]);

  const horizontalListClass = "w-full flex gap-4 px-8 py-0 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center";

  const renderVideoGrid = (vids: YouTubeVideo[], rowId: string) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10" data-row-id={rowId}>
      {vids.map((video, idx) => (
        <div 
          key={video.id + idx} 
          className="group bg-white/5 border border-white/5 rounded-[2.5rem] overflow-hidden focusable transition-all hover:bg-white/10 cursor-pointer shadow-xl outline-none"
          onClick={() => setActiveVideo(video, vids)}
          tabIndex={0}
          data-nav-id={`${rowId}-item-${idx}`}
        >
          <div className="aspect-video relative overflow-hidden">
            <img src={video.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
            {video.duration && <div className="absolute bottom-2 right-2 bg-black text-white text-[12px] px-2 py-1 rounded font-black z-10">{video.duration}</div>}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/40 shadow-glow"><Youtube className="w-8 h-8 text-white fill-white" /></div>
            </div>
          </div>
          <div className="p-5 space-y-2">
            <h3 className="text-sm font-black text-white line-clamp-2 leading-tight">{video.title}</h3>
            <div className="flex items-center gap-3 text-[10px] font-bold text-white/40 uppercase tracking-widest">
              <span>{video.channelTitle}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={cn("h-screen flex bg-transparent overflow-hidden relative", isDockLeft ? "flex-row-reverse" : "flex-row")}>
      <aside data-nav-zone="sidebar" className={cn("h-full z-[110] premium-glass flex flex-col shrink-0 border-white/5 bg-black/60 transition-all duration-300", isSidebarShrinked ? "w-[80px]" : "w-[28%]", isDockLeft ? "border-l" : "border-r")}>
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <button className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center focusable border border-primary/20" tabIndex={0} data-nav-id="sidebar-add-btn"><Plus className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 no-scrollbar">
          <div data-row-id="sidebar-main-actions">
            <div onClick={resetView} className={cn("flex items-center justify-center gap-3 p-3 cursor-pointer focusable w-[90%] mx-auto rounded-xl", !selectedChannel && !selectedPlaylist && searchResults.length === 0 ? "bg-primary text-white" : "hover:bg-white/5")} tabIndex={0} data-nav-id="sidebar-all-btn">
              <List className="w-5 h-5" />{!isSidebarShrinked && <span className="font-black text-sm">الكل</span>}
            </div>
          </div>
          
          {!isSidebarShrinked && (
            <div className="px-4 py-4 space-y-3" data-row-id="sidebar-playlists">
                <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-2">مجلداتك السيادية</h4>
                {playlists.map((p, idx) => (
                  <div key={p.id} onClick={() => { setSelectedPlaylist(p.id); setSelectedChannel(null); setSearchResults([]); setIsSidebarShrinked(true); }} className={cn("flex items-center justify-between p-1.5 px-3 rounded-xl cursor-pointer transition-all focusable group border", selectedPlaylist === p.id ? "bg-indigo-600 border-indigo-400 text-white shadow-glow" : "bg-indigo-900/10 border-white/5 text-white/80")} tabIndex={0} data-nav-id={`sidebar-playlist-${idx}`}>
                     <div className="flex items-center gap-3">
                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shadow-lg", selectedPlaylist === p.id ? "bg-white/20" : "bg-indigo-600")}><Library className="w-3.5 h-3.5 text-white" /></div>
                        <div className="flex flex-col min-w-0"><span className="text-[11px] font-black truncate max-w-[90px] tracking-tighter">{p.name}</span><span className="text-[7px] font-black opacity-60 uppercase">{p.videos.length} تلاوة</span></div>
                     </div>
                     <button 
                        onClick={(e) => { e.stopPropagation(); removePlaylist(p.id); }}
                        className="w-7 h-7 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focusable shrink-0 ml-2"
                     >
                        <Trash2 className="w-4 h-4" />
                     </button>
                  </div>
                ))}
                <div className="flex gap-2 pt-1 px-2 items-center" data-row-id="sidebar-new-playlist">
                  <Input 
                    ref={playlistInputRef}
                    value={newPlaylistName} 
                    onChange={(e) => setNewPlaylistName(e.target.value)} 
                    onKeyDown={handlePlaylistInputKeyDown}
                    onDoubleClick={() => setIsPlaylistInputLocked(false)}
                    readOnly={isPlaylistInputLocked}
                    placeholder={isPlaylistInputLocked ? "5 للكتابة..." : "رابط مجلد أو اسم..."} 
                    className={cn("h-10 border-none text-xs rounded-xl focusable transition-all flex-1", isPlaylistInputLocked ? "bg-white/5 text-white/30" : "bg-white/10 text-white")} 
                    data-nav-id="sidebar-playlist-input-0"
                  />
                  {!isPlaylistInputLocked && (
                    <button onClick={createPlaylistFromInput} className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-glow animate-in zoom-in duration-300">
                       <Send className="w-5 h-5" />
                    </button>
                  )}
                </div>
            </div>
          )}

          <div className="mt-4 border-t border-white/5 pt-4" data-row-id="sidebar-channels-list">
            {favoriteChannels.map((ch, idx) => (
              <div key={idx} onClick={() => { setSelectedChannel(ch); setSelectedPlaylist(null); setSearchResults([]); setIsSidebarShrinked(true); }} className={cn("flex items-center justify-center p-3 rounded-xl w-[90%] mx-auto gap-3 cursor-pointer focusable", selectedChannel?.channelid === ch.channelid ? "bg-primary text-white" : "hover:bg-white/5 text-white/60")} tabIndex={0} data-nav-id={`sidebar-channel-${idx}`}>
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
                data-nav-id="content-search-input-0" 
              />
            </div>
            <button onClick={() => performSearch()} className="h-16 px-10 rounded-[2rem] bg-red-600 text-white font-black text-lg focusable flex items-center" data-nav-id="content-search-btn-0"><Youtube className="w-6 h-6 ml-3" /> استكشاف</button>
            <Button onClick={handleDirectPlaylistFetch} variant="outline" size="icon" className="w-16 h-16 rounded-[2rem] bg-indigo-600/20 text-indigo-400 border-indigo-500/30 ml-4">
               <CloudDownload className={cn("w-6 h-6", isFetchingPlaylists && "animate-spin")} />
            </Button>
          </div>
        </section>

        <section data-row-id="row-occasions" className="py-2">
          <div className={horizontalListClass}>
            {occasionSuggestions.map((occ, i) => (
              <div key={i} className="relative group shrink-0">
                <button 
                  onClick={() => {
                    if (occ.isOman) {
                      if (isEditingOmanUrl) return;
                      const url = mapSettings.omanUrl || "";
                      if (url.includes('youtube.com') || url.includes('youtu.be')) {
                        const vidMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
                        if (vidMatch) {
                           setActiveVideo({ id: vidMatch[1], title: "عُمان مباشر", thumbnail: "https://gallery-images.me/pics/arabicfta/oman.png", description: "", publishedAt: new Date().toISOString() });
                           return;
                        }
                      }
                      setActiveIptv({ stream_id: "oman-live-direct", name: "عُمان مباشر", stream_icon: "https://gallery-images.me/pics/arabicfta/oman.png", category_id: "direct", url: mapSettings.omanUrl, type: 'web' });
                    } else { performSearch(occ.query); }
                  }}
                  className={cn("px-6 py-4 rounded-full font-black text-sm focusable border-2 shrink-0 transition-all", occ.isDate ? "bg-white text-black border-white shadow-glow text-lg" : occ.isOman ? "bg-[#ed2b5c] text-white border-white/40 shadow-glow animate-pulse" : occ.isSport ? "bg-red-600/20 text-red-500 border-red-600/40" : occ.isUpcoming ? "bg-amber-600/20 text-amber-400 border-amber-500/30" : "bg-indigo-600 text-white border-indigo-400/50 shadow-glow")} 
                  data-nav-id={`occ-item-${i}`}
                >
                  <div className="flex items-center gap-3">
                     {occ.isDate ? <CalendarDays className="w-6 h-6 ml-2" /> : occ.isOman ? <img src="https://gallery-images.me/pics/arabicfta/oman.png" className="w-8 h-8 rounded-full border border-white/20" alt="" /> : occ.isSport ? <Trophy className="w-5 h-5 ml-2" /> : <Sparkles className="w-5 h-5 ml-2" />}
                     {occ.label}
                  </div>
                </button>
                
                {occ.isOman && (
                   <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-50 flex flex-col items-center gap-2">
                      {isEditingOmanUrl ? (
                         <div className="flex items-center gap-2 bg-black/80 backdrop-blur-xl p-2 rounded-2xl border border-white/20 shadow-2xl animate-in zoom-in-95 duration-200">
                            <Input value={omanUrlInput} onChange={(e) => setOmanUrlInput(e.target.value)} className="h-10 w-64 bg-white/5 border-none text-[10px] text-white font-bold" placeholder="رابط البث الجديد..." />
                            <button onClick={handleSaveOmanUrl} className="w-10 h-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center shadow-glow"><Save className="w-5 h-5" /></button>
                            <button onClick={() => setIsEditingOmanUrl(false)} className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center"><X className="w-5 h-5" /></button>
                         </div>
                      ) : (
                         <button onClick={() => setIsEditingOmanUrl(true)} className="w-10 h-10 rounded-full bg-black/60 text-white border border-white/20 flex items-center justify-center shadow-glow backdrop-blur-md focusable"><Edit3 className="w-5 h-5" /></button>
                      )}
                   </div>
                )}
              </div>
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
            {[...Array(30).keys()].map(i => (
              <button key={i} onClick={() => handleJuzClick(i+1)} className={cn("px-8 py-3 rounded-full text-white font-black text-sm focusable border-2 shrink-0 transition-all", selectedJuz === i+1 ? "bg-white text-black border-white shadow-glow" : JUZ_COLORS[i].split('shadow-')[0])} tabIndex={0} data-nav-id={`juz-item-${i}`}>الجزء {i+1}</button>
            ))}
          </div>
        </section>

        <section data-row-id="row-surahs" className="py-2">
          <div className={horizontalListClass}>
            {surahs.map((s, i) => (
              <button key={i} onClick={() => handleSurahClick(s.name_arabic)} className={cn("px-10 py-4 rounded-full border-2 text-white font-black text-sm focusable shrink-0 transition-all", selectedSurah === s.name_arabic ? "bg-blue-600 border-blue-400 shadow-glow" : "bg-white/5 border-white/10")} tabIndex={0} data-nav-id={`surah-${i}`}>سورة {s.name_arabic}</button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center py-40"><Loader2 className="w-16 h-16 animate-spin text-primary" /></div>
        ) : searchResults.length > 0 ? (
          renderVideoGrid(searchResults, "search-results")
        ) : selectedPlaylist ? (
          <div className="space-y-10 mt-10">
             <div className="flex items-center justify-between px-10">
                <h2 className="text-4xl font-black text-white tracking-tighter flex items-center gap-5"><Library className="w-10 h-10 text-indigo-400" /> {currentPlaylist?.name}</h2>
                <Button onClick={() => { setSelectedPlaylist(null); resetView(); }} className="h-14 px-8 rounded-full bg-white/5 border border-white/10 text-white font-black focusable">إغلاق المجلد</Button>
             </div>
             {currentPlaylist ? renderVideoGrid(currentPlaylist.videos, "playlist-results") : null}
          </div>
        ) : selectedChannel ? (
          <div className="space-y-10 mt-10">
             <div className="flex items-center justify-between px-10">
                <h2 className="text-4xl font-black text-white tracking-tighter flex items-center gap-5"><img src={selectedChannel.image} className="w-14 h-14 rounded-full border-2 border-white/20" alt="" /> {selectedChannel.name}</h2>
                <Button onClick={() => { setSelectedChannel(null); resetView(); }} className="h-14 px-8 rounded-full bg-white/5 border border-white/10 text-white font-black focusable">إغلاق القناة</Button>
             </div>
             {renderVideoGrid(channelVideos, "channel-results")}
          </div>
        ) : (
          <div className="space-y-16 mt-10">
            {playlists.length > 0 && (
              <section data-row-id="row-all-playlists" className="py-4">
                 <div className="px-10 mb-6 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-glow">
                       <Library className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-widest">المجلدات والترددات المجرسة</h2>
                 </div>
                 <div className={horizontalListClass}>
                    {playlists.map((p, pIdx) => (
                       <div key={p.id} onClick={() => { setSelectedPlaylist(p.id); setIsSidebarShrinked(true); }} className="w-80 h-48 group relative overflow-hidden bg-zinc-900 border-2 border-white/10 rounded-[2.5rem] focusable cursor-pointer shrink-0 flex flex-col justify-end p-6 shadow-2xl transition-all outline-none" tabIndex={0} data-nav-id={`all-playlist-${pIdx}`}>
                         {p.videos.length > 0 && (
                           <div className="absolute inset-0 z-0">
                             <img src={p.videos[0].thumbnail} className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" alt="" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                           </div>
                         )}
                         <div className="relative z-10 text-right">
                           <span className="text-2xl font-black text-white tracking-tighter drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] leading-tight">{p.name}</span>
                           <div className="mt-2 flex items-center gap-2">
                             <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/20">
                               <span className="text-[9px] font-black text-white uppercase tracking-widest">{p.videos.length} تلاوة</span>
                             </div>
                           </div>
                         </div>
                       </div>
                    ))}
                 </div>
              </section>
            )}

            {Object.entries(starredLists).map(([cid, data], idx) => (
              <section key={cid} data-row-id={`row-starred-${idx}`} className="py-4">
                <div className="px-10 mb-6 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-glow bg-yellow-500">
                    <Star className="w-6 h-6 text-black fill-current" />
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-widest">{`ترددات ${data.name}`}</h2>
                </div>
                <div className={horizontalListClass}>
                  {data.vids.map((video, vIdx) => (
                    <div 
                      key={video.id + vIdx} 
                      className="w-80 group bg-white/5 border border-white/5 rounded-[2.5rem] overflow-hidden focusable transition-all hover:bg-white/10 cursor-pointer shadow-xl outline-none shrink-0"
                      onClick={() => setActiveVideo(video, data.vids)}
                      tabIndex={0}
                      data-nav-id={`starred-video-${idx}-${vIdx}`}
                    >
                      <div className="aspect-video relative overflow-hidden">
                        <img src={video.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                        {video.duration && <div className="absolute bottom-2 right-2 bg-black text-white text-[10px] px-2 py-1 rounded font-black z-10">{video.duration}</div>}
                      </div>
                      <div className="p-4 space-y-2">
                        <h3 className="text-xs font-black text-white line-clamp-2 leading-tight">{video.title}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
