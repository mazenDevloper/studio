// DriveCast / Madar server: does the fetching and merging so the phones only download one small, ready file.
//   GET /matches?lang=27|1   your favourite teams' games (live, coming, finished today), cached 20 s
//   GET /favourites          favourite teams from the cloud bin, cached 10 min
// Push (goal alerts / Live Activity updates with the app closed) plugs into scheduled() once an APNs key exists.
const BIN = 'https://api.jsonbin.io/v3/b/69c782cbb7ec241ddcb0b99a/latest';
const LOGO = id => 'https://imagecache.365scores.com/image/upload/f_png,w_64,h_64,c_limit,q_auto:eco/Competitors/' + id;
const H = { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' };

async function cached(req, ctx, ttl, make) {
  const cache = caches.default, key = new Request(req.url);
  const hit = new URL(req.url).searchParams.has('fresh') ? null : await cache.match(key); if (hit) return hit;
  const res = new Response(JSON.stringify(await make()), { headers: { ...H, 'cache-control': `public, max-age=${ttl}` } });
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

let favCache = null, favAt = 0;
async function favourites(env) {
  if (favCache && Date.now() - favAt < 10 * 60e3) return favCache;   // the bin is read at most every 10 minutes
  const r = await fetch(BIN, { headers: { 'X-Master-Key': env.BIN_KEY, 'X-Bin-Meta': 'false' }, cf: { cacheTtl: 600 } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('jsonbin ' + r.status + (env.BIN_KEY ? '' : ' (BIN_KEY missing)') + ': ' + (d.message || ''));
  const list = (d.record || d).favoriteTeams;
  if (!Array.isArray(list)) throw new Error('no favoriteTeams in bin (keys: ' + Object.keys(d.record || d).slice(0, 12).join(',') + ')');
  favCache = list.filter(t => t && +t.id > 0)
    .map(t => ({ id: +t.id, name: t.name || '', country: t.country || '', island: t.island !== false, logo: LOGO(t.id) }));
  favAt = Date.now();
  return favCache;
}

async function matches(env, lang) {
  const teams = await favourites(env);
  if (!teams.length) return { matches: [], teams };
  const u = `https://webws.365scores.com/web/games/current/?appTypeId=5&langId=${lang}&timezoneName=Asia/Muscat&userCountryId=1&competitors=${teams.map(t => t.id).join(',')}`;
  const d = await (await fetch(u, { headers: { origin: 'https://www.365scores.com', referer: 'https://www.365scores.com/' } })).json();
  const isl = new Set(teams.filter(t => t.island).map(t => t.id)), now = Date.now(), out = [];
  for (const g of d.games || []) {
    const h = g.homeCompetitor, a = g.awayCompetitor; if (!h || !a || !g.startTime) continue;
    const grp = g.statusGroup, txt = g.statusText || '';
    if (grp !== 3 && grp !== 4 && /postpon|cancel|abandon|suspend|مؤجل|ملغ/i.test(txt)) continue;
    const status = grp === 3 ? 'live' : grp === 4 ? 'finished' : 'upcoming', t = Date.parse(g.startTime);
    if (status === 'upcoming' && (t - now > 36 * 3.6e6 || now - t > 3 * 3.6e6)) continue;
    if (status === 'finished' && now - t > 8 * 3.6e6) continue;
    const st = status !== 'upcoming', sc = v => st && typeof v === 'number' && v >= 0 ? v : null;
    out.push({ id: '365' + g.id, status, statusText: txt, timestamp: t / 1000,
      home: { id: '' + h.id, name: h.name, logo: LOGO(h.id) }, away: { id: '' + a.id, name: a.name, logo: LOGO(a.id) },
      score: { home: sc(h.score), away: sc(a.score) }, league: { id: '' + g.competitionId, name: g.competitionDisplayName || '' },
      omanTime: new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Muscat' }),
      favorite: isl.has(h.id) || isl.has(a.id), mine: true, elapsed: status === 'live' && g.gameTime >= 0 ? Math.floor(g.gameTime) : undefined });
  }
  out.sort((x, y) => (y.status === 'live') - (x.status === 'live') || x.timestamp - y.timestamp);
  return { matches: out, teams, at: now };
}

export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...H, 'access-control-allow-headers': '*' } });
    try {
      if (u.pathname === '/matches') return await cached(req, ctx, 10, () => matches(env, u.searchParams.get('lang') === '1' ? 1 : 27));
      if (u.pathname === '/favourites') return await cached(req, ctx, 600, () => favourites(env));
      return new Response(JSON.stringify({ ok: true, endpoints: ['/matches', '/favourites'] }), { headers: H });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e && e.message || e) }), { status: 502, headers: H });
    }
  },
  async scheduled(_ev, env, ctx) {
    // Keeps the cache warm while games are on; goal detection + APNs push go here (needs APNS_KEY / TEAM_ID / KEY_ID).
    ctx.waitUntil(matches(env, 27).catch(() => {}));
  },
};
