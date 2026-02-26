
'use client';

import { FOOTBALL_API_KEY, FOOTBALL_API_BASE_URL } from "./constants";
import { Match, TEAM_LIST } from "./football-data";

/**
 * محرك جلب البيانات الرياضية الموحد. يدعم الآن 'yesterday' للتعامل مع مباريات منتصف الليل.
 */
export async function fetchFootballData(type: 'today' | 'live' | 'yesterday' | 'tomorrow'): Promise<Match[]> {
  const now = new Date();
  let date = now.toISOString().split('T')[0];
  
  if (type === 'yesterday') {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    date = d.toISOString().split('T')[0];
  } else if (type === 'tomorrow') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    date = d.toISOString().split('T')[0];
  }
  
  const headers = {
    'x-apisports-key': FOOTBALL_API_KEY || '2f79edc60ed7f63aa4af1feea0f1ff2c',
    'x-rapidapi-host': 'v3.football.api-sports.io'
  };

  const url = type === 'live' 
    ? `${FOOTBALL_API_BASE_URL}/fixtures?live=all&timezone=Asia/Riyadh`
    : `${FOOTBALL_API_BASE_URL}/fixtures?date=${date}&timezone=Asia/Riyadh`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
      cache: 'no-store'
    });

    if (!response.ok) return [];

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
        leagueId: item.league.id,
        leagueLogo: item.league.logo,
        channel: "SSC / beIN",
        commentator: "يحدد لاحقاً",
        broadcasts: [],
        date: item.fixture.date 
      } as Match;
    });
  } catch (error) {
    console.error("Football API Error:", error);
    return [];
  }
}

/**
 * بحث عالمي عن الأندية في قاعدة بيانات API-Sports مع دعم البحث المحلي باللغة العربية أولاً.
 */
export async function searchFootballTeams(query: string, leagueId?: string): Promise<any[]> {
  if (!query && (!leagueId || leagueId === 'all')) return [];

  // 1. البحث المحلي في قاعدة بيانات الأسماء العربية أولاً (Local Search)
  if (query.trim()) {
    const localResults = TEAM_LIST.filter(t => 
      t.name.includes(query) && 
      (leagueId === 'all' || !leagueId || t.leagueId === parseInt(leagueId))
    ).map(t => ({
      team: {
        id: t.id,
        name: t.name,
        logo: `https://media.api-sports.io/football/teams/${t.id}.png`
      }
    }));

    // إذا وجدنا نتائج محلية بالعربية، نعطيها الأولوية
    if (localResults.length > 0) return localResults;
  }

  // 2. إذا لم يتم العثور على نتائج محلية، نستخدم البحث العالمي (API Search)
  const headers = {
    'x-apisports-key': FOOTBALL_API_KEY || '2f79edc60ed7f63aa4af1feea0f1ff2c',
    'x-rapidapi-host': 'v3.football.api-sports.io'
  };

  let params = new URLSearchParams();
  if (query) params.append('search', query);
  if (leagueId && leagueId !== 'all') {
    params.append('league', leagueId);
    params.append('season', '2024'); 
  }

  const url = `${FOOTBALL_API_BASE_URL}/teams?${params.toString()}`;

  try {
    const response = await fetch(url, { method: 'GET', headers: headers });
    if (!response.ok) return [];
    const data = await response.json();
    return data.response || [];
  } catch (error) {
    console.error("Search Teams Error:", error);
    return [];
  }
}
