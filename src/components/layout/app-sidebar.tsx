"use client";

import { LayoutDashboard, PlayCircle, Settings, Map, Moon, Compass } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppSidebar() {
  const pathname = usePathname();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Media", href: "/media", icon: PlayCircle },
    { name: "Navigation", href: "#", icon: Compass },
    { name: "Astronomy", href: "#", icon: Moon },
    { name: "Settings", href: "#", icon: Settings },
  ];

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <PlayCircle className="text-accent w-5 h-5" />
        </div>
        <span className="font-headline font-bold text-xl tracking-tighter group-data-[collapsible=icon]:hidden">
          DriveCast
        </span>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarMenu>
          {navigation.map((item) => (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={item.name}
                className="hover:bg-primary/20 transition-all"
              >
                <Link href={item.href}>
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 group-data-[collapsible=icon]:hidden">
        <div className="p-3 rounded-xl bg-secondary/50 border border-white/5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">System Status</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-medium">Core Online</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
