
"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Play, Trash2, Radio, Loader2, Check, Mic, Users, Cloud, Star, X, Bookmark, Link as LinkIcon } from "lucide-react";
import { useMediaStore } from "@/lib/store";
import { searchYouTubeChannels, searchYouTubeVideos, fetchChannelVideos, fetchVideoDetails, YouTubeChannel, YouTubeVideo } from "@/lib/youtube";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [videoResults, setVideoResults] = useState<YouTubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<YouTubeChannel | null>(null);
  const [channelVideos, setChannelVideos] = useState<YouTubeVideo[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // URL Adding State
  const [urlInput, setUrlInput] = useState("");
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false);
  const [isAddingByUrl, setIsAddingByUrl] = useState(false);

  const [channelSearchQuery, setChannelSearchQuery] = useState("");
  const [channelResults, setChannelResults] = useState<YouTubeChannel[]>([]);
  const [isSearchingChannels, setIsSearchingChannels] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
  }, [searchQuery]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setSearchQuery(q);
      handleVideoSearch(q);
    }
  }, [searchParams, handleVideoSearch]);

  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition;
    if (!SpeechRecognition) {
      toast({ variant: "destructive", title: "خطأ", description: "البحث الصوتي غير مدعوم." });
      return;
    }
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
    
    // Extract video ID using regex
    const videoIdMatch = urlInput.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/|youtube\.com\/(?:shorts\/))([\w-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : urlInput.trim();

    if (videoId.length !== 11) {
      toast({ 
        variant: "destructive", 
        title: "رابط غير صالح", 
        description: "يرجى إدخال رابط يوتيوب صحيح أو معرف فيديو مكون من 11 رمزاً." 
      });
      return;
    }

    if (savedVideos.some(v => v.id === videoId)) {
      toast({ title: "موجود مسبقاً", description: "هذا الفيديو موجود بالفعل في قائمتك." });
      setIsUrlDialogOpen(false);
      setUrlInput("");
      return;
    }

    setIsAddingByUrl(true);
    try {
      const video = await fetchVideoDetails(videoId);
      if (!video) {
        throw new Error("Video not found");
      }
      toggleSaveVideo(video);
      toast({ title: "تمت الإضافة", description: `تمت إضافة "${video.title}" بنجاح.` });
      setIsUrlDialogOpen(false);
      setUrlInput("");
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "خطأ", 
        description: "فشل جلب بيانات الفيديو. تأكد من أن الفيديو عام وغير محظور." 
      });
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
    } catch (error) {
      console.error("Channel search failed", error);
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
    } catch (error) {
      console.error("Failed to fetch channel videos", error);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const handleToggleSave = (e: React.MouseEvent, video: YouTubeVideo) => {
    e.stopPropagation();
    toggleSaveVideo(video);
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto pb-32 min-h-screen relative">
      <header className="flex flex-col gap-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-headline font-bold tracking-tighter text-white">DriveCast Media</h1>
            <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest opacity-60">Global Frequency Hub</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Add by URL Dialog */}
            <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" className="h-12 px-6 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 focusable flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">إضافة بالرابط</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-950 border-white/10 rounded-[2.5rem] p-8 max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black text-white mb-4 text-right">إضافة فيديو بالرابط</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <p className="text-xs text-white/40 text-right leading-relaxed">الصق رابط يوتيوب أو مُعرّف الفيديو (ID) أدناه ليتم جلب التفاصيل وحفظه.</p>
                  <Input 
                    placeholder="https://youtu.be/..." 
                    value={urlInput} 
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddVideoByUrl()}
                    className="h-14 bg-white/5 border-white/10 rounded-2xl px-6 text-white focusable"
                  />
                  <div className="flex gap-4">
                    <Button 
                      onClick={handleAddVideoByUrl} 
                      disabled={isAddingByUrl} 
                      className="flex-1 h-14 bg-primary text-white font-black rounded-2xl shadow-xl focusable"
                    >
                      {isAddingByUrl ? <Loader2 className="w-6 h-6 animate-spin" /> : "إضافة الفيديو"}
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => setIsUrlDialogOpen(false)} 
                      className="h-14 px-8 rounded-2xl text-white/40 hover:text-white focusable"
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <Cloud className="w-4 h-4 text-accent animate-pulse" />
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">JSONBin Real-time Sync</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 max-w-3xl">
          <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="البحث عن فيديوهات..."
              className="pl-16 pr-14 h-16 bg-white/5 border-white/10 rounded-[1.5rem] text-xl font-headline focus-visible:ring-primary backdrop-blur-xl focusable"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVideoSearch()}
            />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button onClick={handleVoiceSearch} className={cn("p-2 rounded-full transition-all focusable", isListening ? "text-red-500 animate-pulse bg-red-500/10" : "text-muted-foreground hover:text-primary")}>
                <Mic className="h-6 w-6" />
              </button>
            </div>
          </div>
          <Button onClick={() => handleVideoSearch()} disabled={isSearching} className="h-16 px-10 rounded-[1.5rem] bg-primary text-white font-black text-lg hover:scale-[1.05] transition-all active:scale-95 disabled:opacity-50 shadow-2xl focusable">
            {isSearching ? <Loader2 className="h-8 w-8 animate-spin" /> : "بحث"}
          </Button>
        </div>
      </header>

      {selectedChannel ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-6 duration-700 pb-24">
          <div className="flex items-center gap-8 p-12 rounded-[3.5rem] bg-white/5 border border-white/10 backdrop-blur-3xl relative shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
             <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-primary shadow-[0_0_50px_rgba(59,130,246,0.5)] shrink-0">
                <Image src={selectedChannel.image} alt={selectedChannel.name} fill className="object-cover" />
             </div>
             <div className="flex-1">
                <h2 className="text-5xl font-headline font-bold text-white mb-3 tracking-tight">{selectedChannel.name}</h2>
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-5 h-5 text-accent" />
                  <span className="text-xl font-bold text-accent">{selectedChannel.subscriberCount} مشترك</span>
                </div>
                <div className="mt-4 flex items-center gap-5">
                  <Button
                    onClick={() => favoriteChannels.some(c => c.channelid === selectedChannel!.channelid) ? removeChannel(selectedChannel!.channelid) : addChannel(selectedChannel!)}
                    className={cn(
                      "rounded-full h-16 px-12 text-xl font-black shadow-2xl transition-all focusable",
                      favoriteChannels.some(c => c.channelid === selectedChannel!.channelid) ? "bg-accent text-black hover:bg-accent/80" : "bg-white text-black hover:bg-primary hover:text-white"
                    )}
                  >
                    {favoriteChannels.some(c => c.channelid === selectedChannel!.channelid) ? <Check className="w-8 h-8 mr-4" /> : <Plus className="w-8 h-8 mr-4" />}
                    {favoriteChannels.some(c => c.channelid === selectedChannel!.channelid) ? 'مشترك' : 'اشتراك'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleStarChannel(selectedChannel!.channelid)}
                    className={cn("w-16 h-16 rounded-full border border-white/10 backdrop-blur-md transition-all focusable", selectedChannel.starred ? "bg-accent/20 text-accent shadow-glow" : "text-white/40 hover:text-white")}
                  >
                    <Star className={cn("w-8 h-8", selectedChannel.starred && "fill-current")} />
                  </Button>
                </div>
             </div>
             <Button onClick={() => setSelectedChannel(null)} className="absolute top-10 right-10 w-14 h-14 rounded-full bg-white/10 border border-white/20 text-white backdrop-blur-3xl shadow-2xl hover:bg-white/20 transition-all active:scale-90 focusable">
                <X className="w-8 h-8" />
              </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {isLoadingVideos ? (
              <div className="col-span-full py-40 flex flex-col items-center gap-6">
                <Loader2 className="w-16 h-16 animate-spin text-primary" />
                <span className="text-white/40 font-black uppercase tracking-[0.5em] text-sm">جاري مزﺎمنة القناة...</span>
              </div>
            ) : channelVideos.map((video, idx) => {
              const isSaved = savedVideos.some(v => v.id === video.id);
              return (
                <Card 
                  key={video.id} 
                  className="group relative overflow-hidden bg-white/5 border-none rounded-[3rem] transition-all hover:scale-[1.03] cursor-pointer shadow-2xl border border-white/5 focusable"
                  onClick={() => setActiveVideo(video)}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <Image src={video.thumbnail} alt={video.title} fill className="object-cover opacity-80 group-hover:opacity-100 transition-all duration-1000 scale-105 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute top-6 right-6 z-20">
                       <Button size="icon" variant="ghost" onClick={(e) => handleToggleSave(e, video)} className={cn("w-14 h-14 rounded-full backdrop-blur-3xl border border-white/15 transition-all", isSaved ? "bg-accent text-black shadow-glow" : "bg-black/50 text-white hover:bg-black/70")}>
                         <Bookmark className={cn("w-7 h-7", isSaved && "fill-current")} />
                       </Button>
                    </div>
                  </div>
                  <CardContent className="p-8">
                    <h3 className="font-bold text-lg line-clamp-2 text-white font-headline leading-relaxed h-14">{video.title}</h3>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        <section className="space-y-10 animate-in fade-in duration-1000">
          {videoResults.length > 0 && (
            <div className="space-y-8 mb-12 animate-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <h2 className="text-3xl font-black font-headline text-primary flex items-center gap-4 tracking-tight uppercase">
                  <Search className="w-8 h-8" /> نتائج البحث
                </h2>
                <Button variant="ghost" onClick={() => setVideoResults([])} className="text-white/40 hover:text-white rounded-full h-12 px-6 focusable">إغلاق البحث</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {videoResults.map((video, idx) => (
                  <Card key={video.id} onClick={() => setActiveVideo(video)} className="group relative overflow-hidden bg-white/5 border-none rounded-[2rem] transition-all hover:scale-[1.05] cursor-pointer shadow-xl border border-white/5 focusable">
                    <div className="aspect-video relative overflow-hidden">
                      <Image src={video.thumbnail} alt={video.title} fill className="object-cover group-hover:scale-110 transition-transform duration-1000" />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors" />
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-sm line-clamp-2 text-white font-headline h-10">{video.title}</h3>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black font-headline text-white flex items-center gap-4 tracking-tight">
              <Radio className="text-primary w-8 h-8 animate-pulse" /> القنوات المشتركة
            </h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-10">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <div className="flex flex-col items-center gap-4 group cursor-pointer focusable" tabIndex={0}>
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-dashed border-white/15 flex items-center justify-center bg-white/5 group-hover:bg-white/10 group-hover:border-primary transition-all duration-500 shadow-2xl relative">
                    <Plus className="w-14 h-14 text-white/20 group-hover:text-primary transition-all group-hover:scale-110" />
                  </div>
                  <span className="font-black text-xs uppercase tracking-[0.3em] text-white/40 group-hover:text-primary transition-colors">إضافة قناة</span>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-4xl bg-zinc-950 border-white/10 rounded-[3.5rem] p-0 overflow-hidden shadow-[0_50px_150px_rgba(0,0,0,1)]">
                <DialogHeader className="p-10 border-b border-white/10 bg-zinc-900/40 backdrop-blur-3xl">
                  <DialogTitle className="text-3xl font-black text-white mb-6 uppercase tracking-tight text-right">البحث عن الترددات</DialogTitle>
                  <div className="flex gap-4">
                    <Input placeholder="اسم القناة..." value={channelSearchQuery} onChange={(e) => setChannelSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChannelSearch()} className="bg-white/5 border-white/10 h-16 rounded-[1.5rem] text-xl px-8 text-right focusable" />
                    <Button onClick={handleChannelSearch} disabled={isSearchingChannels} className="h-16 w-20 bg-primary rounded-[1.5rem] shadow-xl focusable">
                      {isSearchingChannels ? <Loader2 className="w-8 h-8 animate-spin" /> : <Search className="w-8 h-8" />}
                    </Button>
                  </div>
                </DialogHeader>
                <ScrollArea className="max-h-[65vh]">
                  <div className="p-10 space-y-6">
                    {channelResults.map((channel, idx) => {
                      const isSubscribed = favoriteChannels.some(c => c.channelid === channel.channelid);
                      return (
                        <div key={channel.channelid} className="flex items-center gap-6 p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-primary transition-all flex-shrink-0">
                            <Image src={channel.image} alt={channel.name} fill className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0 text-right">
                            <h4 className="font-black text-xl text-white truncate">{channel.name}</h4>
                            <div className="flex items-center justify-end gap-2 mt-2 opacity-60">
                              <span className="text-sm font-bold text-accent">{channel.subscriberCount} مشترك</span>
                              <Users className="w-4 h-4 text-accent" />
                            </div>
                          </div>
                          <Button onClick={() => isSubscribed ? removeChannel(channel.channelid) : addChannel(channel)} variant={isSubscribed ? "secondary" : "default"} className={cn("rounded-full h-14 px-8 font-black text-base shadow-lg transition-all flex-shrink-0 relative z-10 min-w-[140px] focusable", isSubscribed ? "bg-accent/20 text-accent border border-accent/20" : "bg-primary text-white hover:scale-105")}>
                            {isSubscribed ? <Check className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                            {isSubscribed ? "مشترك" : "إضافة"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {favoriteChannels.map((channel, idx) => {
              const isStarred = channel.starred;
              return (
                <div key={channel.channelid} className="flex flex-col items-center gap-4 group relative animate-in zoom-in-95 duration-700">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-white/10 group-hover:border-primary transition-all duration-700 cursor-pointer shadow-2xl relative focusable" onClick={() => handleSelectChannel(channel)}>
                    <Image src={channel.image} alt={channel.name} fill className="object-cover group-hover:scale-115 transition-transform duration-1000" />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-all" />
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); toggleStarChannel(channel.channelid); }} className={cn("absolute top-1 left-1 w-12 h-12 rounded-full flex items-center justify-center border border-white/15 backdrop-blur-3xl transition-all active:scale-90 z-20 focusable", isStarred ? "bg-accent text-black shadow-glow" : "bg-black/50 text-white/40 hover:text-white")}>
                    <Star className={cn("w-6 h-6", isStarred && "fill-current")} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); removeChannel(channel.channelid); }} className="absolute top-1 right-1 w-10 h-10 rounded-full bg-red-600/20 text-red-500 border border-red-500/20 flex items-center justify-center shadow-xl hover:bg-red-600 hover:text-white transition-all active:scale-90 z-20 focusable">
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="font-black text-sm text-center text-white/70 group-hover:text-white truncate w-full px-4 uppercase tracking-tighter">{channel.name}</span>
                    <span className="text-[10px] text-accent/60 font-bold uppercase tracking-widest mt-0.5">{channel.clickschannel || 0} نقرة</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
