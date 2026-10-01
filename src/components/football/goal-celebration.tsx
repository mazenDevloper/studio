"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveMatches } from "@/lib/live-matches";
import type { TopMatch } from "@/lib/match-core";

interface GoalEvent { key: string; match: TopMatch; side: "home" | "away"; }

const SHOW_MS = 6500;

/** Dispatch this to preview the animation: window.dispatchEvent(new CustomEvent(GOAL_TEST_EVENT)) */
export const GOAL_TEST_EVENT = "goal-celebration-test";

/**
 * Watches today's important matches and plays a Premier-League-style "GOAAAAAL" overlay
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
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setQueue(q => q.slice(1)), SHOW_MS);
    const root = rootRef.current;
    const anims: Animation[] = [];
    if (root && typeof root.animate === "function") {
      const q = (sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));
      const ease = "cubic-bezier(.2,.8,.2,1)";
      // Grow out of the floating island (top-centre pill), hold, then shrink back into it — like a Dynamic Island.
      const pill = "inset(22px calc(50% - 120px) calc(100% - 86px) calc(50% - 120px) round 32px)";
      const full = "inset(0px 0px 0px 0px round 0px)";
      anims.push(root.animate(
        [
          { clipPath: pill, opacity: 0 },
          { clipPath: pill, opacity: 1, offset: 0.04 },
          { clipPath: full, opacity: 1, offset: 0.13 },
          { clipPath: full, opacity: 1, offset: 0.86 },
          { clipPath: pill, opacity: 1, offset: 0.95 },
          { clipPath: pill, opacity: 0 },
        ],
        { duration: SHOW_MS, easing: "cubic-bezier(.3,.7,.2,1)", fill: "forwards" }));
      q(".goal-sweep").forEach((el, i) => anims.push(el.animate(
        [{ transform: "skewY(-12deg) translateX(-110%)" }, { transform: "skewY(-12deg) translateX(0)", offset: 0.6 }, { transform: "skewY(-12deg) translateX(8%)", opacity: 0.55 }],
        { duration: 1100, delay: 50 + i * 150, easing: ease, fill: "both" })));
      q(".goal-logo").forEach(el => anims.push(el.animate(
        [{ transform: "scale(0) rotate(-180deg)", opacity: 0 }, { transform: "scale(1) rotate(0)", opacity: 1 }],
        { duration: 900, delay: 600, easing: "cubic-bezier(.17,.89,.32,1.49)", fill: "both" })));
      q(".goal-text").forEach(el => {
        anims.push(el.animate(
          [{ transform: "scale(3)", letterSpacing: "0.6em", opacity: 0, filter: "blur(12px)" }, { transform: "scale(1)", letterSpacing: "-0.02em", opacity: 1, filter: "blur(0)" }],
          { duration: 1000, delay: 900, easing: ease, fill: "both" }));
        anims.push(el.animate([{ backgroundPosition: "0% 0" }, { backgroundPosition: "300% 0" }], { duration: 2400, delay: 1900, iterations: Infinity }));
      });
      q(".goal-score").forEach(el => anims.push(el.animate(
        [{ transform: "translateY(40px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
        { duration: 700, delay: 1500, easing: "ease-out", fill: "both" })));
    }
    return () => { clearTimeout(t); anims.forEach(a => a.cancel()); };
  }, [current]);

  if (!current) return null;
  const { match: m, side } = current;
  const scorer = side === "home" ? m.home : m.away;

  return (
    <div ref={rootRef} key={current.key} className="goal-overlay fixed inset-0 z-[100005] overflow-hidden flex items-center justify-center" onClick={() => setQueue(q => q.slice(1))} dir="ltr">
      <div className="absolute inset-0 bg-[#1a0020]/80 backdrop-blur-sm" />
      {/* diagonal colour sweeps */}
      <div className="goal-sweep goal-sweep-1" />
      <div className="goal-sweep goal-sweep-2" />
      <div className="goal-sweep goal-sweep-3" />

      <div className="relative flex flex-col items-center gap-6 px-6 text-center">
        <div className="goal-logo w-40 h-40 md:w-52 md:h-52 rounded-full bg-white/95 flex items-center justify-center shadow-[0_0_80px_rgba(0,255,133,0.6)]">
          {scorer.logo ? <img src={scorer.logo} alt="" className="w-28 h-28 md:w-36 md:h-36 object-contain" /> : <span className="text-5xl font-black text-[#37003c]">{scorer.name.slice(0, 3).toUpperCase()}</span>}
        </div>

        <div className="goal-text text-6xl md:text-[9rem] leading-none font-black italic tracking-tight">GOAAAAAL!</div>

        <div className="goal-score flex items-center gap-4 md:gap-6 bg-[#37003c] border-2 border-[#00ff85] rounded-2xl px-5 py-3 md:px-8 md:py-4 shadow-2xl">
          <TeamChip name={m.home.name} logo={m.home.logo} active={side === "home"} />
          <span className="text-4xl md:text-6xl font-black text-white tabular-nums">{m.score.home ?? 0} - {m.score.away ?? 0}</span>
          <TeamChip name={m.away.name} logo={m.away.logo} active={side === "away"} />
        </div>
        <div className="goal-score text-sm md:text-base font-bold text-white/80">
          {m.league.name}{m.elapsed ? ` · ${m.elapsed}'` : ""}
        </div>
      </div>
    </div>
  );
}

function TeamChip({ name, logo, active }: { name: string; logo?: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${active ? "text-[#00ff85]" : "text-white/80"}`}>
      {logo && <img src={logo} alt="" className="w-8 h-8 md:w-10 md:h-10 object-contain" />}
      <span className="text-sm md:text-xl font-black max-w-[9rem] truncate">{name}</span>
    </div>
  );
}
