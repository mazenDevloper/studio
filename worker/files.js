// R2 (binding FILES): a fast, permanent copy of the big files, filled on first request.
//   GET /ipa/madar | /ipa/drivecast   the latest iPhone app (from the GitHub release), refreshed every 30 min
//   GET /f/<path>                      Madar's assets (models, 360° pictures, environments) from GitHub Pages
// D1 (binding DB): a small table that keeps the favourite teams for every server copy (JSONBin is read far less).

const IPA = {
  madar: 'https://github.com/mazenDevloper/fit/releases/download/ios-latest/Madar.ipa',
  drivecast: 'https://github.com/mazenDevloper/studio/releases/download/ios-latest/DriveCast.ipa',
};
const MADAR = 'https://mazendevloper.github.io/fit/';
const CORS = { 'content-type': 'application/json', 'access-control-allow-origin': '*' };
const MEDIA = 'https://github.com/mazenDevloper/fit/releases/download/media-360/';
const TYPES = { glb: 'model/gltf-binary', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', hdr: 'application/octet-stream', mp4: 'video/mp4', json: 'application/json', ipa: 'application/octet-stream', ktx2: 'image/ktx2' };

function serve(obj, name) {
  const h = new Headers({ 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=300', etag: obj.httpEtag });
  obj.writeHttpMetadata(h);
  if (name) h.set('content-disposition', `attachment; filename="${name}"`);
  return new Response(obj.body, { headers: h });
}

// a stored file with byte ranges (video seeking; Safari asks for bytes=0-1 first)
async function ranged(req, env, key, head) {
  const size = head.size;
  const h = new Headers({ 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-range, content-length, accept-ranges', 'accept-ranges': 'bytes', 'cache-control': 'public, max-age=86400', etag: head.httpEtag });
  head.writeHttpMetadata(h);
  const m = /^bytes=(\d*)-(\d*)$/.exec((req.headers.get('range') || '').trim());
  if (m && (m[1] !== '' || m[2] !== '')) {
    const start = m[1] === '' ? Math.max(0, size - +m[2]) : +m[1];
    const end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(+m[2], size - 1);
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}`, 'access-control-allow-origin': '*' } });
    h.set('content-range', `bytes ${start}-${end}/${size}`); h.set('content-length', String(end - start + 1));
    if (req.method === 'HEAD') return new Response(null, { status: 206, headers: h });
    const obj = await env.FILES.get(key, { range: { offset: start, length: end - start + 1 } });
    return new Response(obj.body, { status: 206, headers: h });
  }
  h.set('content-length', String(size));
  if (req.method === 'HEAD') return new Response(null, { headers: h });
  const obj = await env.FILES.get(key);
  return new Response(obj.body, { headers: h });
}

async function mirror(env, key, src, maxAgeMs, type, build) {
  const head = await env.FILES.head(key);
  // ?b=<build>: the app asks for that exact build - fetched again at once if the copy is an older one
  const fresh = head && (build ? head.customMetadata?.b === build : Date.now() - head.uploaded.getTime() < maxAgeMs);
  if (!fresh) {
    try {
      const r = await fetch(src, { redirect: 'follow' });
      if (r.ok) {
        const len = +r.headers.get('content-length');
        const body = len ? r.body.pipeThrough(new FixedLengthStream(len)) : await r.arrayBuffer();
        await env.FILES.put(key, body, { httpMetadata: { contentType: type || r.headers.get('content-type') || 'application/octet-stream' }, customMetadata: build ? { b: build } : {} });
      }
    } catch (e) { /* the source is down: the copy we have still serves */ }
  }
  return env.FILES.get(key);
}

export async function files(req, env, u) {
  if (!env.FILES) return null;
  const m = u.pathname.match(/^\/ipa\/(madar|drivecast)$/);
  if (m) {
    const obj = await mirror(env, 'ipa/' + m[1] + '.ipa', IPA[m[1]], 30 * 60e3, TYPES.ipa, u.searchParams.get('b') || '');
    return obj ? serve(obj, m[1] === 'madar' ? 'Madar.ipa' : 'DriveCast.ipa') : new Response('not found', { status: 404 });
  }
  // pictures uploaded from the apps' settings (backgrounds, manuscripts, logos): kept for good
  if (u.pathname === '/upload' && req.method === 'POST') {
    // also what you share from any app (زر المشاركة): PDFs, videos, pictures - up to 60 MB, the name kept for the receiver
    const type = (req.headers.get('content-type') || '').split(';')[0];
    const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/heic': 'heic', 'application/pdf': 'pdf', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'application/epub+zip': 'epub', 'text/plain': 'txt' };
    if (!EXT[type]) return new Response(JSON.stringify({ error: 'type not allowed: ' + type }), { status: 415, headers: CORS });
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 60e6) return new Response(JSON.stringify({ error: 'too big (60 MB max)' }), { status: 413, headers: CORS });
    const name = (u.searchParams.get('name') || '').replace(/[\/\\?#]/g, '').slice(0, 120);
    const key = 'u/' + crypto.randomUUID() + '.' + EXT[type];
    await env.FILES.put(key, buf, { httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable', contentDisposition: name ? 'inline; filename*=UTF-8\'\'' + encodeURIComponent(name) : undefined } });
    return new Response(JSON.stringify({ url: u.origin + '/f/' + key, name, type, size: buf.byteLength }), { headers: CORS });
  }
  if (u.pathname.startsWith('/f/u/')) {
    const key = u.pathname.slice(3), head = await env.FILES.head(key);
    if (!head) return new Response('not found', { status: 404, headers: CORS });
    if (/^(video|audio)\//.test(head.httpMetadata?.contentType || '')) return ranged(req, env, key, head);   // shared videos: seeking
    return serve(await env.FILES.get(key));
  }
  // Madar's 360° video library (GitHub release media-360): copied to R2 once, then played from here with byte ranges
  // (Safari plays a video only from a server that answers Range requests) and CORS (WebGL needs it to draw the frames)
  if (u.pathname.startsWith('/m/')) {
    const name = u.pathname.slice(3).replace(/[^a-z0-9._-]/gi, '');
    const ext = name.split('.').pop().toLowerCase();
    if (!/^(mp4|jpg|json)$/.test(ext)) return new Response('not found', { status: 404, headers: { 'access-control-allow-origin': '*' } });
    const key = 'media/' + name;
    let head = await env.FILES.head(key);
    const stale = head && ext === 'json' && Date.now() - head.uploaded.getTime() > 3600e3;
    if (!head || stale) { await mirror(env, key, MEDIA + name, ext === 'json' ? 3600e3 : 3650 * 864e5, TYPES[ext]); head = await env.FILES.head(key); }
    if (!head) return new Response('not found', { status: 404, headers: { 'access-control-allow-origin': '*' } });
    return ranged(req, env, key, head);
  }
  if (u.pathname.startsWith('/f/')) {
    const path = u.pathname.slice(3).replace(/\.\.+/g, '');
    if (!/^assets\//.test(path)) return new Response('only assets/', { status: 400 });
    const ext = path.split('.').pop().toLowerCase();
    const obj = await mirror(env, 'madar/' + path, MADAR + path, 7 * 864e5, TYPES[ext]);
    return obj ? serve(obj) : new Response('not found', { status: 404 });
  }
  return null;
}

// ---- favourites shared by every server copy (Workers KV; JSONBin is read at most every 10 minutes) ----
export async function favFromDb(env) {
  if (!env.PUSH) return null;
  try { const f = await env.PUSH.get('favourites', 'json'); if (f && Date.now() - f.at < 10 * 60e3) return f.list; } catch (e) {}
  return null;
}
export async function favToDb(env, list) {
  if (!env.PUSH) return;
  try { await env.PUSH.put('favourites', JSON.stringify({ at: Date.now(), list })); } catch (e) {}
}

// ---- the apps' cloud data, now kept on Cloudflare: R2 holds every bin (the source of truth, with a dated copy of each
// save), KV a fast copy for reads. JSONBin is only read once, to bring a bin over the first time it is asked for.
const BIN_OK = /^[0-9a-f]{24}$/;
export const ALL_BINS = ['69c782cbb7ec241ddcb0b99a', '693fb33cae596e708f9ade6a', '68e4ac2e43b1c97be95d24af', '69a87b8bd0ea881f40eeec0c', '69b63cb1c3097a1dd5278bf4', '6a573cdbf5f4af5e29915034', '68ef1b3dd0ea881f40a38bd1',
  '68e4ac20d0ea881f4098138c', '69a00f6eae596e708f4b7291', '69b63c5cc3097a1dd5278b25', '6909c1cd43b1c97be997b522', '699d8c2aae596e708f452936'];
async function fromJsonbin(env, id) {
  const r = await fetch('https://api.jsonbin.io/v3/b/' + id + '/latest', { headers: { 'X-Master-Key': env.BIN_KEY || '', 'X-Bin-Meta': 'false' } });
  if (!r.ok) throw new Error('jsonbin ' + r.status);
  const d = await r.json(); return d && d.record && Object.keys(d).length <= 2 ? d.record : d;
}
/** read a bin: KV (fresh) → R2 → JSONBin (first time only, then copied to R2) */
export async function binGet(env, id, ctx) {
  const key = 'bin:' + id;
  const hit = env.PUSH && await env.PUSH.get(key, 'json');
  if (hit && Date.now() - hit.at < 5 * 60e3) return hit.data;
  const o = env.FILES && await env.FILES.get('bins/' + id + '.json');
  let data = o ? await o.json() : null;
  if (data == null) {
    data = await fromJsonbin(env, id);
    if (env.FILES) await env.FILES.put('bins/' + id + '.json', JSON.stringify(data), { httpMetadata: { contentType: 'application/json' } });
  }
  if (env.PUSH) { const w = env.PUSH.put(key, JSON.stringify({ at: Date.now(), data })); ctx ? ctx.waitUntil(w) : await w; }
  return data;
}
export async function binPut(env, id, data) {
  const body = JSON.stringify(data);
  await env.FILES.put('bins/' + id + '.json', body, { httpMetadata: { contentType: 'application/json' } });
  // a dated copy (history, like JSONBin's versions) - the last 30 are kept
  await env.FILES.put('bins-history/' + id + '/' + new Date().toISOString() + '.json', body);
  try { const l = await env.FILES.list({ prefix: 'bins-history/' + id + '/' }); const old = l.objects.map(o => o.key).sort().slice(0, -30); if (old.length) await env.FILES.delete(old); } catch (e) {}
  if (env.PUSH) { await env.PUSH.put('bin:' + id, JSON.stringify({ at: Date.now(), data })); await env.PUSH.delete('favourites'); }
}
export async function binProxy(req, env, u, ctx) {
  const id = u.pathname.split('/')[2] || '';
  // copy everything from JSONBin to Cloudflare (once): /bin/migrate?key=<BIN_KEY>
  if (id === 'migrate') {
    if (!env.BIN_KEY || u.searchParams.get('key') !== env.BIN_KEY) return new Response('forbidden', { status: 403, headers: CORS });
    const out = {};
    for (const b of ALL_BINS) {
      try { const d = await fromJsonbin(env, b); await binPut(env, b, d); out[b] = 'ok ' + JSON.stringify(d).length + ' bytes'; }
      catch (e) { out[b] = 'error ' + (e && e.message); }
    }
    return new Response(JSON.stringify(out, null, 1), { headers: { ...CORS, 'content-type': 'application/json' } });
  }
  // one-time import of the JSONBin exports (encrypted with BIN_KEY): /bin/import?key=<BIN_KEY>
  if (id === 'import') {
    if (!env.BIN_KEY || u.searchParams.get('key') !== env.BIN_KEY) return new Response('forbidden', { status: 403, headers: CORS });
    const buf = new Uint8Array(await (await fetch('https://raw.githubusercontent.com/mazenDevloper/studio/main/worker/seed.bin?v=' + Date.now())).arrayBuffer());
    const k = await crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', new TextEncoder().encode(env.BIN_KEY)), 'AES-GCM', false, ['decrypt']);
    const gz = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, k, buf.slice(12));
    const all = JSON.parse(await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
    const out = {};
    for (const [b, d] of Object.entries(all)) { try { await binPut(env, b, d); out[b] = 'ok ' + JSON.stringify(d).length + ' bytes'; } catch (e) { out[b] = 'error ' + (e && e.message); } }
    return new Response(JSON.stringify(out, null, 1), { headers: { ...CORS, 'content-type': 'application/json' } });
  }
  if (id === 'status') {
    const out = {};
    for (const b of ALL_BINS) { const o = await env.FILES.head('bins/' + b + '.json'); out[b] = o ? { bytes: o.size, at: o.uploaded } : null; }
    return new Response(JSON.stringify(out, null, 1), { headers: { ...CORS, 'content-type': 'application/json' } });
  }
  if (!BIN_OK.test(id)) return new Response('bad bin', { status: 400, headers: CORS });
  if (req.method === 'GET') {
    try {
      const data = await binGet(env, id, ctx);
      // same shape as JSONBin's /latest so older app versions keep working
      const body = u.searchParams.get('meta') === '1' ? { record: data, metadata: { id } } : data;
      return new Response(JSON.stringify(body), { headers: { ...CORS, 'content-type': 'application/json', 'x-from': 'cloudflare' } });
    } catch (e) { return new Response(JSON.stringify({ message: String(e && e.message) }), { status: 502, headers: CORS }); }
  }
  if (req.method === 'PUT' || req.method === 'POST') {
    let data; try { data = JSON.parse(await req.text()); } catch (e) { return new Response('bad json', { status: 400, headers: CORS }); }
    await binPut(env, id, data);
    if (env.LIVE) ctx.waitUntil(env.LIVE.get(env.LIVE.idFromName('stadium')).fetch('https://do/notify', { method: 'POST', body: JSON.stringify({ type: 'bin', id, from: u.searchParams.get('from') || '' }) }));
    return new Response(JSON.stringify({ ok: true, record: data }), { headers: { ...CORS, 'content-type': 'application/json' } });
  }
  return new Response('method', { status: 405, headers: CORS });
}
