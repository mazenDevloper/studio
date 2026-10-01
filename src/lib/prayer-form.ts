import type { ScannedForm } from "@/lib/html-scan";
import { omanDate } from "@/lib/oman-time";

export const SALALAH = /صلالة|salalah/i;
const MONTHS = [/يناير|كانون الثاني|january/i, /فبراير|شباط|february/i, /مارس|آذار|march/i, /[أا]بريل|نيسان|april/i, /مايو|أيار|may/i, /يونيو|حزيران|june/i,
  /يوليو|تموز|july/i, /[أا]غسطس|آب|august/i, /سبتمبر|[أا]يلول|september/i, /[أا]كتوبر|تشرين الأول|october/i, /نوفمبر|تشرين الثاني|november/i, /ديسمبر|كانون الأول|december/i];

/** Pick Salalah in the city select, the current month and year in theirs, keep every other field's default. */
export function fillCalendarForm(form: ScannedForm): Record<string, string> {
  const [y, m] = omanDate().split("-").map(Number);
  const out: Record<string, string> = {};
  let submitted = false;
  for (const f of form.fields) {
    if (f.type === "button" || f.type === "image") continue;
    // like a browser: send the (first) named submit button, the page may check it
    if (f.type === "submit") { if (!submitted) { out[f.name] = f.value; submitted = true; } continue; }
    let v = f.value;
    const opts = f.options ?? [];
    const city = opts.find(o => SALALAH.test(o.text));
    const month = opts.find(o => MONTHS[m - 1].test(o.text)) ?? (opts.length === 12 ? opts.find(o => Number(o.value) === m) : undefined);
    const year = opts.find(o => o.text.trim() === String(y) || o.value.trim() === String(y));
    if (city) v = city.value; else if (month) v = month.value; else if (year) v = year.value;
    out[f.name] = v;
  }
  return out;
}

