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
  channel: string;
  commentator: string;
  broadcasts: Broadcast[];
}

// Generate dynamic mock data based on today's date
const now = new Date();
const today = now.toISOString().split('T')[0];

export const MOCK_MATCHES: Match[] = [
  {
    id: '1',
    homeTeam: 'الهلال',
    awayTeam: 'النصر',
    homeLogo: 'https://picsum.photos/seed/hilal/100/100',
    awayLogo: 'https://picsum.photos/seed/nassr/100/100',
    startTime: '20:00',
    status: 'live',
    score: { home: 2, away: 1 },
    minute: 65,
    league: 'دوري روشن السعودي',
    channel: 'SSC 1 HD',
    commentator: 'فهد العتيبي',
    broadcasts: [
      { country: 'Saudi Arabia', channel: 'SSC 1 HD' },
      { country: 'Global', channel: 'Shahid VIP' }
    ]
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
    commentator: 'حفيظ دراجي',
    broadcasts: [
      { country: 'MENA', channel: 'beIN Sports HD 1' },
      { country: 'Spain', channel: 'Movistar LaLiga' }
    ]
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
    commentator: 'خليل البلوشي',
    broadcasts: [
      { country: 'MENA', channel: 'beIN Sports HD 2' },
      { country: 'UK', channel: 'Sky Sports' }
    ]
  }
];

export const AVAILABLE_TEAMS = [
  'الهلال', 'النصر', 'الاتحاد', 'الأهلي', 'ريال مدريد', 'برشلونة', 'مانشستر سيتي', 'ليفربول', 'بايرن ميونخ', 'أرسنال', 'باريس سان جيرمان'
];
