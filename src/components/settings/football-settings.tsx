"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Plus, X, Loader2, Star, Trophy, Tv, Pencil, Link2, Layers, BookmarkCheck } from "lucide-react";
import { useMediaStore, type FavoriteTeam } from "@/lib/store";
import { useLiveMatchesStore } from "@/lib/live-matches";
import type { TopMatch } from "@/lib/match-core";
import { LEAGUE_CHANNEL_RULES, leagueKey } from "@/lib/match-channels";
import { LeagueChannelsEditor } from "@/components/football/league-channels-editor";
import { IptvChannelSelect } from "@/components/iptv/iptv-channel-select";
import { cn } from "@/lib/utils";

interface TeamHit { id: number; name: string; logo: string; country?: string }

const box = "rounded-[2.5rem] bg-white/5 border border-white/10 p-6 md:p-8 space-y-5";
const input = "flex-1 min-w-0 h-12 px-5 rounded-full bg-black/40 border border-white/10 outline-none text-white text-base";

/** Settings > Matches: favourite clubs (search + add), and leagues linked to their channels, in one tab. */
export function FootballSettings() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <FavoriteTeamsSection />
      <LeagueChannelsSection />
      <FollowedLeaguesSection />
    </div>
  );
}

function FavoriteTeamsSection() {
  const teams = useMediaStore(s => s.favoriteTeams) || [];
  const toggle = useMediaStore(s => s.toggleFavoriteTeam);
  const setIsland = useMediaStore(s => s.setFavoriteTeamIsland);
  const syncMasterBin = useMediaStore(s => s.syncMasterBin);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<TeamHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // search as you type (after a short pause)
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); setError(null); return; }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setBusy(true); setError(null);
      try {
        const res = await fetch(`/api/teams/search?q=${encodeURIComponent(term)}`, { signal: ctl.signal });
        const json = await res.json();
        setHits(json.teams ?? []);
        if (!json.teams?.length) setError(json.errors?.length ? "تعذر الوصول لمصادر البحث" : "لا نتائج");
      } catch (e: any) { if (e?.name !== "AbortError") setError("تعذر البحث"); }
      finally { setBusy(false); }
    }, 450);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]);

  // exact: "Al Hilal" must not mark "Al Hilal Omdurman" as a favourite
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const isFav = (name: string, id?: number) => teams.some(t => (id != null && t.id === id) || same(t.name, name));
  const flip = (t: FavoriteTeam) => { toggle(t); setTimeout(() => syncMasterBin(), 150); };
  const addByName = () => {
    const name = q.trim();
    if (!name || isFav(name)) return;
    flip({ id: -Date.now(), name, logo: "" });
    setQ("");
  };

  return (
    <section className={box}>
      <h2 className="text-2xl font-black text-white flex items-center gap-3"><Star className="w-7 h-7 fill-yellow-400 text-yellow-400" /> فرقي المفضلة</h2>
      <p className="text-sm text-white/40 font-bold">مبارياتها تظهر دائماً في صفحة المباريات وفوق كل شيء عند البث المباشر، وتنبيه الأهداف مفعّل لها</p>

      <form onSubmit={e => { e.preventDefault(); if (hits[0] && !isFav(hits[0].name, hits[0].id)) { flip(hits[0]); setQ(""); } }} className="flex items-center gap-2">
        <label className="relative flex-1 min-w-0 flex">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث عن نادٍ أو منتخب (بالإنجليزية: Al Hilal, Barcelona...)" dir="auto" className={cn(input, "pr-12")} data-nav-id="fav-team-search" />
        </label>
        {busy && <Loader2 className="w-5 h-5 animate-spin text-emerald-400 shrink-0" />}
      </form>

      {hits.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 max-h-80 overflow-y-auto pl-1">
          {hits.map((t, i) => {
            const on = isFav(t.name, t.id);
            return (
              <button key={`${t.id}-${t.name}`} onClick={() => on ? flip(teams.find(f => f.id === t.id || same(f.name, t.name))!) : flip(t)} data-nav-id={`team-hit-${i}`}
                className={cn("focusable no-focus-scale flex items-center gap-3 rounded-2xl px-3 py-2 border text-right",
                  on ? "bg-yellow-400/15 border-yellow-400/40" : "bg-white/5 border-white/5 hover:bg-white/10")}>
                {t.logo ? <img src={t.logo} alt="" className="w-9 h-9 object-contain shrink-0" /> : <Trophy className="w-6 h-6 text-white/20 shrink-0" />}
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-black text-white" dir="auto">{t.name}</span>
                  {t.country && <span className="block truncate text-[11px] text-white/40 font-bold">{t.country}</span>}
                </span>
                {on ? <Star className="w-5 h-5 fill-yellow-400 text-yellow-400 shrink-0" /> : <Plus className="w-5 h-5 text-emerald-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
      {error && q.trim().length >= 2 && !busy && (
        <div className="flex items-center justify-between gap-3 text-sm text-white/50 font-bold">
          <span>{error}</span>
          <button onClick={addByName} className="focusable no-focus-scale h-10 px-4 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-black flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> أضف «{q.trim()}» بالاسم
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {teams.length === 0 && <p className="text-sm text-white/30 font-bold">لا توجد فرق مفضلة بعد</p>}
        {teams.map((t, i) => (
          <span key={`${t.id}-${t.name}`} className="flex items-center gap-2 h-11 pr-2 pl-1.5 rounded-full bg-white/5 border border-white/10">
            {t.logo ? <img src={t.logo} alt="" className="w-7 h-7 object-contain" /> : <Trophy className="w-5 h-5 text-white/20" />}
            <span className="text-sm font-black text-white" dir="auto">{t.name}</span>
            {/* island switch: off = its matches stay on the matches page only */}
            <button onClick={() => setIsland(t.name, t.island === false)} title={t.island === false ? "الجزيرة العائمة: مخفي (اضغط للإظهار)" : "الجزيرة العائمة: ظاهر (اضغط للإخفاء)"}
              data-nav-id={`fav-team-island-${i}`}
              className={cn("focusable no-focus-scale h-8 px-2.5 rounded-full border text-[11px] font-black flex items-center gap-1",
                t.island === false ? "bg-white/5 border-white/10 text-white/35" : "bg-emerald-500/15 border-emerald-400/40 text-emerald-300")}>
              <Layers className="w-3.5 h-3.5" /> {t.island === false ? "المباريات فقط" : "الجزيرة"}
            </button>
            <button onClick={() => flip(t)} title="إزالة" data-nav-id={`fav-team-del-${i}`} className="focusable no-focus-scale w-8 h-8 rounded-full hover:bg-red-500/20 text-white/40 hover:text-red-300 flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </span>
        ))}
      </div>
    </section>
  );
}

/** Leagues seen in today's feed + the built-in table, for the league field's suggestions. */
function useKnownLeagues(): TopMatch["league"][] {
  const data = useLiveMatchesStore(s => s.data);
  return useMemo(() => {
    const out = new Map<string, TopMatch["league"]>();
    for (const m of (data?.matches ?? []) as TopMatch[]) out.set(leagueKey(m.league), m.league);
    return [...out.values()];
  }, [data]);
}

function LeagueChannelsSection() {
  const overrides = useMediaStore(s => s.leagueChannelOverrides) || {};
  const setLeagueChannels = useMediaStore(s => s.setLeagueChannels);
  const known = useKnownLeagues();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [editing, setEditing] = useState<TopMatch["league"] | null>(null);

  const entries = Object.entries(overrides).map(([k, v]) => {
    const i = k.indexOf("|");
    const title = (x: string) => x.replace(/(^|\s)([a-z])/g, (_, a, c) => a + c.toUpperCase());
    return { key: k, country: title(k.slice(0, i)), name: title(k.slice(i + 1)), channels: v };
  });

  // picking a suggestion fills the country too
  const pick = (v: string) => {
    setName(v);
    const l = known.find(x => x.name === v);
    if (l?.country) setCountry(l.country);
  };
  const add = () => {
    const n = name.trim(), ch = picked;
    if (!n || !ch.length) return;
    const key = leagueKey({ id: "", name: n, country: country.trim() || undefined });
    setLeagueChannels(key, Array.from(new Set([...(overrides[key] ?? []), ...ch])));
    setName(""); setCountry(""); setPicked([]);
  };

  return (
    <section className={box}>
      <h2 className="text-2xl font-black text-white flex items-center gap-3"><Link2 className="w-7 h-7 text-emerald-400" /> الدوريات وقنواتها</h2>
      <p className="text-sm text-white/40 font-bold">أضف دورياً واربطه بقناة أو أكثر: تظهر أولاً في كرت كل مباراة من هذا الدوري، وتُحفظ في السحابة</p>

      <form onSubmit={e => { e.preventDefault(); add(); }} className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <input value={name} onChange={e => pick(e.target.value)} list="known-leagues" placeholder="اسم الدوري كما يظهر في صفحة المباريات" dir="auto" className={input} data-nav-id="league-add-name" />
          <datalist id="known-leagues">
            {known.map(l => <option key={leagueKey(l)} value={l.name}>{l.country ?? ""}</option>)}
          </datalist>
          <input value={country} onChange={e => setCountry(e.target.value)} placeholder="الدولة (اختياري)" dir="auto" className={cn(input, "max-w-[11rem]")} data-nav-id="league-add-country" />
        </div>
        {/* channels: pick a category, then its channels (the search box filters both) */}
        <div className="rounded-3xl bg-black/30 border border-white/10 p-3 space-y-2">
          <p className="text-xs font-black text-white/50 flex items-center gap-2"><Tv className="w-4 h-4" /> القنوات</p>
          {picked.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {picked.map(c => (
                <span key={c} className="flex items-center gap-1 h-8 pr-3 pl-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs font-black">
                  <span dir="auto">{c}</span>
                  <button type="button" onClick={() => setPicked(picked.filter(x => x !== c))} className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
                </span>
              ))}
            </div>
          )}
          <IptvChannelSelect onPick={ch => setPicked(p => p.includes(ch.name) ? p : [...p, ch.name])} />
        </div>
        <button type="submit" disabled={!name.trim() || !picked.length} data-nav-id="league-add-save"
          className="focusable no-focus-scale w-full h-12 px-6 rounded-full bg-emerald-500 text-black font-black flex items-center justify-center gap-2 disabled:opacity-40">
          <Plus className="w-5 h-5" /> ربط الدوري بالقنوات المختارة{picked.length ? ` (${picked.length})` : ""}
        </button>
      </form>

      <div className="space-y-2">
        {entries.length === 0 && <p className="text-sm text-white/30 font-bold">لا توجد دوريات مربوطة بعد · القنوات الافتراضية ({LEAGUE_CHANNEL_RULES.length} دوري) تعمل تلقائياً</p>}
        {entries.map((e, i) => (
          <div key={e.key} className="flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
            <Trophy className="w-5 h-5 text-yellow-400/70 shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block truncate text-sm font-black text-white" dir="auto">{e.name}{e.country && <span className="text-white/40 font-bold"> · {e.country}</span>}</span>
              <span className="block truncate text-xs text-emerald-300 font-bold" dir="ltr">{e.channels.length ? e.channels.join(" · ") : "—"}</span>
            </span>
            <button onClick={() => setEditing({ id: "", name: e.name, country: e.country || undefined })} title="تعديل" data-nav-id={`league-edit-${i}`}
              className="focusable no-focus-scale w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-white/60 flex items-center justify-center"><Pencil className="w-4 h-4" /></button>
            <button onClick={() => setLeagueChannels(e.key, null)} title="حذف الربط" data-nav-id={`league-del-${i}`}
              className="focusable no-focus-scale w-9 h-9 rounded-full hover:bg-red-500/20 text-white/40 hover:text-red-300 flex items-center justify-center"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      {editing && <LeagueChannelsEditor league={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

/** Followed competitions: every match listed on the matches page, without counting as favourites. */
function FollowedLeaguesSection() {
  const followed = useMediaStore(s => s.followedLeagues) || [];
  const meta = useMediaStore(s => s.leagueMeta) || {};
  const toggle = useMediaStore(s => s.toggleFollowLeague);
  const setMeta = useMediaStore(s => s.setLeagueMeta);
  const known = useKnownLeagues();
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ name: string; country?: string; logo?: string }[]>([]);
  const [busy, setBusy] = useState(false);
  // search as you type: today's competitions + every competition ESPN knows, each with its country and logo
  // (many leagues are called "Premier League" - the country tells them apart)
  useEffect(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) { setFound([]); return; }
    const local = known.filter(l => l.name.toLowerCase().includes(t) || (l.country ?? "").toLowerCase().includes(t)).map(l => ({ name: l.name, country: l.country, logo: l.logo }));
    setFound(local);
    setBusy(true);
    const ctl = new AbortController();
    const h = setTimeout(() => {
      fetch(`/api/leagues?q=${encodeURIComponent(t)}`, { signal: ctl.signal }).then(r => r.json()).then(j => {
        const seen = new Set(local.map(l => leagueKey({ id: "", name: l.name, country: l.country })));
        setFound([...local, ...(j.leagues ?? []).filter((l: any) => !seen.has(leagueKey({ id: "", name: l.name, country: l.country })))]);
      }).catch(() => {}).finally(() => setBusy(false));
    }, 350);
    return () => { clearTimeout(h); ctl.abort(); };
  }, [q, known]);
  const follow = (l: { name: string; country?: string; logo?: string }) => {
    const key = leagueKey({ id: "", name: l.name, country: l.country });
    setMeta(key, { name: l.name, country: l.country, logo: l.logo });
    if (!followed.includes(key)) toggle(key);
    setQ("");
  };
  const title = (x: string) => x.replace(/(^|\s)([a-z])/g, (_, a, c) => a + c.toUpperCase());
  return (
    <section className={cn(box, "lg:col-span-2")}>
      <h2 className="text-2xl font-black text-white flex items-center gap-3"><BookmarkCheck className="w-7 h-7 text-sky-400" /> البطولات المتابعة</h2>
      <p className="text-sm text-white/40 font-bold">ابحث عن البطولة، تظهر بشعارها ودولتها، اضغطها لمتابعتها. كل مبارياتها تظهر في صفحة المباريات دون اعتبارها مفضلة</p>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث: Premier League، Saudi، Oman..." dir="auto" className={input} data-nav-id="follow-add-name" />
      {q.trim().length >= 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
          {found.map((l, i) => {
            const key = leagueKey({ id: "", name: l.name, country: l.country });
            const on = followed.includes(key);
            return (
              <button key={key + i} onClick={() => follow(l)} data-nav-id={`follow-found-${i}`} className={cn("focusable no-focus-scale flex items-center gap-3 h-14 px-3 rounded-2xl border text-right", on ? "bg-sky-500/20 border-sky-400/50" : "bg-white/5 border-white/10 hover:bg-white/10")}>
                <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">{l.logo ? <img src={l.logo} alt="" className="w-8 h-8 object-contain" /> : <BookmarkCheck className="w-5 h-5 text-white/30" />}</span>
                <span className="flex-1 min-w-0"><span className="block text-sm font-black text-white truncate" dir="auto">{l.name}</span><span className="block text-xs font-bold text-white/40 truncate" dir="auto">{l.country || "—"}</span></span>
                {on ? <BookmarkCheck className="w-5 h-5 text-sky-300" /> : <Plus className="w-5 h-5 text-white/50" />}
              </button>
            );
          })}
          {!found.length && <p className="text-sm text-white/30 font-bold">{busy ? "أبحث..." : "لا نتائج"}</p>}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {followed.length === 0 && <p className="text-sm text-white/30 font-bold">لا توجد بطولات متابعة</p>}
        {followed.map((k, i) => {
          const j = k.indexOf("|");
          const m = meta[k];
          return (
            <span key={k} className="flex items-center gap-2 h-11 pr-1.5 pl-1.5 rounded-full bg-sky-500/10 border border-sky-400/30">
              <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">{m?.logo ? <img src={m.logo} alt="" className="w-6 h-6 object-contain" /> : <BookmarkCheck className="w-4 h-4 text-sky-300" />}</span>
              <span className="text-sm font-black text-white" dir="auto">{m?.name ?? title(k.slice(j + 1))}{(m?.country ?? k.slice(0, j)) && <span className="text-white/40 font-bold"> · {m?.country ?? title(k.slice(0, j))}</span>}</span>
              <button onClick={() => { toggle(k); setMeta(k, null); }} title="إلغاء المتابعة" data-nav-id={`follow-del-${i}`} className="focusable no-focus-scale w-8 h-8 rounded-full hover:bg-red-500/20 text-white/40 hover:text-red-300 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </span>
          );
        })}
      </div>
    </section>
  );
}
