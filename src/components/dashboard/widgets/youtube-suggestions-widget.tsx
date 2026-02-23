"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, RefreshCw, ExternalLink } from "lucide-react";
import { suggestPersonalizedYouTubeContent, type SuggestPersonalizedYouTubeContentOutput } from "@/ai/flows/suggest-personalized-youtube-content-flow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  channels: string[];
}

export function YouTubeSuggestionsWidget({ channels }: Props) {
  const [suggestions, setSuggestions] = useState<SuggestPersonalizedYouTubeContentOutput | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchSuggestions() {
    if (channels.length === 0) return;
    setLoading(true);
    try {
      const result = await suggestPersonalizedYouTubeContent({ favoriteChannels: channels });
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
    <Card className="h-full border-accent/20 bg-gradient-to-tr from-card via-card to-accent/5 shadow-[0_0_30px_rgba(65,184,131,0.05)]">
      <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-accent flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Curated Stream
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={fetchSuggestions} disabled={loading || channels.length === 0}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {channels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
            <p className="text-sm text-muted-foreground italic">No channels added yet.</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Add favorites in Media screen to get suggestions</p>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full rounded-xl bg-white/5" />
            <Skeleton className="h-16 w-full rounded-xl bg-white/5" />
            <Skeleton className="h-16 w-full rounded-xl bg-white/5" />
          </div>
        ) : suggestions ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suggestions.suggestions.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-accent/40 transition-all group">
                <div className="flex items-center justify-between">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest ${item.type === 'channel' ? 'bg-purple-500/20 text-purple-400' : 'bg-accent/20 text-accent'}`}>
                    {item.type}
                  </span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
                <h4 className="text-sm font-bold line-clamp-1 group-hover:text-accent transition-colors">{item.title}</h4>
                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                  {item.reason}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Initializing stream...</p>
        )}
      </CardContent>
    </Card>
  );
}
