"use client";

import { LayoutDashboard, Music2, Map, Radio, Settings, GripVertical } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function CarDock() {
  const pathname = usePathname();

  const apps = [
    { name: "Home", href: "/", icon: LayoutDashboard, color: "bg-blue-600" },
    { name: "Media", href: "/media", icon: Radio, color: "bg-red-500" },
    { name: "Music", href: "#", icon: Music2, color: "bg-pink-500" },
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

      <div className="flex flex-col items-center gap-1">
        <div className="text-sm font-bold tracking-tighter">14:48</div>
        <div className="text-[10px] font-bold text-muted-foreground">5G</div>
      </div>
    </div>
  );
}
