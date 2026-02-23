"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Play, Trash2, Youtube, Info } from "lucide-react";
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
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-1">Media Center</h1>
          <p className="text-muted-foreground text-lg">Manage your transmission frequencies.</p>
        </div>
        
        <div className="flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for channels or themes..."
              className="pl-10 h-12 bg-secondary/30 border-white/10 rounded-xl focus-visible:ring-accent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <Button onClick={handleAdd} className="h-12 px-6 rounded-xl bg-accent text-black font-bold hover:bg-accent/90">
            <Plus className="w-5 h-5 mr-1" />
            Add
          </Button>
        </div>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-bold font-headline flex items-center gap-2">
          <Youtube className="text-red-500 w-6 h-6" />
          Favorite Channels
        </h2>
        
        {favoriteChannels.length === 0 ? (
          <Card className="bg-white/5 border-dashed border-white/20">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Youtube className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold mb-1">No channels yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Search and add your favorite YouTube channels to get personalized suggestions.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {favoriteChannels.map((channel) => (
              <Card key={channel} className="group relative overflow-hidden bg-card border-white/5 hover:border-accent/40 transition-all">
                <div className="aspect-video relative overflow-hidden">
                  <Image
                    src={channel.toLowerCase().includes('tech') ? techImage || "https://picsum.photos/seed/tech/400/225" : scienceImage || "https://picsum.photos/seed/science/400/225"}
                    alt={channel}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      onClick={() => setSelectedChannel(channel)}
                      size="icon" 
                      className="rounded-full w-12 h-12 bg-accent text-black hover:scale-110 transition-transform"
                    >
                      <Play className="fill-current w-6 h-6" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold truncate max-w-[150px]">{channel}</h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Subscriber Content</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeChannel(channel)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Video Preview Dialog */}
      <Dialog open={!!selectedChannel} onOpenChange={() => setSelectedChannel(null)}>
        <DialogContent className="max-w-2xl bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline font-bold">{selectedChannel} - Latest Content</DialogTitle>
            <DialogDescription>Synchronizing latest transmission from neural network.</DialogDescription>
          </DialogHeader>
          <div className="aspect-video w-full rounded-xl bg-black flex flex-col items-center justify-center border border-white/5 relative group overflow-hidden">
             <Image
                src={selectedChannel?.toLowerCase().includes('tech') ? techImage || "https://picsum.photos/seed/tech/800/450" : scienceImage || "https://picsum.photos/seed/science/800/450"}
                alt="Preview"
                fill
                className="object-cover opacity-50"
             />
             <div className="z-10 flex flex-col items-center gap-4">
                <Play className="w-16 h-16 text-accent animate-pulse" />
                <p className="font-headline font-bold text-xl uppercase tracking-tighter">Initializing stream...</p>
             </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-secondary/30 border border-white/5">
            <Info className="w-5 h-5 text-accent shrink-0 mt-1" />
            <div className="space-y-1">
               <h4 className="font-bold text-sm">Deep Space Telemetry Explained</h4>
               <p className="text-xs text-muted-foreground">This content is analyzed by AI to generate recommendations on your dashboard.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
