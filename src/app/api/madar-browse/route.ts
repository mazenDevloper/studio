// Madar internal browser: fetches a web page and serves it from this site so the Madar headset app
// can click, scroll and type in it (browsers forbid that for pages from other sites).
// Adds the Madar bridge and keeps links and forms inside the browser. Pages only — no private addresses.
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const MAX = 8 * 1024 * 1024;

function blocked(u: URL) {
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return true;
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.localhost')) return true;
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(h)) return true;
  if (h === '::1' || /^f[cd][0-9a-f]{2}:/.test(h) || /^fe80:/.test(h) || h === '::') return true;
  return false;
}

function page(msg: string, status = 502) {
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font:16px system-ui;background:#10131c;color:#dfe6f5;display:grid;place-items:center;height:100vh;margin:0;text-align:center" dir="rtl"><div><h2>تعذّر فتح الصفحة</h2><p>${msg}</p><p style="opacity:.6">جرّب «فتح مباشر» من شريط العنوان في مدار</p></div><script src="/madar-bridge.js"></script>`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

async function handle(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url') || '';
  let target: URL;
  try { target = new URL(raw); } catch { return page('العنوان غير صحيح', 400); }
  if (blocked(target)) return page('هذا العنوان غير مسموح', 403);

  // A request made BY a proxied page (its player's stream, its API): sent as if from that page (Referer / Origin), so
  // sites that only serve their own pages (hotlink protection, CORS) answer; ranges pass through for seeking.
  const ref = req.nextUrl.searchParams.get('ref') || '';
  const sub = !!ref;
  const hdr: Record<string, string> = { 'user-agent': UA, accept: sub ? (req.headers.get('accept') || '*/*') : 'text/html,application/xhtml+xml,*/*;q=0.8', 'accept-language': 'ar,en;q=0.8' };
  if (sub) {
    try { const r = new URL(ref); hdr.referer = r.href; hdr.origin = r.origin; } catch {}
    for (const k of ['range', 'authorization', 'x-requested-with', 'if-none-match', 'if-modified-since']) { const v = req.headers.get(k); if (v) hdr[k] = v; }
    req.headers.forEach((v, k) => { if (/^x-(?!forwarded|real-ip|madar)/i.test(k)) hdr[k] = v; });
  }
  const init: RequestInit = {
    method: req.method, redirect: 'follow',
    headers: hdr,
    // a live stream or a big file must not be cut; a page still has 9 s
    signal: sub ? AbortSignal.timeout(25000) : AbortSignal.timeout(9000),
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    (init.headers as Record<string, string>)['content-type'] = req.headers.get('content-type') || 'application/x-www-form-urlencoded';
    init.body = await req.arrayBuffer();
  }
  let res: Response;
  try { res = await fetch(target, init); } catch (e: any) { return page(e?.name === 'TimeoutError' ? 'الموقع لم يستجب' : 'لا يمكن الوصول إلى الموقع'); }
  const final = res.url || target.href;
  const type = res.headers.get('content-type') || '';
  const isM3u8 = /mpegurl/i.test(type) || /\.m3u8?(\?|$)/i.test(new URL(final).pathname + new URL(final).search);
  if (isM3u8) {
    // HLS playlist: every address inside becomes absolute and goes through here too (with the same page as Referer)
    const body = await res.text(), via = (u: string) => { try { return req.nextUrl.origin + '/api/madar-browse?url=' + encodeURIComponent(new URL(u, final).href) + '&ref=' + encodeURIComponent(ref || final); } catch { return u; } };
    const out = body.split(/\r?\n/).map(l => { const t = l.trim(); if (!t) return l; if (t.startsWith('#')) return l.replace(/URI="([^"]+)"/g, (_m, u) => 'URI="' + via(u) + '"'); return via(t); }).join('\n');
    return new Response(out, { status: res.status, headers: { 'content-type': 'application/vnd.apple.mpegurl', 'cache-control': 'no-store', 'access-control-allow-origin': '*' } });
  }
  if (sub || !/text\/html|application\/xhtml/.test(type)) {
    // Not a page (stream pieces, video, API answers, images): passed through as it comes, ranges included.
    const len = Number(res.headers.get('content-length') || 0);
    if (!sub && len > MAX) return Response.redirect(final, 302);
    const h: Record<string, string> = { 'content-type': type || 'application/octet-stream', 'cache-control': 'no-store', 'access-control-allow-origin': '*' };
    for (const k of ['content-length', 'content-range', 'accept-ranges']) { const v = res.headers.get(k); if (v) h[k] = v; }
    return new Response(res.body, { status: res.status, headers: h });
  }
  let html = await res.text();
  const me = req.nextUrl.origin;
  html = html
    .replace(/<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi, '')
    .replace(/<base\b[^>]*>/gi, '');
  const head = `<base href="${final.replace(/"/g, '&quot;')}"><script>window.__MADAR_PROXY=${JSON.stringify({ url: final, proxy: me + '/api/madar-browse?url=' })}</script><script src="${me}/madar-browse.js"></script><script src="${me}/madar-bridge.js"></script>`;
  if (/<head[^>]*>/i.test(html)) html = html.replace(/<head[^>]*>/i, m => m + head);
  else html = head + html;
  return new Response(html, { status: res.status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-madar-url': encodeURI(final) } });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS', 'access-control-allow-headers': '*', 'access-control-max-age': '86400' } });
}
