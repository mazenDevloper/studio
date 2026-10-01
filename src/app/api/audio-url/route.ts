import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * GET /api/audio-url?id=<youtubeId> -> { url } : a direct, seekable audio URL resolved with yt-dlp.
 * Used to keep YouTube audio playing while the app is in the background (the YouTube embed pauses itself there).
 * The URL is tied to the server's IP, which is fine when the app runs on the same machine/network (localhost).
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!/^[\w-]{11}$/.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  try {
    const url = await new Promise<string>((resolve, reject) => {
      const p = spawn("yt-dlp", ["--no-playlist", "--no-warnings", "-f", "bestaudio[ext=m4a]/bestaudio", "-g", `https://www.youtube.com/watch?v=${id}`]);
      let out = "", err = "";
      const kill = setTimeout(() => { p.kill("SIGKILL"); reject(new Error("yt-dlp timeout")); }, 25000);
      p.stdout.on("data", d => (out += d));
      p.stderr.on("data", d => (err += d));
      p.on("error", e => { clearTimeout(kill); reject(new Error(`yt-dlp not available: ${e.message}`)); });
      p.on("close", code => {
        clearTimeout(kill);
        const line = out.split(/\r?\n/).find(l => l.startsWith("http"));
        line ? resolve(line.trim()) : reject(new Error(err.trim().split("\n").pop() || `yt-dlp exited ${code}`));
      });
    });
    return NextResponse.json({ url }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 502 });
  }
}
