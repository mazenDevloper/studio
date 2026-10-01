"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ScannedForm } from "@/lib/html-scan";

const DEFAULT_URL = "https://www.mara.gov.om/arabic/calendar_page2.asp";
const SALALAH = /صلالة|salalah/i;

/** Test page: can we read Salalah prayer times from the Ministry of Awqaf calendar (mara.gov.om)? */
export default function PrayerTestPage() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [method, setMethod] = useState("get");
  const [body, setBody] = useState("");
  const [res, setRes] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showRows, setShowRows] = useState(false);

  const run = useCallback(async (u = url, m = method, b = body) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ url: u, method: m, body: b });
      const r = await fetch(`/api/prayer-test?${q}`, { cache: "no-store" });
      setRes(await r.json());
    } catch (e: any) {
      setRes({ error: e?.message || "failed" });
    } finally {
      setLoading(false);
    }
  }, [url, method, body]);

  useEffect(() => { run(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mn = res?.ministry;
  const al = res?.aladhan;

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10 space-y-6" dir="rtl">
      <header>
        <h1 className="text-3xl font-black flex items-center gap-3">اختبار مواقيت الصلاة — صلالة <Clock className="w-7 h-7 text-emerald-400" /></h1>
        <p className="text-white/50 text-sm mt-1">يقرأ صفحة وزارة الأوقاف (mara.gov.om) ويعرض ما فيها من نماذج وجداول، مع مواقيت مرجعية من Aladhan للمقارنة.</p>
      </header>

      <div className="flex flex-wrap gap-2" dir="ltr">
        <Input value={url} onChange={e => setUrl(e.target.value)} className="flex-1 min-w-[260px] bg-white/5 border-white/10" />
        <select value={method} onChange={e => setMethod(e.target.value)} className="bg-white/5 border border-white/10 rounded-md px-2 text-sm">
          <option value="get" className="bg-black">GET</option><option value="post" className="bg-black">POST</option>
        </select>
        <Input value={body} onChange={e => setBody(e.target.value)} placeholder="POST body: name=value&..." className="w-64 bg-white/5 border-white/10" />
        <Button onClick={() => run()} disabled={loading} className="bg-emerald-500 text-black hover:bg-emerald-400">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        </Button>
      </div>

      {res?.error && <Banner text={res.error} />}

      {/* Aladhan reference */}
      {al && (
        <section className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-2">
          <h2 className="font-black">مرجع Aladhan (صلالة، طريقة الخليج) {al.date && <span className="text-white/40 text-xs">{al.date}</span>}</h2>
          {al.ok ? (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center" dir="ltr">
              {[["الفجر", al.fajr], ["الشروق", al.sunrise], ["الظهر", al.dhuhr], ["العصر", al.asr], ["المغرب", al.maghrib], ["العشاء", al.isha]].map(([n, t]) => (
                <div key={n} className="rounded-2xl bg-black/40 p-3"><div className="text-xs text-white/50">{n}</div><div className="text-xl font-black tabular-nums">{t}</div></div>
              ))}
            </div>
          ) : <p className="text-red-300 text-sm">فشل: {al.error}</p>}
        </section>
      )}

      {/* Ministry page */}
      {mn && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2 text-[11px]" dir="ltr">
            <Chip ok={mn.ok} text={`HTTP ${mn.status || "—"}`} />
            <Chip ok text={`${mn.ms} ms`} />
            {mn.charset && <Chip ok text={`charset ${mn.charset}`} />}
            {mn.bytes !== undefined && <Chip ok text={`${mn.bytes} bytes`} />}
            {mn.error && <Chip ok={false} text={mn.error} />}
          </div>
          {res?.auto && <p className="text-xs text-emerald-300" dir="ltr">auto-submitted {res.auto.method} {res.auto.url} · {new URLSearchParams(res.auto.fields).toString()}</p>}
          {mn.title && <p className="text-sm text-white/70">العنوان: {mn.title}</p>}
          {mn.headings?.length > 0 && <p className="text-sm font-bold text-white">{mn.headings.join(" · ")}</p>}

          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
            <h2 className="font-black">صفوف تشبه مواقيت الصلاة: {mn.prayerRows?.length ?? 0}</h2>
            {mn.prayerRows?.length ? (
              <div className="overflow-auto max-h-[50vh]">
                <table className="w-full text-sm">
                  {mn.prayerHeader && <thead><tr>{mn.prayerHeader.map((c: string, i: number) => <th key={i} className="p-2 text-white/60 font-bold">{c}</th>)}</tr></thead>}
                  <tbody>{mn.prayerRows.map((r: string[], i: number) => <tr key={i} className={cn("border-t border-white/5", r.some(c => SALALAH.test(c)) && "bg-yellow-500/10")}>{r.map((c, j) => <td key={j} className="p-2 tabular-nums">{c}</td>)}</tr>)}</tbody>
                </table>
              </div>
            ) : <p className="text-white/40 text-sm">لا توجد صفوف بأوقات بعد. غالباً يجب اختيار المحافظة (صلالة) من النموذج أدناه ثم الإرسال.</p>}
          </div>

          {mn.forms?.map((f: ScannedForm, i: number) => <FormCard key={i} form={f} baseUrl={mn.finalUrl || url} onSubmit={(u, m, b) => { setUrl(u); setMethod(m); setBody(b); run(u, m, b); }} />)}

          {mn.links?.length > 0 && (
            <details className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <summary className="font-black cursor-pointer">الروابط في الصفحة ({mn.links.length}) — المميّزة تحتوي صلالة</summary>
              <ul className="mt-2 space-y-1 text-xs" dir="ltr">
                {mn.links.map((l: any, i: number) => (
                  <li key={i} className={cn("flex gap-2", SALALAH.test(l.text) && "text-yellow-300 font-bold")}>
                    <button className="underline" onClick={() => { const u = new URL(l.href, mn.finalUrl || url).toString(); setUrl(u); setMethod("get"); setBody(""); run(u, "get", ""); }}>{l.text || "(no text)"}</button>
                    <span className="text-white/30 truncate">{l.href}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {mn.rows?.length > 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <button className="font-black" onClick={() => setShowRows(v => !v)}>كل صفوف الجداول ({mn.rows.length}) {showRows ? "▲" : "▼"}</button>
              {showRows && <div className="mt-2 overflow-auto max-h-[50vh] text-xs space-y-1">{mn.rows.map((r: string[], i: number) => <div key={i} className="border-t border-white/5 py-1">{r.join(" | ")}</div>)}</div>}
            </div>
          )}

          {mn.text && <details className="rounded-3xl border border-white/10 bg-white/5 p-4"><summary className="font-black cursor-pointer">نص الصفحة</summary><p className="mt-2 text-xs text-white/60 leading-6">{mn.text}</p></details>}
        </section>
      )}
    </div>
  );
}

function FormCard({ form, baseUrl, onSubmit }: { form: ScannedForm; baseUrl: string; onSubmit: (url: string, method: string, body: string) => void }) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const f of form.fields) {
      // Pre-select Salalah wherever it appears
      const sal = f.options?.find(o => SALALAH.test(o.text));
      v[f.name] = sal ? sal.value : f.value;
    }
    return v;
  });
  const submit = () => {
    const qs = new URLSearchParams(values).toString();
    const action = new URL(form.action || baseUrl, baseUrl);
    if (form.method === "post") onSubmit(action.toString(), "post", qs);
    else { action.search = qs; onSubmit(action.toString(), "get", ""); }
  };
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-3">
      <h3 className="font-black text-sm" dir="ltr">form {form.method.toUpperCase()} → {form.action || "(same page)"}</h3>
      <div className="flex flex-wrap gap-3">
        {form.fields.filter(f => f.type !== "submit" && f.type !== "button").map(f => (
          <label key={f.name} className="flex flex-col gap-1 text-xs">
            <span className="text-white/50" dir="ltr">{f.name} ({f.type})</span>
            {f.options ? (
              <select value={values[f.name]} onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))} className="bg-black border border-white/10 rounded-md h-9 px-2 text-sm max-w-[16rem]">
                {f.options.map((o, i) => <option key={i} value={o.value}>{o.text}{SALALAH.test(o.text) ? " ★" : ""}</option>)}
              </select>
            ) : (
              <input value={values[f.name] ?? ""} onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))} className="bg-black border border-white/10 rounded-md h-9 px-2 text-sm" dir="ltr" />
            )}
          </label>
        ))}
      </div>
      <Button onClick={submit} className="bg-emerald-500 text-black hover:bg-emerald-400 h-9">إرسال النموذج</Button>
    </div>
  );
}

const Chip = ({ ok, text }: { ok: boolean; text: string }) => (
  <span className={cn("px-3 py-1 rounded-full border font-bold", ok ? "border-emerald-500/40 text-emerald-300" : "border-red-500/40 text-red-300")}>{text}</span>
);
const Banner = ({ text }: { text: string }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 text-sm font-bold"><AlertTriangle className="w-5 h-5" /> {text}</div>
);
