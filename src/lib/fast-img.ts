/** Logos through the DriveCast server's cache (Cloudflare, near Oman): the first visit fetches, then they're instant. */
export function fastImg(url?: string | null): string {
  if (!url || !/^https:\/\//.test(url) || url.includes("workers.dev/img")) return url || "";
  return "https://studio.c-p.workers.dev/img?u=" + encodeURIComponent(url);
}
