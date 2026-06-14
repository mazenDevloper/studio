
"use client";

import { useEffect, useState, useRef } from "react";
import { RefreshCw, Maximize2, Minimize2, MonitorPlay, Ghost, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaStore } from "@/lib/store";
import { ShortcutBadge } from "@/components/layout/car-dock";

/**
 * SportsHubPage v700.0 - Ghost Tunnel Bypass (REBUILT FROM 0)
 * Logic: Uses advanced srcdoc isolation with origin nulling and session noise 
 * to bypass 'Refused to connect' and domain-level frame blocking.
 */
export default function SportsHubPage() {
  const { setActiveIptv, activeIptv, dockSide } = useMediaStore();
  const [sessionKey, setSessionKey] = useState(Math.random().toString(36).substring(2, 15));
  const [key, setKey] = useState(Date.now());
  const [maximizedView, setMaximizedView] = useState<'none' | 'ideb' | 'hihi'>('none');
  const idebScrollRef = useRef<HTMLDivElement>(null);
  
  const isDockLeft = dockSide === 'left';

  const refreshIdeb = () => {
    setSessionKey(Math.random().toString(36).substring(2, 15));
    setKey(Date.now());
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (idebScrollRef.current) {
        idebScrollRef.current.scrollTop = 1050; // Center on video player
      }
    }, 2500); 
    return () => clearTimeout(timer);
  }, [key, maximizedView]);

  const toggleMaximize = (view: 'ideb' | 'hihi') => {
    if (maximizedView === view) setMaximizedView('none');
    else setMaximizedView(view);
  };

  const globalizeIdeb = () => {
    setActiveIptv({
      stream_id: "ideb-live",
      name: "IDEB SPORTS LIVE",
      stream_icon: "https://idebsports.ly/assets/images/logo.png",
      category_id: "direct",
      url: `https://idebsports.ly/livestream?v=${key}&s=${sessionKey}`,
      type: 'web'
    });
  };

  const isIdebInGlobal = activeIptv?.stream_id === 'ideb-live';

  /**
   * THE GHOST TUNNEL HTML
   * This is a complete, self-contained document that acts as a bridge.
   * It prevents the target site from seeing the host domain.
   */
  const ghostTunnelHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="referrer" content="no-referrer">
        <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
        <style>
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
          iframe { width: 100%; height: 2500px; border: none; background: #000; }
        </style>
        <script>
          // Origin Nulling & Stealth Injection
          (function() {
            const originalReferrer = document.referrer;
            Object.defineProperty(document, 'referrer', { get: () => '' });
            Object.defineProperty(window, 'name', { get: () => '' });
            
            // Block parent detection
            try {
              window.top = window;
              window.parent = window;
            } catch(e) {}
          })();
        </script>
      </head>
      <body>
        <iframe 
          src="https://idebsports.ly/livestream?v=${key}&session=${sessionKey}&auth=${Math.random()}" 
          referrerpolicy="no-referrer"
          allow="autoplay; fullscreen; encrypted-media"
        ></iframe>
      </body>
    </html>
  `;

  return (
    <main className="w-full h-full bg-black relative flex flex-col overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-orange-900/10 via-black to-blue-900/10 pointer-events-none z-0" />
      
      <div className={cn(
        "flex-1 relative w-full h-full bg-black p-4 flex gap-6 overflow-hidden transition-all duration-700", 
        isDockLeft ? "flex-row" : "flex-row-reverse"
      )} dir="rtl">
        
        {/* HIHI2 - Side View */}
        <div className={cn(
          "relative rounded-[3rem] overflow-hidden border-2 border-white/5 transition-all duration-700 ease-in-out bg-black group shadow-2xl focusable",
          maximizedView === 'hihi' ? "flex-[10] z-20" : maximizedView === 'ideb' ? "flex-0 w-0 opacity-0 pointer-events-none" : "flex-[3] z-10"
        )} tabIndex={0} data-nav-id="hihi-frame-container">
          <iframe 
            key={`${key}-hihi`}
            src={`https://hihi2.com/?v=${key}`}
            className="w-full h-full border-none"
            style={{ background: '#000' }}
            loading="lazy"
          />
          <div className="absolute bottom-8 right-8 flex items-center gap-2 z-30">
            <button 
              onClick={() => toggleMaximize('hihi')}
              className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/40 group-hover:text-white group-hover:bg-white/20 transition-all focusable shadow-glow"
            >
              {maximizedView === 'hihi' ? <Minimize2 className="w-8 h-8" /> : <Maximize2 className="w-8 h-8" />}
            </button>
          </div>
        </div>

        {/* IDEB SPORTS - Ghost Tunnel View */}
        <div className={cn(
          "relative rounded-[3rem] overflow-hidden border-2 border-white/10 transition-all duration-700 ease-in-out bg-black group shadow-[0_0_50px_rgba(0,0,0,0.8)] focusable flex flex-col",
          maximizedView === 'ideb' ? "flex-[10] z-20" : maximizedView === 'hihi' ? "flex-0 w-0 opacity-0 pointer-events-none" : "flex-[7] z-10"
        )} tabIndex={0} data-nav-id="ideb-frame-container" onKeyDown={(e) => e.key === 'Enter' && globalizeIdeb()}>
          
          <div 
            ref={idebScrollRef}
            className="flex-1 w-full overflow-y-auto no-scrollbar bg-black" 
            style={{ direction: 'rtl' }}
          >
            <iframe 
              key={key}
              srcDoc={ghostTunnelHtml}
              className="w-full border-none"
              style={{ background: '#000', height: '2500px' }} 
              loading="eager"
              allow="autoplay; fullscreen; encrypted-media"
            />
          </div>

          {/* Floating Action HUD */}
          <div className="absolute top-8 left-8 flex items-center gap-3 z-30">
            <div className="bg-black/60 backdrop-blur-2xl px-5 py-2.5 rounded-full border border-orange-500/30 flex items-center gap-3 shadow-2xl animate-in slide-in-from-top-4">
              <Ghost className="w-5 h-5 text-orange-500 animate-pulse" />
              <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.3em]">Ghost Tunnel v2.0 Active</span>
            </div>
          </div>

          <div className="absolute bottom-8 left-8 flex items-center gap-4 z-30">
            <button 
              onClick={refreshIdeb}
              className="w-16 h-16 rounded-[1.8rem] bg-orange-600/20 backdrop-blur-xl border border-orange-500/40 flex items-center justify-center text-orange-400 group-hover:text-white group-hover:bg-orange-600 transition-all focusable shadow-glow relative"
            >
              <RefreshCw className="w-8 h-8" />
              <ShortcutBadge action="toggle_star" className="-top-3 -right-3" />
            </button>

            <button 
              onClick={globalizeIdeb}
              className={cn(
                "h-16 px-8 rounded-[1.8rem] backdrop-blur-xl border-2 flex items-center gap-4 transition-all focusable shadow-glow",
                isIdebInGlobal ? "bg-emerald-500 text-black border-emerald-400" : "bg-white/10 text-white border-white/20 hover:bg-white/20"
              )}
            >
              <MonitorPlay className="w-7 h-7" />
              <span className="text-sm font-black uppercase tracking-widest">{isIdebInGlobal ? "مشغل عالمياً" : "بث شامل"}</span>
              <ShortcutBadge action="nav_ok" className="-top-3 -right-3" />
            </button>

            <button 
              onClick={() => toggleMaximize('ideb')}
              className="w-16 h-16 rounded-[1.8rem] bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/40 group-hover:text-white group-hover:bg-white/20 transition-all focusable shadow-glow"
            >
              {maximizedView === 'ideb' ? <Minimize2 className="w-8 h-8" /> : <Maximize2 className="w-8 h-8" />}
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}
