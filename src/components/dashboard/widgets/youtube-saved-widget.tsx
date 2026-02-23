"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bookmark, Play, Clock } from "lucide-react";

const savedVideos = [
  { title: "The Future of Quantum Computing", author: "Veritasium", duration: "12:30", color: "bg-blue-500" },
  { title: "Mastering Next.js 15 for Apps", author: "Tech Lead", duration: "45:00", color: "bg-red-500" },
  { title: "Deep Sea Exploration Log", author: "National Geographic", duration: "18:22", color: "bg-teal-500" },
];

export function YouTubeSavedWidget() {
  return (
    <Card className="h-full border-white/5 bg-gradient-to-br from-card to-card/40">
      <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          YouTube Saved List
        </CardTitle>
        <Bookmark className="h-4 w-4 text-accent" />
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {savedVideos.map((video, idx) => (
          <div key={idx} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/10 cursor-pointer group">
            <div className={`w-12 h-12 rounded-lg ${video.color} flex items-center justify-center overflow-hidden relative`}>
              <Play className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10" />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold truncate">{video.title}</h4>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{video.author}</p>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
              <Clock className="w-3 h-3" />
              {video.duration}
            </div>
          </div>
        ))}
        <button className="w-full py-2 text-xs font-bold text-muted-foreground uppercase tracking-widest hover:text-white transition-colors">
          View All Library
        </button>
      </CardContent>
    </Card>
  );
}
