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
      const name = line.slice(line.lastIndexOf(",") + 1).trim();
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
