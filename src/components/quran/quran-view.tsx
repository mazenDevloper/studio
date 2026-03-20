"use client";

import { useState, useEffect } from "react";
import { Search, Book, Play, Loader2, Music, List, Radio } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function QuranView() {
  const { setActiveQuranUrl } = useMediaStore();
  const [surahs, setSurahs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const surahsRes = await fetch("https://api.quran.com/api/v4/chapters?language=ar");
      const surahsData = await surahsRes.json();
      setSurahs(surahsData.chapters || []);
    } catch (e) {
      console.error("Failed to fetch Quran data", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSurah = (surahId: number) => {
    const url = `https://quran.com/ar/${surahId}`;
    setActiveQuranUrl(url);
    setIsOpen(false);
  };

  const handleBackToRadio = () => {
    setActiveQuranUrl("https://quran.com/ar/radio");
    setIsOpen(false);
  };

  const filteredSurahs = surahs.filter(s => 
    s.name_arabic.includes(search) || s.name_simple.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-black">
      {/* Background visual state */}
      <div className="flex-1 w-full relative flex items-center justify-center">
        <div className="text-center space-y-4 opacity-40">
          <Book className="w-24 h-24 text-blue-600 mx-auto animate-pulse" />
          <p className="text-white font-black text-xl">جاري عرض المصحف الشريف...</p>
        </div>
      </div>

      {/* Floating Action Center */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 pointer-events-none">
        
        {/* Selector Trigger */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button
              data-nav-id="quran-selector-trigger"
              className="pointer-events-auto flex items-center gap-3 bg-blue-900/60 backdrop-blur-3xl border border-white/10 px-6 py-2.5 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] hover:scale-105 transition-all focusable group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                <Book className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col text-right">
                <span className="text-white font-black text-base uppercase tracking-widest">المصحف الشريف</span>
              </div>
              <List className="w-5 h-5 text-white/40 mr-2" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-[95%] md:max-w-4xl bg-zinc-950 border-white/10 rounded-[3rem] p-0 overflow-hidden shadow-2xl dir-rtl">
            <div className="p-8 space-y-6">
              <DialogHeader className="flex flex-col gap-6 pb-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-3xl font-black text-white flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center">
                      <Music className="w-7 h-7 text-white" />
                    </div>
                    اختيار سورة
                  </DialogTitle>
                </div>

                <div className="relative w-full">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-white/20" />
                  <Input 
                    placeholder="ابحث عن سورة..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-14 bg-white/5 border-white/10 rounded-2xl pr-14 text-xl focusable text-right"
                  />
                </div>
              </DialogHeader>

              <ScrollArea className="h-[55vh] pr-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-10">
                  {loading ? (
                    <div className="col-span-full py-20 flex flex-col items-center gap-4">
                      <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                      <span className="text-white/40 font-bold">جاري تحميل السور...</span>
                    </div>
                  ) : filteredSurahs.length === 0 ? (
                    <div className="col-span-full py-20 text-center opacity-20">
                      <Search className="w-12 h-12 mx-auto mb-4" />
                      <p className="text-xl font-bold">لا توجد نتائج للبحث</p>
                    </div>
                  ) : filteredSurahs.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSurah(s.id)}
                      className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500 hover:bg-blue-500/10 transition-all flex flex-col items-center gap-2 focusable group"
                    >
                      <span className="text-[10px] text-white/20 font-black group-hover:text-blue-400">{s.id}</span>
                      <span className="text-xl font-black text-white">{s.name_arabic}</span>
                      <span className="text-[9px] text-white/40 uppercase tracking-widest">{s.name_simple}</span>
                      <Play className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>

        {/* Fixed Return to Radio Button */}
        <button 
          onClick={handleBackToRadio}
          className="pointer-events-auto flex items-center gap-3 bg-blue-600/80 backdrop-blur-3xl border border-white/20 px-6 py-3 rounded-[2.5rem] shadow-2xl hover:bg-blue-600 transition-all focusable group"
        >
          <Radio className="w-6 h-6 text-white animate-pulse" />
          <span className="text-white font-black text-sm uppercase tracking-widest">العودة لإذاعة القرآن</span>
        </button>

      </div>
    </div>
  );
}
