// Live scores over WebSocket: one Durable Object ("the stadium") that every open screen connects to (/live).
// While at least one screen is connected it looks at the matches every 8 s and sends the new state the moment
// anything moved (score, minute, status, scorers, prayers) - the screens stop asking every few seconds.
// Hibernation API: sockets cost nothing while idle; no screen connected = no work at all.
import { DurableObject } from 'cloudflare:workers';
import { nowData } from './index.js';

const EVERY = 8000;

export class Live extends DurableObject {
  async fetch(req) {
    // the server tells every screen that a cloud setting changed (a bin was saved) - they reload just that part
    if (new URL(req.url).pathname === '/notify') {
      const msg = await req.text();
      for (const ws of this.ctx.getWebSockets()) { try { ws.send(msg); } catch (e) {} }
      return new Response('ok');
    }
    const lang = new URL(req.url).searchParams.get('lang') === '1' ? 1 : 27;
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server, ['l' + lang]);
    // the latest state at once, then changes only
    const last = await this.ctx.storage.get('state' + lang);
    if (last) server.send(last);
    else { try { const s = await this.state(lang); server.send(s); } catch (e) {} }
    if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(Date.now() + 1000);
    return new Response(null, { status: 101, webSocket: client });
  }
  async state(lang) {
    const d = await nowData(this.env, lang);
    const s = JSON.stringify({ type: 'now', at: Date.now(), ...d });
    await this.ctx.storage.put('state' + lang, s);
    return s;
  }
  async alarm() {
    for (const lang of [27, 1]) {
      const socks = this.ctx.getWebSockets('l' + lang);
      if (!socks.length) continue;
      try {
        const old = await this.ctx.storage.get('state' + lang);
        const s = await this.state(lang);
        const strip = x => x && x.replace(/"at":\d+,?/g, '');   // the time stamp alone is no change
        if (strip(s) !== strip(old)) for (const ws of socks) { try { ws.send(s); } catch (e) {} }
      } catch (e) { /* the source hiccuped: try again next round */ }
    }
    if (this.ctx.getWebSockets().length) await this.ctx.storage.setAlarm(Date.now() + EVERY);
  }
  async webSocketMessage(ws, msg) { if (msg === 'ping') ws.send('pong'); }
  async webSocketClose(ws, code) { try { ws.close(code, 'bye'); } catch (e) {} }
}
