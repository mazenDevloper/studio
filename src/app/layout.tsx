
"use client";

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { GlobalVideoPlayer } from "@/components/media/global-player";
import { GlobalQuranPlayer } from "@/components/quran/global-quran-player";
import { FirebaseClientProvider } from "@/firebase";
import { useMediaStore } from "@/lib/store";
import { LiveMatchIsland } from "@/components/football/live-match-island";
import { RemotePointer } from "@/components/layout/remote-pointer";
import { MainLayoutShell } from "@/components/layout/main-layout-shell";
import Script from 'next/script';
import { useEffect } from 'react';

/**
 * RootLayoutWrapper component - Global container without global scale
 */
function RootLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-screen overflow-hidden bg-black">
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&display=swap" rel="stylesheet" />
        
        <Script type="text/javascript" src="$vidaa/sdk/vidaa-sdk.js" strategy="beforeInteractive" />
        <Script src="https://polyfill.io/v3/polyfill.min.js?features=default,es6,es7,es8,es9" strategy="beforeInteractive" />
        <Script src="https://aframe.io/releases/1.6.0/aframe.min.js" strategy="afterInteractive" />
        
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/mazenDevloper/Mz@main/src/importx.css" />
      </head>
      <body className="font-body antialiased bg-black text-foreground overflow-hidden h-screen w-full relative" suppressHydrationWarning>
        <FirebaseClientProvider>
          <RootLayoutWrapper>
            <LiveMatchIsland />
            <RemotePointer />
            <MainLayoutShell>
              {children}
            </MainLayoutShell>
            <GlobalVideoPlayer />
            <GlobalQuranPlayer />
            <Toaster />
          </RootLayoutWrapper>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
