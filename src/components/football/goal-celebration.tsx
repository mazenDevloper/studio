"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveMatches, useLiveMatchesStore } from "@/lib/live-matches";
import type { TopMatch } from "@/lib/match-core";

interface GoalEvent { key: string; match: TopMatch; side: "home" | "away"; }

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
    if (events.length) setQueue(q => [...q, ...events]);
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
      setQueue(q => [...q, { key: `test-${Date.now()}`, match, side: "home" }]);
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
      const W = Math.min(760, window.innerWidth * 0.94), H = window.innerWidth < 640 ? 230 : 200;
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
      q(".gi-scorer").forEach(c => anims.push(c.animate(
        [{ transform: "scale(0) rotate(-140deg)" }, { transform: "scale(1.15) rotate(8deg)", offset: 0.7 }, { transform: "scale(1) rotate(0)" }],
        { duration: 800, delay: 800, easing: "ease-out", fill: "both" })));
    }
    return () => { clearTimeout(t); clearTimeout(back); anims.forEach(a => a.cancel()); };
  }, [current, setCelebrating]);

  useEffect(() => () => setCelebrating(false), [setCelebrating]);

  if (!current) return null;
  const { match: m, side } = current;

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
          <div className="flex flex-col items-center min-w-0">
            <div className="gi-text text-4xl md:text-6xl font-black italic leading-none bg-gradient-to-r from-[#00ff85] via-[#04f5ff] to-[#00ff85] bg-[length:300%_100%] bg-clip-text text-transparent">GOAAAAAL!</div>
            <div className="mt-2 text-4xl md:text-5xl font-black text-white tabular-nums">{m.score.home ?? 0} - {m.score.away ?? 0}</div>
            <div className="mt-1 text-[11px] md:text-xs font-bold text-white/60 truncate max-w-[16rem]">{m.league.name}{m.elapsed ? ` · ${m.elapsed}'` : ""}</div>
          </div>
          <TeamBadge logo={m.away.logo} name={m.away.name} scorer={side === "away"} />
        </div>
      </div>
    </div>
  );
}

/** Scoring team in full colour with a neon ring; the other team greyed out. */
function TeamBadge({ logo, name, scorer }: { logo?: string; name: string; scorer: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 w-24 md:w-32 shrink-0 ${scorer ? "gi-scorer" : "opacity-40 grayscale"}`}>
      <div className={`w-16 h-16 md:w-24 md:h-24 rounded-full flex items-center justify-center ${scorer ? "bg-white shadow-[0_0_30px_rgba(0,255,133,0.8)] ring-4 ring-[#00ff85]" : "bg-white/70"}`}>
        {logo ? <img src={logo} alt="" className="w-12 h-12 md:w-16 md:h-16 object-contain" /> : <span className="text-lg font-black text-[#37003c]">{name.slice(0, 3).toUpperCase()}</span>}
      </div>
      <span className={`text-[11px] md:text-sm font-black truncate max-w-full ${scorer ? "text-[#00ff85]" : "text-white/70"}`}>{name}</span>
    </div>
  );
}
