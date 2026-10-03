"use client";

import { useRef, useState } from "react";
import { Palette, Upload, Image as ImageIcon, Check } from "lucide-react";
import { useMediaStore } from "@/lib/store";
import { GOLD_MOSAIC } from "@/components/manuscript/manuscript-art";
import { cn } from "@/lib/utils";

/** Shrink an uploaded texture (it is saved in the cloud with the settings: keep it small). */
async function textureDataUrl(file: File, max = 384): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82);
  } finally { URL.revokeObjectURL(url); }
}

/** Settings > manuscripts: the board's ink (white, a colour, gold mosaic, a texture) and its background. */
export function ManuscriptInkSettings() {
  const ms = useMediaStore(s => s.mapSettings);
  const update = useMediaStore(s => s.updateMapSettings);
  const file = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState("");
  const ink = ms.manuscriptInk || "white";
  const opt = (active: boolean) => cn("focusable no-focus-scale h-14 px-5 rounded-2xl border flex items-center gap-3 font-black text-sm",
    active ? "border-primary bg-primary/15 text-white" : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10");
  const swatch = "w-8 h-8 rounded-lg border border-white/20 shrink-0";

  return (
    <section className="rounded-[3rem] bg-white/5 border border-white/10 p-8 space-y-6">
      <h2 className="text-3xl font-black text-white flex items-center gap-4"><Palette className="w-9 h-9 text-primary" /> لون المخطوطات في اللوحة</h2>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => update({ manuscriptInk: "white" })} className={opt(ink === "white")} data-nav-id="ink-white">
          <span className={cn(swatch, "bg-white")} /> أبيض {ink === "white" && <Check className="w-4 h-4 text-primary" />}
        </button>
        <label className={cn(opt(ink === "color"), "cursor-pointer")} data-nav-id="ink-color">
          <input type="color" value={ms.manuscriptInkColor || "#d4af37"} className="w-8 h-8 rounded-lg bg-transparent border-0 p-0 cursor-pointer"
            onChange={e => update({ manuscriptInk: "color", manuscriptInkColor: e.target.value })} onClick={() => ink !== "color" && update({ manuscriptInk: "color", manuscriptInkColor: ms.manuscriptInkColor || "#d4af37" })} />
          لون {ink === "color" && <Check className="w-4 h-4 text-primary" />}
        </label>
        <button onClick={() => update({ manuscriptInk: "gold" })} className={opt(ink === "gold")} data-nav-id="ink-gold">
          <span className={swatch} style={{ background: GOLD_MOSAIC, backgroundSize: "6px 6px, 100% 100%" }} /> فسيفساء ذهبية {ink === "gold" && <Check className="w-4 h-4 text-primary" />}
        </button>
        <button onClick={() => file.current?.click()} className={opt(ink === "texture")} data-nav-id="ink-texture">
          {ms.manuscriptTexture ? <span className={swatch} style={{ background: `url("${ms.manuscriptTexture}") center / cover` }} /> : <Upload className="w-6 h-6" />}
          رفع خامة (Texture) {ink === "texture" && <Check className="w-4 h-4 text-primary" />}
        </button>
        <input ref={file} type="file" accept="image/*" className="hidden"
          onChange={async e => { const f = e.target.files?.[0]; if (f) update({ manuscriptInk: "texture", manuscriptTexture: await textureDataUrl(f) }); e.target.value = ""; }} />
      </div>
      <form onSubmit={e => { e.preventDefault(); if (link.trim()) { update({ manuscriptInk: "texture", manuscriptTexture: link.trim() }); setLink(""); } }} className="flex gap-2">
        <input value={link} onChange={e => setLink(e.target.value)} placeholder="أو رابط صورة خامة https://..." dir="ltr" className="flex-1 h-12 px-5 rounded-full bg-black/40 border border-white/10 outline-none text-white text-sm" />
        <button type="submit" disabled={!link.trim()} className="focusable no-focus-scale h-12 px-6 rounded-full bg-white/10 text-white font-black text-sm disabled:opacity-40">استخدام الرابط</button>
      </form>
      <label className="flex items-center gap-3 text-sm font-bold text-white/70">
        <input type="checkbox" checked={ms.showManuscriptBg !== false} onChange={e => update({ showManuscriptBg: e.target.checked })} className="w-5 h-5 accent-[hsl(var(--primary))]" />
        <ImageIcon className="w-4 h-4" /> إظهار خلفية اللوحة {ms.manuscriptBgUrl ? "" : "(اختر خلفية من تبويب الخلفيات)"}
      </label>
      <p className="text-xs text-white/40 font-bold">تُحفظ في السحابة. اضغط على المخطوطة في ودجت اللوحة لتثبيتها أولاً وإيقاف التبديل، واضغط مرة أخرى لإلغاء التثبيت.</p>
    </section>
  );
}
