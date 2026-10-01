/**
 * The user's favourite teams (English names as the score providers spell them).
 * They are added once to the cloud-synced favouriteTeams list; removing one later is respected.
 * Matching against provider names is fuzzy (see sameTeam in match-core).
 */
export const DEFAULT_FAVORITE_TEAMS: { name: string; ar: string }[] = [
  { name: "Argentina", ar: "الأرجنتين" },
  { name: "Inter Miami", ar: "إنتر ميامي" },
  { name: "Oman", ar: "منتخب عمان" },
  { name: "Saudi Arabia", ar: "السعودية" },
  { name: "Manchester City", ar: "مان سيتي" },
  { name: "Arsenal", ar: "أرسنال" },
  { name: "Chelsea", ar: "تشيلسي" },
  { name: "Manchester United", ar: "مان يونايتد" },
  { name: "Liverpool", ar: "ليفربول" },
  { name: "Real Madrid", ar: "ريال مدريد" },
  { name: "Atletico Madrid", ar: "أتلتيكو مدريد" },
  { name: "Barcelona", ar: "برشلونة" },
  { name: "Inter Milan", ar: "إنتر" },
  { name: "AC Milan", ar: "إيه سي ميلان" },
  { name: "Juventus", ar: "يوفنتوس" },
  { name: "Lens", ar: "لانس" },
  { name: "Paris Saint-Germain", ar: "باريس سان جيرمان" },
  { name: "Bayern Munich", ar: "بايرن ميونخ" },
  { name: "Al Nassr", ar: "النصر السعودي" },
  { name: "Al Hilal", ar: "الهلال" },
  { name: "Al Shabab", ar: "الشباب" },
  { name: "Al Qadsiah", ar: "القادسية" },
  { name: "Al Ahli", ar: "الأهلي" },
  { name: "Al Ittihad", ar: "الاتحاد" },
  { name: "Al Nasr Salalah", ar: "النصر العماني" },
  { name: "Al Ain", ar: "العين الإماراتي" },
];
