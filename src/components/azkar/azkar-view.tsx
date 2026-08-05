
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Moon, RotateCcw, Sun, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AZKAR_DATA = [
  // أذكار الصباح
  { id: 'ts-1', label: 'آية الكرسي', count: 1, category: 'morning', text: 'اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ.' },
  { id: 'ts-2', label: 'الاستعانة', count: 1, category: 'morning', text: 'اللهم أعني على ذكرك وشكرك وحسن عبادتك.' },
  { id: 'ts-3', label: 'المعوذات', count: 3, category: 'morning', text: 'سورة الإخلاص، سورة الفلق، سورة الناس.' },
  { id: 'ts-4', label: 'دعاء الصباح', count: 1, category: 'morning', text: 'اللهم بك أصبحنا، وبك أمسينا، وبك نحيا، وبك نموت، وإليك النشور.' },
  { id: 'tm-3', label: 'التوكل', count: 7, category: 'morning', text: 'حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.' },
  { id: 'tm-1', label: 'الحفظ من الضرر', count: 3, category: 'morning', text: 'بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم.' },
  { id: 'tm-2', label: 'الاستغاثة', count: 1, category: 'morning', text: 'يا حي يا قيوم برحمتك أستغيث، أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين.' },
  { id: 'tl-1', label: 'عالم الغيب', count: 1, category: 'morning', text: 'اللهم عالم الغيب والشهادة فاطر السماوات والأرض، رب كل شيء ومليكه، أشهد أن لا إله إلا أنت، أعوذ بك من شر نفسي، ومن شر الشيطان وشركه، وأن أقترف على نفسي سوءاً أو أجره إلى مسلم.' },
  { id: 'tl-2', label: 'سيد الاستغفار', count: 1, category: 'morning', text: 'اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت، أعوذ بك من شر ما صنعت، أبوء لك بنعمتك علي، وأبوء بذنبي فاغفر لي، فإنه لا يغفر الذنوب إلا أنت.' },
  { id: 'tsl-1', label: 'العافية', count: 1, category: 'morning', text: 'اللهم إني أسألك العفو والعافية في الدنيا والآخرة، اللهم إني أسألك العفو والعافية في ديني ودنياي وأهلي ومالي، اللهم استر عوراتي وآمن روعاتي، اللهم احفظني من بين يدي ومن خلفي وعن يميني وعن شمالي ومن فوقي، وأعوذ بعظمتك أن أقتال من تحتي.' },
  { id: 'tsl-2', label: 'الملك لله', count: 1, category: 'morning', text: 'أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير. رب أسألك خير ما في هذا اليوم وخير ما بعده، وأعوذ بك من شر ما في هذا اليوم وشر ما بعده، رب أعوذ بك من الكسل وسوء الكبر، رب أعوذ بك من عذاب في النار وعذاب في القبر.' },
  
  // أذكار المساء
  { id: 'ets-1', label: 'آية الكرسي', count: 1, category: 'evening', text: 'اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ.' },
  { id: 'ets-2', label: 'الاستعانة', count: 1, category: 'evening', text: 'اللهم أعني على ذكرك وشكرك وحسن عبادتك.' },
  { id: 'ets-3', label: 'المعوذات', count: 3, category: 'evening', text: 'سورة الإخلاص، سورة الفلق، سورة الناس.' },
  { id: 'etm-3', label: 'التوكل', count: 7, category: 'evening', text: 'حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.' },
  { id: 'etm-1', label: 'دعاء المساء', count: 1, category: 'evening', text: 'اللهم بك أمسينا، وبك أصبحنا، وبك نحيا، وبك نموت، وإليك المصير.' },
  { id: 'etm-2', label: 'الحفظ من الضرر', count: 3, category: 'evening', text: 'بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم.' },
  { id: 'etm-4', label: 'الاستغاثة', count: 1, category: 'evening', text: 'يا حي يا قيوم برحمتك أستغيث، أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين.' },
  { id: 'etl-1', label: 'النعمة', count: 1, category: 'evening', text: 'اللهم ما أمسى بي من نعمة أو بأحد من خلقك فمنك وحدك لا شريك لك، فلك الحمد ولك الشكر.' },
  { id: 'etl-2', label: 'سيد الاستغفار', count: 1, category: 'evening', text: 'اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت، أعوذ بك من شر ما صنعت، أبوء لك بنعمتك علي، وأبوء بذنبي فاغفر لي، فإنه لا يغفر الذنوب إلا أنت.' },
  { id: 'etsl-1', label: 'العافية', count: 1, category: 'evening', text: 'اللهم إني أسألك العفو والعافية في الدنيا والآخرة، اللهم إني أسألك العفو والعافية في ديني ودنياي وأهلي ومالي، اللهم استر عوراتي وآمن روعاتي، اللهم احفظني من بين يدي ومن خلفي وعن يميني وعن شمالي ومن فوقي، وأعوذ بعظمتك أن أقتال من تحتي.' },
  { id: 'etsl-2', label: 'أمسينا وأمسى الملك لله', count: 1, category: 'evening', text: 'أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير. رب أسألك خير ما في هذه الليلة وخير ما بعدها، وأعوذ بك من شر ما في هذه الليلة وشر ما بعدها، رب أعوذ بك من الكسل وسوء الكبر، رب أعوذ بك من عذاب في النار وعذاب في القبر.' },
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
    <div data-nav-zone="content" className="p-10 space-y-10 pb-40 text-right dir-rtl relative min-h-screen transition-none">
      <header className="flex items-center justify-between relative z-50">
        <div className="flex flex-col gap-1">
          <h1 className="text-5xl font-black text-white tracking-tighter flex items-center gap-4">
            {activeTab === 'evening' ? 'أذكار المساء' : 'أذكار الصباح'} 
            {activeTab === 'evening' ? <Moon className="w-10 h-10 text-blue-400" /> : <Sun className="w-10 h-10 text-yellow-500" />}
          </h1>
          <p className="text-white/20 font-bold uppercase tracking-[0.6em] text-[10px]">Sovereign Remembrance Hub</p>
        </div>

        <div className="flex items-center gap-4">
           <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white/5 p-1 rounded-full border border-white/10">
              <TabsList className="bg-transparent border-none h-14">
                 <TabsTrigger value="morning" className="rounded-full px-10 font-black text-sm h-full focusable">الصباح</TabsTrigger>
                 <TabsTrigger value="evening" className="rounded-full px-10 font-black text-sm h-full focusable">المساء</TabsTrigger>
              </TabsList>
           </Tabs>
           
           <div className="bg-red-600/20 text-red-500 px-6 py-3 rounded-full border border-red-500/30 cursor-pointer focusable flex items-center gap-2" onClick={resetAll} tabIndex={0}>
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm font-black">تصفير العدادات</span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-40" data-row-id="azkar-grid">
        {filteredAzkar.map((rem, idx) => {
          const currentCount = counts[rem.id] || 0;
          const remaining = rem.count - currentCount;
          const isCompleted = remaining === 0;
          
          return (
            <Card 
              key={rem.id}
              onClick={() => handleIncrement(rem.id, rem.count)}
              className={cn(
                "bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-10 focusable cursor-pointer group shadow-2xl min-h-[220px] flex flex-col justify-between transition-all active:scale-95 outline-none",
                isCompleted && "border-emerald-500/40 bg-emerald-500/5",
                (rem.id.startsWith('tl') || rem.id.startsWith('tsl') || rem.text.length > 200) && "lg:col-span-2"
              )}
              tabIndex={0}
              data-nav-id={`zikr-item-${idx}`}
            >
              <CardContent className="p-0 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-black text-white leading-none">{rem.label}</h3>
                    {isCompleted && <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-in zoom-in" />}
                  </div>
                  {rem.text && <p className="text-2xl text-white/90 font-bold leading-[1.8] text-right">{rem.text}</p>}
                </div>
                
                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                   <div className="flex flex-col gap-3 flex-1">
                      <div className="flex items-center gap-3 text-[12px] font-black text-white/20 uppercase tracking-widest">
                         <span>المحرز: {currentCount} / {rem.count}</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                         <div className={cn("h-full transition-all duration-500", isCompleted ? "bg-emerald-500" : "bg-primary")} style={{ width: `${(currentCount / rem.count) * 100}%` }} />
                      </div>
                   </div>
                   
                   <div className="mr-10 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">المتبقي</span>
                      <div className={cn("w-16 h-16 rounded-[1.5rem] bg-white/5 flex items-center justify-center border border-white/10 shadow-glow transition-all", isCompleted && "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)]")}>
                         <span className="text-3xl font-black">{remaining}</span>
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
