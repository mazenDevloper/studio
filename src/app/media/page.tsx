import { MediaView } from "@/components/media/media-view";
import { CarDock } from "@/components/layout/car-dock";

export default function MediaPage() {
  return (
    <>
      <CarDock />
      <main className="flex-1 overflow-y-auto bg-black relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-red-900/10 via-black to-orange-900/10 pointer-events-none" />
        <MediaView />
      </main>
    </>
  );
}
