
import { IptvView } from "@/components/iptv/iptv-view";

export default function IptvPage() {
  return (
    <main className="w-full min-h-full bg-black relative">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 via-black to-blue-900/10 pointer-events-none" />
      <IptvView />
    </main>
  );
}
