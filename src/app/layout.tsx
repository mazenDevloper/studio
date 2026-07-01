
"use client";

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { GlobalVideoPlayer } from "@/components/media/global-player";
import { GlobalQuranPlayer } from "@/components/quran/global-quran-player";
import { FirebaseClientProvider } from "@/firebase";
import { LiveMatchIsland } from "@/components/football/live-match-island";
import { RemotePointer } from "@/components/layout/remote-pointer";
import { MainLayoutShell } from "@/components/layout/main-layout-shell";
import { CarDock } from "@/components/layout/car-dock";
import Script from 'next/script';
import { useMediaStore } from '@/lib/store';

/**
 * RootLayoutWrapper component - Global container
 */
function RootLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { customFonts } = useMediaStore();
  
  return (
    <div className="w-full h-screen overflow-hidden bg-black relative flex">
      {/* Dynamic Font Face Injection for TTF */}
      <style dangerouslySetInnerHTML={{ __html: 
        customFonts.map(f => `
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
        
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/mazenDevloper/Mz@main/src/importx.css" />
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
            <Toaster />
          </RootLayoutWrapper>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
