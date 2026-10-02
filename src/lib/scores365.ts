import { BROWSER_HEADERS, getJson } from "@/lib/match-core";

/**
 * Shared 365Scores helpers. TV channels on 365Scores depend on the viewer's country (the same match lists
 * beIN SPORTS in Oman and Sky Sports in England), so requests ask for a Gulf country, found by name in the
 * country lists 365Scores returns. Override with SCORES365_COUNTRY_ID if needed.
 */

export const S365_ORIGIN = "https://www.365scores.com";
export const S365_HEADERS = BROWSER_HEADERS(S365_ORIGIN);
const API = "https://webws.365scores.com/web";

/** Preferred countries for TV listings, in order (Oman first, then the rest of the beIN MENA region). */
const PREFERRED = [/^oman$/i, /united arab emirates|^uae$/i, /^qatar$/i, /saudi/i, /^kuwait$/i, /^bahrain$/i, /^jordan$/i, /^egypt$/i];

const countryIds = new Map<string, number>();
let lookupAt = 0;

/** Remember country ids from any 365Scores response that carries a "countries" list. */
export function remember365Countries(json: any) {
  for (const c of (json?.countries ?? []) as any[]) {
    if (c?.name && Number.isFinite(Number(c.id))) countryIds.set(String(c.name), Number(c.id));
  }
}

function pickPreferred(): number | null {
  for (const re of PREFERRED) {
    for (const [name, id] of countryIds) if (re.test(name)) return id;
  }
  return null;
}

/** Country id to send as userCountryId, or null to let 365Scores use the caller's IP (fine when running in Oman). */
export async function s365CountryId(): Promise<number | null> {
  const env = Number(process.env.SCORES365_COUNTRY_ID);
  if (env > 0) return env;
  const known = pickPreferred();
  if (known) return known;
  if (Date.now() - lookupAt < 30 * 60_000) return null;
  lookupAt = Date.now();
  // the full football country list lives on these endpoints (either may be missing; both are best effort)
  for (const url of [`${API}/countries/?appTypeId=5&langId=1&sports=1`, `${API}/competitions/?appTypeId=5&langId=1&sports=1`]) {
    try {
      remember365Countries(await getJson(url, S365_HEADERS, 86_400));
      const id = pickPreferred();
      if (id) return id;
    } catch { /* try the next one */ }
  }
  return null;
}

/** Common query string for 365Scores web API calls. */
export async function s365Query(extra: Record<string, string | number>): Promise<string> {
  const q = new URLSearchParams({ appTypeId: "5", langId: "1", timezoneName: "Asia/Muscat" });
  const country = await s365CountryId();
  if (country) q.set("userCountryId", String(country));
  for (const [k, v] of Object.entries(extra)) q.set(k, String(v));
  return q.toString();
}

export const s365Url = async (path: string, extra: Record<string, string | number>) => `${API}/${path}/?${await s365Query(extra)}`;

/** Round player head shot (falls back to 365Scores' default silhouette). */
export function athleteImage(athleteId: number | string, version?: number | string, size = 120): string {
  return `https://imagecache.365scores.com/image/upload/f_png,w_${size},h_${size},c_limit,q_auto:eco,dpr_2,d_Athletes:default.png,r_max,c_thumb,g_face,z_0.65/${version ? `v${version}/` : ""}Athletes/${athleteId}`;
}
