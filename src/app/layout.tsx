
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

/**
 * RootLayoutWrapper component - Global container
 * Features: Always-On WakeLock & Media Session Integration.
 */
function RootLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { customFonts, fetchPriorityData, isInitialLoading, activeVideo, activeIptv, activeAudio, isPlaying } = useMediaStore();
  const [mounted, setMounted] = useState(false);
  const wakeLockRef = useRef<any>(null);

  // 1. Sovereign WakeLock: Prevent screen sleep and app suspension
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {}
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

  // 2. Media Session: Control from lock screen and background
  useEffect(() => {
    if ('mediaSession' in navigator && (activeVideo || activeIptv || activeAudio)) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: activeVideo?.title || activeIptv?.name || activeAudio?.title || 'DriveCast Stream',
        artist: activeVideo?.channelTitle || activeAudio?.channelTitle || 'Sovereign Hub',
        album: 'DriveCast Media',
        artwork: [
          { src: activeVideo?.thumbnail || activeIptv?.stream_icon || activeAudio?.thumbnail || '', sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => useMediaStore.getState().setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => useMediaStore.getState().setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', () => useMediaStore.getState().prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => useMediaStore.getState().nextTrack());
    }
  }, [activeVideo, activeIptv, activeAudio]);

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
              <p className="text-primary font-black text-[10px] uppercase tracking-[0.8em] animate-pulse">Always-On Protocol Active</p>
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
