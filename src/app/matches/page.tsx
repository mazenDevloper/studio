"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Trophy, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { omanDateLabel } from "@/lib/oman-time";
import type { TopMatch, TopMatchesResult } from "@/lib/top-matches";

/** Fetch test for /api/matches: today's most important matches, kick-off in Oman time (GMT+4). */
export default function MatchesTestPage() {
  const [data, setData] = useState<TopMatchesResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [ms, setMs] = useState<number | null>(null);
  const [showJson, setShowJson] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const t0 = performance.now();
    try {
      const res = await fetch("/api/matches?limit=10", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Failed to fetch");
    } finally {
      setMs(Math.round(performance.now() - t0));
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10 space-y-6" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">أهم مباريات اليوم <Trophy className="w-8 h-8 text-yellow-400" /></h1>
          <p className="text-white/50 text-sm mt-1">{omanDateLabel()} · التوقيت: عُمان (GMT+4)</p>
        </div>
        <div className="flex items-center gap-3">
          {ms !== null && <span className="text-xs text-white/40" dir="ltr">{ms} ms</span>}
          <Button variant="outline" onClick={() => setShowJson(v => !v)} className="rounded-full bg-white/5 border-white/10">JSON</Button>
          <Button onClick={load} disabled={loading} className="rounded-full bg-emerald-500 text-black hover:bg-emerald-400">
            <RefreshCw className={cn("w-4 h-4 ml-2", loading && "animate-spin")} /> تحديث
          </Button>
        </div>
      </header>

      {loading && !data && <div className="py-24 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-emerald-500" /></div>}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-300 text-sm font-bold">
          <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      {data && !error && (
        <>
          <p className="text-xs text-white/40">{data.matches.length} من أصل {data.total} مباراة · {data.date} · المصدر: {data.source}</p>
          <div className="flex flex-wrap gap-2" dir="ltr">
            {data.attempts.map(a => (
              <span key={a.source} title={a.error} className={cn("text-[10px] font-bold px-3 py-1 rounded-full border", a.ok ? "border-emerald-500/40 text-emerald-300" : "border-red-500/40 text-red-300")}>
                {a.source}{a.kind === "open" ? " ◈" : ""} · {a.ok ? `${a.important}/${a.total}` : "failed"} · {a.ms}ms
              </span>
            ))}
          </div>
          {data.matches.length === 0 ? (
            <div className="py-20 text-center text-white/30 font-bold">لا توجد مباريات مهمة اليوم</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {data.matches.map(m => <MatchCard key={m.id} m={m} />)}
            </div>
          )}
        </>
      )}

      {showJson && data && <pre dir="ltr" className="text-[11px] text-white/60 bg-white/5 rounded-2xl p-4 overflow-auto max-h-[50vh]">{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}

function MatchCard({ m }: { m: TopMatch }) {
  const live = m.status === "live";
  const started = m.status !== "upcoming";
  return (
    <div className={cn("rounded-3xl border p-4 bg-white/5", live ? "border-red-500/50" : "border-white/10")}>
      <div className="flex items-center justify-between text-[11px] text-white/50 mb-3">
        <span className="flex items-center gap-2 min-w-0">
          {m.league.logo && <img src={m.league.logo} alt="" className="w-4 h-4 object-contain" />}
          <span className="truncate">{m.league.name}</span>
        </span>
        <span className={cn("font-black shrink-0", live ? "text-red-400" : m.status === "finished" ? "text-white/40" : "text-emerald-400")}>
          {live ? `مباشر ${m.elapsed ?? ""}'` : m.status === "finished" ? "انتهت" : "قريباً"}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Team name={m.home.name} logo={m.home.logo} />
        <div className="text-center min-w-[72px]">
          {started
            ? <div className="text-2xl font-black tabular-nums" dir="ltr">{m.score.home ?? 0} - {m.score.away ?? 0}</div>
            : <div className="text-2xl font-black tabular-nums text-emerald-400" dir="ltr">{m.omanTime}</div>}
          <div className="text-[10px] text-white/40 mt-1" dir="ltr">{m.omanTime} عُمان</div>
        </div>
        <Team name={m.away.name} logo={m.away.logo} />
      </div>
      {m.channels.length > 0 && <div className="mt-3 text-center text-[10px] text-white/40" dir="ltr">📺 {m.channels.join(" · ")}</div>}
    </div>
  );
}

function Team({ name, logo }: { name: string; logo?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 min-w-0">
      {logo ? <img src={logo} alt="" className="w-12 h-12 object-contain" loading="lazy" /> : <div className="w-12 h-12 rounded-full bg-white/10" />}
      <span className="text-xs font-black text-center truncate w-full" dir="ltr">{name}</span>
    </div>
  );
}
