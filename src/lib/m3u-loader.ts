import { fetchPlaylistText, fetchXtreamLive } from "@/app/actions/m3u";
import { M3uChannel, XtreamCreds, epgUrls, isHlsManifest, parseM3u, toPlayableUrl, xtreamFromUrl, xtreamLiveUrl } from "@/lib/m3u";

export type IptvSource =
  | { kind: "url"; url: string }
  | { kind: "xtream"; host: string; username: string; password: string }
  /** an .m3u file imported from the device (its text is kept in IndexedDB under `id`) */
  | { kind: "file"; id: string; name: string };

export interface LoadResult {
  channels: M3uChannel[];
  /** True when the link was a single stream (not a channel list). */
  single: boolean;
  /** the TV guide (XMLTV) links the list names */
  epg?: string[];
}

const LOAD_TIMEOUT_MS = 40000;

/** Server actions can hang (cold start, blocked provider, platform time limit): never leave the UI spinning forever. */
function withTimeout<T>(p: Promise<T>, ms = LOAD_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("انتهت مهلة التحميل / Request timed out")), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

async function loadXtream(c: XtreamCreds): Promise<LoadResult> {
  const res = await withTimeout(fetchXtreamLive(c.host, c.username, c.password));
  if (!res.ok) throw new Error(res.error);
  return { single: false, channels: res.channels.map(ch => ({ ...ch, url: xtreamLiveUrl(c, ch.id) })) };
}

/** channels from the text of an .m3u file */
export function fromText(text: string): LoadResult {
  const list = parseM3u(text).map(c => ({ ...c, url: toPlayableUrl(c.url) }));
  if (!list.length) throw new Error("لم يتم العثور على قنوات في الملف / No channels in the file");
  return { single: false, channels: list, epg: epgUrls(text) };
}

/** Resolve an m3u8 stream, m3u playlist, Xtream get.php link or Xtream credentials into channels. */
export async function loadSource(src: IptvSource): Promise<LoadResult> {
  if (src.kind === "file") {
    const { readIptvFile } = await import("@/lib/iptv-files");
    const text = await readIptvFile(src.id);
    if (!text) throw new Error("الملف لم يعد موجوداً في هذا المتصفح — استورده مرة أخرى");
    return fromText(text);
  }
  if (src.kind === "xtream") {
    if (!src.host || !src.username || !src.password) throw new Error("أكمل بيانات Xtream");
    const host = /^https?:\/\//i.test(src.host) ? src.host : `http://${src.host}`;
    return loadXtream({ host, username: src.username, password: src.password });
  }

  // several links (the main lists): loaded side by side and merged; one that fails doesn't stop the others
  const parts = src.url.split(/\s+/).map(x => x.trim()).filter(Boolean);
  if (parts.length > 1) {
    const all = await Promise.allSettled(parts.map(url => loadSource({ kind: "url", url })));
    const seen = new Set<string>(), channels: M3uChannel[] = [];
    for (const r of all) if (r.status === "fulfilled") for (const c of r.value.channels) {
      if (seen.has(c.url)) continue; seen.add(c.url); channels.push({ ...c, id: String(channels.length) });
    }
    const epg = [...new Set(all.flatMap(r => r.status === "fulfilled" ? r.value.epg || [] : []))];
    if (!channels.length) throw new Error((all.find(r => r.status === "rejected") as PromiseRejectedResult | undefined)?.reason?.message || "لم يتم العثور على قنوات / No channels found");
    return { single: false, channels, epg };
  }
  let input = src.url.trim();
  // a bare address ("iptv.llc", "example.com/list") is a link too
  if (!/^https?:\/\//i.test(input) && /^[\w-]+(\.[\w-]+)+(:\d+)?(\/|$)/.test(input)) input = "https://" + input;
  if (!/^https?:\/\//i.test(input)) throw new Error("أدخل رابطا صحيحا يبدأ بـ http(s)");
  const one = (url: string, name = "Stream"): LoadResult => ({ single: true, channels: [{ id: "0", name, url: toPlayableUrl(url) }] });

  // Direct Xtream live link: /live/user/pass/id[.m3u8|.ts]
  if (/\/live\/[^/]+\/[^/]+\/\d+/.test(input)) return one(input.includes(".") && /\d+\.\w+(\?|$)/.test(input) ? input : `${input}.m3u8`, "Live");

  // Xtream get.php / player_api.php link: prefer the API (gives real categories), fall back to the m3u itself
  const creds = xtreamFromUrl(input);
  if (creds) {
    try { return await loadXtream(creds); } catch { /* fall through to plain m3u */ }
  }

  let res = await withTimeout(fetchPlaylistText(input));
  // some list servers only answer on http
  if (!res.ok && input.startsWith("https://")) { const alt = await withTimeout(fetchPlaylistText("http://" + input.slice(8))).catch(() => null); if (alt?.ok) res = alt; }
  if (!res.ok) {
    // Server could not read it: let the browser try a plain stream link directly.
    if (/\.m3u8?(\?|$)/i.test(input)) return one(input);
    throw new Error(res.error);
  }
  if (isHlsManifest(res.text)) return one(input);
  if (!/#EXTINF/i.test(res.text) && /^\s*https?:\/\//m.test(res.text) === false) throw new Error("الرابط لا يحتوي قائمة قنوات / Not a playlist");
  const list = parseM3u(res.text).map(c => ({ ...c, url: toPlayableUrl(c.url) }));
  if (!list.length) throw new Error("لم يتم العثور على قنوات / No channels found");
  return { single: false, channels: list, epg: epgUrls(res.text) };
}
