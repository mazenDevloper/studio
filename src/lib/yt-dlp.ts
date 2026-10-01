import { spawn } from "child_process";
import fs from "fs";
import path from "path";

/**
 * Locates a working yt-dlp, installing it automatically if needed:
 *  1. $YTDLP_PATH   2. `yt-dlp` on the PATH   3. a copy downloaded earlier into ./.yt-dlp/
 *  4. otherwise downloads the official standalone binary for this OS from the yt-dlp GitHub releases.
 * The result is cached for the life of the server process.
 */

const RELEASE = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/";
export const YTDLP_DIR = path.join(process.cwd(), ".yt-dlp");

export function ytDlpAsset(platform = process.platform, arch = process.arch): string {
  if (platform === "win32") return arch === "arm64" ? "yt-dlp_arm64.exe" : arch === "ia32" ? "yt-dlp_x86.exe" : "yt-dlp.exe";
  if (platform === "darwin") return "yt-dlp_macos";
  return arch === "arm64" ? "yt-dlp_linux_aarch64" : arch === "arm" ? "yt-dlp_linux_armv7l" : "yt-dlp_linux";
}

function works(bin: string): Promise<boolean> {
  return new Promise(resolve => {
    try {
      const p = spawn(bin, ["--version"], { windowsHide: true });
      const t = setTimeout(() => { p.kill(); resolve(false); }, 15000);
      p.on("error", () => { clearTimeout(t); resolve(false); });
      p.on("close", code => { clearTimeout(t); resolve(code === 0); });
    } catch { resolve(false); }
  });
}

export async function downloadYtDlp(): Promise<string> {
  const asset = ytDlpAsset();
  const target = path.join(YTDLP_DIR, asset);
  const res = await fetch(RELEASE + asset, { redirect: "follow" });
  if (!res.ok) throw new Error(`yt-dlp download failed: HTTP ${res.status}`);
  fs.mkdirSync(YTDLP_DIR, { recursive: true });
  const tmp = `${target}.part`;
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  fs.renameSync(tmp, target);
  if (process.platform !== "win32") fs.chmodSync(target, 0o755);
  return target;
}

let resolving: Promise<string> | null = null;

export function getYtDlp(): Promise<string> {
  if (!resolving) {
    resolving = (async () => {
      const cached = path.join(YTDLP_DIR, ytDlpAsset());
      for (const c of [process.env.YTDLP_PATH, "yt-dlp", cached].filter(Boolean) as string[]) {
        if (await works(c)) return c;
      }
      const downloaded = await downloadYtDlp();
      if (await works(downloaded)) return downloaded;
      throw new Error("yt-dlp was downloaded but does not run on this system");
    })().catch(e => { resolving = null; throw e; });
  }
  return resolving;
}
