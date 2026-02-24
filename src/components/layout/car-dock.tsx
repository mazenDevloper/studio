
"use client";

import { LayoutDashboard, Radio, Settings, GripVertical, ArrowLeft, Trophy, ZoomIn, ZoomOut, Mic, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMediaStore } from "@/lib/store";
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export function CarDock() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { mapSettings, updateMapSettings } = useMediaStore();
  const [isListening, setIsListening] = useState(false);

  const apps = [
    { name: "Home", href: "/", icon: LayoutDashboard, color: "bg-blue-600" },
    { name: "Media", href: "/media", icon: Radio, color: "bg-red-500" },
    { name: "Football", href: "/football", icon: Trophy, color: "bg-orange-600" },
    { name: "Settings", href: "/settings", icon: Settings, color: "bg-zinc-700" },
  ];

  const handleVoiceSearch = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition;
    
    if (!SpeechRecognition) {
      toast({
        variant: "destructive",
        title: "System Error",
        description: "Voice search is not supported by your browser.",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      router.push(`/media?q=${encodeURIComponent(transcript)}`);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }, [router, toast]);

  return (
    <div className="fixed top-0 left-0 h-screen w-24 bg-black/90 backdrop-blur-3xl border-r border-white/5 flex flex-col items-center py-8 gap-8 z-[100] shadow-[20px_0_50px_rgba(0,0,0,0.8)]">
      <div className="mb-2">
        <GripVertical className="text-white/10 w-6 h-6" />
      </div>

      <div className="flex-1 flex flex-col items-center gap-6">
        {apps.map((app) => (
          <Link
            key={app.name}
            href={app.href}
            className={cn(
              "w-14 h-14 rounded-[1.2rem] flex items-center justify-center transition-all duration-500 relative group",
              app.color,
              pathname === app.href 
                ? "scale-110 shadow-[0_0_25px_rgba(255,255,255,0.2)] ring-2 ring-white/20" 
                : "opacity-40 grayscale hover:opacity-100 hover:grayscale-0"
            )}
          >
            <app.icon className="w-7 h-7 text-white" />
            {pathname === app.href && (
              <div className="absolute -left-6 w-1.5 h-6 bg-white rounded-full shadow-[0_0_10px_white]" />
            )}
          </Link>
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-4 bg-white/5 p-2 rounded-3xl border border-white/5 backdrop-blur-2xl">
          <Button
            onClick={handleVoiceSearch}
            className={cn(
              "w-12 h-12 rounded-full transition-all duration-500 flex items-center justify-center",
              isListening ? "bg-red-500 animate-pulse shadow-[0_0_20px_red]" : "bg-primary/20 text-primary border border-primary/20 hover:bg-primary/40"
            )}
          >
            {isListening ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : <Mic className="w-6 h-6" />}
          </Button>

          <div className="h-px w-8 bg-white/10" />

          <div className="flex flex-col gap-2">
            <Button size="icon" variant="ghost" onClick={() => updateMapSettings({ zoom: Math.min(21, mapSettings.zoom + 0.5) })} className="w-10 h-10 rounded-full bg-white/5 text-primary hover:bg-white/10">
              <ZoomIn className="w-5 h-5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => updateMapSettings({ zoom: Math.max(15, mapSettings.zoom - 0.5) })} className="w-10 h-10 rounded-full bg-white/5 text-primary hover:bg-white/10">
              <ZoomOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
