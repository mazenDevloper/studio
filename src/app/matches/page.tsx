"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Trophy, AlertTriangle, Star, PartyPopper, Pin } from "lucide-react";
import { useLiveMatches, useLiveMatchesStore } from "@/lib/live-matches";
import type { MatchDetails } from "@/lib/match-details";
import { sameTeam } from "@/lib/match-core";
import { useMediaStore } from "@/lib/store";
import { GOAL_TEST_EVENT } from "@/components/football/goal-celebration";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { omanDateLabel } from "@/lib/oman-time";
import type { TopMatch } from "@/lib/top-matches";

/** Today's most important matches, kick-off in Oman time (GMT+4). Auto-refreshes every 30s from the shared live feed. */
export default function MatchesTestPage() {
  const { favoriteTeams } = useMediaStore();
  const favoriteNames = useMemo(() => (favoriteTeams || []).map(t => t?.name).filter(Boolean) as string[], [favoriteTeams]);
  const { data, error, loading, updatedAt, refresh } = useLiveMatches(favoriteNames);
  const [showJson, setShowJson] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 5000); return () => clearInterval(t); }, []);
  const ago = updatedAt ? Math.round((Date.now() - updatedAt) / 1000) : null;
  const load = refresh;

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10 space-y-6" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">أهم مباريات اليوم <Trophy className="w-8 h-8 text-yellow-400" /></h1>
          <p className="text-white/50 text-sm mt-1">{omanDateLabel()} · التوقيت: عُمان (GMT+4)</p>
        </div>
        <div className="flex items-center gap-3">
          {ago !== null && <span className="text-xs text-white/40">تحديث تلقائي · منذ {ago} ث</span>}
          <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent(GOAL_TEST_EVENT))} className="rounded-full bg-white/5 border-white/10"><PartyPopper className="w-4 h-4 ml-2" /> اختبار الهدف</Button>
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

      {data && (
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
  const pinned = useMediaStore(s => s.pinnedMatches) || [];
  const togglePin = useMediaStore(s => s.togglePinnedMatch);
  const isPinned = pinned.some(p => p.id === m.id || (sameTeam(p.home, m.home.name) && sameTeam(p.away, m.away.name)));
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<MatchDetails | null>(null);
  const [detailsError, setDetailsError] = useState("");
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadDetails = async () => {
    setLoadingDetails(true); setDetailsError("");
    try {
      const q = new URLSearchParams({ id: m.id, league: m.league.id, homeId: m.home.id });
      const r = await fetch(`/api/matches/details?${q}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setDetails(j);
    } catch (e: any) { setDetailsError(e?.message || "failed"); } finally { setLoadingDetails(false); }
  };
  // refresh scorers while the card is open and the score changes
  useEffect(() => { if (open) loadDetails(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, m.score.home, m.score.away]);

  const channels = Array.from(new Set([...m.channels, ...(details?.channels ?? [])]));
  const scorers = (side: "home" | "away") => (details?.scorers ?? []).filter(s => s.side === side);

  return (
    <div className={cn("rounded-3xl border p-4 bg-white/5 relative", live ? "border-red-500/50" : isPinned ? "border-emerald-400/60" : m.favorite ? "border-yellow-400/50" : "border-white/10")}>
      {m.favorite && <Star className="absolute top-3 left-3 w-4 h-4 fill-yellow-400 text-yellow-400" />}
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

      {channels.length > 0 && <div className="mt-3 text-center text-[11px] text-white/60" dir="ltr">📺 {channels.join(" · ")}</div>}

      {open && (
        <div className="mt-3 rounded-2xl bg-black/30 p-3 space-y-2 text-xs">
          {loadingDetails && !details && <div className="flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-emerald-400" /></div>}
          {detailsError && <p className="text-red-300">{detailsError}</p>}
          {details && (
            <>
              <div className="grid grid-cols-2 gap-3" dir="ltr">
                {(["home", "away"] as const).map(side => (
                  <ul key={side} className={cn("space-y-1", side === "away" && "text-right")}>
                    {scorers(side).length === 0
                      ? <li className="text-white/30">—</li>
                      : scorers(side).map((g, i) => <li key={i}>⚽ {g.player || "?"} <span className="text-white/50">{g.minute}{g.note ? ` (${g.note})` : ""}</span></li>)}
                  </ul>
                ))}
              </div>
              <div className="text-white/60 space-y-0.5 border-t border-white/5 pt-2">
                <p>🎙️ المعلق: {details.commentators.length ? details.commentators.join("، ") : <span className="text-white/30">غير متوفر من المصدر</span>}</p>
                {details.venue && <p>🏟️ الملعب: <span dir="ltr">{details.venue}</span></p>}
                {details.referee && <p>🧑‍⚖️ الحكم: <span dir="ltr">{details.referee}</span></p>}
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button onClick={() => setOpen(v => !v)} className="flex-1 h-9 rounded-full bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 focusable">
          {open ? "إخفاء التفاصيل" : "التفاصيل والهدّافون"}
        </button>
        <button
          onClick={() => togglePin({ id: m.id, home: m.home.name, away: m.away.name })}
          className={cn("h-9 px-4 rounded-full border text-xs font-bold focusable flex items-center gap-1", isPinned ? "bg-emerald-500 text-black border-emerald-500" : "bg-white/5 border-white/10 hover:bg-white/10")}
          title="عرض المباراة كجزيرة عائمة"
        >
          <Pin className="w-3.5 h-3.5" /> {isPinned ? "مثبّتة في الجزيرة" : "تثبيت كجزيرة"}
        </button>
      </div>
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
