/**
 * Tiny dependency-free HTML scanner for diagnostics: decodes legacy Arabic charsets and pulls out
 * forms (with select options), table rows, links, and rows that look like prayer-time rows.
 */

export interface ScannedForm { action: string; method: string; fields: { name: string; type: string; value: string; options?: { value: string; text: string; selected: boolean }[] }[] }
export interface HtmlScan {
  charset: string;
  title: string;
  forms: ScannedForm[];
  links: { href: string; text: string }[];
  rows: string[][];
  prayerHeader: string[] | null;
  prayerRows: string[][];
  text: string;
}

const PRAYER_WORDS = ["فجر", "شروق", "ظهر", "عصر", "مغرب", "عشاء"];

export function decodeHtml(buf: ArrayBuffer, contentType: string | null): { html: string; charset: string } {
  const fromHeader = contentType?.match(/charset=([\w-]+)/i)?.[1];
  const sniff = new TextDecoder("latin1").decode(buf.slice(0, 4096));
  const fromMeta = sniff.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
  const charset = (fromHeader || fromMeta || "utf-8").toLowerCase();
  try {
    return { html: new TextDecoder(charset).decode(buf), charset };
  } catch {
    return { html: new TextDecoder("utf-8").decode(buf), charset: `${charset} (unsupported, used utf-8)` };
  }
}

const arabicDigits = (s: string) => s.replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
const entities = (s: string) => s
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
const textOf = (html: string) => arabicDigits(entities(html.replace(/<[^>]+>/g, " "))).replace(/\s+/g, " ").trim();
const attrs = (tag: string) => {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) out[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? "";
  return out;
};

export function scanHtml(html: string, charset: string): HtmlScan {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<!--[\s\S]*?-->/g, "");

  const forms: ScannedForm[] = [];
  for (const f of clean.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
    const fa = attrs(f[1]);
    const fields: ScannedForm["fields"] = [];
    for (const i of f[2].matchAll(/<input\b([^>]*)>/gi)) {
      const a = attrs(i[1]);
      if (a.name) fields.push({ name: a.name, type: (a.type || "text").toLowerCase(), value: entities(a.value || "") });
    }
    for (const sel of f[2].matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
      const a = attrs(sel[1]);
      const options = [...sel[2].matchAll(/<option\b([^>]*)>([\s\S]*?)(?=<option\b|$)/gi)].map(o => {
        const oa = attrs(o[1]);
        const text = textOf(o[2]);
        return { value: oa.value ?? text, text, selected: /\bselected\b/i.test(o[1]) };
      });
      if (a.name) fields.push({ name: a.name, type: "select", value: options.find(o => o.selected)?.value ?? options[0]?.value ?? "", options });
    }
    forms.push({ action: entities(fa.action || ""), method: (fa.method || "get").toLowerCase(), fields });
  }

  const links = [...clean.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .map(m => ({ href: entities(attrs(m[1]).href || ""), text: textOf(m[2]) }))
    .filter(l => l.href && !l.href.startsWith("javascript") && !l.href.startsWith("#"))
    .slice(0, 150);

  const rows = [...clean.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(r => [...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => textOf(c[1])))
    .filter(cells => cells.length >= 2 && cells.length <= 14 && cells.join("").length < 400 && cells.some(Boolean));

  const timeCount = (cells: string[]) => cells.filter(c => /^\D*\d{1,2}[:.]\d{2}\D*$/.test(c)).length;
  const prayerRows = rows.filter(r => timeCount(r) >= 5);
  const prayerHeader = rows.find(r => PRAYER_WORDS.filter(w => r.some(c => c.includes(w))).length >= 3) ?? null;

  return {
    charset,
    title: textOf(clean.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""),
    forms, links, rows: rows.slice(0, 200), prayerHeader, prayerRows,
    text: textOf(clean.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? clean).slice(0, 2000),
  };
}
