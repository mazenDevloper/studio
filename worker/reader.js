// Madar's reader and sports mode helpers.
//   GET  /read?url=<article>   the readable part of a web page: { title, url, blocks: [{ tag, text }] } (headings, paragraphs, lists)
//   POST /health/<code>        an iPhone Shortcut sends the latest weight (and today's steps / energy) from Apple Health
//   GET  /health/<code>        Madar reads it (the code is the device's own 6-digit number)
const H = { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' };
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', laquo: '«', raquo: '»', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e.toLowerCase()] ?? m));

export async function readable(target) {
  let url;
  try { url = new URL(target); if (!/^https?:$/.test(url.protocol)) throw 0; } catch { return { error: 'bad url' }; }
  const r = await fetch(url.href, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', 'accept-language': 'ar,en;q=0.8' } });
  if (!r.ok) return { error: 'HTTP ' + r.status };
  if (!/html/i.test(r.headers.get('content-type') || '')) return { error: 'not a web page' };
  const blocks = []; let title = '', ogTitle = '', cur = null, skip = 0, inArticle = 0, sawArticle = false;
  const rw = new HTMLRewriter()
    .on('title', { text(t) { title += t.text; } })
    .on('meta[property="og:title"]', { element(e) { ogTitle = e.getAttribute('content') || ''; } })
    .on('script, style, noscript, nav, footer, aside, form, svg, iframe, button, select, template', { element(e) { skip++; e.onEndTag(() => { skip--; }); } })
    .on('article, main, [role="main"]', { element(e) { inArticle++; sawArticle = true; e.onEndTag(() => { inArticle--; }); } })
    .on('h1, h2, h3, h4, p, li, blockquote, pre', {
      element(e) { if (skip) return; cur = { tag: e.tagName, text: '', a: inArticle > 0 }; blocks.push(cur); e.onEndTag(() => { cur = null; }); },
      text(t) { if (!skip && cur) cur.text += t.text; },
    });
  await rw.transform(r).arrayBuffer();
  let out = blocks.map(b => ({ tag: b.tag, a: b.a, text: decode(b.text).replace(/\s+/g, ' ').trim() }))
    .filter(b => b.text && (/^h/.test(b.tag) || b.text.length > (b.tag === 'li' ? 12 : 30)));
  if (sawArticle && out.some(b => b.a)) out = out.filter(b => b.a);
  const seen = new Set(); out = out.filter(b => !seen.has(b.text) && seen.add(b.text)).slice(0, 1200).map(({ tag, text }) => ({ tag, text }));
  return { title: decode(ogTitle || title).trim(), url: url.href, blocks: out };
}

export async function health(req, env, u) {
  const code = (u.pathname.split('/')[2] || '').replace(/\D/g, '');
  if (code.length !== 6 || !env.PUSH) return new Response(JSON.stringify({ error: 'code?' }), { status: 400, headers: H });
  const key = 'health:' + code;
  if (req.method === 'POST' || req.method === 'PUT') {
    const raw = (await req.text()).trim();
    let d = {}; try { d = JSON.parse(raw); } catch { const n = parseFloat(raw.replace(',', '.')); if (isFinite(n)) d = { weight: n }; }
    if (typeof d !== 'object' || !d) d = {};
    const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : undefined; };
    const old = (await env.PUSH.get(key, 'json')) || {};
    const rec = { ...old, at: Date.now() };
    for (const k of ['weight', 'steps', 'kcal', 'fat', 'bmi', 'heart']) { const v = num(d[k]); if (v != null) rec[k] = v; }
    await env.PUSH.put(key, JSON.stringify(rec), { expirationTtl: 400 * 864e2 });
    return new Response(JSON.stringify({ ok: true, saved: rec }), { headers: H });
  }
  return new Response(JSON.stringify((await env.PUSH.get(key, 'json')) || {}), { headers: { ...H, 'cache-control': 'no-store' } });
}
