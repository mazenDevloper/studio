
"use client";

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { GlobalVideoPlayer } from "@/components/media/global-player";
import { GlobalQuranPlayer } from "@/components/quran/global-quran-player";
import { AudioPlayer } from "@/components/media/audio-player";
import { FirebaseClientProvider } from "@/firebase";
import { LiveMatchIsland } from "@/components/football/live-match-island";
import { RemotePointer } from "@/components/layout/remote-pointer";
import { MainLayoutShell } from "@/components/layout/main-layout-shell";
import { CarDock } from "@/components/layout/car-dock";
import Script from 'next/script';
import { useMediaStore } from '@/lib/store';
import { useEffect, useState, useRef } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { usePathname } from 'next/navigation';

/**
 * RootLayoutWrapper component - Global container
 * Features: Always-On WakeLock & Sovereign Auto-Click Sync Protocol (v7600 - Optimized).
 */
function RootLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { customFonts, fetchPriorityData, isInitialLoading, activeVideo, activeIptv, activeAudio, isPlaying } = useMediaStore();
  const [mounted, setMounted] = useState(false);
  const wakeLockRef = useRef<any>(null);
  const pathname = usePathname();

  // 1. Sovereign WakeLock: Prevent screen sleep and app suspension in car OS
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log("[Sovereign Protocol] WakeLock Activated");
        }
      } catch (err) {
        console.warn("[Sovereign Protocol] WakeLock Refused:", err);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // 2. Sovereign Auto-Click Sync Protocol v7600
  // Updated Timing: Fetch (2s) -> Optimizer Pulse 1 (6s) -> Optimizer Pulse 2 (11s)
  useEffect(() => {
    // 2.1 Content Cloud Fetch (Standard Sync)
    const timerFetch = setTimeout(() => {
      const btn = document.querySelector('[data-nav-id="content-cloud-fetch-0"]') as HTMLElement;
      if (btn) {
        btn.click();
        console.log("[Sovereign Sync] Content Cloud Fetch Executed @ 2s");
      }
    }, 2000);

    // 2.2 System Optimizer - Pulse 1 @ 6s
    const timerOpt1 = setTimeout(() => {
      const btn = document.querySelector('[data-nav-id="shortcut-item-5"]') as HTMLElement;
      if (btn) {
        btn.click();
        console.log("[Sovereign Sync] System Optimizer Pulse 1 Executed @ 6s");
      }
    }, 6000);

    // 2.3 System Optimizer - Pulse 2 @ 11s
    const timerOpt2 = setTimeout(() => {
      const btn = document.querySelector('[data-nav-id="shortcut-item-5"]') as HTMLElement;
      if (btn) {
        btn.click();
        console.log("[Sovereign Sync] System Optimizer Pulse 2 Executed @ 11s");
      }
    }, 11000);

    return () => {
      clearTimeout(timerFetch);
      clearTimeout(timerOpt1);
      clearTimeout(timerOpt2);
    };
  }, [pathname]);

  // 3. Advanced Media Session: Force Android to keep the process alive
  useEffect(() => {
    if ('mediaSession' in navigator) {
      const metadata = new MediaMetadata({
        title: activeVideo?.title || activeIptv?.name || activeAudio?.title || 'بث سيادي نشط',
        artist: activeVideo?.channelTitle || activeAudio?.channelTitle || 'DriveCast Sovereign Hub',
        album: 'نظام البث المركزي',
        artwork: [
          { 
            src: activeVideo?.thumbnail || activeIptv?.stream_icon || activeAudio?.thumbnail || 'https://www.image2url.com/r2/default/images/1782382707952-d99447c6-bc60-475d-9406-5fd2ef320bd5.png', 
            sizes: '512x512', 
            type: 'image/jpeg' 
          }
        ]
      });

      navigator.mediaSession.metadata = metadata;

      navigator.mediaSession.setActionHandler('play', () => useMediaStore.getState().setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => useMediaStore.getState().setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', () => useMediaStore.getState().prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => useMediaStore.getState().nextTrack());
      
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [activeVideo, activeIptv, activeAudio, isPlaying]);

  useEffect(() => {
    setMounted(true);
    fetchPriorityData('all');
  }, [fetchPriorityData]);

  if (!mounted) return <div className="bg-black w-full h-screen" />;
  
  return (
    <div className="w-full h-screen overflow-hidden bg-black relative flex">
      {isInitialLoading && (
        <div className="fixed inset-0 z-[100000] bg-black flex flex-col items-center justify-center gap-8 animate-in fade-in duration-500">
           <div className="relative">
              <div className="w-32 h-32 rounded-[2.5rem] bg-primary/20 border-2 border-primary/40 flex items-center justify-center shadow-[0_0_80px_rgba(var(--primary),0.3)] animate-pulse">
                 <Zap className="w-16 h-16 text-primary" />
              </div>
              <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
           </div>
           <div className="text-center space-y-2">
              <h1 className="text-4xl font-black text-white tracking-[0.3em] uppercase">DriveCast</h1>
              <p className="text-primary font-black text-[10px] uppercase tracking-[0.8em] animate-pulse">Anti-Destroy Protocol Active</p>
           </div>
           <div className="absolute bottom-20 flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-white/20" />
              <span className="text-white/10 font-bold text-[8px] uppercase tracking-widest">Sovereign Core Synced</span>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: 
        (customFonts || []).map(f => `
          @font-face {
            font-family: '${f.name}';
            src: url('${f.url}') format('truetype');
            font-display: swap;
          }
        `).join('\n')
      }} />
      {children}
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&family=Reem+Kufi:wght@400;700&family=Alkalami&family=Gulzar&display=swap" rel="stylesheet" />
        <Script type="text/javascript" src="$vidaa/sdk/vidaa-sdk.js" strategy="beforeInteractive" />
        <Script src="https://polyfill.io/v3/polyfill.min.js?features=default,es6,es7,es8,es9" strategy="beforeInteractive" />
      </head>
      <body className="font-body antialiased bg-black text-foreground overflow-hidden h-screen w-full relative" suppressHydrationWarning>
        <FirebaseClientProvider>
          <RootLayoutWrapper>
            <LiveMatchIsland />
            <RemotePointer />
            <CarDock />
            <MainLayoutShell>
              {children}
            </MainLayoutShell>
            <GlobalVideoPlayer />
            <GlobalQuranPlayer />
            <AudioPlayer />
            <Toaster />
          </RootLayoutWrapper>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
