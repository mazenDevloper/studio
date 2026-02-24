
import { FootballView } from "@/components/football/football-view";
import { CarDock } from "@/components/layout/car-dock";

export default function FootballPage() {
  return (
    <>
      <CarDock />
      <main className="flex-1 overflow-y-auto bg-black relative">
        <div className="absolute inset-0 bg-gradient-to-bl from-orange-900/10 via-black to-amber-900/10 pointer-events-none" />
        <FootballView />
      </main>
    </>
  );
}
