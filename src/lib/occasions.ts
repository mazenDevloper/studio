/**
 * The day's occasions (the same list as the Android app's Occasions.java): Hijri (Umm al-Qura), Gregorian / Omani,
 * the week (Friday, fasting tomorrow, sport days) and, on a day with none of these, a short saying - so every day
 * has one. Shown as islands on the site; browsed with ‹ › from the island.
 */

const MONTHS = ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"];
const DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const G_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

const DAILY = [
  "«أحبّ الأعمال إلى الله أدومها وإن قلّ»",
  "«كلمتان خفيفتان على اللسان: سبحان الله وبحمده، سبحان الله العظيم»",
  "«من قال سبحان الله وبحمده مئة مرة حُطّت خطاياه»",
  "«الكلمة الطيبة صدقة»",
  "«تبسّمك في وجه أخيك صدقة»",
  "«لا حول ولا قوة إلا بالله كنز من كنوز الجنة»",
  "«من صلّى عليّ صلاة صلّى الله عليه بها عشراً»",
  "«الطهور شطر الإيمان»",
  "«خيركم من تعلّم القرآن وعلّمه»",
  "«اتق الله حيثما كنت»",
  "«لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه»",
  "«الدعاء هو العبادة»",
  "«من سلك طريقاً يلتمس فيه علماً سهّل الله له به طريقاً إلى الجنة»",
  "سورة الملك قبل النوم · «تنجي من عذاب القبر»",
];

/** {day, month (0 = Muharram), year} of a date, Umm al-Qura. */
export function hijri(d: Date): { day: number; month: number; year: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "numeric", month: "numeric", year: "numeric" }).formatToParts(d);
    const n = (t: string) => parseInt(parts.find(p => p.type === t)?.value || "0", 10);
    return { day: n("day"), month: n("month") - 1, year: n("year") };
  } catch {
    return { day: 1, month: 0, year: 1448 };
  }
}

export function hijriOccasion(h: { day: number; month: number; year: number }): string | null {
  const { day: d, month: m } = h;
  if (m === 0 && d === 1) return `رأس السنة الهجرية ${h.year} هـ`;
  if (m === 0 && d === 9) return "يوم تاسوعاء";
  if (m === 0 && d === 10) return "يوم عاشوراء";
  if (m === 2 && d === 12) return "ذكرى المولد النبوي الشريف ﷺ";
  if (m === 6 && d === 27) return "ذكرى الإسراء والمعراج";
  if (m === 7 && d === 15) return "النصف من شعبان";
  if (m === 8 && d === 1) return "أول أيام رمضان · رمضان كريم";
  if (m === 8 && d === 27) return "ليلة السابع والعشرين · تحرّ ليلة القدر";
  if (m === 8 && d >= 21) return "العشر الأواخر · تحرّ ليلة القدر";
  if (m === 8) return `رمضان كريم · اليوم ${d}`;
  if (m === 9 && d <= 3) return "عيد الفطر مبارك";
  if (m === 11 && d === 9) return "يوم عرفة · خير الدعاء دعاء يوم عرفة";
  if (m === 11 && d === 10) return "عيد الأضحى مبارك";
  if (m === 11 && d >= 11 && d <= 13) return "أيام التشريق";
  if (m === 11 && d <= 8) return "العشر من ذي الحجة · أكثروا التكبير";
  if (d === 1) return `هلّ شهر ${MONTHS[m]} · دعاء رؤية الهلال`;
  if (d >= 13 && d <= 15) return "الأيام البيض";
  return null;
}

export function gregorianOccasion(d: Date): string | null {
  const day = d.getDate(), m = d.getMonth() + 1;
  if (m === 1 && day === 1) return `رأس السنة الميلادية ${d.getFullYear()}`;
  if (m === 1 && day === 11) return "ذكرى تولّي جلالة السلطان مقاليد الحكم";
  if (m === 3 && day === 21) return "عيد الأم";
  if (m === 8 && day === 26) return "يوم الشباب العُماني";
  if (m === 10 && day === 17) return "يوم المرأة العُمانية";
  if (m === 11 && day === 20) return "العيد الوطني العُماني";
  return null;
}

/** Why tomorrow is a day to fast (null: it isn't). */
export function fastReason(now: Date): string | null {
  const t = new Date(now.getTime() + 86_400_000);
  const h = hijri(t);
  if (h.month === 8 || (h.month === 9 && h.day === 1) || (h.month === 11 && h.day >= 10 && h.day <= 13)) return null;
  if (h.month === 11 && h.day === 9) return "صيام يوم عرفة";
  if (h.month === 0 && h.day === 10) return "صيام يوم عاشوراء";
  if (h.month === 0 && h.day === 9) return "صيام تاسوعاء";
  if (h.day >= 13 && h.day <= 15) return "صيام الأيام البيض";
  if (t.getDay() === 1) return "صيام الإثنين";
  if (t.getDay() === 4) return "صيام الخميس";
  return null;
}

/** Today's occasions as island titles (at least one). */
export function todayOccasions(now: Date, rules?: { id: string; title: string; days?: number[]; monthDay?: number; off?: boolean }[]): { id: string; title: string }[] {
  const out: { id: string; title: string }[] = [];
  const h = hijriOccasion(hijri(now));
  if (h) out.push({ id: "occ-hijri", title: "🌙 " + h });
  const g = gregorianOccasion(now);
  if (g) out.push({ id: "occ-greg", title: "📅 " + g });
  const dow = now.getDay();
  // your weekly / monthly occasions (settings ← المناسبات)
  for (const r of rules ?? []) {
    if (r.off) continue;
    if ((r.days && r.days.includes(dow)) || (r.monthDay && r.monthDay === now.getDate())) out.push({ id: `occ-r-${r.id}`, title: r.title });
  }
  const r = fastReason(now);
  if (r && now.getHours() >= 15 && !out.some(o => o.id === "occ-r-fast")) out.push({ id: "occ-fast", title: `تذكير صيام الغد · ${r}` });
  if (!out.length) out.push({ id: "occ-daily", title: "✨ " + DAILY[Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000) % DAILY.length] });
  return out;
}

/** The days with an occasion, 90 days back to 180 ahead (for ‹ ›). */
export function occasionDays(now: Date): Date[] {
  const out: Date[] = [];
  const d = new Date(now);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - 90);
  for (let i = 0; i <= 270; i++) {
    if (hijriOccasion(hijri(d)) || gregorianOccasion(d)) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** {title, date line, when} of an occasion day */
export function describeDay(d: Date, now: Date): { title: string; date: string; when: string } {
  const h = hijri(d);
  const title = [hijriOccasion(h), gregorianOccasion(d)].filter(Boolean).join(" · ");
  const a = new Date(d); a.setHours(12, 0, 0, 0);
  const b = new Date(now); b.setHours(12, 0, 0, 0);
  const diff = Math.round((a.getTime() - b.getTime()) / 86_400_000);
  const when = diff === 0 ? "اليوم" : diff === 1 ? "غداً" : diff === -1 ? "أمس" : diff > 0 ? `بعد ${diff} يوماً` : `قبل ${-diff} يوماً`;
  return { title, date: `${DAYS[d.getDay()]} ${h.day} ${MONTHS[h.month]} · ${d.getDate()} ${G_MONTHS[d.getMonth()]}`, when };
}
