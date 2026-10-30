"use client";

/**
 * وضع الصلاة: two minutes before the azan a small countdown appears; at the azan whatever plays pauses by itself
 * (a card says which prayer and when the iqamah is); after the iqamah + 10 minutes it offers to continue.
 * «لا توقف» turns the pause off on this device (the countdown stays).
 */
import { useEffect, useState } from "react";
import { useMediaStore } from "@/lib/store";
import { prayerDayFor, localYmd } from "@/lib/prayer-day";
import { Play, X } from "lucide-react";

const tToM = (t?: string) => { if (!t) return -1; const [h, m] = String(t).split(":").map(Number); return h * 60 + m; };
const NAME: Record<string, string> = { fajr: "الفجر", dhuhr: "الظهر", asr: "العصر", maghrib: "المغرب", isha: "العشاء" };
const IQ: Record<string, number> = { fajr: 25, dhuhr: 20, asr: 20, maghrib: 10, isha: 20 };

function nextAzan(rows: any[], settings: any[]) {
  const out: { id: string; name: string; at: number; iq: number }[] = [];
  for (const off of [0, 1]) {
    const d = new Date(); d.setDate(d.getDate() + off); d.setHours(0, 0, 0, 0);
    const row: any = prayerDayFor(rows, localYmd(d)); if (!row) continue;
    for (const id of Object.keys(NAME)) {
      const s = (settings || []).find((x: any) => x.id === id) || {};
      const m = tToM(row[id]); if (m < 0) continue;
      out.push({ id, name: s.name || NAME[id], at: d.getTime() + (m + (s.offsetMinutes || 0)) * 60e3, iq: s.iqamahDuration ?? IQ[id] });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

export function PrayerGuard() {
  const prayerTimes = useMediaStore(s => s.prayerTimes);
  const prayerSettings = useMediaStore(s => s.prayerSettings);
  const [, tick] = useState(0);
  const [card, setCard] = useState<null | { kind: "soon" | "azan" | "back"; name: string; at: number; iq: number }>(null);
  const [handled, setHandled] = useState<Record<string, string>>({});
  const [noPause, setNoPause] = useState(false);

  useEffect(() => { try { setNoPause(localStorage.getItem("dc.prayerNoPause") === "1"); } catch {} const t = setInterval(() => tick(x => x + 1), 15000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const now = Date.now();
    for (const p of nextAzan(prayerTimes as any[], prayerSettings as any[])) {
      const key = p.id + "@" + p.at, done = handled[key] || "";
      const iqEnd = p.at + (p.iq + 10) * 60e3;
      if (now > iqEnd + 5 * 60e3) continue;
      if (now >= p.at - 2 * 60e3 && now < p.at && !done) { setCard({ kind: "soon", ...p }); setHandled(h => ({ ...h, [key]: "soon" })); return; }
      if (now >= p.at && now < p.at + 3 * 60e3 && done !== "azan" && done !== "back") {
        const s = useMediaStore.getState(), playing = s.isPlaying && !!(s.activeVideo || s.activeIptv);
        if (playing && !noPause) { s.setIsPlaying(false); (window as any).__dcPrayerPaused = true; }
        setCard({ kind: "azan", ...p }); setHandled(h => ({ ...h, [key]: "azan" }));
        try { const u = new SpeechSynthesisUtterance("حان الآن موعد أذان " + p.name); u.lang = "ar-SA"; speechSynthesis.speak(u); } catch {}
        return;
      }
      if (now >= iqEnd && now < iqEnd + 5 * 60e3 && done === "azan" && (window as any).__dcPrayerPaused) {
        setCard({ kind: "back", ...p }); setHandled(h => ({ ...h, [key]: "back" })); return;
      }
    }
  });
  useEffect(() => { if (!card) return; const t = setTimeout(() => setCard(null), card.kind === "soon" ? 125000 : card.kind === "azan" ? 10 * 60e3 : 5 * 60e3); return () => clearTimeout(t); }, [card]);
  if (!card) return null;

  const t = new Date(card.at).toLocaleTimeString("ar-OM", { hour: "numeric", minute: "2-digit" });
  const resume = () => { useMediaStore.getState().setIsPlaying(true); (window as any).__dcPrayerPaused = false; setCard(null); };
  return (
    <div dir="rtl" className="fixed inset-x-0 bottom-36 z-[100004] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-[1.6rem] bg-emerald-950/90 border border-emerald-400/30 px-5 py-3 text-white shadow-2xl backdrop-blur-xl">
        <span className="text-2xl">🕌</span>
        <div className="leading-tight">
          {card.kind === "soon" && <><div className="font-black">أذان {card.name} بعد دقيقتين</div><div className="text-xs text-white/60">{t}{noPause ? "" : " · سيتوقف التشغيل وحده"}</div></>}
          {card.kind === "azan" && <><div className="font-black">حان أذان {card.name}</div><div className="text-xs text-white/60">الإقامة بعد {card.iq} دقيقة{(window as any).__dcPrayerPaused ? " · أوقفنا التشغيل" : ""}</div></>}
          {card.kind === "back" && <><div className="font-black">تقبّل الله</div><div className="text-xs text-white/60">تابع ما كنت تشاهده؟</div></>}
        </div>
        {(card.kind === "back" || (card.kind === "azan" && (window as any).__dcPrayerPaused)) && <button onClick={resume} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-black flex items-center gap-1 focusable"><Play className="w-4 h-4" /> تابع</button>}
        {card.kind === "soon" && <button onClick={() => { const v = !noPause; setNoPause(v); try { localStorage.setItem("dc.prayerNoPause", v ? "1" : "0"); } catch {} }} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold focusable">{noPause ? "أوقف عند الأذان" : "لا توقف"}</button>}
        <button onClick={() => setCard(null)} className="p-1.5 rounded-full hover:bg-white/10"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
