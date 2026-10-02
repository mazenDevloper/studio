/**
 * The prayer-times row for a date ("YYYY-MM-DD"). When that date isn't in the data yet (a month not uploaded),
 * the closest available day is used - prayer times move by about a minute a day - instead of the first row of
 * the data, which could be months away.
 */
export function prayerDayFor<T extends { date?: string }>(rows: T[] | undefined | null, dateStr: string): T | undefined {
  if (!rows?.length) return undefined;
  const exact = rows.find(r => r?.date === dateStr);
  if (exact) return exact;
  const target = Date.parse(`${dateStr}T00:00:00Z`);
  if (!Number.isFinite(target)) return rows[0];
  let best: T | undefined, bestGap = Infinity;
  for (const r of rows) {
    const t = Date.parse(`${r?.date}T00:00:00Z`);
    if (!Number.isFinite(t)) continue;
    const gap = Math.abs(t - target);
    if (gap < bestGap) { best = r; bestGap = gap; }
  }
  return best ?? rows[0];
}

/** The device's local calendar date as YYYY-MM-DD (toISOString is UTC: in Oman it is yesterday until 04:00). */
export function localYmd(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
