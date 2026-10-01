import { NextRequest, NextResponse } from "next/server";
import { assertPublicHttpUrl } from "@/lib/net-guard";
import { rewriteHlsManifest } from "@/lib/m3u";

export const dynamic = "force-dynamic";
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

    const upstream = await fetch(url, { headers, redirect: "follow", cache: "no-store", signal: AbortSignal.timeout(25000) });
    const type = upstream.headers.get("content-type") || "";
    const finalUrl = upstream.url || url.toString();
    const isManifest = /mpegurl/i.test(type) || /\.m3u8?$/i.test(new URL(finalUrl).pathname);

    if (isManifest) {
      const body = rewriteHlsManifest(await upstream.text(), finalUrl);
      return new NextResponse(body, {
        status: upstream.status,
        headers: { "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "no-store" },
      });
    }

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
