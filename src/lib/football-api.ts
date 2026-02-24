
'use client';

import { FOOTBALL_API_KEY, FOOTBALL_API_BASE_URL } from "./constants";
import { Match } from "./football-data";

/**
 * دالة جلب البيانات الرياضية مع تحسين معالجة الأخطاء لمنع توقف التطبيق
 */
export async function fetchFootballData(type: 'today' | 'live'): Promise<Match[]> {
  const date = new Date().toISOString().split('T')[0];
  const url = type === 'live' 
    ? `${FOOTBALL_API_BASE_URL}/fixtures?live=all&timezone=Asia/Riyadh`
    : `${FOOTBALL_API_BASE_URL}/fixtures?date=${date}&timezone=Asia/Riyadh`;

  try {
    if (!FOOTBALL_API_KEY || FOOTBALL_API_KEY.includes('Dummy')) {
      console.warn("Football API Key is missing or invalid.");
      return [];
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-apisports-key': FOOTBALL_API_KEY,
        'x-apisports-host': 'v3.football.api-sports.io'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`Football API responded with status: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (!data.response || !Array.isArray(data.response)) return [];

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
        leagueLogo: item.league.logo,
        channel: "يحدد لاحقاً",
        commentator: "يحدد لاحقاً",
        broadcasts: item.fixture.broadcasts || []
      } as Match;
    });
  } catch (error) {
    // معالجة خطأ Failed to fetch بصمت لمنع ظهور شاشة الخطأ الحمراء للمستخدم
    console.warn("Football API Network Error - Check connection or API Key status.");
    return [];
  }
}

export async function fetchStandings(leagueId: number) {
  try {
    const response = await fetch(`${FOOTBALL_API_BASE_URL}/standings?league=${leagueId}&season=2024`, {
      method: 'GET',
      headers: { 'x-apisports-key': FOOTBALL_API_KEY || '', 'x-apisports-host': 'v3.football.api-sports.io' }
    });
    const data = await response.json();
    return data.response?.[0]?.league?.standings?.[0] || [];
  } catch (error) {
    return [];
  }
}

export async function fetchTopScorers(leagueId: number) {
  try {
    const response = await fetch(`${FOOTBALL_API_BASE_URL}/players/topscorers?league=${leagueId}&season=2024`, {
      method: 'GET',
      headers: { 'x-apisports-key': FOOTBALL_API_KEY || '', 'x-apisports-host': 'v3.football.api-sports.io' }
    });
    const data = await response.json();
    return data.response || [];
  } catch (error) {
    return [];
  }
}
