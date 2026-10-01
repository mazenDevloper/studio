export const OMAN_TZ = "Asia/Muscat"; // UTC+4, no DST

/** Today's calendar date in Oman as YYYY-MM-DD (never the server's UTC date). */
export function omanDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: OMAN_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** HH:mm (24h) in Oman time for a unix timestamp in seconds. */
export function omanTime(unixSeconds: number): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: OMAN_TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(unixSeconds * 1000));
}

/** Arabic long date for Oman, e.g. "الأربعاء، ١ أكتوبر ٢٠٢٦". */
export function omanDateLabel(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("ar", { timeZone: OMAN_TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
}

/** Matches up to 05:00 (Oman) still belong to the previous evening's football day. */
export const DAY_ROLLOVER_HOUR = 5;

/** The "football day" (YYYY-MM-DD) for a moment: Oman date of (time - 5h). */
export function footballDay(d: Date = new Date()): string {
  return omanDate(new Date(d.getTime() - DAY_ROLLOVER_HOUR * 3600_000));
}
