// R2 (binding FILES): a fast, permanent copy of the big files, filled on first request.
//   GET /ipa/madar | /ipa/drivecast   the latest iPhone app (from the GitHub release), refreshed every 30 min
//   GET /f/<path>                      Madar's assets (models, 360° pictures, environments) from GitHub Pages
// D1 (binding DB): a small table that keeps the favourite teams for every server copy (JSONBin is read far less).

const IPA = {
  madar: 'https://github.com/mazenDevloper/fit/releases/download/ios-latest/Madar.ipa',
  drivecast: 'https://github.com/mazenDevloper/studio/releases/download/ios-latest/DriveCast.ipa',
};
const MADAR = 'https://mazendevloper.github.io/fit/';
const TYPES = { glb: 'model/gltf-binary', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', hdr: 'application/octet-stream', mp4: 'video/mp4', json: 'application/json', ipa: 'application/octet-stream', ktx2: 'image/ktx2' };

function serve(obj, name) {
  const h = new Headers({ 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=300', etag: obj.httpEtag });
  obj.writeHttpMetadata(h);
  if (name) h.set('content-disposition', `attachment; filename="${name}"`);
  return new Response(obj.body, { headers: h });
}

async function mirror(env, key, src, maxAgeMs, type) {
  const head = await env.FILES.head(key);
  const fresh = head && Date.now() - head.uploaded.getTime() < maxAgeMs;
  if (!fresh) {
    try {
      const r = await fetch(src, { redirect: 'follow' });
      if (r.ok) {
        const len = +r.headers.get('content-length');
        const body = len ? r.body.pipeThrough(new FixedLengthStream(len)) : await r.arrayBuffer();
        await env.FILES.put(key, body, { httpMetadata: { contentType: type || r.headers.get('content-type') || 'application/octet-stream' } });
      }
    } catch (e) { /* the source is down: the copy we have still serves */ }
  }
  return env.FILES.get(key);
}

export async function files(req, env, u) {
  if (!env.FILES) return null;
  const m = u.pathname.match(/^\/ipa\/(madar|drivecast)$/);
  if (m) {
    const obj = await mirror(env, 'ipa/' + m[1] + '.ipa', IPA[m[1]], 30 * 60e3, TYPES.ipa);
    return obj ? serve(obj, m[1] === 'madar' ? 'Madar.ipa' : 'DriveCast.ipa') : new Response('not found', { status: 404 });
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
