"use client";

import { useIptvPlayback, PROFILE_LABELS, type BufferProfile, type ConnectionMode, type IptvEngine } from "@/lib/iptv-playback";
import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";

/** Segmented choice row. */
function Choice<T extends string | number>({ label, hint, value, options, onChange }: {
  label: string; hint?: string; value: T; options: { value: T; title: string; sub?: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-black text-white">{label}</span>
        {hint && <span className="text-[10px] text-white/40 font-bold">{hint}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button
            key={String(o.value)}
            onClick={() => onChange(o.value)}
            className={cn("focusable no-focus-scale flex-1 min-w-[5.5rem] rounded-2xl border px-3 py-2 text-right",
              value === o.value ? "bg-emerald-500 text-black border-emerald-500" : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10")}
          >
            <span className="block text-xs font-black">{o.title}</span>
            {o.sub && <span className={cn("block text-[10px] font-bold mt-0.5", value === o.value ? "text-black/70" : "text-white/40")}>{o.sub}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="focusable no-focus-scale w-full flex items-center justify-between gap-3 rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-right">
      <span>
        <span className="block text-sm font-black text-white">{label}</span>
        {sub && <span className="block text-[10px] font-bold text-white/40 mt-0.5">{sub}</span>}
      </span>
      <span className={cn("w-11 h-6 rounded-full p-0.5 flex shrink-0", checked ? "bg-emerald-500 justify-start" : "bg-white/15 justify-end")}>
        <span className="w-5 h-5 rounded-full bg-white" />
      </span>
    </button>
  );
}

/**
 * Customisable IPTV playback (anti-stutter). Changes apply to the playing channel immediately.
 * Saved per device: each screen/network can have its own tuning.
 */
export function IptvPlaybackSettings({ compact = false }: { compact?: boolean }) {
  const s = useIptvPlayback();
  return (
    <div className={cn("space-y-4 text-right", compact && "text-[13px]")} dir="rtl">
      <Choice<BufferProfile>
        label="وضع التشغيل" hint="لتقليل التقطيع اختر ثابت"
        value={s.profile} onChange={profile => s.setPlayback({ profile })}
        options={(Object.keys(PROFILE_LABELS) as BufferProfile[]).map(k => ({ value: k, title: PROFILE_LABELS[k].title, sub: PROFILE_LABELS[k].hint }))}
      />
      <Choice<IptvEngine>
        label="محرك البث" hint="جرّب TS إذا استمر التقطيع"
        value={s.engine} onChange={engine => s.setPlayback({ engine })}
        options={[
          { value: "hls", title: "HLS (m3u8)", sub: "الافتراضي" },
          { value: "mpegts", title: "MPEG-TS (.ts)", sub: "بث متصل · أنعم غالباً · الأفضل على السيرفر المحلي" },
        ]}
      />
      <Choice<ConnectionMode>
        label="الاتصال" hint="عبر السيرفر يحل الحجب و CORS"
        value={s.connection} onChange={connection => s.setPlayback({ connection })}
        options={[
          { value: "auto", title: "تلقائي" },
          { value: "relay", title: "عبر السيرفر" },
          { value: "direct", title: "مباشر" },
        ]}
      />
      <Choice<number>
        label="التخزين المسبق" hint="ثوانٍ تُحمّل قبل العرض"
        value={s.bufferSeconds} onChange={bufferSeconds => s.setPlayback({ bufferSeconds })}
        options={[30, 60, 120, 180].map(v => ({ value: v, title: `${v} ث` }))}
      />
      <Choice<number>
        label="أعلى جودة" hint="خفّضها إذا كان الإنترنت ضعيفاً"
        value={s.maxQuality} onChange={maxQuality => s.setPlayback({ maxQuality })}
        options={[{ value: 0, title: "تلقائي" }, { value: 1080, title: "1080p" }, { value: 720, title: "720p" }, { value: 480, title: "480p" }]}
      />
      <Toggle label="إعادة الاتصال التلقائي" sub="عند تجمّد الصورة أو انقطاع البث" checked={s.autoReconnect} onChange={autoReconnect => s.setPlayback({ autoReconnect })} />
      <Toggle label="عرض حالة البث" sub="التخزين · الجودة · السرعة · الإطارات المفقودة" checked={s.showStats} onChange={showStats => s.setPlayback({ showStats })} />
      <button onClick={s.resetPlayback} className="focusable no-focus-scale flex items-center gap-2 text-xs font-bold text-white/50 hover:text-white">
        <RotateCcw className="w-3.5 h-3.5" /> استعادة الإعدادات الافتراضية
      </button>
    </div>
  );
}
