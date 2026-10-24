"use client";

/**
 * «المركز» — DriveCast ⇄ Madar: the devices online, continue watching from any place, suggestions for this hour,
 * Madar's scenes / notes / plan / body / summaries / articles (read aloud in the car), a remote for Madar and the
 * watching statistics. Everything is prepared by the server's hub; this page only draws it.
 */
import { useEffect, useState } from "react";
import { hub, HUB, HubItem, KIND_AR, fmtTime, myDevice, setMyDevice } from "@/lib/hub";
import { openHubItem, listenArticle, speakAll, sendPlayingTo } from "@/components/hub/hub-bridge";

const card = "rounded-3xl bg-white/5 border border-white/10 p-4";
const chip = "rounded-full px-4 py-2 text-sm font-bold transition-colors";

export default function HubPage() {
  const [, force] = useState(0);
  const [sug, setSug] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const me = myDevice();
  useEffect(() => {
    hub.start();
    const off = hub.on(() => force(x => x + 1));
    const place = me.kind === "car" ? "car" : "room";
    fetch(HUB + "/suggest?place=" + place).then(r => r.json()).then(setSug).catch(() => {});
    fetch(HUB + "/state").then(r => r.json()).then(d => setStats(d.state?.stats || null)).catch(() => {});
    return () => { off(); };
  }, []);
  const st = hub.state, madar = hub.madar(), others = hub.others();
  const resume = Object.values(st.resume || {}).sort((a, b) => (b.at || 0) - (a.at || 0));
  const toMadar = (msg: any) => { if (!madar.length) return alert("مدار غير متصل الآن"); madar.forEach(d => hub.sendTo(d.id, msg)); };
  const Thumb = ({ it }: { it: HubItem }) => it.thumb ? <img src={it.thumb} alt="" className="w-full aspect-video object-cover rounded-2xl" /> : <div className="w-full aspect-video rounded-2xl bg-black/40 grid place-items-center text-3xl">▶</div>;
  const topItems = stats?.items ? Object.values(stats.items).sort((a: any, b: any) => b.m - a.m).slice(0, 6) : [];

  return (
    <div dir="rtl" className="h-full overflow-y-auto p-4 md:p-8 space-y-6 text-white pb-40">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-black">المركز</h1>
        <span className={"text-sm " + (hub.online ? "text-emerald-400" : "text-white/40")}>{hub.online ? "● متصل" : "○ غير متصل"}</span>
        <span className="text-white/50 text-sm">DriveCast ⇄ مدار</span>
      </header>

      <section className={card}>
        <h2 className="font-black mb-3">هذا الجهاز: {me.name}</h2>
        <div className="flex flex-wrap gap-2">
          {(["car", "tv", "phone", "tablet", "computer"] as const).map(k => (
            <button key={k} className={chip + (me.kind === k ? " bg-sky-500 text-black" : " bg-white/10")} onClick={() => { setMyDevice({ kind: k }); force(x => x + 1); }}>{KIND_AR[k]}</button>
          ))}
        </div>
        <h3 className="font-bold mt-4 mb-2 text-white/70">الأجهزة المتصلة الآن</h3>
        <div className="flex flex-wrap gap-2">
          {others.length ? others.map(d => (
            <div key={d.id} className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2">
              <span>{d.app === "madar" ? "🥽" : d.kind === "car" ? "🚗" : d.kind === "tv" ? "📺" : "📱"} {d.name}</span>
              <button className="text-xs rounded-full bg-sky-600 px-2 py-1" onClick={() => { if (!sendPlayingTo(d.id)) alert("لا شيء يعمل هنا الآن"); }}>أرسل ما يعمل</button>
            </div>
          )) : <span className="text-white/40">لا أجهزة أخرى — افتح مدار أو DriveCast على جهاز آخر</span>}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-black mb-3">▶ تابع المشاهدة — من كل الأماكن</h2>
        {resume.length ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {resume.slice(0, 12).map(it => (
              <div key={it.id} className={card + " p-2 space-y-2"}>
                <button className="w-full text-right" onClick={() => openHubItem(it)}>
                  <Thumb it={it} />
                  {it.dur ? <div className="h-1 bg-white/20 rounded mt-1"><div className="h-1 bg-rose-500 rounded" style={{ width: Math.min(100, (it.t || 0) / it.dur * 100) + "%" }} /></div> : null}
                  <div className="font-bold text-sm truncate mt-1">{it.title || it.id}</div>
                  <div className="text-xs text-white/50">{it.from?.name || ""} · {fmtTime(it.t)}</div>
                </button>
                {madar.length > 0 && <button className="w-full text-xs rounded-full bg-violet-600 py-1" onClick={() => toMadar({ type: "open", item: it, now: true })}>🥽 في مدار</button>}
              </div>
            ))}
          </div>
        ) : <p className="text-white/40">ما تشاهده في مدار أو السيارة أو التلفاز يظهر هنا لتكمله في أي مكان.</p>}
      </section>

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
