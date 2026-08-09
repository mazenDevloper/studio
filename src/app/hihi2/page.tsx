
"use client";

import { useEffect, useState } from "react";
import { Maximize2, Minimize2, MonitorPlay, RefreshCw, ArrowLeftRight, Globe, Send, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaStore } from "@/lib/store";
import { SovereignIframe } from "@/components/ui/sovereign-iframe";
import { Input } from "@/components/ui/input";

/**
 * SportsHubPage v145.0 - Sovereign Browser Edition
 * Features: Named Frame Target for internal navigation and enhanced URL Bar.
 */
export function SportsHubPage() {
  const { setActiveIptv, dockSide } = useMediaStore();
  const [key, setKey] = useState(0);
  const [viewMode, setViewMode] = useState<'split' | 'winwin' | 'beinlive'>('split');
  
  // URL Bar States
  const [urlInput, setUrlInput] = useState("https://psee.io/9f4ngl");
  const [activeUrl, setActiveUrl] = useState("https://psee.io/9f4ngl");
  const [beinUrl, setBeinUrl] = useState("https://www.beinlive.online/");

  const isDockLeft = dockSide === 'left';

  const refreshRadar = () => { 
    setKey(Date.now()); 
  };
  
  const resetToHome = () => {
    if (viewMode === 'beinlive') setBeinUrl("https://www.beinlive.online/");
    else setActiveUrl("https://psee.io/9f4ngl");
    setKey(Date.now());
  };

  const toggleView = () => {
    if (viewMode === 'split') {
      setViewMode('winwin');
    } else if (viewMode === 'winwin') {
      setViewMode('beinlive');
    } else {
      setViewMode('split');
    }
  };

  const handleGo = () => {
    let target = urlInput.trim();
    if (!target) return;
    if (!target.startsWith('http')) target = 'https://' + target;
    
    if (viewMode === 'beinlive') {
      setBeinUrl(target);
    } else {
      setActiveUrl(target);
    }
    setKey(Date.now());
  };

  const globalizeBeInLive = () => {
    setActiveIptv({
      stream_id: "beinlive-radar",
      name: "BEINLIVE RADAR",
      stream_icon: "https://www.beinlive.online/favicon.ico",
      category_id: "direct",
      url: beinUrl,
      type: 'web'
    });
  };

  // Sync Input when view changes to show what's loading
  useEffect(() => {
    if (viewMode === 'beinlive') setUrlInput(beinUrl);
    else setUrlInput(activeUrl);
  }, [viewMode, activeUrl, beinUrl]);

  return (
    <main className="w-full h-full bg-black relative flex flex-col overflow-hidden transition-none">
      {/* Sovereign Browser Controls */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-4 w-[60%] animate-in fade-in duration-1000">
         <div className="flex items-center gap-3 w-full bg-black/40 backdrop-blur-3xl p-2 rounded-[2rem] border border-white/10 shadow-2xl">
            <button 
              onClick={toggleView} 
              className="h-12 px-6 rounded-full bg-primary/20 text-white font-black flex items-center gap-3 focusable hover:bg-primary/40 transition-all shrink-0"
            >
               <ArrowLeftRight className="w-5 h-5 text-primary" />
               <span className="text-[10px] uppercase tracking-widest">تبديل العرض</span>
            </button>

            <div className="flex-1 relative flex items-center">
               <Globe className="absolute left-4 w-4 h-4 text-white/20" />
               <Input 
                 value={urlInput}
                 onChange={(e) => setUrlInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleGo()}
                 className="h-12 w-full bg-white/5 border-none pl-12 pr-4 rounded-full text-white font-bold text-sm focusable"
                 placeholder="أدخل رابط الرادار السيادي..."
               />
            </div>

            <div className="flex items-center gap-2 pr-2">
               <button onClick={resetToHome} className="h-12 w-12 rounded-full bg-white/10 text-white flex items-center justify-center focusable hover:bg-white/20 transition-all shadow-glow" title="الرجوع للبداية"><Home className="w-5 h-5" /></button>
               <button onClick={handleGo} className="h-12 w-12 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center focusable hover:bg-emerald-500/40 transition-all shrink-0 shadow-glow"><Send className="w-5 h-5" /></button>
            </div>
         </div>
      </div>

      <div className={cn("flex-1 relative w-full h-full p-4 pt-24 flex gap-6 transition-all duration-700", isDockLeft ? "flex-row" : "flex-row-reverse")} dir="rtl">
        
        {/* BeInLive News Frame */}
        <div className={cn(
          "relative rounded-[3rem] overflow-hidden border-2 border-white/5 transition-all duration-700 bg-black group shadow-2xl focusable",
          viewMode === 'winwin' ? "flex-[10] z-20" : viewMode === 'beinlive' ? "flex-0 w-0 opacity-0 pointer-events-none" : "flex-[3.5] z-10"
        )} tabIndex={0}>
          <SovereignIframe key={`${key}-beinlive`} src={beinUrl} title="BeInLive News" />
        </div>

        {/* Primary Radar Frame (WinWin/Custom with 14% Offset) */}
        <div className={cn(
          "relative rounded-[3rem] overflow-hidden border-2 border-white/10 transition-all duration-700 bg-black group focusable flex flex-col",
          viewMode === 'beinlive' ? "flex-[10] z-20" : viewMode === 'winwin' ? "flex-0 w-0 opacity-0 pointer-events-none" : "flex-[6.5] z-10"
        )} tabIndex={0}>
          <div className="absolute inset-0 overflow-hidden rounded-[3rem]">
             <div className="absolute w-full h-[114%] -top-[14%] left-0">
                <SovereignIframe key={`${key}-winwin`} src={`${activeUrl}${activeUrl.includes('?') ? '&' : '?'}v=${key}`} title="WinWin Radar" />
             </div>
          </div>
          
          <div className="absolute bottom-8 left-8 flex gap-4 z-30">
            <button onClick={refreshRadar} className="w-16 h-16 rounded-[1.8rem] bg-emerald-600/20 backdrop-blur-xl border border-emerald-500/40 flex items-center justify-center text-emerald-400 focusable shadow-glow transition-none">
              <RefreshCw className="w-8 h-8" />
            </button>
            <button onClick={globalizeBeInLive} className="h-16 px-8 rounded-[1.8rem] bg-white/10 backdrop-blur-xl border-2 text-white flex items-center gap-4 focusable shadow-glow transition-none">
              <MonitorPlay className="w-7 h-7" />
              <span className="font-black uppercase tracking-widest text-emerald-400">رادار beIN</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SportsHubPageWrapper() { return <SportsHubPage />; }
