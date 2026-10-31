"use client";

/**
 * The Home Screen, like iOS 26: Liquid Glass widgets in small / medium / large sizes on a wallpaper, and you arrange
 * it yourself - press and hold (or «تعديل») and the widgets jiggle: drag to reorder, tap to change the size, − to
 * remove, + to add from the gallery, and choose the wallpaper. Saved on this device.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, Tv, Car, Tablet, Glasses, Monitor, Play, Pause, Maximize2, BookOpen, Sparkles, Trophy, Radio, Settings, Clipboard, Plus, Minus, Check, Image as ImageIcon, RotateCcw, Moon, Bell, Bookmark, LayoutGrid, Clock, CalendarDays, Gauge } from "lucide-react";
import { useMediaStore } from "@/lib/store";
import { hub, KIND_AR } from "@/lib/hub";
import { cn } from "@/lib/utils";
import { sendClipboard } from "@/components/hub/welcome-card";
import { ActiveAzkarWidget } from "./widgets/active-azkar-widget";
import { ReminderSummaryWidget } from "./widgets/reminder-summary-widget";
import { MoonWidget } from "./widgets/moon-widget";
import { PrayerTimelineWidget } from "./widgets/prayer-timeline-widget";
import { YouTubeSavedWidget } from "./widgets/youtube-saved-widget";
import { SovereignShortcutsWidget } from "./widgets/sovereign-shortcuts-widget";

const API = "https://studio.c-p.workers.dev";
type Size = "s" | "m" | "l" | "w";   // 2×2 · 4×2 · 4×4 · full width
interface Placed { id: string; type: string; size: Size }

// ------------------------------------------------------------------ shared data: greeting, prayer, match, devices
interface Welcome { greet: string; date: { weekday: string; day: string; month: string; hijri: string }; next?: { title: string; time: string; at: number } | null;
  match?: { home: { name: string; logo?: string }; away: { name: string; logo?: string }; live: boolean; score: { home: number | null; away: number | null }; time: string; elapsed?: number; league?: string } | null }
let wCache: Welcome | null = null; const wSubs = new Set<(w: Welcome) => void>(); let wTimer: any = 0;
function useWelcome() {
  const [w, setW] = useState<Welcome | null>(wCache);
  useEffect(() => {
    wSubs.add(setW);
    const load = () => fetch(API + "/hub/welcome").then(r => r.json()).then(d => { if (d?.greet) { wCache = d; wSubs.forEach(f => f(d)); } }).catch(() => {});
    if (!wTimer) { load(); wTimer = setInterval(load, 60_000); }
    return () => { wSubs.delete(setW); if (!wSubs.size) { clearInterval(wTimer); wTimer = 0; } };
  }, []);
  return w;
}
function useNow(ms = 1000) { const [n, setN] = useState(() => Date.now()); useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t); }, [ms]); return n; }

// ------------------------------------------------------------------ the glass every widget sits on
function Glass({ children, className, onClick, tint }: { children: ReactNode; className?: string; onClick?: () => void; tint?: string }) {
  return (
    <div onClick={onClick} className={cn("lg-glass relative h-full w-full overflow-hidden rounded-[1.75rem] text-white", onClick && "cursor-pointer", className)} style={tint ? { background: tint } : undefined}>
      {children}
    </div>
  );
}
const Label = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cn("text-[13px] font-semibold text-white/70", className)}>{children}</div>;

// ------------------------------------------------------------------ the widgets
function ClockW({ size }: { size: Size }) {
  const now = useNow(1000), w = useWelcome(), d = new Date(now);
  const hh = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  const date = d.toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long" });
  return (
    <Glass className="flex flex-col items-center justify-center">
      <div className="text-sm font-semibold text-white/80">{date}</div>
      <div dir="ltr" className={cn("lg-numerals leading-none tabular", size === "s" ? "text-[3.4rem]" : size === "l" ? "text-[9rem]" : "text-[5.6rem]")}>{hh}</div>
      {w && <div className="text-xs font-semibold text-white/60 mt-1">{w.date.hijri}</div>}
    </Glass>
  );
}
function CalendarW() {
  const now = useNow(60_000), d = new Date(now), w = useWelcome();
  return (
    <Glass className="p-4 flex flex-col">
      <div className="text-[13px] font-bold text-rose-400">{d.toLocaleDateString("ar", { weekday: "long" })}</div>
      <div className="text-[3.6rem] font-light leading-none mt-1 tabular" dir="ltr">{d.getDate()}</div>
      <div className="mt-auto text-sm font-semibold">{d.toLocaleDateString("ar", { month: "long" })}</div>
      {w && <div className="text-xs text-white/60">{w.date.hijri}</div>}
    </Glass>
  );
}
function PrayerW({ size }: { size: Size }) {
  const w = useWelcome(), now = useNow(1000), n = w?.next;
  const left = n?.at ? Math.max(0, n.at - now) : 0, h = Math.floor(left / 3600e3), m = Math.floor(left / 60e3) % 60, s = Math.floor(left / 1000) % 60;
  return (
    <Glass className="p-4 flex flex-col" tint="linear-gradient(160deg,rgba(16,185,129,.42),rgba(6,78,59,.38))">
      <div className="flex items-center gap-1.5"><Moon className="w-4 h-4" /><Label className="text-white/85">الصلاة القادمة</Label></div>
      {n ? (<>
        <div className={cn("font-bold mt-1", size === "s" ? "text-2xl" : "text-3xl")}>{n.title}</div>
        <div className="text-sm text-white/75">{n.time}</div>
        <div dir="ltr" className={cn("mt-auto font-semibold tabular text-right", size === "s" ? "text-2xl" : "text-4xl")}>{h ? h + ":" : ""}{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</div>
      </>) : <div className="m-auto text-sm text-white/60">…</div>}
    </Glass>
  );
}
function MatchW({ size }: { size: Size }) {
  const w = useWelcome(), router = useRouter(), m = w?.match;
  const Team = ({ t }: { t: { name: string; logo?: string } }) => (
    <div className="flex flex-col items-center gap-1 min-w-0 flex-1">{t.logo ? <img src={t.logo} alt="" className={size === "s" ? "w-9 h-9" : "w-12 h-12"} /> : <Trophy className="w-8 h-8 opacity-60" />}<span className="text-xs font-semibold truncate max-w-full">{t.name}</span></div>
  );
  return (
    <Glass className="p-4 flex flex-col" onClick={() => router.push("/matches")} tint={m?.live ? "linear-gradient(160deg,rgba(244,63,94,.42),rgba(76,5,25,.4))" : undefined}>
      <div className="flex items-center gap-1.5"><Trophy className="w-4 h-4" /><Label className="text-white/85">{m?.live ? "مباشر الآن" + (m.elapsed ? " · " + m.elapsed + "'" : "") : "مباراتك"}</Label></div>
      {m ? (
        <div className="flex-1 flex items-center gap-2 mt-2">
          <Team t={m.home} />
          <div className={cn("font-bold tabular shrink-0", size === "s" ? "text-xl" : "text-3xl")} dir="ltr">{m.live ? `${m.score.away ?? 0} - ${m.score.home ?? 0}` : m.time /* LTR digits: the home score sits next to the home team (on the right) */}</div>
          <Team t={m.away} />
        </div>
      ) : <div className="m-auto text-sm text-white/60">لا مباراة لفريقك اليوم</div>}
      {m?.league && size !== "s" && <div className="text-xs text-white/60 text-center truncate">{m.league}</div>}
    </Glass>
  );
}
const DICON: Record<string, any> = { phone: Smartphone, tv: Tv, car: Car, tablet: Tablet, madar: Glasses, computer: Monitor };
function DevicesW() {
  const [, force] = useState(0);
  useEffect(() => { hub.start(); return hub.on(() => force(x => x + 1)); }, []);
  const ids = new Set(hub.devices.map(d => d.id));
  const list = [...new Map(hub.devices.map(d => [d.id, d])).values()].filter(d => !(d.app === "sys" && ids.has("madar-" + d.id.slice(4)))).slice(0, 4);
  return (
    <Glass className="p-4 flex flex-col">
      <Label>أجهزتك</Label>
      <div className="flex-1 grid grid-cols-4 gap-2 items-center mt-2">
        {list.map(d => {
          const k = d.app === "sys" ? "tablet" : d.app === "madar" ? "madar" : DICON[d.kind] ? d.kind : "phone", I = DICON[k], sys = d.app === "sys";
          return (
            <button key={d.id} onClick={sys ? () => hub.sendTo(d.id, { type: "wake", share: true }) : undefined} className="flex flex-col items-center gap-1.5 min-w-0">
              <span className={cn("relative w-14 h-14 rounded-full grid place-items-center bg-white/10 ring-[3px]", sys ? "ring-amber-300/70" : "ring-emerald-400/90")}><I className="w-6 h-6" /></span>
              <span className="text-[11px] font-semibold truncate max-w-full">{sys ? "⏻ أيقظ" : KIND_AR[k] || d.name}</span>
            </button>
          );
        })}
        {!list.length && <div className="col-span-4 text-center text-sm text-white/60">لا أجهزة متصلة</div>}
      </div>
    </Glass>
  );
}
function NowPlayingW({ size }: { size: Size }) {
  const { activeVideo, lastPlayedVideo, isPlaying, setIsPlaying, setIsMinimized } = useMediaStore() as any;
  const v = activeVideo || lastPlayedVideo;
  return (
    <Glass className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/10 shrink-0">{v?.thumbnail && <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />}</div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{v?.title || "لا شيء يعمل"}</div>
          <div className="text-sm text-white/60 truncate">{v?.channelTitle || v?.channel || "DriveCast"}</div>
        </div>
      </div>
      {size !== "s" && (
        <div className="mt-auto flex items-center justify-center gap-8">
          <button className="focusable rounded-full p-2" onClick={() => setIsPlaying(!isPlaying)} aria-label="تشغيل">{isPlaying ? <Pause className="w-9 h-9 fill-white" /> : <Play className="w-9 h-9 fill-white" />}</button>
          <button className="focusable rounded-full p-2" onClick={() => setIsMinimized(false)} aria-label="ملء الشاشة"><Maximize2 className="w-6 h-6" /></button>
        </div>
      )}
    </Glass>
  );
}
const CONTROLS = [
  { href: "/quran", label: "القرآن", icon: BookOpen, c: "#34c759" }, { href: "/football", label: "الأذكار", icon: Sparkles, c: "#ff9f0a" },
  { href: "/matches", label: "المباريات", icon: Trophy, c: "#ff375f" }, { href: "/iptv", label: "البث", icon: Tv, c: "#0a84ff" },
  { href: "/media", label: "الوسائط", icon: Radio, c: "#bf5af2" }, { href: "/hub", label: "مدار", icon: Glasses, c: "#64d2ff" },
  { href: "/car-dashboard", label: "السيارة", icon: Gauge, c: "#ffd60a" }, { href: "/settings", label: "الإعدادات", icon: Settings, c: "#8e8e93" },
];
function ControlsW({ size }: { size: Size }) {
  const router = useRouter(); const n = size === "s" ? 4 : size === "l" ? 8 : 4;
  return (
    <Glass className="p-3 grid grid-cols-4 gap-2 content-center">
      {CONTROLS.slice(0, n).map(c => (
        <button key={c.href} onClick={() => router.push(c.href)} className={cn("focusable flex flex-col items-center gap-1 rounded-2xl py-1", size === "s" && "col-span-2")}>
          <span className="w-14 h-14 rounded-full grid place-items-center lg-chip" style={{ color: c.c }}><c.icon className="w-6 h-6" /></span>
          {size !== "s" && <span className="text-[11px] font-semibold">{c.label}</span>}
        </button>
      ))}
    </Glass>
  );
}
function ClipW() {
  const [note, setNote] = useState("");
  return (
    <Glass className="p-4 flex flex-col items-center justify-center gap-2 text-center" onClick={async () => { setNote(await sendClipboard()); setTimeout(() => setNote(""), 2500); }}>
      <span className="w-14 h-14 rounded-full grid place-items-center lg-chip text-sky-300"><Clipboard className="w-6 h-6" /></span>
      <div className="text-sm font-semibold">{note || "أرسل ما نسخته"}</div>
    </Glass>
  );
}
const Embed = ({ children }: { children: ReactNode }) => <Glass className="[&>*]:!bg-transparent">{children}</Glass>;

// the gallery: every widget, its sizes, and how it draws
const WIDGETS: Record<string, { name: string; desc: string; icon: any; sizes: Size[]; rows?: string; draw: (s: Size) => ReactNode }> = {
  clock: { name: "الساعة", desc: "الوقت بأرقام زجاجية والتاريخ الهجري", icon: Clock, sizes: ["s", "m", "l"], draw: s => <ClockW size={s} /> },
  calendar: { name: "التقويم", desc: "اليوم والشهر الميلادي والهجري", icon: CalendarDays, sizes: ["s"], draw: () => <CalendarW /> },
  prayer: { name: "الصلاة", desc: "الصلاة القادمة والعدّ التنازلي", icon: Moon, sizes: ["s", "m"], draw: s => <PrayerW size={s} /> },
  match: { name: "مباراتك", desc: "فريقك المفضّل: النتيجة المباشرة أو الموعد", icon: Trophy, sizes: ["s", "m"], draw: s => <MatchW size={s} /> },
  devices: { name: "الأجهزة", desc: "كل جهاز متصل بنقطة خضراء · اضغط لإيقاظه", icon: Smartphone, sizes: ["m"], draw: () => <DevicesW /> },
  nowplaying: { name: "يُعرض الآن", desc: "ما يعمل الآن مع التحكم", icon: Play, sizes: ["s", "m"], draw: s => <NowPlayingW size={s} /> },
  controls: { name: "التحكم", desc: "أزرار دائرية لكل أقسام التطبيق", icon: LayoutGrid, sizes: ["s", "m", "l"], draw: s => <ControlsW size={s} /> },
  clip: { name: "الحافظة", desc: "أرسل ما نسخته لكل أجهزتك", icon: Clipboard, sizes: ["s"], draw: () => <ClipW /> },
  azkar: { name: "الأذكار", desc: "ذكر الوقت", icon: Sparkles, sizes: ["m", "l"], draw: () => <Embed><ActiveAzkarWidget /></Embed> },
  reminders: { name: "التذكيرات", desc: "ملخص تذكيراتك", icon: Bell, sizes: ["m", "l"], draw: () => <Embed><ReminderSummaryWidget /></Embed> },
  moon: { name: "القمر", desc: "طور القمر الليلة", icon: Moon, sizes: ["s", "m", "l"], draw: () => <Embed><MoonWidget /></Embed> },
  prayerbar: { name: "شريط الصلوات", desc: "الصلوات الخمس على خط اليوم", icon: Moon, sizes: ["w"], rows: "row-span-2", draw: () => <div className="h-full"><PrayerTimelineWidget /></div> },
  saved: { name: "الفيديوهات المحفوظة", desc: "قائمتك من يوتيوب", icon: Bookmark, sizes: ["w"], rows: "row-span-4", draw: () => <div><YouTubeSavedWidget /></div> },
  shortcuts: { name: "الاختصارات", desc: "اختصاراتك السيادية", icon: LayoutGrid, sizes: ["w"], rows: "row-span-3", draw: () => <Embed><SovereignShortcutsWidget /></Embed> },
};
const DEFAULT: Placed[] = [
  { id: "a", type: "clock", size: "m" }, { id: "b", type: "prayer", size: "s" }, { id: "c", type: "match", size: "s" },
  { id: "d", type: "nowplaying", size: "m" }, { id: "e", type: "devices", size: "m" }, { id: "f", type: "controls", size: "m" },
  { id: "g", type: "calendar", size: "s" }, { id: "h", type: "clip", size: "s" }, { id: "i", type: "azkar", size: "m" }, { id: "j", type: "reminders", size: "m" },
  { id: "k", type: "prayerbar", size: "w" }, { id: "l", type: "saved", size: "w" },
];
const WALLS: Record<string, { name: string; css: string }> = {
  liquid: { name: "أزرق سائل", css: "radial-gradient(60% 50% at 15% 10%,#2f6bff 0,transparent 70%),radial-gradient(55% 45% at 90% 30%,#7b3fe4 0,transparent 70%),radial-gradient(60% 50% at 20% 95%,#0891b2 0,transparent 70%),linear-gradient(160deg,#0b1a44,#060a18)" },
  dusk: { name: "غروب", css: "radial-gradient(60% 50% at 80% 10%,#ff7a45 0,transparent 70%),radial-gradient(60% 50% at 10% 60%,#c0267a 0,transparent 70%),linear-gradient(170deg,#2a0f3a,#0b0614)" },
  forest: { name: "واحة", css: "radial-gradient(60% 50% at 20% 15%,#10b981 0,transparent 70%),radial-gradient(55% 45% at 85% 70%,#0e7490 0,transparent 70%),linear-gradient(160deg,#052e2b,#020a0a)" },
  black: { name: "أسود", css: "#000" },
};
const KEY = "dc.home.v1", WKEY = "dc.home.wall";
const SPAN: Record<Size, string> = { s: "col-span-2 row-span-2", m: "col-span-4 row-span-2", l: "col-span-4 row-span-4", w: "col-span-full" };

export function HomeScreen() {
  const [items, setItems] = useState<Placed[]>(DEFAULT);
  const [wall, setWall] = useState("liquid");
  const [edit, setEdit] = useState(false);
  const [gallery, setGallery] = useState(false);
  const [drag, setDrag] = useState<string | null>(null);
  const press = useRef<any>(0), pending = useRef<{ id: string; x: number; y: number } | null>(null), dragged = useRef(false);
  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (Array.isArray(s) && s.length) setItems(s.filter((x: Placed) => WIDGETS[x.type])); } catch {}
    try { const w = localStorage.getItem(WKEY); if (w && WALLS[w]) setWall(w); } catch {}
  }, []);
  const save = (next: Placed[]) => { setItems(next); try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {} };
  const pickWall = (w: string) => { setWall(w); try { localStorage.setItem(WKEY, w); } catch {} };

  const holdStart = () => { if (edit) return; clearTimeout(press.current); press.current = setTimeout(() => { try { navigator.vibrate?.(15); } catch {} setEdit(true); }, 600); };
  const holdEnd = () => clearTimeout(press.current);
  const cycle = (p: Placed) => { const s = WIDGETS[p.type].sizes; if (s.length < 2) return; save(items.map(x => x.id === p.id ? { ...x, size: s[(s.indexOf(x.size) + 1) % s.length] } : x)); };
  const remove = (id: string) => save(items.filter(x => x.id !== id));
  const add = (type: string, size: Size) => { save([{ id: Math.random().toString(36).slice(2, 8), type, size }, ...items]); setGallery(false); };
  // drag to reorder: the widget under your finger takes its place
  const onDragMove = (e: React.PointerEvent) => {
    const pd = pending.current;
    if (pd && !drag && Math.hypot(e.clientX - pd.x, e.clientY - pd.y) > 10) { setDrag(pd.id); dragged.current = true; clearTimeout(press.current); }
    if (!drag) return;
    const el = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest("[data-wid]") as HTMLElement | null;
    const over = el?.dataset.wid; if (!over || over === drag) return;
    const from = items.findIndex(x => x.id === drag), to = items.findIndex(x => x.id === over); if (from < 0 || to < 0) return;
    const next = items.slice(); const [m] = next.splice(from, 1); next.splice(to, 0, m); setItems(next);
  };
  const onDragEnd = () => { pending.current = null; if (drag) { save(items); setDrag(null); } };

  return (
    <div className="relative min-h-full -mx-6 px-4 md:px-8 pt-4 pb-40" onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>
      {/* the wallpaper stays put behind the glass while the widgets scroll over it */}
      <div aria-hidden className="fixed inset-0 z-0 pointer-events-none transition-[background] duration-700" style={{ background: WALLS[wall].css }} />
      {/* the bar: Edit / + / Done, like the Home Screen edit mode */}
      <div className="sticky top-2 z-30 flex items-center justify-between gap-2 mb-4" dir="rtl">
        {edit ? (
          <>
            <button onClick={() => setGallery(true)} className="lg-glass focusable rounded-full h-11 px-4 flex items-center gap-1.5 font-semibold text-white whitespace-nowrap"><Plus className="w-5 h-5" /> أضف</button>
            <div className="flex items-center gap-1.5 lg-glass rounded-full p-1">
              {Object.entries(WALLS).map(([k, w]) => <button key={k} title={w.name} onClick={() => pickWall(k)} className={cn("w-8 h-8 rounded-full border-2 focusable", wall === k ? "border-white" : "border-white/20")} style={{ background: w.css }} />)}
            </div>
            <button onClick={() => { setEdit(false); setDrag(null); }} className="focusable rounded-full h-11 px-5 bg-[#0a84ff] text-white font-semibold flex items-center gap-1"><Check className="w-5 h-5" /> تم</button>
          </>
        ) : (
          <button onClick={() => setEdit(true)} className="lg-glass focusable rounded-full h-10 px-4 mr-auto flex items-center gap-1.5 text-sm font-semibold text-white"><ImageIcon className="w-4 h-4" /> تعديل الشاشة</button>
        )}
      </div>

      <div className="relative z-[1] grid grid-cols-4 md:grid-cols-8 xl:grid-cols-12 auto-rows-[84px] md:auto-rows-[96px] gap-4 grid-flow-row-dense" dir="rtl">
        {items.map(p => {
          const W = WIDGETS[p.type]; if (!W) return null;
          return (
            <div key={p.id} data-wid={p.id}
              className={cn("relative", SPAN[p.size], p.size === "w" && (W.rows || "row-span-3"), edit && "lg-jiggle", drag === p.id && "opacity-60 scale-105 z-20")}
              style={edit ? { animationDelay: `${(p.id.charCodeAt(0) % 5) * -0.07}s`, touchAction: "none" } : undefined}
              onPointerDown={e => { holdStart(); dragged.current = false; if (edit && !(e.target as HTMLElement).closest("button")) pending.current = { id: p.id, x: e.clientX, y: e.clientY }; }} onPointerUp={holdEnd} onPointerLeave={holdEnd}
              onClick={edit ? () => { if (dragged.current) { dragged.current = false; return; } cycle(p); } : undefined}>
              <div className={cn("h-full", edit && "pointer-events-none", p.size === "w" && "overflow-y-auto no-scrollbar rounded-[1.75rem]")}>{W.draw(p.size)}</div>
              {edit && (
                <>
                  <button onClick={e => { e.stopPropagation(); remove(p.id); }} className="absolute -top-2 -right-2 z-10 w-7 h-7 rounded-full bg-zinc-300 text-black grid place-items-center shadow-lg focusable" aria-label="احذف"><Minus className="w-4 h-4" strokeWidth={3} /></button>
                  {W.sizes.length > 1 && <span className="absolute bottom-2 left-2 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/50 text-white">{{ s: "صغير", m: "متوسط", l: "كبير", w: "عريض" }[p.size]} · اضغط للتغيير</span>}
                </>
              )}
            </div>
          );
        })}
      </div>
      {!items.length && <div className="text-center text-white/70 py-20">الشاشة فارغة — اضغط «تعديل الشاشة» ثم «أضف أداة»</div>}

      {/* the gallery sheet */}
      {gallery && (
        <div className="fixed inset-0 z-[100004] flex items-end md:items-center justify-center bg-black/40" onClick={() => setGallery(false)} dir="rtl">
          <div className="material-thick w-full md:max-w-2xl max-h-[82vh] overflow-y-auto rounded-t-[2.4rem] md:rounded-[2.4rem] p-5 pb-10 text-white animate-in slide-in-from-bottom-10 duration-500" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1.5 rounded-full bg-white/30 mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold">الأدوات</h3>
              <button onClick={() => { save(DEFAULT); setGallery(false); }} className="text-sm text-[#0a84ff] font-semibold flex items-center gap-1 focusable rounded-full px-3 py-2"><RotateCcw className="w-4 h-4" /> الترتيب الأصلي</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(WIDGETS).map(([k, w]) => (
                <div key={k} className="rounded-3xl bg-white/[0.07] p-4 flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl lg-chip grid place-items-center shrink-0"><w.icon className="w-6 h-6" /></span>
                  <div className="flex-1 min-w-0"><div className="font-semibold">{w.name}</div><div className="text-xs text-white/60 truncate">{w.desc}</div></div>
                  <div className="flex gap-1">{w.sizes.map(s => <button key={s} onClick={() => add(k, s)} className="focusable h-9 px-3 rounded-full bg-[#0a84ff] text-xs font-bold">{{ s: "صغير", m: "متوسط", l: "كبير", w: "عريض" }[s]}</button>)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
