"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2, RefreshCw, Trophy, AlertTriangle, Star, PartyPopper, Pin, Eye, EyeOff, Tv, MapPin, Flag, LayoutGrid, Server } from "lucide-react";
import { useLiveMatches, useLiveMatchesStore } from "@/lib/live-matches";
import type { MatchDetails } from "@/lib/match-details";
import { sameTeam, matchHideKey, matchDetailsUrl } from "@/lib/match-core";
import { useMediaStore } from "@/lib/store";
import { GOAL_TEST_EVENT } from "@/components/football/goal-celebration";
import { MatchChannelChips } from "@/components/football/match-channel-chips";
import { leagueChannels, prioritizeChannels } from "@/lib/match-channels";
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
  const skipped = useMediaStore(s => s.skippedMatchIds) || [];
  const isHidden = (m: TopMatch) => skipped.includes(matchHideKey(m));
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 5000); return () => clearInterval(t); }, []);
  const ago = updatedAt ? Math.round((Date.now() - updatedAt) / 1000) : null;
  const load = refresh;
  // the channel buttons on the cards open IPTV favourites: make sure they are loaded
  const favCount = useMediaStore(s => s.favoriteIptvChannels?.length ?? 0);
  const ensureScreenData = useMediaStore(s => s.ensureScreenData);
  useEffect(() => { if (!favCount) ensureScreenData("/iptv"); }, [favCount, ensureScreenData]);

  return (
    <div className="min-h-full bg-black text-white p-6 md:p-10 space-y-6" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">أهم مباريات اليوم <Trophy className="w-8 h-8 text-yellow-400" /></h1>
          <p className="text-white/50 text-sm mt-1">{omanDateLabel(new Date(Date.now() - 5 * 3600_000))} · التوقيت: عُمان (GMT+4) · اليوم الكروي حتى 5 فجراً</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
          {data.matches.length === 0 ? (
            <div className="py-20 text-center text-white/30 font-bold">لا توجد مباريات مهمة اليوم</div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {data.matches.map(m => <MatchCard key={m.id} m={m} hidden={isHidden(m)} />)}
              </div>
            </>
          )}

          {/* data sources (APIs) at the bottom: the matches come first */}
          <section className="pt-6 mt-2 border-t border-white/5 space-y-2">
            <p className="text-xs text-white/40 flex items-center gap-2"><Server className="w-3.5 h-3.5" /> {data.matches.length} من أصل {data.total} مباراة · {data.date} · المصدر: {data.source}</p>
            <div className="flex flex-wrap gap-2" dir="ltr">
              {data.attempts.map(a => (
                <span key={a.source} title={a.error} className={cn("text-[10px] font-bold px-3 py-1 rounded-full border", a.ok ? "border-emerald-500/40 text-emerald-300" : "border-red-500/40 text-red-300")}>
                  {a.source}{a.kind === "open" ? " ◈" : ""} · {a.ok ? `${a.important}/${a.total}` : "failed"} · {a.ms}ms
                </span>
              ))}
            </div>
          </section>
        </>
      )}

      {showJson && data && <pre dir="ltr" className="text-[11px] text-white/60 bg-white/5 rounded-2xl p-4 overflow-auto max-h-[50vh]">{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}

/** Details (channels, scorers, venue...) fetched once per match and shared by the channel line and the info panel. */
const detailsCache = new Map<string, Promise<MatchDetails | null>>();
function lookupDetails(m: TopMatch): Promise<MatchDetails | null> {
  if (!detailsCache.has(m.id)) {
    detailsCache.set(m.id, fetch(matchDetailsUrl(m)).then(r => (r.ok ? r.json() : null)).catch(() => null));
  }
  return detailsCache.get(m.id)!;
}

function MatchCard({ m, hidden = false }: { m: TopMatch; hidden?: boolean }) {
  const skipMatch = useMediaStore(s => s.skipMatch);
  const unskipMatch = useMediaStore(s => s.unskipMatch);
  const syncMasterBin = useMediaStore(s => s.syncMasterBin);
  // 365Scores channels for the Middle East (looked up for every match: other feeds list e.g. US channels)
  const [lookedUp, setLookedUp] = useState<string[] | null>(null);
  useEffect(() => {
    let alive = true;
    lookupDetails(m).then(d => { if (alive) setLookedUp(d?.channels ?? []); });
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.id]);
  const toggleHidden = () => {
    // same key as the floating island, synced through the master bin
    if (hidden) unskipMatch(matchHideKey(m));
    else { skipMatch(matchHideKey(m)); setTimeout(() => syncMasterBin(), 100); }
  };
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
      const r = await fetch(matchDetailsUrl(m), { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setDetails(j);
    } catch (e: any) { setDetailsError(e?.message || "failed"); } finally { setLoadingDetails(false); }
  };
  // refresh scorers while the card is open and the score changes
  useEffect(() => { if (open) loadDetails(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, m.score.home, m.score.away]);

  // Middle East channels from 365Scores first; the feed's own list only when 365Scores has none
  // every source together (league rights holder, 365Scores details, the feed), then: Arab channels first, and the
  // foreign ones only when the match has no Arab channel at all
  const channels = prioritizeChannels([...leagueChannels(m.league), ...(details?.channels ?? []), ...(lookedUp ?? []), ...m.channels]);
  const scorers = (side: "home" | "away") => (details?.scorers ?? []).filter(s => s.side === side);

  return (
    <div className={cn("rounded-3xl border p-4 bg-white/5 relative", live ? "border-red-500/50" : isPinned ? "border-emerald-400/60" : m.favorite ? "border-yellow-400/50" : "border-white/10")}>

      <div className="flex items-center justify-between text-[11px] text-white/50 mb-3">
        <span className="flex items-center gap-2 min-w-0">
          {m.league.logo && <img src={m.league.logo} alt="" className="w-4 h-4 object-contain" />}
          <span className="truncate">{m.league.name}</span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {m.favorite && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
          <span className={cn("font-black", live ? "text-red-400" : m.status === "finished" ? "text-white/40" : "text-emerald-400")}>
            {live ? `مباشر ${m.elapsed ?? ""}'` : m.status === "finished" ? "انتهت" : "قريباً"}
          </span>
          <button onClick={toggleHidden} title={hidden ? "إظهار في الجزيرة العائمة" : "إخفاء من الجزيرة العائمة (في كل الأجهزة)"} className={cn("w-8 h-8 rounded-full bg-black/40 border border-white/10 text-white/60 hover:text-white flex items-center justify-center focusable", hidden && "text-red-300 border-red-400/50 bg-red-500/10")}>
            {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </span>
      </div>
      {/* LTR so the home team sits on the left of "home - away" (in RTL it ended up on the right, reversing the score) */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3" dir="ltr">
        <Team name={m.home.name} logo={m.home.logo} />
        <div className="text-center min-w-[72px]">
          {started
            ? <div className="text-2xl font-black tabular-nums" dir="ltr">{m.score.home ?? 0} - {m.score.away ?? 0}</div>
            : <div className="text-2xl font-black tabular-nums text-emerald-400" dir="ltr">{m.omanTime}</div>}
          <div className="text-[10px] text-white/40 mt-1" dir="ltr">{m.omanTime} عُمان</div>
        </div>
        <Team name={m.away.name} logo={m.away.logo} />
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold">
        {!channels.length && <Tv className="w-4 h-4 text-emerald-400 shrink-0" />}
        {channels.length > 0
          ? <MatchChannelChips names={channels} idPrefix={`match-${m.id}`} className="justify-center" />
          : <span className="text-white/30">{lookedUp === null ? "جاري البحث عن القناة..." : "القناة الناقلة غير متوفرة"}</span>}
      </div>

      {open && (
        <div className="mt-3 space-y-3 text-xs">
          {loadingDetails && !details && <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-emerald-400" /></div>}
          {detailsError && <p className="text-red-300">{detailsError}</p>}
          {details && <MatchInfo m={m} d={details} channels={channels} />}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button onClick={() => setOpen(v => !v)} className="flex-1 h-9 rounded-full bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 focusable">
          {open ? "إخفاء التفاصيل" : "معلومات المباراة والهدّافون"}
        </button>
        <button
          onClick={() => {
            // pinning a match hidden from the island shows it there again
            if (!isPinned && hidden) unskipMatch(matchHideKey(m));
            togglePin({ id: m.id, home: m.home.name, away: m.away.name });
          }}
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

/** Whistle (referee) - not in lucide. */
function WhistleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 12a6 6 0 0 0 10.4 4.1L15 13h6V8H8a6 6 0 0 0-6 4Z" />
      <circle cx="8" cy="12" r="2" />
      <path d="M12 8V5" />
    </svg>
  );
}

function InfoRow({ icon, title, sub }: { icon: ReactNode; title: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-t border-white/10">
      <span className="text-sky-400 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-black text-white">{title}</div>
        {sub && <div className="text-[12px] font-bold text-white/50 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

/** Rich match info (365Scores first): scorers with photos, red cards, stats and an info list like the 365Scores app. */
function MatchInfo({ m, d, channels }: { m: TopMatch; d: MatchDetails; channels: string[] }) {
  const fmt = (n?: number) => (n ? n.toLocaleString("en-US") : "");
  const sides = ["home", "away"] as const;
  return (
    <>
      <div className="rounded-2xl bg-black/30 p-3">
        <div className="grid grid-cols-2 gap-3" dir="ltr">
          {sides.map(side => {
            const list = d.scorers.filter(s => s.side === side);
            return (
              <ul key={side} className={cn("space-y-2", side === "away" && "items-end")}>
                {list.length === 0
                  ? <li className={cn("text-white/30", side === "away" && "text-right")}>—</li>
                  : list.map((g, i) => (
                    <li key={i} className={cn("flex items-center gap-2", side === "away" && "flex-row-reverse text-right")}>
                      {g.photo
                        ? <img src={g.photo} alt="" className="w-8 h-8 rounded-full object-cover bg-white/10 shrink-0" loading="lazy" />
                        : <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">⚽</span>}
                      <span className="min-w-0">
                        <span className="block font-black truncate">{g.player || "?"} <span className="text-white/50">{g.minute}{g.note ? ` (${g.note})` : ""}</span></span>
                        {g.assist && <span className="block text-[10px] text-white/40 truncate">assist: {g.assist}</span>}
                      </span>
                    </li>
                  ))}
                {(d.redCards ?? []).filter(c => c.side === side).map((c, i) => (
                  <li key={`r${i}`} className={cn("flex items-center gap-2 text-red-300", side === "away" && "flex-row-reverse text-right")}>
                    <span className="w-3 h-4 rounded-sm bg-red-500 shrink-0" /> <span className="truncate">{c.player} {c.minute}</span>
                  </li>
                ))}
              </ul>
            );
          })}
        </div>
      </div>

      {d.stats && d.stats.length > 0 && (
        <div className="rounded-2xl bg-black/30 p-3 space-y-2" dir="ltr">
          {d.stats.map(r => {
            const h = parseFloat(r.home) || 0, a = parseFloat(r.away) || 0, total = h + a || 1;
            return (
              <div key={r.name}>
                <div className="flex justify-between text-[11px] font-black"><span>{r.home}</span><span className="text-white/50">{r.name}</span><span>{r.away}</span></div>
                <div className="flex gap-1 h-1.5 mt-1">
                  <div className="flex-1 flex justify-end rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(h / total) * 100}%` }} /></div>
                  <div className="flex-1 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-sky-400 rounded-full" style={{ width: `${(a / total) * 100}%` }} /></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl bg-[#1a1f24] border border-white/10 overflow-hidden">
        <p className="px-4 py-3 text-sm font-black text-white">معلومات حول المباراة</p>
        {d.referee && <InfoRow icon={<WhistleIcon className="w-6 h-6" />} title={d.referee} sub="الحكم" />}
        {d.venue && (
          <InfoRow icon={<MapPin className="w-6 h-6" />} title={d.venue}
            sub={[d.venueCapacity && `سعة الملعب: ${fmt(d.venueCapacity)}`, d.attendance && `الحضور: ${fmt(d.attendance)}`].filter(Boolean).join(" · ") || undefined} />
        )}
        <InfoRow icon={<Tv className="w-6 h-6" />} title="قنوات تلفزيون"
          sub={channels.length ? <MatchChannelChips names={channels} idPrefix={`info-${m.id}`} editable className="mt-1.5" /> : "غير متوفرة"} />
        {d.round && <InfoRow icon={<Flag className="w-6 h-6" />} title={<span dir="ltr">{d.round}</span>} sub={m.league.name} />}
        {d.formations && (
          <InfoRow icon={<LayoutGrid className="w-6 h-6" />} title="التشكيل"
            sub={<span dir="ltr">{m.home.name} {d.formations.home ?? "?"} · {m.away.name} {d.formations.away ?? "?"}</span>} />
        )}
        {d.commentators.length > 0 && <InfoRow icon={<span className="text-lg">🎙️</span>} title={d.commentators.join("، ")} sub="المعلق" />}
      </div>
    </>
  );
}
