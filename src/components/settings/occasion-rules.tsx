"use client";

import { useMediaStore, type OccasionRule } from "@/lib/store";
import { hubSet } from "@/lib/native-app";
import { cn } from "@/lib/utils";

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/** Your repeating occasions: weekly (on chosen days) or monthly (a day of the month); shown as islands that day. */
export function OccasionRulesSettings() {
  const rules = useMediaStore(s => s.occasionRules) || [];
  const setRules = useMediaStore(s => s.setOccasionRules);
  const save = (r: OccasionRule[]) => { setRules(r); hubSet("occasionRules", r); };
  const up = (id: string, u: Partial<OccasionRule>) => save(rules.map(r => (r.id === id ? { ...r, ...u } : r)));
  return (
    <section className="rounded-[2.5rem] bg-white/5 border border-white/10 p-6 md:p-8 space-y-4" dir="rtl">
      <p className="text-xl font-black text-white">📅 مناسباتي الأسبوعية والشهرية</p>
      <p className="text-[11px] text-white/45 font-bold">تظهر كجزيرة في يومها (في الموقع وعلى الهاتف)، مع المناسبات الهجرية والميلادية.</p>
      {rules.map(r => (
        <div key={r.id} className={cn("rounded-2xl border p-3 space-y-2", r.off ? "border-white/5 opacity-60" : "border-white/10 bg-white/5")}>
          <div className="flex flex-wrap items-center gap-2">
            <input value={r.title} onChange={e => up(r.id, { title: e.target.value })} placeholder="اسم المناسبة"
              className="flex-1 min-w-[10rem] h-10 px-4 rounded-full bg-black/40 border border-white/10 text-white text-sm font-black" />
            <select value={r.monthDay ? "month" : "week"} onChange={e => up(r.id, e.target.value === "month" ? { monthDay: 1, days: undefined } : { days: [5], monthDay: undefined })}
              className="h-10 px-3 rounded-full bg-black/40 border border-white/10 text-white text-sm font-bold">
              <option value="week">أسبوعية</option><option value="month">شهرية</option>
            </select>
            <button onClick={() => up(r.id, { off: !r.off })} className="h-10 px-3 rounded-full bg-white/10 text-xs font-black text-white">{r.off ? "تفعيل" : "إيقاف"}</button>
            <button onClick={() => save(rules.filter(x => x.id !== r.id))} className="h-10 px-3 rounded-full bg-red-600/40 text-xs font-black text-white">حذف</button>
          </div>
          {r.monthDay ? (
            <div className="flex items-center gap-2 text-sm font-bold text-white/70">يوم
              <input type="number" min={1} max={31} value={r.monthDay} onChange={e => up(r.id, { monthDay: Math.max(1, Math.min(31, Number(e.target.value) || 1)) })}
                className="w-20 h-9 px-3 rounded-full bg-black/40 border border-white/10 text-white text-sm font-black text-center" /> من كل شهر</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => {
                const on = (r.days || []).includes(i);
                return <button key={i} onClick={() => up(r.id, { days: on ? (r.days || []).filter(x => x !== i) : [...(r.days || []), i] })}
                  className={cn("h-8 px-3 rounded-full text-xs font-black", on ? "bg-emerald-500 text-black" : "bg-white/5 text-white/50")}>{d}</button>;
              })}
            </div>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => save([...rules, { id: String(Date.now()), title: "", days: [5] }])}
          className="h-10 px-4 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-sm font-black">+ مناسبة أسبوعية</button>
        <button onClick={() => save([...rules, { id: String(Date.now()), title: "", monthDay: 1 }])}
          className="h-10 px-4 rounded-full bg-white/10 border border-white/10 text-white text-sm font-black">+ مناسبة شهرية</button>
      </div>
    </section>
  );
}
