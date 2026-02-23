
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, RefreshCw, ExternalLink } from "lucide-react";
import { suggestPersonalizedYouTubeContent, type SuggestPersonalizedYouTubeContentOutput } from "@/ai/flows/suggest-personalized-youtube-content-flow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { YouTubeChannel } from "@/lib/youtube";

interface Props {
  channels: YouTubeChannel[];
}

export function YouTubeSuggestionsWidget({ channels }: Props) {
  const [suggestions, setSuggestions] = useState<SuggestPersonalizedYouTubeContentOutput | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchSuggestions() {
    if (channels.length === 0) return;
    setLoading(true);
    try {
      const channelTitles = channels.map(c => c.title);
      const result = await suggestPersonalizedYouTubeContent({ favoriteChannels: channelTitles });
      setSuggestions(result);
    } catch (error) {
      console.error("Failed to fetch suggestions", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (channels.length > 0) {
      fetchSuggestions();
    }
  }, [channels]);

  return (
    <Card className="border-none bg-zinc-900/50 rounded-[2.5rem] ios-shadow">
      <CardHeader className="p-8 flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold font-headline text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center ios-shadow">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          AI Curated Feed
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={fetchSuggestions} disabled={loading || channels.length === 0} className="rounded-full hover:bg-white/10 w-12 h-12">
          <RefreshCw className={`h-6 w-6 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="p-8 pt-0">
        {channels.length === 0 ? (
          <div className="py-12 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/5">
            <p className="text-muted-foreground italic text-lg font-medium">Add frequencies in Media to sync AI intelligence.</p>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-[2.5rem] bg-zinc-800" />)}
          </div>
        ) : suggestions ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {suggestions.suggestions.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex flex-col gap-5 p-8 rounded-[2.5rem] bg-white/5 border border-white/5 hover:border-primary/50 transition-all group ios-shadow relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity">
                   <ExternalLink className="w-6 h-6 text-primary" />
                </div>
                <div className="flex items-center">
                  <span className={`text-[10px] px-4 py-1.5 rounded-full font-bold uppercase tracking-[0.2em] ${item.type === 'channel' ? 'bg-accent/20 text-accent border border-accent/20' : 'bg-primary/20 text-primary border border-primary/20'}`}>
                    {item.type}
                  </span>
                </div>
                <h4 className="text-2xl font-bold font-headline leading-tight group-hover:text-primary transition-colors">{item.title}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed font-medium">
                  {item.reason}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
