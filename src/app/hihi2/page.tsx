
"use client";

import { useEffect, useState } from "react";
import { Trophy, RefreshCw, Maximize2, Minimize2, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * FootballBallIcon - Custom SVG for Sports branding
 */
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

/**
 * SportsHubPage v360.0 - Swapped Split View Architecture
 * Features: Hihi2 on Left (30%), Ideb on Right (70%), Maximize/Minimize Toggle
 */
export default function SportsHubPage() {
  const [key, setKey] = useState(Date.now());
  const [maximizedView, setMaximizedView] = useState<'none' | 'ideb' | 'hihi'>('none');

  useEffect(() => {
    // 5 minutes auto-refresh to keep streams stable
    const interval = setInterval(() => {
      setKey(Date.now());
    }, 300000); 
    return () => clearInterval(interval);
  }, []);

  const toggleMaximize = (view: 'ideb' | 'hihi') => {
    if (maximizedView === view) setMaximizedView('none');
    else setMaximizedView(view);
  };

  return (
    <main className="w-full h-full bg-black relative flex flex-col overflow-hidden">
      {/* Dynamic Header */}
      <header className="h-16 flex items-center justify-between px-8 bg-black/40 backdrop-blur-md border-b border-white/5 relative z-30">
        <div className="flex items-center gap-3">
          <FootballBallIcon className="w-6 h-6 text-amber-500 animate-pulse" />
          <span className="text-white font-black text-xl tracking-tighter uppercase">Sports Live Hub</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/10">
            <Tv className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Dual Stream Engine</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setKey(Date.now())}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white/60 focusable"
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>
      </header>
      
      {/* Content Container with Swapped Split Layout */}
      <div className="flex-1 relative w-full h-full bg-zinc-950 p-4 flex gap-4 overflow-hidden">
        
        {/* HIHI2 - Left View (30% width in split) */}
        <div className={cn(
          "relative rounded-[2.5rem] overflow-hidden border-2 border-white/5 transition-all duration-700 ease-in-out bg-black group shadow-2xl focusable",
          maximizedView === 'hihi' ? "flex-[10] z-20" : maximizedView === 'ideb' ? "flex-0 w-0 opacity-0 pointer-events-none" : "flex-[3] z-10"
        )} tabIndex={0} data-nav-id="hihi-frame-container">
          <iframe 
            key={`${key}-hihi`}
            src="https://hihi2.com/"
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-forms allow-same-origin allow-presentation allow-downloads"
            style={{ background: '#000' }}
          />
          
          {/* Maximize Toggle Button for HIHI2 */}
          <button 
            onClick={() => toggleMaximize('hihi')}
            className="absolute bottom-6 left-6 w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 group-hover:text-white group-hover:bg-white/20 transition-all focusable z-30 shadow-glow"
            title={maximizedView === 'hihi' ? "Minimize" : "Maximize HIHI2"}
            data-nav-id="hihi-maximize-btn"
          >
            {maximizedView === 'hihi' ? <Minimize2 className="w-7 h-7" /> : <Maximize2 className="w-7 h-7" />}
          </button>
          
          {/* Visual Indicator */}
          <div className="absolute top-6 left-6 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">HIHI2 FEED</span>
          </div>
        </div>

        {/* IDEB SPORTS - Right View (70% width in split) */}
        <div className={cn(
          "relative rounded-[2.5rem] overflow-hidden border-2 border-white/5 transition-all duration-700 ease-in-out bg-black group shadow-2xl focusable",
          maximizedView === 'ideb' ? "flex-[10] z-20" : maximizedView === 'hihi' ? "flex-0 w-0 opacity-0 pointer-events-none" : "flex-[7] z-10"
        )} tabIndex={0} data-nav-id="ideb-frame-container">
          <iframe 
            key={`${key}-ideb`}
            src="https://idebsports.ly/livestream"
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-forms allow-same-origin allow-presentation allow-downloads"
            style={{ background: '#000' }}
          />
          
          {/* Maximize Toggle Button for IDEB */}
          <button 
            onClick={() => toggleMaximize('ideb')}
            className="absolute bottom-6 left-6 w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 group-hover:text-white group-hover:bg-white/20 transition-all focusable z-30 shadow-glow"
            title={maximizedView === 'ideb' ? "Minimize" : "Maximize IDEB"}
            data-nav-id="ideb-maximize-btn"
          >
            {maximizedView === 'ideb' ? <Minimize2 className="w-7 h-7" /> : <Maximize2 className="w-7 h-7" />}
          </button>
          
          {/* Visual Indicator */}
          <div className="absolute top-6 left-6 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">IDEB SPORTS LIVE</span>
          </div>
        </div>

      </div>

      {/* Background Overlay Decoration */}
      <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/5 via-black to-amber-900/5 pointer-events-none z-0" />
    </main>
  );
}
