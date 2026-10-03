"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { BookOpen, Radio } from "lucide-react";
import { QuranReader } from "@/components/quran/quran-reader";
import { cn } from "@/lib/utils";

const TAB_KEY = "quran-tab-v1";

/** The Quran screen's tab, shared with the background radio player (it covers the screen on the radio tab only). */
export const useQuranTab = create<{ tab: "mushaf" | "radio"; setTab: (t: "mushaf" | "radio") => void }>(set => ({
  tab: "radio",
  setTab: (tab) => set({ tab }),
}));

/**
 * The Quran screen: the Mushaf (quran.com API: surahs, Uthmani text, reciters, tafsir) and the quran.com radio.
 * The last tab is remembered.
 */
export function QuranView() {
  const { tab, setTab } = useQuranTab();
  useEffect(() => { try { if (localStorage.getItem(TAB_KEY) === "mushaf") setTab("mushaf"); } catch {} }, []);
  const pick = (t: "mushaf" | "radio") => { setTab(t); try { localStorage.setItem(TAB_KEY, t); } catch {} };
  const btn = (on: boolean) => cn("focusable no-focus-scale h-10 px-5 rounded-full text-sm font-black flex items-center gap-2",
    on ? "bg-emerald-500 text-black" : "text-white/60 hover:bg-white/10");

  return (
    <div className="w-full h-full bg-black relative flex flex-col">
      <div className="relative z-10 flex justify-center p-3">
        <div className="inline-flex rounded-full bg-white/5 border border-white/10 p-1 gap-1" role="tablist" dir="rtl">
          <button role="tab" aria-selected={tab === "mushaf"} onClick={() => pick("mushaf")} className={btn(tab === "mushaf")} data-nav-id="quran-tab-mushaf"><BookOpen className="w-4 h-4" /> المصحف</button>
          <button role="tab" aria-selected={tab === "radio"} onClick={() => pick("radio")} className={btn(tab === "radio")} data-nav-id="quran-tab-radio"><Radio className="w-4 h-4" /> الإذاعة</button>
        </div>
      </div>
      {/* the radio itself is the background player (GlobalQuranPlayer): it fills this space on the radio tab */}
      {tab === "mushaf" && <div className="relative z-10 flex-1 min-h-0 bg-black"><QuranReader /></div>}
    </div>
  );
}
