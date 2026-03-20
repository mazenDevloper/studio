
import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { GlobalVideoPlayer } from "@/components/media/global-player";
import { GlobalQuranPlayer } from "@/components/quran/global-quran-player";
import { FirebaseClientProvider } from "@/firebase";
import { LiveMatchIsland } from "@/components/football/live-match-island";
import { RemotePointer } from "@/components/layout/remote-pointer";
import { VoiceCommandHub } from "@/components/layout/voice-command-hub";
import { MainLayoutShell } from "@/components/layout/main-layout-shell";

export const metadata: Metadata = {
  title: 'DriveCast | CarPlay',
  description: 'Futuristic automotive interface.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DriveCast',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

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
        <link rel="stylesheet" href="/globals.css" />
        {/* EXTERNAL CSS WITH ABSOLUTE HIGHEST PRIORITY - LOADED DEAD LAST */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/mazenDevloper/Mz@main/src/importx.css" />
      </head>
      <body className="font-body antialiased bg-black text-foreground overflow-hidden h-screen w-full relative" suppressHydrationWarning>
        <FirebaseClientProvider>
          <LiveMatchIsland />
          <RemotePointer />
          <VoiceCommandHub />
          <MainLayoutShell>
            {children}
          </MainLayoutShell>
          <GlobalVideoPlayer />
          <GlobalQuranPlayer />
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
