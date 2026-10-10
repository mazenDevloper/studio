"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useLiveMatches, useLiveMatchesStore } from "@/lib/live-matches";
import { matchDetailsUrl, goalAlertOn, type TopMatch } from "@/lib/match-core";
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

/** Two acts: the big "GOAL!" (alone), then the scorer card. Longer when there is a scorer to show. */
const showMs = (e: GoalEvent) => (e.scorer ? 7000 : 5600);
/** fraction of the show at which the card starts shrinking back; the normal islands return at that moment */
const SHRINK_AT = 0.9;
/** act 2 (scorer, score bar) starts here - act 1 ("GOAL!") has left the card by then: they never overlap */
const ACT2_MS = 2300;

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
    // only matches with the bell on (favourite teams by default, any other match from its card)
    const belled = useMediaStore.getState().belledMatchIds || [];
    const shown = events.filter(e => goalAlertOn(e.match, belled));
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
    try { navigator.vibrate?.([300, 150, 300, 150, 600]); } catch {}
    const D = showMs(current);
    const t = setTimeout(() => setQueue(q => q.slice(1)), D);
    // give the stage back to the other islands as soon as the card starts shrinking, not after it has gone
    const back = setTimeout(() => setCelebrating(false), D * SHRINK_AT);
    const el = islandRef.current;
    const anims: Animation[] = [];
    if (el && typeof el.animate === "function") {
      const at = (ms: number) => Math.min(1, ms / D);
      const fromLeft = current.side === "home"; // LTR card: the home team is on the left
      const mobile = window.innerWidth < 640;
      // The floating island itself grows into the card, holds, then shrinks back to a pill and fades.
      const W = Math.min(760, window.innerWidth * 0.94), H = mobile ? 236 : 230;
      const pill = { width: "220px", height: "64px", borderRadius: "32px" };
      const big = { width: `${W}px`, height: `${H}px`, borderRadius: "40px" };
      // easing per step (an effect-level easing would bend the whole timeline: the card used to shrink at ~55%)
      const ease = "cubic-bezier(.3,.7,.2,1)";
      anims.push(el.animate(
        [{ ...pill, opacity: 0, offset: 0 }, { ...pill, opacity: 1, offset: at(120), easing: ease }, { ...big, opacity: 1, offset: at(520) },
         { ...big, opacity: 1, offset: SHRINK_AT, easing: ease }, { ...pill, opacity: 0.6, offset: 0.97 }, { ...pill, opacity: 0, offset: 1 }],
        { duration: D, fill: "forwards" }));
      const q = (sel: string) => Array.from(el.querySelectorAll<HTMLElement>(sel));
      const run = (sel: string, frames: Keyframe[], o: KeyframeAnimationOptions) => q(sel).forEach(n => anims.push(n.animate(frames, { fill: "both", ...o })));

      // colour wipe across the card as it opens
      run(".gi-wipe", [{ transform: "skewX(-18deg) translateX(-120%)", opacity: 1 }, { transform: "skewX(-18deg) translateX(120%)", opacity: 1, offset: 0.85 }, { transform: "skewX(-18deg) translateX(130%)", opacity: 0 }],
        { duration: 800, delay: 330, easing: "cubic-bezier(.6,0,.2,1)" });
      // act 1: "GOAL!" alone - slams in, pulses, then leaves before act 2 begins
      run(".gi-act1", [{ opacity: 0, offset: 0 }, { opacity: 0, offset: at(480) }, { opacity: 1, offset: at(560) }, { opacity: 1, offset: at(1950) },
        { opacity: 0, offset: at(ACT2_MS - 60) }, { opacity: 0, offset: 1 }], { duration: D });
      run(".gi-goal", [{ transform: "scale(2.6)", filter: "blur(10px)", letterSpacing: "0.4em" }, { transform: "scale(0.94)", filter: "blur(0)", letterSpacing: "0", offset: 0.75 }, { transform: "scale(1)", filter: "blur(0)", letterSpacing: "0" }],
        { duration: 620, delay: 480, easing: "cubic-bezier(.2,.9,.2,1)" });
      run(".gi-goal-out", [{ transform: "translateY(0) scale(1)" }, { transform: "translateY(-28%) scale(0.72)" }],
        { duration: 330, delay: 1960, easing: "cubic-bezier(.5,0,.75,0)" });
      // act 2: label, scorer photo from the scoring side, name, score bar in front, scoring digit pops
      run(".gi-act2", [{ opacity: 0, offset: 0 }, { opacity: 0, offset: at(ACT2_MS) }, { opacity: 1, offset: at(ACT2_MS + 120) }, { opacity: 1, offset: SHRINK_AT - 0.03 }, { opacity: 0, offset: SHRINK_AT }, { opacity: 0, offset: 1 }],
        { duration: D });
      run(".gi-label", [{ transform: "translateY(-14px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: 360, delay: ACT2_MS, easing: "ease-out" });
      run(".gi-photo", [{ transform: `translateX(${fromLeft ? -140 : 140}%) scale(0.6)`, opacity: 0 }, { transform: "translateX(0) scale(1.06)", opacity: 1, offset: 0.75 }, { transform: "translateX(0) scale(1)", opacity: 1 }],
        { duration: 620, delay: ACT2_MS + 60, easing: "cubic-bezier(.2,.9,.25,1.1)" });
      run(".gi-name", [{ transform: `translateX(${fromLeft ? 40 : -40}px)`, opacity: 0 }, { transform: "translateX(0)", opacity: 1 }], { duration: 460, delay: ACT2_MS + 330, easing: "ease-out" });
      run(".gi-score", [{ transform: "translateY(36px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: 460, delay: ACT2_MS + 180, easing: "cubic-bezier(.2,.9,.2,1)" });
      run(".gi-pop", [{ transform: "scale(1)" }, { transform: "scale(1.9)", color: "#00ff85", offset: 0.35 }, { transform: "scale(1)", color: "#00ff85" }], { duration: 700, delay: ACT2_MS + 650, easing: "ease-out" });
    }
    return () => { clearTimeout(t); clearTimeout(back); anims.forEach(a => a.cancel()); };
  }, [current, setCelebrating]);

  useEffect(() => () => setCelebrating(false), [setCelebrating]);

  if (!current) return null;
  const { match: m, side, scorer } = current;
  const fromLeft = side === "home";
  const scoringLogo = side === "home" ? m.home.logo : m.away.logo;
  const minute = scorer?.minute || (m.elapsed ? `${m.elapsed}'` : "");

  return (
    // a full-width frame that clips at the screen edges: nothing in the animation can ever widen the page (Safari
    // doesn't clip moving / scaled children of a rounded overflow-hidden box, so the card also gets its own layer)
    <div className="fixed top-0 inset-x-0 pt-6 pb-16 overflow-hidden z-[100005] pointer-events-none flex justify-center" dir="ltr">
      <div
        ref={islandRef}
        key={current.key}
        onClick={() => setQueue(q => q.slice(1))}
        className="pointer-events-auto relative overflow-hidden shrink-0 bg-[#1a0020] border-2 border-[#00ff85]/70 shadow-[0_0_60px_rgba(0,255,133,0.35)] [isolation:isolate] [transform:translateZ(0)] [-webkit-mask-image:-webkit-radial-gradient(white,black)]"
        style={{ width: 220, height: 64, borderRadius: 32 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#37003c] via-[#24002a] to-[#0b0010]" />
        <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full bg-[#e90052]/25 blur-3xl" />
        <div className="absolute -left-16 -bottom-24 w-72 h-72 rounded-full bg-[#04f5ff]/20 blur-3xl" />
        <div className="gi-wipe absolute inset-y-0 -left-[10%] w-[120%] bg-gradient-to-r from-[#00ff85] via-[#04f5ff] to-[#e90052]" />

        {/* ACT 1 - the word alone, centred */}
        <div className="gi-act1 absolute inset-0 flex items-center justify-center">
          <div className="gi-goal-out">
            <div className="gi-goal text-[4.2rem] md:text-[6.5rem] leading-none font-black italic tracking-tight text-white [text-shadow:0_0_30px_rgba(0,255,133,0.9),0_6px_24px_rgba(0,0,0,0.8)]">GOAL!</div>
          </div>
        </div>

        {/* ACT 2 - scorer card; the score bar sits in front of the photo */}
        <div className="gi-act2 absolute inset-0">
          <div className="gi-label absolute top-3 inset-x-4 flex items-center gap-2 min-w-0">
            <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-[#00ff85] text-[#37003c] text-xs md:text-sm font-black italic">GOAL ⚽</span>
            <span className="text-[11px] md:text-xs text-white/70 font-bold truncate">{m.league.name}{minute ? ` · ${minute}` : ""}</span>
          </div>

          {scorer ? (
            <>
              <div className={cn("gi-photo absolute bottom-3 z-10", fromLeft ? "left-4" : "right-4")}>
                <div className="relative w-[96px] h-[96px] md:w-[136px] md:h-[136px] rounded-full p-[3px] bg-gradient-to-br from-[#00ff85] via-[#04f5ff] to-[#e90052] shadow-[0_0_34px_rgba(0,255,133,0.5)]">
                  {scorer.photo
                    ? <img src={scorer.photo} alt="" className="w-full h-full rounded-full object-cover bg-[#24002a]" />
                    : <div className="w-full h-full rounded-full bg-white flex items-center justify-center">{scoringLogo && <img src={scoringLogo} alt="" className="w-3/5 h-3/5 object-contain" />}</div>}
                  {scorer.photo && scoringLogo && (
                    <span className={cn("absolute -bottom-0.5 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white ring-2 ring-[#00ff85] flex items-center justify-center", fromLeft ? "-right-1" : "-left-1")}>
                      <img src={scoringLogo} alt="" className="w-5 h-5 md:w-7 md:h-7 object-contain" />
                    </span>
                  )}
                </div>
              </div>
              <div className={cn("gi-name absolute top-12 md:top-14 z-10", fromLeft ? "left-[122px] md:left-[168px] right-4 text-left" : "right-[122px] md:right-[168px] left-4 text-right")}>
                <div className="text-xl md:text-[2rem] leading-tight font-black text-white truncate">{scorer.player}</div>
                <div className="mt-0.5 text-xs md:text-sm font-black text-[#00ff85] truncate">
                  {scorer.minute}{scorer.note ? ` (${scorer.note})` : ""}{scorer.assist ? <span className="text-white/60 font-bold"> · assist {scorer.assist}</span> : null}
                </div>
              </div>
              {/* the score fills the space beside the photo, under the name */}
              <div className={cn("absolute bottom-3 top-[46%] md:top-[57%] z-20 flex", fromLeft ? "left-[122px] md:left-[168px] right-4" : "right-[122px] md:right-[168px] left-4")}>
                <ScoreBar m={m} side={side} fill />
              </div>
            </>
          ) : (
            <div className="absolute top-12 bottom-3 inset-x-0 flex items-center justify-center z-20">
              <ScoreBar m={m} side={side} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Logos + score; the scoring team's number pops. In front of everything else in act 2. */
function ScoreBar({ m, side, small = false, fill = false }: { m: TopMatch; side: "home" | "away"; small?: boolean; fill?: boolean }) {
  if (fill) {
    const big = (src: string | undefined, name: string) => src
      ? <img src={src} alt="" className="h-[62%] max-h-12 md:max-h-20 w-auto aspect-square object-contain shrink-0" />
      : <span className="text-lg font-black text-white/70">{name.slice(0, 3).toUpperCase()}</span>;
    return (
      <div className="gi-score w-full h-full min-w-0 overflow-hidden flex items-center justify-around gap-1.5 px-2 md:px-4 rounded-[1.75rem] bg-black/75 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-md">
        {big(m.home.logo, m.home.name)}
        <span className="font-black tabular-nums text-white flex items-center gap-1.5 md:gap-3 text-[3.25rem] md:text-8xl leading-none shrink-0">
          <span className={cn("inline-block", side === "home" && "gi-pop")}>{m.score.home ?? 0}</span>
          <span className="text-white/40">-</span>
          <span className={cn("inline-block", side === "away" && "gi-pop")}>{m.score.away ?? 0}</span>
        </span>
        {big(m.away.logo, m.away.name)}
      </div>
    );
  }
  const logo = (src: string | undefined, name: string) => src
    ? <img src={src} alt="" className={cn("object-contain", small ? "w-10 h-10 md:w-12 md:h-12" : "w-16 h-16 md:w-24 md:h-24")} />
    : <span className="text-xs font-black text-white/70">{name.slice(0, 3).toUpperCase()}</span>;
  return (
    <div className={cn("gi-score flex items-center rounded-full bg-black/75 border border-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-md", small ? "gap-3 px-4 py-2" : "gap-5 md:gap-7 px-6 md:px-8 py-3")}>
      {logo(m.home.logo, m.home.name)}
      {!small && <span className="hidden md:block text-sm font-black text-white/80 max-w-[9rem] truncate">{m.home.name}</span>}
      <span className={cn("font-black tabular-nums text-white flex items-center gap-2", small ? "text-4xl md:text-5xl" : "text-7xl md:text-8xl")}>
        <span className={cn("inline-block", side === "home" && "gi-pop")}>{m.score.home ?? 0}</span>
        <span className="text-white/40">-</span>
        <span className={cn("inline-block", side === "away" && "gi-pop")}>{m.score.away ?? 0}</span>
      </span>
      {!small && <span className="hidden md:block text-sm font-black text-white/80 max-w-[9rem] truncate">{m.away.name}</span>}
      {logo(m.away.logo, m.away.name)}
    </div>
  );
}
