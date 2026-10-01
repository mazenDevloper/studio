import { fetchPlaylistText, fetchXtreamLive } from "@/app/actions/m3u";
import { M3uChannel, XtreamCreds, isHlsManifest, parseM3u, toPlayableUrl, xtreamFromUrl, xtreamLiveUrl } from "@/lib/m3u";

export type IptvSource =
  | { kind: "url"; url: string }
  | { kind: "xtream"; host: string; username: string; password: string };

export interface LoadResult {
  channels: M3uChannel[];
  /** True when the link was a single stream (not a channel list). */
  single: boolean;
}

async function loadXtream(c: XtreamCreds): Promise<LoadResult> {
  const res = await fetchXtreamLive(c.host, c.username, c.password);
  if (!res.ok) throw new Error(res.error);
  return { single: false, channels: res.channels.map(ch => ({ ...ch, url: xtreamLiveUrl(c, ch.id) })) };
}

/** Resolve an m3u8 stream, m3u playlist, Xtream get.php link or Xtream credentials into channels. */
export async function loadSource(src: IptvSource): Promise<LoadResult> {
  if (src.kind === "xtream") {
    if (!src.host || !src.username || !src.password) throw new Error("أكمل بيانات Xtream");
    const host = /^https?:\/\//i.test(src.host) ? src.host : `http://${src.host}`;
    return loadXtream({ host, username: src.username, password: src.password });
  }

  const input = src.url.trim();
  if (!/^https?:\/\//i.test(input)) throw new Error("أدخل رابطا صحيحا يبدأ بـ http(s)");
  const one = (url: string, name = "Stream"): LoadResult => ({ single: true, channels: [{ id: "0", name, url: toPlayableUrl(url) }] });

  // Direct Xtream live link: /live/user/pass/id[.m3u8|.ts]
  if (/\/live\/[^/]+\/[^/]+\/\d+/.test(input)) return one(input.includes(".") && /\d+\.\w+(\?|$)/.test(input) ? input : `${input}.m3u8`, "Live");

  // Xtream get.php / player_api.php link: prefer the API (gives real categories), fall back to the m3u itself
  const creds = xtreamFromUrl(input);
  if (creds) {
    try { return await loadXtream(creds); } catch { /* fall through to plain m3u */ }
  }

  const res = await fetchPlaylistText(input);
  if (!res.ok) {
    // Server could not read it: let the browser try a plain stream link directly.
    if (/\.m3u8?(\?|$)/i.test(input)) return one(input);
    throw new Error(res.error);
  }
  if (isHlsManifest(res.text)) return one(input);
  const list = parseM3u(res.text).map(c => ({ ...c, url: toPlayableUrl(c.url) }));
  if (!list.length) throw new Error("لم يتم العثور على قنوات / No channels found");
  return { single: false, channels: list };
}
