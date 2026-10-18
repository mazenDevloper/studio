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

// goals with scorer and minute for the live (and just-finished) games: one detail request per game, at most 8
async function goalsOf(list, lang) {
  const out = {};
  const want = list.filter(m => m.status === 'live' || (m.status === 'finished' && Date.now() / 1000 - m.timestamp < 3 * 3600))
    .filter(m => (m.score.home ?? 0) + (m.score.away ?? 0) > 0).slice(0, 8);
  await Promise.all(want.map(async m => {
    try {
      const id = m.id.replace(/^365/, '');
      const d = await (await fetch(`https://webws.365scores.com/web/game/?appTypeId=5&langId=${lang}&timezoneName=Asia/Muscat&userCountryId=1&gameId=${id}`,
        { headers: { origin: 'https://www.365scores.com', referer: 'https://www.365scores.com/' }, cf: { cacheTtl: 15 } })).json();
      const g = d.game || {}, members = new Map((g.members || []).map(x => [x.id, x.shortName || x.name]));
      out[m.id] = (g.events || []).filter(e => e.eventType && e.eventType.id === 1).map(e => ({
        side: e.competitorId === m.homeNum ? 'home' : 'away',
        minute: e.gameTimeDisplay || (Math.round(e.gameTime || 0) + "'"),
        player: members.get(e.playerId) || '',
        type: e.eventType.subTypeId === 2 ? 'own' : e.eventType.subTypeId === 3 ? 'penalty' : 'goal',
      }));
    } catch (e) { /* no details: the score still moves */ }
  }));
  return out;
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
    out.push({ id: '365' + g.id, homeNum: h.id, status, statusText: txt, timestamp: t / 1000,
      home: { id: '' + h.id, name: h.name, logo: LOGO(h.id) }, away: { id: '' + a.id, name: a.name, logo: LOGO(a.id) },
      score: { home: sc(h.score), away: sc(a.score) }, league: { id: '' + g.competitionId, name: g.competitionDisplayName || '' },
      omanTime: new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Muscat' }),
      favorite: isl.has(h.id) || isl.has(a.id), mine: true, elapsed: status === 'live' && g.gameTime >= 0 ? Math.floor(g.gameTime) : undefined });
  }
  out.sort((x, y) => (y.status === 'live') - (x.status === 'live') || x.timestamp - y.timestamp);
  return { matches: out, teams, at: now };
}

// ---- prayers + reminders (the same rules as the site's island bridge), Oman time (UTC+4) ----
const PRAYER_BIN = 'https://api.jsonbin.io/v3/b/69a00f6eae596e708f4b7291/latest';
const DEFAULT_SETTINGS = [
  { id: 'fajr', name: 'الفجر', offsetMinutes: 0, iqamahDuration: 25 }, { id: 'dhuhr', name: 'الظهر', offsetMinutes: 0, iqamahDuration: 20 },
  { id: 'asr', name: 'العصر', offsetMinutes: 0, iqamahDuration: 20 }, { id: 'maghrib', name: 'المغرب', offsetMinutes: 0, iqamahDuration: 10 },
  { id: 'isha', name: 'العشاء', offsetMinutes: 0, iqamahDuration: 20 },
];
const tToM = t => { if (!t) return -1; const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
async function bin(url, env) {
  const r = await fetch(url, { headers: { 'X-Master-Key': env.BIN_KEY, 'X-Bin-Meta': 'false' } });
  if (!r.ok) throw new Error('jsonbin ' + r.status);
  const d = await r.json(); return d.record || d;
}
let evCache = null, evAt = 0;
async function events(env) {
  if (!evCache || Date.now() - evAt > 30 * 60e3) {
    const [master, pt] = await Promise.all([bin(BIN, env), bin(PRAYER_BIN, env)]);
    evCache = { master, rows: Array.isArray(pt) ? pt : (pt.prayers || []) }; evAt = Date.now();
  }
  const { master, rows } = evCache;
  const settings = Array.isArray(master.prayerSettings) && master.prayerSettings.length ? master.prayerSettings : DEFAULT_SETTINGS;
  const out = [], now = Date.now();
  for (const off of [0, 1]) {
    const local = new Date(now + 4 * 3.6e6 + off * 864e5), ymd = local.toISOString().slice(0, 10);
    const base = Date.parse(ymd + 'T00:00:00Z') - 4 * 3.6e6;   // Oman midnight
    const row = rows.find(r => r && r.date === ymd)
      || rows.reduce((b, r) => (!b || Math.abs(Date.parse(r.date) - Date.parse(ymd)) < Math.abs(Date.parse(b.date) - Date.parse(ymd))) ? r : b, null);
    if (row) for (const s of settings) {
      const ref = s.id === 'duha' ? row.sunrise : row[s.id]; if (!ref) continue;
      const azan = base + (tToM(ref) + (s.id === 'duha' ? 15 : 0) + (s.offsetMinutes || 0)) * 6e4;
      if (s.showCountdown !== false) out.push({ title: s.name, at: azan, kind: 'azan' });
      if (s.iqamahDuration > 0) out.push({ title: 'إقامة ' + s.name, at: azan + s.iqamahDuration * 6e4, kind: 'iqamah' });
    }
    for (const r of master.reminders || []) {
      if (!r || !r.label) continue;
      if (r.iconType === 'match' && r.matchDate && r.matchDate !== ymd) continue;
      let mins = -1;
      if (r.startType === 'manual' && r.manualStartTime) mins = tToM(r.manualStartTime);
      else if (row && r.startReference && row[r.startReference]) {
        mins = tToM(row[r.startReference]) + (r.startType === 'iqamah' ? (settings.find(x => x.id === r.startReference) || {}).iqamahDuration || 0 : 0) + (r.startOffset || 0);
      }
      if (mins >= 0) out.push({ title: r.label, at: base + mins * 6e4, kind: 'reminder' });
    }
  }
  return { events: out.filter(e => e.at > now - 60e3).sort((a, b) => a.at - b.at), at: now };
}

// team / league logos through Cloudflare's cache (kept close to Oman for a month): they appear at once
async function image(src, ctx) {
  if (!src || !/^https:\/\//.test(src)) return new Response('bad url', { status: 400 });
  const key = new Request('https://img.cache/' + encodeURIComponent(src));
  const hit = await caches.default.match(key); if (hit) return hit;
  const r = await fetch(src, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/*' }, cf: { cacheTtl: 2592000, cacheEverything: true } });
  const type = r.headers.get('content-type') || '';
  if (!r.ok || !type.startsWith('image/')) return new Response('not an image', { status: 404 });
  const res = new Response(r.body, { headers: { 'content-type': type, 'cache-control': 'public, max-age=2592000, immutable', 'access-control-allow-origin': '*' } });
  ctx.waitUntil(caches.default.put(key, res.clone()));
  return res;
}

export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...H, 'access-control-allow-headers': '*' } });
    try {
      if (u.pathname === '/matches') return await cached(req, ctx, 10, () => matches(env, u.searchParams.get('lang') === '1' ? 1 : 27));
      // everything the apps show, in one answer: matches (+ goals with scorers) and today's / tomorrow's prayers and reminders
      if (u.pathname === '/now') return await cached(req, ctx, 10, async () => {
        const lang = u.searchParams.get('lang') === '1' ? 1 : 27;
        const [m, ev] = await Promise.all([matches(env, lang), events(env).catch(() => ({ events: [] }))]);
        return { ...m, goals: await goalsOf(m.matches, lang), events: ev.events };
      });
      if (u.pathname === '/img') return await image(u.searchParams.get('u'), ctx);
      if (u.pathname === '/events') return await cached(req, ctx, 60, () => events(env));
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
