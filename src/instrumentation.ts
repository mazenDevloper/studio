/**
 * Runs once when the Next.js server starts (dev, `next start`, or a Vercel function cold start):
 * start keeping today's matches in memory so the first /api/matches request answers instantly.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startMatchesWarmup } = await import("@/lib/top-matches");
  startMatchesWarmup();
}
