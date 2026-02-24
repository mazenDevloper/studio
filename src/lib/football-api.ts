
'use client';

import { FOOTBALL_API_KEY, FOOTBALL_API_BASE_URL } from "./constants";
import { Match } from "./football-data";

/**
 * دالة جلب البيانات الرياضية مع تحسينات لدعم القنوات والمعلقين
 */
export async function fetchFootballData(type: 'today' | 'live'): Promise<Match[]> {
  const date = new Date().toISOString().split('T')[0];
  // استخدام توقيت مكة المكرمة لضمان دقة مواعيد المباريات في الوطن العربي
  const url = type === 'live' 
    ? `${FOOTBALL_API_BASE_URL}/fixtures?live=all&timezone=Asia/Riyadh`
    : `${FOOTBALL_API_BASE_URL}/fixtures?date=${date}&timezone=Asia/Riyadh`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-apisports-key': FOOTBALL_API_KEY || '',
        'x-apisports-host': 'v3.football.api-sports.io'
      },
      next: { revalidate: 300 } // تحديث كل 5 دقائق
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`API Error: ${response.status}`, errorData);
      return [];
    }

    const data = await response.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
      console.error("API Specific Errors:", data.errors);
      return [];
    }

    if (!data.response || !Array.isArray(data.response)) {
      return [];
    }

    return data.response.map((item: any) => {
      const statusShort = item.fixture.status.short;
      let status: 'upcoming' | 'live' | 'finished' = 'upcoming';
      
      if (['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(statusShort)) {
        status = 'live';
      } else if (['FT', 'AET', 'PEN'].includes(statusShort)) {
        status = 'finished';
      }

      const startTime = new Date(item.fixture.date).toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      // استخراج القنوات الناقلة إذا توفرت من الـ API
      const broadcasts = item.fixture.broadcasts || [];
      
      return {
        id: item.fixture.id.toString(),
        homeTeam: item.teams.home.name,
        awayTeam: item.teams.away.name,
        homeLogo: item.teams.home.logo,
        awayLogo: item.teams.away.logo,
        startTime: startTime,
        status: status,
        score: {
          home: item.goals.home ?? 0,
          away: item.goals.away ?? 0
        },
        minute: item.fixture.status.elapsed ?? 0,
        league: item.league.name,
        channel: "يحدد لاحقاً", // سيقوم الذكاء الاصطناعي بتحديث هذا الحقل
        commentator: "يحدد لاحقاً", // سيقوم الذكاء الاصطناعي بتحديث هذا الحقل
        broadcasts: broadcasts.map((b: any) => ({
          country: b.country,
          channel: b.channel
        }))
      } as Match;
    });
  } catch (error) {
    console.error("Network Fetch Error:", error);
    return [];
  }
}
