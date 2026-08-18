/**
 * Sovereign Hijri Utility v1.2
 * Handles Hijri date calculation, context-aware content suggestions, and upcoming occasion tracking.
 * Optimized for specific reciters and high-impact religious queries.
 */

export interface HijriDate {
  day: number;
  month: number;
  year: number;
  dayName: string;
  monthName: string;
  fullDate: string;
}

export interface OccasionSuggestion {
  label: string;
  query: string;
  isDate?: boolean;
  isOman?: boolean;
  isSpecial?: boolean;
  isUpcoming?: boolean;
  isSport?: boolean;
}

const HIJRI_MONTHS = [
  "محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
  "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
];

const FIXED_OCCASIONS = [
  { m: 1, d: 1, name: "رأس السنة الهجرية", query: "دروس العام الهجري الجديد" },
  { m: 1, d: 10, name: "يوم عاشوراء", query: "قصة يوم عاشوراء نبيل العوضي" },
  { m: 3, d: 12, name: "المولد النبوي الشريف", query: "السيرة النبوية العطرة كاملة" },
  { m: 7, d: 27, name: "ذكرى الإسراء والمعراج", query: "قصة الاسراء والمعراج كاملة" },
  { m: 8, d: 15, name: "ليلة النصف من شعبان", query: "فضل ليلة النصف من شعبان" },
  { m: 9, d: 1, name: "غرة شهر رمضان المبارك", query: "استقبال شهر رمضان تلاوات خاشعة" },
  { m: 10, d: 1, name: "عيد الفطر المبارك", query: "تكبيرات عيد الفطر الحرم المكي" },
  { m: 12, d: 9, name: "يوم عرفة", query: "بث مباشر يوم عرفة من جبل الرحمة" },
  { m: 12, d: 10, name: "عيد الأضحى المبارك", query: "تكبيرات عيد الاضحى مكررة" },
];

export function getCurrentHijriDate(): HijriDate {
  const today = new Date();
  const formatter = new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura-nu-latn', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long'
  });
  
  const parts = formatter.formatToParts(today);
  const day = parseInt(parts.find(p => p.type === 'day')?.value || "1");
  const monthName = parts.find(p => p.type === 'month')?.value || "";
  const year = parseInt(parts.find(p => p.type === 'year')?.value || "1445");
  const dayName = parts.find(p => p.type === 'weekday')?.value || "";

  const month = HIJRI_MONTHS.indexOf(monthName) + 1;

  return { day, month, year, dayName, monthName, fullDate: formatter.format(today) };
}

export function getIslamicOccasions(h: HijriDate): OccasionSuggestion[] {
  const suggestions: OccasionSuggestion[] = [];
  const { day, month, dayName } = h;
  const hour = new Date().getHours();

  // 1. Weekly Context (Friday)
  if (dayName.includes("الجمعة")) {
    suggestions.push({ label: "سورة الكهف - العفاسي 📖", query: "سورة الكهف مشاري العفاسي" });
    suggestions.push({ label: "الصلاة على النبي ﷺ", query: "تكرار الصلاة على النبي 1000 مرة" });
    if (hour >= 14) suggestions.push({ label: "ساعة الاستجابة 🤲", query: "دعاء ساعة الاستجابة يوم الجمعة" });
  }

  // 2. Today's Occasion (Fixed)
  const todayOcc = FIXED_OCCASIONS.find(o => o.m === month && o.d === day);
  if (todayOcc) {
    suggestions.push({ label: `${todayOcc.name} ✨`, query: todayOcc.query, isSpecial: true });
  }

  // 3. Daily Time-Based Program
  if (hour >= 4 && hour <= 9) suggestions.push({ label: "أذكار الصباح - ناصر القطامي ☀️", query: "أذكار الصباح بصوت ناصر القطامي" });
  if (hour >= 15 && hour <= 19) suggestions.push({ label: "أذكار المساء 🌙", query: "أذكار المساء بصوت هادئ" });
  if (hour >= 20 || hour <= 3) suggestions.push({ label: "دروس إيمانية 📚", query: "أجمل الدروس الدينية القصيرة" });

  // 4. White Days (Monthly Program)
  if ([13, 14, 15].includes(day)) {
    suggestions.push({ label: `صيام الأيام البيض (${day} ${h.monthName}) 🌙`, query: "فضل صيام الايام البيض" });
  }

  // 5. Find Closest Upcoming Occasion
  let upcoming = null;
  const currentTotalDays = month * 30 + day;
  
  for (const occ of FIXED_OCCASIONS) {
    const occTotalDays = occ.m * 30 + occ.d;
    if (occTotalDays > currentTotalDays) {
      const diff = occTotalDays - currentTotalDays;
      if (diff <= 30) {
        upcoming = { name: occ.name, days: diff };
        break;
      }
    }
  }

  if (upcoming) {
    suggestions.push({ 
      label: `قريباً: ${upcoming.name} (خلال ${upcoming.days} يوم) ⏳`, 
      query: `تحضيرات ${upcoming.name}`, 
      isUpcoming: true 
    });
  }

  return suggestions;
}
