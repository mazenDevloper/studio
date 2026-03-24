
'use server';

/**
 * @fileOverview Server-side proxy for IPTV requests with restored credentials.
 */

const HOST = "http://playstop.watch:2095";
const USER = "W87d737";
const PASS = "Pd37qj34";

export async function getIptvCategories() {
  try {
    const res = await fetch(`${HOST}/player_api.php?username=${USER}&password=${PASS}&action=get_live_categories`, {
      cache: 'no-store'
    });
    if (!res.ok) throw new Error("Failed to fetch from IPTV server");
    return await res.json();
  } catch (error) {
    console.error("IPTV Action Error (Categories):", error);
    return [];
  }
}

export async function getIptvChannels(categoryId: string) {
  try {
    const res = await fetch(`${HOST}/player_api.php?username=${USER}&password=${PASS}&action=get_live_streams&category_id=${categoryId}`, {
      cache: 'no-store'
    });
    if (!res.ok) throw new Error("Failed to fetch channels");
    return await res.json();
  } catch (error) {
    console.error("IPTV Action Error (Channels):", error);
    return [];
  }
}
