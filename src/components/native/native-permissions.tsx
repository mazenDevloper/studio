"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/constants";
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
      <TripsSettings hub={hub} setShared={setShared} />
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

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
type Place = { name?: string; text?: string; lat?: number; lon?: number };
type WeeklyTrip = { id: string; days: number[]; time: string; to: string; off?: boolean };

/**
 * Home / work and the weekly trips (the phone plans each one near its time: route, the prayers on the way and the
 * mosque for each). Shared with the phone through the Hub ("places", "weeklyTrips").
 */
function TripsSettings({ hub, setShared }: { hub: Record<string, any>; setShared: (k: string, v: unknown) => void }) {
  const places: Record<string, Place> = hub.places || {};
  const trips: WeeklyTrip[] = Array.isArray(hub.weeklyTrips) ? hub.weeklyTrips : [];
  const setPlace = (key: string, p: Place) => setShared("places", { ...places, [key]: p });
  const here = (key: string) => navigator.geolocation?.getCurrentPosition(
    pos => setPlace(key, { name: key === "home" ? "البيت" : "العمل", lat: pos.coords.latitude, lon: pos.coords.longitude, text: "موقعي المحفوظ" }),
    () => alert("تعذّر تحديد الموقع"), { enableHighAccuracy: true, timeout: 15000 });
  const setTrips = (t: WeeklyTrip[]) => setShared("weeklyTrips", t);
  const update = (id: string, u: Partial<WeeklyTrip>) => setTrips(trips.map(t => (t.id === id ? { ...t, ...u } : t)));
  return (
    <div className="space-y-3 pt-3 border-t border-white/10">
      <p className="text-sm font-black text-white/80">🧭 أماكني ورحلاتي الأسبوعية</p>
      <p className="text-[11px] text-white/45 font-bold">يخطط الهاتف كل رحلة قرب وقتها: المسار، الصلوات التي تقع أثناء الطريق، وأقرب مسجد لكل صلاة. ويمكنك أيضاً أن تقول: «رحلتي إلى صلالة».</p>
      {(["home", "work"] as const).map(key => (
        <PlaceRow key={key} k={key} place={places[key]} onSave={p => setPlace(key, p)} onHere={() => here(key)} />
      ))}
      {trips.map(t => (
        <div key={t.id} className={cn("rounded-2xl border p-3 space-y-2", t.off ? "border-white/5 opacity-60" : "border-white/10 bg-white/5")}>
          <div className="flex flex-wrap items-center gap-2">
            <input type="time" value={t.time} onChange={e => update(t.id, { time: e.target.value })}
              className="h-9 px-3 rounded-full bg-black/40 border border-white/10 text-white text-sm font-black" />
            <span className="text-xs text-white/50 font-bold">إلى</span>
            <select value={["home", "work"].includes(t.to) ? t.to : "other"} onChange={e => update(t.id, { to: e.target.value === "other" ? "" : e.target.value })}
              className="h-9 px-3 rounded-full bg-black/40 border border-white/10 text-white text-sm font-bold">
              <option value="work">العمل</option><option value="home">البيت</option><option value="other">مكان آخر…</option>
            </select>
            {!["home", "work"].includes(t.to) && (
              <input value={t.to} placeholder="اسم المكان" onChange={e => update(t.id, { to: e.target.value })}
                className="flex-1 min-w-[8rem] h-9 px-3 rounded-full bg-black/40 border border-white/10 text-white text-sm font-bold" />
            )}
            <button onClick={() => update(t.id, { off: !t.off })} className="h-9 px-3 rounded-full bg-white/10 text-xs font-black text-white">{t.off ? "تفعيل" : "إيقاف"}</button>
            <button onClick={() => setTrips(trips.filter(x => x.id !== t.id))} className="h-9 px-3 rounded-full bg-red-600/40 text-xs font-black text-white">حذف</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => {
              const on = t.days.includes(i);
              return (
                <button key={i} onClick={() => update(t.id, { days: on ? t.days.filter(x => x !== i) : [...t.days, i] })}
                  className={cn("h-8 px-3 rounded-full text-xs font-black", on ? "bg-emerald-500 text-black" : "bg-white/5 text-white/50")}>{d}</button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setTrips([...trips, { id: String(Date.now()), days: [0, 1, 2, 3, 4], time: "07:00", to: "work" }])}
          className="focusable no-focus-scale h-10 px-4 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-sm font-black">+ رحلة الذهاب للعمل</button>
        <button onClick={() => setTrips([...trips, { id: String(Date.now()), days: [0, 1, 2, 3, 4], time: "14:30", to: "home" }])}
          className="focusable no-focus-scale h-10 px-4 rounded-full bg-white/10 border border-white/10 text-white text-sm font-black">+ رحلة العودة للبيت</button>
        <button onClick={() => setTrips([...trips, { id: String(Date.now()), days: [4], time: "16:00", to: "" }])}
          className="focusable no-focus-scale h-10 px-4 rounded-full bg-white/10 border border-white/10 text-white text-sm font-black">+ رحلة أخرى</button>
      </div>
    </div>
  );
}

/** One saved place: type an address and press "حفظ", take the current position, or pick it on the map. */
function PlaceRow({ k, place, onSave, onHere }: { k: "home" | "work"; place?: Place; onSave: (p: Place) => void; onHere: () => void }) {
  const label = k === "home" ? "البيت" : "العمل";
  const [text, setText] = useState(place?.text ?? "");
  const [map, setMap] = useState(false);
  useEffect(() => { setText(place?.text ?? ""); }, [place?.text]);
  const dirty = text.trim() !== (place?.text ?? "");
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-16 text-sm font-black text-white/70 shrink-0">{k === "home" ? "🏠" : "🏢"} {label}</span>
        <input value={text} placeholder="العنوان أو اسم المكان" onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && text.trim()) onSave({ name: label, text: text.trim() }); }}
          className="flex-1 min-w-[10rem] h-10 px-4 rounded-full bg-white/5 border border-white/10 text-white text-sm font-bold focusable" />
        <button onClick={() => text.trim() && onSave({ name: label, text: text.trim() })} disabled={!dirty || !text.trim()}
          className={cn("focusable no-focus-scale h-10 px-4 rounded-full text-xs font-black shrink-0", dirty && text.trim() ? "bg-emerald-500 text-black" : "bg-white/5 text-white/30")}>حفظ</button>
        <button onClick={onHere} className="focusable no-focus-scale h-10 px-3 rounded-full bg-white/10 text-xs font-black text-white shrink-0">📍 موقعي الآن</button>
        <button onClick={() => setMap(true)} className="focusable no-focus-scale h-10 px-3 rounded-full bg-white/10 text-xs font-black text-white shrink-0">🗺 من الخريطة</button>
      </div>
      {place?.lat != null && <p className="text-[10px] text-emerald-300/70 font-bold mr-[4.5rem]">✓ محفوظ على الخريطة ({place.lat.toFixed(4)}, {place.lon?.toFixed(4)})</p>}
      {map && <MapPicker title={`حدّد ${label} على الخريطة`} start={place} onClose={() => setMap(false)}
        onPick={(p) => { onSave({ name: label, ...p }); setMap(false); }} />}
    </div>
  );
}

function loadMaps(): Promise<any> {
  const w = window as any;
  if (w.google?.maps?.Map) return Promise.resolve(w.google);
  return new Promise((res, rej) => {
    const cb = "__dcMapsReady";
    w[cb] = () => res(w.google);
    const sc = document.createElement("script");
    sc.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&v=weekly&libraries=places&language=ar&callback=${cb}`;
    sc.async = true;
    sc.onerror = () => rej(new Error("maps"));
    document.head.appendChild(sc);
  });
}

/** A full-screen Google map: search a place or tap the map, then "حفظ هذا المكان". */
function MapPicker({ title, start, onPick, onClose }: { title: string; start?: Place; onPick: (p: Place) => void; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(start?.lat != null ? { lat: start.lat, lon: start.lon! } : null);
  const [name, setName] = useState(start?.text ?? "");
  const [err, setErr] = useState("");
  useEffect(() => {
    let marker: any = null;
    loadMaps().then(g => {
      if (!box.current) return;
      const center = pos ? { lat: pos.lat, lng: pos.lon } : { lat: 17.02, lng: 54.09 };
      const map = new g.maps.Map(box.current, { center, zoom: pos ? 16 : 12, disableDefaultUI: true, zoomControl: true, gestureHandling: "greedy", mapTypeId: "hybrid" });
      const put = (lat: number, lng: number) => {
        if (!marker) marker = new g.maps.Marker({ map, position: { lat, lng }, draggable: true });
        else marker.setPosition({ lat, lng });
        setPos({ lat, lon: lng });
        marker.addListener?.("dragend", (e: any) => setPos({ lat: e.latLng.lat(), lon: e.latLng.lng() }));
      };
      if (pos) put(pos.lat, pos.lon);
      else navigator.geolocation?.getCurrentPosition(p => { map.setCenter({ lat: p.coords.latitude, lng: p.coords.longitude }); map.setZoom(16); }, () => {});
      map.addListener("click", (e: any) => { put(e.latLng.lat(), e.latLng.lng()); setName(""); });
      if (search.current && g.maps.places?.Autocomplete) {
        const ac = new g.maps.places.Autocomplete(search.current, { fields: ["geometry", "name", "formatted_address"] });
        ac.addListener("place_changed", () => {
          const pl = ac.getPlace();
          const loc = pl?.geometry?.location;
          if (!loc) return;
          map.setCenter(loc);
          map.setZoom(17);
          put(loc.lat(), loc.lng());
          setName(pl.name || pl.formatted_address || "");
        });
      }
    }).catch(() => setErr("تعذّر تحميل خرائط جوجل"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="fixed inset-0 z-[100010] bg-black/90 flex flex-col" dir="rtl">
      <div className="flex items-center gap-2 p-3">
        <span className="text-base font-black text-white shrink-0">{title}</span>
        <input ref={search} placeholder="ابحث عن مكان..." className="flex-1 min-w-0 h-11 px-4 rounded-full bg-white/10 border border-white/15 text-white text-sm font-bold" />
        <button onClick={onClose} className="h-11 px-4 rounded-full bg-white/10 text-white text-sm font-black">إلغاء</button>
      </div>
      <div ref={box} className="flex-1 mx-3 rounded-3xl overflow-hidden bg-zinc-900 flex items-center justify-center text-white/50 text-sm">{err || "جاري تحميل الخريطة..."}</div>
      <div className="flex items-center gap-3 p-3">
        <span className="flex-1 text-xs text-white/60 font-bold truncate">{pos ? `${name ? name + " · " : ""}${pos.lat.toFixed(5)}, ${pos.lon.toFixed(5)}` : "اضغط على الخريطة لتحديد المكان"}</span>
        <button disabled={!pos} onClick={() => pos && onPick({ lat: pos.lat, lon: pos.lon, text: name || "مكان محدد على الخريطة" })}
          className={cn("h-12 px-6 rounded-full text-sm font-black", pos ? "bg-emerald-500 text-black" : "bg-white/10 text-white/30")}>حفظ هذا المكان</button>
      </div>
    </div>
  );
}
