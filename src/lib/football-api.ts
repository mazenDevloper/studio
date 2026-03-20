
'use client';

import { FOOTBALL_API_KEY, FOOTBALL_API_BASE_URL } from "./constants";
import { Match } from "./football-data";

// Simple standings cache to reduce API hits
const standingsCache: Record<number, Record<number, number>> = {};

async function fetchLeagueStandings(leagueId: number): Promise<Record<number, number>> {
  if (standingsCache[leagueId]) return standingsCache[leagueId];

  const headers = {
    'x-apisports-key': FOOTBALL_API_KEY || '2f79edc60ed7f63aa4af1feea0f1ff2c',
    'x-rapidapi-host': 'v3.football.api-sports.io'
  };

  try {
    const response = await fetch(`${FOOTBALL_API_BASE_URL}/standings?league=${leagueId}&season=2024`, { headers });
    if (!response.ok) return {};
    const data = await response.json();
    
    if (data.response?.[0]?.league?.standings?.[0]) {
      const standings = data.response[0].league.standings[0];
      const rankMap: Record<number, number> = {};
      standings.forEach((item: any) => {
        rankMap[item.team.id] = item.rank;
      });
      standingsCache[leagueId] = rankMap;
      return rankMap;
    }
  } catch (e) {
    console.error("Standings Fetch Error:", e);
  }
  return {};
}

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

    const fixtures = data.response;
    
    // Extract unique major leagues to fetch standings for
    const uniqueLeagues = Array.from(new Set(fixtures.map((f: any) => f.league.id))) as number[];
    
    // We only fetch standings for relevant leagues to save API hits
    // Ideally we would do this in parallel but limited to 10 leagues per request in free tier?
    // Let's just fetch for the top 5 leagues encountered
    await Promise.all(uniqueLeagues.slice(0, 8).map(lid => fetchLeagueStandings(lid)));

    return fixtures.map((item: any) => {
      const leagueId = item.league.id;
      const leagueStandings = standingsCache[leagueId] || {};
      
      return {
        id: item.fixture.id.toString(),
        homeTeamId: item.teams.home.id,
        awayTeamId: item.teams.away.id,
        homeTeam: item.teams.home.name,
        awayTeam: item.teams.away.name,
        homeLogo: item.teams.home.logo,
        awayLogo: item.teams.away.logo,
        homeRank: leagueStandings[item.teams.home.id] || undefined, 
        awayRank: leagueStandings[item.teams.away.id] || undefined,
        startTime: new Date(item.fixture.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        status: item.fixture.status.short === 'FT' ? 'finished' : (['1H', '2H', 'HT'].includes(item.fixture.status.short) ? 'live' : 'upcoming'),
        score: { home: item.goals.home ?? 0, away: item.goals.away ?? 0 },
        minute: item.fixture.status.elapsed ?? 0,
        league: item.league.name,
        leagueId: item.league.id,
        channel: "SSC / beIN",
        commentator: "يحدد لاحقاً",
        broadcasts: [],
        date: item.fixture.date 
      };
    });
  } catch (error) {
    return [];
  }
}

export async function searchFootballTeams(query: string, leagueId?: string): Promise<any[]> {
  const headers = {
    'x-apisports-key': FOOTBALL_API_KEY || '2f79edc60ed7f63aa4af1feea0f1ff2c',
    'x-rapidapi-host': 'v3.football.api-sports.io'
  };

  let url = `${FOOTBALL_API_BASE_URL}/teams`;
  
  if (query.trim()) {
    url += `?search=${encodeURIComponent(query)}`;
    if (leagueId && leagueId !== 'all') url += `&league=${leagueId}`;
  } else if (leagueId && leagueId !== 'all') {
    url += `?league=${leagueId}&season=2024`;
  } else {
    return [];
  }

  try {
    const response = await fetch(url, { method: 'GET', headers: headers });
    if (!response.ok) return [];
    const data = await response.json();
    return data.response || [];
  } catch (error) {
    return [];
  }
}
