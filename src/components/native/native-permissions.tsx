"use client";

import { useCallback, useEffect, useState } from "react";
import { Layers, BatteryCharging, BellRing, Check, Smartphone, Type, Sparkles } from "lucide-react";
import { nativeIsland, hubGet, hubSet, type NativeStatus, type NativeHubEvent } from "@/lib/native-app";
import { cn } from "@/lib/utils";

/**
 * Settings, inside the Android app only: grant the permissions the app needs to work like a native one -
 * the floating island above other apps, unrestricted background work, notifications.
 */
export function NativePermissions() {
  const [status, setStatus] = useState<NativeStatus | null>(null);
  const plugin = typeof window !== "undefined" ? nativeIsland() : null;

  const refresh = useCallback(() => { nativeIsland()?.getStatus().then(setStatus).catch(() => {}); }, []);
  useEffect(() => {
    refresh();
    // coming back from the system settings screen
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refresh]);

  // the islands' shared switches (also changed from the bubble on the phone)
  const [hub, setHub] = useState<Record<string, any>>({});
  useEffect(() => {
    hubGet().then(setHub);
    const on = (e: Event) => { const d = (e as NativeHubEvent).detail; if (d?.key) setHub(h => ({ ...h, [d.key]: d.value })); };
    window.addEventListener("native-hub", on);
    return () => window.removeEventListener("native-hub", on);
  }, []);
  const setShared = (key: string, value: unknown) => { setHub(h => ({ ...h, [key]: value })); hubSet(key, value); };

  const zoom = (v: number) => {
    const percent = Math.max(50, Math.min(200, Math.round(v)));
    setStatus(s => (s ? { ...s, textZoom: percent } : s));
    nativeIsland()?.setTextZoom({ percent }).catch(() => {});
  };

  if (!plugin || !status) return null;

  // the iPhone app: the Dynamic Island (prayers and reminders on by default, matches from here)
  if (status.platform === "ios") {
    const toggles = [
      { key: "prayer", title: "جزيرة الصلوات والتذكيرات", hint: "عدّاد الأذان والإقامة والتذكير القادم في الجزيرة الديناميكية، مع تنبيه عند كل وقت", on: status.prayerIsland !== false, set: (v: boolean) => plugin.setPrayerIsland({ enabled: v }) },
      { key: "matches", title: "جزيرة المباريات", hint: "مباريات فرقك المفضلة المباشرة: الشعارات والنتيجة والدقيقة، وتنفتح الجزيرة عند الهدف", on: !!status.matchesIsland, set: (v: boolean) => plugin.setMatchesIsland({ enabled: v }) },
    ];
    return (
      <section className="rounded-[2.5rem] bg-white/5 border border-white/10 p-6 md:p-8 space-y-4">
        <h2 className="text-2xl font-black text-white flex items-center gap-3"><Smartphone className="w-7 h-7 text-emerald-400" /> الجزيرة الديناميكية</h2>
        {!status.liveActivities && (
          <button onClick={() => plugin.requestOverlay()} className="focusable no-focus-scale w-full text-right rounded-3xl border border-yellow-400/40 bg-black/30 p-4 text-sm font-bold text-yellow-300">
            الأنشطة المباشرة متوقفة لهذا التطبيق - اضغط لفتح الإعدادات وتفعيل «الأنشطة المباشرة»
          </button>
        )}
        {!status.notifications && (
          <button onClick={() => { plugin.requestNotifications().finally(() => setTimeout(refresh, 800)); }} className="focusable no-focus-scale w-full text-right rounded-3xl border border-yellow-400/40 bg-black/30 p-4 flex items-center gap-3">
            <BellRing className="w-6 h-6 text-yellow-300" />
            <span className="flex-1 text-base font-black text-white">تفعيل التنبيهات (الأذان والإقامة والتذكيرات والأهداف)</span>
          </button>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {toggles.map(t => (
            <label key={t.key} className={cn("rounded-3xl border p-4 flex items-start gap-3 cursor-pointer", t.on ? "bg-emerald-500/10 border-emerald-400/30" : "bg-black/30 border-white/10")}>
              <input type="checkbox" checked={t.on} className="w-6 h-6 mt-0.5 accent-emerald-500 shrink-0"
                onChange={e => { const v = e.target.checked; setStatus(s => (s ? { ...s, [t.key === "prayer" ? "prayerIsland" : "matchesIsland"]: v } : s)); t.set(v).then(refresh); }} />
              <span className="flex-1 min-w-0">
                <span className="block text-base font-black text-white">{t.title}</span>
                <span className="block text-xs text-white/50 font-bold mt-1">{t.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {/* the page's size on the phone (iPhone: the web view's zoom) */}
        <div className="flex items-center gap-4 pt-2">
          <span className="text-sm font-black text-white/80 shrink-0 flex items-center gap-2"><Type className="w-5 h-5 text-emerald-400" /> حجم العرض</span>
          <button onClick={() => zoom((status.textZoom ?? 80) - 5)} className="focusable no-focus-scale w-11 h-11 rounded-full bg-white/10 text-white font-black text-lg">أ-</button>
          <input type="range" min={50} max={150} step={5} value={status.textZoom ?? 80} onChange={e => zoom(Number(e.target.value))} className="flex-1 accent-emerald-500" />
          <button onClick={() => zoom((status.textZoom ?? 80) + 5)} className="focusable no-focus-scale w-11 h-11 rounded-full bg-white/10 text-white font-black text-xl">أ+</button>
          <span className="w-14 text-center text-sm font-black text-emerald-300 tabular-nums">{status.textZoom ?? 80}%</span>
        </div>
        {status.version && <p className="text-[11px] text-white/30 font-bold">إصدار التطبيق {status.version}</p>}
      </section>
    );
  }

  const rows = [
    { key: "overlay", icon: Layers, title: "الظهور فوق التطبيقات", hint: "الجزيرة العائمة (المباريات المباشرة وعدّاد الصلاة) فوق أي تطبيق", ok: status.overlay, ask: () => plugin.requestOverlay() },
    { key: "accessibility", icon: Sparkles, title: "جزيرة فوق شريط الحالة", hint: "مثل تطبيقات Dynamic Island: فوق شريط الحالة وشاشة القفل ولا يوقفها توفير البطارية (فعّل DriveCast في إمكانية الوصول)", ok: !!status.accessibility, ask: () => plugin.requestAccessibility() },
    { key: "background", icon: BatteryCharging, title: "العمل في الخلفية بلا قيود", hint: "الصوت والنتائج تستمر والشاشة مغلقة أو في تطبيق آخر", ok: status.background, ask: () => plugin.requestBackground() },
    { key: "notifications", icon: BellRing, title: "الإشعارات", hint: "النتيجة والعدّاد في شريط الإشعارات وشاشة القفل", ok: status.notifications, ask: () => plugin.requestNotifications() },
  ];

  return (
    <section className="rounded-[2.5rem] bg-white/5 border border-white/10 p-6 md:p-8 space-y-4">
      <h2 className="text-2xl font-black text-white flex items-center gap-3"><Smartphone className="w-7 h-7 text-emerald-400" /> صلاحيات التطبيق</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {rows.map(r => (
          <button key={r.key} onClick={() => { r.ask().finally(() => setTimeout(refresh, 800)); }} disabled={r.ok} data-nav-id={`native-perm-${r.key}`}
            className={cn("focusable no-focus-scale text-right rounded-3xl border p-4 flex items-start gap-3",
              r.ok ? "bg-emerald-500/10 border-emerald-400/30" : "bg-black/30 border-yellow-400/40 hover:bg-white/10")}>
            <r.icon className={cn("w-6 h-6 shrink-0 mt-0.5", r.ok ? "text-emerald-400" : "text-yellow-300")} />
            <span className="flex-1 min-w-0">
              <span className="block text-base font-black text-white">{r.title}</span>
              <span className="block text-xs text-white/50 font-bold mt-1">{r.hint}</span>
            </span>
            {r.ok ? <Check className="w-5 h-5 text-emerald-400 shrink-0" /> : <span className="text-xs font-black text-yellow-300 shrink-0">تفعيل</span>}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-3 text-sm font-bold text-white/70">
        <input type="checkbox" checked={status.overlayEnabled} className="w-5 h-5 accent-emerald-500"
          onChange={e => plugin.setOverlayEnabled({ enabled: e.target.checked }).then(refresh)} />
        إظهار الجزيرة العائمة فوق التطبيقات الأخرى
      </label>
      {[
        { key: "islandsHidden", def: false, label: "إخفاء الجزر مؤقتاً (الهدف والأذان القريب يظهران رغم ذلك)" },
        { key: "islandBubble", def: true, label: "زر الإخفاء / الإظهار العائم على حافة الشاشة" },
        { key: "voiceFollow", def: false, label: "المتابعة الصوتية: قراءة الأهداف بصوت عربي أثناء القيادة" },
        { key: "roadPrayer", def: true, label: "🕌 أقرب مسجد على الطريق (من قبل الأذان بربع ساعة حتى بعد الإقامة بخمس دقائق)" },
        { key: "roadPrayerAlways", def: false, label: "🕌 إظهار أقرب مسجد في كل وقت (للتجربة)" },
      ].map(t => (
        <label key={t.key} className="flex items-center gap-3 text-sm font-bold text-white/70">
          <input type="checkbox" checked={typeof hub[t.key] === "boolean" ? hub[t.key] : t.def} className="w-5 h-5 accent-emerald-500"
            onChange={e => setShared(t.key, e.target.checked)} />
          {t.label}
        </label>
      ))}
      {/* test mode: see the islands and the goal animation without waiting for a match */}
      {plugin.testIslands && (
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <span className="text-sm font-black text-white/80">وضع التجربة</span>
          <button onClick={() => plugin.testIslands?.({ kind: "goal" })} data-nav-id="native-test-goal"
            className="focusable no-focus-scale h-11 px-5 rounded-full bg-[#00ff85] text-[#37003c] text-sm font-black italic">⚽ تجربة الهدف (4 أهداف كل 3 ثوانٍ)</button>
          <button onClick={() => plugin.testIslands?.({ kind: "islands" })} data-nav-id="native-test-islands"
            className="focusable no-focus-scale h-11 px-5 rounded-full bg-white/10 border border-white/15 text-white text-sm font-black">🏝 تجربة الجزر (دقيقة)</button>
        </div>
      )}
      {/* the app's font size (Android text zoom) */}
      <div className="flex items-center gap-4 pt-2">
        <span className="text-sm font-black text-white/80 shrink-0 flex items-center gap-2"><Type className="w-5 h-5 text-emerald-400" /> حجم الخط</span>
        <button onClick={() => zoom((status.textZoom ?? 100) - 10)} className="focusable no-focus-scale w-11 h-11 rounded-full bg-white/10 text-white font-black text-lg" data-nav-id="native-zoom-minus">أ-</button>
        <input type="range" min={70} max={200} step={5} value={status.textZoom ?? 100} onChange={e => zoom(Number(e.target.value))} className="flex-1 accent-emerald-500" />
        <button onClick={() => zoom((status.textZoom ?? 100) + 10)} className="focusable no-focus-scale w-11 h-11 rounded-full bg-white/10 text-white font-black text-xl" data-nav-id="native-zoom-plus">أ+</button>
        <span className="w-14 text-center text-sm font-black text-emerald-300 tabular-nums">{status.textZoom ?? 100}%</span>
        <button onClick={() => zoom(100)} className="focusable no-focus-scale h-11 px-4 rounded-full bg-white/5 border border-white/10 text-xs font-black text-white/60" data-nav-id="native-zoom-reset">افتراضي</button>
      </div>
      {status.version && <p className="text-[11px] text-white/30 font-bold">إصدار التطبيق {status.version}</p>}
    </section>
  );
}
