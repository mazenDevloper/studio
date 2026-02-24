
"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Play, Trash2, Youtube, Radio, Loader2, Check, ArrowLeft, Clock, Bookmark, X, PlusCircle, Star } from "lucide-react";
import { useMediaStore } from "@/lib/store";
import { searchYouTubeChannels, searchYouTubeVideos, fetchChannelVideos, YouTubeChannel, YouTubeVideo } from "@/lib/youtube";
import Image from "next/image";
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
    starredChannelIds,
    toggleStarChannel
  } = useMediaStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [videoResults, setVideoResults] = useState<YouTubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<YouTubeChannel | null>(null);
  const [channelVideos, setChannelVideos] = useState<YouTubeVideo[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);

  // Channel Search Dialog State
  const [channelSearchQuery, setChannelSearchQuery] = useState("");
  const [channelResults, setChannelResults] = useState<YouTubeChannel[]>([]);
  const [isSearchingChannels, setIsSearchingChannels] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleVideoSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSelectedChannel(null);
    try {
      const results = await searchYouTubeVideos(searchQuery);
      setVideoResults(results);
    } catch (error) {
      console.error("Video search failed", error);
    } finally {
      setIsSearching(false);
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
      const videos = await fetchChannelVideos(channel.id);
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
    <div className="p-6 space-y-8 max-w-7xl mx-auto pb-32 min-h-screen">
      <header className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-headline font-bold tracking-tighter text-white">DriveCast Media</h1>
            <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest opacity-60">Global Frequency Hub</p>
          </div>
        </div>

        {/* Video Search Bar */}
        <div className="flex gap-3 max-w-3xl">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="البحث عن فيديوهات..."
              className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl text-lg font-headline focus-visible:ring-primary backdrop-blur-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVideoSearch()}
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(""); setVideoResults([]); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <Button 
            onClick={handleVideoSearch} 
            disabled={isSearching}
            className="h-14 px-8 rounded-2xl bg-primary text-white font-bold hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50"
          >
            {isSearching ? <Loader2 className="h-6 w-6 animate-spin" /> : "بحث"}
          </Button>
        </div>
      </header>

      {selectedChannel ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
          <Button 
            onClick={() => setSelectedChannel(null)}
            variant="ghost"
            className="text-white hover:bg-white/10 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5 mr-2" /> العودة للقنوات
          </Button>

          <div className="flex items-center gap-6 p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
             <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-primary shadow-2xl">
                <Image src={selectedChannel.thumbnail} alt={selectedChannel.title} fill className="object-cover" />
             </div>
             <div className="flex-1">
                <h2 className="text-3xl font-headline font-bold text-white mb-1">{selectedChannel.title}</h2>
                <p className="text-muted-foreground text-sm line-clamp-2 max-w-xl">{selectedChannel.description}</p>
             </div>
          </div>

          {isLoadingVideos ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground font-bold tracking-widest text-xs uppercase">جاري تحميل الفيديوهات...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {channelVideos.map((video) => {
                const isSaved = savedVideos.some(v => v.id === video.id);
                return (
                  <Card 
                    key={video.id} 
                    className="group relative overflow-hidden bg-white/5 border-none rounded-3xl transition-all hover:scale-[1.02] cursor-pointer"
                    onClick={() => setActiveVideo(video)}
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <Image
                        src={video.thumbnail}
                        alt={video.title}
                        fill
                        className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      
                      <div className="absolute top-3 right-3 z-20">
                         <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => handleToggleSave(e, video)}
                          className={`w-10 h-10 rounded-full backdrop-blur-3xl border border-white/10 ${isSaved ? "bg-accent text-black" : "bg-black/40 text-white hover:bg-white hover:text-black"}`}
                         >
                           <Bookmark className={`w-5 h-5 ${isSaved ? "fill-current" : ""}`} />
                         </Button>
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-3xl flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-2xl">
                          <Play className="w-6 h-6 text-white fill-white ml-1" />
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-bold text-sm line-clamp-2 text-white font-headline leading-tight">{video.title}</h3>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : videoResults.length > 0 ? (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-headline text-primary flex items-center gap-2">
              <Youtube className="w-5 h-5" /> نتائج البحث
            </h2>
            <Button variant="ghost" onClick={() => setVideoResults([])} className="text-muted-foreground hover:text-white">إغلاق النتائج</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {videoResults.map((video) => {
              const isSaved = savedVideos.some(v => v.id === video.id);
              return (
                <Card 
                  key={video.id} 
                  onClick={() => setActiveVideo(video)}
                  className="group relative overflow-hidden bg-white/5 border-none rounded-2xl transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <div className="aspect-video relative overflow-hidden">
                    <Image src={video.thumbnail} alt={video.title} fill className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute top-2 right-2 z-20">
                       <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => handleToggleSave(e, video)}
                        className={`w-8 h-8 rounded-full backdrop-blur-3xl border border-white/10 ${isSaved ? "bg-accent text-black" : "bg-black/40 text-white"}`}
                       >
                         <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                       </Button>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-xs line-clamp-2 text-white leading-tight">{video.title}</h3>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">{video.channelTitle}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="space-y-8 animate-in fade-in duration-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold font-headline text-white flex items-center gap-3">
              <Radio className="text-primary w-6 h-6" /> القنوات المشتركة
            </h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {/* Add Channel Button Item */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <div className="flex flex-col items-center gap-3 group cursor-pointer">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center bg-white/5 group-hover:bg-white/10 group-hover:border-primary transition-all duration-300">
                    <Plus className="w-10 h-10 text-white/40 group-hover:text-primary transition-colors" />
                  </div>
                  <span className="font-bold text-sm text-white/60 group-hover:text-white transition-colors">إضافة قناة</span>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-zinc-900 border-white/10 rounded-[2.5rem] p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="p-8 border-b border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                  <DialogTitle className="text-2xl font-bold text-white mb-4">البحث عن قنوات يوتيوب</DialogTitle>
                  <div className="flex gap-3">
                    <Input 
                      placeholder="اسم القناة أو القارئ..." 
                      value={channelSearchQuery}
                      onChange={(e) => setChannelSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleChannelSearch()}
                      className="bg-white/5 border-white/10 h-12 rounded-xl text-lg"
                    />
                    <Button onClick={handleChannelSearch} disabled={isSearchingChannels} className="h-12 px-6 rounded-xl bg-primary text-white">
                      {isSearchingChannels ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    </Button>
                  </div>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] p-6">
                  <div className="space-y-4">
                    {channelResults.length === 0 && !isSearchingChannels && (
                      <div className="text-center py-12 text-muted-foreground">
                        ابحث عن قنواتك المفضلة لإضافتها للوحة القيادة
                      </div>
                    )}
                    {channelResults.map((channel) => {
                      const isSubscribed = favoriteChannels.some(c => c.id === channel.id);
                      return (
                        <div key={channel.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                          <div className="relative w-16 h-16 rounded-full overflow-hidden border border-white/10">
                            <Image src={channel.thumbnail} alt={channel.title} fill className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-white truncate">{channel.title}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-1">{channel.description}</p>
                          </div>
                          <Button 
                            onClick={() => isSubscribed ? removeChannel(channel.id) : addChannel(channel)}
                            variant={isSubscribed ? "secondary" : "default"}
                            size="sm"
                            className={`rounded-xl px-4 font-bold ${isSubscribed ? "bg-accent/10 text-accent" : "bg-primary text-white"}`}
                          >
                            {isSubscribed ? <Check className="w-4 h-4 mr-2" /> : <PlusCircle className="w-4 h-4 mr-2" />}
                            {isSubscribed ? "تمت الإضافة" : "إضافة"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {/* Favorite Channels Grid */}
            {favoriteChannels.map((channel) => {
              const isStarred = starredChannelIds.includes(channel.id);
              return (
                <div key={channel.id} className="flex flex-col items-center gap-3 group relative">
                  <div 
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-primary transition-all duration-500 cursor-pointer shadow-xl relative"
                    onClick={() => handleSelectChannel(channel)}
                  >
                    <Image
                      src={channel.thumbnail}
                      alt={channel.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  </div>
                  
                  {/* Star Button (Favorite Indicator) */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleStarChannel(channel.id); }}
                    className={cn(
                      "absolute top-0 left-0 sm:left-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all z-10 border border-white/10 backdrop-blur-md",
                      isStarred ? "bg-accent text-black" : "bg-black/40 text-white/40"
                    )}
                  >
                    <Star className={cn("w-4 h-4", isStarred && "fill-current")} />
                  </button>

                  {/* Delete Button (Red Circle) */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeChannel(channel.id); }}
                    className="absolute top-0 right-0 sm:right-2 w-8 h-8 rounded-full bg-destructive text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all z-10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <span className="font-bold text-sm text-center text-white/80 group-hover:text-white truncate w-full px-2">{channel.title}</span>
                </div>
              );
            })}
          </div>

          {favoriteChannels.length === 0 && (
            <div className="text-center py-24 bg-white/5 rounded-[3rem] border-2 border-dashed border-white/5">
              <Radio className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
              <h3 className="text-2xl font-bold text-white/40">قائمة القنوات فارغة</h3>
              <p className="text-muted-foreground mt-2">اضغط على "إضافة قناة" للبدء في تخصيص مكتبتك</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
