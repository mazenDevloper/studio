import { NextRequest, NextResponse } from "next/server";
import { assertPublicHttpUrl } from "@/lib/net-guard";
import { rewriteHlsManifest } from "@/lib/m3u";

export const dynamic = "force-dynamic";
// Vercel cuts a response after this; a continuous .ts stream then reconnects by itself (best on the local server)
export const maxDuration = 60;

/**
 * HLS relay: lets an https deployment (e.g. Vercel) play http-only IPTV streams.
 * Manifests are rewritten so every segment/key is fetched through this route as well;
 * media bytes are streamed through without buffering.
 */
export async function GET(req: NextRequest) {
  // Same-origin only, so other sites can't use this as an open proxy from a browser.
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Browsers without Sec-Fetch-* (older TV browsers) still send our page as the referrer; a bare script sends neither.
  if (!site) {
    let sameHost = false;
    try { sameHost = new URL(req.headers.get("referer") || "").host === req.headers.get("host"); } catch {}
    if (!sameHost) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = req.nextUrl.searchParams.get("u");
  if (!target) return NextResponse.json({ error: "Missing u" }, { status: 400 });

  let url: URL;
  try { url = assertPublicHttpUrl(target); } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Invalid URL" }, { status: 400 });
  }

  try {
    const headers: Record<string, string> = { "User-Agent": "VLC/3.0.20 LibVLC/3.0.20" };
    const range = req.headers.get("range");
    if (range) headers.Range = range;

    // The timeout only covers connecting (and reading a manifest): a live .ts stream is one endless response and
    // must not be cut. When the viewer switches channel the browser drops this request, which closes the upstream
    // connection too - Xtream accounts usually allow only one at a time.
    const ctrl = new AbortController();
    const connectTimer = setTimeout(() => ctrl.abort(new Error("Upstream timeout")), 25000);
    req.signal?.addEventListener("abort", () => ctrl.abort(), { once: true });
    const upstream = await fetch(url, { headers, redirect: "follow", cache: "no-store", signal: ctrl.signal });
    const type = upstream.headers.get("content-type") || "";
    const finalUrl = upstream.url || url.toString();
    const isManifest = /mpegurl/i.test(type) || /\.m3u8?$/i.test(new URL(finalUrl).pathname);

    if (isManifest) {
      const body = rewriteHlsManifest(await upstream.text(), finalUrl);
      clearTimeout(connectTimer);
      return new NextResponse(body, {
        status: upstream.status,
        headers: { "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-store" },
      });
    }

    clearTimeout(connectTimer);
    const out = new Headers({ "Cache-Control": "no-store" });
    for (const h of ["content-type", "content-length", "content-range", "accept-ranges"]) {
      const v = upstream.headers.get(h);
      if (v) out.set(h, v);
    }
    return new NextResponse(upstream.body, { status: upstream.status, headers: out });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upstream failed" }, { status: 502 });
  }
}
