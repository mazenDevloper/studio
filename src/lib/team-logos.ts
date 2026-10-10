import { getJson } from "@/lib/match-core";
import { S365_HEADERS, s365Url } from "@/lib/scores365";

/** team name → logo (365Scores search, the same as the teams search in the matches tab); kept while warm */
const cache = new Map<string, string>();

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\b(fc|cf|afc|sc|ac)\b/g, "").replace(/[^a-z0-9؀-ۿ]+/g, " ").trim();

async function lookup(name: string): Promise<string> {
  const k = norm(name);
  if (cache.has(k)) return cache.get(k)!;
  let logo = "";
  try {
    const json = await getJson(await s365Url("search", { query: name, filter: "competitors" }), S365_HEADERS, 86400);
    const list = (json?.competitors ?? []).filter((c: any) => (c.sportId ?? 1) === 1);
    const best = list.find((c: any) => norm(String(c.name)) === k) ?? list.find((c: any) => norm(String(c.name)).includes(k) || k.includes(norm(String(c.name)))) ?? list[0];
    if (best) logo = `https://imagecache.365scores.com/image/upload/f_png,w_68,h_68,c_limit,q_auto:eco,dpr_2,d_Competitors:default1.png/v${best.imageVersion ?? 1}/Competitors/${best.id}`;
  } catch {}
  cache.set(k, logo);
  return logo;
}

/** Fill in every missing team logo of a matches response (in place). */
/** logos that often fail to load elsewhere (hotlink-protected / wrong codes): replaced too */
const weak = (u?: string) => !u || /premierleague\.com|null|undefined/.test(u);

export async function fillTeamLogos(data: any): Promise<any> {
  const matches: any[] = data?.matches ?? [];
  const need = new Set<string>();
  for (const m of matches) for (const t of [m?.home, m?.away]) if (t?.name && weak(t.logo)) need.add(t.name);
  const names = [...need].slice(0, 40);
  const found = new Map<string, string>();
  await Promise.all(names.map(async n => { found.set(n, await Promise.race([lookup(n), new Promise<string>(r => setTimeout(() => r(""), 6000))])); }));
  for (const m of matches) for (const t of [m?.home, m?.away]) if (t?.name && weak(t.logo) && found.get(t.name)) t.logo = found.get(t.name);
  return data;
}
