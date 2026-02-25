export interface Broadcast {
  country: string;
  channel: string;
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  startTime: string;
  status: 'upcoming' | 'live' | 'finished';
  score?: { home: number; away: number };
  minute?: number;
  league: string;
  leagueLogo?: string;
  channel: string;
  commentator: string;
  broadcasts: Broadcast[];
}

export const TEAM_LIST = [
  { id: 2931, name: 'الهلال', leagueId: 307 },
  { id: 2939, name: 'النصر', leagueId: 307 },
  { id: 2932, name: 'الأهلي', leagueId: 307 },
  { id: 2930, name: 'الاتحاد', leagueId: 307 },
  { id: 2934, name: 'الشباب', leagueId: 307 },
  { id: 541, name: 'ريال مدريد', leagueId: 140 },
  { id: 529, name: 'برشلونة', leagueId: 140 },
  { id: 530, name: 'أتلتيكو مدريد', leagueId: 140 },
  { id: 50, name: 'مانشستر سيتي', leagueId: 39 },
  { id: 40, name: 'ليفربول', leagueId: 39 },
  { id: 42, name: 'أرسنال', leagueId: 39 },
  { id: 33, name: 'مانشستر يونايتد', leagueId: 39 },
  { id: 157, name: 'بايرن ميونخ', leagueId: 165 },
  { id: 85, name: 'باريس سان جيرمان', leagueId: 61 },
  { id: 505, name: 'إنتر ميلان', leagueId: 135 },
  { id: 489, name: 'ميلان', leagueId: 135 },
  { id: 496, name: 'يوفنتوس', leagueId: 135 },
  { id: 497, name: 'روما', leagueId: 135 }
];

export const MAJOR_LEAGUES = [
  { id: 307, name: 'دوري روشن السعودي' },
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
