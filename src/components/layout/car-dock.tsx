
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
    { name: "Settings", href: "/settings", icon: Settings, color: "bg-gray-600" },
  ];

  const handleVoiceSearch = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        variant: "destructive",
        title: "خطأ في النظام",
        description: "متصفحك لا يدعم خاصية البحث الصوتي.",
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
              pathname === app.href ? "scale-110 active-glow ring-2 ring-white/50" : "opacity-60 grayscale-[0.3] hover:opacity-100"
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
          onClick={handleVoiceSearch}
          className={cn(
            "w-16 h-16 rounded-full transition-all border-2 flex items-center justify-center shadow-2xl",
            isListening ? "bg-red-500 border-white animate-pulse" : "bg-primary border-white/10"
          )}
        >
          {isListening ? <Loader2 className="w-8 h-8 animate-spin" /> : <Mic className="w-8 h-8" />}
        </Button>

        <div className="flex flex-col gap-2">
          <Button size="icon" variant="ghost" onClick={() => updateMapSettings({ zoom: Math.min(21, mapSettings.zoom + 0.5) })} className="w-14 h-14 rounded-full bg-white/5 border border-white/10 text-primary">
            <ZoomIn className="w-7 h-7" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => updateMapSettings({ zoom: Math.max(15, mapSettings.zoom - 0.5) })} className="w-14 h-14 rounded-full bg-white/5 border border-white/10 text-primary">
            <ZoomOut className="w-7 h-7" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="w-16 h-16 rounded-full bg-white/10 border border-white/15 text-white shadow-2xl"
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
