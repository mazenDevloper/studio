import { NextRequest, NextResponse } from "next/server";
import { decodeHtml, scanHtml } from "@/lib/html-scan";
import { omanDate } from "@/lib/oman-time";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DEFAULT_URL = "https://www.mara.gov.om/arabic/calendar_page2.asp";
const ALLOWED_HOSTS = /(^|\.)mara\.gov\.om$/i; // only the Ministry's site: this is not a general proxy

const BROWSER = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ar,en;q=0.8",
};

/**
 * GET /api/prayer-test?url=&method=get|post&body=a=1&b=2
 * Fetches the Ministry of Awqaf (mara.gov.om) prayer calendar page and reports what it contains
 * (forms + select options to pick Salalah, table rows, rows that look like prayer times),
 * plus an Aladhan reference for Salalah to compare against.
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const method = (p.get("method") || "get").toLowerCase() === "post" ? "POST" : "GET";
  const body = p.get("body") || "";

  let url: URL;
  try { url = new URL(p.get("url") || DEFAULT_URL); } catch { return NextResponse.json({ error: "Invalid url" }, { status: 400 }); }
  if (!/^https?:$/.test(url.protocol) || !ALLOWED_HOSTS.test(url.hostname)) {
    return NextResponse.json({ error: "Only mara.gov.om URLs are allowed" }, { status: 400 });
  }

  const [ministry, aladhan] = await Promise.all([fetchMinistry(url, method, body), fetchAladhan()]);
  return NextResponse.json({ request: { url: url.toString(), method, body }, ministry, aladhan });
}

async function fetchMinistry(url: URL, method: string, body: string) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method,
      headers: method === "POST" ? { ...BROWSER, "Content-Type": "application/x-www-form-urlencoded", Origin: url.origin, Referer: url.toString() } : BROWSER,
      body: method === "POST" ? body : undefined,
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const buf = await res.arrayBuffer();
    const { html, charset } = decodeHtml(buf, res.headers.get("content-type"));
    return { ok: res.ok, status: res.status, ms: Date.now() - t0, finalUrl: res.url, bytes: buf.byteLength, ...scanHtml(html, charset) };
  } catch (e: any) {
    return { ok: false, status: 0, ms: Date.now() - t0, error: e?.cause?.code || e?.cause?.message || e?.message || "network error" };
  }
}

/** Keyless reference times for Salalah (method 8 = Gulf Region); may differ from the Ministry by a minute or two. */
async function fetchAladhan() {
  const [y, m, d] = omanDate().split("-");
  const t0 = Date.now();
  try {
    const res = await fetch(`https://api.aladhan.com/v1/timingsByCity/${d}-${m}-${y}?city=Salalah&country=Oman&method=8`, { cache: "no-store", signal: AbortSignal.timeout(12000) });
    const json = await res.json();
    if (!res.ok || !json?.data?.timings) throw new Error(`HTTP ${res.status}`);
    const t = json.data.timings;
    return { ok: true, ms: Date.now() - t0, date: `${y}-${m}-${d}`, fajr: t.Fajr, sunrise: t.Sunrise, dhuhr: t.Dhuhr, asr: t.Asr, maghrib: t.Maghrib, isha: t.Isha };
  } catch (e: any) {
    return { ok: false, ms: Date.now() - t0, error: e?.cause?.code || e?.message || "network error" };
  }
}
