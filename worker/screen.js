// «عكس الآيفون»: the iPhone's own screen inside Madar on a laptop / tablet / another phone.
// The Madar app on the iPhone has a ReplayKit broadcast (Control Center → Screen Recording → مدار): it compresses
// the screen to H.264 with the iPhone's video chip and sends it here; every Madar watching that iPhone gets it and
// decodes it in the browser (WebCodecs). One Durable Object relays them all.
//   wss /screen/send?room=<id>&name=<device>&pin=<6 digits>     the iPhone
//   wss /screen/watch?room=<id>[&pin=…]                            a Madar screen
//   GET /screen/list                                               iPhones broadcasting from the same network
// Frames: binary [1 byte kind: 0 = codec description (avcC), 1 = key frame, 2 = frame][8 bytes µs time][data]
import { DurableObject } from 'cloudflare:workers';

export class Screens extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.cfg = new Map(); this.key = new Map(); this.info = new Map(); }
  async fetch(req) {
    const u = new URL(req.url), ip = req.headers.get('cf-connecting-ip') || '';
    if (u.pathname.endsWith('/list')) {
      const out = [];
      for (const [room, i] of this.info) {
        if (!this.ctx.getWebSockets('s:' + room).length) { this.info.delete(room); continue; }
        if (i.ip === ip) out.push({ room, name: i.name, since: i.at });   // same network: no code needed
      }
      return new Response(JSON.stringify({ senders: out, ip: ip.replace(/\.\d+$/, '.x') }), { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
    }
    if (req.headers.get('upgrade') !== 'websocket') return new Response('WebSocket only', { status: 426 });
    const room = (u.searchParams.get('room') || '').replace(/[^a-z0-9]/gi, '').slice(0, 16);
    if (!room) return new Response('room?', { status: 400 });
    const [client, server] = Object.values(new WebSocketPair());
    if (u.pathname.endsWith('/send')) {
      for (const old of this.ctx.getWebSockets('s:' + room)) { try { old.close(1000, 'replaced'); } catch (e) {} }
      this.ctx.acceptWebSocket(server, ['s:' + room]);
      this.info.set(room, { name: (u.searchParams.get('name') || 'iPhone').slice(0, 40), pin: u.searchParams.get('pin') || '', ip, at: Date.now() });
      this.cfg.delete(room); this.key.delete(room);
    } else {
      const i = this.info.get(room);
      // another network: the 6-digit code the iPhone showed in its notification
      if (!i || (i.ip !== ip && (!i.pin || u.searchParams.get('pin') !== i.pin))) return new Response('not allowed', { status: 403 });
      this.ctx.acceptWebSocket(server, ['w:' + room]);
      const c = this.cfg.get(room), k = this.key.get(room);
      if (c) server.send(c);
      if (k) server.send(k);
      for (const s of this.ctx.getWebSockets('s:' + room)) { try { s.send('key'); s.send('watchers:' + this.ctx.getWebSockets('w:' + room).length); } catch (e) {} }
    }
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws, msg) {
    const tag = this.ctx.getTags(ws)[0] || '', room = tag.slice(2);
    if (tag.startsWith('s:')) {
      if (typeof msg === 'string') return;
      const kind = new Uint8Array(msg, 0, 1)[0];
      if (kind === 0) this.cfg.set(room, msg);
      else if (kind === 1) this.key.set(room, msg);
      for (const w of this.ctx.getWebSockets('w:' + room)) { try { w.send(msg); } catch (e) {} }
    } else if (tag.startsWith('w:') && msg === 'key') {
      for (const s of this.ctx.getWebSockets('s:' + room)) { try { s.send('key'); } catch (e) {} }
    }
  }
  async webSocketClose(ws, code) {
    const tag = this.ctx.getTags(ws)[0] || '', room = tag.slice(2);
    if (tag.startsWith('s:')) { for (const w of this.ctx.getWebSockets('w:' + room)) { try { w.send('ended'); } catch (e) {} } }
    else for (const s of this.ctx.getWebSockets('s:' + room)) { try { s.send('watchers:' + Math.max(0, this.ctx.getWebSockets('w:' + room).length - 1)); } catch (e) {} }
    try { ws.close(code, 'bye'); } catch (e) {}
  }
}
