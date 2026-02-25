
import { SettingsView } from "@/components/settings/settings-view";
import { CarDock } from "@/components/layout/car-dock";

export default function SettingsPage() {
  return (
    <>
      <CarDock />
      <main className="flex-1 overflow-y-auto bg-black relative">
        <SettingsView />
      </main>
    </>
  );
}
