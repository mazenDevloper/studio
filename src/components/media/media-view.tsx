"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Radio, Loader2, Check, Mic, Users, Cloud, Star, X, Bookmark, Link as LinkIcon, BookOpen, ChevronDown } from "lucide-react";
import { useMediaStore } from "@/lib/store";
import { searchYouTubeChannels, searchYouTubeVideos, fetchChannelVideos, fetchVideoDetails, YouTubeChannel, YouTubeVideo } from "@/lib/youtube";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { JSONBIN_RECITERS_BIN_ID, JSONBIN_ACCESS_KEY_CHANNELS, SURAHS_LIST } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function MediaView() {
  const { 
    favoriteChannels, 
    addChannel, 
    removeChannel, 
    savedVideos, 
    toggleSaveVideo, 
    setActiveVideo,
    toggleStarChannel
  } = useMediaStore();

  const searchParams = useSearchParams();
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [videoResults, setVideoResults] = useState<YouTubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<YouTubeChannel | null>(null);
  const [channelVideos, setChannelVideos] = useState<YouTubeVideo[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Quran Selection State
  const [reciters, setReciters] = useState<any[]>([]);
  const [selectedReciter, setSelectedReciter] = useState<any>(null);
  const [isLoadingReciters, setIsLoadingReciters] = useState(false);
  const [showReciterGrid, setShowReciterGrid] = useState(false);
  const [showSurahGrid, setShowSurahGrid] = useState(false);

  // URL Adding State
  const [urlInput, setUrlInput] = useState("");
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
  const [isAddingByUrl, setIsAddingByUrl] = useState(false);

  const [channelSearchQuery, setChannelSearchQuery] = useState("");
  const [channelResults, setChannelResults] = useState<YouTubeChannel[]>([]);
  const [isSearchingChannels, setIsSearchingChannels] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Smart Focus on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    async function fetchReciters() {
      setIsLoadingReciters(true);
      try {
        const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_RECITERS_BIN_ID}/latest`, {
          headers: { 'X-Access-Key': JSONBIN_ACCESS_KEY_CHANNELS }
        });
        const data = await res.json();
        if (data.record && Array.isArray(data.record)) {
          setReciters(data.record);
        }
      } catch (error) {
        console.error("Failed to fetch reciters", error);
      } finally {
        setIsLoadingReciters(false);
      }
    }
    fetchReciters();
  }, []);

  const handleVideoSearch = useCallback(async (queryOverride?: string) => {
    const finalQuery = queryOverride || searchQuery;
    if (!finalQuery.trim()) return;
    setIsSearching(true);
    setSelectedChannel(null);
    try {
      const results = await searchYouTubeVideos(finalQuery);
      setVideoResults(results);
      setShowReciterGrid(false);
      setShowSurahGrid(false);
      
      // Auto focus first result
      setTimeout(() => {
        const firstCard = document.querySelector('.video-result-card') as HTMLElement;
        if (firstCard) firstCard.focus();
      }, 500);
    } catch (error) {
      console.error("Video search failed", error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setSearchQuery(q);
      handleVideoSearch(q);
    }
  }, [searchParams, handleVideoSearch]);

  const handleSurahClick = (surahName: string) => {
    if (!selectedReciter) return;
    const query = `${selectedReciter.name} سورة ${surahName}`;
    setSearchQuery(query);
    handleVideoSearch(query);
    setShowSurahGrid(false);
    setShowReciterGrid(false);
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      handleVideoSearch(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleAddVideoByUrl = async () => {
    if (!urlInput.trim()) return;
    const videoIdMatch = urlInput.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/|youtube\.com\/(?:shorts\/))([\w-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : urlInput.trim();
    if (videoId.length !== 11) return;

    setIsAddingByUrl(true);
    try {
      const video = await fetchVideoDetails(videoId);
      if (video) toggleSaveVideo(video);
      setIsUrlDialogOpen(false);
      setUrlInput("");
    } catch (error) {
      console.error(error);
    } finally {
      setIsAddingByUrl(false);
    }
  };

  const handleChannelSearch = async () => {
    if (!channelSearchQuery.trim()) return;
    setIsSearchingChannels(true);
    try {
      const results = await searchYouTubeChannels(channelSearchQuery);
      setChannelResults(results);
    } finally {
      setIsSearchingChannels(false);
    }
  };

  const handleSelectChannel = async (channel: YouTubeChannel) => {
    setSelectedChannel(channel);
    setIsLoadingVideos(true);
    try {
      const videos = await fetchChannelVideos(channel.channelid);
      setChannelVideos(videos);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const getJuzColor = (juz: number) => {
    if (juz <= 5) return "border-blue-500/40 bg-blue-500/10 text-blue-400";
    if (juz <= 10) return "border-emerald-500/40 bg-emerald-500/10 text-emerald-400";
    if (juz <= 15) return "border-amber-500/40 bg-amber-500/10 text-amber-400";
    if (juz <= 20) return "border-purple-500/40 bg-purple-500/10 text-purple-400";
    if (juz <= 25) return "border-rose-500/40 bg-rose-500/10 text-rose-400";
    return "border-cyan-500/40 bg-cyan-500/10 text-cyan-400";
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto pb-32 min-h-screen relative dir-rtl safe-p-top">
      <header className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div className="text-right">
            <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tighter text-white">DriveCast Media</h1>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest opacity-60">iPhone Fluid Experience</p>
          </div>
          <div className="flex items-center gap-4">
            <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="h-12 px-6 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 focusable flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">إضافة بالرابط</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-950 border-white/10 rounded-[2.5rem] p-8 max-w-md iphone-fluid-glass">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-white mb-4 text-right">إضافة فيديو بالرابط</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <Input 
                    placeholder="https://youtu.be/..." 
                    value={urlInput} 
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="h-14 bg-white/5 border-white/10 rounded-2xl px-6 text-white focusable text-right"
                  />
                  <div className="flex gap-4">
                    <Button onClick={handleAddVideoByUrl} disabled={isAddingByUrl} className="flex-1 h-14 bg-primary text-white font-black rounded-2xl shadow-xl focusable">
                      {isAddingByUrl ? <Loader2 className="w-6 h-6 animate-spin" /> : "إضافة الفيديو"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-stretch">
          {/* Reciter Grid - 50% Right */}
          <div className="w-full md:w-1/2 flex flex-col gap-3 order-1">
            <div className="flex items-center gap-2 px-2">
              <Users className="w-4 h-4 text-primary" />
              <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">اختيار القارئ</label>
            </div>
            
            {!showReciterGrid ? (
              <Button
                onClick={() => setShowReciterGrid(true)}
                className="h-20 w-full rounded-[2rem] bg-white/5 border-2 border-white/10 text-white font-black text-xl hover:bg-white/10 transition-all shadow-xl focusable flex items-center justify-between px-8 text-right"
              >
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                     <Users className="w-6 h-6 text-primary" />
                   </div>
                   <span>{selectedReciter ? selectedReciter.name : "اختر القارئ المفضل"}</span>
                </div>
                <ChevronDown className="w-6 h-6 opacity-40" />
              </Button>
            ) : (
              <div className="iphone-fluid-glass border-2 border-primary/40 rounded-[2.5rem] p-4 relative animate-in zoom-in-95 duration-500 shadow-[0_0_50px_rgba(var(--primary),0.1)]">
                <div className="flex items-center justify-between mb-4 px-2">
                  <span className="text-xs font-black text-primary uppercase tracking-[0.2em]">قائمة القراء المتاحة</span>
                  <Button variant="ghost" size="icon" onClick={() => setShowReciterGrid(false)} className="rounded-full w-8 h-8 text-white/40 hover:text-white hover:bg-white/10 focusable">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {isLoadingReciters ? (
                  <div className="h-40 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : (
                  <ScrollArea className="h-60 pr-2">
                    <div className="grid grid-cols-2 gap-3 pb-4">
                      {reciters.map((reciter, idx) => (
                        <Button
                          key={idx}
                          variant="ghost"
                          onClick={() => {
                            setSelectedReciter(reciter);
                            setShowSurahGrid(true);
                            setShowReciterGrid(false);
                          }}
                          className={cn(
                            "h-16 rounded-2xl border-2 transition-all font-black text-lg text-right px-4 justify-start focusable",
                            selectedReciter?.name === reciter.name ? "bg-primary text-white border-primary shadow-glow" : "bg-white/5 border-transparent text-white/70 hover:bg-white/10"
                          )}
                        >
                          {reciter.name}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>

          {/* Search Area - 50% Left */}
          <div className="w-full md:w-1/2 flex flex-col justify-end gap-6 order-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-2">
                <Search className="w-4 h-4 text-primary" />
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block">البحث الذكي</label>
              </div>
              <div className="relative group">
                <Search className="absolute right-6 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground group-focus-within:text-primary" />
                <Input
                  ref={searchInputRef}
                  placeholder="ابحث عن محتوى..."
                  className="pr-16 pl-14 h-20 bg-white/5 border-white/10 rounded-[2rem] text-2xl font-headline focusable text-right"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVideoSearch()}
                />
                <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button onClick={handleVoiceSearch} className={cn("p-3 rounded-full transition-all", isListening ? "text-red-500 animate-pulse bg-red-500/10" : "text-muted-foreground")}>
                    <Mic className="h-7 w-7" />
                  </button>
                </div>
              </div>
            </div>
            <Button onClick={() => handleVideoSearch()} disabled={isSearching} className="h-20 w-full rounded-[2rem] bg-primary text-white font-black text-xl hover:scale-[1.02] shadow-2xl focusable flex items-center justify-center gap-4">
              {isSearching ? <Loader2 className="w-8 h-8 animate-spin" /> : <Search className="w-8 h-8" />}
              <span>تنفيذ البحث</span>
            </Button>
          </div>
        </div>

        {showSurahGrid && selectedReciter && (
          <div className="iphone-fluid-glass p-8 rounded-[3rem] border border-primary/20 animate-in fade-in slide-in-from-top-4 duration-700 shadow-2xl relative overflow-hidden">
            <div className="absolute top-8 left-8 z-20">
              <Button variant="ghost" onClick={() => setShowSurahGrid(false)} className="rounded-full w-12 h-12 bg-white/5 border border-white/10 text-white focusable">
                <X className="w-6 h-6" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center"><BookOpen className="w-8 h-8 text-accent" /></div>
                <div className="flex flex-col text-right">
                  <h2 className="text-3xl font-black text-white">فهرس السور</h2>
                  <span className="text-sm font-black text-accent">{selectedReciter.name}</span>
                </div>
              </div>
            </div>
            <ScrollArea className="h-[380px] w-full">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 p-2">
                {SURAHS_LIST.map((surah, idx) => (
                  <Button
                    key={idx}
                    variant="ghost"
                    onClick={() => handleSurahClick(surah)}
                    className={cn(
                      "h-24 rounded-[2rem] flex flex-col items-center justify-center border-2 transition-all hover:scale-[1.08] focusable px-4 shadow-xl",
                      getJuzColor(Math.ceil((idx + 1) / 4)) // Placeholder logic for parts
                    )}
                  >
                    <span className="text-xl font-black tracking-tight mb-1">{surah}</span>
                    <div className="bg-black/30 px-3 py-1 rounded-full text-[10px] font-black opacity-90 border border-white/5">
                      سورة {idx + 1}
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </header>

      {selectedChannel ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-6 duration-700 pb-24 text-right">
          <div className="flex items-center gap-8 p-12 rounded-[3.5rem] bg-white/5 border border-white/10 iphone-fluid-glass relative shadow-2xl">
             <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-primary shadow-xl shrink-0">
                <Image src={selectedChannel.image} alt={selectedChannel.name} fill className="object-cover" />
             </div>
             <div className="flex-1">
                <h2 className="text-5xl font-headline font-bold text-white mb-3">{selectedChannel.name}</h2>
                <div className="mt-4 flex items-center gap-5 justify-end">
                  <Button
                    onClick={() => favoriteChannels.some(c => c.channelid === selectedChannel!.channelid) ? removeChannel(selectedChannel!.channelid) : addChannel(selectedChannel!)}
                    className={cn(
                      "rounded-full h-16 px-12 text-xl font-black shadow-2xl focusable",
                      favoriteChannels.some(c => c.channelid === selectedChannel!.channelid) ? "bg-accent text-black" : "bg-white text-black"
                    )}
                  >
                    {favoriteChannels.some(c => c.channelid === selectedChannel!.channelid) ? 'مشترك' : 'إشتراك'}
                  </Button>
                </div>
             </div>
             <Button onClick={() => setSelectedChannel(null)} className="absolute top-10 left-10 w-14 h-14 rounded-full bg-white/10 border border-white/20 text-white focusable">
                <X className="w-8 h-8" />
              </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {isLoadingVideos ? (
              <div className="col-span-full py-40 flex flex-col items-center gap-6">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
                <span className="text-white/40 font-black uppercase tracking-[0.5em] text-sm">جاري التحميل...</span>
              </div>
            ) : channelVideos.map((video) => (
              <Card 
                key={video.id} 
                className="group relative overflow-hidden bg-white/5 border-none rounded-[3rem] transition-all hover:scale-[1.03] cursor-pointer shadow-2xl focusable"
                tabIndex={0}
                onClick={() => setActiveVideo(video)}
              >
                <div className="aspect-video relative overflow-hidden">
                  <Image src={video.thumbnail} alt={video.title} fill className="object-cover opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                </div>
                <CardContent className="p-8 text-right">
                  <h3 className="font-bold text-lg line-clamp-2 text-white font-headline h-14">{video.title}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <section className="space-y-10 animate-in fade-in duration-1000 text-right">
          {videoResults.length > 0 && (
            <div className="space-y-8 mb-12">
              <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <Button variant="ghost" onClick={() => setVideoResults([])} className="text-white/40 hover:text-white rounded-full h-12 px-6 focusable">إغلاق النتائج</Button>
                <h2 className="text-3xl font-black font-headline text-primary flex items-center gap-4">نتائج البحث <Search className="w-8 h-8" /></h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {videoResults.map((video) => (
                  <Card key={video.id} onClick={() => setActiveVideo(video)} className="group video-result-card relative overflow-hidden bg-white/5 border-none rounded-[2rem] transition-all hover:scale-[1.05] cursor-pointer shadow-xl focusable" tabIndex={0}>
                    <div className="aspect-video relative overflow-hidden">
                      <Image src={video.thumbnail} alt={video.title} fill className="object-cover" />
                    </div>
                    <div className="p-5 text-right">
                      <h3 className="font-bold text-sm line-clamp-2 text-white font-headline h-10">{video.title}</h3>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black font-headline text-white flex items-center gap-4 tracking-tight">القنوات المفضلة <Radio className="text-primary w-8 h-8 animate-pulse" /></h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-10">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <div className="flex flex-col items-center gap-4 group cursor-pointer focusable" tabIndex={0}>
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-dashed border-white/15 flex items-center justify-center bg-white/5 group-hover:bg-white/10 group-hover:border-primary transition-all shadow-2xl">
                    <Plus className="w-14 h-14 text-white/20 group-hover:text-primary transition-all group-hover:scale-110" />
                  </div>
                  <span className="font-black text-xs uppercase tracking-[0.3em] text-white/40 group-hover:text-primary">إضافة قناة</span>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-4xl bg-zinc-950 border-white/10 rounded-[3.5rem] p-0 overflow-hidden shadow-2xl iphone-fluid-glass">
                <DialogHeader className="p-10 border-b border-white/10">
                  <DialogTitle className="text-3xl font-black text-white mb-6 text-right">البحث عن القنوات</DialogTitle>
                  <div className="flex gap-4">
                    <Input placeholder="اسم القناة..." value={channelSearchQuery} onChange={(e) => setChannelSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChannelSearch()} className="bg-white/5 border-white/10 h-16 rounded-[1.5rem] text-xl px-8 text-right focusable flex-1" />
                    <Button onClick={handleChannelSearch} disabled={isSearchingChannels} className="h-16 w-20 bg-primary rounded-[1.5rem] shadow-xl focusable">
                      {isSearchingChannels ? <Loader2 className="w-8 h-8 animate-spin" /> : <Search className="w-8 h-8" />}
                    </Button>
                  </div>
                </DialogHeader>
                <ScrollArea className="max-h-[65vh]">
                  <div className="p-10 space-y-6">
                    {channelResults.map((channel) => {
                      const isSubscribed = favoriteChannels.some(c => c.channelid === channel.channelid);
                      return (
                        <div key={channel.channelid} className="flex items-center gap-6 p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all group focusable" tabIndex={0} onClick={() => isSubscribed ? removeChannel(channel.channelid) : addChannel(channel)}>
                          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 flex-shrink-0">
                            <Image src={channel.image} alt={channel.name} fill className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0 text-right">
                            <h4 className="font-black text-xl text-white truncate">{channel.name}</h4>
                          </div>
                          <div className={cn("rounded-full h-14 px-8 font-black text-base shadow-lg", isSubscribed ? "bg-accent/20 text-accent" : "bg-primary text-white")}>
                            {isSubscribed ? "مشترك" : "إضافة"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {favoriteChannels.map((channel) => (
              <div key={channel.channelid} className="flex flex-col items-center gap-4 group relative animate-in zoom-in-95 duration-700 focusable" tabIndex={0} onClick={() => handleSelectChannel(channel)}>
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-white/10 group-hover:border-primary transition-all duration-700 cursor-pointer shadow-2xl relative">
                  <Image src={channel.image} alt={channel.name} fill className="object-cover group-hover:scale-115 transition-transform duration-1000" />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-all" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-black text-sm text-center text-white/70 group-hover:text-white truncate w-full px-4">{channel.name}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}