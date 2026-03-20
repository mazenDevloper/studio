
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Radio, Loader2, Mic, Star, X, Link as LinkIcon, Trash2, Save, GripVertical, Play, Clock, Activity } from "lucide-react";
import { useMediaStore } from "@/lib/store";
import { searchYouTubeChannels, searchYouTubeVideos, fetchChannelVideos, fetchVideoDetails, YouTubeChannel, YouTubeVideo } from "@/lib/youtube";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function MediaView() {
  const { 
    favoriteChannels, 
    addChannel, 
    removeChannel, 
    setActiveVideo,
    toggleStarChannel,
    isFullScreen,
    setFavoriteChannels,
    saveChannelsReorder,
    // Store states
    videoResults,
    setVideoResults,
    selectedChannel,
    setSelectedChannel,
    channelVideos,
    setChannelVideos
  } = useMediaStore();

  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const [urlInput, setUrlInput] = useState("");
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
  const [isAddingByUrl, setIsAddingByUrl] = useState(false);

  const [channelSearchQuery, setChannelSearchQuery] = useState("");
  const [channelResults, setChannelResults] = useState<YouTubeChannel[]>([]);
  const [isSearchingChannels, setIsSearchingChannels] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [subscriptionLatestVideos, setSubscriptionLatestVideos] = useState<YouTubeVideo[]>([]);
  const [liveChannels, setLiveChannels] = useState<string[]>([]);
  const [isLoadingLatest, setIsLoadingLatest] = useState(false);

  // Fetch one latest video from each subscription following channel order
  const fetchLatestFromSubs = useCallback(async () => {
    if (favoriteChannels.length === 0) {
      setSubscriptionLatestVideos([]);
      setLiveChannels([]);
      return;
    }
    setIsLoadingLatest(true);
    try {
      const promises = favoriteChannels.map(ch => fetchChannelVideos(ch.channelid));
      const results = await Promise.all(promises);
      
      const latestVideos = results.map(vids => vids[0]).filter(Boolean);
      setSubscriptionLatestVideos(latestVideos);

      // تتبع القنوات التي لديها بث مباشر الآن
      const liveIds = latestVideos.filter(v => v.isLive).map(v => v.channelId!).filter(Boolean);
      setLiveChannels(liveIds);
    } catch (e) {
      console.error("Failed to fetch latest from subs", e);
    } finally {
      setIsLoadingLatest(false);
    }
  }, [favoriteChannels]);

  useEffect(() => {
    fetchLatestFromSubs();
    const interval = setInterval(fetchLatestFromSubs, 10 * 60 * 1000); // تحديث كل 10 دقائق
    return () => clearInterval(interval);
  }, [fetchLatestFromSubs]);

  // Focus Management Hooks
  useEffect(() => {
    if (videoResults.length > 0) {
      setTimeout(() => {
        const firstResult = document.querySelector('[data-nav-id="search-result-0"]') as HTMLElement;
        if (firstResult) firstResult.focus();
      }, 300);
    }
  }, [videoResults]);

  useEffect(() => {
    if (channelVideos.length > 0) {
      setTimeout(() => {
        const firstVideo = document.querySelector('[data-nav-id="channel-video-0"]') as HTMLElement;
        if (firstVideo) firstVideo.focus();
      }, 300);
    }
  }, [channelVideos]);

  useEffect(() => {
    if (favoriteChannels.length > 0 && !selectedChannel && videoResults.length === 0) {
      setTimeout(() => {
        const firstFav = document.querySelector('[data-nav-id="fav-channel-0"]') as HTMLElement;
        if (firstFav) firstFav.focus();
      }, 300);
    }
  }, [favoriteChannels, selectedChannel, videoResults]);

  const handleVideoSearch = useCallback(async (queryOverride?: string) => {
    const finalQuery = queryOverride || searchQuery;
    if (!finalQuery.trim()) return;
    setIsSearching(true);
    setSelectedChannel(null);
    try {
      const results = await searchYouTubeVideos(finalQuery);
      setVideoResults(results);
    } catch (error) {
      console.error("Video search failed", error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, setVideoResults, setSelectedChannel]);

  const handleChannelSearch = async () => {
    if (!channelSearchQuery.trim()) return;
    setIsSearchingChannels(true);
    try {
      const results = await searchYouTubeChannels(channelSearchQuery);
      setChannelResults(results);
    } catch (error) {
      console.error("Channel search failed", error);
    } finally {
      setIsSearchingChannels(false);
    }
  };

  const handleSelectChannel = async (channel: YouTubeChannel) => {
    if (isReordering) return;
    setSelectedChannel(channel);
    setIsLoadingVideos(true);
    try {
      const videos = await fetchChannelVideos(channel.channelid);
      setChannelVideos(videos);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const handleDragStart = (idx: number) => {
    if (!isReordering) return;
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    if (!isReordering || draggedIdx === null || draggedIdx === idx) return;
    e.preventDefault();
    const newList = [...favoriteChannels];
    const item = newList.splice(draggedIdx, 1)[0];
    newList.splice(idx, 0, item);
    setFavoriteChannels(newList);
    setDraggedIdx(idx);
  };

  const handleOrderChange = (channelId: string, newOrder: string) => {
    const targetIdx = parseInt(newOrder) - 1;
    if (isNaN(targetIdx) || targetIdx < 0 || targetIdx >= favoriteChannels.length) return;
    
    const currentIdx = favoriteChannels.findIndex(c => c.channelid === channelId);
    if (currentIdx === -1 || currentIdx === targetIdx) return;

    const newList = [...favoriteChannels];
    const [movedChannel] = newList.splice(currentIdx, 1);
    newList.splice(targetIdx, 0, movedChannel);
    setFavoriteChannels(newList);
  };

  const handleSaveReorder = async () => {
    try {
      await saveChannelsReorder();
      setIsReordering(false);
      toast({ title: "تم الحفظ", description: "تم تحديث ترتيب القنوات سحابياً" });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ", description: "فشل حفظ الترتيب" });
    }
  };

  const handleAddVideoByUrl = async () => {
    if (!urlInput.trim()) return;
    setIsAddingByUrl(true);
    try {
      let videoId = "";
      if (urlInput.includes("youtu.be/")) {
        videoId = urlInput.split("youtu.be/")[1]?.split("?")[0];
      } else if (urlInput.includes("youtube.com/watch?v=")) {
        videoId = urlInput.split("v=")[1]?.split("&")[0];
      } else if (urlInput.includes("youtube.com/embed/")) {
        videoId = urlInput.split("embed/")[1]?.split("?")[0];
      }

      if (videoId) {
        const video = await fetchVideoDetails(videoId);
        if (video) {
          setActiveVideo(video);
          setIsUrlDialogOpen(false);
          setUrlInput("");
        }
      }
    } finally {
      setIsAddingByUrl(false);
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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

  if (isFullScreen) return null;

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto pb-32 min-h-screen relative dir-rtl safe-p-top">
      <header className="flex flex-col gap-8">
        <div className="flex justify-between items-end">
          <div className="text-right">
            <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tighter text-white">DriveCast Media</h1>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-widest opacity-60">Professional Video Center</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => setIsReordering(!isReordering)}
              className={cn("h-12 px-6 rounded-full focusable", isReordering ? "bg-accent text-black" : "bg-white/5 text-white")}
            >
              {isReordering ? "إلغاء الترتيب" : "تغيير الترتيب"}
            </Button>
            {isReordering && (
              <Button onClick={handleSaveReorder} className="h-12 px-6 rounded-full bg-primary text-white shadow-glow">
                <Save className="w-4 h-4 ml-2" /> حفظ الترتيب السحابي
              </Button>
            )}
            <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="h-12 px-6 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 focusable flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">إضافة بالرابط</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-950 border-white/10 rounded-[2.5rem] p-8 w-[90%] max-w-md mx-auto">
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
          <div className="w-full flex flex-col justify-end gap-6 order-2">
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
                  tabIndex={0}
                  data-nav-id="media-search-input"
                />
                <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button onClick={handleVoiceSearch} className={cn("p-3 rounded-full transition-all focusable", isListening ? "text-red-500 animate-pulse bg-red-500/10" : "text-muted-foreground")} tabIndex={0}>
                    <Mic className="h-7 w-7" />
                  </button>
                </div>
              </div>
            </div>
            <Button onClick={() => handleVideoSearch()} disabled={isSearching} className="h-20 w-full rounded-[2rem] bg-primary text-white font-black text-xl hover:scale-[1.02] shadow-2xl focusable flex items-center justify-center gap-4" tabIndex={0}>
              {isSearching ? <Loader2 className="w-8 h-8 animate-spin" /> : <Search className="w-8 h-8" />}
              <span>تنفيذ البحث</span>
            </Button>
          </div>
        </div>
      </header>

      {videoResults.length > 0 && (
        <section className="space-y-8 animate-in fade-in duration-500 text-right">
          <div className="flex items-center justify-between border-b border-white/10 pb-6">
            <Button variant="ghost" onClick={() => setVideoResults([])} className="text-white/40 hover:text-white rounded-full h-12 px-6 focusable" tabIndex={0}>إغلاق النتائج</Button>
            <h2 className="text-3xl font-black font-headline text-primary flex items-center gap-4">نتائج البحث <Search className="w-8 h-8" /></h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {videoResults.map((video, idx) => (
              <Card key={video.id} data-nav-id={`search-result-${idx}`} onClick={() => setActiveVideo(video)} className="group video-result-card relative overflow-hidden bg-white/5 border-none rounded-[2rem] transition-all hover:scale-[1.05] cursor-pointer shadow-xl focusable" tabIndex={0}>
                <div className="aspect-video relative overflow-hidden">
                  <Image src={video.thumbnail} alt={video.title} fill className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
                <div className="p-5 text-right">
                  <h3 className="font-bold text-sm line-clamp-2 text-white font-headline h-10">{video.title}</h3>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {selectedChannel ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-6 duration-500 pb-24 text-right">
          <div className="flex items-center gap-8 p-12 rounded-[3.5rem] bg-white/5 border border-white/10 relative shadow-2xl">
             <div className={cn(
               "relative w-40 h-40 rounded-full overflow-hidden border-4 shadow-xl shrink-0 transition-all",
               liveChannels.includes(selectedChannel.channelid) ? "border-red-600 ring-4 ring-red-600/20" : "border-primary"
             )}>
                <Image src={selectedChannel.image} alt={selectedChannel.name} fill className="object-cover" />
                {liveChannels.includes(selectedChannel.channelid) && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-lg">LIVE</div>
                )}
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
                    tabIndex={0}
                  >
                    {favoriteChannels.some(c => c.channelid === selectedChannel!.channelid) ? 'مشترك' : 'إشتراك'}
                  </Button>
                </div>
             </div>
             <Button onClick={() => setSelectedChannel(null)} className="absolute top-10 left-10 w-14 h-14 rounded-full bg-white/10 border border-white/20 text-white focusable" tabIndex={0}>
                <X className="w-8 h-8" />
              </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {isLoadingVideos ? (
              <div className="col-span-full py-40 flex flex-col items-center gap-6">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
                <span className="text-white/40 font-black uppercase tracking-[0.5em] text-sm">جاري التحميل...</span>
              </div>
            ) : channelVideos.map((video, idx) => (
              <Card 
                key={video.id} 
                data-nav-id={`channel-video-${idx}`}
                className={cn(
                  "group channel-video-card relative overflow-hidden bg-white/5 border-none rounded-[3rem] transition-all hover:scale-105 cursor-pointer shadow-2xl focusable",
                  video.isLive && "ring-2 ring-red-600 bg-red-600/5"
                )}
                tabIndex={0}
                onClick={() => setActiveVideo(video)}
              >
                <div className="aspect-video relative overflow-hidden">
                  <Image src={video.thumbnail} alt={video.title} fill className="object-cover opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                  {video.isLive && (
                    <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl animate-pulse">
                      <Activity className="w-3 h-3" /> مباشر الآن
                    </div>
                  )}
                </div>
                <CardContent className="p-8 text-right">
                  <h3 className="font-bold text-lg line-clamp-2 text-white font-headline h-14">{video.title}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Subscription Latest Videos - Forced LTR Horizontal Scroll */}
          {favoriteChannels.length > 0 && subscriptionLatestVideos.length > 0 && (
            <section className="space-y-6 animate-in fade-in duration-500" dir="ltr">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-black font-headline text-white flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Radio className="w-5 h-5 text-primary animate-pulse" />
                  </div>
                  أحدث الترددات
                  <span className="text-[10px] text-white/30 uppercase tracking-widest ml-2 font-bold">Latest Broadcasts</span>
                </h2>
              </div>
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex w-max gap-4 pb-4 px-2">
                  {subscriptionLatestVideos.map((video, idx) => (
                    <div 
                      key={video.id} 
                      className={cn(
                        "w-[340px] group relative overflow-hidden bg-zinc-900/80 border-none rounded-[2rem] transition-all hover:scale-[1.02] cursor-pointer shadow-xl focusable",
                        video.isLive && "ring-2 ring-red-600"
                      )}
                      onClick={() => setActiveVideo(video)}
                      tabIndex={0}
                      data-nav-id={`sub-latest-${idx}`}
                    >
                      <div className="aspect-video relative overflow-hidden">
                        <Image src={video.thumbnail} alt={video.title} fill className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className={cn(
                            "w-12 h-12 rounded-full backdrop-blur-3xl flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100",
                            video.isLive ? "bg-red-600" : "bg-white/20"
                          )}>
                            <Play className="w-6 h-6 text-white fill-white ml-1" />
                          </div>
                        </div>
                        {video.isLive && (
                          <div className="absolute top-3 right-3 bg-red-600 text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter animate-pulse shadow-lg">LIVE</div>
                        )}
                      </div>
                      <div className="p-4 space-y-1 text-left">
                        <h3 className="font-bold text-sm truncate text-white font-headline">{video.title}</h3>
                        <div className="flex items-center justify-start gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                          <span className="text-white/40">{video.channelTitle}</span>
                          <span className="opacity-30">•</span>
                          {video.isLive ? (
                            <span className="text-red-500 flex items-center gap-1"><Activity className="w-3 h-3" /> Live</span>
                          ) : (
                            <span className="flex items-center gap-1 text-accent"><Clock className="w-3 h-3" /> Latest</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="bg-white/5 h-1.5" />
              </ScrollArea>
            </section>
          )}

          <section className="space-y-10 animate-in fade-in duration-500 text-right">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black font-headline text-white flex items-center gap-4 tracking-tight">القنوات المفضلة <Radio className="text-primary w-8 h-8 animate-pulse" /></h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <div className="flex flex-col items-center gap-4 group cursor-pointer focusable" tabIndex={0} data-nav-id="add-channel-btn">
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-dashed border-white/15 flex items-center justify-center bg-white/5 group-hover:bg-white/10 group-hover:border-primary transition-all shadow-2xl">
                      <Plus className="w-14 h-14 text-white/20 group-hover:text-primary transition-all group-hover:scale-110" />
                    </div>
                    <span className="font-black text-xs uppercase tracking-[0.3em] text-white/40 group-hover:text-primary">إضافة قناة</span>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-[90%] md:max-w-4xl bg-zinc-950 border-white/10 rounded-[3.5rem] p-0 overflow-hidden shadow-2xl w-[90%] mx-auto">
                  <DialogHeader className="p-10 border-b border-white/10 relative">
                    <DialogTitle className="text-3xl font-black text-white text-right mb-6">البحث عن القنوات</DialogTitle>
                    <button onClick={() => setIsDialogOpen(false)} className="absolute top-8 left-8 w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all border border-white/10 z-50">
                      <X className="w-6 h-6 text-white" />
                    </button>
                    <div className="flex gap-4">
                      <Input placeholder="اسم القناة..." value={channelSearchQuery} onChange={(e) => setChannelSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChannelSearch()} className="bg-white/5 border-white/10 h-16 rounded-[1.5rem] text-xl px-8 text-right focusable flex-1" tabIndex={0} data-nav-id="channel-search-input" />
                      <Button onClick={handleChannelSearch} disabled={isSearchingChannels} className="h-16 w-20 bg-primary rounded-[1.5rem] shadow-xl focusable" tabIndex={0}>
                        {isSearchingChannels ? <Loader2 className="w-8 h-8 animate-spin" /> : <Search className="w-8 h-8" />}
                      </Button>
                    </div>
                  </DialogHeader>
                  <ScrollArea className="max-h-[65vh]">
                    <div className="p-10 space-y-6">
                      {channelResults.map((channel, idx) => {
                        const isSubscribed = Array.isArray(favoriteChannels) && favoriteChannels.some(c => c.channelid === channel.channelid);
                        return (
                          <div key={channel.channelid} data-nav-id={`channel-search-result-${idx}`} className="flex items-center gap-6 p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all group focusable" tabIndex={0} onClick={() => isSubscribed ? removeChannel(channel.channelid) : addChannel(channel)}>
                            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 flex-shrink-0">
                              <Image src={channel.image} alt={channel.name} fill className="object-cover" />
                            </div>
                            <div className="flex-1 min-w-0 text-right">
                              <h4 className="font-black text-xl text-white truncate">{channel.name}</h4>
                            </div>
                            <div className={cn("rounded-full h-14 px-8 font-black text-base shadow-lg flex items-center justify-center", isSubscribed ? "bg-accent/20 text-accent" : "bg-primary text-white")}>
                              {isSubscribed ? "مشترك" : "إضافة"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              {Array.isArray(favoriteChannels) && favoriteChannels.map((channel, idx) => {
                const isLive = liveChannels.includes(channel.channelid);
                return (
                  <div 
                    key={channel.channelid} 
                    data-nav-id={`fav-channel-${idx}`} 
                    className={cn(
                      "flex flex-col items-center gap-4 group relative focusable",
                      isReordering && "cursor-move",
                      draggedIdx === idx && "opacity-50 border-primary"
                    )} 
                    draggable={isReordering}
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={() => setDraggedIdx(null)}
                    tabIndex={0} 
                    onClick={() => handleSelectChannel(channel)}
                  >
                    <div className={cn(
                      "w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 transition-all duration-500 cursor-pointer shadow-2xl relative",
                      isLive ? "border-red-600 ring-4 ring-red-600/30 scale-105" : "border-white/10 group-hover:border-primary"
                    )}>
                      <Image src={channel.image} alt={channel.name} fill className="object-cover group-hover:scale-115 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-all" />
                      
                      {isLive && (
                        <div className="absolute inset-0 bg-red-600/10 animate-pulse pointer-events-none" />
                      )}

                      {isReordering && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 group">
                          <div className="flex flex-col items-center gap-2">
                            <GripVertical className="w-10 h-10 text-white animate-pulse" />
                            <Input 
                              type="number"
                              value={idx + 1}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleOrderChange(channel.channelid, e.target.value)}
                              className="w-16 h-10 bg-white text-black text-center font-black rounded-lg text-lg focus:ring-4 focus:ring-primary shadow-2xl border-none"
                            />
                          </div>
                        </div>
                      )}

                      <div className="absolute top-2 right-2 flex flex-col gap-2 z-30 transition-all">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleStarChannel(channel.channelid); }}
                          className={cn(
                            "w-10 h-10 rounded-full backdrop-blur-xl border border-white/10 flex items-center justify-center transition-all",
                            channel.starred ? "bg-yellow-500 text-black opacity-100 shadow-glow" : "bg-black/60 text-white/40 hover:text-white opacity-0 group-hover:opacity-100 group-focus:opacity-100"
                          )}
                        >
                          <Star className={cn("w-5 h-5", channel.starred && "fill-current")} />
                        </button>
                      </div>

                      {!isReordering && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeChannel(channel.channelid); }}
                          className="absolute top-2 left-2 w-10 h-10 rounded-full bg-red-600/80 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 group-focus:opacity-100 z-30 hover:bg-red-600"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col items-center">
                      <span className={cn(
                        "font-black text-sm text-center truncate w-full px-4 transition-colors", 
                        isLive ? "text-red-500" : channel.starred ? "text-yellow-500" : "text-white/70 group-hover:text-white"
                      )}>
                        {channel.name}
                      </span>
                      {isLive && (
                        <span className="text-[8px] font-black text-red-600 uppercase tracking-widest mt-[-2px] animate-pulse">LIVE NOW</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
