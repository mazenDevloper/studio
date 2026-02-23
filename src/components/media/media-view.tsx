
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Play, Trash2, Youtube, Radio, Loader2, Check, ArrowLeft, Clock, Bookmark } from "lucide-react";
import { useMediaStore } from "@/lib/store";
import { searchYouTubeChannels, fetchChannelVideos, YouTubeChannel, YouTubeVideo } from "@/lib/youtube";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

export function MediaView() {
  const { favoriteChannels, addChannel, removeChannel, savedVideos, toggleSaveVideo } = useMediaStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<YouTubeChannel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<YouTubeChannel | null>(null);
  const [channelVideos, setChannelVideos] = useState<YouTubeVideo[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const results = await searchYouTubeChannels(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSelectChannel = async (channel: YouTubeChannel) => {
    setSelectedChannel(channel);
    setIsLoadingVideos(true);
    const videos = await fetchChannelVideos(channel.id);
    setChannelVideos(videos);
    setIsLoadingVideos(false);
  };

  const toggleSubscription = (e: React.MouseEvent, channel: YouTubeChannel) => {
    e.stopPropagation();
    const isSubscribed = favoriteChannels.some(c => c.id === channel.id);
    if (isSubscribed) {
      removeChannel(channel.id);
    } else {
      addChannel(channel);
    }
  };

  const handleToggleSave = (e: React.MouseEvent, video: YouTubeVideo) => {
    e.stopPropagation();
    toggleSaveVideo(video);
  };

  return (
    <div className="p-8 space-y-12 max-w-7xl mx-auto pb-32">
      <header className="flex flex-col gap-8">
        <div>
          <h1 className="text-6xl font-headline font-bold tracking-tighter mb-2">Media</h1>
          <p className="text-muted-foreground text-xl font-medium uppercase tracking-widest">iOS 26 • Neural Transmissions</p>
        </div>
        
        {!selectedChannel && (
          <div className="flex gap-4 max-w-3xl">
            <div className="relative flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
              <Input
                placeholder="Search YouTube Channels..."
                className="pl-16 h-20 bg-zinc-900/80 border-white/5 rounded-[2rem] text-xl font-headline focus-visible:ring-primary backdrop-blur-3xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={isSearching}
              className="h-20 px-10 rounded-[2rem] bg-white text-black font-bold text-xl hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="w-8 h-8 animate-spin" /> : "Find"}
            </Button>
          </div>
        )}
      </header>

      {selectedChannel ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedChannel(null)}
            className="rounded-full h-16 px-8 text-xl font-bold gap-3 hover:bg-white/10"
          >
            <ArrowLeft className="w-6 h-6" /> Back to Channels
          </Button>

          <div className="flex items-center gap-8 p-10 rounded-[3rem] bg-zinc-900/40 border border-white/5 backdrop-blur-xl">
             <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-primary/50 shadow-2xl shadow-primary/20">
                <Image src={selectedChannel.thumbnail} alt={selectedChannel.title} fill className="object-cover" />
             </div>
             <div className="flex-1">
                <h2 className="text-4xl font-headline font-bold text-white mb-2">{selectedChannel.title}</h2>
                <p className="text-muted-foreground text-lg line-clamp-2 max-w-2xl">{selectedChannel.description}</p>
             </div>
             <Button 
                onClick={(e) => toggleSubscription(e, selectedChannel)}
                variant={favoriteChannels.some(c => c.id === selectedChannel.id) ? "secondary" : "default"}
                className={`rounded-[1.5rem] h-16 px-10 text-xl font-bold ${favoriteChannels.some(c => c.id === selectedChannel.id) ? "bg-accent/10 text-accent" : "bg-white text-black"}`}
              >
                {favoriteChannels.some(c => c.id === selectedChannel.id) ? <Check className="w-6 h-6 mr-3" /> : <Plus className="w-6 h-6 mr-3" />}
                {favoriteChannels.some(c => c.id === selectedChannel.id) ? "Added" : "Add to Feed"}
              </Button>
          </div>

          {isLoadingVideos ? (
            <div className="flex flex-col items-center justify-center p-32 gap-6">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground font-bold tracking-widest uppercase">Fetching Stream...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {channelVideos.map((video) => {
                const isSaved = savedVideos.some(v => v.id === video.id);
                return (
                  <Card 
                    key={video.id} 
                    className="group relative overflow-hidden bg-zinc-900/80 border-none rounded-[2.5rem] transition-all hover:scale-[1.02] cursor-pointer ios-shadow"
                    onClick={() => setPlayingVideoId(video.id)}
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <Image
                        src={video.thumbnail}
                        alt={video.title}
                        fill
                        className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      
                      <div className="absolute top-4 right-4 z-20">
                         <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => handleToggleSave(e, video)}
                          className={`w-12 h-12 rounded-full backdrop-blur-3xl border border-white/10 ${isSaved ? "bg-accent text-black" : "bg-black/40 text-white hover:bg-white hover:text-black"}`}
                         >
                           <Bookmark className={`w-6 h-6 ${isSaved ? "fill-current" : ""}`} />
                         </Button>
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-3xl flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-2xl">
                          <Play className="w-10 h-10 text-white fill-white ml-1" />
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-6 space-y-2">
                      <h3 className="font-bold text-xl line-clamp-1 font-headline">{video.title}</h3>
                      <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                         <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Latest</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {searchResults.length > 0 && (
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold font-headline text-primary flex items-center gap-3">
                Search Results
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {searchResults.map((channel) => {
                  const isSubscribed = favoriteChannels.some(c => c.id === channel.id);
                  return (
                    <Card 
                      key={channel.id} 
                      onClick={() => handleSelectChannel(channel)}
                      className="group relative overflow-hidden bg-zinc-900/40 border-white/5 rounded-[2.5rem] transition-all hover:bg-zinc-900/60 cursor-pointer"
                    >
                      <div className="p-6 flex flex-col items-center text-center gap-4">
                        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-primary transition-colors">
                          <Image src={channel.thumbnail} alt={channel.title} fill className="object-cover" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg line-clamp-1">{channel.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{channel.description}</p>
                        </div>
                        <Button 
                          onClick={(e) => toggleSubscription(e, channel)}
                          variant={isSubscribed ? "secondary" : "default"}
                          className={`w-full rounded-2xl font-bold py-6 ${isSubscribed ? "bg-accent/10 text-accent border border-accent/20" : "bg-white text-black"}`}
                        >
                          {isSubscribed ? <Check className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                          {isSubscribed ? "Added" : "Add"}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          <section className="space-y-8">
            <h2 className="text-3xl font-bold font-headline flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center ios-shadow">
                <Youtube className="text-white w-7 h-7" />
              </div>
              Subscribed Transmissions
            </h2>
            
            {favoriteChannels.length === 0 ? (
              <Card className="bg-zinc-900/30 border-dashed border-white/5 rounded-[3rem]">
                <CardContent className="flex flex-col items-center justify-center p-24 text-center">
                  <div className="w-24 h-24 rounded-full bg-zinc-800/50 flex items-center justify-center mb-8 border border-white/5">
                    <Radio className="w-12 h-12 text-muted-foreground animate-pulse" />
                  </div>
                  <h3 className="text-3xl font-bold mb-3 font-headline">Silence Detected</h3>
                  <p className="text-muted-foreground max-w-md text-xl font-medium leading-relaxed">
                    Your frequency list is empty. Search for channels to initialize your AI dashboard.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {favoriteChannels.map((channel) => (
                  <Card 
                    key={channel.id} 
                    onClick={() => handleSelectChannel(channel)}
                    className="group relative overflow-hidden bg-zinc-900/80 border-none rounded-[2.5rem] transition-all hover:scale-[1.02] cursor-pointer ios-shadow"
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <Image
                        src={channel.thumbnail}
                        alt={channel.title}
                        fill
                        className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Button 
                          size="icon" 
                          className="rounded-full w-20 h-20 bg-white/20 backdrop-blur-3xl text-white hover:bg-white hover:text-black hover:scale-110 transition-all opacity-0 group-hover:opacity-100 border border-white/20"
                        >
                          <Play className="fill-current w-10 h-10 ml-1" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="min-w-0">
                        <h3 className="font-bold text-xl truncate font-headline">{channel.title}</h3>
                        <p className="text-[10px] text-accent font-bold uppercase tracking-[0.2em] mt-1">Live Feed</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full w-12 h-12"
                        onClick={(e) => { e.stopPropagation(); removeChannel(channel.id); }}
                      >
                        <Trash2 className="w-6 h-6" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <Dialog open={!!playingVideoId} onOpenChange={() => setPlayingVideoId(null)}>
        <DialogContent className="max-w-[90vw] w-full h-[85vh] bg-black border-white/5 p-0 rounded-[3rem] overflow-hidden ios-shadow">
          {playingVideoId && (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
