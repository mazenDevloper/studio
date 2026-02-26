
export interface Broadcast {
  country: string;
  channel: string;
}

export interface Match {
  id: string;
  homeTeamId?: number;
  awayTeamId?: number;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  startTime: string;
  status: 'upcoming' | 'live' | 'finished';
  score?: { home: number; away: number };
  minute?: number;
  league: string;
  leagueId?: number;
  leagueLogo?: string;
  channel: string;
  commentator: string;
  broadcasts: Broadcast[];
}

export const TEAM_LIST = [
  // المملكة العربية السعودية (الدوري السعودي - 307)
  { id: 2931, name: 'الهلال', leagueId: 307 },
  { id: 2939, name: 'النصر', leagueId: 307 },
  { id: 2932, name: 'الأهلي', leagueId: 307 },
  { id: 2930, name: 'الاتحاد', leagueId: 307 },
  { id: 2934, name: 'الشباب', leagueId: 307 },
  { id: 2935, name: 'الاتفاق', leagueId: 307 },
  { id: 2938, name: 'الفتح', leagueId: 307 },
  { id: 2937, name: 'التعاون', leagueId: 307 },
  { id: 2936, name: 'الفيحاء', leagueId: 307 },
  { id: 2940, name: 'الرائد', leagueId: 307 },
  { id: 2941, name: 'الوحدة السعودي', leagueId: 307 },
  { id: 2942, name: 'الضمك', leagueId: 307 },
  { id: 2943, name: 'الخليج', leagueId: 307 },
  { id: 2944, name: 'القادسية', leagueId: 307 },

  // مصر (الدوري المصري الممتاز - 233)
  { id: 1029, name: 'الأهلي المصري', leagueId: 233 },
  { id: 1038, name: 'الزمالك', leagueId: 233 },
  { id: 1030, name: 'بيراميدز', leagueId: 233 },
  { id: 1031, name: 'المصري البورسعيدي', leagueId: 233 },
  { id: 1032, name: 'الإسماعيلي', leagueId: 233 },
  { id: 1033, name: 'مودرن فيوتشر', leagueId: 233 },
  { id: 1034, name: 'سموحة', leagueId: 233 },

  // الإمارات (دوري أدنوك للمحترفين - 301)
  { id: 2911, name: 'العين', leagueId: 301 },
  { id: 2912, name: 'شباب الأهلي دبي', leagueId: 301 },
  { id: 2913, name: 'الشارقة', leagueId: 301 },
  { id: 2914, name: 'الوحدة الإماراتي', leagueId: 301 },
  { id: 2915, name: 'الوصل', leagueId: 301 },
  { id: 2916, name: 'الجزيرة', leagueId: 301 },
  { id: 2917, name: 'النصر الإماراتي', leagueId: 301 },

  // قطر (دوري نجوم قطر - 305)
  { id: 2921, name: 'السد', leagueId: 305 },
  { id: 2922, name: 'الدحيل', leagueId: 305 },
  { id: 2923, name: 'الريان', leagueId: 305 },
  { id: 2924, name: 'الغرافة', leagueId: 305 },
  { id: 2925, name: 'العربي القطري', leagueId: 305 },
  { id: 2926, name: 'الوكرة', leagueId: 305 },

  // إسبانيا (الدوري الإسباني - 140)
  { id: 541, name: 'ريال مدريد', leagueId: 140 },
  { id: 529, name: 'برشلونة', leagueId: 140 },
  { id: 530, name: 'أتلتيكو مدريد', leagueId: 140 },
  { id: 532, name: 'فالنسيا', leagueId: 140 },
  { id: 536, name: 'إشبيلية', leagueId: 140 },
  { id: 548, name: 'ريال سوسيداد', leagueId: 140 },

  // إنجلترا (الدوري الإنجليزي الممتاز - 39)
  { id: 50, name: 'مانشستر سيتي', leagueId: 39 },
  { id: 40, name: 'ليفربول', leagueId: 39 },
  { id: 42, name: 'أرسنال', leagueId: 39 },
  { id: 33, name: 'مانشستر يونايتد', leagueId: 39 },
  { id: 47, name: 'توتنهام', leagueId: 39 },
  { id: 49, name: 'تشيلسي', leagueId: 39 },
  { id: 34, name: 'نيوكاسل يونايتد', leagueId: 39 },
  { id: 51, name: 'برايتون', leagueId: 39 },
  { id: 66, name: 'أستون فيلا', leagueId: 39 },

  // ألمانيا (الدوري الألماني - 165)
  { id: 157, name: 'بايرن ميونخ', leagueId: 165 },
  { id: 165, name: 'بوروسيا دورتموند', leagueId: 165 },
  { id: 168, name: 'باير ليفركوزن', leagueId: 165 },
  { id: 173, name: 'لايبزيج', leagueId: 165 },

  // إيطاليا (الدوري الإيطالي - 135)
  { id: 505, name: 'إنتر ميلان', leagueId: 135 },
  { id: 489, name: 'ميلان', leagueId: 135 },
  { id: 496, name: 'يوفنتوس', leagueId: 135 },
  { id: 497, name: 'روما', leagueId: 135 },
  { id: 492, name: 'نابولي', leagueId: 135 },
  { id: 487, name: 'لاتسيو', leagueId: 135 },
  { id: 499, name: 'أتالانتا', leagueId: 135 },

  // فرنسا (الدوري الفرنسي - 61)
  { id: 85, name: 'باريس سان جيرمان', leagueId: 61 },
  { id: 81, name: 'مارسيليا', leagueId: 61 },
  { id: 79, name: 'ليل', leagueId: 61 },
  { id: 91, name: 'موناكو', leagueId: 61 }
];

export const MAJOR_LEAGUES = [
  { id: 307, name: 'دوري روشن السعودي' },
  { id: 233, name: 'الدوري المصري الممتاز' },
  { id: 301, name: 'دوري أدنوك للمحترفين (الإماراتي)' },
  { id: 305, name: 'دوري نجوم قطر' },
  { id: 299, name: 'الدوري الكويتي الممتاز' },
  { id: 312, name: 'دوري عمانتل للمحترفين' },
  { id: 292, name: 'الدوري البحريني الممتاز' },
  { id: 39, name: 'الدوري الإنجليزي الممتاز' },
  { id: 140, name: 'الدوري الإسباني' },
  { id: 135, name: 'الدوري الإيطالي' },
  { id: 165, name: 'الدوري الألماني' },
  { id: 61, name: 'الدوري الفرنسي' },
  { id: 2, name: 'دوري أبطال أوروبا' },
  { id: 3, name: 'الدوري الأوروبي' }
];

export const AVAILABLE_TEAMS = TEAM_LIST.map(t => t.name);

export const MOCK_MATCHES: Match[] = [];
