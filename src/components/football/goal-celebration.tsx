"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveMatches, useLiveMatchesStore } from "@/lib/live-matches";
import { matchDetailsUrl, matchHideKey, type TopMatch } from "@/lib/match-core";
import { useMediaStore } from "@/lib/store";
import type { MatchDetails, Scorer } from "@/lib/match-details";

interface GoalEvent { key: string; match: TopMatch; side: "home" | "away"; scorer?: Scorer }

/** Longest we hold a goal back while looking up who scored (photo + name from 365Scores). */
const SCORER_WAIT_MS = 3000;

const minuteValue = (s: Scorer) => { const [a, b] = s.minute.replace(/'/g, "").split("+"); return (parseFloat(a) || 0) + (parseFloat(b) || 0) / 100; };

/** The latest goal of `side`, straight from the match details (fresh, not cached). */
async function findScorer(m: TopMatch, side: "home" | "away"): Promise<Scorer | undefined> {
  try {
    const res = await Promise.race([
      fetch(matchDetailsUrl(m, true), { cache: "no-store" }).then(r => (r.ok ? r.json() as Promise<MatchDetails> : null)),
      new Promise<null>(r => setTimeout(() => r(null), SCORER_WAIT_MS)),
    ]);
    const list = (res?.scorers ?? []).filter(s => s.side === side && s.player);
    return list.sort((a, b) => minuteValue(a) - minuteValue(b)).at(-1);
  } catch { return undefined; }
}

const withScorers = (events: GoalEvent[]) => Promise.all(events.map(async e => ({ ...e, scorer: e.scorer ?? await findScorer(e.match, e.side) })));

const SHOW_MS = 5200;
/** fraction of SHOW_MS at which the card starts shrinking back; the normal islands return at that moment */
const SHRINK_AT = 0.88;

/** Dispatch this to preview the animation: window.dispatchEvent(new CustomEvent(GOAL_TEST_EVENT)) */
export const GOAL_TEST_EVENT = "goal-celebration-test";

/**
 * Watches today's important matches and plays a Premier-League-style "GOAAAAAL" inside an expanded floating island
 * whenever any score goes up. The first load only seeds the scores (no animation for goals scored earlier).
 */
export function GoalCelebration() {
  const { data } = useLiveMatches();
  const prev = useRef<Map<string, { h: number; a: number }> | null>(null);
  const [queue, setQueue] = useState<GoalEvent[]>([]);

  useEffect(() => {
    if (!data) return;
    const seeding = prev.current === null;
    const next = new Map<string, { h: number; a: number }>();
    const events: GoalEvent[] = [];
    for (const m of data.matches) {
      if (m.score.home === null || m.score.away === null) continue;
      const cur = { h: m.score.home, a: m.score.away };
      const old = prev.current?.get(m.id);
      if (!seeding && old) {
        if (cur.h > old.h) events.push({ key: `${m.id}-h${cur.h}`, match: m, side: "home" });
        if (cur.a > old.a) events.push({ key: `${m.id}-a${cur.a}`, match: m, side: "away" });
      }
      next.set(m.id, cur);
    }
    // keep scores of matches that dropped out of this response so they don't re-trigger later
    prev.current?.forEach((v, k) => { if (!next.has(k)) next.set(k, v); });
    prev.current = next;
    // a match hidden from the floating island (eye button) doesn't get the goal island either
    const skipped = useMediaStore.getState().skippedMatchIds || [];
    const shown = events.filter(e => !skipped.includes(matchHideKey(e.match)));
    if (shown.length) withScorers(shown).then(full => setQueue(q => [...q, ...full]));
  }, [data]);

  useEffect(() => {
    const onTest = () => {
      const m = data?.matches?.[0];
      const demo: TopMatch = m ?? {
        id: "demo", league: { id: "demo", name: "Premier League" },
        home: { id: "1", name: "Arsenal" }, away: { id: "2", name: "Chelsea" },
        timestamp: Math.floor(Date.now() / 1000), omanTime: "", status: "live", statusText: "", elapsed: 67,
        score: { home: 1, away: 0 }, channels: [], importance: 100,
      };
      const match = { ...demo, score: { home: (demo.score.home ?? 0) + (m ? 1 : 0), away: demo.score.away ?? 0 } };
      const ev: GoalEvent = { key: `test-${Date.now()}`, match, side: "home" };
      // preview with the real last scorer of that match when it has one
      (m ? withScorers([{ ...ev, match: demo }]).then(([e]) => ({ ...ev, scorer: e.scorer })) : Promise.resolve(ev))
        .then(e => setQueue(q => [...q, e]));
    };
    window.addEventListener(GOAL_TEST_EVENT, onTest);
    return () => window.removeEventListener(GOAL_TEST_EVENT, onTest);
  }, [data]);

  const current = queue[0];
  const islandRef = useRef<HTMLDivElement>(null);
  const setCelebrating = useLiveMatchesStore(st => st.setCelebrating);

  useEffect(() => {
    setCelebrating(!!current);
    if (!current) return;
    const t = setTimeout(() => setQueue(q => q.slice(1)), SHOW_MS);
    // give the stage back to the other islands as soon as the card starts shrinking, not after it has gone
    const back = setTimeout(() => setCelebrating(false), SHOW_MS * SHRINK_AT);
    const el = islandRef.current;
    const anims: Animation[] = [];
    if (el && typeof el.animate === "function") {
      // The floating island itself grows into the goal card, holds, then shrinks back to a pill and fades.
      const W = Math.min(760, window.innerWidth * 0.94), H = (window.innerWidth < 640 ? 230 : 200) + (current.scorer ? 26 : 0);
      const pill = { width: "220px", height: "64px", borderRadius: "32px" };
      const big = { width: `${W}px`, height: `${H}px`, borderRadius: "44px" };
      anims.push(el.animate(
        [{ ...pill, opacity: 0, offset: 0 }, { ...pill, opacity: 1, offset: 0.04 }, { ...big, opacity: 1, offset: 0.14 },
         { ...big, opacity: 1, offset: SHRINK_AT }, { ...pill, opacity: 0.6, offset: 0.97 }, { ...pill, opacity: 0, offset: 1 }],
        { duration: SHOW_MS, easing: "cubic-bezier(.3,.7,.2,1)", fill: "forwards" }));
      const q = (sel: string) => Array.from(el.querySelectorAll<HTMLElement>(sel));
      q(".gi-content").forEach(c => anims.push(c.animate(
        [{ opacity: 0, offset: 0 }, { opacity: 0, offset: 0.12 }, { opacity: 1, offset: 0.18 }, { opacity: 1, offset: SHRINK_AT - 0.03 }, { opacity: 0, offset: SHRINK_AT }, { opacity: 0, offset: 1 }],
        { duration: SHOW_MS, fill: "forwards" })));
      q(".gi-sweep").forEach(c => anims.push(c.animate(
        [{ transform: "skewX(-20deg) translateX(-130%)" }, { transform: "skewX(-20deg) translateX(330%)" }],
        { duration: 1200, delay: 750, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" })));
      q(".gi-text").forEach(c => {
        anims.push(c.animate(
          [{ transform: "scale(2.2)", letterSpacing: "0.5em", filter: "blur(8px)" }, { transform: "scale(1)", letterSpacing: "-0.01em", filter: "blur(0)" }],
          { duration: 800, delay: 900, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" }));
        anims.push(c.animate([{ backgroundPosition: "0% 0" }, { backgroundPosition: "300% 0" }], { duration: 2400, delay: 1700, iterations: Infinity }));
      });
      q(".gi-photo").forEach(c => anims.push(c.animate(
        [{ opacity: 0, transform: "translateY(30%) scale(0.85)" }, { opacity: 0.95, transform: "translateY(0) scale(1)" }],
        { duration: 700, delay: 700, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" })));
      q(".gi-scorer").forEach(c => anims.push(c.animate(
        [{ transform: "scale(0) rotate(-140deg)" }, { transform: "scale(1.15) rotate(8deg)", offset: 0.7 }, { transform: "scale(1) rotate(0)" }],
        { duration: 800, delay: 800, easing: "ease-out", fill: "both" })));
    }
    return () => { clearTimeout(t); clearTimeout(back); anims.forEach(a => a.cancel()); };
  }, [current, setCelebrating]);

  useEffect(() => () => setCelebrating(false), [setCelebrating]);

  if (!current) return null;
  const { match: m, side, scorer } = current;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100005] pointer-events-none" dir="ltr">
      <div
        ref={islandRef}
        key={current.key}
        onClick={() => setQueue(q => q.slice(1))}
        className="pointer-events-auto relative overflow-hidden mx-auto bg-gradient-to-br from-[#37003c] via-[#24002a] to-[#0b0010] border-2 border-[#00ff85]/70 shadow-[0_0_60px_rgba(0,255,133,0.35)]"
        style={{ width: 220, height: 64, borderRadius: 32 }}
      >
        <div className="gi-sweep absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[#04f5ff]/40 to-transparent" />
        <div className="gi-content absolute inset-0 flex items-center justify-between gap-3 px-5 md:px-8">
          <TeamBadge logo={m.home.logo} name={m.home.name} scorer={side === "home"} />
          <div className="relative self-stretch flex flex-col items-center justify-center min-w-0 px-2">
            {/* the scorer's photo, large behind the score; the texts sit in front of it (z-10) */}
            {scorer?.photo && (
              <div className="absolute z-0 inset-x-0 bottom-0 h-[118%] flex justify-center pointer-events-none">
                <img src={scorer.photo} alt="" className="gi-photo h-full w-auto max-w-none object-contain [mask-image:linear-gradient(to_top,transparent_0%,black_35%)]" />
              </div>
            )}
            <div className="relative z-10 gi-text text-4xl md:text-6xl font-black italic leading-none bg-gradient-to-r from-[#00ff85] via-[#04f5ff] to-[#00ff85] bg-[length:300%_100%] bg-clip-text text-transparent">GOAAAAAL!</div>
            <div className="relative z-10 mt-2 text-4xl md:text-5xl font-black text-white tabular-nums [text-shadow:0_3px_14px_rgba(0,0,0,0.95)]">{m.score.home ?? 0} - {m.score.away ?? 0}</div>
            {scorer && (
              <div className="relative z-10 mt-1 text-sm md:text-base font-black text-[#00ff85] truncate max-w-[18rem] [text-shadow:0_2px_10px_rgba(0,0,0,0.95)]">
                ⚽ {scorer.player} {scorer.minute}{scorer.note ? ` (${scorer.note})` : ""}
              </div>
            )}
            <div className="relative z-10 mt-0.5 text-[11px] md:text-xs font-bold text-white/70 truncate max-w-[16rem] [text-shadow:0_2px_8px_rgba(0,0,0,0.95)]">{m.league.name}{!scorer && m.elapsed ? ` · ${m.elapsed}'` : ""}</div>
          </div>
          <TeamBadge logo={m.away.logo} name={m.away.name} scorer={side === "away"} />
        </div>
      </div>
    </div>
  );
}

/** Scoring team in full colour with a neon ring (the scorer's photo with the club badge when known); the other team greyed out. */
function TeamBadge({ logo, name, scorer, photo }: { logo?: string; name: string; scorer: boolean; photo?: string }) {
  return (
    <div className={`flex flex-col items-center gap-1 w-24 md:w-32 shrink-0 ${scorer ? "gi-scorer" : "opacity-40 grayscale"}`}>
      <div className={`relative w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center ${scorer ? "bg-white shadow-[0_0_30px_rgba(0,255,133,0.8)] ring-4 ring-[#00ff85]" : "bg-white/70"}`}>
        {photo
          ? <img src={photo} alt="" className="w-full h-full rounded-full object-cover bg-gradient-to-b from-[#04f5ff]/30 to-[#37003c]" />
          : logo ? <img src={logo} alt="" className="w-12 h-12 md:w-16 md:h-16 object-contain" /> : <span className="text-lg font-black text-[#37003c]">{name.slice(0, 3).toUpperCase()}</span>}
        {photo && logo && (
          <span className="absolute -bottom-1 -right-1 w-7 h-7 md:w-9 md:h-9 rounded-full bg-white ring-2 ring-[#00ff85] flex items-center justify-center">
            <img src={logo} alt="" className="w-5 h-5 md:w-6 md:h-6 object-contain" />
          </span>
        )}
      </div>
      <span className={`text-[11px] md:text-sm font-black truncate max-w-full ${scorer ? "text-[#00ff85]" : "text-white/70"}`}>{name}</span>
    </div>
  );
}
