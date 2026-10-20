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
const TYPES = { glb: 'model/gltf-binary', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', hdr: 'application/octet-stream', mp4: 'video/mp4', json: 'application/json', ipa: 'application/octet-stream', ktx2: 'image/ktx2' };

function serve(obj, name) {
  const h = new Headers({ 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=300', etag: obj.httpEtag });
  obj.writeHttpMetadata(h);
  if (name) h.set('content-disposition', `attachment; filename="${name}"`);
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
    const type = (req.headers.get('content-type') || '').split(';')[0];
    if (!/^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(type)) return new Response(JSON.stringify({ error: 'images only' }), { status: 415, headers: CORS });
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 8e6) return new Response(JSON.stringify({ error: 'too big (8 MB max)' }), { status: 413, headers: CORS });
    const key = 'u/' + crypto.randomUUID() + '.' + ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' })[type];
    await env.FILES.put(key, buf, { httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' } });
    return new Response(JSON.stringify({ url: u.origin + '/f/' + key }), { headers: CORS });
  }
  if (u.pathname.startsWith('/f/u/')) {
    const obj = await env.FILES.get(u.pathname.slice(3));
    return obj ? serve(obj) : new Response('not found', { status: 404 });
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

// ---- the apps' cloud settings (JSONBin) through the server: reads come from KV (instant, no JSONBin quota), saves
// go to JSONBin and KV together, and every open screen is told to reload that part (over /live) ----
const BIN_OK = /^[0-9a-f]{24}$/;
export async function binProxy(req, env, u, ctx) {
  const id = u.pathname.split('/')[2] || '';
  if (!BIN_OK.test(id)) return new Response('bad bin', { status: 400, headers: CORS });
  const key = 'bin:' + id, jb = 'https://api.jsonbin.io/v3/b/' + id;
  if (req.method === 'GET') {
    const hit = env.PUSH && await env.PUSH.get(key, 'json');
    if (hit && Date.now() - hit.at < 5 * 60e3) return new Response(JSON.stringify(hit.data), { headers: { ...CORS, 'x-from': 'kv' } });
    const r = await fetch(jb + '/latest', { headers: { 'X-Master-Key': env.BIN_KEY, 'X-Bin-Meta': 'false' } });
    if (!r.ok) return hit ? new Response(JSON.stringify(hit.data), { headers: { ...CORS, 'x-from': 'kv-stale' } }) : new Response(await r.text(), { status: r.status, headers: CORS });
    const data = await r.json();
    if (env.PUSH) ctx.waitUntil(env.PUSH.put(key, JSON.stringify({ at: Date.now(), data })));
    return new Response(JSON.stringify(data), { headers: { ...CORS, 'x-from': 'jsonbin' } });
  }
  if (req.method === 'PUT') {
    const body = await req.text();
    let data; try { data = JSON.parse(body); } catch (e) { return new Response('bad json', { status: 400, headers: CORS }); }
    const r = await fetch(jb, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Master-Key': env.BIN_KEY, 'X-Bin-Versioning': 'true' }, body });
    if (!r.ok) return new Response(await r.text(), { status: r.status, headers: CORS });
    if (env.PUSH) { await env.PUSH.put(key, JSON.stringify({ at: Date.now(), data })); await env.PUSH.delete('favourites'); }
    if (env.LIVE) ctx.waitUntil(env.LIVE.get(env.LIVE.idFromName('stadium')).fetch('https://do/notify', { method: 'POST', body: JSON.stringify({ type: 'bin', id, from: u.searchParams.get('from') || '' }) }));
    return new Response(JSON.stringify({ ok: true }), { headers: CORS });
  }
  return new Response('method', { status: 405, headers: CORS });
}
