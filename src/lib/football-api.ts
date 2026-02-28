'use client';

import { FOOTBALL_API_KEY, FOOTBALL_API_BASE_URL } from "./constants";
import { Match, TEAM_LIST } from "./football-data";

/**
 * Intelligent mapping for Arabic team names to English to ensure global API accuracy.
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
  "الهلال": "Al Hilal",
  "النصر": "Al Nassr",
  "الاتحاد": "Al Ittihad",
  "الأهلي": "Al Ahli",
  "الأهلي المصري": "Al Ahly",
  "الزمالك": "Zamalek",
  "العين": "Al Ain",
  "السد": "Al Sadd",
};

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
    const response = await fetch(url, { method: 'GET', headers: headers, cache: 'no-store' });
    if (!response.ok) return [];
    const data = await response.json();
    if (!data.response) return [];

    return data.response.map((item: any) => ({
      id: item.fixture.id.toString(),
      homeTeamId: item.teams.home.id,
      awayTeamId: item.teams.away.id,
      homeTeam: item.teams.home.name,
      awayTeam: item.teams.away.name,
      homeLogo: item.teams.home.logo,
      awayLogo: item.teams.away.logo,
      startTime: new Date(item.fixture.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: false }),
      status: item.fixture.status.short === 'FT' ? 'finished' : (['1H', '2H', 'HT'].includes(item.fixture.status.short) ? 'live' : 'upcoming'),
      score: { home: item.goals.home ?? 0, away: item.goals.away ?? 0 },
      minute: item.fixture.status.elapsed ?? 0,
      league: item.league.name,
      leagueId: item.league.id,
      channel: "SSC / beIN",
      commentator: "يحدد لاحقاً",
      broadcasts: [],
      date: item.fixture.date 
    }));
  } catch (error) {
    return [];
  }
}

export async function searchFootballTeams(query: string, leagueId?: string): Promise<any[]> {
  if (!query && (!leagueId || leagueId === 'all')) return [];

  // Local Arabic Search First
  let results = TEAM_LIST.filter(t => 
    t.name.includes(query) && 
    (leagueId === 'all' || !leagueId || t.leagueId === parseInt(leagueId))
  ).map(t => ({
    team: { id: t.id, name: t.name, logo: `https://media.api-sports.io/football/teams/${t.id}.png` }
  }));

  if (results.length >= 3) return results.slice(0, 3);

  // Translate Arabic Query to English for Global Search
  let translatedQuery = query;
  for (const [ar, en] of Object.entries(ARABIC_TO_ENGLISH_MAP)) {
    if (query.includes(ar)) {
      translatedQuery = en;
      break;
    }
  }

  const headers = {
    'x-apisports-key': FOOTBALL_API_KEY || '2f79edc60ed7f63aa4af1feea0f1ff2c',
    'x-rapidapi-host': 'v3.football.api-sports.io'
  };

  const url = `${FOOTBALL_API_BASE_URL}/teams?search=${encodeURIComponent(translatedQuery)}${leagueId && leagueId !== 'all' ? `&league=${leagueId}` : ''}`;

  try {
    const response = await fetch(url, { method: 'GET', headers: headers });
    if (!response.ok) return results;
    const data = await response.json();
    const apiResults = (data.response || []).slice(0, 3);
    
    // Merge local and API results, avoiding duplicates
    const combined = [...results];
    apiResults.forEach((res: any) => {
      if (!combined.some(c => c.team.id === res.team.id)) {
        combined.push(res);
      }
    });
    
    return combined.slice(0, 3);
  } catch (error) {
    return results;
  }
}
