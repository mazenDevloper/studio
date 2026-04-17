
import { FootballView } from "@/components/football/football-view";

export default function FootballPage() {
  return (
    <main className="w-full min-h-full bg-black relative">
      <div className="absolute inset-0 bg-gradient-to-bl from-orange-900/10 via-black to-amber-900/10 pointer-events-none" />
      <FootballView />
    </main>
  );
}
