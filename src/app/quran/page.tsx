
import { QuranView } from "@/components/quran/quran-view";
import { CarDock } from "@/components/layout/car-dock";

export default function QuranPage() {
  return (
    <>
      <CarDock />
      <main className="flex-1 h-screen bg-black relative overflow-hidden">
        {/* Removed black overlay and gradients to keep it pure */}
        <QuranView />
      </main>
    </>
  );
}
