"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { 
  Plus, Loader2, X, List, Youtube, Star, Mic, Layers, Sparkles, Clock, Bookmark, Trash2, RefreshCw, CloudDownload, Trophy, Baby, Library, FolderHeart, CalendarDays, Send, Edit3, Save, Search, Calendar, BookOpen, Music, ExternalLink, ChevronRight, ChevronLeft, Headset, RadioTower
} from "lucide-react";
import { useMediaStore, YouTubeChannel, YouTubeVideo } from "@/lib/store";
import { fetchChannelVideos, searchYouTubeVideos, fetchYouTubePlaylistVideos } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getCurrentHijriDate, getIslamicOccasions } from "@/lib/hijri-utils";
import { JSONBIN_MASTER_BIN_ID, JSONBIN_POPULAR_RECITERS_BIN_ID, JSONBIN_CHANNELS_BIN_ID } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const HIJRI_MONTHS = [
  "محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
  "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
];

const JUZ_COLORS = [
  "bg-blue-600", "bg-blue-500", "bg-sky-600", "bg-cyan-600", "bg-teal-600", 
  "bg-emerald-600", "bg-green-600", "bg-lime-600", "bg-yellow-600", "bg-amber-600",
  "bg-orange-600", "bg-red-600", "bg-rose-600", "bg-pink-600", "bg-fuchsia-600",
  "bg-purple-600", "bg-violet-600", "bg-indigo-600", "bg-blue-700", "bg-blue-800",
  "bg-teal-700", "bg-emerald-700", "bg-green-800", "bg-lime-700", "bg-yellow-700",
  "bg-orange-700", "bg-red-700", "bg-rose-700", "bg-pink-700", "bg-purple-700"
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

const POPULAR_PODCASTS = [
  { name: "ثمانية", query: "بودكاست ثمانية", image: "https://yt3.googleusercontent.com/yGk9mD8aGk8eB_kU6fE_v8_v8_v8_v8_v8=s176-c-k-c0x00ffffff-no-rj" },
  { name: "محفوف", query: "بودكاست محفوف", image: "https://yt3.googleusercontent.com/ytc/AIdro_kXf_G_v8_v8_v8_v8_v8=s176-c-k-c0x00ffffff-no-rj" },
  { name: "فنجان", query: "بودكاست فنجان", image: "https://yt3.googleusercontent.com/ytc/AIdro_mesiGG76gww2WnpFVUFbMz-s2d4IjJJVhDqJuCVscKLY=s176-c-k-c0x00ffffff-no-rj" },
  { name: "وعي", query: "بودكاست وعي", image: "https://yt3.googleusercontent.com/ytc/AIdro_nN_v8_v8_v8_v8_v8=s176-c-k-c0x00ffffff-no-rj" },
  { name: "سؤال مباشر", query: "بودكاست سؤال مباشر", image: "https://yt3.googleusercontent.com/ytc/AIdro_k_v8_v8_v8_v8_v8=s176-c-k-c0x00ffffff-no-rj" },
  { name: "كتاب مع علي", query: "بودكاست كتاب مع علي", image: "https://yt3.googleusercontent.com/ytc/AIdro_kZ_v8_v8_v8_v8_v8=s176-c-k-c0x00ffffff-no-rj" },
];

interface OccasionSuggestion {
  label: string;
  query: string;
  isDate?: boolean;
  isOman?: boolean;
  isSpecial?: boolean;
  isUpcoming?: boolean;
  isSport?: boolean;
  isLivePriority?: boolean;
  isIptv?: boolean;
  icon?: string;
  iptvChannel?: any;
}

export function MediaView() {
  const { toast } = useToast();
  const { 
    favoriteChannels, setActiveVideo, dockSide, isSidebarShrinked, setIsSidebarShrinked,
    selectedChannel, setSelectedChannel, channelVideos, setChannelVideos,
    favoriteReciters, favoritePodcasts, incrementReciterClick, playlists, addPlaylist, removePlaylist,
    setActiveIptv, favoriteIptvChannels, fetchSpecificBin, mapSettings, updateMapSettings, syncMasterBin,
    savedVideos, setActiveAudio, addChannel, addPodcast, removePodcast
  } = useMediaStore();

  const [search, setSearch] = useState("");
  const [modalSearch, setModalSearch] = useState("");
  const [modalPageSearch, setModalPageSearch] = useState("");
  const [isSearchLocked, setIsSearchLocked] = useState(true);
  const [isPlaylistInputLocked, setIsPlaylistInputLocked] = useState(true);
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [surahs, setSurahs] = useState<any[]>([]);
  const [allSurahs, setAllSurahs] = useState<any[]>([]);
  const [isReciterModalOpen, setIsReciterModalOpen] = useState(false);
  const [selectedReciter, setSelectedReciter] = useState<string | null>(null);
  const [selectedSurah, setSelectedSurah] = useState<string | null>(null);
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isFetchingPlaylists, setIsFetchingPlaylists] = useState(false);
  
  const initialHijri = useMemo(() => getCurrentHijriDate(), []);
  const [hDay, setHDay] = useState(initialHijri.day.toString());
  const [hMonth, setHMonth] = useState(initialHijri.monthName);
  const [hYear, setHYear] = useState(initialHijri.year.toString());

  const [starredLists, setStarredLists] = useState<Record<string, { name: string, vids: YouTubeVideo[] }>>({});
  const [topVideos, setTopVideos] = useState<YouTubeVideo[]>([]);

  const isDockLeft = dockSide === 'left';
  const searchInputRef = useRef<HTMLInputElement>(null);

  const autoFocusResults = useCallback(() => {
    setTimeout(() => {
      const firstVid = document.querySelector('[data-nav-id="podcast-header-card"]') as HTMLElement ||
                      document.querySelector('[data-nav-id="playlist-results-item-0"]') as HTMLElement || 
                      document.querySelector('[data-nav-id="search-results-item-0"]') as HTMLElement ||
                      document.querySelector('[data-nav-id="channel-results-item-0"]') as HTMLElement;
      if (firstVid) {
        firstVid.focus();
        firstVid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 850);
  }, []);

  const handlePlaylistEntry = (id: string) => {
    setSelectedPlaylist(id);
    setSelectedChannel(null);
    setSearchResults([]);
    setIsSidebarShrinked(true);
    autoFocusResults();
  };

  useEffect(() => {
    const handleFocusIn = () => {
      const active = document.activeElement;
      if (active?.closest('[data-nav-zone="content"]')) {
        setIsSidebarShrinked(true);
      }
    };
    window.addEventListener('focusin', handleFocusIn);
    return () => window.removeEventListener('focusin', handleFocusIn);
  }, [setIsSidebarShrinked]);

  useEffect(() => {
    async function fetchVideos() {
      if (selectedChannel) {
        setLoading(true);
        try {
          const vids = await fetchChannelVideos(selectedChannel.channelid);
          setChannelVideos(vids);
          setTimeout(() => {
            const firstVid = document.querySelector('[data-nav-id="channel-results-item-0"]') as HTMLElement;
            if (firstVid) {
              firstVid.focus();
              firstVid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 800);
        } catch (error) {
          console.error("Subscription Videos Error:", error);
        } finally {
          setLoading(false);
        }
      }
    }
    fetchVideos();
  }, [selectedChannel, setChannelVideos]);

  const occasionSuggestions = useMemo(() => {
    const list: OccasionSuggestion[] = [];
    if (favoriteIptvChannels && favoriteIptvChannels.length > 0) {
      const firstIptv = favoriteIptvChannels[0];
      list.push({ label: firstIptv.name, query: firstIptv.url || "", isIptv: true, icon: firstIptv.stream_icon, iptvChannel: firstIptv });
    }
    list.push({ label: `${hDay} ${hMonth} 🕌`, query: `${hDay} ${hMonth} ${hYear} القارئ الحرم`, isDate: true });
    const contextOccasions = getIslamicOccasions(initialHijri);
    contextOccasions.forEach(occ => { if (!occ.label.includes("عمان")) list.push(occ); });
    return list.slice(0, 15);
  }, [initialHijri, favoriteIptvChannels, hDay, hMonth, hYear]);

  useEffect(() => {
    async function fetchHomeContent() {
      const starred = favoriteChannels.filter(c => c.starred);
      if (starred.length === 0) {
        setStarredLists({});
        setTopVideos([]);
        return;
      }
      
      const starredSlice = starred.slice(0, 3);
      
      const [listsResults, topsResults] = await Promise.all([
        Promise.all(starredSlice.map(async (ch) => {
          const vids = await fetchChannelVideos(ch.channelid, 12);
          return { id: ch.channelid, name: ch.name, vids };
        })),
        Promise.all(starred.map(async (ch) => {
          const vids = await fetchChannelVideos(ch.channelid, 10);
          if (vids.length > 0) {
            const topOne = [...vids].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))[0];
            return { ...topOne, channelAvatar: ch.image };
          }
          return null;
        }))
      ]);

      const listsObj: Record<string, any> = {};
      listsResults.forEach(res => { listsObj[res.id] = { name: res.name, vids: res.vids }; });
      setStarredLists(listsObj);
      setTopVideos(topsResults.filter(v => v !== null) as YouTubeVideo[]);
    }
    fetchHomeContent();
  }, [favoriteChannels]);

  const performSearch = async (query?: string) => {
    const q = query || search; if (!q.trim()) return;

    const instaMatch = q.match(/(https?:\/\/(?:www\.)?instagram\.com\/(?:p|reels|reel)\/([^/?#&]+))/);
    if (instaMatch) {
      const baseUrl = instaMatch[1].endsWith('/') ? instaMatch[1] : instaMatch[1] + '/';
      setActiveIptv({
        stream_id: "insta-" + Date.now(),
        name: "محتوى انستجرام",
        stream_icon: "https://www.instagram.com/static/images/ico/favicon.ico/36b30482d362.ico",
        category_id: "direct",
        url: `${baseUrl}embed`,
        type: 'web'
      });
      setSearch("");
      toast({ title: "تم اكتشاف رابط انستجرام", description: "جاري تشغيل المحتوى..." });
      return;
    }

    const listMatch = q.match(/[?&]list=([^&]+)/) || q.match(/playlist list=([^&]+)/);
    if (listMatch) {
      setLoading(true); setSelectedChannel(null); setSelectedPlaylist(null);
      try {
        const data = await fetchYouTubePlaylistVideos(listMatch[1]);
        setSearchResults(data.videos);
        setSearch(data.title);
        toast({ title: "تم استكشاف المجلد", description: data.title });
        autoFocusResults();
      } catch (e) {
        toast({ variant: "destructive", title: "خطأ", description: "فشل جلب محتويات المجلد" });
      } finally { setLoading(false); }
      return;
    }
    setSearch(q); setLoading(true); setSelectedChannel(null); setSelectedPlaylist(null);
    try { 
      const rawRes = await searchYouTubeVideos(q, 40); 
      setSearchResults(rawRes || []); 
      autoFocusResults();
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch("https://api.quran.com/api/v4/chapters?language=ar").then(r => r.json()).then(d => { setSurahs(d.chapters || []); setAllSurahs(d.chapters || []); }); }, []);

  const resetView = () => { setSelectedChannel(null); setSelectedPlaylist(null); setSearchResults([]); setSearch(""); setIsSidebarShrinked(false); setSelectedReciter(null); setSelectedSurah(null); setSelectedJuz(null); setSurahs(allSurahs); };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isSearchLocked) { if (event.key === 'Enter' || event.key === '5') { event.preventDefault(); setIsSearchLocked(false); setTimeout(() => searchInputRef.current?.focus(), 50); } return; }
    if (event.key === 'Enter') { performSearch(); setIsSearchLocked(true); }
  };

  const handlePlaylistInputKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isPlaylistInputLocked) { if (event.key === 'Enter' || event.key === '5') { process.nextTick(() => { setIsPlaylistInputLocked(false); setTimeout(() => searchInputRef.current?.focus(), 50); }); } return; }
    if (event.key === 'Enter') { 
      const input = newPlaylistName.trim(); if (!input) return;
      const listMatch = input.match(/[?&]list=([^&]+)/);
      if (listMatch) {
        toast({ title: "جاري الاستيراد", description: "جاري سحب المجلد السيادي..." });
        const data = await fetchYouTubePlaylistVideos(listMatch[1]);
        addPlaylist(data.title, data.videos);
        toast({ title: "تم الاستيراد بنجاح" });
      } else {
        addPlaylist(input);
      }
      setNewPlaylistName(""); setIsPlaylistInputLocked(true); 
    }
  };

  const handleReciterClick = (r: YouTubeChannel) => { 
    setSelectedReciter(r.name); 
    incrementReciterClick(r.channelid);
    setModalSearch("");
    setModalPageSearch("");
    setIsReciterModalOpen(true);
  };

  const filteredModalSurahs = useMemo(() => {
    if (!modalSearch.trim()) return allSurahs;
    const q = modalSearch.trim().toLowerCase();
    const isNumeric = /^\d+$/.test(q);
    
    return allSurahs.filter(s => {
      if (isNumeric) {
        const num = parseInt(q);
        const start = s.pages?.[0] || s.id;
        const end = s.pages?.[1] || s.id;
        return (num >= start && num <= end) || s.id === num;
      }
      return s.name_arabic.includes(q) || (s.name_simple && s.name_simple.toLowerCase().includes(q));
    });
  }, [allSurahs, modalSearch]);

  const handleJuzClick = (juzNum: number) => { 
    setSelectedJuz(juzNum); 
    const query = selectedReciter ? `${selectedReciter} الجزء ${juzNum}` : `الجزء ${juzNum}`; 
    setSearch(query); 
    setIsReciterModalOpen(false);
    performSearch(query);
  };

  const handleSurahClick = (surahName: string) => { 
    setSelectedSurah(surahName); 
    const query = selectedReciter ? `${selectedReciter} سورة ${surahName}` : `سورة ${surahName}`; 
    setSearch(query); 
    setIsReciterModalOpen(false);
    performSearch(query); 
  };

  const handlePageSearch = () => {
    const pageNum = modalPageSearch.trim();
    if (!pageNum) return;
    const query = selectedReciter ? `${selectedReciter} ص ${pageNum}` : `ص ${pageNum}`;
    setSearch(query);
    setIsReciterModalOpen(false);
    performSearch(query);
  };

  const handleHijriSearch = () => {
    const query = `${selectedReciter || ""} ${hDay} ${hMonth} ${hYear}`;
    setSearch(query);
    setIsReciterModalOpen(false);
    performSearch(query);
  };

  const handleDirectPlaylistFetch = async () => { 
    setIsFetchingPlaylists(true); 
    try { 
      await Promise.all([
        fetchSpecificBin(JSONBIN_MASTER_BIN_ID),
        fetchSpecificBin(JSONBIN_POPULAR_RECITERS_BIN_ID),
        fetchSpecificBin(JSONBIN_CHANNELS_BIN_ID)
      ]); 
    } finally { 
      setIsFetchingPlaylists(false); 
    } 
  };

  const currentPlaylist = useMemo(() => {
    if (selectedPlaylist === 'favorites') return { name: "المفضلات العامة ⭐", videos: savedVideos };
    return playlists.find(p => p.id === selectedPlaylist);
  }, [playlists, selectedPlaylist, savedVideos]);

  const horizontalListClass = "w-full flex gap-4 px-8 py-0 overflow-x-auto no-scrollbar scroll-smooth justify-start items-center";

  const handleAddPodcastClick = () => {
    setSearch("بودكاست ");
    setIsSearchLocked(false);
    setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.setSelectionRange(9, 9);
    }, 100);
  };

  const isPodcastSearch = search.trim().startsWith("بودكاست") || search.trim().startsWith("بزدكاست");
  const podcastIdentity = useMemo(() => {
    if (!isPodcastSearch || searchResults.length === 0) return null;
    const firstResult = searchResults[0];
    return {
      channelId: firstResult.channelId,
      name: firstResult.channelTitle,
      image: firstResult.channelAvatar,
      channeltitle: firstResult.channelTitle
    };
  }, [isPodcastSearch, searchResults]);

  const handleAddPodcastToFavs = async () => {
    if (!podcastIdentity) return;
    addPodcast({
      channelid: podcastIdentity.channelId!,
      name: podcastIdentity.name!,
      image: podcastIdentity.image!,
      channeltitle: podcastIdentity.channeltitle!,
      clickschannel: 0,
      starred: true
    });
    toast({ title: "تم الحفظ سحابياً بنجاح", description: `تمت إضافة ${podcastIdentity.name} إلى ملف القراء والبودكاست السحابي.` });
  };

  const hijriYears = useMemo(() => {
    return Array.from({ length: 1451 - 1380 }, (_, i) => (1380 + i).toString()).reverse();
  }, []);

  const renderVideoGrid = (vids: YouTubeVideo[], rowId: string) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10" data-row-id={rowId}>
      {vids.map((video, idx) => (
        <div key={video.id + idx} className="group bg-white/5 border border-white/5 rounded-[2.5rem] overflow-hidden focusable transition-all hover:bg-white/10 cursor-pointer shadow-xl outline-none" onClick={() => video.isPlaylist ? performSearch(`playlist list=${video.id}`) : setActiveVideo(video, vids)} tabIndex={0} data-nav-id={`${rowId}-item-${idx}`}>
          <div className="aspect-video relative overflow-hidden">
            <img src={video.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
            {video.duration && <div className="absolute bottom-2 right-2 bg-black text-white text-[12px] px-2 py-1 rounded font-black z-10">{video.duration}</div>}
            <div className="absolute top-4 right-4 z-[60] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
              <button onClick={(event) => { event.stopPropagation(); if (!video.isPlaylist) { setActiveAudio({ id: video.id, title: video.title, thumbnail: video.thumbnail, channelTitle: video.channelTitle }); toast({ title: "الوضع الصوتي السيادي", description: `جاري تشغيل: ${video.title}` }); } }} className="w-10 h-10 rounded-full bg-primary text-white backdrop-blur-xl border border-primary/40 flex items-center justify-center hover:bg-primary/80 transition-all shadow-glow active:scale-90"><Music className="w-5 h-5" /></button>
            </div>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary/40 shadow-glow">{video.isPlaylist ? <Library className="w-8 h-8 text-white" /> : <Youtube className="w-8 h-8 text-white fill-white" />}</div></div>
          </div>
          <div className="p-5 space-y-2"><h3 className="text-sm font-black text-white line-clamp-2 leading-tight">{video.title}</h3><div className="flex items-center gap-3 text-[10px] font-bold text-white/40 uppercase tracking-widest"><span>{video.channelTitle}</span></div></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={cn("h-screen flex bg-transparent overflow-hidden relative", isDockLeft ? "flex-row-reverse" : "flex-row")}>
      <aside data-nav-zone="sidebar" className={cn("hidden md:flex h-full z-[110] premium-glass flex flex-col shrink-0 border-white/5 bg-black/60 transition-all duration-300", isSidebarShrinked ? "w-[80px]" : "w-[28%]", isDockLeft ? "border-l" : "border-r")}>
        <div className="p-4 flex items-center justify-between border-b border-white/5"><button className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center focusable border border-primary/20" tabIndex={0} data-nav-id="sidebar-add-btn"><Plus className="w-5 h-5" /></button></div>
        <div className="flex-1 overflow-y-auto py-2 no-scrollbar">
          <div data-row-id="sidebar-main-actions"><div onClick={resetView} className={cn("flex items-center justify-center gap-3 p-3 cursor-pointer focusable w-[90%] mx-auto rounded-xl", !selectedChannel && !selectedPlaylist && searchResults.length === 0 ? "bg-primary text-white" : "hover:bg-white/5")} tabIndex={0} data-nav-id="sidebar-all-btn"><List className="w-5 h-5" />{!isSidebarShrinked && <span className="font-black text-sm">الكل</span>}</div></div>
          <div className="px-4 py-4 space-y-6" data-row-id="sidebar-desktop-sections">
              <div className="space-y-3" data-row-id="sidebar-playlists">
                 <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-2">مجلداتك السيادية</h4>
                 <div onClick={() => handlePlaylistEntry('favorites')} className={cn( "flex items-center justify-between p-1.5 px-3 rounded-xl cursor-pointer transition-all focusable group border", selectedPlaylist === 'favorites' ? "bg-amber-600 border-amber-400 text-white shadow-glow" : "bg-amber-900/10 border-white/5 text-white/80" )} tabIndex={0} data-nav-id="sidebar-playlist-favorites"><div className="flex items-center gap-3"><div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shadow-lg", selectedPlaylist === 'favorites' ? "bg-white/20" : "bg-amber-600")}><Star className="w-3.5 h-3.5 text-white" /></div><div className="flex flex-col min-w-0"><span className="text-[11px] font-black truncate max-w-[90px] tracking-tighter">المفضلات ⭐</span><span className="text-[7px] font-black opacity-60 uppercase">{savedVideos.length} فيديو</span></div></div></div>
                 {playlists.map((p, idx) => (
                   <div key={p.id} onClick={() => handlePlaylistEntry(p.id)} className={cn("flex items-center justify-between p-1.5 px-3 rounded-xl cursor-pointer transition-all focusable group border", selectedPlaylist === p.id ? "bg-indigo-600 border-indigo-400 text-white shadow-glow" : "bg-indigo-900/10 border-white/5 text-white/80")} tabIndex={0} data-nav-id={`sidebar-playlist-${idx}`}><div className="flex items-center gap-3"><div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shadow-lg", selectedPlaylist === 'favorites' ? "bg-white/20" : "bg-indigo-600")}><Library className="w-3.5 h-3.5 text-white" /></div><div className="flex flex-col min-w-0"><span className="text-[11px] font-black truncate max-w-[90px] tracking-tighter">{p.name}</span><span className="text-[7px] font-black opacity-60 uppercase">{p.videos.length} تلاوة</span></div></div><button onClick={(event) => { event.stopPropagation(); removePlaylist(p.id); }} className="w-7 h-7 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focusable shrink-0 ml-2"><Trash2 className="w-4 h-4" /></button></div>
                 ))}
                 <div className="flex gap-2 pt-1 px-2 items-center" data-row-id="sidebar-new-playlist"><Input value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} onKeyDown={handlePlaylistInputKeyDown} onDoubleClick={() => setIsPlaylistInputLocked(false)} readOnly={isPlaylistInputLocked} placeholder={isPlaylistInputLocked ? "5 للكتابة..." : "رابط مجلد أو اسم..."} className={cn("h-10 border-none text-xs rounded-xl focusable transition-all flex-1", isPlaylistInputLocked ? "bg-white/5 text-white/30" : "bg-white/10 text-white")} data-nav-id="sidebar-playlist-input-0" />{!isPlaylistInputLocked && <button onClick={() => { if(newPlaylistName.trim()) performSearch(newPlaylistName); setNewPlaylistName(""); setIsPlaylistInputLocked(true); }} className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-glow animate-in zoom-in duration-300"><Send className="w-5 h-5" /></button>}</div>
              </div>

              <div className="space-y-3 pt-6 border-t border-white/5" data-row-id="sidebar-subscriptions">
                 <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-2">الاشتراكات السيادية</h4>
                 <div className="flex flex-col gap-1">
                    {favoriteChannels.map((ch, idx) => (
                      <div 
                        key={ch.channelid} 
                        onClick={() => { setSelectedChannel(ch); setSelectedPlaylist(null); setSearchResults([]); setIsSidebarShrinked(true); }}
                        className={cn("flex items-center gap-4 p-2 px-3 rounded-xl cursor-pointer transition-all focusable hover:bg-white/5", selectedChannel?.channelid === ch.channelid && "bg-primary/10 border-primary/20")}
                        tabIndex={0}
                        data-nav-id={`sidebar-channel-${idx}`}
                      >
                         <img src={ch.image} className="w-7 h-7 rounded-full border border-white/10 shadow-lg" alt="" />
                         {!isSidebarShrinked && <span className="text-[11px] font-black text-white/80 truncate flex-1">{ch.name}</span>}
                      </div>
                    ))}
                 </div>
              </div>
          </div>
        </div>
      </aside>

      <main data-nav-zone="content" className="flex-1 overflow-y-auto relative pt-52 min-[968px]:pt-32 pb-40 px-10 no-scrollbar" style={{ direction: isDockLeft ? 'ltr' : 'rtl' }}>
        <section data-row-id="row-search" className="py-4 space-y-6 pt-20 md:pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1"><Input ref={searchInputRef} placeholder={isSearchLocked ? "اضغط 5 للكتابة أو الصق رابطاً..." : "ابحث عن تلاوة أو الصق رابط يوتيوب/انستجرام..."} value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={handleSearchKeyDown} onDoubleClick={() => setIsSearchLocked(false)} readOnly={isSearchLocked} className={cn("h-16 border-none rounded-[2rem] pr-10 text-xl font-bold focusable", isSearchLocked ? "bg-white/5 text-white/30" : "bg-white/10 text-white")} data-nav-id="content-search-input-0" /></div>
            <button onClick={() => performSearch()} className={cn("h-14 bg-red-600 text-white font-black text-base focusable flex items-center justify-center transition-all px-6 rounded-full md:px-8 md:rounded-[2rem]")} data-nav-id="content-search-btn-0">
              <Youtube className="w-6 h-6 ml-3 hidden md:block" /> 
              <span className="hidden md:inline">استكشاف</span>
              <span className="md:hidden">بحث</span>
            </button>
            <Button onClick={handleDirectPlaylistFetch} variant="outline" size="icon" className="w-16 h-16 rounded-[2rem] bg-indigo-600/20 text-indigo-400 border-indigo-500/30 ml-4 shadow-glow focusable" data-nav-id="content-cloud-fetch-0"><CloudDownload className={cn("w-6 h-6", isFetchingPlaylists && "animate-spin")} /></Button>
          </div>
        </section>

        {!selectedChannel && !selectedPlaylist && searchResults.length === 0 && (
          <div className="space-y-12">
            {/* 1. Folders & Podcasts ALWAYS AT TOP */}
            <section data-row-id="row-all-playlists" className="py-4">
              <div className="px-10 mb-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-glow"><Library className="w-6 h-6 text-white" /></div>
                <h2 className="text-2xl font-black text-white uppercase tracking-widest">المجلدات والترددات المجرسة</h2>
              </div>
              <div className={horizontalListClass}>
                <div onClick={() => handlePlaylistEntry('favorites')} className="w-80 h-48 group relative overflow-hidden bg-zinc-900 border-2 border-amber-500/20 rounded-[2.5rem] focusable cursor-pointer shrink-0 flex flex-col justify-end p-6 shadow-2xl transition-all outline-none" tabIndex={0} data-nav-id="all-playlist-favorites">
                  {savedVideos.length > 0 && (<div className="absolute inset-0 z-0"><img src={savedVideos[0].thumbnail} className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" alt="" /><div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" /></div>)}
                  <div className="relative z-10 text-right"><span className="text-2xl font-black text-white tracking-tighter drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] leading-tight">المفضلات العامة ⭐</span><div className="mt-2 flex items-center gap-2"><div className="px-3 py-1 bg-amber-600/40 backdrop-blur-md rounded-full border border-amber-400/30"><span className="text-[9px] font-black text-white uppercase tracking-widest">{savedVideos.length} فيديو</span></div></div></div>
                </div>

                {playlists.map((p, pIdx) => (
                  <div key={p.id} onClick={() => handlePlaylistEntry(p.id)} className="w-80 h-48 group relative overflow-hidden bg-zinc-900 border-2 border-white/10 rounded-[2.5rem] focusable cursor-pointer shrink-0 flex flex-col justify-end p-6 shadow-2xl transition-all outline-none" tabIndex={0} data-nav-id={`all-playlist-${pIdx}`}>{p.videos.length > 0 && (<div className="absolute inset-0 z-0"><img src={p.videos[0].thumbnail} className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" alt="" /><div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" /></div>)}<div className="relative z-10 text-right"><span className="text-2xl font-black text-white tracking-tighter drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] text-xl leading-tight">{p.name}</span><div className="mt-2 flex items-center gap-2"><div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/20"><span className="text-[9px] font-black text-white uppercase tracking-widest">{p.videos.length} تلاوة</span></div></div></div></div>
                ))}

                {favoritePodcasts.map((pod, i) => (
                  <button 
                    key={`fav-pod-${i}`} 
                    onClick={() => performSearch(pod.name)}
                    className="flex flex-col items-center gap-4 px-6 py-4 rounded-[3rem] focusable bg-white/5 border border-white/10 shrink-0 transition-all hover:bg-emerald-600/10 hover:border-emerald-500/40 shadow-xl group relative"
                    tabIndex={0}
                    data-nav-id={`fav-podcast-item-${i}`}
                  >
                     <button onClick={(event) => { event.stopPropagation(); removePodcast(pod.channelid); toast({ title: "تم الحذف سحابياً" }); }} className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity focusable z-30 shadow-glow"><Trash2 className="w-4 h-4" /></button>
                     <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-emerald-500/20 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                        <img src={pod.image} className="w-full h-full object-cover" alt={pod.name} />
                     </div>
                     <div className="flex flex-col items-center">
                        <span className="text-[12px] font-black text-white">{pod.name}</span>
                        <div className="mt-1 px-2 py-0.5 bg-emerald-600/20 rounded-full border border-emerald-500/20">
                           <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest">بودكاست محفوظ</span>
                        </div>
                     </div>
                  </button>
                ))}

                {POPULAR_PODCASTS.map((pod, i) => (
                  <button 
                    key={i} 
                    onClick={() => performSearch(pod.query)}
                    className="flex flex-col items-center gap-4 px-6 py-4 rounded-[3rem] focusable bg-white/5 border border-white/10 shrink-0 transition-all hover:bg-emerald-600/10 hover:border-emerald-500/40 shadow-xl group"
                    tabIndex={0}
                    data-nav-id={`podcast-item-${i}`}
                  >
                     <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-emerald-500/20 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                        <img src={pod.image} className="w-full h-full object-cover" alt={pod.name} />
                     </div>
                     <div className="flex flex-col items-center">
                        <span className="text-[12px] font-black text-white">{pod.name}</span>
                        <div className="mt-1 px-2 py-0.5 bg-emerald-600/20 rounded-full border border-emerald-500/20">
                           <span className="text-[7px] font-black text-emerald-400 uppercase tracking-widest">اقتراح</span>
                        </div>
                     </div>
                  </button>
                ))}

                <button 
                  onClick={handleAddPodcastClick}
                  className="w-32 h-32 rounded-full border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-2 text-white/20 hover:border-emerald-500 hover:text-emerald-500 transition-all focusable shrink-0 ml-10"
                  data-nav-id="add-podcast-btn"
                >
                  <Plus className="w-10 h-10" />
                  <span className="text-[8px] font-black uppercase tracking-widest">إضافة بودكاست</span>
                </button>
              </div>
            </section>

            {/* 2. Reciters Section */}
            <section data-row-id="row-reciters" className="py-2">
              <div className="px-10 mb-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-glow"><Mic className="w-6 h-6 text-white" /></div>
                <h2 className="text-2xl font-black text-white uppercase tracking-widest">نخبة القراء المختارين</h2>
              </div>
              <div className={cn(horizontalListClass, "gap-8")}>
                  {favoriteReciters.map((r, i) => (
                    <button key={i} className={cn("flex flex-col items-center gap-4 px-4 py-4 rounded-[2.5rem] focusable border-2 shrink-0 transition-all", selectedReciter === r.name ? "border-emerald-500 bg-emerald-500/10 shadow-glow" : "border-transparent hover:bg-emerald-600/10")} onClick={() => handleReciterClick(r)} tabIndex={0} data-nav-id={`reciter-item-${i}`}>
                      <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-emerald-500/30 shadow-2xl"><img src={r.image} className="w-full h-full object-cover" alt="" /></div>
                      <span className="text-[10px] font-black text-white">{r.name}</span>
                    </button>
                  ))}
              </div>
            </section>

            {/* 3. Subscriptions (Shown Below Reciters ONLY in Mobile Range < 550px) */}
            <section data-row-id="row-subscriptions-mobile" className="py-2 show-subs-under-reciters">
              <div className="px-10 mb-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center"><Youtube className="w-5 h-5 text-white" /></div>
                <h2 className="text-lg font-black text-white/60">الاشتراكات السيادية</h2>
              </div>
              <div className={cn(horizontalListClass, "gap-3")}>
                  {favoriteChannels.map((ch, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => { setSelectedChannel(ch); setSelectedPlaylist(null); setSearchResults([]); setIsSidebarShrinked(true); }}
                      className="flex flex-col items-center gap-2 px-2 py-2 rounded-2xl focusable shrink-0 transition-all active:scale-95"
                      tabIndex={0}
                      data-nav-id={`mobile-sub-avatar-${idx}`}
                    >
                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-primary/20 shadow-lg"><img src={ch.image} className="w-full h-full object-cover" alt="" /></div>
                      <span className="text-[7px] font-black text-white/40 truncate w-14 text-center uppercase tracking-tighter">{ch.name}</span>
                    </button>
                  ))}
              </div>
            </section>
          </div>
        )}

        <section data-row-id="row-occasions" className="py-8">
          <div className={cn(horizontalListClass, "gap-3")}>
            {occasionSuggestions.map((occ, i) => (
              <div key={i} className="relative group shrink-0">
                <button onClick={() => { if (occ.isIptv && occ.iptvChannel) { setActiveIptv(occ.iptvChannel); } else { performSearch(occ.query); } }} className={cn("px-4 py-2 text-[10px] min-[968px]:text-[12px] min-[968px]:px-5 min-[968px]:py-3 rounded-full font-black focusable border-2 shrink-0 transition-all shadow-lg", occ.isDate ? "bg-white text-black border-white" : occ.isOman || occ.isIptv ? "bg-primary text-white border-primary/40 animate-pulse" : "bg-white/5 text-white/60 border-white/10")} data-nav-id={`occ-item-${i}`}><div className="flex items-center gap-2">{occ.isIptv ? <img src={occ.icon} className="w-4 h-4 min-[968px]:w-5 min-[968px]:h-5 rounded-full border border-white/20" alt="" /> : <Sparkles className="w-3 h-3 min-[968px]:w-4 min-[968px]:h-4" />}{occ.label}</div></button>
              </div>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center py-40"><Loader2 className="w-16 h-16 animate-spin text-primary" /></div>
        ) : searchResults.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-10 mt-10">
              <h2 className="text-3xl font-black text-white flex items-center gap-4">
                <Search className="w-8 h-8 text-primary" /> نتائج استكشاف "{search}"
              </h2>
              <Button onClick={resetView} className="h-12 px-6 rounded-full bg-red-600/20 text-red-500 border border-red-500/40 font-black focusable flex items-center gap-2"><X className="w-5 h-5" /> إغلاق النتائج</Button>
            </div>

            {(search.trim().startsWith("بودكاست") || search.trim().startsWith("بزدكاست")) && podcastIdentity && (
              <div className="px-10 mb-8 animate-in zoom-in-95 duration-500">
                 <Card 
                  onClick={handleAddPodcastToFavs}
                  className="bg-emerald-600/10 border-2 border-emerald-500/40 rounded-[3rem] p-8 flex items-center justify-between group focusable cursor-pointer shadow-[0_0_80px_rgba(16,185,129,0.2)] transition-all hover:bg-emerald-600/20"
                  tabIndex={0}
                  data-nav-id="podcast-header-card"
                 >
                    <div className="flex items-center gap-8">
                       <div className="relative">
                          <img src={podcastIdentity.image} className="w-32 h-32 rounded-full border-4 border-emerald-500/40 shadow-2xl group-hover:scale-110 transition-transform" alt="" />
                          <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-black rounded-full p-2 shadow-glow">
                             <Youtube className="w-6 h-6 fill-current" />
                          </div>
                       </div>
                       <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-3">
                             <h3 className="text-4xl font-black text-white tracking-tighter">{podcastIdentity.name}</h3>
                             <div className="px-3 py-1 bg-emerald-500 text-black text-[10px] font-black rounded-lg shadow-glow uppercase">بودكاست سيادي</div>
                          </div>
                          <p className="text-white/40 font-bold text-sm">تم التعرف على القناة تلقائياً.. اضغط للإضافة إلى ملف البودكاست السحابي</p>
                       </div>
                    </div>
                    <Button className="h-16 px-10 bg-emerald-500 text-black font-black text-xl rounded-2xl shadow-glow group-hover:scale-105 transition-all">
                       <Plus className="w-8 h-8 ml-3" /> حفظ سحابياً كبودكاست
                    </Button>
                 </Card>
              </div>
            )}

            {renderVideoGrid(searchResults, "search-results")}
          </div>
        ) : selectedPlaylist ? (
          <div className="space-y-10 mt-10"><div className="flex items-center justify-between px-10"><h2 className="text-4xl font-black text-white tracking-tighter flex items-center gap-5"><Library className="w-10 h-10 text-indigo-400" /> {currentPlaylist?.name}</h2><Button onClick={() => { setSelectedPlaylist(null); resetView(); }} className="h-14 px-8 rounded-full bg-white/5 border border-white/10 text-white font-black focusable">إغلاق المجلد</Button></div>{currentPlaylist ? renderVideoGrid(currentPlaylist.videos, "playlist-results") : null}</div>
        ) : selectedChannel ? (
          <div className="space-y-10 mt-10"><div className="flex items-center justify-between px-10"><h2 className="text-4xl font-black text-white tracking-tighter flex items-center gap-5"><img src={selectedChannel.image} className="w-14 h-14 rounded-full border-2 border-white/20" alt="" /> {selectedChannel.name}</h2><Button onClick={() => { setSelectedChannel(null); resetView(); }} className="h-14 px-8 rounded-full bg-white/5 border border-white/10 text-white font-black focusable">إغلاق القناة</Button></div>{renderVideoGrid(channelVideos, "channel-results")}</div>
        ) : (
          <div className="space-y-16 mt-10">
            {Object.entries(starredLists).map(([cid, data], idx) => (
              <section key={cid} data-row-id={`row-starred-${idx}`} className="py-4">
                <div className="px-10 mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-glow bg-yellow-500"><Star className="w-6 h-6 text-black fill-current" /></div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-widest">{`أحدث تلاوات: ${data.name}`}</h2>
                  </div>
                </div>
                <div className={horizontalListClass}>{data.vids.map((video, vIdx) => (
                  <div key={video.id + vIdx} className="w-80 group bg-white/5 border border-white/5 rounded-[2.5rem] overflow-hidden focusable transition-all hover:bg-white/10 cursor-pointer shadow-xl outline-none shrink-0" onClick={() => setActiveVideo(video, data.vids)} tabIndex={0} data-nav-id={`starred-video-${idx}-${vIdx}`}>
                    <div className="aspect-video relative overflow-hidden">
                      <img src={video.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                      <div className="absolute top-4 right-4 z-[60] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                        <button onClick={(event) => { event.stopPropagation(); if (!video.isPlaylist) { setActiveAudio({ id: video.id, title: video.title, thumbnail: video.thumbnail, channelTitle: video.channelTitle }); toast({ title: "الوضع الصوتي السيادي", description: `جاري تشغيل: ${video.title}` }); } }} className="w-10 h-10 rounded-full bg-primary text-white border border-primary/40 flex items-center justify-center hover:bg-primary/80 shadow-glow active:scale-90"><Music className="w-5 h-5" /></button>
                      </div>
                    </div>
                    <div className="p-4 space-y-2"><h3 className="text-xs font-black text-white line-clamp-2 leading-tight">{video.title}</h3></div>
                  </div>
                ))}</div>
              </section>
            ))}
          </div>
        )}
      </main>

      <Dialog open={isReciterModalOpen} onOpenChange={setIsReciterModalOpen}>
        <DialogContent className="max-w-[95vw] w-[1200px] bg-black/95 backdrop-blur-3xl border-white/10 rounded-[3.5rem] p-10 shadow-2xl focus:outline-none overflow-hidden" dir="rtl">
           <DialogHeader className="mb-8 flex flex-row items-center justify-between">
              <DialogTitle className="text-4xl font-black text-white flex items-center gap-5">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 flex items-center justify-center border border-emerald-500/40">
                    <Mic className="w-6 h-6 text-emerald-400" />
                 </div>
                 تخصيص تلاوات القارئ: <span className="text-emerald-400">{selectedReciter}</span>
              </DialogTitle>
              <Button 
                onClick={() => setIsReciterModalOpen(false)} 
                variant="ghost" 
                className="w-16 h-16 rounded-full bg-white/5 border border-white/10 hover:bg-red-600/20 hover:text-red-500 transition-all focusable flex items-center justify-center"
                data-nav-id="modal-close-btn"
              >
                <X className="w-10 h-10" />
              </Button>
           </DialogHeader>

           <Tabs defaultValue="surahs" className="w-full">
              <TabsList className="bg-white/5 p-1 rounded-full border border-white/10 h-16 mb-8 flex gap-2 overflow-x-auto no-scrollbar">
                 <TabsTrigger value="surahs" className="flex-1 rounded-full font-black text-lg focusable transition-none text-white data-[state=active]:bg-primary data-[state=active]:text-white">السور</TabsTrigger>
                 <TabsTrigger value="juz" className="flex-1 rounded-full font-black text-lg focusable transition-none text-white data-[state=active]:bg-primary data-[state=active]:text-white">الأجزاء</TabsTrigger>
                 <TabsTrigger value="pages" className="flex-1 rounded-full font-black text-lg focusable transition-none text-white data-[state=active]:bg-primary data-[state=active]:text-white">الصفحات</TabsTrigger>
                 <TabsTrigger value="hijri" className="flex-1 rounded-full font-black text-lg focusable transition-none text-white data-[state=active]:bg-primary data-[state=active]:text-white">التاريخ الهجري</TabsTrigger>
              </TabsList>

              <TabsContent value="surahs" className="animate-in fade-in duration-300">
                 <div className="mb-6">
                    <Input 
                      placeholder="ابحث عن سورة أو رقم صفحة..." 
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      className="h-14 bg-white/5 border-white/10 rounded-2xl text-xl font-black text-white px-6 focusable placeholder:text-white placeholder:opacity-100"
                    />
                 </div>
                 <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 max-h-[50vh] overflow-y-auto pr-4 no-scrollbar" data-nav-id="modal-surahs-grid">
                    {filteredModalSurahs.map((s, i) => {
                       const juzNum = Object.entries(JUZ_SURAH_MAP).find(([j, ids]) => ids.includes(s.id))?.[0] || 1;
                       const colorClass = JUZ_COLORS[parseInt(juzNum as string) - 1] || "bg-zinc-800";
                       const searchNum = parseInt(modalSearch.trim());
                       const isNumericSearch = !isNaN(searchNum);
                       
                       return (
                         <button 
                            key={i} 
                            onClick={() => handleSurahClick(s.name_arabic)}
                            className={cn(
                              "h-12 px-4 rounded-full text-white font-black text-[12px] flex items-center justify-between transition-all hover:scale-105 active:scale-95 focusable border-2 border-white/5 shadow-xl",
                              colorClass
                            )}
                            tabIndex={0}
                            data-nav-id={`modal-surah-${i}`}
                         >
                            <span className="text-white font-black text-[10px] ml-2 bg-black/40 px-2 py-0.5 rounded-full shadow-inner">
                              ص {isNumericSearch ? searchNum : (s.pages ? s.pages[0] : s.id)}
                            </span>
                            <span className="truncate">سورة {s.name_arabic}</span>
                         </button>
                       );
                    })}
                 </div>
              </TabsContent>

              <TabsContent value="juz" className="animate-in fade-in duration-300">
                 <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 max-h-[50vh] overflow-y-auto pr-4 no-scrollbar" data-nav-id="modal-juz-grid">
                    {[...Array(30).keys()].map(i => (
                       <button 
                          key={i} 
                          onClick={() => handleJuzClick(i+1)}
                          className={cn(
                            "h-16 rounded-[1.5rem] text-white font-black text-lg shadow-xl hover:scale-105 active:scale-95 transition-all focusable flex items-center justify-center gap-3 border-2 border-white/5",
                            JUZ_COLORS[i]
                          )}
                          tabIndex={0}
                          data-nav-id={`modal-juz-${i}`}
                       >
                          الجزء <span className="text-2xl text-white">{(i+1).toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)])}</span>
                       </button>
                    ))}
                 </div>
              </TabsContent>

              <TabsContent value="pages" className="animate-in fade-in duration-300">
                 <div className="bg-white/5 p-12 rounded-[3rem] border border-white/10 space-y-8 text-center shadow-2xl">
                    <h3 className="text-3xl font-black text-white">البحث برقم الصفحة</h3>
                    <div className="max-w-md mx-auto space-y-6">
                       <Input 
                          type="number"
                          placeholder="أدخل رقم الصفحة (1-604)..."
                          value={modalPageSearch}
                          onChange={(e) => setModalPageSearch(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handlePageSearch()}
                          className="h-20 bg-black/40 border-white/10 rounded-[2rem] text-4xl font-black text-center text-primary focusable"
                       />
                       <Button 
                          onClick={handlePageSearch}
                          className="h-16 w-full bg-primary text-white font-black text-xl rounded-2xl shadow-glow transition-all active:scale-95 focusable"
                       >
                          <Search className="w-6 h-6 ml-3" /> استكشاف الصفحة
                       </Button>
                    </div>
                    <p className="text-white/20 font-bold text-sm">سيقوم النظام بالبحث عن تلاوات تبدأ من الصفحة المحددة للقارئ المختار.</p>
                 </div>
              </TabsContent>

              <TabsContent value="hijri" className="animate-in fade-in duration-300">
                 <div className="bg-white/5 p-12 rounded-[3rem] border border-white/10 space-y-10 text-center shadow-2xl">
                    <h3 className="text-3xl font-black text-white">تخصيص التوقيت الهجري</h3>
                    <div className="flex flex-wrap justify-center gap-6">
                       <div className="space-y-3">
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">اليوم</span>
                          <Select value={hDay} onValueChange={setHDay}>
                             <SelectTrigger className="w-24 h-16 bg-black/40 border-white/10 rounded-2xl text-2xl font-black text-white focusable"><SelectValue /></SelectTrigger>
                             <SelectContent className="bg-zinc-950 border-white/10 h-60">
                                {[...Array(30).keys()].map(d => (
                                  <SelectItem key={d+1} value={(d+1).toString()} className="text-xl font-bold">{d+1}</SelectItem>
                                ))}
                             </SelectContent>
                          </Select>
                       </div>

                       <div className="space-y-3">
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">الشهر الهجري</span>
                          <Select value={hMonth} onValueChange={setHMonth}>
                             <SelectTrigger className="w-56 h-16 bg-black/40 border-white/10 rounded-2xl text-xl font-black text-white focusable"><SelectValue /></SelectTrigger>
                             <SelectContent className="bg-zinc-950 border-white/10">
                                {HIJRI_MONTHS.map(m => (
                                  <SelectItem key={m} value={m} className="text-lg font-bold">{m}</SelectItem>
                                ))}
                             </SelectContent>
                          </Select>
                       </div>

                       <div className="space-y-3">
                          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">السنة</span>
                          <Select value={hYear} onValueChange={setHYear}>
                             <SelectTrigger className="w-32 h-16 bg-black/40 border-white/10 rounded-2xl text-xl font-black text-white focusable"><SelectValue /></SelectTrigger>
                             <SelectContent className="bg-zinc-950 border-white/10 h-64">
                                {hijriYears.map(y => (
                                  <SelectItem key={y} value={y} className="text-lg font-bold">{y}</SelectItem>
                                ))}
                             </SelectContent>
                          </Select>
                       </div>
                    </div>
                    
                    <Button 
                       onClick={handleHijriSearch}
                       className="h-16 px-16 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl rounded-2xl shadow-glow transition-all active:scale-95 focusable mt-4"
                       tabIndex={0}
                    >
                       <Search className="w-6 h-6 ml-3" /> استكشاف التلاوات
                    </Button>
                 </div>
              </TabsContent>
           </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
