import { NextResponse } from "next/server";
import { fetchWinwin, fetchWinwinJson, findMatchLike, inspectWinwin, jsonShape, WINWIN_DAY_APIS } from "@/lib/winwin";

export const dynamic = "force-dynamic";

const trim = (v: any, n = 3000) => { const s = JSON.stringify(v); return s.length > n ? s.slice(0, n) + "…" : s; };

/**
 * GET /api/matches/winwin-debug - how winwin.com's day page is built (to finish the TV-channel parser).
 * ?page=1 adds the old HTML report. The page itself is rendered in the browser from JSON endpoints, so the
 * report shows each endpoint's shape and the first objects that look like a match.
 */
export async function GET(req: Request) {
  const withPage = new URL(req.url).searchParams.get("page") === "1";
  const apis = await Promise.all(WINWIN_DAY_APIS.map(async url => {
    try {
      const { status, json, text } = await fetchWinwinJson(url);
      return {
        url, status, length: text.length,
        shape: json ? jsonShape(json) : null,
        matchSample: json ? findMatchLike(json, 2).map(o => trim(o)) : [],
        textStart: json ? undefined : text.slice(0, 800),
      };
    } catch (e: any) { return { url, error: e?.message || "failed" }; }
  }));
  let page: any = undefined;
  if (withPage) {
    try { const { status, html, finalUrl } = await fetchWinwin(); page = { status, finalUrl, ...inspectWinwin(html) }; }
    catch (e: any) { page = { error: e?.message }; }
  }
  return new NextResponse(JSON.stringify({ apis, page }, null, 1), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
