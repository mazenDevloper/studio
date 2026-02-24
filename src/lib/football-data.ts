
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
  'الهلال', 'النصر', 'الاتحاد', 'الأهلي', 'ريال مدريد', 'برشلونة', 'مانشستر سيتي', 'ليفربول', 'بايرن ميونخ', 'أرسنال', 'باريس سان جيرمان'
];

export const MAJOR_LEAGUES = [
  { id: 307, name: 'دوري روشن السعودي' },
  { id: 140, name: 'الدوري الإسباني' },
  { id: 39, name: 'الدوري الإنجليزي' },
  { id: 2, name: 'دوري أبطال أوروبا' }
];

export const MOCK_MATCHES: Match[] = [];
