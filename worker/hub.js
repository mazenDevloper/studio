// «المركز» - one shared home for Madar (the living room) and DriveCast (the car, the TV, the phone).
// One Durable Object keeps everything both apps share and pushes every change to every open device at once over a
// WebSocket (Hibernation API: idle sockets cost nothing, the devices never poll). The server also prepares what the
// devices show (thumbnails, titles, the islands feed, suggestions), so the phones and the headset only draw.
//
//   GET  /hub/ws?id=&name=&kind=&app=   WebSocket: {type:'hello', state, devices} then {type:'set'|'resume'|'msg'|'devices'}
//   GET  /hub/state                     the whole state (+ devices online)
//   POST /hub/op   { op, ... }          same ops as the socket (for widgets / native code / background tasks)
//   GET  /hub/islands                   ready-to-draw islands: next prayer, live matches, continue-watching, Madar's items
//   GET  /hub/library                   DriveCast's library (saved, playlists, continue, channels) with thumbnails
//   GET  /hub/suggest?place=car|room    what you usually watch at this hour in that place
//
// Socket / POST ops:
//   { op:'set', key, value }                       a whole value (scenes, notes, body, plan, islands…)
//   { op:'push', key, item, max? }                 add to a list (history, articles, briefs, ai…)
//   { op:'resume', item:{ id, kind, title, url?, t, dur?, thumb? } }   where you stopped (kind: yt | video | iptv | 360)
//   { op:'send', to:'<device id>'|'kind:<car|tv|phone|madar|…>'|'all', msg }   e.g. msg {type:'open', item} / {type:'control', action}
//   { op:'stat', item, minutes, place }            watching time (for the statistics and the suggestions)
import { DurableObject } from 'cloudflare:workers';
import { nowData } from './index.js';

const H = { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' };
const KEYS = ['resume', 'history', 'scenes', 'notes', 'body', 'workouts', 'plan', 'islands', 'articles', 'briefs', 'ai', 'stats', 'photos', 'inbox', 'profiles'];
const MASTER_BIN = '69c782cbb7ec241ddcb0b99a';
const ytThumb = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const clip = (s, n) => String(s ?? '').slice(0, n);

export class Hub extends DurableObject {
  async load() {
    if (this.st) return this.st;
    const m = await this.ctx.storage.get(KEYS);
    this.st = {}; for (const k of KEYS) this.st[k] = m.get(k) ?? (['history', 'articles', 'briefs', 'ai', 'islands', 'photos', 'inbox'].includes(k) ? [] : {});
    return this.st;
  }
  devices() {
    return this.ctx.getWebSockets().map(ws => { const a = ws.deserializeAttachment() || {}; return { id: a.id, name: a.name, kind: a.kind, app: a.app, since: a.at }; }).filter(d => d.id);
  }
  broadcast(obj, except) { const s = JSON.stringify(obj); for (const ws of this.ctx.getWebSockets()) if (ws !== except) { try { ws.send(s); } catch (e) {} } }
  async fetch(req) {
    const u = new URL(req.url), p = u.pathname;
    if (p.endsWith('/ws')) {
      if (req.headers.get('upgrade') !== 'websocket') return new Response('WebSocket only', { status: 426 });
      const [client, server] = Object.values(new WebSocketPair());
      const me = { id: clip(u.searchParams.get('id'), 40), name: clip(u.searchParams.get('name') || 'جهاز', 40), kind: clip(u.searchParams.get('kind') || 'phone', 16), app: clip(u.searchParams.get('app') || 'drivecast', 16), at: Date.now() };
      for (const old of this.ctx.getWebSockets()) { const a = old.deserializeAttachment(); if (a?.id === me.id) { try { old.close(1000, 'replaced'); } catch (e) {} } }
      this.ctx.acceptWebSocket(server); server.serializeAttachment(me);
      server.send(JSON.stringify({ type: 'hello', state: await this.load(), devices: this.devices(), you: me }));
      this.broadcast({ type: 'devices', devices: this.devices() }, server);
      return new Response(null, { status: 101, webSocket: client });
    }
    if (p.endsWith('/state')) return new Response(JSON.stringify({ state: await this.load(), devices: this.devices() }), { headers: H });
    if (p.endsWith('/op') && req.method === 'POST') { const r = await this.op(await req.json().catch(() => ({})), { id: 'http', name: 'الخادم', kind: 'server', app: 'server' }); return new Response(JSON.stringify(r), { headers: H }); }
    if (p.endsWith('/islands')) return new Response(JSON.stringify(await this.islands(u.searchParams.get('device') || '')), { headers: H });
    if (p.endsWith('/suggest')) return new Response(JSON.stringify(await this.suggest(u.searchParams.get('place') || 'room')), { headers: H });
    return new Response('?', { status: 404 });
  }
  async webSocketMessage(ws, msg) {
    let d; try { d = JSON.parse(msg); } catch (e) { return; }
    if (d.op === 'ping') { try { ws.send('{"type":"pong"}'); } catch (e) {} return; }
    await this.op(d, ws.deserializeAttachment() || {}, ws);
  }
  async webSocketClose(ws) { try { ws.close(1000, 'bye'); } catch (e) {} this.broadcast({ type: 'devices', devices: this.devices().filter(x => x.id !== (ws.deserializeAttachment() || {}).id) }); }
  async webSocketError(ws) { this.webSocketClose(ws); }

  async op(d, from, ws) {
    const st = await this.load(), save = k => this.ctx.storage.put(k, st[k]);
    const who = { id: from.id, name: from.name, kind: from.kind, app: from.app };
    if (d.op === 'set' && KEYS.includes(d.key) && d.key !== 'stats') {
      st[d.key] = d.value ?? null; await save(d.key);
      this.broadcast({ type: 'set', key: d.key, value: st[d.key], from: who }, ws); return { ok: true };
    }
    if (d.op === 'push' && KEYS.includes(d.key) && Array.isArray(st[d.key])) {
      const item = { ...d.item, at: Date.now(), from: who };
      st[d.key] = [item, ...st[d.key].filter(x => !d.item?.id || x.id !== d.item.id)].slice(0, Math.min(200, d.max || 60)); await save(d.key);
      this.broadcast({ type: 'set', key: d.key, value: st[d.key], from: who }, ws); return { ok: true };
    }
    if (d.op === 'resume' && d.item?.id) {
      const it = { ...d.item, id: clip(d.item.id, 300), title: clip(d.item.title, 200), at: Date.now(), from: who };
      if (it.kind === 'yt' && !it.thumb) it.thumb = ytThumb(it.id);
      if (it.kind === 'yt' && !it.title) { try { const o = await (await fetch('https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=' + it.id)).json(); it.title = clip(o.title, 200); it.channel = clip(o.author_name, 80); } catch (e) {} }
      const done = it.dur && it.t > it.dur - 30;   // finished: no longer "continue"
      const r = { ...st.resume }; if (done) delete r[it.id]; else r[it.id] = it;
      const keep = Object.values(r).sort((a, b) => b.at - a.at).slice(0, 40); st.resume = Object.fromEntries(keep.map(x => [x.id, x]));
      if (!st.history[0] || st.history[0].id !== it.id) { st.history = [{ id: it.id, kind: it.kind, title: it.title, thumb: it.thumb, url: it.url, at: it.at, from: who }, ...st.history.filter(x => x.id !== it.id)].slice(0, 80); await save('history'); }
      await save('resume');
      this.broadcast({ type: 'resume', item: done ? { ...it, done: true } : it, from: who }, ws); return { ok: true, item: it };
    }
    if (d.op === 'send' && d.msg) {
      const to = String(d.to || 'all'), out = JSON.stringify({ type: 'msg', from: who, msg: d.msg }); let n = 0;
      for (const s of this.ctx.getWebSockets()) {
        if (s === ws) continue;
        const a = s.deserializeAttachment() || {};
        if (to === 'all' || a.id === to || (to.startsWith('kind:') && (a.kind === to.slice(5) || a.app === to.slice(5)))) { try { s.send(out); n++; } catch (e) {} }
      }
      return { ok: n > 0, delivered: n };
    }
    if (d.op === 'stat' && d.item?.id) {
      const h = new Date(Date.now() + 4 * 3600e3).getUTCHours(), place = d.place === 'car' ? 'car' : 'room', k = place + ':' + h;
      const s = st.stats || {}; s.total = s.total || {}; s.slots = s.slots || {}; s.items = s.items || {};
      const m = Math.max(0, Math.min(30, +d.minutes || 0)), day = new Date(Date.now() + 4 * 3600e3).toISOString().slice(0, 10);
      s.total[day + ':' + place] = Math.round(((s.total[day + ':' + place] || 0) + m) * 10) / 10;
      const it = { id: d.item.id, kind: d.item.kind, title: clip(d.item.title, 120), thumb: d.item.thumb || (d.item.kind === 'yt' ? ytThumb(d.item.id) : ''), url: d.item.url };
      s.items[it.id] = { ...it, m: Math.round(((s.items[it.id]?.m || 0) + m) * 10) / 10 };
      s.slots[k] = s.slots[k] || {}; s.slots[k][it.id] = (s.slots[k][it.id] || 0) + m;
      // keep it small: the 300 most watched, the last 30 days
      const items = Object.values(s.items).sort((a, b) => b.m - a.m).slice(0, 300); s.items = Object.fromEntries(items.map(x => [x.id, x]));
      for (const key of Object.keys(s.total)) if (key < new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)) delete s.total[key];
      st.stats = s; await save('stats'); return { ok: true };
    }
    return { ok: false, error: 'op?' };
  }
  // the islands every device draws the same way - prepared here
  async islands(device) {
    const st = await this.load(), out = [], now = Date.now();
    let d = null; try { d = await nowData(this.env, 27); } catch (e) {}
    const ev = (d?.events || []).find(e => e.at > now);
    if (ev) out.push({ id: 'ev:' + ev.title, kind: 'prayer', icon: '🕌', title: ev.title, at: ev.at, tint: '#0f766e' });
    for (const m of (d?.matches || []).filter(m => m.status === 'live').slice(0, 3)) out.push({ id: 'm:' + m.id, kind: 'match', icon: '⚽', title: `${m.home.name} ${m.score?.home ?? 0}-${m.score?.away ?? 0} ${m.away.name}`, sub: m.elapsed ? m.elapsed + "'" : '', tint: '#16a34a', logos: [m.home.logo, m.away.logo] });
    const cont = Object.values(st.resume).filter(r => r.from?.id !== device && now - r.at < 24 * 3600e3).sort((a, b) => b.at - a.at)[0];
    if (cont) out.push({ id: 'c:' + cont.id, kind: 'continue', icon: '▶', title: cont.title || 'تابع المشاهدة', sub: 'من ' + (cont.from?.name || '') + ' · ' + fmt(cont.t), thumb: cont.thumb, tint: '#e11d48', action: { type: 'open', item: cont } });
    for (const i of st.islands || []) if (!i.until || i.until > now) out.push({ ...i, kind: i.kind || 'madar' });
    const plan = st.plan; if (plan?.today) out.push({ id: 'plan', kind: 'workout', icon: '💪', title: plan.today, sub: plan.goal || '', tint: '#ea580c' });
    return { at: now, islands: out };
  }
  async suggest(place) {
    const st = await this.load(), s = st.stats || {}, h = new Date(Date.now() + 4 * 3600e3).getUTCHours(), score = {};
    for (const dh of [-1, 0, 1]) for (const [id, m] of Object.entries(s.slots?.[place + ':' + ((h + dh + 24) % 24)] || {})) score[id] = (score[id] || 0) + m * (dh ? 0.5 : 1);
    const list = Object.entries(score).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => s.items?.[id]).filter(Boolean);
    const day = new Date(Date.now() + 4 * 3600e3).toISOString().slice(0, 10);
    return { place, hour: h, items: list, today: { car: s.total?.[day + ':car'] || 0, room: s.total?.[day + ':room'] || 0 } };
  }
}
const fmt = t => { t = Math.max(0, Math.round(t || 0)); return (t >= 3600 ? Math.floor(t / 3600) + ':' : '') + String(Math.floor(t / 60) % 60).padStart(t >= 3600 ? 2 : 1, '0') + ':' + String(t % 60).padStart(2, '0'); };

// DriveCast's library from its cloud copy (the master bin, cached 5 min in KV), compact and with thumbnails
export async function hubLibrary(env) {
  let data = env.PUSH && await env.PUSH.get('bin:' + MASTER_BIN, 'json').then(x => x && Date.now() - x.at < 5 * 60e3 ? x.data : null);
  if (!data) {
    const r = await fetch('https://api.jsonbin.io/v3/b/' + MASTER_BIN + '/latest', { headers: { 'X-Master-Key': env.BIN_KEY, 'X-Bin-Meta': 'false' } });
    if (!r.ok) return { ok: false, error: 'bin ' + r.status };
    data = await r.json(); if (env.PUSH) await env.PUSH.put('bin:' + MASTER_BIN, JSON.stringify({ at: Date.now(), data }));
  }
  const v = x => x && x.id ? { id: x.id, title: clip(x.title, 160), thumb: x.thumbnail || ytThumb(x.id), channel: clip(x.channelTitle, 60), live: !!x.isLive } : null;
  return {
    ok: true,
    continue: (data.continueWatching || []).slice(0, 30).map(c => ({ ...v(c.video), t: c.progress || 0 })).filter(x => x.id),
    saved: (data.savedVideos || []).slice(0, 80).map(v).filter(Boolean),
    playlists: (data.playlists || []).slice(0, 20).map(p => ({ id: p.id, name: clip(p.name, 60), videos: (p.videos || []).slice(0, 60).map(v).filter(Boolean) })),
  };
}
