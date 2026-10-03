import { chromium } from "playwright-core";
import fs from "fs";
const svg = fs.readFileSync(new URL("./lexus.svg", import.meta.url), "utf8");
const res = "/home/user/studio/android-app/android/app/src/main/res";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
// kind: full = black square icon, round = black circle, fg = adaptive foreground (logo in the 66% safe zone, transparent)
async function render(file, w, h, kind) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const logo = kind === "fg" ? 0.56 : kind === "splash" ? 0.28 : 0.82;
  const bg = kind === "fg" ? "transparent" : "#000";
  const radius = kind === "round" ? "50%" : kind === "full" ? "22%" : "0";
  const size = Math.min(w, h) * logo;
  await p.setContent(`<html><body style="margin:0;background:transparent"><div style="width:${w}px;height:${h}px;background:${bg};border-radius:${radius};display:flex;align-items:center;justify-content:center;overflow:hidden">
    <div style="width:${size}px;height:${size}px">${svg.replace("<svg ", '<svg width="100%" height="100%" ')}</div></div></body></html>`);
  await p.screenshot({ path: file, omitBackground: true });
  await p.close();
}
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(dens)) {
  await render(`${res}/mipmap-${d}/ic_launcher.png`, 48 * k, 48 * k, "full");
  await render(`${res}/mipmap-${d}/ic_launcher_round.png`, 48 * k, 48 * k, "round");
  await render(`${res}/mipmap-${d}/ic_launcher_foreground.png`, 108 * k, 108 * k, "fg");
}
const splash = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] };
for (const [d, [w, h]] of Object.entries(splash)) {
  if (fs.existsSync(`${res}/drawable-port-${d}`)) await render(`${res}/drawable-port-${d}/splash.png`, w, h, "splash");
  if (fs.existsSync(`${res}/drawable-land-${d}`)) await render(`${res}/drawable-land-${d}/splash.png`, h, w, "splash");
}
await render(`${res}/drawable/splash.png`, 480, 320, "splash");
await render(new URL("./preview.png", import.meta.url).pathname, 512, 512, "full");
await b.close();
console.log("done");
