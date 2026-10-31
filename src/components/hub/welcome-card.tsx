"use client";

/**
 * «مرحباً» - the first thing on entering DriveCast: the greeting of the hour, today's date (Gregorian + Hijri),
 * the next prayer, your team's match today and every device on now (phone, TV, car, tablet, Madar) with a green dot
 * and what it plays. Also the shared clipboard: a link copied on one device opens on any other.
 */
import { useEffect, useState } from "react";
import { Smartphone, Tv, Car, Tablet, Glasses, Monitor, Clipboard, X, ExternalLink, Copy } from "lucide-react";
import { hub, KIND_AR, type HubItem } from "@/lib/hub";
import { cn } from "@/lib/utils";

const API = "https://studio.c-p.workers.dev";
const ICON: Record<string, any> = { phone: Smartphone, tv: Tv, car: Car, tablet: Tablet, madar: Glasses, computer: Monitor };
const kindOf = (d: { kind?: string; app?: string }) => d.app === "madar" ? "madar" : ICON[d.kind || ""] ? d.kind! : "phone";
const isUrl = (t: string) => /^https?:\/\/\S+$/i.test(t.trim());

interface Welcome {
  greet: string; date: { weekday: string; day: string; month: string; year: string; hijri: string };
  next?: { title: string; time: string; mins: number } | null;
  devices?: { id: string; name: string; kind: string; app: string; playing?: { title?: string } | null }[];
  match?: { home: { name: string; logo?: string }; away: { name: string; logo?: string }; live: boolean; score: { home: number | null; away: number | null }; time: string; elapsed?: number; league?: string } | null;
}

/** every device on now, drawn as its icon with a green dot (and what it plays) */
export function DevicesStrip({ className, big, fallback }: { className?: string; big?: boolean; fallback?: { id: string; name: string; kind: string; app: string; playing?: { title?: string } | null }[] }) {
  const [, force] = useState(0);
  useEffect(() => { hub.start(); return hub.on(() => force(x => x + 1)); }, []);
  const resume = Object.values(hub.state.resume || {}) as HubItem[];
  const now = Date.now();
  // live from the hub socket; until it connects, the list the server sent with the welcome
  let list: any[] = hub.devices.length ? [...new Map(hub.devices.map(d => [d.id, d])).values()] : (fallback || []);
  // a device's background link (sys-<code>) only while its Madar page is closed: tap it to wake the device
  const ids = new Set(list.map(d => d.id));
  list = list.filter(d => !(d.app === "sys" && ids.has("madar-" + d.id.slice(4))));
  if (!list.length) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {list.map(d => {
        const k = d.app === "sys" ? "tablet" : kindOf(d), I = ICON[k], me = d.id === hub.me.id, sys = d.app === "sys";
        const p = resume.filter(x => x.from?.id === d.id && now - (x.at || 0) < 20 * 60e3).sort((a, b) => (b.at || 0) - (a.at || 0))[0] || d.playing;
        return (
          <div key={d.id} onClick={sys ? () => hub.sendTo(d.id, { type: "wake", share: true }) : undefined} className={cn("relative flex items-center gap-2 rounded-2xl bg-white/[0.07] border border-white/10 backdrop-blur-xl", sys && "cursor-pointer hover:bg-white/15 focusable", big ? "px-3.5 py-2.5" : "px-2.5 py-1.5")} title={sys ? "اضغط لإيقاظه" : d.name}>
            <div className="relative">
              <I className={big ? "w-6 h-6" : "w-4 h-4"} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-900 shadow-[0_0_8px_#34d399]" />
            </div>
            <div className="min-w-0 leading-tight">
              <div className={cn("font-black truncate max-w-[9rem]", big ? "text-sm" : "text-[11px]")}>{sys ? "مدار · " + String(d.name || "").split(" · ")[0] : KIND_AR[k] || d.name}{me ? " · أنت" : ""}</div>
              {sys && <div className="text-[10px] text-emerald-300/80">⏻ اضغط للإيقاظ</div>}
              {p?.title && <div className="text-[10px] text-white/55 truncate max-w-[9rem]">▶ {p.title}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** send what you copied to every other device (a tap = permission to read the clipboard) */
export async function sendClipboard(): Promise<string> {
  try {
    const t = (await navigator.clipboard.readText()).trim();
    if (!t) return "الحافظة فارغة";
    hub.sendTo("all", { type: "clip", text: t.slice(0, 2000) });
    return "📋 أُرسل إلى أجهزتك";
  } catch { return "اسمح بقراءة الحافظة ثم أعد المحاولة"; }
}

export function WelcomeCard() {
  const [w, setW] = useState<Welcome | null>(null);
  const [show, setShow] = useState(false);
  const [clip, setClip] = useState<{ text: string; from: string } | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    // once per visit: on opening, or coming back after 30 minutes away
    let last = 0; try { last = +(sessionStorage.getItem("dc.welcomeAt") || 0); } catch {}
    if (Date.now() - last > 30 * 60e3) {
      try { sessionStorage.setItem("dc.welcomeAt", String(Date.now())); } catch {}
      fetch(API + "/hub/welcome").then(r => r.json()).then(d => { if (d?.greet) { setW(d); setShow(true); } }).catch(() => {});
    }
    // a link copied on another device; a link copied here goes to the others by itself
    hub.start();
    const off = hub.on((d: any) => {
      if (d.type === "msg" && d.msg?.type === "clip" && d.msg.text) setClip({ text: String(d.msg.text), from: d.from?.name || KIND_AR[d.from?.kind] || "جهاز" });
    });
    const onCopy = () => setTimeout(() => { const t = String(window.getSelection() || "").trim(); if (isUrl(t)) hub.sendTo("all", { type: "clip", text: t }); }, 0);
    document.addEventListener("copy", onCopy);
    return () => { off(); document.removeEventListener("copy", onCopy); };
  }, []);
  useEffect(() => { if (!show) return; const t = setTimeout(() => setShow(false), 12000); return () => clearTimeout(t); }, [show]);
  useEffect(() => { if (!clip) return; const t = setTimeout(() => setClip(null), 30000); return () => clearTimeout(t); }, [clip]);

  return (
    <>
      {show && w && (
        <div dir="rtl" className="fixed inset-x-0 top-6 z-[100003] flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
          <div className="pointer-events-auto w-full max-w-xl rounded-[2rem] material-thick shadow-2xl p-5 text-label">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-black">{w.greet} 👋</div>
                <div className="mt-1 text-sm text-label-2 font-semibold">اليوم {w.date.weekday} {w.date.day} {w.date.month} · {w.date.hijri}</div>
              </div>
              <button onClick={() => setShow(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 focusable"><X className="w-4 h-4" /></button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {w.next && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/20 p-3">
                  <div className="text-[11px] text-emerald-300 font-bold">الصلاة القادمة</div>
                  <div className="text-lg font-black">{w.next.title} · {w.next.time}</div>
                  <div className="text-[11px] text-white/60">بعد {w.next.mins >= 60 ? Math.floor(w.next.mins / 60) + " س " : ""}{w.next.mins % 60} د</div>
                </div>
              )}
              {w.match && (
                <div className={cn("rounded-xl p-3 border", w.match.live ? "bg-rose-500/10 border-rose-400/30" : "bg-sky-500/10 border-sky-400/20")}>
                  <div className={cn("text-[11px] font-bold", w.match.live ? "text-rose-300" : "text-sky-300")}>{w.match.live ? "🔴 مباشر الآن" : "مباراتك اليوم"}</div>
                  <div className="flex items-center gap-1.5 text-sm font-black">
                    {w.match.home.logo && <img src={w.match.home.logo} alt="" className="w-5 h-5" />}
                    <span className="truncate">{w.match.home.name}</span>
                    <span className="tabular-nums" dir="ltr">{w.match.live ? `${w.match.score.home ?? 0}-${w.match.score.away ?? 0}` : w.match.time}</span>
                    <span className="truncate">{w.match.away.name}</span>
                    {w.match.away.logo && <img src={w.match.away.logo} alt="" className="w-5 h-5" />}
                  </div>
                  <div className="text-[11px] text-white/60 truncate">{w.match.league}</div>
                </div>
              )}
            </div>
            <div className="mt-4 text-xs font-semibold text-label-2 mb-2">أجهزتك المتصلة</div>
            <DevicesStrip big fallback={w.devices} />
            <div className="mt-4 flex items-center gap-2">
              <button onClick={async () => setNote(await sendClipboard())} className="flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-bold focusable">
                <Clipboard className="w-4 h-4" /> أرسل ما نسخته لأجهزتي
              </button>
              {note && <span className="text-xs text-white/60">{note}</span>}
            </div>
          </div>
        </div>
      )}
      {clip && (
        <div dir="rtl" className="fixed bottom-24 inset-x-0 z-[100003] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 max-w-lg rounded-full material-thick pl-2 pr-5 py-2 text-label shadow-2xl">
            <Clipboard className="w-4 h-4 text-sky-300 shrink-0" />
            <div className="min-w-0"><div className="text-[10px] text-white/50">من {clip.from}</div><div className="text-sm font-bold truncate max-w-[16rem]" dir="auto">{clip.text}</div></div>
            {isUrl(clip.text) && <button onClick={() => { window.open(clip.text.trim(), "_blank"); setClip(null); }} className="rounded-full bg-sky-500 px-3 py-1.5 text-xs font-black flex items-center gap-1 focusable"><ExternalLink className="w-3.5 h-3.5" /> افتح</button>}
            <button onClick={() => { navigator.clipboard?.writeText(clip.text).catch(() => {}); setClip(null); }} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black flex items-center gap-1 focusable"><Copy className="w-3.5 h-3.5" /> انسخ</button>
            <button onClick={() => setClip(null)} className="p-1.5 rounded-full hover:bg-white/10"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </>
  );
}
