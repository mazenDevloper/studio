"use client";

import type { CSSProperties } from "react";
import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Gold mosaic: small tiles of warm gold tones over a polished gold sweep. */
export const GOLD_MOSAIC = [
  "repeating-conic-gradient(from 45deg, rgba(255,240,180,0.35) 0deg 90deg, rgba(120,80,10,0.35) 90deg 180deg)",
  "linear-gradient(135deg, #7a5a12 0%, #f6d77a 22%, #b8860b 40%, #fff1b8 55%, #a8770e 72%, #f3cf6b 88%, #6b4c0c 100%)",
].join(", ");

/** The board's current ink as a CSS background (null = plain white). */
export function useManuscriptInk(): { background: string; size?: string } | null {
  const ms = useMediaStore(s => s.mapSettings);
  switch (ms.manuscriptInk) {
    case "color": return ms.manuscriptInkColor ? { background: ms.manuscriptInkColor } : null;
    case "gold": return { background: GOLD_MOSAIC, size: "14px 14px, 100% 100%" };
    case "texture": return ms.manuscriptTexture ? { background: `url("${ms.manuscriptTexture}") center / cover` } : null;
    default: return null;
  }
}

/**
 * A manuscript (image or text) in the board's ink. Images are used as a mask over the ink, so any colour or texture
 * fills exactly the strokes; plain white keeps the old look.
 */
export function ManuscriptArt({ item, scale = 1, className, textClassName }: {
  item: { pngDataUrl?: string; content?: string; fontFamily?: string };
  scale?: number;
  className?: string;
  textClassName?: string;
}) {
  const ink = useManuscriptInk();
  if (item.pngDataUrl) {
    if (!ink) {
      return <img src={item.pngDataUrl} alt="" draggable={false}
        className={cn("w-full h-full object-contain drop-shadow-[0_0_60px_rgba(255,255,255,0.4)]", className)}
        style={{ transform: `scale(${scale})`, filter: "brightness(0) invert(1)" }} />;
    }
    const mask = `url("${item.pngDataUrl}") center / contain no-repeat`;
    const style: CSSProperties = {
      transform: `scale(${scale})`, background: ink.background, backgroundSize: ink.size,
      WebkitMask: mask, mask, filter: "drop-shadow(0 0 30px rgba(255,215,120,0.25))",
    };
    return <div className={cn("w-full h-full", className)} style={style} />;
  }
  const textStyle: CSSProperties = ink
    ? { fontFamily: item.fontFamily, background: ink.background, backgroundSize: ink.size, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }
    : { fontFamily: item.fontFamily };
  return <p className={cn("font-black text-white text-center leading-relaxed drop-shadow-2xl", textClassName)} style={textStyle}>{item.content}</p>;
}
