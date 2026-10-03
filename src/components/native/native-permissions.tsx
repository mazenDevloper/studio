"use client";

import { useCallback, useEffect, useState } from "react";
import { Layers, BatteryCharging, BellRing, Check, Smartphone, Type } from "lucide-react";
import { nativeIsland, type NativeStatus } from "@/lib/native-app";
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

  const zoom = (v: number) => {
    const percent = Math.max(70, Math.min(200, Math.round(v)));
    setStatus(s => (s ? { ...s, textZoom: percent } : s));
    nativeIsland()?.setTextZoom({ percent }).catch(() => {});
  };

  if (!plugin || !status) return null;

  const rows = [
    { key: "overlay", icon: Layers, title: "الظهور فوق التطبيقات", hint: "الجزيرة العائمة (المباريات المباشرة وعدّاد الصلاة) فوق أي تطبيق", ok: status.overlay, ask: () => plugin.requestOverlay() },
    { key: "background", icon: BatteryCharging, title: "العمل في الخلفية بلا قيود", hint: "الصوت والنتائج تستمر والشاشة مغلقة أو في تطبيق آخر", ok: status.background, ask: () => plugin.requestBackground() },
    { key: "notifications", icon: BellRing, title: "الإشعارات", hint: "النتيجة والعدّاد في شريط الإشعارات وشاشة القفل", ok: status.notifications, ask: () => plugin.requestNotifications() },
  ];

  return (
    <section className="rounded-[2.5rem] bg-white/5 border border-white/10 p-6 md:p-8 space-y-4">
      <h2 className="text-2xl font-black text-white flex items-center gap-3"><Smartphone className="w-7 h-7 text-emerald-400" /> صلاحيات التطبيق</h2>
      <div className="grid gap-3 md:grid-cols-3">
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
