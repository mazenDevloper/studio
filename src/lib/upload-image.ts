"use client";

/** A picture made smaller (longest side `max`, JPEG) - phones' photos are several MB. */
export function shrinkImage(file: File, max = 1920, quality = 0.82): Promise<Blob> {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("image")); };
    img.src = url;
  });
}

const toDataUrl = (b: Blob) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(b); });

/**
 * Upload a picture and get a short public link (the cloud keeps links, not multi-MB pictures). When the image host
 * is unreachable: a small inline copy (under ~90 KB) that the cloud can still hold.
 */
export async function uploadImage(file: File): Promise<{ url: string; hosted: boolean }> {
  const big = await shrinkImage(file, 1920, 0.82).catch(() => file as Blob);
  try {
    const fd = new FormData();
    fd.append("file", big, "background.jpg");
    const r = await fetch("/api/upload-image", { method: "POST", body: fd });
    const j = await r.json();
    if (j?.url) return { url: j.url, hosted: true };
  } catch {}
  for (const [max, q] of [[1280, 0.6], [960, 0.55], [720, 0.5]] as const) {
    const b = await shrinkImage(file, max, q).catch(() => null);
    if (b && b.size < 68_000) return { url: await toDataUrl(b), hosted: false };
  }
  const b = await shrinkImage(file, 600, 0.45);
  return { url: await toDataUrl(b), hosted: false };
}

/** A background picked earlier as a big inline picture (the cloud refused it): uploaded now, its short link returned. */
export async function ensureHosted(url: string): Promise<string> {
  if (!url.startsWith("data:") || url.length < 90_000) return url;
  try {
    const blob = await (await fetch(url)).blob();
    const r = await uploadImage(new File([blob], "background.jpg", { type: blob.type || "image/jpeg" }));
    return r.url;
  } catch {
    return url;
  }
}
