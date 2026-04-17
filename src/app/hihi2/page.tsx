
"use client";

import { useEffect, useState } from "react";
import { Trophy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FootballBallIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m12 12-4-2.5" />
      <path d="m12 12 4-2.5" />
      <path d="M12 12v5" />
      <path d="m12 7-1.5 2.5 1.5 2.5 1.5-2.5z" />
      <path d="m12 17-2-3 2-3 2 3z" />
      <path d="m8 9.5-3 1 1.5 3.5 3-1z" />
      <path d="m16 9.5 3 1-1.5 3.5-3-1z" />
    </svg>
  );
}

export default function Hihi2Page() {
  const [key, setKey] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setKey(Date.now());
    }, 120000); // 2 minutes auto-refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="w-full h-full bg-black relative flex flex-col overflow-hidden">
      <header className="h-16 flex items-center justify-between px-8 bg-black/40 backdrop-blur-md border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <FootballBallIcon className="w-6 h-6 text-amber-500 animate-pulse" />
          <span className="text-white font-black text-xl tracking-tighter">HIHI2 SPORTS</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setKey(Date.now())}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white/60 focusable"
        >
          <RefreshCw className="w-5 h-5" />
        </Button>
      </header>
      
      <div className="flex-1 relative w-full h-full bg-zinc-950">
        <iframe 
          key={key}
          src="https://hihi2.com/"
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-forms allow-same-origin allow-presentation allow-downloads"
          style={{ background: '#000' }}
        />
        <div className="absolute inset-0 pointer-events-none border-[10px] border-black/20" />
      </div>
    </main>
  );
}
