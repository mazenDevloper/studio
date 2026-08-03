
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Moon, RotateCcw, Sun, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AZKAR_DATA = [
  // أذكار الصباح
  { id: 'm1', label: 'آية الكرسي', count: 1, category: 'morning', text: 'اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ...' },
  { id: 'm2', label: 'اللهم أعني على ذكرك وشكرك وحسن عبادتك', count: 1, category: 'morning', text: '' },
  { id: 'm3', label: 'سورة الإخلاص، سورة الفلق، سورة الناس', count: 3, category: 'morning', text: '' },
  { id: 'm4', label: 'اللهم بك أصبحنا، وبك أمسينا، وبك نحيا، وبك نموت، وإليك النشور', count: 1, category: 'morning', text: '' },
  { id: 'm5', label: 'حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم', count: 7, category: 'morning', text: '' },
  { id: 'm6', label: 'بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم', count: 3, category: 'morning', text: '' },
  { id: 'm7', label: 'يا حي يا قيوم برحمتك أستغيث، أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين', count: 1, category: 'morning', text: '' },
  { id: 'm8', label: 'اللهم عالم الغيب والشهادة فاطر السماوات الأرض، رب كل شيء ومليكه...', count: 1, category: 'morning', text: '' },
  { id: 'm9', label: 'سيد الاستغفار: اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك...', count: 1, category: 'morning', text: '' },
  { id: 'm10', label: 'اللهم إني أسألك العفو والعافية في الدنيا والآخرة...', count: 1, category: 'morning', text: '' },
  { id: 'm11', label: 'أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له...', count: 1, category: 'morning', text: '' },
  
  // أذكار المساء
  { id: 'e1', label: 'آية الكرسي', count: 1, category: 'evening', text: '' },
  { id: 'e2', label: 'اللهم أعني على ذكرك وشكرك وحسن عبادتك', count: 1, category: 'evening', text: '' },
  { id: 'e3', label: 'سورة الإخلاص، سورة الفلق، سورة الناس', count: 3, category: 'evening', text: '' },
  { id: 'e4', label: 'أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له', count: 1, category: 'evening', text: '' },
  { id: 'e5', label: 'أعوذ بكلمات الله التامات من شر ما خلق', count: 3, category: 'evening', text: '' },
  { id: 'e6', label: 'بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم', count: 3, category: 'evening', text: '' },
  { id: 'e7', label: 'يا حي يا قيوم برحمتك أستغيث، أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين', count: 1, category: 'evening', text: '' },
  { id: 'e8', label: 'سيد الاستغفار: اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك...', count: 1, category: 'evening', text: '' },
  { id: 'e9', label: 'سبحان الله وبحمده', count: 100, category: 'evening', text: '' },
  
  // الأذكار اليومية
  { id: 'd1', label: 'أستغفر الله وأتوب إليه', count: 100, category: 'daily', text: '' },
  { id: 'd2', label: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير', count: 10, category: 'daily', text: '' },
  { id: 'd3', label: 'اللهم صل وسلم على نبينا محمد', count: 10, category: 'daily', text: '' },
];

export function AzkarView() {
  const [counts, setCounters] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState("morning");

  const handleIncrement = (id: string, max: number) => {
    setCounters(prev => {
      const current = prev[id] || 0;
      if (current >= max) return prev;
      return { ...prev, [id]: current + 1 };
    });
  };

  const resetAll = () => setCounters({});

  const filteredAzkar = useMemo(() => {
    return AZKAR_DATA.filter(item => item.category === activeTab);
  }, [activeTab]);

  return (
    <div data-nav-zone="content" className="p-10 space-y-10 pb-40 text-right dir-rtl relative min-h-screen">
      <header className="flex items-center justify-between relative z-50">
        <div className="flex items-center gap-6">
           <div className="flex flex-col gap-1">
              <h1 className="text-5xl font-black text-white tracking-tighter flex items-center gap-4">
                {activeTab === 'evening' ? 'أذكار المساء' : activeTab === 'morning' ? 'أذكار الصباح' : 'الأذكار اليومية'} 
                {activeTab === 'evening' ? <Moon className="w-10 h-10 text-blue-400" /> : activeTab === 'morning' ? <Sun className="w-10 h-10 text-yellow-500" /> : <Sparkles className="w-10 h-10 text-emerald-400" />}
              </h1>
              <p className="text-white/20 font-bold uppercase tracking-[0.6em] text-[10px]">Sovereign Remembrance Hub</p>
           </div>
        </div>

        <div className="flex items-center gap-4">
           <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white/5 p-1 rounded-full border border-white/10">
              <TabsList className="bg-transparent border-none h-12">
                 <TabsTrigger value="morning" className="rounded-full px-8 font-black text-xs h-full focusable">الصباح</TabsTrigger>
                 <TabsTrigger value="evening" className="rounded-full px-8 font-black text-xs h-full focusable">المساء</TabsTrigger>
                 <TabsTrigger value="daily" className="rounded-full px-8 font-black text-xs h-full focusable">اليومي</TabsTrigger>
              </TabsList>
           </Tabs>
           
           <div className="bg-red-600/20 text-red-500 px-6 py-3 rounded-full border border-red-500/30 cursor-pointer focusable flex items-center gap-2" onClick={resetAll} tabIndex={0}>
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm font-black">تصفير العدادات</span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-40">
        {filteredAzkar.map((rem, idx) => {
          const currentCount = counts[rem.id] || 0;
          const remaining = rem.count - currentCount;
          const isCompleted = remaining === 0;
          
          return (
            <Card 
              key={rem.id}
              onClick={() => handleIncrement(rem.id, rem.count)}
              className={cn(
                "bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 focusable cursor-pointer group shadow-2xl min-h-[220px] flex flex-col justify-between transition-all active:scale-95",
                isCompleted && "border-emerald-500/40 bg-emerald-500/5"
              )}
              tabIndex={0}
              data-nav-id={`zikr-item-${idx}`}
            >
              <CardContent className="p-0 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-2xl font-black text-white leading-[1.6] text-right">{rem.label}</h3>
                  {rem.text && <p className="text-xs text-white/40 font-bold leading-relaxed">{rem.text}</p>}
                </div>
                
                <div className="flex items-center justify-between">
                   <div className="flex flex-col gap-2 flex-1">
                      <div className="flex items-center gap-3 text-[12px] font-black text-white/20">
                         <span>{currentCount} / {rem.count}</span>
                      </div>
                      <div className="h-1 w-24 bg-white/5 rounded-full overflow-hidden">
                         <div className={cn("h-full transition-all duration-300", isCompleted ? "bg-emerald-500" : "bg-primary")} style={{ width: `${(currentCount / rem.count) * 100}%` }} />
                      </div>
                   </div>
                   
                   <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">المتبقي</span>
                      <div className={cn("w-16 h-16 rounded-[1.2rem] bg-primary flex items-center justify-center shadow-glow transition-all", isCompleted && "bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]")}>
                         <span className="text-3xl font-black text-white">{remaining}</span>
                      </div>
                   </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
