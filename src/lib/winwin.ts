/**
 * winwin.com (Arabic) lists, per match, the TV channels worldwide as logos. This module fetches the day page
 * and reports how its data is shaped; the channel parser is built on that report (see /api/matches/winwin-debug).
 */

export const WINWIN_TODAY = "https://www.winwin.com/كرة-قدم/مواعيد-ونتائج-مباريات-اليوم-بث-مباشر";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ar,en;q=0.8",
};

export async function fetchWinwin(url = WINWIN_TODAY): Promise<{ status: number; html: string; finalUrl: string }> {
  const res = await fetch(encodeURI(decodeURI(url)), { headers: HEADERS, cache: "no-store", signal: AbortSignal.timeout(15000) });
  return { status: res.status, html: await res.text(), finalUrl: res.url };
}

/** Next.js app-router pages stream their data as self.__next_f.push([1,"..."]) chunks. */
export function flightText(html: string): string {
  const out: string[] = [];
  const re = /self\.__next_f\.push\(\[\d+,\s*("(?:[^"\\]|\\.)*")\]\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) { try { out.push(JSON.parse(m[1])); } catch {} }
  return out.join("");
}

export function nextData(html: string): any | null {
  const m = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

/** Walks any JSON and returns objects whose keys look like a match with channels. */
export function findMatchLike(root: any, limit = 3): any[] {
  const hits: any[] = [];
  const seen = new Set<any>();
  const walk = (v: any, depth: number) => {
    if (!v || typeof v !== "object" || seen.has(v) || depth > 40 || hits.length >= limit) return;
    seen.add(v);
    if (!Array.isArray(v)) {
      const keys = Object.keys(v).join(" ").toLowerCase();
      if (/(home|team|club)/.test(keys) && /(channel|tv|broadcast|stream|carrier)/.test(keys)) hits.push(v);
    }
    for (const k of Object.keys(v)) walk(v[k], depth + 1);
  };
  walk(root, 0);
  return hits;
}

const trim = (v: any, n = 2500) => { const s = typeof v === "string" ? v : JSON.stringify(v); return s.length > n ? s.slice(0, n) + "…" : s; };

/** Compact report of how the page is built (sent back by the user to finish the parser). */
export function inspectWinwin(html: string) {
  const nd = nextData(html);
  const flight = flightText(html);
  // JSON objects embedded in the flight stream
  const flightObjs: any[] = [];
  for (const line of flight.split("\n")) {
    const i = line.indexOf(":");
    const body = i > 0 ? line.slice(i + 1) : line;
    if (!/^[\[{]/.test(body)) continue;
    try { flightObjs.push(JSON.parse(body)); } catch {}
  }
  const imgs = Array.from(html.matchAll(/<img\b[^>]*>/g)).map(m => m[0]);
  const imgInfo = imgs.map(t => ({ alt: t.match(/\balt="([^"]*)"/)?.[1] ?? "", src: (t.match(/\bsrc="([^"]*)"/)?.[1] ?? "").slice(0, 140) }));
  const apiUrls = Array.from(new Set(Array.from(html.matchAll(/https?:\/\/[^"'\s<>\\]*(?:api|graphql|json)[^"'\s<>\\]*/gi)).map(m => m[0].slice(0, 160)))).slice(0, 25);
  const tvIdx = html.search(/التلفاز|tv-|channel|قناة/i);
  return {
    htmlLength: html.length,
    title: html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "",
    hasNextData: !!nd,
    nextDataKeys: nd ? Object.keys(nd?.props?.pageProps ?? {}) : [],
    nextDataMatchSample: nd ? findMatchLike(nd, 2).map(o => trim(o)) : [],
    flightLength: flight.length,
    flightMatchSample: findMatchLike(flightObjs, 2).map(o => trim(o)),
    flightSnippetAroundTeams: (() => { const i = flight.search(/(home|team)/i); return i >= 0 ? flight.slice(Math.max(0, i - 300), i + 1500) : ""; })(),
    images: imgInfo.length,
    imagesSample: imgInfo.filter(x => x.alt || /channel|tv|logo/i.test(x.src)).slice(0, 40),
    apiUrls,
    htmlAroundFirstChannel: tvIdx >= 0 ? html.slice(Math.max(0, tvIdx - 1500), tvIdx + 2500) : "",
  };
}
