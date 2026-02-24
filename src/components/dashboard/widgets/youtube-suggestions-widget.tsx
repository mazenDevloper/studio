
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, RefreshCw, Play, Star, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMediaStore } from "@/lib/store";
import { suggestPersonalizedYouTubeContent, SuggestedContentSchema } from "@/ai/flows/suggest-personalized-youtube-content-flow";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function YouTubeSuggestionsWidget() {
  const { favoriteChannels, setActiveVideo } = useMediaStore();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const getAISuggestions = async () => {
    if (favoriteChannels.length === 0) return;
    setLoading(true);
    try {
      const result = await suggestPersonalizedYouTubeContent({
        favoriteChannels: favoriteChannels.map(c => c.title)
      });
      if (result.suggestions) {
        setSuggestions(result.suggestions);
      }
    } catch (error) {
      console.error("AI Suggestions Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (suggestions.length === 0 && favoriteChannels.length > 0) {
      getAISuggestions();
    }
  }, [favoriteChannels]);

  if (favoriteChannels.length === 0) return null;

  return (
    <Card className="border-none bg-zinc-900/50 rounded-[2.5rem] ios-shadow overflow-hidden">
      <CardHeader className="p-8 flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold font-headline text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20">
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          </div>
          AI Recommended Channels
        </CardTitle>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={getAISuggestions} 
          disabled={loading}
          className="rounded-full hover:bg-white/10 w-10 h-10"
        >
          <RefreshCw className={cn("w-4 h-4 text-white/60", loading && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent className="p-8 pt-0">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max gap-4 pb-4">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="w-[300px] h-[100px] rounded-[1.5rem] bg-white/5 animate-pulse" />
              ))
            ) : suggestions.map((item, idx) => (
              <div 
                key={idx}
                className="w-[320px] p-5 rounded-[1.5rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all flex items-center gap-4 group cursor-default"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/10">
                  <Youtube className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate font-headline">{item.title}</h4>
                  <p className="text-[9px] text-white/40 uppercase tracking-widest mt-1 truncate">{item.reason}</p>
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="bg-white/5 h-1.5" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

import { cn } from "@/lib/utils";
