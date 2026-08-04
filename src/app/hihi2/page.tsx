
"use client";

import { useEffect, useState } from "react";
import { Maximize2, Minimize2, MonitorPlay, RefreshCw, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaStore } from "@/lib/store";
import { SovereignIframe } from "@/components/ui/sovereign-iframe";

export default function SportsHubPage() {
  const { setActiveIptv, dockSide } = useMediaStore();
  const [key, setKey] = useState(0);
  const [viewMode, setViewMode] = useState<'split' | 'winwin' | 'footnow'>('split');
  
  const isDockLeft = dockSide === 'left';

  const refreshRadar = () => { setKey(Date.now()); };
  
  const toggleView = () => {
    if (viewMode === 'split') setViewMode('winwin');
    else if (viewMode === 'winwin') setViewMode('footnow');
    else setViewMode('split');
  };

  const globalizeFootNow = () => {
    setActiveIptv({
      stream_id: "footnow-live",
      name: "FOOTNOW LIVE RADAR",
      stream_icon: "https://footnow.info/favicon.ico",
      category_id: "direct",
      url: `https://footnow.info/`,
      type: 'web'
    });
  };

  return (
    <main className="w-full h-full bg-black relative flex flex-col overflow-hidden transition-none">
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] flex gap-4 animate-in fade-in duration-1000">
         <button 
           onClick={toggleView} 
           className="h-14 px-8 rounded-full bg-black/60 backdrop-blur-3xl border-2 border-primary/40 text-white font-black flex items-center gap-4 focusable shadow-glow hover:scale-105 active:scale-95 transition-all"
         >
            <ArrowLeftRight className="w-6 h-6 text-primary" />
            <span className="text-sm uppercase tracking-widest">تبديل العرض السيادي</span>
         </button>
      </div>

      <div className={cn("flex-1 relative w-full h-full p-4 flex gap-6 transition-all duration-700", isDockLeft ? "flex-row" : "flex-row-reverse")} dir="rtl">
        
        {/* FootNow News Frame (Small) */}
        <div className={cn(
          "relative rounded-[3rem] overflow-hidden border-2 border-white/5 transition-all duration-700 bg-black group shadow-2xl focusable",
          viewMode === 'winwin' ? "flex-[10] z-20" : viewMode === 'footnow' ? "flex-0 w-0 opacity-0 pointer-events-none" : "flex-[3.5] z-10"
        )} tabIndex={0}>
          <SovereignIframe key={`${key}-footnow`} src="https://footnow.info/" title="FootNow News" />
        </div>

        {/* WinWin Global Radar Frame (Large with 14% Offset) */}
        <div className={cn(
          "relative rounded-[3rem] overflow-hidden border-2 border-white/10 transition-all duration-700 bg-black group focusable flex flex-col",
          viewMode === 'footnow' ? "flex-[10] z-20" : viewMode === 'winwin' ? "flex-0 w-0 opacity-0 pointer-events-none" : "flex-[6.5] z-10"
        )} tabIndex={0}>
          <div className="absolute inset-0 overflow-hidden rounded-[3rem]">
             <div className="absolute w-full h-[114%] -top-[14%] left-0">
                <SovereignIframe key={`${key}-winwin`} src={`https://psee.io/9f4ngl?v=${key}`} title="WinWin Radar" />
             </div>
          </div>
          
          <div className="absolute bottom-8 left-8 flex gap-4 z-30">
            <button onClick={refreshRadar} className="w-16 h-16 rounded-[1.8rem] bg-emerald-600/20 backdrop-blur-xl border border-emerald-500/40 flex items-center justify-center text-emerald-400 focusable shadow-glow transition-none">
              <RefreshCw className="w-8 h-8" />
            </button>
            <button onClick={globalizeFootNow} className="h-16 px-8 rounded-[1.8rem] bg-white/10 backdrop-blur-xl border-2 text-white flex items-center gap-4 focusable shadow-glow transition-none">
              <MonitorPlay className="w-7 h-7" />
              <span className="font-black uppercase tracking-widest text-emerald-400">رادار كروي</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
