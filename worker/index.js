import { handle as pushPage, watch } from './push.js';
import { ask } from './assistant.js';
import { files, favFromDb, favToDb, binProxy, binGet } from './files.js';
import { readable, health } from './reader.js';
import { visionBody } from './vision.js';
import { summarize, translate, visionAsk } from './smart.js';
export { Live } from './live.js';
export { Screens } from './screen.js';
export { Hub } from './hub.js';
import { hubLibrary } from './hub.js';
import { lkToken } from './livekit.js';
import { welcome } from './welcome.js';
// DriveCast / Madar server: does the fetching and merging so the phones only download one small, ready file.
//   GET /matches?lang=27|1   your favourite teams' games (live, coming, finished today), cached 20 s
//   GET /favourites          favourite teams from the cloud bin, cached 10 min
// Push (goal alerts / Live Activity updates with the app closed) plugs into scheduled() once an APNs key exists.
const BIN = 'https://api.jsonbin.io/v3/b/69c782cbb7ec241ddcb0b99a/latest';
const LOGO = id => 'https://imagecache.365scores.com/image/upload/f_png,w_64,h_64,c_limit,q_auto:eco/Competitors/' + id;
const H = { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' };

// 365scores with a time limit and one retry: a slow answer never holds a screen, a single hiccup never empties it
const S365 = { origin: 'https://www.365scores.com', referer: 'https://www.365scores.com/', 'user-agent': 'Mozilla/5.0' };
async function get365(url, ms = 5000, cf) {
  let err;
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(url + (i ? '&r=' + Date.now() : ''), { headers: S365, signal: AbortSignal.timeout(i ? ms + 2000 : ms), ...(cf ? { cf } : {}) });
      if (!r.ok) throw new Error('365 ' + r.status);
      return await r.json();
    } catch (e) { err = e; }
  }
  throw err;
}

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
  const db = await favFromDb(env); if (db && db.length) { favCache = db; favAt = Date.now(); return db; }   // shared by every server copy
  const d = await binGet(env, BIN.split('/')[5]);
  const list = (d.record || d).favoriteTeams;
  if (!Array.isArray(list)) throw new Error('no favoriteTeams in bin (keys: ' + Object.keys(d.record || d).slice(0, 12).join(',') + ')');
  favCache = list.filter(t => t && +t.id > 0)
    .map(t => ({ id: +t.id, name: t.name || '', country: t.country || '', island: t.island !== false, logo: LOGO(t.id) }));
  favAt = Date.now();
  await favToDb(env, favCache);
  return favCache;
}

// goals with scorer and minute for the live (and just-finished) games. The details of a game are asked again only when
// its score changes (at once) or every 45 s (late corrections); a failed answer keeps the scorers already known.
const goalMemo = new Map();   // gameId|lang -> { key, at, goals }
async function goalsOf(list, lang) {
  const out = {};
  const want = list.filter(m => m.status === 'live' || (m.status === 'finished' && Date.now() / 1000 - m.timestamp < 3 * 3600))
    .filter(m => (m.score.home ?? 0) + (m.score.away ?? 0) > 0).slice(0, 10);
  await Promise.all(want.map(async m => {
    const mk = m.id + '|' + lang, key = (m.score.home ?? 0) + '-' + (m.score.away ?? 0), old = goalMemo.get(mk);
    const total = (m.score.home ?? 0) + (m.score.away ?? 0);
    if (old && old.key === key && old.goals.length >= total && Date.now() - old.at < 45e3) { out[m.id] = old.goals; return; }
    try {
      const id = m.id.replace(/^365/, '');
      const d = await get365(`https://webws.365scores.com/web/game/?appTypeId=5&langId=${lang}&timezoneName=Asia/Muscat&userCountryId=1&gameId=${id}`, 4000);
      const g = d.game || {}, members = new Map((g.members || []).map(x => [x.id, x.shortName || x.name]));
      const goals = (g.events || []).filter(e => e.eventType && e.eventType.id === 1).map(e => ({
        side: e.competitorId === m.homeNum ? 'home' : 'away',
        minute: e.gameTimeDisplay || (Math.round(e.gameTime || 0) + "'"),
        player: members.get(e.playerId) || '',
        type: e.eventType.subTypeId === 2 ? 'own' : e.eventType.subTypeId === 3 ? 'penalty' : 'goal',
      }));
      // the score moved before the details caught up: keep the known scorers, ask again next round
      const best = old && old.goals.length > goals.length && old.key === key ? old.goals : goals;
      goalMemo.set(mk, { key, at: goals.length >= total ? Date.now() : 0, goals: best });
      out[m.id] = best;
    } catch (e) { if (old) out[m.id] = old.goals; /* no details: the score still moves */ }
  }));
  if (goalMemo.size > 200) for (const k of [...goalMemo.keys()].slice(0, 100)) goalMemo.delete(k);
  return out;
}

const lastGood = {};
async function matches(env, lang) {
  const teams = await favourites(env);
  if (!teams.length) return { matches: [], teams };
  const u = `https://webws.365scores.com/web/games/current/?appTypeId=5&langId=${lang}&timezoneName=Asia/Muscat&userCountryId=1&competitors=${teams.map(t => t.id).join(',')}`;
  let d;
  try { d = await get365(u, 5000); }
  catch (e) {
    // 365scores is down / slow: the last good list (this copy, else the one every copy shares) instead of an error
    const last = lastGood[lang] || JSON.parse(await env.PUSH?.get('matches:' + lang) || 'null');
    if (last) return { ...last, stale: true };
    throw e;
  }
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
  const res = { matches: out, teams, at: now };
  lastGood[lang] = res;
  if (env.PUSH && now - (lastGood['t' + lang] || 0) > 60e3) { lastGood['t' + lang] = now; env.PUSH.put('matches:' + lang, JSON.stringify(res), { expirationTtl: 86400 }).catch(() => {}); }
  return res;
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
  const d = await binGet(env, url.split('/')[5]); return d.record || d;
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
      const iq = s.iqamahDuration ?? ({ fajr: 25, dhuhr: 20, asr: 20, maghrib: 10, isha: 20 })[s.id] ?? 0;
      if (iq > 0) out.push({ title: 'إقامة ' + s.name, at: azan + iq * 6e4, kind: 'iqamah' });
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

// «اليوم» for every screen: your teams' matches, prayers / iqamahs, reminders and Madar's plan, one sorted list
async function today(env) {
  const [m, ev, st] = await Promise.all([matches(env, 27).catch(() => ({ matches: [] })), events(env).catch(() => ({ events: [] })),
    env.HUB.get(env.HUB.idFromName('home')).fetch('https://hub/hub/state').then(r => r.json()).catch(() => ({}))]);
  const now = Date.now(), endOfDay = Date.parse(new Date(now + 4 * 3.6e6).toISOString().slice(0, 10) + 'T23:59:59Z') - 4 * 3.6e6 + 2 * 3.6e6;
  const items = [];
  for (const x of m.matches || []) {
    const at = (x.timestamp || 0) * 1000;
    if (x.status !== 'live' && (at < now - 3 * 3.6e6 || at > endOfDay)) continue;
    items.push({ kind: 'match', at, title: x.home.name + ' × ' + x.away.name, sub: x.status === 'live' ? `🔴 ${x.score.home ?? 0}-${x.score.away ?? 0} · ${x.minute || ''}` : x.status === 'finished' ? `انتهت ${x.score.home ?? 0}-${x.score.away ?? 0}` : (x.league?.name || ''), live: x.status === 'live', fav: !!x.favorite, logos: [x.home.logo, x.away.logo].filter(Boolean), id: x.id });
  }
  for (const e of ev.events || []) if (e.at <= endOfDay) items.push({ kind: e.kind, at: e.at, title: e.title });
  const plan = st.state?.plan; if (plan?.today) items.push({ kind: 'plan', at: Math.max(now, plan.at || now), title: plan.today, sub: 'مدار' });
  for (const i of st.state?.islands || []) if (i.at && i.at > now && i.at < endOfDay) items.push({ kind: 'timer', at: i.at, title: i.title, sub: i.sub || '' });
  items.sort((a, b) => (b.live ? 1 : 0) - (a.live ? 1 : 0) || a.at - b.at);
  return { at: now, items: items.slice(0, 30) };
}

// everything the screens show, in one answer (also sent over /live)
export async function nowData(env, lang) {
  const [m, ev] = await Promise.all([matches(env, lang), events(env).catch(() => ({ events: [] }))]);
  return { ...m, goals: await goalsOf(m.matches, lang), events: ev.events };
}

export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...H, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, PUT, OPTIONS' } });
    try {
      if (u.pathname === '/push' || u.pathname.startsWith('/push/') || u.pathname === '/push-sw.js') { const r = await pushPage(req, env, u); if (r) return r; }
      if (u.pathname === '/matches') return await cached(req, ctx, 10, () => matches(env, u.searchParams.get('lang') === '1' ? 1 : 27));
      // everything the apps show, in one answer: matches (+ goals with scorers) and today's / tomorrow's prayers and reminders
      if (u.pathname === '/now') return await cached(req, ctx, 10, () => nowData(env, u.searchParams.get('lang') === '1' ? 1 : 27));
      // live scores over WebSocket (one Durable Object for every screen)
      if (u.pathname === '/live') {
        if (req.headers.get('upgrade') !== 'websocket') return new Response('WebSocket only', { status: 426 });
        return env.LIVE.get(env.LIVE.idFromName('stadium')).fetch(req);
      }
      // short-lived TURN credentials for the screen mirror (Cloudflare Realtime), shared for an hour
      if (u.pathname === '/turn' && !env.TURN_TOKEN) return new Response(JSON.stringify({ iceServers: [], error: 'TURN_TOKEN secret missing' }), { headers: H });
      if (u.pathname === '/turn') return await cached(req, ctx, 3600, async () => {
        const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
          { method: 'POST', headers: { authorization: 'Bearer ' + env.TURN_TOKEN, 'content-type': 'application/json' }, body: JSON.stringify({ ttl: 86400 }) });
        const d = await r.json().catch(() => ({}));
        return { iceServers: (d.iceServers || []).map(s => ({ ...s, urls: [].concat(s.urls).filter(x => !/:53\b/.test(x)) })) };
      });
      if (u.pathname === '/vision/body' && req.method === 'POST') return new Response(JSON.stringify(await visionBody(req, env).catch(e => ({ ok: false, error: String(e && e.message || e) }))), { headers: H });
      for (const [path, fn] of [['/summarize', summarize], ['/translate', translate], ['/vision/ask', visionAsk]])
        if (u.pathname === path && req.method === 'POST') return new Response(JSON.stringify(await fn(req, env).catch(e => ({ ok: false, error: String(e && e.message || e) }))), { headers: H });
      // «المركز»: the shared home of Madar and DriveCast (one Durable Object)
      if (u.pathname === '/hub/welcome') return await cached(req, ctx, 20, () => welcome(env));
      if (u.pathname === '/hub/today') return await cached(req, ctx, 30, () => today(env));
      if (u.pathname === '/hub/library') return await cached(req, ctx, 120, () => hubLibrary(env));
      if (u.pathname.startsWith('/hub/')) return env.HUB.get(env.HUB.idFromName('home')).fetch(req);
      if (u.pathname === '/ask' && req.method === 'POST') return new Response(JSON.stringify(await ask(req, env)), { headers: H });
      // the iPhone's screen inside Madar (ReplayKit broadcast → here → every Madar watching)
      if (u.pathname.startsWith('/screen/')) return env.SCREENS.get(env.SCREENS.idFromName('all')).fetch(req);
      if (u.pathname === '/lk/token') return new Response(JSON.stringify(await lkToken(env, u)), { headers: H });
      if (u.pathname.startsWith('/bin/')) return await binProxy(req, env, u, ctx);
      if (u.pathname.startsWith('/ipa/') || u.pathname.startsWith('/f/') || u.pathname.startsWith('/m/') || u.pathname === '/upload') { const r = await files(req, env, u); if (r) return r; }
      // Madar's reader: the readable text of a web article; Madar's sports mode: weight / workouts from Apple Health (Shortcuts)
      if (u.pathname === '/read') return await cached(req, ctx, 3600, () => readable(u.searchParams.get('url')));
      if (u.pathname.startsWith('/health/')) return await health(req, env, u);
      if (u.pathname === '/img') return await image(u.searchParams.get('u'), ctx);
      if (u.pathname === '/events') return await cached(req, ctx, 60, () => events(env));
      if (u.pathname === '/favourites') return await cached(req, ctx, 600, () => favourites(env));
      return new Response(JSON.stringify({ ok: true, endpoints: ['/now', '/matches', '/favourites', '/events', '/live (ws)', '/ask', '/ipa/madar', '/ipa/drivecast', '/f/assets/…', '/m/<360 video>', '/read?url=', '/health/<code>', '/push'] }), { headers: H });
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e && e.message || e) }), { status: 502, headers: H });
    }
  },
  async scheduled(_ev, env, ctx) {
    // Keeps the cache warm while games are on; goal detection + APNs push go here (needs APNS_KEY / TEAM_ID / KEY_ID).
    // goals / kick-offs / final whistles → Web Push to the phones that turned alerts on (/push)
    ctx.waitUntil(watch(env, matches, goalsOf).catch(e => console.log('watch', e && e.message)));
  },
};
