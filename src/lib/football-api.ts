
'use client';

import { FOOTBALL_API_KEY, FOOTBALL_API_BASE_URL } from "./constants";
import { Match, TEAM_LIST } from "./football-data";

/**
 * قاموس ذكي لتحويل أسماء الأندية من العربية إلى الإنجليزية لضمان دقة البحث العالمي.
 */
const ARABIC_TO_ENGLISH_MAP: Record<string, string> = {
  "ريال مدريد": "Real Madrid",
  "برشلونة": "Barcelona",
  "ليفربول": "Liverpool",
  "مانشستر سيتي": "Manchester City",
  "مانشستر يونايتد": "Manchester United",
  "أرسنال": "Arsenal",
  "تشيلسي": "Chelsea",
  "توتنهام": "Tottenham",
  "بايرن ميونخ": "Bayern Munich",
  "يوفنتوس": "Juventus",
  "إنتر ميلان": "Inter",
  "ميلان": "AC Milan",
  "باريس سان جيرمان": "Paris Saint Germain",
  "روما": "Roma",
  "نابولي": "Napoli",
  "أتلتيكو مدريد": "Atletico Madrid",
  "بوروسيا دورتموند": "Borussia Dortmund",
  "باير ليفركوزن": "Bayer Leverkusen",
  "أياكس": "Ajax",
  "بنفيكا": "Benfica",
  "بورتو": "Porto",
  "سبورتينغ لشبونة": "Sporting CP",
  "إشبيلية": "Sevilla",
  "فالنسيا": "Valencia",
  "نيوكاسل": "Newcastle",
  "أستون فيلا": "Aston Villa",
  "الهلال": "Al Hilal",
  "النصر": "Al Nassr",
  "الاتحاد": "Al Ittihad",
  "الأهلي": "Al Ahli",
  "الزمالك": "Zamalek",
  "العين": "Al Ain",
  "السد": "Al Sadd",
  "الدحيل": "Al Duhail",
  "الريان": "Al Rayyan",
  "الوصل": "Al Wasl",
  "بيراميدز": "Pyramids",
  "المصري": "Al Masry",
  "الإسماعيلي": "Ismaily"
};

/**
 * محرك جلب البيانات الرياضية الموحد.
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
 * بحث عالمي ذكي عن الأندية يدعم التحويل من العربية للإنجليزية للبحث العالمي.
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

    if (localResults.length > 0) return localResults;
  }

  // 2. التحويل الذكي للبحث العالمي
  let englishQuery = query;
  for (const [ar, en] of Object.entries(ARABIC_TO_ENGLISH_MAP)) {
    if (query.includes(ar)) {
      englishQuery = en;
      break;
    }
  }

  const headers = {
    'x-apisports-key': FOOTBALL_API_KEY || '2f79edc60ed7f63aa4af1feea0f1ff2c',
    'x-rapidapi-host': 'v3.football.api-sports.io'
  };

  let params = new URLSearchParams();
  params.append('search', englishQuery);
  if (leagueId && leagueId !== 'all') {
    params.append('league', leagueId);
    params.append('season', '2024'); 
  }

  const url = `${FOOTBALL_API_BASE_URL}/teams?${params.toString()}`;

  try {
    const response = await fetch(url, { method: 'GET', headers: headers });
    if (!response.ok) return [];
    const data = await response.json();
    
    // إذا لم تكن هناك نتائج بالاسم الإنجليزي المحول، جرب الاسم العربي الأصلي (بعض الأندية مسجلة بالعربية في API)
    if ((!data.response || data.response.length === 0) && englishQuery !== query) {
      const fallbackUrl = `${FOOTBALL_API_BASE_URL}/teams?search=${encodeURIComponent(query)}`;
      const fallbackRes = await fetch(fallbackUrl, { method: 'GET', headers: headers });
      const fallbackData = await fallbackRes.json();
      return fallbackData.response || [];
    }

    return data.response || [];
  } catch (error) {
    console.error("Search Teams Error:", error);
    return [];
  }
}
