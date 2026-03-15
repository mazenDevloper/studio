
"use client";

import { useMediaStore, Manuscript } from "@/lib/store";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Sun, Moon, Stars, BookOpen, Sparkles } from "lucide-react";

export function ActiveAzkarWidget() {
  const [now, setNow] = useState(new Date());
  const prayerTimes = useMediaStore(state => state.prayerTimes);
  const customManuscripts = useMediaStore(state => state.customManuscripts);
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    const phraseTimer = setInterval(() => {
      if (customManuscripts.length > 0) {
        setPhraseIndex(p => (p + 1) % customManuscripts.length);
      }
    }, 10000);
    return () => { clearInterval(timer); clearInterval(phraseTimer); };
  }, [customManuscripts.length]);

  const activeAzkar = useMemo(() => {
    if (!prayerTimes || prayerTimes.length === 0) return [];
    
    const day = now.getDate().toString().padStart(2, '0');
    const p = prayerTimes.find(pt => pt.date.endsWith(`-${day}`)) || prayerTimes[0];
    
    const tToM = (t: string) => {
      if (!t) return 0;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const currentMins = now.getHours() * 60 + now.getMinutes();
    const fajr = tToM(p.fajr);
    const dhuhr = tToM(p.dhuhr);
    const asr = tToM(p.asr);
    const maghrib = tToM(p.maghrib);
    const isha = tToM(p.isha);

    const list = [];

    // Morning Azkar: Fajr -> Dhuhr - 10
    if (currentMins >= fajr && currentMins < (dhuhr - 10)) {
      list.push({ id: 'morning', name: 'أذكار الصباح', icon: Sun, color: 'text-orange-400' });
    }

    // Evening Azkar: Asr -> Maghrib
    if (currentMins >= asr && currentMins < maghrib) {
      list.push({ id: 'evening', name: 'أذكار المساء', icon: Moon, color: 'text-blue-400' });
    }

    // Qiyam: Isha -> Fajr (Handle overnight)
    const isQiyam = currentMins >= isha || currentMins < fajr;
    if (isQiyam) {
      list.push({ id: 'qiyam', name: 'قيام الليل', icon: Stars, color: 'text-purple-400' });
    }

    // Wird: Always
    list.push({ id: 'wird', name: 'الورد اليومي', icon: BookOpen, color: 'text-emerald-400' });

    return list;
  }, [now, prayerTimes]);

  const currentManuscript = customManuscripts[phraseIndex];

  return (
    <div className="h-full w-full bg-zinc-950/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-8 flex flex-col justify-between relative overflow-hidden group">
      {/* Background decoration */}
      <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
      
      {/* الجزء السفلي (الآن العلوي): المخطوطات والذكر الحر */}
      <div className="relative z-10 pt-4 flex-1 flex flex-col items-center justify-center">
        <div className="text-center space-y-6 w-full">
          <div className="h-32 flex items-center justify-center">
            {currentManuscript ? (
              <div className="animate-in fade-in zoom-in-95 duration-1000">
                {currentManuscript.type === 'text' ? (
                  <p className="text-4xl md:text-5xl font-calligraphy text-white/90 leading-loose drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                    {currentManuscript.content}
                  </p>
                ) : (
                  <img 
                    src={currentManuscript.content} 
                    alt="Manuscript"
                    className="h-28 w-auto object-contain brightness-0 invert drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                  />
                )}
              </div>
            ) : (
              <p className="text-white/20 font-black uppercase tracking-widest text-xs">أضف مخطوطات من الإعدادات</p>
            )}
          </div>
          <div className="flex justify-center gap-2">
            {customManuscripts.map((_, i) => (
              <div key={i} className={cn("h-1 rounded-full transition-all duration-500", i === phraseIndex ? "bg-primary w-8 shadow-glow" : "bg-white/10 w-1.5")} />
            ))}
          </div>
        </div>
      </div>

      {/* الجزء العلوي (الآن السفلي): قائمة الأذكار والورد النشط */}
      <div className="mt-auto relative z-10 space-y-6 border-t border-white/5 pt-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-white/80 uppercase tracking-widest">الأذكار والورد</h2>
            <span className="text-[10px] text-primary font-bold uppercase tracking-[0.3em]">Active Spiritual Flow</span>
          </div>
          <Sparkles className="w-6 h-6 text-primary animate-pulse" />
        </div>

        <div className="flex flex-col gap-4">
          {activeAzkar.length > 0 ? (
            activeAzkar.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-white/5 border border-white/5 p-4 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 shadow-lg", item.color)}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className="text-lg font-black text-white/90">{item.name}</span>
                </div>
                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", item.color.replace('text', 'bg'))} />
              </div>
            ))
          ) : (
            <div className="py-8 text-center opacity-20">
              <p className="text-sm font-black uppercase tracking-widest">بانتظار الموعد التالي...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
