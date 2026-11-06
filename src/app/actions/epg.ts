'use server';
/**
 * The TV guide (XMLTV) of an IPTV list: «الآن / التالي» for the channels on screen. A guide can be tens of MB
 * (often gzipped), so it is read as a stream and only the programmes of the asked channels, from an hour ago to
 * twelve hours ahead, are kept; reading stops at 80 MB or 25 s.
 */
export type EpgItem = { s: number; e: number; t: string };

const xtime = (v: string) => {
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-]\d{4})?/);
  if (!m) return NaN;
  const [, y, mo, d, h, mi, se = "00", tz = "+0000"] = m;
  const off = (tz[0] === "-" ? -1 : 1) * (parseInt(tz.slice(1, 3)) * 60 + parseInt(tz.slice(3, 5)));
  return Date.UTC(+y, +mo - 1, +d, +h, +mi, +se) - off * 60000;
};
const unesc = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();

export async function fetchEpgNow(urls: string[], ids: string[]): Promise<Record<string, EpgItem[]>> {
  const want = new Set(ids.filter(Boolean).slice(0, 2000)), out: Record<string, EpgItem[]> = {};
  if (!want.size) return out;
  const now = Date.now(), from = now - 3600_000, to = now + 12 * 3600_000, t0 = Date.now();
  for (const url of urls.filter(u => /^https?:\/\//i.test(u)).slice(0, 3)) {
    try {
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(25000), headers: { "User-Agent": "VLC/3.0.20" } });
      if (!res.ok || !res.body) continue;
      let stream: ReadableStream<Uint8Array> = res.body;
      const reader0 = stream.getReader(), first = await reader0.read();
      if (first.done) continue;
      // put the first chunk back in front, then gunzip if it is gzip
      const head = first.value;
      stream = new ReadableStream<Uint8Array>({
        start(c) { c.enqueue(head); },
        async pull(c) { const r = await reader0.read(); if (r.done) c.close(); else c.enqueue(r.value); },
        cancel() { reader0.cancel().catch(() => {}); },
      });
      if (head[0] === 0x1f && head[1] === 0x8b) stream = stream.pipeThrough(new DecompressionStream("gzip") as any);
      const reader = stream.pipeThrough(new TextDecoderStream() as any).getReader() as ReadableStreamDefaultReader<string>;
      let buf = "", total = 0;
      for (;;) {
        const r = await reader.read(); if (r.done) break;
        buf += r.value; total += r.value.length;
        let end: number;
        while ((end = buf.indexOf("</programme>")) >= 0) {
          const startAt = buf.lastIndexOf("<programme", end);
          const block = startAt >= 0 ? buf.slice(startAt, end) : "";
          buf = buf.slice(end + 12);
          const ch = block.match(/channel="([^"]+)"/)?.[1];
          if (!ch || !want.has(ch)) continue;
          const s = xtime(block.match(/start="([^"]+)"/)?.[1] || ""), e = xtime(block.match(/stop="([^"]+)"/)?.[1] || "");
          if (!(e > from && s < to)) continue;
          const t = unesc(block.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || "");
          (out[ch] ||= []).push({ s, e, t: t.slice(0, 120) });
        }
        if (buf.length > 200_000) buf = buf.slice(-50_000);
        if (total > 80_000_000 || Date.now() - t0 > 25000) { reader.cancel().catch(() => {}); break; }
      }
    } catch { /* a guide that fails: the next one */ }
    if (Object.keys(out).length >= want.size) break;
  }
  for (const k of Object.keys(out)) out[k] = out[k].sort((a, b) => a.s - b.s).filter(x => x.e > now).slice(0, 3);
  return out;
}
