"use client";

import { LayoutDashboard, Radio, Settings, GripVertical, ArrowLeft, Trophy, ZoomIn, ZoomOut, Mic, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMediaStore } from "@/lib/store";
import { useState, useCallback, useEffect } from "react";
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

  // Smart Initial Focus: Target the Media icon on startup
  useEffect(() => {
    const timer = setTimeout(() => {
      const mediaIcon = document.querySelector('[data-nav-id="dock-Media"]') as HTMLElement;
      if (mediaIcon) mediaIcon.focus();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleVoiceSearch = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      router.push(`/media?q=${encodeURIComponent(transcript)}`);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }, [router]);

  return (
    <div className={cn(
      "fixed z-[100] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
      "bottom-0 left-0 right-0 h-20 bg-black/80 backdrop-blur-3xl border-t border-white/5 flex flex-row items-center justify-around px-4 md:fixed md:top-0 md:left-0 md:h-screen md:w-24 md:flex-col md:border-r md:py-8 md:gap-8 md:shadow-[20px_0_50px_rgba(0,0,0,0.8)]"
    )}>
      <div className="hidden md:block mb-2">
        <GripVertical className="text-white/10 w-6 h-6" />
      </div>

      <div className="flex flex-row md:flex-col items-center gap-4 md:gap-6 flex-1 justify-around md:justify-start">
        {apps.map((app) => (
          <Link
            key={app.name}
            href={app.href}
            data-nav-id={`dock-${app.name}`}
            className={cn(
              "w-12 h-12 md:w-14 md:h-14 rounded-[1.2rem] flex items-center justify-center transition-all duration-500 relative group focusable outline-none",
              app.color,
              pathname === app.href 
                ? "scale-110 shadow-[0_0_25px_rgba(255,255,255,0.2)] ring-2 ring-white/20" 
                : "opacity-40 grayscale hover:opacity-100 focus:opacity-100"
            )}
          >
            <app.icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
            {pathname === app.href && (
              <div className="absolute -bottom-2 md:-left-6 md:bottom-auto w-6 h-1 md:w-1.5 md:h-6 bg-white rounded-full shadow-[0_0_10px_white]" />
            )}
          </Link>
        ))}
      </div>

      <div className="hidden md:flex mt-auto flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-4 bg-white/5 p-2 rounded-3xl border border-white/5 backdrop-blur-2xl">
          <button
            onClick={handleVoiceSearch}
            className={cn(
              "w-12 h-12 rounded-full transition-all flex items-center justify-center focusable",
              isListening ? "bg-red-500 animate-pulse shadow-[0_0_20px_red]" : "bg-primary/20 text-primary"
            )}
          >
            {isListening ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : <Mic className="w-6 h-6" />}
          </button>

          <div className="h-px w-8 bg-white/10" />

          <div className="flex flex-col gap-2">
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => updateMapSettings({ zoom: Math.min(21, mapSettings.zoom + 0.5) })} 
              className="w-10 h-10 rounded-full bg-white/5 text-primary focusable"
            >
              <ZoomIn className="w-5 h-5" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => updateMapSettings({ zoom: Math.max(15, mapSettings.zoom - 0.5) })} 
              className="w-10 h-10 rounded-full bg-white/5 text-primary focusable"
            >
              <ZoomOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white/40 focusable"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
