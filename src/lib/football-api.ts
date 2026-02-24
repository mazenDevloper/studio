
'use client';

import { FOOTBALL_API_KEY, FOOTBALL_API_BASE_URL } from "./constants";
import { Match, Broadcast } from "./football-data";

/**
 * دالة لجلب المباريات من API-Sports بناءً على التاريخ أو الحالة المباشرة
 */
export async function fetchFootballData(type: 'today' | 'live'): Promise<Match[]> {
  // استخدام تاريخ اليوم بتنسيق UTC لضمان التوافق مع API-Sports
  const date = new Date().toISOString().split('T')[0];
  
  // لضمان الحصول على نتائج، سنطلب مباريات أهم الدوريات إذا كان الطلب لليوم
  // أو كافة المباريات المباشرة إذا كان الطلب مباشر
  const url = type === 'live' 
    ? `${FOOTBALL_API_BASE_URL}/fixtures?live=all`
    : `${FOOTBALL_API_BASE_URL}/fixtures?date=${date}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-apisports-key': FOOTBALL_API_KEY,
        'x-apisports-host': 'v3.football.api-sports.io'
      },
      next: { revalidate: 60 } // تحديث كل دقيقة
    });

    if (!response.ok) throw new Error("API Sports Error: " + response.statusText);
    const data = await response.json();

    if (!data.response || data.response.length === 0) {
      console.warn("No matches found for", type);
      return [];
    }

    return data.response.map((item: any) => {
      const statusShort = item.fixture.status.short;
      let status: 'upcoming' | 'live' | 'finished' = 'upcoming';
      
      if (['1H', '2H', 'HT', 'ET', 'P'].includes(statusShort)) {
        status = 'live';
      } else if (['FT', 'AET', 'PEN'].includes(statusShort)) {
        status = 'finished';
      }

      // تحويل وقت البداية إلى توقيت محلي مبسط
      const startTime = new Date(item.fixture.date).toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

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
        channel: "beIN Sports / SSC", // سيقوم الذكاء الاصطناعي بتخصيص هذا لاحقاً
        commentator: "يحدد لاحقاً",
        broadcasts: item.fixture.broadcasts ? item.fixture.broadcasts.map((b: any) => ({
          country: b.country,
          channel: b.name
        })) : [
          { country: 'Saudi Arabia', channel: 'SSC HD' },
          { country: 'MENA', channel: 'beIN Sports' }
        ]
      } as Match;
    });
  } catch (error) {
    console.error("Failed to fetch football data:", error);
    return [];
  }
}
