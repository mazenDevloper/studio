/**
 * Sovereign Hijri Utility v2.0 - Perpetual Program Edition
 * Handles Hijri date calculation, context-aware content suggestions, and annual occasion tracking.
 * Synced with Dashboard MoonWidget for 100% data consistency.
 */

export interface HijriDate {
  day: number;
  month: number;
  year: number;
  dayName: string;
  monthName: string;
  fullDate: string;
  dayNumArabic: string;
}

export interface OccasionSuggestion {
  label: string;
  query: string;
  isDate?: boolean;
  isOman?: boolean;
  isSpecial?: boolean;
  isUpcoming?: boolean;
  isSport?: boolean;
  isLivePriority?: boolean;
}

const HIJRI_MONTHS = [
  "محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
  "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
];

const ARABIC_DIGITS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];

export function getCurrentHijriDate(): HijriDate {
  const today = new Date();
  const hijriFormatter = new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura-nu-latn', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long'
  });
  
  const parts = hijriFormatter.formatToParts(today);
  const dayStr = parts.find(p => p.type === 'day')?.value || "1";
  const day = parseInt(dayStr, 10);
  const monthName = parts.find(p => p.type === 'month')?.value || "";
  const year = parseInt(parts.find(p => p.type === 'year')?.value || "1447", 10);
  const dayName = parts.find(p => p.type === 'weekday')?.value || "";

  const month = HIJRI_MONTHS.indexOf(monthName) + 1;
  const dayNumArabic = dayStr.split('').map(d => ARABIC_DIGITS[parseInt(d)] || d).join('');

  return { 
    day, 
    month, 
    year, 
    dayName, 
    monthName, 
    dayNumArabic,
    fullDate: `${dayName} ${day} ${monthName} ${year}`
  };
}

export function getIslamicOccasions(h: HijriDate): OccasionSuggestion[] {
  const suggestions: OccasionSuggestion[] = [];
  const { day, month, dayName, monthName, year } = h;
  const hour = new Date().getHours();

  // --- 1. DAILY PROGRAM (Continuous) ---
  if (hour >= 4 && hour <= 11) {
    suggestions.push({ label: "أذكار الصباح بصوت هادئ ومريح ☀️", query: "أذكار الصباح بصوت هادئ ومريح" });
  } else if (hour >= 15 && hour <= 20) {
    suggestions.push({ label: "أذكار المساء تريح القلب 🌙", query: "أذكار المساء بصوت هادئ ومريح" });
  }
  
  suggestions.push({ label: "أذكار الصباح والمساء للأطفال 👶", query: "أذكار الصباح والمساء للأطفال ريان بالعربي" });
  suggestions.push({ label: "إصلاح القلب وتطوير الذات 🧠", query: "بودكاست ديني عن تطوير الذات وإصلاح القلب" });
  suggestions.push({ label: "السيرة النبوية المبسطة ✨", query: "سلسلة السيرة النبوية المبسطة" });

  // --- 2. WEEKLY PROGRAM (Friday) ---
  if (dayName.includes("الجمعة")) {
    suggestions.push({ label: "سورة الكهف - تلاوة خاشعة 📖", query: "سورة الكهف تلاوة تريح القلب" });
    suggestions.push({ label: "قصة أصحاب الكهف للأطفال 🧒", query: "قصة أصحاب الكهف كيدز بالعربي" });
    suggestions.push({ label: "خطبة الجمعة سلطنة عمان (مباشر) 🇴🇲", query: "خطبة الجمعة سلطنة عمان بث مباشر", isLivePriority: true });
    suggestions.push({ label: "الصلاة على النبي مكررة ﷺ", query: "أفضل صيغ الصلاة على النبي مكررة ساعة كاملة" });
  }

  // --- 3. MONTHLY PROGRAM (Ayyam al-Beed 13-15) ---
  if ([13, 14, 15].includes(day)) {
    suggestions.push({ label: `صيام الأيام البيض (${day} ${monthName}) 🌙`, query: "الفوائد الروحية والصحية لصيام الأيام البيض" });
    suggestions.push({ label: "فضل صيام ثلاثة أيام من كل شهر", query: "أحاديث فضل صيام ثلاثة أيام من كل شهر" });
  }

  // --- 4. ANNUAL HIJRI OCCASIONS ---
  
  // Muharram
  if (month === 1) {
    if (day === 1) suggestions.push({ label: "رأس السنة الهجرية ✨", query: "الدروس المستفادة من الهجرة النبوية", isSpecial: true });
    if (day === 10) {
      suggestions.push({ label: "يوم عاشوراء 🌊", query: "قصة نجاة النبي موسى يوم عاشوراء", isSpecial: true });
      suggestions.push({ label: "قصة موسى للأطفال", query: "قصة النبي موسى وفرعون للأطفال كيدز بالعربي" });
    }
  }
  
  // Rabi' al-Awwal
  if (month === 3 && day >= 10 && day <= 13) {
    suggestions.push({ label: "المولد النبوي الشريف 💚", query: "أحداث ولادة النبي محمد ﷺ ومعجزاته", isSpecial: true });
    suggestions.push({ label: "الشمائل المحمدية", query: "الشمائل المحمدية وأخلاق الرسول" });
    suggestions.push({ label: "قصة المولد للأطفال", query: "قصة مولد النبي للأطفال ريان بالعربي" });
  }

  // Rajab
  if (month === 7 && day >= 25 && day <= 28) {
    suggestions.push({ label: "الإسراء والمعراج 🌌", query: "معجزات ومشاهد رحلة الإسراء والمعراج", isSpecial: true });
    suggestions.push({ label: "قصة الإسراء والمعراج مبسطة", query: "قصة الإسراء والمعراج مبسطة" });
  }

  // Sha'ban
  if (month === 8) {
    if (day >= 1 && day <= 10) suggestions.push({ label: "الاستعداد لرمضان 🕋", query: "كيف نستعد لرمضان من شهر شعبان؟" });
    if (day === 15) suggestions.push({ label: "ليلة النصف من شعبان ✨", query: "فضل ليلة النصف من شعبان والأعمال المستحبة فيها", isSpecial: true });
  }

  // Ramadan
  if (month === 9) {
    if (day <= 20) {
      suggestions.push({ label: "تراويح رمضان 🌙", query: "أجمل تلاوات صلاة التراويح" });
      suggestions.push({ label: "قصص رمضان للأطفال", query: "أناشيد وقصص رمضان للأطفال ريان بالعربي" });
    } else {
      suggestions.push({ label: "العشر الأواخر وليلة القدر 🌌", query: "كيف تفوز بالعشر الأواخر من رمضان؟", isSpecial: true });
      suggestions.push({ label: "دعاء ليلة القدر (خاشع)", query: "دعاء ليلة القدر مكرر بصوت خاشع (اللهم إنك عفو تحب العفو فاعف عني)" });
    }
  }

  // Shawwal
  if (month === 10 && day <= 3) {
    suggestions.push({ label: "عيد الفطر المبارك 🎉", query: "تكبيرات عيد الفطر مكررة", isSpecial: true });
    suggestions.push({ label: "سنن وآداب يوم العيد", query: "سنن وآداب يوم العيد" });
  }

  // Dhu al-Hijjah
  if (month === 12) {
    if (day <= 7) suggestions.push({ label: "عشر ذي الحجة 🕋", query: "فضل العمل الصالح في العشر الأوائل من ذي الحجة", isSpecial: true });
    if (day === 9) suggestions.push({ label: "يوم عرفة المستجاب 🤲", query: "دعاء يوم عرفة وأفضل ما يُقال فيه", isSpecial: true });
    if (day >= 10 && day <= 13) {
      suggestions.push({ label: "عيد الأضحى المبارك 🐑", query: "تكبيرات الحج وعيد الأضحى مكررة", isSpecial: true });
      suggestions.push({ label: "مناسك الحج للأطفال", query: "شرح مناسك الحج والعمرة للأطفال كيدز بالعربي" });
    }
  }

  return suggestions;
}
