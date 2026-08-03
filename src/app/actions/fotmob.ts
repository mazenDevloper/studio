
'use server';

import { sovereignFetch } from "./sovereign-fetch";

/**
 * Sovereign FotMob Match Hub Actions v6.0
 * Fully integrated with Sovereign Bypass Engine for 24/7 reliability.
 */

const FOTMOB_API = "https://www.fotmob.com/api";

export async function getFotMobMatches(dateStr: string) {
  // Atomic Revalidation for live scores
  return await sovereignFetch(`${FOTMOB_API}/matches?date=${dateStr}&timezone=Asia/Muscat`, {
    next: { revalidate: 15 }
  });
}

export async function getFotMobTeamDetails(teamId: number) {
  return await sovereignFetch(`${FOTMOB_API}/teams?id=${teamId}&ccode3=OMN`, {
    next: { revalidate: 300 }
  });
}

export async function getFotMobMatchDetails(matchId: string) {
  return await sovereignFetch(`${FOTMOB_API}/matchDetails?matchId=${matchId}`, {
    next: { revalidate: 10 } // Hyper-sync during match
  });
}

export async function searchFotMobTeams(term: string) {
  if (!term || term.trim().length < 2) return [];
  const data = await sovereignFetch(`${FOTMOB_API}/search/suggest?term=${encodeURIComponent(term)}`);
  return data?.teams || [];
}
