import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API = "https://api.quran.com/api/v4";
/** The quran.com API paths the Quran screen uses (anything else is refused). */
const ALLOWED = /^(chapters|resources\/(recitations|tafsirs)|chapter_recitations\/\d{1,4}\/\d{1,3}|quran\/verses\/uthmani|tafsirs\/\d{1,4}\/by_ayah\/\d{1,3}:\d{1,3})$/;

/**
 * GET /api/quran?path=chapters&language=ar - quran.com API v4 through this server (cached for a day): the
 * browser never depends on the API's CORS rules, and Vercel's cache keeps it fast.
 */
export async function GET(req: NextRequest) {
  const sp = new URLSearchParams(req.nextUrl.searchParams);
  const path = sp.get("path") || "";
  if (!ALLOWED.test(path)) return NextResponse.json({ error: "path not allowed" }, { status: 400 });
  sp.delete("path");
  try {
    const res = await fetch(`${API}/${path}${sp.size ? `?${sp}` : ""}`, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 DriveCast" },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "quran.com unreachable" }, { status: 502 });
  }
}
