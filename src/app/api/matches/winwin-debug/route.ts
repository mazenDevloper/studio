import { NextResponse } from "next/server";
import { fetchWinwin, inspectWinwin } from "@/lib/winwin";

export const dynamic = "force-dynamic";

/** GET /api/matches/winwin-debug - how winwin.com's day page is built (to finish the TV-channel parser). */
export async function GET() {
  try {
    const { status, html, finalUrl } = await fetchWinwin();
    return NextResponse.json({ status, finalUrl, ...inspectWinwin(html) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed", cause: e?.cause?.code }, { status: 502 });
  }
}
