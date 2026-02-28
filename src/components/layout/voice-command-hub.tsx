
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Volume2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function VoiceCommandHub() {
  const router = useRouter();
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");

  const processCommand = useCallback((transcript: string) => {
    const t = transcript.toLowerCase();
    
    if (t.includes("كره") || t.includes("رياضه") || t.includes("football")) {
      router.push("/football");
      toast({ title: "جاري الانتقال", description: "فتح مركز كووورة الرياضي" });
    } else if (t.includes("ميديا") || t.includes("يوتيوب") || t.includes("media")) {
      router.push("/media");
      toast({ title: "جاري الانتقال", description: "فتح مكتبة الوسائط" });
    } else if (t.includes("رئيسيه") || t.includes("داشبورد") || t.includes("home")) {
      router.push("/");
      toast({ title: "جاري الانتقال", description: "العودة للوحة التحكم" });
    } else if (t.includes("اعدادات") || t.includes("settings")) {
      router.push("/settings");
      toast({ title: "جاري الانتقال", description: "فتح الإعدادات" });
    } else if (t.includes("بحث عن") || t.includes("search for")) {
      const query = t.split("عن")[1]?.trim() || t.split("for")[1]?.trim();
      if (query) {
        router.push(`/media?q=${encodeURIComponent(query)}`);
        toast({ title: "جاري البحث", description: `البحث عن: ${query}` });
      }
    }
  }, [router, toast]);

  const toggleListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ variant: "destructive", title: "خطأ", description: "متصفحك لا يدعم الأوامر الصوتية" });
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      toast({ title: "أنا أسمعك...", description: "تحدث بأوامرك الصوتية الآن" });
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setLastTranscript(transcript);
      processCommand(transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  }, [isListening, processCommand, toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "0") { // '0' key for global voice activation
        e.preventDefault();
        toggleListening();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleListening]);

  return (
    <div className={cn(
      "fixed top-8 right-8 z-[10002] flex items-center gap-4 transition-all duration-500",
      isListening ? "scale-110" : "scale-100 opacity-40 hover:opacity-100"
    )}>
      {isListening && (
        <div className="bg-black/60 backdrop-blur-3xl px-6 py-3 rounded-full border border-primary/40 animate-in slide-in-from-right-10 flex items-center gap-3">
          <div className="flex gap-1">
            <div className="w-1 h-4 bg-primary animate-pulse" />
            <div className="w-1 h-6 bg-primary animate-pulse delay-75" />
            <div className="w-1 h-3 bg-primary animate-pulse delay-150" />
          </div>
          <span className="text-[10px] font-black text-white uppercase tracking-widest">{lastTranscript || "تحدث الآن..."}</span>
        </div>
      )}
      <button 
        onClick={toggleListening}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all shadow-2xl focusable",
          isListening ? "bg-red-600 border-white animate-pulse" : "bg-primary border-primary/20"
        )}
      >
        {isListening ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
      </button>
    </div>
  );
}
