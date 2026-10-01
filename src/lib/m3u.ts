export interface M3uChannel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group?: string;
}

export type XtreamCreds = { host: string; username: string; password: string };

/** True when the text is an HLS stream manifest (not a channel list). */
export function isHlsManifest(text: string): boolean {
  return /#EXT-X-(STREAM-INF|TARGETDURATION|MEDIA-SEQUENCE|VERSION)/.test(text);
}

/** Parse an extended M3U channel list (#EXTINF + url pairs). */
export function parseM3u(text: string): M3uChannel[] {
  const channels: M3uChannel[] = [];
  const lines = text.split(/\r?\n/);
  let meta: Partial<M3uChannel> | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#EXTINF")) {
      const attr = (key: string) => line.match(new RegExp(`${key}="([^"]*)"`, "i"))?.[1];
      // the title follows the first comma outside quoted attributes (titles may contain commas)
      const name = line.slice(line.replace(/"[^"]*"/g, q => " ".repeat(q.length)).indexOf(",") + 1).trim();
      meta = { name: name || attr("tvg-name") || "Channel", logo: attr("tvg-logo"), group: attr("group-title") };
    } else if (line.startsWith("#EXTGRP:") && meta) {
      meta.group = meta.group || line.slice(8).trim();
    } else if (!line.startsWith("#")) {
      channels.push({
        id: String(channels.length),
        name: meta?.name || line.split("/").pop() || "Channel",
        url: line,
        logo: meta?.logo,
        group: meta?.group,
      });
      meta = null;
    }
  }
  return channels;
}

/** Extract Xtream credentials from a get.php / player_api.php / live URL. */
export function xtreamFromUrl(input: string): XtreamCreds | null {
  try {
    const u = new URL(input);
    const username = u.searchParams.get("username");
    const password = u.searchParams.get("password");
    if (username && password) return { host: u.origin, username, password };
    const m = u.pathname.match(/^\/(?:live|movie|series)\/([^/]+)\/([^/]+)\//);
    if (m) return { host: u.origin, username: m[1], password: m[2] };
  } catch {}
  return null;
}

export function xtreamLiveUrl(c: XtreamCreds, streamId: string | number): string {
  return `${c.host.replace(/\/+$/, "")}/live/${c.username}/${c.password}/${streamId}.m3u8`;
}

export function xtreamPlaylistUrl(c: XtreamCreds): string {
  return `${c.host.replace(/\/+$/, "")}/get.php?username=${encodeURIComponent(c.username)}&password=${encodeURIComponent(c.password)}&type=m3u_plus&output=m3u8`;
}

/** Browsers can't play raw MPEG-TS; Xtream serves the same live stream as HLS. */
export function toPlayableUrl(url: string): string {
  return url.replace(/(\/live\/[^/]+\/[^/]+\/\d+)\.ts(\?.*)?$/i, "$1.m3u8$2");
}

/** True when the URL points at a media stream (played with hls.js / <video>) rather than a web page. */
export function isStreamUrl(url?: string): boolean {
  if (!url) return false;
  return /\.(m3u8?|ts|mp4|mkv|webm)(\?|$)/i.test(url) || /\/live\/[^/]+\/[^/]+\/\d+/.test(url) || url.includes("m3u8");
}

/** Route that relays http streams through our own https origin (avoids mixed-content blocking). */
export const HLS_PROXY_PATH = "/api/hls";

/** On an https page an http stream is blocked by the browser, so send it through the proxy. */
export function proxiedUrl(src: string): string {
  if (typeof window !== "undefined" && window.location.protocol === "https:" && src.startsWith("http:")) {
    return `${HLS_PROXY_PATH}?u=${encodeURIComponent(src)}`;
  }
  return src;
}

/** Rewrite every URI in an HLS manifest so segments, keys and sub-playlists also go through the proxy. */
export function rewriteHlsManifest(text: string, baseUrl: string, proxyPath = HLS_PROXY_PATH): string {
  const wrap = (u: string) => `${proxyPath}?u=${encodeURIComponent(new URL(u, baseUrl).toString())}`;
  return text
    .split(/\r?\n/)
    .map(line => {
      const t = line.trim();
      if (!t) return line;
      if (t.startsWith("#")) return line.replace(/URI="([^"]+)"/g, (_m, u) => `URI="${wrap(u)}"`);
      return wrap(t);
    })
    .join("\n");
}
