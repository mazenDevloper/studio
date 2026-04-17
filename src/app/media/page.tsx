
import { MediaView } from "@/components/media/media-view";

export default function MediaPage() {
  return (
    <main className="w-full min-h-full bg-black relative">
      <div className="absolute inset-0 bg-gradient-to-tr from-red-900/10 via-black to-orange-900/10 pointer-events-none" />
      <MediaView />
    </main>
  );
}
