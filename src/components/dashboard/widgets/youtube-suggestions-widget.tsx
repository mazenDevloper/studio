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
    <Card className="border-none bg-zinc-900/50 rounded-[2.5rem] ios-shadow">
      <CardHeader className="p-8 flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold font-headline text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          Up Next for You
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={fetchSuggestions} disabled={loading || channels.length === 0} className="rounded-full hover:bg-white/10">
          <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="p-8 pt-0">
        {channels.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-muted-foreground italic">Add your favorite frequencies in Media to see suggestions here.</p>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-[2rem] bg-zinc-800" />)}
          </div>
        ) : suggestions ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {suggestions.suggestions.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex flex-col gap-4 p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:border-blue-500/50 transition-all group ios-shadow">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest ${item.type === 'channel' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {item.type}
                  </span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                </div>
                <h4 className="text-xl font-bold line-clamp-1 group-hover:text-blue-400 transition-colors">{item.title}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
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
