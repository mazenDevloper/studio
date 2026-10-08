"use client";

import { useEffect, useRef, useState } from "react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/constants";
import { hubSet } from "@/lib/native-app";
import { useMediaStore, type SavedPlace, type WeeklyTrip } from "@/lib/store";
import { cn } from "@/lib/utils";

const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
type Place = SavedPlace;

/**
 * Home / work and the weekly trips, in the site's settings (saved to the cloud like the rest): the phone plans each
 * trip near its time - route, the prayers on the way and the mosque for each. In the app they also reach the phone
 * at once (Hub "places" / "weeklyTrips").
 */
export function TripsSettings() {
  const places: Record<string, Place> = useMediaStore(s => s.places) || {};
  const trips: WeeklyTrip[] = useMediaStore(s => s.weeklyTrips) || [];
  const storeSetPlace = useMediaStore(s => s.setPlace);
  const storeSetTrips = useMediaStore(s => s.setWeeklyTrips);
  const setPlace = (key: string, p: Place) => { storeSetPlace(key, p); hubSet("places", { ...places, [key]: p }); };
  const removePlace = (key: string) => {
    const next = { ...places };
    delete next[key];
    useMediaStore.setState({ places: next });
    setTimeout(() => useMediaStore.getState().syncMasterBin(), 100);
    hubSet("places", next);
  };
  const nameOf = (key: string) => places[key]?.name || (key === "home" ? "البيت" : key === "work" ? "العمل" : "مكان");
  const here = (key: string) => navigator.geolocation?.getCurrentPosition(
    pos => setPlace(key, { name: nameOf(key), lat: pos.coords.latitude, lon: pos.coords.longitude, text: "موقعي المحفوظ" }),
    () => alert("تعذّر تحديد الموقع"), { enableHighAccuracy: true, timeout: 15000 });
  const setTrips = (t: WeeklyTrip[]) => { storeSetTrips(t); hubSet("weeklyTrips", t); };
  const update = (id: string, u: Partial<WeeklyTrip>) => setTrips(trips.map(t => (t.id === id ? { ...t, ...u } : t)));
  return (
    <section className="rounded-[2.5rem] bg-white/5 border border-white/10 p-6 md:p-8 space-y-4" dir="rtl">
      <p className="text-xl font-black text-white">🧭 أماكني ورحلاتي الأسبوعية</p>
      <p className="text-[11px] text-white/45 font-bold">يخطط الهاتف كل رحلة قرب وقتها: المسار، الصلوات التي تقع أثناء الطريق، وأقرب مسجد لكل صلاة. ويمكنك أيضاً أن تقول: «رحلتي إلى صلالة».</p>
      {["home", "work", ...Object.keys(places).filter(k => k !== "home" && k !== "work")].map(key => (
        <PlaceRow key={key} k={key} place={places[key]} onSave={p => setPlace(key, p)} onHere={() => here(key)}
          onRemove={key === "home" || key === "work" ? undefined : () => removePlace(key)} />
      ))}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setPlace("p" + Date.now(), { name: "" })}
          className="focusable no-focus-scale h-10 px-4 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-sm font-black">+ إضافة مكان</button>
        <button onClick={() => setPlace("m" + Date.now(), { name: "", mosque: true })}
          className="focusable no-focus-scale h-10 px-4 rounded-full bg-white/10 border border-white/10 text-white text-sm font-black">+ 🕌 إضافة مسجد</button>
      </div>
      <p className="text-[10px] text-white/40 font-bold">المساجد المحفوظة تظهر دائماً في جزيرة «أقرب مسجد» وفي خطة الرحلة، حتى لو لم تجدها الخرائط (مثل الجوامع الداخلية).</p>
      <GoogleKey />
      {trips.map(t => (
        <div key={t.id} className={cn("rounded-2xl border p-3 space-y-2", t.off ? "border-white/5 opacity-60" : "border-white/10 bg-white/5")}>
          <div className="flex flex-wrap items-center gap-2">
            <input type="time" value={t.time} onChange={e => update(t.id, { time: e.target.value })}
              className="h-9 px-3 rounded-full bg-black/40 border border-white/10 text-white text-sm font-black" />
            <span className="text-xs text-white/50 font-bold">إلى</span>
            <select value={t.to in places || ["home", "work"].includes(t.to) ? t.to : "other"} onChange={e => update(t.id, { to: e.target.value === "other" ? "" : e.target.value })}
              className="h-9 px-3 rounded-full bg-black/40 border border-white/10 text-white text-sm font-bold">
              <option value="work">العمل</option><option value="home">البيت</option>
              {Object.keys(places).filter(k => k !== "home" && k !== "work").map(k => <option key={k} value={k}>{nameOf(k)}</option>)}
              <option value="other">مكان آخر…</option>
            </select>
            {!(t.to in places) && !["home", "work"].includes(t.to) && (
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
    </section>
  );
}

/** One saved place: type an address and press "حفظ", take the current position, or pick it on the map. */
function PlaceRow({ k, place, onSave, onHere, onRemove }: { k: string; place?: Place; onSave: (p: Place) => void; onHere: () => void; onRemove?: () => void }) {
  const custom = k !== "home" && k !== "work";
  const [name, setName] = useState(place?.name ?? "");
  useEffect(() => { setName(place?.name ?? ""); }, [place?.name]);
  const label = custom ? (name.trim() || "مكان") : k === "home" ? "البيت" : "العمل";
  const [text, setText] = useState(place?.text ?? "");
  const [map, setMap] = useState(false);
  useEffect(() => { setText(place?.text ?? ""); }, [place?.text]);
  const dirty = text.trim() !== (place?.text ?? "") || (custom && name.trim() !== (place?.name ?? ""));
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        {custom
          ? <input value={name} placeholder="اسم المكان (مثل: الجامعة)" onChange={e => setName(e.target.value)}
              className="w-36 h-10 px-3 rounded-full bg-white/10 border border-emerald-400/30 text-white text-sm font-black shrink-0" />
          : <span className="w-16 text-sm font-black text-white/70 shrink-0">{k === "home" ? "🏠" : "🏢"} {label}</span>}
        <input value={text} placeholder="العنوان أو اسم المكان" onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && text.trim()) onSave({ ...place, name: label, text: text.trim() }); }}
          className="flex-1 min-w-[10rem] h-10 px-4 rounded-full bg-white/5 border border-white/10 text-white text-sm font-bold focusable" />
        <button onClick={() => onSave({ ...place, name: label, text: text.trim() || place?.text })} disabled={!dirty}
          className={cn("focusable no-focus-scale h-10 px-4 rounded-full text-xs font-black shrink-0", dirty ? "bg-emerald-500 text-black" : "bg-white/5 text-white/30")}>حفظ</button>
        <button onClick={onHere} className="focusable no-focus-scale h-10 px-3 rounded-full bg-white/10 text-xs font-black text-white shrink-0">📍 موقعي الآن</button>
        <button onClick={() => setMap(true)} className="focusable no-focus-scale h-10 px-3 rounded-full bg-white/10 text-xs font-black text-white shrink-0">🗺 من الخريطة</button>
        {custom && <button onClick={() => onSave({ ...place, name: label, mosque: !place?.mosque })}
          className={cn("focusable no-focus-scale h-10 px-3 rounded-full text-xs font-black shrink-0", place?.mosque ? "bg-emerald-500 text-black" : "bg-white/10 text-white")}>🕌 {place?.mosque ? "مسجد ✓" : "مسجد؟"}</button>}
        {onRemove && <button onClick={onRemove} className="focusable no-focus-scale h-10 px-3 rounded-full bg-red-600/40 text-xs font-black text-white shrink-0">حذف</button>}
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

/**
 * Your own Google Maps key (optional): the site's key may be limited to the website; a key of yours with the
 * "Places API (New)" and "Routes API" switched on gives the phone Google's mosques and routes.
 */
function GoogleKey() {
  const ms = useMediaStore(s => s.mapSettings);
  const updateMapSettings = useMediaStore(s => s.updateMapSettings);
  const [k, setK] = useState(ms?.googleKey ?? "");
  const save = () => { updateMapSettings({ googleKey: k.trim() }); hubSet("googleKey", k.trim()); setTimeout(() => useMediaStore.getState().syncMasterBin(), 200); };
  return (
    <details className="rounded-2xl border border-white/10 p-3">
      <summary className="text-xs font-black text-white/60 cursor-pointer">مفتاح خرائط جوجل (اختياري - لنتائج أدق من OpenStreetMap)</summary>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <input value={k} onChange={e => setK(e.target.value)} placeholder="AIza..." dir="ltr"
          className="flex-1 min-w-[12rem] h-10 px-4 rounded-full bg-black/40 border border-white/10 text-white text-xs font-mono" />
        <button onClick={save} className="h-10 px-4 rounded-full bg-emerald-500 text-black text-xs font-black">حفظ</button>
      </div>
      <p className="text-[10px] text-white/40 font-bold mt-2 leading-5">من Google Cloud Console: أنشئ مفتاحاً، فعّل عليه «Places API (New)» و«Routes API» و«Maps JavaScript API» و«Places API»، واتركه بلا تقييد أو قيّده بتطبيقات Android. بدونه يجرّب التطبيق مفتاح الموقع ثم OpenStreetMap.</p>
    </details>
  );
}
