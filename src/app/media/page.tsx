
import { Suspense } from 'react';
import { MediaView } from "@/components/media/media-view";
import { Loader2 } from "lucide-react";

/**
 * MediaPage v640.0 - Optimized Rendering
 * Wrapped in Suspense to handle useSearchParams() correctly in Next.js Client Components.
 */
export default function MediaPage() {
  return (
    <main className="w-full min-h-full bg-black relative">
      <div className="absolute inset-0 bg-gradient-to-tr from-red-900/10 via-black to-orange-900/10 pointer-events-none" />
      <Suspense fallback={
        <div className="h-screen w-full flex flex-col items-center justify-center bg-black gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-white/40 font-black text-xs uppercase tracking-[0.5em] animate-pulse">Synchronizing Media Radar...</p>
        </div>
      }>
        <MediaView />
      </Suspense>
    </main>
  );
}
