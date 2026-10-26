"use client";

/**
 * «المركز» — DriveCast ⇄ Madar: the devices online, continue watching from any place, suggestions for this hour,
 * Madar's scenes / notes / plan / body / summaries / articles (read aloud in the car), a remote for Madar and the
 * watching statistics. Everything is prepared by the server's hub; this page only draws it.
 */
import { useEffect, useState } from "react";
import { hub, HUB, HubItem, KIND_AR, fmtTime, myDevice, setMyDevice } from "@/lib/hub";
import { openHubItem, listenArticle, speakAll, sendPlayingTo } from "@/components/hub/hub-bridge";
import { useMediaStore } from "@/lib/store";
import { DeviceCard, act } from "@/components/hub/device-card";
import { saveProfile, applyProfile, profileOf } from "@/lib/profiles";

const card = "rounded-3xl bg-white/5 border border-white/10 p-4";
const chip = "rounded-full px-4 py-2 text-sm font-bold transition-colors";

export default function HubPage() {
  const [, force] = useState(0);
  const [sug, setSug] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [today, setToday] = useState<any[]>([]);
  const me = myDevice();
  useEffect(() => {
    hub.start();
    const off = hub.on(() => force(x => x + 1));
    const place = me.kind === "car" ? "car" : "room";
    fetch(HUB + "/suggest?place=" + place).then(r => r.json()).then(setSug).catch(() => {});
    fetch(HUB + "/state").then(r => r.json()).then(d => setStats(d.state?.stats || null)).catch(() => {});
    const loadToday = () => fetch(HUB + "/today").then(r => r.json()).then(d => setToday(d.items || [])).catch(() => {});
    loadToday(); const tt = setInterval(loadToday, 60000);
    return () => { off(); clearInterval(tt); };
  }, []);
  const st = hub.state, madar = hub.madar(), others = hub.others();
  const resume = Object.values(st.resume || {}).sort((a, b) => (b.at || 0) - (a.at || 0));
  const toMadar = (msg: any) => { if (!madar.length) return alert("مدار غير متصل الآن"); madar.forEach(d => hub.sendTo(d.id, msg)); };
  const Thumb = ({ it }: { it: HubItem }) => it.thumb ? <img src={it.thumb} alt="" className="w-full aspect-video object-cover rounded-2xl" /> : <div className="w-full aspect-video rounded-2xl bg-black/40 grid place-items-center text-3xl">▶</div>;
  // one video per device: the latest thing each place played (online devices first, even with nothing yet)
  const lastBy = new Map<string, HubItem>();
  for (const it of resume) { const id = it.from?.id; if (id && !lastBy.has(id)) lastBy.set(id, it); }
  const devIds = [...new Set([...hub.devices.map(d => d.id), ...lastBy.keys()])];
  const devCards = devIds.map(id => {
    const live = hub.devices.find(d => d.id === id), it = lastBy.get(id);
    const dev = live || (it?.from as any) || { id, name: id, kind: "phone", app: "drivecast" };
    return { dev, it, online: !!live, playing: !!it && Date.now() - (it.at || 0) < 45000 };
  }).filter(c => (c.it || c.online) && c.dev.app !== "madar" && (c.dev.kind === "tv" || c.dev.kind === "car"))
    .sort((a, b) => (a.dev.kind === "tv" ? 0 : 1) - (b.dev.kind === "tv" ? 0 : 1) || ((b.it?.at || 0) - (a.it?.at || 0)))
    .filter((c, i, l) => l.findIndex(x => x.dev.kind === c.dev.kind) === i);   // one TV, then one car
  const icon = (d: any) => d.app === "madar" ? "🥽" : d.kind === "car" ? "🚗" : d.kind === "tv" ? "📺" : d.kind === "computer" ? "💻" : "📱";
  const ago = (t?: number) => { if (!t) return ""; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "الآن" : m < 60 ? "قبل " + m + " د" : m < 1440 ? "قبل " + Math.round(m / 60) + " س" : "قبل " + Math.round(m / 1440) + " يوم"; };
  const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const week = [...Array(7)].map((_, i) => { const d = new Date(Date.now() + 4 * 3600e3 - (6 - i) * 864e5), k = d.toISOString().slice(0, 10); return { day: k, label: DAYS[d.getUTCDay()].slice(0, 3), car: stats?.total?.[k + ":car"] || 0, room: stats?.total?.[k + ":room"] || 0 }; });
  const weekMax = Math.max(10, ...week.map(d => d.car + d.room));
  const topItems = stats?.items ? Object.values(stats.items).sort((a: any, b: any) => b.m - a.m).slice(0, 6) : [];

  return (
    <div dir="rtl" className="h-full overflow-y-auto p-4 md:p-8 space-y-6 text-white pb-40">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-black">المركز</h1>
        <span className={"text-sm " + (hub.online ? "text-emerald-400" : "text-white/40")}>{hub.online ? "● متصل" : "○ غير متصل"}</span>
        <span className="text-white/50 text-sm">DriveCast ⇄ مدار</span>
      </header>

      <section className={card}>
        <h2 className="font-black mb-3">هذا الجهاز</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input defaultValue={me.name} onBlur={e => { const v = e.target.value.trim(); if (v && v !== me.name) { setMyDevice({ name: v }); force(x => x + 1); } }} className="rounded-2xl bg-black/40 border border-white/10 px-3 py-2 text-white min-w-[12rem]" aria-label="اسم الجهاز" />
          {(["car", "tv", "phone", "tablet", "computer"] as const).map(k => (
            <button key={k} className={chip + (me.kind === k ? " bg-sky-500 text-black" : " bg-white/10")} onClick={() => { setMyDevice({ kind: k, name: "DriveCast · " + KIND_AR[k] }); force(x => x + 1); }}>{KIND_AR[k]}</button>
          ))}
        </div>
        {/* this device's own settings (size, dock side, what happens at the end of a video, start page) */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-white/60">ملف هذا الجهاز:</span>
          <button className={chip + " bg-emerald-600"} onClick={() => { saveProfile(me.id); force(x => x + 1); }}>💾 احفظ إعداداته الحالية</button>
          {profileOf(me.id) && <button className={chip + " bg-white/10"} onClick={() => applyProfile(me.id)}>↺ استرجعها</button>}
          <select className="rounded-full bg-white/10 px-3 py-2" defaultValue={profileOf(me.id)?.start || ""} onChange={e => { saveProfile(me.id, { start: e.target.value }); force(x => x + 1); }}>
            <option value="">يفتح على: آخر صفحة</option><option value="/car-dashboard">لوحة السيارة</option><option value="/">الرئيسية</option><option value="/hub">المركز</option><option value="/hihi2">المباريات</option>
          </select>
          {profileOf(me.id) && <span className="text-xs text-emerald-400">✓ يُطبَّق تلقائياً عند فتح DriveCast على هذا الجهاز</span>}
        </div>
      </section>

      {/* «اليوم»: matches of your teams, prayers, reminders and Madar's plan - the same list on every screen */}
      {today.length > 0 && (
        <section>
          <h2 className="text-xl font-black mb-3">🗓 يومك</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
            {today.map((x, i) => {
              const t = new Date(x.at).toLocaleTimeString("ar-OM", { hour: "numeric", minute: "2-digit" });
              const ic = ({ match: "⚽", azan: "🕌", iqamah: "🕋", reminder: "⏰", plan: "💪", timer: "⏱" } as any)[x.kind] || "•";
              return (
                <div key={i} className={"snap-start shrink-0 w-56 rounded-3xl p-4 border backdrop-blur-xl " + (x.live ? "bg-rose-600/20 border-rose-500/50" : "bg-white/[0.05] border-white/10")}>
                  <div className="flex items-center justify-between text-xs text-white/60"><span>{ic} {x.live ? "مباشر" : t}</span>{x.logos?.length ? <span className="flex gap-1">{x.logos.slice(0, 2).map((l: string) => <img key={l} src={l} alt="" className="w-5 h-5 object-contain" />)}</span> : null}</div>
                  <div className="mt-2 font-black leading-snug line-clamp-2">{x.title}</div>
                  {x.sub && <div className="mt-1 text-xs text-white/60 truncate">{x.sub}</div>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* every place: what it plays now (one video per device), and what you can do with it */}
      <section>
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h2 className="text-xl font-black">📡 أجهزتك الآن</h2>
          <div className="flex gap-2">
            <button className={chip + " bg-white/10"} onClick={() => { if (!others.length) return; others.forEach(d => sendPlayingTo(d.id)); }}>👥 شغّل ما يعمل هنا على الكل</button>
            <button className={chip + " bg-white/10"} onClick={() => { const t = prompt("رسالة تُقرأ بصوت على كل الأجهزة:"); if (t) hub.sendTo("all", { type: "say", text: t }); }}>📢 إعلان للكل</button>
          </div>
        </div>
        {devCards.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {devCards.map(({ dev, it, online, playing }) => (
              <DeviceCard key={dev.id} dev={dev} it={it} online={online} playing={playing} onOpen={() => it && openHubItem(it)} actions={<>
                {it && <button className={act + " !bg-rose-600 hover:!bg-rose-500"} onClick={() => openHubItem(it)}>▶ أكمل هنا</button>}
                {it && madar.length > 0 && dev.app !== "madar" && <button className={act + " !bg-violet-600"} onClick={() => toMadar({ type: "open", item: it, now: true })}>🥽 في مدار</button>}
                {online && dev.id !== me.id && <>
                  <button className={act + " !bg-sky-600"} onClick={() => { if (!sendPlayingTo(dev.id)) alert("لا شيء يعمل هنا الآن"); }}>📤 أرسل</button>
                  <button className={act} onClick={() => { if (sendPlayingTo(dev.id)) useMediaStore.getState().setIsPlaying(false); }}>⇄ انقل</button>
                  <button className={act} onClick={() => hub.sendTo(dev.id, { type: "control", action: "toggle" })}>⏯</button>
                  <button className={act} onClick={() => hub.sendTo(dev.id, { type: "control", action: "next" })}>⏭</button>
                  <button className={act} onClick={() => { const m = prompt("إيقاف بعد كم دقيقة؟", "30"); if (m) hub.sendTo(dev.id, { type: "sleep", minutes: +m }); }}>😴</button>
                  <button className={act} onClick={() => hub.sendTo(dev.id, { type: "ping" })}>🔔</button>
                  <button className={act} onClick={() => { const t = prompt("رسالة تُقرأ بصوت على " + dev.name + ":"); if (t) hub.sendTo(dev.id, { type: "say", text: t }); }}>💬</button>
                </>}
                {it && <button className={act + " opacity-60"} onClick={() => { const r = { ...(st.resume || {}) }; delete r[it.id]; hub.op({ op: "set", key: "resume", value: r }); }}>✕</button>}
              </>} />
            ))}
          </div>
        ) : <p className="text-white/40">ما تشاهده في مدار أو السيارة أو التلفاز يظهر هنا لتكمله في أي مكان.</p>}
      </section>

      {/* the week, car vs home */}
      {week.some(d => d.car + d.room > 0) && (
        <section className={card}>
          <h2 className="font-black mb-3">📊 أسبوعك: السيارة والبيت (دقائق)</h2>
          <div className="flex items-end gap-2 h-32">
            {week.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end h-24">
                  <div className="bg-sky-500 rounded-t" style={{ height: (d.room / weekMax * 100) + "%" }} title={"البيت " + Math.round(d.room)} />
                  <div className="bg-amber-500" style={{ height: (d.car / weekMax * 100) + "%" }} title={"السيارة " + Math.round(d.car)} />
                </div>
                <span className="text-[10px] text-white/50">{d.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/50 mt-2"><span className="text-amber-400">■</span> السيارة · <span className="text-sky-400">■</span> البيت</p>
        </section>
      )}

      {(st.inbox || []).length > 0 && (
        <section className={card}>
          <h2 className="font-black mb-3">🕒 محفوظ لوقت لاحق</h2>
          {(st.inbox || []).slice(0, 12).map((x, i) => (
            <div key={x.id + i} className="flex items-center justify-between py-2 border-b border-white/5 gap-2">
              <span className="truncate">{({ yt: "▶", web: "🌐", pdf: "📕", image: "🖼", map: "📍", text: "🗒", video: "🎞" } as any)[x.kind] || "•"} {x.title || x.url || x.text}</span>
              <div className="flex gap-2 shrink-0">
                <button className="text-xs rounded-full bg-sky-600 px-3 py-1" onClick={() => openHubItem(x)}>هنا</button>
                {madar.length > 0 && <button className="text-xs rounded-full bg-violet-600 px-3 py-1" onClick={() => toMadar({ type: "open", item: x, now: true })}>مدار</button>}
                <button className="text-xs rounded-full bg-white/10 px-2 py-1" onClick={() => hub.op({ op: "set", key: "inbox", value: (st.inbox || []).filter(y => y !== x) })}>✕</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {sug?.items?.length > 0 && (
        <section>
          <h2 className="text-xl font-black mb-3">✨ مقترح لك الآن ({me.kind === "car" ? "في السيارة" : "في البيت"})</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {sug.items.map((it: HubItem) => (
              <button key={it.id} className="w-56 shrink-0 text-right" onClick={() => openHubItem(it)}><Thumb it={it} /><div className="text-sm font-bold truncate mt-1">{it.title}</div></button>
            ))}
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <section className={card}>
          <h2 className="font-black mb-3">🎬 مشاهد مدار</h2>
          {(st.scenes || []).length ? (st.scenes || []).map(s => (
            <div key={s.name} className="flex items-center justify-between py-2 border-b border-white/5">
              <span>{s.name} <span className="text-white/40 text-sm">({s.count} نوافذ)</span></span>
              <div className="flex gap-2">
                {s.media?.[0] && <button className="text-xs rounded-full bg-white/10 px-3 py-1" onClick={() => openHubItem({ id: s.media![0].url, kind: /youtu/.test(s.media![0].url) ? "web" : "iptv", url: s.media![0].url, title: s.media![0].title })}>شغّل هنا</button>}
                <button className="text-xs rounded-full bg-violet-600 px-3 py-1" onClick={() => toMadar({ type: "scene", name: s.name })}>افتح في مدار</button>
              </div>
            </div>
          )) : <p className="text-white/40 text-sm">قل في مدار «احفظ المشهد العمل» ليظهر هنا.</p>}
        </section>

        <section className={card}>
          <h2 className="font-black mb-3">🎧 استمع في الطريق</h2>
          {[...(st.briefs || []).map(b => ({ ...b, brief: true })), ...(st.articles || [])].slice(0, 10).map((a: any) => (
            <div key={(a.brief ? "b" : "a") + a.id} className="flex items-center justify-between py-2 border-b border-white/5 gap-2">
              <span className="truncate">{a.brief ? "📝 ملخص: " : "📖 "}{a.title || a.url}</span>
              <button className="shrink-0 text-xs rounded-full bg-emerald-600 px-3 py-1" onClick={() => a.brief ? speakAll([a.title, ...(a.lines || [])]) : listenArticle(a.url, a.title)}>استمع</button>
            </div>
          ))}
          {!(st.briefs || []).length && !(st.articles || []).length && <p className="text-white/40 text-sm">المقالات التي تقرؤها في مدار والملخصات تُقرأ لك هنا بصوت.</p>}
          <button className="mt-3 text-xs rounded-full bg-white/10 px-3 py-1" onClick={() => speechSynthesis.cancel()}>إيقاف القراءة</button>
        </section>

        <section className={card}>
          <h2 className="font-black mb-3">💪 صحتك من مدار</h2>
          {st.plan?.today && <p className="mb-2">{st.plan.today}</p>}
          {st.body?.last ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[["الوزن", "weight", "kg"], ["الدهون", "bodyFat", "%"], ["العضلات", "muscle", "kg"]].map(([l, k, u]) => (
                <div key={k} className="rounded-2xl bg-white/5 p-2"><div className="text-xs text-white/50">{l}</div><div className="text-xl font-black" dir="ltr">{st.body!.last![k] ?? "—"}<span className="text-xs text-white/50"> {u}</span></div>
                  {st.body!.prev?.[k] != null && st.body!.last![k] != null && <div className="text-[10px] text-white/50" dir="ltr">{(st.body!.last![k] - st.body!.prev![k]) > 0 ? "▲" : "▼"} {Math.abs(st.body!.last![k] - st.body!.prev![k]).toFixed(1)}</div>}
                </div>
              ))}
            </div>
          ) : <p className="text-white/40 text-sm">صوّر شاشة الميزان في «جسمي» بمدار 2D.</p>}
          {(st.workouts || []).length > 0 && <p className="mt-2 text-sm text-white/70">تمارين اليوم: {(st.workouts || []).filter((w: any) => new Date(w.at).toDateString() === new Date().toDateString()).length}</p>}
        </section>

        <section className={card}>
          <h2 className="font-black mb-3">🗒 ملاحظات مدار</h2>
          {(st.notes || []).length ? (st.notes || []).map(n => <p key={n.id} className="py-1 border-b border-white/5">{n.text}</p>) : <p className="text-white/40 text-sm">الملاحظات اللاصقة في غرفتك تظهر هنا.</p>}
          {(st.ai || []).slice(0, 3).map((a, i) => <p key={i} className="text-sm text-white/60 mt-2">✨ {a.q} — {a.a}</p>)}
        </section>

        <section className={card}>
          <h2 className="font-black mb-3">🎛 ريموت مدار</h2>
          <div className="grid grid-cols-3 gap-2">
            {[["⏯", "toggle"], ["−10ث", "seek", -10], ["+10ث", "seek", 10], ["🔉", "vol-"], ["🔊", "vol+"]].map(([l, a, v]) => (
              <button key={String(l)} className="rounded-2xl bg-white/10 py-3 text-xl" onClick={() => toMadar({ type: "control", action: a, value: v })}>{l}</button>
            ))}
          </div>
        </section>

        <section className={card}>
          <h2 className="font-black mb-3">📊 وقت المشاهدة</h2>
          <p className="text-sm">اليوم: في السيارة {Math.round(sug?.today?.car || 0)} د · في البيت {Math.round(sug?.today?.room || 0)} د</p>
          {topItems.map((it: any) => <p key={it.id} className="text-sm text-white/70 truncate">• {it.title || it.id} — {Math.round(it.m)} د</p>)}
        </section>
      </div>
    </div>
  );
}
