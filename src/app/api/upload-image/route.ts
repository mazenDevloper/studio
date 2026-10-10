import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/upload-image (form field "file"): puts a picture on a public image host and returns its address, so a
 * background chosen on one device is a short link the cloud (JSONBin, small bins) can keep and every device can load.
 * catbox.moe first (permanent, no key), then 0x0.st.
 */
export async function POST(req: NextRequest) {
  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f && typeof f !== "string") file = f as File;
  } catch {}
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "too big" }, { status: 413 });
  const errors: string[] = [];
  try {
    const fd = new FormData();
    fd.append("reqtype", "fileupload");
    fd.append("fileToUpload", file, file.name || "background.jpg");
    const r = await fetch("https://catbox.moe/user/api.php", { method: "POST", body: fd, headers: { "User-Agent": "DriveCast/1.0" } });
    const t = (await r.text()).trim();
    if (r.ok && /^https?:\/\//.test(t)) return NextResponse.json({ url: t, host: "catbox" });
    errors.push(`catbox ${r.status} ${t.slice(0, 80)}`);
  } catch (e: any) { errors.push(`catbox ${e?.message}`); }
  try {
    const fd = new FormData();
    fd.append("file", file, file.name || "background.jpg");
    const r = await fetch("https://0x0.st", { method: "POST", body: fd, headers: { "User-Agent": "DriveCast/1.0" } });
    const t = (await r.text()).trim();
    if (r.ok && /^https?:\/\//.test(t)) return NextResponse.json({ url: t, host: "0x0" });
    errors.push(`0x0 ${r.status}`);
  } catch (e: any) { errors.push(`0x0 ${e?.message}`); }
  return NextResponse.json({ error: errors.join(" · ") }, { status: 502 });
}
