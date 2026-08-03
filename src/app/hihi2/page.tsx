
"use client";

import { useEffect, useState } from "react";
import { Maximize2, Minimize2, MonitorPlay, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaStore } from "@/lib/store";
import { SovereignIframe } from "@/components/ui/sovereign-iframe";

/**
 * Sports Hub v6.5 - WinWin & FootNow Edition
 * Powered by Sovereign Iframe Engine
 * Bypasses CORS and Root Refusal for global sports radar.
 */
export default function SportsHubPage() {
  const { setActiveIptv, dockSide } = useMediaStore();
  const [key, setKey] = useState(0);
  const [maximizedView, setMaximizedView] = useState<'none' | 'footnow' | 'winwin'>('none');
  
  const isDockLeft = dockSide === 'left';

  const refreshRadar = () => { setKey(Date.now()); };
  const toggleMaximize = (view: 'footnow' | 'winwin') => setMaximizedView(maximizedView === view ? 'none' : view);

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
      <div className={cn("flex-1 relative w-full h-full p-4 flex gap-6 transition-none", isDockLeft ? "flex-row" : "flex-row-reverse")} dir="rtl">
        
        {/* WinWin News Frame */}
        <div className={cn(
          "relative rounded-[3rem] overflow-hidden border-2 border-white/5 transition-none bg-black group shadow-2xl focusable",
          maximizedView === 'winwin' ? "flex-[10] z-20" : maximizedView === 'footnow' ? "flex-0 w-0 opacity-0 pointer-events-none" : "flex-[3.5] z-10"
        )} tabIndex={0}>
          <SovereignIframe key={`${key}-winwin`} src={`https://www.winwin.com/%D9%83%D8%B1%D8%A9-%D9%82%D8%AF%D9%85/%D9%85%D9%88%D8%A7%D8%B9%D9%8A%D8%AF-%D9%88%D9%8نتائج-%D9%85%D8%A8%D8%A7%D8%B1%D9%8A%D8%A7%D8%AA-%D8%A7%D9%84%D9%8A%D9%88%D9%85-%D8%A8%D8%AB-%D9%85%D8%A8%D8%A7%D8%B1?v=${key}`} title="WinWin News" />
          <div className="absolute bottom-8 right-8 z-30">
            <button onClick={() => toggleMaximize('winwin')} className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/40 focusable shadow-glow transition-none">
              {maximizedView === 'winwin' ? <Minimize2 /> : <Maximize2 />}
            </button>
          </div>
        </div>

        {/* FootNow Global Radar Frame */}
        <div className={cn(
          "relative rounded-[3rem] overflow-hidden border-2 border-white/10 transition-none bg-black group focusable flex flex-col",
          maximizedView === 'footnow' ? "flex-[10] z-20" : maximizedView === 'winwin' ? "flex-0 w-0 opacity-0 pointer-events-none" : "flex-[6.5] z-10"
        )} tabIndex={0}>
          <SovereignIframe key={`${key}-footnow`} src="https://footnow.info/" title="FootNow Radar" />
          <div className="absolute bottom-8 left-8 flex gap-4 z-30">
            <button onClick={refreshRadar} className="w-16 h-16 rounded-[1.8rem] bg-emerald-600/20 backdrop-blur-xl border border-emerald-500/40 flex items-center justify-center text-emerald-400 focusable shadow-glow transition-none">
              <RefreshCw className="w-8 h-8" />
            </button>
            <button onClick={globalizeFootNow} className="h-16 px-8 rounded-[1.8rem] bg-white/10 backdrop-blur-xl border-2 text-white flex items-center gap-4 focusable shadow-glow transition-none">
              <MonitorPlay className="w-7 h-7" />
              <span className="font-black uppercase tracking-widest text-emerald-400">رادار كروي</span>
            </button>
            <button onClick={() => toggleMaximize('footnow')} className="w-16 h-16 rounded-[1.8rem] bg-white/10 backdrop-blur-xl flex items-center justify-center text-white/40 focusable transition-none">
              {maximizedView === 'footnow' ? <Minimize2 /> : <Maximize2 />}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
