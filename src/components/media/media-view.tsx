"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Play, Trash2, Youtube, Info, Radio } from "lucide-react";
import { useMediaStore } from "@/lib/store";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function MediaView() {
  const { favoriteChannels, addChannel, removeChannel } = useMediaStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const scienceImage = PlaceHolderImages.find(img => img.id === "science-channel")?.imageUrl;
  const techImage = PlaceHolderImages.find(img => img.id === "tech-channel")?.imageUrl;

  const handleAdd = () => {
    if (searchQuery && !favoriteChannels.includes(searchQuery)) {
      addChannel(searchQuery);
      setSearchQuery("");
    }
  };

  return (
    <div className="p-8 space-y-10 max-w-7xl">
      <header className="flex flex-col gap-6">
        <div>
          <h1 className="text-5xl font-bold tracking-tight mb-2">Media</h1>
          <p className="text-muted-foreground text-xl">Curate your driving frequencies.</p>
        </div>
        
        <div className="flex gap-3 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search frequencies..."
              className="pl-12 h-16 bg-zinc-900 border-none rounded-[1.5rem] text-lg focus-visible:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <Button onClick={handleAdd} className="h-16 px-8 rounded-[1.5rem] bg-white text-black font-bold hover:bg-zinc-200">
            <Plus className="w-6 h-6 mr-1" />
            Add
          </Button>
        </div>
      </header>

      <section className="space-y-6">
        <h2 className="text-2xl font-bold font-headline flex items-center gap-3">
          <Youtube className="text-red-500 w-8 h-8" />
          Subscribed Transmissions
        </h2>
        
        {favoriteChannels.length === 0 ? (
          <Card className="bg-zinc-900/50 border-none rounded-[2rem]">
            <CardContent className="flex flex-col items-center justify-center p-16 text-center">
              <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-6">
                <Radio className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No frequencies found</h3>
              <p className="text-muted-foreground max-w-sm text-lg">
                Add your favorite YouTube channels to power the AI dashboard.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {favoriteChannels.map((channel) => (
              <Card key={channel} className="group relative overflow-hidden bg-zinc-900/80 border-none rounded-[2rem] transition-all hover:scale-[1.02]">
                <div className="aspect-video relative overflow-hidden">
                  <Image
                    src={channel.toLowerCase().includes('tech') ? techImage || "https://picsum.photos/seed/tech/400/225" : scienceImage || "https://picsum.photos/seed/science/400/225"}
                    alt={channel}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button 
                      onClick={() => setSelectedChannel(channel)}
                      size="icon" 
                      className="rounded-full w-14 h-14 bg-white text-black hover:scale-110 transition-transform opacity-0 group-hover:opacity-100"
                    >
                      <Play className="fill-current w-7 h-7 ml-1" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg truncate">{channel}</h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Active Link</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-red-500"
                    onClick={() => removeChannel(channel)}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!selectedChannel} onOpenChange={() => setSelectedChannel(null)}>
        <DialogContent className="max-w-3xl bg-zinc-950 border-white/5 p-8 rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="text-3xl font-headline font-bold">{selectedChannel}</DialogTitle>
            <DialogDescription className="text-lg">Streaming latest neural transmission...</DialogDescription>
          </DialogHeader>
          <div className="aspect-video w-full rounded-[2rem] bg-black flex flex-col items-center justify-center border border-white/5 relative overflow-hidden">
             <Image
                src={selectedChannel?.toLowerCase().includes('tech') ? techImage || "https://picsum.photos/seed/tech/800/450" : scienceImage || "https://picsum.photos/seed/science/800/450"}
                alt="Preview"
                fill
                className="object-cover opacity-50"
             />
             <div className="z-10 flex flex-col items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-3xl border border-white/10">
                  <Play className="w-10 h-10 text-white animate-pulse" />
                </div>
                <p className="font-headline font-bold text-2xl uppercase tracking-tighter">Initializing...</p>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
