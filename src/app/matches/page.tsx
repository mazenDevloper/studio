"use client";

import { flagUrl } from "@/lib/flags";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Loader2, RefreshCw, Trophy, AlertTriangle, Star, PartyPopper, Pin, Eye, EyeOff, Tv, MapPin, Flag, LayoutGrid, Server, BellRing, BellOff, Pencil, X, RotateCcw, BookmarkCheck, BookmarkPlus, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useLiveMatches, useLiveMatchesStore, MATCHES_LIMIT } from "@/lib/live-matches";
import type { MatchDetails } from "@/lib/match-details";
import { sameTeam, matchHideKey, matchDetailsUrl, goalAlertOn, sortMatches } from "@/lib/match-core";
import { favSpecString, favoriteOf, type FavSpec } from "@/lib/match-core";
import { useMediaStore } from "@/lib/store";
import { GOAL_TEST_EVENT } from "@/components/football/goal-celebration";
import { MatchChannelChips } from "@/components/football/match-channel-chips";
import { leagueCountry } from "@/lib/iptv-catalog";
import { matchChannels, findLeagueOverride, leagueKeyMatches, leagueKey } from "@/lib/match-channels";
import { LeagueChannelsEditor } from "@/components/football/league-channels-editor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { omanDateLabel, footballDay } from "@/lib/oman-time";
import type { TopMatch } from "@/lib/top-matches";

/** a day offset from today's football day, or "fav" = favourite teams' upcoming matches */
type DayTab = number | "fav" | "live";
const DAY_NAMES: Record<number, string> = { [-1]: "الأمس", 0: "اليوم", 1: "الغد", 2: "بعد غد" };
const DAY_MS = 86_400_000;
/** Oman football day as a Date at noon UTC (for labels / the date picker) */
const dayDate = (offset: number) => { const [y, m, d] = footballDay().split("-").map(Number); return new Date(Date.UTC(y, m - 1, d + offset, 12)); };
const shortDate = (offset: number) => new Intl.DateTimeFormat("ar", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(dayDate(offset));

/** Other days / favourites (favourite teams + the important ones), cached for the session. */
const otherDays = new Map<string, { at: number; data: any }>();
function useOtherDay(tab: DayTab, teams: string[]) {
  const follow = useMediaStore(s => s.followedLeagues) || [];
  const key = `${tab}|${teams.join("|")}|${follow.join(";")}`;
  const [state, setState] = useState<{ key: string; data: any; error: string | null; loading: boolean }>({ key: "", data: null, error: null, loading: false });
  const load = async (force = false) => {
    if (tab === 0) return;
    const hit = otherDays.get(key);
    if (hit && !force && Date.now() - hit.at < (tab === "live" ? 25_000 : 10 * 60_000)) { setState({ key, data: hit.data, error: null, loading: false }); return; }
    setState(s => ({ key, data: s.key === key ? s.data : hit?.data ?? null, error: null, loading: true }));
    try {
      const q = new URLSearchParams(tab === "fav" ? { days: "14" } : tab === "live" ? {} : { limit: String(MATCHES_LIMIT), day: String(tab) });
      if (teams.length) q.set("teams", teams.join("|"));
      for (const k of follow) q.append("follow", k);
      const res = await fetch(tab === "fav" ? `/api/matches/favorites?${q}` : tab === "live" ? `/api/matches/live?${q}` : `/api/matches?${q}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "تعذر التحميل");
      otherDays.set(key, { at: Date.now(), data: json });
      setState({ key, data: json, error: null, loading: false });
    } catch (e: any) {
      setState(s => ({ ...s, key, error: e?.message || "تعذر التحميل", loading: false }));
    }
  };
  useEffect(() => {
    load();
    // the live tab keeps itself up to date
    if (tab !== "live") return;
    const t = setInterval(() => { if (document.visibilityState === "visible") load(true); }, 30_000);
    return () => clearInterval(t);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  const mine = state.key === key;
  return { data: mine ? state.data : otherDays.get(key)?.data ?? null, error: mine ? state.error : null, loading: !mine || state.loading, refresh: () => load(true) };
}

/** Day tabs: yesterday / today / tomorrow / a date (day after tomorrow by default, ‹ › and a date picker), my teams */
function DayTabs({ tab, setTab }: { tab: DayTab; setTab: (t: DayTab) => void }) {
  const picker = useRef<HTMLInputElement>(null);
  const [dateDay, setDateDay] = useState(2);
  const dated = typeof tab === "number" && ![-1, 0, 1].includes(tab);
  const shown = dated ? (tab as number) : dateDay;
  const go = (n: number) => { if ([-1, 0, 1].includes(n)) setTab(n); else { setDateDay(n); setTab(n); } };
  const step = (d: number) => go((typeof tab === "number" ? tab : 0) + d);
  // remote / keyboard: Enter on the date tab opens the picker (a tap lands on the date input itself, below)
  const openPicker = () => { const el = picker.current; if (!el) return; try { el.showPicker(); } catch { el.focus(); el.click(); } };
  const btn = (active: boolean) => cn("focusable no-focus-scale h-10 px-4 rounded-full text-sm font-black transition-colors whitespace-nowrap",
    active ? "bg-emerald-500 text-black" : "text-white/60 hover:bg-white/10");
  const group = "inline-flex items-center rounded-full bg-white/5 border border-white/10 p-1 gap-1 max-w-full";
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <div className={group} role="tablist">
        {[-1, 0, 1].map(d => (
          <button key={d} role="tab" aria-selected={tab === d} onClick={() => setTab(d)} data-nav-id={`matches-day-${d + 1}`} className={btn(tab === d)}>{DAY_NAMES[d]}</button>
        ))}
        {/* every match being played now, strongest first */}
        <button role="tab" aria-selected={tab === "live"} onClick={() => setTab("live")} data-nav-id="matches-day-live"
          className={cn(btn(tab === "live"), "flex items-center gap-1.5", tab === "live" ? "!bg-red-600 !text-white" : "text-red-300")}>
          <span className="relative flex w-2.5 h-2.5"><span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" /><span className="relative w-2.5 h-2.5 rounded-full bg-red-500" /></span>
          مباشر
        </button>
      </div>
      {/* previous day · the date (tap = date picker) · next day */}
      <div className={group}>
        <button onClick={() => step(-1)} title="اليوم السابق" data-nav-id="matches-day-prev" className={cn(btn(false), "px-3 flex items-center gap-1 text-white/80")}>
          <ChevronRight className="w-5 h-5" /><span className="text-xs">السابق</span>
        </button>
        <span className="relative">
          <button role="tab" aria-selected={dated} onClick={openPicker} tabIndex={0} data-nav-id="matches-day-date" className={cn(btn(dated), "flex items-center gap-1.5")}>
            <CalendarDays className="w-4 h-4" /> {shown === 2 ? `${DAY_NAMES[2]} · ` : ""}{shortDate(shown)}
          </button>
          {/* the real date input covers the tab, so a tap opens the phone's own date picker */}
          <input ref={picker} type="date" aria-label="اختر التاريخ" tabIndex={-1}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            value={dayDate(shown).toISOString().slice(0, 10)}
            onChange={e => { if (!e.target.value) return; const [y, m, d] = e.target.value.split("-").map(Number); go(Math.round((Date.UTC(y, m - 1, d, 12) - dayDate(0).getTime()) / DAY_MS)); }} />
        </span>
        <button onClick={() => step(1)} title="اليوم التالي" data-nav-id="matches-day-next" className={cn(btn(false), "px-3 flex items-center gap-1 text-white/80")}>
          <span className="text-xs">التالي</span><ChevronLeft className="w-5 h-5" />
        </button>
      </div>
      <button role="tab" aria-selected={tab === "fav"} onClick={() => setTab("fav")} data-nav-id="matches-day-fav"
        className={cn(btn(tab === "fav"), "flex items-center gap-1.5 border border-yellow-400/30", tab !== "fav" && "text-yellow-300")}>
        <Star className={cn("w-4 h-4", tab === "fav" ? "fill-black" : "fill-yellow-400")} /> مباريات فرقي القادمة
      </button>
    </div>
  );
}

/** Today's most important matches, kick-off in Oman time (GMT+4). Auto-refreshes every 30s from the shared live feed. */
export default function MatchesTestPage() {
  const { favoriteTeams } = useMediaStore();
  const favoriteNames = useMemo(() => (favoriteTeams || []).filter(t => t?.name).map(favSpecString), [favoriteTeams]);
  const today = useLiveMatches(favoriteNames);
  const [tab, setTab] = useState<DayTab>(0);
  const other = useOtherDay(tab, favoriteNames);
  const { data, error, loading, refresh } = tab !== 0 ? other : today;
  const updatedAt = tab !== 0 ? null : today.updatedAt;
  // live favourites, live, favourites, then the rest (my teams' upcoming matches: by kick-off)
  // my teams: by kick-off; live: the server's order (strongest first); days: live favourites, live, favourites...
  const allMatches = useMemo(() => tab === "fav" || tab === "live" ? ((data?.matches ?? []) as TopMatch[]) : sortMatches<TopMatch>((data?.matches ?? []) as TopMatch[]), [data, tab]);
  const title = tab === "fav" ? "مباريات فرقي القادمة" : tab === "live" ? "المباريات المباشرة الآن" : `أهم مباريات ${DAY_NAMES[tab] ?? shortDate(tab)}`;
  const [showJson, setShowJson] = useState(false);
  const skipped = useMediaStore(s => s.skippedMatchIds) || [];
  const isHidden = (m: TopMatch) => skipped.includes(matchHideKey(m));
  const isRemoved = (m: TopMatch) => skipped.includes(`del:${matchHideKey(m)}`);
  const unskipMatch = useMediaStore(s => s.unskipMatch);
  const removed = allMatches.filter(isRemoved);
  const matches = removed.length ? allMatches.filter(m => !isRemoved(m)) : allMatches;
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 5000); return () => clearInterval(t); }, []);
  const ago = updatedAt ? Math.round((Date.now() - updatedAt) / 1000) : null;
  // the channel buttons on the cards open IPTV favourites: make sure they are loaded
  const favCount = useMediaStore(s => s.favoriteIptvChannels?.length ?? 0);
  const ensureScreenData = useMediaStore(s => s.ensureScreenData);
  useEffect(() => { if (!favCount) ensureScreenData("/iptv"); }, [favCount, ensureScreenData]);

  return (
    <div className="min-h-full bg-black text-white p-6 md:p-10 space-y-6" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">{title} <Trophy className="w-8 h-8 text-yellow-400" /></h1>
          <p className="text-white/50 text-sm mt-1">{tab === "fav" ? `من الغد ولمدة 14 يوماً · ${favoriteNames.length} فريق` : tab === "live" ? `${matches.length} مباراة · من الأقوى للأضعف · تحديث كل 30 ثانية` : omanDateLabel(dayDate(tab))} · التوقيت: عُمان (GMT+4) · اليوم الكروي حتى 5 فجراً</p>
          <DayTabs tab={tab} setTab={setTab} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {ago !== null && <span className="text-xs text-white/40">تحديث تلقائي · منذ {ago} ث</span>}
          <Button variant="outline" onClick={() => window.dispatchEvent(new CustomEvent(GOAL_TEST_EVENT))} className="rounded-full bg-white/5 border-white/10"><PartyPopper className="w-4 h-4 ml-2" /> اختبار الهدف</Button>
          <Button variant="outline" onClick={() => setShowJson(v => !v)} className="rounded-full bg-white/5 border-white/10">JSON</Button>
          <Button onClick={refresh} disabled={loading} className="rounded-full bg-emerald-500 text-black hover:bg-emerald-400">
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
          {matches.length === 0 ? (
            <div className="py-20 text-center text-white/30 font-bold">{tab === "live" ? "لا توجد مباريات مباشرة الآن" : tab === "fav" ? (favoriteNames.length ? "لا توجد مباريات قادمة لفرقك في الأيام القادمة" : "لم تضف فرقاً مفضلة بعد") : `لا توجد مباريات مهمة ${DAY_NAMES[tab] ?? shortDate(tab)}`}</div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {matches.map((m: TopMatch, i: number) => {
                  // my teams' tab: a date heading before each new day
                  const day = tab === "fav" ? footballDay(new Date(m.timestamp * 1000)) : "";
                  const head = tab === "fav" && (i === 0 || footballDay(new Date(matches[i - 1].timestamp * 1000)) !== day);
                  return (
                    <Fragment key={m.id}>
                      {head && <h2 className="md:col-span-2 pt-2 text-lg font-black text-yellow-300 flex items-center gap-2"><CalendarDays className="w-5 h-5" /> {omanDateLabel(new Date(m.timestamp * 1000 - 5 * 3600_000))}</h2>}
                      <MatchCard m={m} hidden={isHidden(m)} />
                    </Fragment>
                  );
                })}
              </div>
            </>
          )}

          {removed.length > 0 && (
            <button onClick={() => removed.forEach(m => unskipMatch(`del:${matchHideKey(m)}`))} data-nav-id="matches-restore"
              className="focusable no-focus-scale h-10 px-5 rounded-full bg-white/5 border border-white/10 text-xs font-black text-white/60 hover:text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> إظهار المحذوفة ({removed.length})
            </button>
          )}

          {/* data sources (APIs) at the bottom: the matches come first */}
          <section className="pt-6 mt-2 border-t border-white/5 space-y-2">
            <p className="text-xs text-white/40 flex items-center gap-2"><Server className="w-3.5 h-3.5" /> {matches.length}{data.total != null ? ` من أصل ${data.total}` : ""} مباراة · {data.date ?? (data.days ? `${data.days[0]} → ${data.days.at(-1)}` : "")}{data.source ? ` · المصدر: ${data.source}` : ""}</p>
            <div className="flex flex-wrap gap-2" dir="ltr">
              {(data.attempts ?? []).map((a: any) => (
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
  const belled = useMediaStore(s => s.belledMatchIds) || [];
  const toggleGoalAlert = useMediaStore(s => s.toggleGoalAlert);
  const alertOn = goalAlertOn(m, belled);
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
  const userChannels = useMediaStore(s => findLeagueOverride(s.leagueChannelOverrides, m.league)?.[1]);
  const [editChannels, setEditChannels] = useState(false);
  const channels = matchChannels(m.league, [...(details?.channels ?? []), ...(lookedUp ?? []), ...m.channels], userChannels);
  const scorers = (side: "home" | "away") => (details?.scorers ?? []).filter(s => s.side === side);

  return (
    <div className={cn("rounded-3xl border p-4 bg-white/5 relative", live ? "border-red-500/50" : isPinned ? "border-emerald-400/60" : m.favorite ? "border-yellow-400/50" : "border-white/10")}>

      <div className="flex items-center justify-between text-[11px] text-white/50 mb-3">
        <span className="flex items-center gap-2 min-w-0">
          {flagUrl(m.league.country) && <img src={flagUrl(m.league.country)!} alt="" title={m.league.country} className="w-5 h-3.5 object-cover rounded-[2px] shrink-0" />}
          {m.league.logo && <img src={m.league.logo} alt="" className="w-4 h-4 object-contain" />}
          <span className="truncate">{m.league.name}</span>
          <FollowLeague league={m.league} navId={`match-follow-${m.id}`} />
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {m.favorite && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
          <span className={cn("font-black", live ? "text-red-300 text-base tabular-nums bg-red-600/20 border border-red-500/40 rounded-full px-2.5 leading-7" : m.status === "finished" ? "text-white/40" : "text-emerald-400")}>
            {live ? `مباشر ${m.elapsed ?? ""}'` : m.status === "finished" ? "انتهت" : "قريباً"}
          </span>
          <button
            onClick={() => toggleGoalAlert(matchHideKey(m), !!(m.favorite || m.followed))}
            title={alertOn ? "إيقاف تنبيه الأهداف (الأنيميشن)" : "تفعيل تنبيه الأهداف (الأنيميشن)"}
            data-nav-id={`match-bell-${m.id}`}
            className={cn("w-8 h-8 rounded-full border flex items-center justify-center focusable", alertOn ? "bg-yellow-400 text-black border-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.5)]" : "bg-black/40 text-white/50 border-white/10 hover:text-white")}
          >
            {alertOn ? <BellRing className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
          <button onClick={toggleHidden} title={hidden ? "إظهار في الجزيرة العائمة" : "إخفاء من الجزيرة العائمة (في كل الأجهزة)"} className={cn("w-8 h-8 rounded-full bg-black/40 border border-white/10 text-white/60 hover:text-white flex items-center justify-center focusable", hidden && "text-red-300 border-red-400/50 bg-red-500/10")}>
            {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          {/* remove the card from the list (and the island), on every device; "show removed" at the bottom undoes it */}
          <button onClick={() => { skipMatch(`del:${matchHideKey(m)}`); setTimeout(() => syncMasterBin(), 100); }} title="حذف من القائمة"
            data-nav-id={`match-del-${m.id}`}
            className="w-8 h-8 rounded-full bg-black/40 border border-white/10 text-white/50 hover:text-red-300 hover:border-red-400/50 flex items-center justify-center focusable">
            <X className="w-4 h-4" />
          </button>
        </span>
      </div>
      {/* LTR so the home team sits on the left of "home - away" (in RTL it ended up on the right, reversing the score) */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3" dir="ltr">
        <Team team={m.home} league={m.league} navId={`match-star-home-${m.id}`} />
        <div className="text-center min-w-[72px]">
          {started
            ? <div className="text-2xl font-black tabular-nums" dir="ltr">{m.score.home ?? 0} - {m.score.away ?? 0}</div>
            : <div className="text-2xl font-black tabular-nums text-emerald-400" dir="ltr">{m.omanTime}</div>}
          <div className="text-[10px] text-white/40 mt-1" dir="ltr">{m.omanTime} عُمان</div>
        </div>
        <Team team={m.away} league={m.league} navId={`match-star-away-${m.id}`} />
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold">
        {!channels.length && <Tv className="w-4 h-4 text-emerald-400 shrink-0" />}
        {channels.length > 0
          ? <MatchChannelChips names={channels} country={leagueCountry(m.league)} idPrefix={`match-${m.id}`} className="justify-center" />
          : <span className="text-white/30">{lookedUp === null ? "جاري البحث عن القناة..." : "القناة الناقلة غير متوفرة"}</span>}
        {/* edit / add the league's default channels */}
        <button onClick={() => setEditChannels(true)} title="تعديل أو إضافة قناة لهذا الدوري" data-nav-id={`match-edit-ch-${m.id}`}
          className={cn("focusable no-focus-scale h-8 rounded-full border flex items-center justify-center gap-1 shrink-0",
            channels.length ? "w-8 bg-white/5 border-white/10 text-white/40 hover:text-white" : "px-3 bg-emerald-500/10 border-emerald-400/30 text-emerald-300")}>
          <Pencil className="w-3.5 h-3.5" />{!channels.length && <span>إضافة قناة</span>}
        </button>
      </div>
      {editChannels && <LeagueChannelsEditor league={m.league} onClose={() => setEditChannels(false)} />}

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

/** Follow a competition: all its matches are listed (not favourites: no bell, no island). */
function FollowLeague({ league, navId }: { league: TopMatch["league"]; navId: string }) {
  const followed = useMediaStore(s => s.followedLeagues) || [];
  const toggle = useMediaStore(s => s.toggleFollowLeague);
  const key = followed.find(k => leagueKeyMatches(k, league));
  return (
    <button onClick={() => toggle(key ?? leagueKey(league))} data-nav-id={navId}
      title={key ? "إلغاء متابعة البطولة" : "متابعة البطولة: تظهر كل مبارياتها في القائمة (دون اعتبارها مفضلة)"}
      className={cn("focusable no-focus-scale shrink-0 h-6 px-2 rounded-full border text-[10px] font-black flex items-center gap-1",
        key ? "bg-sky-500/15 border-sky-400/40 text-sky-300" : "border-white/10 text-white/35 hover:text-white")}>
      {key ? <BookmarkCheck className="w-3 h-3" /> : <BookmarkPlus className="w-3 h-3" />}{key ? "متابَعة" : "متابعة"}
    </button>
  );
}

const favSpecFromTeam = (t: { name: string; country?: string }): FavSpec => ({ name: t.name, country: t.country });

/** A team with its star: tap to add it to my favourite teams, tap again to remove it (by id, else by full name). */
function Team({ team, league, navId }: { team: TopMatch["home"]; league: TopMatch["league"]; navId: string }) {
  const favorites = useMediaStore(s => s.favoriteTeams) || [];
  const setFavoriteTeam = useMediaStore(s => s.setFavoriteTeam);
  const id = Number(team.id);
  // the same id from another data source can be another club: the name has to agree as well
  const fav = favorites.find(f => (Number.isFinite(id) && f.id === id && sameTeam(f.name, team.name)) || f.name.trim().toLowerCase() === team.name.trim().toLowerCase())
    ?? favorites.find(f => favoriteOf(favSpecFromTeam(f), { home: team, away: { id: "", name: "" }, league }));
  const toggle = () => {
    if (fav) setFavoriteTeam(fav, false);
    else {
      // the league's country tells this club from namesakes abroad (none for international competitions)
      const country = league.country && !/world|europe|international|asia|africa|america/i.test(league.country) ? league.country : undefined;
      setFavoriteTeam({ id: Number.isFinite(id) && id > 0 ? id : -Date.now(), name: team.name, logo: team.logo || "", country }, true);
    }
  };
  return (
    <div className="flex flex-col items-center gap-2 min-w-0">
      <div className="relative">
        {team.logo ? <img src={team.logo} alt="" className="w-12 h-12 object-contain" loading="lazy" /> : <div className="w-12 h-12 rounded-full bg-white/10" />}
        <button onClick={toggle} title={fav ? "إزالة من فرقي المفضلة" : "إضافة إلى فرقي المفضلة"} data-nav-id={navId}
          className={cn("focusable no-focus-scale absolute -top-2 -right-3 w-7 h-7 rounded-full border flex items-center justify-center",
            fav ? "bg-yellow-400 border-yellow-300 text-black shadow-[0_0_10px_rgba(250,204,21,0.5)]" : "bg-black/70 border-white/15 text-white/40 hover:text-yellow-300")}>
          <Star className={cn("w-3.5 h-3.5", fav && "fill-current")} />
        </button>
      </div>
      <span className="text-xs font-black text-center truncate w-full" dir="ltr">{team.name}</span>
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
          sub={channels.length ? <MatchChannelChips names={channels} country={leagueCountry(m.league)} idPrefix={`info-${m.id}`} editable className="mt-1.5" /> : "غير متوفرة"} />
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
