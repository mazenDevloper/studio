
"use client";

import { useEffect, useState } from "react";
import { Maximize2, MonitorPlay, RefreshCw, ArrowLeftRight, Globe, Send, Home, Edit3, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaStore } from "@/lib/store";
import { SovereignIframe } from "@/components/ui/sovereign-iframe";
import { Input } from "@/components/ui/input";

/**
 * SportsHubPage v160.0 - Sovereign Multi-Frame Control
 * Features: Editable frame URLs saved to cloud + Enhanced Iframe interaction.
 */
export function SportsHubPage() {
  const { setActiveIptv, dockSide, mapSettings, updateMapSettings, syncMasterBin } = useMediaStore();
  const [key, setKey] = useState(0);
  const [viewMode, setViewMode] = useState<'split' | 'winwin' | 'beinlive'>('split');
  
  const [urlInput, setUrlInput] = useState(mapSettings.winwinUrl || "https://psee.io/9f4ngl");
  const [beinUrl, setBeinUrl] = useState(mapSettings.beinUrl || "https://idebsports.ly/matches");
  
  const [isEditingLeft, setIsEditingLeft] = useState(false);
  const [isEditingRight, setIsEditingRight] = useState(false);

  const isDockLeft = dockSide === 'left';

  const refreshRadar = () => { setKey(Date.now()); };
  
  const resetToHome = () => {
    setBeinUrl("https://idebsports.ly/matches");
    setUrlInput("https://psee.io/9f4ngl");
    setKey(Date.now());
  };

  const toggleView = () => {
    if (viewMode === 'split') setViewMode('winwin');
    else if (viewMode === 'winwin') setViewMode('beinlive');
    else setViewMode('split');
  };

  const handleSaveLeft = () => {
    updateMapSettings({ beinUrl });
    setIsEditingLeft(false);
  };

  const handleSaveRight = () => {
    updateMapSettings({ winwinUrl: urlInput });
    setIsEditingRight(false);
  };

  const globalizeBeInLive = () => {
    setActiveIptv({
      stream_id: "idebsports-radar",
      name: "IDEB SPORTS LIVE",
      stream_icon: "https://idebsports.ly/favicon.ico",
      category_id: "direct",
      url: beinUrl,
      type: 'web'
    });
  };

  return (
    <main className="w-full h-full bg-black relative flex flex-col overflow-hidden transition-none">
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
                 className="h-12 w-full bg-white/5 border-none pl-12 pr-4 rounded-full text-white font-bold text-sm focusable"
                 placeholder="رابط الرادار الأيمن..."
               />
            </div>

            <div className="flex items-center gap-2 pr-2">
               <button onClick={resetToHome} className="h-12 w-12 rounded-full bg-white/10 text-white flex items-center justify-center focusable hover:bg-white/20 transition-all shadow-glow"><Home className="w-5 h-5" /></button>
            </div>
         </div>
      </div>

      <div className={cn("flex-1 relative w-full h-full p-4 pt-24 flex gap-6 transition-all duration-700", isDockLeft ? "flex-row" : "flex-row-reverse")} dir="rtl">
        {/* Left / Secondary Frame */}
        <div className={cn(
          "relative rounded-[3rem] overflow-hidden border-2 border-white/5 transition-all duration-700 bg-black group shadow-2xl focusable",
          viewMode === 'winwin' ? "flex-[10] z-20" : viewMode === 'beinlive' ? "flex-0 w-0 opacity-0 pointer-events-none" : "flex-[3.5] z-10"
        )} tabIndex={0}>
          <SovereignIframe key={`${key}-beinlive`} src={beinUrl} title="Sports News Feed" />
          <div className="absolute top-4 right-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
             {isEditingLeft ? (
               <>
                 <Input value={beinUrl} onChange={(e) => setBeinUrl(e.target.value)} className="bg-black/80 border-white/20 w-60 h-10 text-[10px]" />
                 <button onClick={handleSaveLeft} className="w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center"><Save className="w-4 h-4" /></button>
               </>
             ) : (
               <button onClick={() => setIsEditingLeft(true)} className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center border border-white/10"><Edit3 className="w-4 h-4" /></button>
             )}
          </div>
        </div>

        {/* Right / Main Frame */}
        <div className={cn(
          "relative rounded-[3rem] overflow-hidden border-2 border-white/10 transition-all duration-700 bg-black group focusable flex flex-col",
          viewMode === 'beinlive' ? "flex-[10] z-20" : viewMode === 'winwin' ? "flex-0 w-0 opacity-0 pointer-events-none" : "flex-[6.5] z-10"
        )} tabIndex={0}>
          <div className="absolute inset-0 overflow-hidden rounded-[3rem]">
             <div className="absolute w-full h-full left-0 top-0">
                <SovereignIframe key={`${key}-winwin`} src={`${urlInput}${urlInput.includes('?') ? '&' : '?'}v=${key}`} title="Sovereign Radar" />
             </div>
          </div>
          
          <div className="absolute bottom-8 left-8 flex gap-4 z-30">
            <button onClick={refreshRadar} className="w-16 h-16 rounded-[1.8rem] bg-emerald-600/20 backdrop-blur-xl border border-emerald-500/40 flex items-center justify-center text-emerald-400 focusable shadow-glow">
              <RefreshCw className="w-8 h-8" />
            </button>
            <button onClick={globalizeBeInLive} className="h-16 px-8 rounded-[1.8rem] bg-white/10 backdrop-blur-xl border-2 text-white flex items-center gap-4 focusable shadow-glow">
              <MonitorPlay className="w-7 h-7" />
              <span className="font-black uppercase tracking-widest text-emerald-400">توسيع الرادار</span>
            </button>
          </div>

          <div className="absolute top-4 left-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
             {isEditingRight ? (
               <>
                 <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="bg-black/80 border-white/20 w-60 h-10 text-[10px]" />
                 <button onClick={handleSaveRight} className="w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center"><Save className="w-4 h-4" /></button>
               </>
             ) : (
               <button onClick={() => setIsEditingRight(true)} className="w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center border border-white/10"><Edit3 className="w-4 h-4" /></button>
             )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SportsHubPageWrapper() { return <SportsHubPage />; }
