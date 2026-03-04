
import { IptvView } from "@/components/iptv/iptv-view";
import { CarDock } from "@/components/layout/car-dock";

export default function IptvPage() {
  return (
    <>
      <CarDock />
      <main className="flex-1 overflow-y-auto bg-black relative">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 via-black to-blue-900/10 pointer-events-none" />
        <IptvView />
      </main>
    </>
  );
}
