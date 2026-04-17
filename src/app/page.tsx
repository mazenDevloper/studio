
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default function Home() {
  return (
    <main className="w-full min-h-full bg-black relative">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-black to-purple-900/10 pointer-events-none" />
      <DashboardView />
    </main>
  );
}
