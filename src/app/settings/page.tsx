
import { SettingsView } from "@/components/settings/settings-view";
import { CarDock } from "@/components/layout/car-dock";

export default function SettingsPage() {
  return (
    <>
      <CarDock />
      <main className="flex-1 overflow-y-auto bg-black relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-zinc-900/40 via-black to-zinc-800/20 pointer-events-none" />
        <SettingsView />
      </main>
    </>
  );
}
