import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { GlobalVideoPlayer } from "@/components/media/global-player";
import { FirebaseClientProvider } from "@/firebase";
import { LiveMatchIsland } from "@/components/football/live-match-island";

export const metadata: Metadata = {
  title: 'DriveCast | CarPlay',
  description: 'Futuristic automotive interface.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground overflow-hidden h-screen w-full flex relative" suppressHydrationWarning>
        <FirebaseClientProvider>
          <LiveMatchIsland />
          <div className="flex w-full h-full overflow-hidden">
            {/* The dock will be fixed via its own component, we provide spacing here */}
            <div className="w-24 shrink-0 h-full" /> 
            <div className="flex-1 overflow-hidden relative h-full">
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