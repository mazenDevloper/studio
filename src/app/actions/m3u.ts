'use server';

/**
 * @fileOverview Server-side fetch for M3U / Xtream playlists (avoids browser CORS).
 */

const MAX_BYTES = 20 * 1024 * 1024;

function assertPublicHttpUrl(raw: string): URL {
  const u = new URL(raw);
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("Only http(s) URLs are allowed");
  const h = u.hostname.toLowerCase();
  if (
    h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") ||
    /^(127|10|0)\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h === "::1" || h.startsWith("[")
  ) throw new Error("Private hosts are not allowed");
  return u;
}

export async function fetchPlaylistText(url: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const u = assertPublicHttpUrl(url);
    const res = await fetch(u, { cache: "no-store", signal: AbortSignal.timeout(30000), headers: { "User-Agent": "VLC/3.0.20" } });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return { ok: false, error: "Playlist too large" };
    return { ok: true, text: new TextDecoder().decode(buf) };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Fetch failed" };
  }
}

export async function fetchXtreamLive(host: string, username: string, password: string) {
  try {
    const base = assertPublicHttpUrl(host).origin;
    const q = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    const get = async (action: string) => {
      const res = await fetch(`${base}/player_api.php?${q}&action=${action}`, {
        cache: "no-store", signal: AbortSignal.timeout(30000), headers: { "User-Agent": "VLC/3.0.20" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    };
    const [streams, cats] = await Promise.all([get("get_live_streams"), get("get_live_categories").catch(() => [])]);
    if (!Array.isArray(streams)) return { ok: false as const, error: "Invalid credentials or server response" };
    const catMap = new Map<string, string>((Array.isArray(cats) ? cats : []).map((c: any) => [String(c.category_id), c.category_name]));
    return {
      ok: true as const,
      channels: streams.map((s: any) => ({
        id: String(s.stream_id),
        name: s.name,
        logo: s.stream_icon || undefined,
        group: catMap.get(String(s.category_id)),
      })),
    };
  } catch (e: any) {
    return { ok: false as const, error: e?.message || "Xtream request failed" };
  }
}
