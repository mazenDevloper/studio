'use server';

/**
 * @fileOverview Server-side fetch for M3U / Xtream playlists (avoids browser CORS).
 */

import { assertPublicHttpUrl } from "@/lib/net-guard";

const MAX_BYTES = 20 * 1024 * 1024;

export async function fetchPlaylistText(url: string, depth = 0): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  try {
    const u = assertPublicHttpUrl(url);
    const res = await fetch(u, { cache: "no-store", signal: AbortSignal.timeout(30000), headers: { "User-Agent": "VLC/3.0.20" } });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    let bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) return { ok: false, error: "Playlist too large" };
    // links that are not ".m3u" (iptv.llc and the like) often send the list gzipped without saying so, as UTF-16,
    // or as a web page that links to the list: all three are read here
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
    const enc = bytes[0] === 0xff && bytes[1] === 0xfe ? "utf-16le" : bytes[0] === 0xfe && bytes[1] === 0xff ? "utf-16be" : "utf-8";
    let text = new TextDecoder(enc).decode(bytes).replace(/^\uFEFF/, "");
    if (!/#EXTINF|#EXTM3U|#EXT-X-/i.test(text) && /<html|<a\s/i.test(text) && depth < 1) {
      const links = Array.from(text.matchAll(/href=["']([^"']+)["']/gi)).map(m => { try { return new URL(m[1].replace(/&amp;/g, "&"), res.url || u).href; } catch { return ""; } })
        .filter(h => /\.m3u8?(\?|$)|m3u|playlist|get\.php/i.test(h));
      if (links.length) return fetchPlaylistText(links[0], depth + 1);
    }
    return { ok: true, text };
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
