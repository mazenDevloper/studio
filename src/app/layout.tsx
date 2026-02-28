
import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { GlobalVideoPlayer } from "@/components/media/global-player";
import { FirebaseClientProvider } from "@/firebase";
import { LiveMatchIsland } from "@/components/football/live-match-island";
import { RemotePointer } from "@/components/layout/remote-pointer";
import { VoiceCommandHub } from "@/components/layout/voice-command-hub";

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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="cursor" content="disabled" />
      </head>
      <body className="font-body antialiased bg-black text-foreground overflow-hidden h-screen w-full relative" suppressHydrationWarning>
        <FirebaseClientProvider>
          {/* الجزيرة العائمة - مركز التنبيهات الذكي */}
          <LiveMatchIsland />
          
          {/* محرك الريموت الفائق */}
          <RemotePointer />

          {/* نظام الأوامر الصوتية العالمي */}
          <VoiceCommandHub />
          
          <div className="flex flex-col md:flex-row w-full h-full overflow-hidden">
            <div className="h-0 w-0 md:w-24 shrink-0 md:h-full" /> 
            <div className="flex-1 overflow-auto relative h-full safe-p-bottom">
              {children}
            </div>
          </div>
          
          <GlobalVideoPlayer />
          
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
