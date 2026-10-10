import { NextResponse } from "next/server";

export const revalidate = 86400;

/** ESPN's slug prefix → country (Arabic where well known) */
const C: Record<string, string> = {
  eng: "England", esp: "Spain", ita: "Italy", ger: "Germany", fra: "France", ned: "Netherlands", por: "Portugal", sco: "Scotland",
  bel: "Belgium", tur: "Turkey", ksa: "Saudi Arabia", uae: "UAE", qat: "Qatar", egy: "Egypt", mar: "Morocco", tun: "Tunisia", alg: "Algeria",
  usa: "USA", mex: "Mexico", bra: "Brazil", arg: "Argentina", jpn: "Japan", kor: "South Korea", chn: "China", aus: "Australia",
  rus: "Russia", gre: "Greece", aut: "Austria", sui: "Switzerland", den: "Denmark", swe: "Sweden", nor: "Norway", irl: "Ireland",
  wal: "Wales", uga: "Uganda", gha: "Ghana", nga: "Nigeria", rsa: "South Africa", ken: "Kenya", ind: "India", col: "Colombia", chi: "Chile",
  uru: "Uruguay", per: "Peru", ecu: "Ecuador", par: "Paraguay", ven: "Venezuela", bol: "Bolivia", crc: "Costa Rica", hon: "Honduras",
  gua: "Guatemala", jam: "Jamaica", isr: "Israel", cyp: "Cyprus", rou: "Romania", pol: "Poland", cze: "Czechia", ukr: "Ukraine",
  fifa: "International", uefa: "Europe", conmebol: "South America", concacaf: "North America", afc: "Asia", caf: "Africa", club: "International",
};

/** every soccer competition ESPN knows: {name, country, logo}, filtered by ?q= */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim().toLowerCase();
  try {
    const r = await fetch("https://site.api.espn.com/apis/site/v2/leagues/dropdown?sport=soccer&limit=1000", { next: { revalidate: 86400 } });
    const j = await r.json();
    const out = (j?.leagues ?? []).map((l: any) => {
      const pre = String(l.slug ?? "").split(".")[0];
      return { id: String(l.id ?? ""), name: String(l.name ?? ""), country: C[pre] ?? pre.toUpperCase(), logo: l.logos?.[0]?.href ?? "" };
    }).filter((l: any) => l.name && (!q || l.name.toLowerCase().includes(q) || l.country.toLowerCase().includes(q)));
    return NextResponse.json({ leagues: out.slice(0, 40) });
  } catch {
    return NextResponse.json({ leagues: [] });
  }
}
