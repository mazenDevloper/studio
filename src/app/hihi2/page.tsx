
"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { RefreshCw, Maximize2, Minimize2, Tv, MonitorPlay, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMediaStore } from "@/lib/store";
import { ShortcutBadge } from "@/components/layout/car-dock";

/**
 * SportsHubPage v530.0 - Advanced Iframe Jailbreak
 * Features: srcdoc Isolation for bypassing 'refused to connect' and precision scroll.
 */
export default function SportsHubPage() {
  const [key, setKey] = useState(Date.now());
  const [maximizedView, setMaximizedView] = useState<'none' | 'ideb' | 'hihi'>('none');
  const idebScrollRef = useRef<HTMLDivElement>(null);
  const { setActiveIptv, activeIptv } = useMediaStore();

  useEffect(() => {
    const interval = setInterval(() => setKey(Date.now()), 600000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (idebScrollRef.current) {
        idebScrollRef.current.scrollTop = 1000;
      }
    }, 1500); 
    return () => clearTimeout(timer);
  }, [key, maximizedView]);

  // Advanced srcdoc approach to bypass origin restrictions
  const idebSrcDoc = useMemo(() => {
    const targetUrl = `https://idebsports.ly/livestream?v=${key}&t=${Math.random()}`;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="referrer" content="no-referrer">
          <style>
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
            iframe { width: 100%; height: 2500px; border: none; background: #000; }
          </style>
        </head>
        <body>
          <iframe 
            src="${targetUrl}" 
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          ></iframe>
        </body>
      </html>
    `;
  }, [key]);

  const toggleMaximize = (view: 'ideb' | 'hihi') => {
    if (maximizedView === view) setMaximizedView('none');
    else setMaximizedView(view);
  };

  const refreshIdeb = () => setKey(Date.now());

  const globalizeIdeb = () => {
    setActiveIptv({
      stream_id: "ideb-live",
      name: "IDEB SPORTS LIVE",
      stream_icon: "https://idebsports.ly/assets/images/logo.png",
      category_id: "direct",
      url: `https://idebsports.ly/livestream?v=${key}`,
      type: 'web'
    });
  };

  const isIdebInGlobal = activeIptv?.stream_id === 'ideb-live';

  return (
    <main className="w-full h-full bg-black relative flex flex-col overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-orange-900/5 via-black to-blue-900/5 pointer-events-none z-0" />
      
      <div className="flex-1 relative w-full h-full bg-black p-4 flex gap-4 overflow-y-auto no-scrollbar" dir="rtl">
        
        {/* HIHI2 - Right View */}
        <div className={cn(
          "relative rounded-[2.5rem] overflow-hidden border-2 border-white/5 transition-all duration-700 ease-in-out bg-black group shadow-2xl focusable",
          maximizedView === 'hihi' ? "flex-[10] z-20" : maximizedView === 'ideb' ? "flex-0 w-0 opacity-0 pointer-events-none" : "flex-[3] z-10"
        )} tabIndex={0} data-nav-id="hihi-frame-container">
          <iframe 
            key={`${key}-hihi`}
            src={`https://hihi2.com/?v=${key}`}
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-forms allow-same-origin allow-presentation allow-downloads allow-popups"
            style={{ background: '#000' }}
            loading="lazy"
          />
          <div className="absolute bottom-6 right-6 flex items-center gap-2 z-30">
            <button 
              onClick={() => toggleMaximize('hihi')}
              className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 group-hover:text-white group-hover:bg-white/20 transition-all focusable shadow-glow"
            >
              {maximizedView === 'hihi' ? <Minimize2 className="w-7 h-7" /> : <Maximize2 className="w-7 h-7" />}
            </button>
          </div>
        </div>

        {/* IDEB SPORTS - Left View */}
        <div className={cn(
          "relative rounded-[2.5rem] overflow-hidden border-2 border-white/5 transition-all duration-700 ease-in-out bg-black group shadow-2xl focusable flex flex-col",
          maximizedView === 'ideb' ? "flex-[10] z-20" : maximizedView === 'hihi' ? "flex-0 w-0 opacity-0 pointer-events-none" : "flex-[7] z-10"
        )} tabIndex={0} data-nav-id="ideb-frame-container" onKeyDown={(e) => e.key === 'Enter' && globalizeIdeb()}>
          
          <div 
            ref={idebScrollRef}
            className="flex-1 w-full overflow-y-auto no-scrollbar bg-black" 
            style={{ direction: 'rtl' }}
          >
            <iframe 
              key={`${key}-ideb-doc`}
              srcDoc={idebSrcDoc}
              className="w-full border-none"
              style={{ background: '#000', height: '2500px' }} 
              loading="eager"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            />
          </div>

          <div className="absolute bottom-6 left-6 flex items-center gap-3 z-30">
            <button 
              onClick={refreshIdeb}
              className="w-14 h-14 rounded-2xl bg-orange-600/20 backdrop-blur-md border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:text-white group-hover:bg-orange-600 transition-all focusable shadow-glow"
            >
              <RefreshCw className="w-7 h-7" />
            </button>

            <button 
              onClick={globalizeIdeb}
              className={cn(
                "h-14 px-6 rounded-2xl backdrop-blur-md border flex items-center gap-3 transition-all focusable shadow-glow",
                isIdebInGlobal ? "bg-emerald-500 text-black border-emerald-400" : "bg-white/10 text-white/60 border-white/10 group-hover:text-white"
              )}
            >
              <MonitorPlay className="w-6 h-6" />
              <span className="text-xs font-black uppercase tracking-widest">{isIdebInGlobal ? "مشغل عالمياً" : "بث شامل"}</span>
              <ShortcutBadge action="nav_ok" className="-top-3 -right-3" />
            </button>

            <button 
              onClick={() => toggleMaximize('ideb')}
              className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/40 group-hover:text-white group-hover:bg-white/20 transition-all focusable shadow-glow"
            >
              {maximizedView === 'ideb' ? <Minimize2 className="w-7 h-7" /> : <Maximize2 className="w-7 h-7" />}
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}
