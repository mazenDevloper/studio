
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

export const AVAILABLE_TEAMS = [
  'الهلال', 'النصر', 'الأهلي', 'الاتحاد', 'الشباب',
  'ريال مدريد', 'برشلونة', 'أتلتيكو مدريد',
  'مانشستر سيتي', 'ليفربول', 'أرسنال', 'مانشستر يونايتد',
  'بايرن ميونخ', 'باريس سان جيرمان',
  'إنتر ميلان', 'ميلان', 'يوفنتوس', 'روما'
];

export const MAJOR_LEAGUES = [
  { id: 307, name: 'دوري روشن السعودي' },
  { id: 39, name: 'الدوري الإنجليزي الممتاز' },
  { id: 140, name: 'الدوري الإسباني' },
  { id: 135, name: 'الدوري الإيطالي' },
  { id: 2, name: 'دوري أبطال أوروبا' },
  { id: 3, name: 'الدوري الأوروبي' }
];

export const MOCK_MATCHES: Match[] = [];
