import { DashboardView } from "@/components/dashboard/dashboard-view";
import { CarDock } from "@/components/layout/car-dock";

export default function Home() {
  return (
    <>
      <CarDock />
      <main className="flex-1 overflow-y-auto bg-black relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-black to-purple-900/10 pointer-events-none" />
        <DashboardView />
      </main>
    </>
  );
}
