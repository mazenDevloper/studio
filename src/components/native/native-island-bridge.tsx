"use client";

import { useEffect, useMemo, useState } from "react";
import { useMediaStore, isDoneToday } from "@/lib/store";
import { favSpecString } from "@/lib/match-core";
import { MATCHES_LIMIT } from "@/lib/live-matches";
import { prayerDayFor, localYmd } from "@/lib/prayer-day";
import { nativeIsland } from "@/lib/native-app";

const tToM = (t: string) => { if (!t) return 0; const [h, m] = t.split(":").map(Number); return h * 60 + m; };

/**
 * Inside the Android app: tells the native floating island (shown above other apps while the app is in the
 * background) what to follow - the matches API address with the favourite teams, the pinned matches, and the
 * adhan / iqamah times of today and tomorrow (it counts them down by itself). Renders nothing.
 */
export function NativeIslandBridge() {
  const [native, setNative] = useState(false);
  const favoriteTeams = useMediaStore(s => s.favoriteTeams);
  const pinned = useMediaStore(s => s.pinnedMatches);
  const prayerTimes = useMediaStore(s => s.prayerTimes);
  const prayerSettings = useMediaStore(s => s.prayerSettings);
  const generalAzkar = useMediaStore(s => s.generalAzkar);
  // the day changes at midnight: rebuild the prayer list then
  const [day, setDay] = useState(() => localYmd());

  useEffect(() => {
    setNative(!!nativeIsland());
    const t = setInterval(() => setDay(localYmd()), 60_000);
    return () => clearInterval(t);
  }, []);

  const config = useMemo(() => {
    if (!native) return null;
    // only the teams whose island switch is on: the native island shows the matches flagged favourite
    const teams = (favoriteTeams || []).filter(t => t?.name && t.island !== false).map(favSpecString);
    const pins = (pinned || []).flatMap(p => [p.home, p.away]);
    const q = new URLSearchParams({ limit: String(MATCHES_LIMIT) });
    if (teams.length) q.set("teams", teams.join("|"));
    if (pins.length) q.set("pins", pins.join("|"));

    const countdowns: { title: string; at: number; kind: "azan" | "iqamah" }[] = [];
    for (const offset of [0, 1]) {
      const d = new Date(); d.setDate(d.getDate() + offset); d.setHours(0, 0, 0, 0);
      const row: any = prayerDayFor(prayerTimes, localYmd(d));
      if (!row) continue;
      for (const s of prayerSettings || []) {
        const ref = s.id === "duha" ? row.sunrise : row[s.id];
        if (!ref) continue;
        const azanAt = d.getTime() + (tToM(ref) + (s.id === "duha" ? 15 : 0) + s.offsetMinutes) * 60_000;
        if (s.showCountdown !== false) countdowns.push({ title: `${s.name}`, at: azanAt, kind: "azan" });
        if (s.iqamahDuration > 0) countdowns.push({ title: `إقامة ${s.name}`, at: azanAt + s.iqamahDuration * 60_000, kind: "iqamah" });
      }
    }
    return JSON.stringify({
      apiUrl: `${location.origin}/api/matches?${q}`,
      pins: (pinned || []).map(p => ({ home: p.home, away: p.away })),
      countdowns: countdowns.filter(c => c.at > Date.now() - 60_000),
      // the day's dhikr reminders: islands like on the site (shown when the native island is expanded)
      azkar: (generalAzkar || []).map(a => ({ id: a.id, label: a.label, done: isDoneToday(a) })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [native, favoriteTeams, pinned, prayerTimes, prayerSettings, generalAzkar, day]);

  useEffect(() => {
    if (config) nativeIsland()?.configure({ config }).catch(() => {});
  }, [config]);

  return null;
}
