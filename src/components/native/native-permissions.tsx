"use client";

import { useCallback, useEffect, useState } from "react";
import { Layers, BatteryCharging, BellRing, Check, Smartphone } from "lucide-react";
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
      {status.version && <p className="text-[11px] text-white/30 font-bold">إصدار التطبيق {status.version}</p>}
    </section>
  );
}
