
'use client';

import { FOOTBALL_API_KEY, FOOTBALL_API_BASE_URL } from "./constants";
import { Match, Broadcast } from "./football-data";

/**
 * دالة لجلب المباريات من API-Sports بناءً على التاريخ أو الحالة المباشرة
 */
export async function fetchFootballData(type: 'today' | 'live'): Promise<Match[]> {
  const date = new Date().toISOString().split('T')[0];
  const url = type === 'live' 
    ? `${FOOTBALL_API_BASE_URL}/fixtures?live=all`
    : `${FOOTBALL_API_BASE_URL}/fixtures?date=${date}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-apisports-key': FOOTBALL_API_KEY,
        'x-apisports-host': 'v3.football.api-sports.io'
      }
    });

    if (!response.ok) throw new Error("API Sports Error");
    const data = await response.json();

    if (!data.response) return [];

    return data.response.map((item: any) => {
      // استخراج القنوات من حقل broadcasts إذا توفر (يتطلب طلب fixture مفصل عادة)
      // سنقوم هنا بتحويل البيانات الأساسية
      const status = item.fixture.status.short === 'NS' ? 'upcoming' : 
                     (item.fixture.status.short === 'FT' || item.fixture.status.short === 'AET') ? 'finished' : 'live';

      return {
        id: item.fixture.id.toString(),
        homeTeam: item.teams.home.name,
        awayTeam: item.teams.away.name,
        homeLogo: item.teams.home.logo,
        awayLogo: item.teams.away.logo,
        startTime: item.fixture.date.split('T')[1].substring(0, 5),
        status: status as 'upcoming' | 'live' | 'finished',
        score: {
          home: item.goals.home ?? 0,
          away: item.goals.away ?? 0
        },
        minute: item.fixture.status.elapsed ?? 0,
        league: item.league.name,
        channel: "beIN Sports / SSC", // افتراضي
        commentator: "بث مباشر", // افتراضي
        broadcasts: item.fixture.broadcasts ? item.fixture.broadcasts.map((b: any) => ({
          country: b.country,
          channel: b.name
        })) : [
          { country: 'Saudi Arabia', channel: 'SSC 1 HD' },
          { country: 'MENA', channel: 'beIN Sports HD' }
        ]
      } as Match;
    });
  } catch (error) {
    console.error("Failed to fetch football data:", error);
    return [];
  }
}
