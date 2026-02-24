
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
  channel: string;
  commentator: string;
}

export const MOCK_MATCHES: Match[] = [
  {
    id: '1',
    homeTeam: 'الهلال',
    awayTeam: 'النصر',
    homeLogo: 'https://picsum.photos/seed/hilal/100/100',
    awayLogo: 'https://picsum.photos/seed/nassr/100/100',
    startTime: '20:00',
    status: 'upcoming', // Changed to upcoming so it doesn't show island unless triggered/favorites match
    league: 'دوري روشن السعودي',
    channel: 'SSC 1 HD',
    commentator: 'فهد العتيبي'
  },
  {
    id: '2',
    homeTeam: 'ريال مدريد',
    awayTeam: 'برشلونة',
    homeLogo: 'https://picsum.photos/seed/real/100/100',
    awayLogo: 'https://picsum.photos/seed/barca/100/100',
    startTime: '22:00',
    status: 'upcoming',
    league: 'الدوري الإسباني',
    channel: 'beIN Sports HD 1',
    commentator: 'حفيظ دراجي'
  },
  {
    id: '3',
    homeTeam: 'ليفربول',
    awayTeam: 'أرسنال',
    homeLogo: 'https://picsum.photos/seed/lfc/100/100',
    awayLogo: 'https://picsum.photos/seed/ars/100/100',
    startTime: '18:30',
    status: 'finished',
    score: { home: 3, away: 2 },
    league: 'الدوري الإنجليزي',
    channel: 'beIN Sports HD 2',
    commentator: 'خليل البلوشي'
  }
];

export const AVAILABLE_TEAMS = [
  'الهلال', 'النصر', 'الاتحاد', 'الأهلي', 'ريال مدريد', 'برشلونة', 'مانشستر سيتي', 'ليفربول', 'بايرن ميونخ'
];
