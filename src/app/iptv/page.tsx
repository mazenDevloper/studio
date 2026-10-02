
import { IptvView } from "@/components/iptv/iptv-view";

// Playlist loading runs as a server action; give big Xtream accounts room on serverless hosts.
export const maxDuration = 60;

export default function IptvPage() {
  return (
    <main className="w-full h-full bg-black relative">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 via-black to-blue-900/10 pointer-events-none" />
      <IptvView />
    </main>
  );
}
