
"use client";

import { LayoutDashboard, Radio, Music2, Map, Settings, GripVertical, ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function CarDock() {
  const pathname = usePathname();
  const router = useRouter();

  const apps = [
    { name: "Home", href: "/", icon: LayoutDashboard, color: "bg-blue-600" },
    { name: "Media", href: "/media", icon: Radio, color: "bg-red-500" },
    { name: "Football", href: "/football", icon: Trophy, color: "bg-orange-600" },
    { name: "Maps", href: "#", icon: Map, color: "bg-green-500" },
    { name: "Settings", href: "#", icon: Settings, color: "bg-gray-600" },
  ];

  return (
    <div className="h-full w-24 bg-black/80 backdrop-blur-3xl border-r border-white/10 flex flex-col items-center py-6 gap-6 z-50">
      <div className="mb-4">
        <GripVertical className="text-white/20 w-6 h-6" />
      </div>

      <div className="flex-1 flex flex-col items-center gap-4">
        {apps.map((app) => (
          <Link
            key={app.name}
            href={app.href}
            className={cn(
              "w-16 h-16 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 relative group",
              app.color,
              pathname === app.href ? "scale-110 active-glow" : "opacity-60 grayscale-[0.3] hover:opacity-100"
            )}
          >
            <app.icon className="w-8 h-8 text-white" />
            {pathname === app.href && (
              <div className="absolute -right-2 w-1.5 h-6 bg-white rounded-full" />
            )}
          </Link>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 mt-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="w-16 h-16 rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/20 hover:scale-105 transition-all active:scale-90 shadow-2xl"
          title="رجوع"
        >
          <ArrowLeft className="w-9 h-9" />
        </Button>

        <div className="flex flex-col items-center gap-1 mt-2">
          <div className="text-sm font-bold tracking-tighter text-white">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase">5G</div>
        </div>
      </div>
    </div>
  );
}
