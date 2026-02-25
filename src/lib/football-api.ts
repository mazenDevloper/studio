'use client';

import { FOOTBALL_API_KEY, FOOTBALL_API_BASE_URL } from "./constants";
import { Match } from "./football-data";

/**
 * محرك جلب البيانات الرياضية الموحد.
 * يستخدم مفتاح الـ API الأساسي لجلب البيانات الحية أو المجدولة.
 */
export async function fetchFootballData(type: 'today' | 'live'): Promise<Match[]> {
  const date = new Date().toISOString().split('T')[0];
  
  // live=all تجلب كافة المباريات الجارية حالياً في كافة الدوريات
  const url = type === 'live' 
    ? `${FOOTBALL_API_BASE_URL}/fixtures?live=all&timezone=Asia/Riyadh`
    : `${FOOTBALL_API_BASE_URL}/fixtures?date=${date}&timezone=Asia/Riyadh`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-apisports-key': FOOTBALL_API_KEY,
        'x-apisports-host': 'v3.football.api-sports.io'
      },
      // تفعيل الكاش لتقليل استهلاك الكوتا مع تحديث سريع للمباشر
      next: { revalidate: type === 'live' ? 30 : 300 } 
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    if (!data.response || !Array.isArray(data.response)) return [];

    return data.response.map((item: any) => {
      const statusShort = item.fixture.status.short;
      let status: 'upcoming' | 'live' | 'finished' = 'upcoming';
      
      const liveStatuses = ['1H', '2H', 'HT', 'ET', 'P', 'LIVE', 'BT'];
      const finishedStatuses = ['FT', 'AET', 'PEN'];

      if (liveStatuses.includes(statusShort)) {
        status = 'live';
      } else if (finishedStatuses.includes(statusShort)) {
        status = 'finished';
      }

      return {
        id: item.fixture.id.toString(),
        homeTeamId: item.teams.home.id,
        awayTeamId: item.teams.away.id,
        homeTeam: item.teams.home.name,
        awayTeam: item.teams.away.name,
        homeLogo: item.teams.home.logo,
        awayLogo: item.teams.away.logo,
        startTime: new Date(item.fixture.date).toLocaleTimeString('ar-SA', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }),
        status: status,
        score: {
          home: item.goals.home ?? 0,
          away: item.goals.away ?? 0
        },
        minute: item.fixture.status.elapsed ?? 0,
        league: item.league.name,
        leagueLogo: item.league.logo,
        channel: "SSC / beIN",
        commentator: "يحدد لاحقاً",
        broadcasts: []
      } as Match;
    });
  } catch (error) {
    console.error("API Fetch Error:", error);
    return [];
  }
}
