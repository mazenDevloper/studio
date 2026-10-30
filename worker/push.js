// Free goal alerts with the phone locked and the app frozen: Web Push (iOS 16.4+, from a page added to the Home
// Screen). No Apple developer account: the push carries no data (so nothing to encrypt) - it only wakes the page's
// service worker, which fetches /push/latest and shows the alerts. Stored in Workers KV (binding PUSH):
//   vapid  - this server's signing key (made once, here)   subs - the phones' push addresses
//   state  - each match's last score/status                alerts - the latest alerts (goals, kick-offs, final whistles)

const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const J = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'cache-control': 'no-store' } });

async function vapid(env) {
  let v = await env.PUSH.get('vapid', 'json');
  if (!v) {
    const k = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    v = { priv: await crypto.subtle.exportKey('jwk', k.privateKey), pub: b64u(await crypto.subtle.exportKey('raw', k.publicKey)) };
    await env.PUSH.put('vapid', JSON.stringify(v));
  }
  return v;
}

// a data-less push: only the VAPID signature (ES256 JWT)
async function send(env, v, sub) {
  const aud = new URL(sub.endpoint).origin;
  const enc = o => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = enc({ typ: 'JWT', alg: 'ES256' }) + '.' + enc({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'mailto:drivecast@c-p.workers.dev' });
  const key = await crypto.subtle.importKey('jwk', v.priv, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned));
  const r = await fetch(sub.endpoint, { method: 'POST', headers: { TTL: '600', Urgency: 'high', Authorization: `vapid t=${unsigned}.${b64u(sig)}, k=${v.pub}`, 'Content-Length': '0' } });
  return r.status;
}

async function pushAll(env) {
  const subs = (await env.PUSH.get('subs', 'json')) || [];
  if (!subs.length) return 0;
  const v = await vapid(env);
  const res = await Promise.all(subs.slice(0, 40).map(s => send(env, v, s).catch(() => 0)));
  const alive = subs.filter((s, i) => res[i] !== 404 && res[i] !== 410);   // uninstalled / unsubscribed
  if (alive.length !== subs.length) await env.PUSH.put('subs', JSON.stringify(alive));
  return res.filter(x => x >= 200 && x < 300).length;
}

async function addAlerts(env, list) {
  const old = ((await env.PUSH.get('alerts', 'json')) || []).filter(a => Date.now() - a.at < 3 * 3600e3);
  await env.PUSH.put('alerts', JSON.stringify([...list, ...old].slice(0, 30)));
}

// a two-line Arabic match summary at the final whistle (Workers AI), from the scorers; the league name otherwise
async function summary(env, m, goalsOf) {
  try {
    if (!env.AI) throw 0;
    const g = (await goalsOf([m], 27).catch(() => ({})))[m.id] || [];
    const facts = `${m.home.name} ${m.score.home ?? 0} - ${m.score.away ?? 0} ${m.away.name} (${m.league.name || ''}). الأهداف: ` +
      (g.map(x => (x.side === 'home' ? m.home.name : m.away.name) + ' ' + x.player + ' ' + x.minute + (x.type === 'penalty' ? ' جزاء' : x.type === 'own' ? ' عكسي' : '')).join('، ') || 'لا أهداف');
    const r = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', { max_tokens: 90, temperature: 0.4, messages: [
      { role: 'system', content: 'اكتب ملخصاً عربياً لمباراة كرة قدم في جملة واحدة قصيرة (أقل من 25 كلمة) من الحقائق المعطاة فقط، بلا مقدمات.' },
      { role: 'user', content: facts }] });
    const t = String(r && r.response || '').trim();
    if (t) return t.slice(0, 220);
  } catch (e) {}
  return m.league.name || '';
}

// every minute (cron): compare with the last scores, alert on goals, kick-offs and final whistles
export async function watch(env, matches, goalsOf) {
  if (!env.PUSH) return;
  const { matches: list } = await matches(env, 27);
  const prev = (await env.PUSH.get('state', 'json')) || {}, next = {}, alerts = [];
  const name = m => m.home.name + ' ' + (m.score.home ?? 0) + '-' + (m.score.away ?? 0) + ' ' + m.away.name;
  const scored = list.filter(m => { const p = prev[m.id]; return p && m.status === 'live' && (m.score.home ?? 0) + (m.score.away ?? 0) > p.g; });
  const goals = scored.length ? await goalsOf(scored, 27).catch(() => ({})) : {};
  for (const m of list) {
    const g = (m.score.home ?? 0) + (m.score.away ?? 0), p = prev[m.id];
    next[m.id] = { g, st: m.status, pre: p?.pre || false };
    // 15 minutes before kick-off of your teams' matches (once)
    const toKick = (m.timestamp || 0) * 1000 - Date.now();
    if (m.status === 'upcoming' && m.favorite && toKick > 0 && toKick < 16 * 60e3 && !p?.pre) {
      next[m.id].pre = true;
      alerts.push({ id: m.id + '-pre', at: Date.now(), kind: 'pre', match: m.id, title: '⏰ بعد ' + Math.max(1, Math.round(toKick / 60e3)) + ' دقيقة: ' + m.home.name + ' × ' + m.away.name, body: m.league.name || '', fav: true });
    }
    if (!p) continue;   // first sight: no alert
    const id = m.id + '-' + m.status + '-' + g;
    if (m.status === 'live' && g > p.g) {
      const last = (goals[m.id] || []).slice(-1)[0];
      const team = last ? (last.side === 'home' ? m.home.name : m.away.name) : '';
      // short: the goal (and the score), and who scored only when it is known - nothing else
      alerts.push({ id, at: Date.now(), kind: 'goal', match: m.id, title: '⚽ هدف! ' + name(m), body: last && last.player ? [last.player, last.minute].filter(Boolean).join(' ') : '', fav: m.favorite });
    } else if (p.st === 'upcoming' && m.status === 'live') {
      alerts.push({ id, at: Date.now(), kind: 'start', match: m.id, title: '🟢 بدأت: ' + m.home.name + ' × ' + m.away.name, body: m.league.name || '', fav: m.favorite });
    } else if (p.st === 'live' && m.status === 'finished') {
      alerts.push({ id, at: Date.now(), kind: 'end', match: m.id, title: '🏁 انتهت: ' + name(m), body: await summary(env, m, goalsOf), fav: m.favorite });
    }
  }
  const changed = JSON.stringify(prev) !== JSON.stringify(next);
  if (changed) await env.PUSH.put('state', JSON.stringify(next));   // KV writes only when something moved
  if (alerts.length) {
    await addAlerts(env, alerts); await pushAll(env);
    // the same moment on every screen at home and in the car: Madar, the TV, the car, the phone (via «المركز»)
    if (env.HUB) {
      const hub = env.HUB.get(env.HUB.idFromName('home'));
      for (const a of alerts) await hub.fetch('https://hub/hub/op', { method: 'POST', body: JSON.stringify({ op: 'send', to: 'all', msg: { type: 'match', ...a } }) }).catch(() => {});
    }
  }
}

const PAGE = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>تنبيهات DriveCast</title><link rel="manifest" href="/push/manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="theme-color" content="#000">
<link rel="apple-touch-icon" href="/push/icon.svg">
<style>body{margin:0;min-height:100vh;background:#000;color:#fff;font:600 17px -apple-system,system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;text-align:center}
h1{font-size:26px;margin:.2em 0}p{color:#aab;line-height:1.6;max-width:420px}button{font:800 19px inherit;font-family:inherit;border:0;border-radius:999px;padding:16px 34px;margin:8px;background:#10b981;color:#04140d}
button.s{background:#222;color:#fff}#st{margin-top:14px;color:#7cc4ff;min-height:1.5em}.ball{font-size:64px}</style></head><body>
<div class="ball">⚽</div><h1>تنبيهات المباريات</h1>
<p id="hint">الأهداف وبداية ونهاية مباريات فرقك تصلك لحظة حدوثها، والهاتف مقفل والتطبيق مغلق.</p>
<button id="on">فعّل التنبيهات</button><button id="test" class="s">تجربة</button><div id="st"></div>
<script>
const st=document.getElementById('st'),say=t=>st.textContent=t;
const standalone=navigator.standalone||matchMedia('(display-mode: standalone)').matches;
if(!standalone&&/iPhone|iPad/.test(navigator.userAgent)){document.getElementById('hint').textContent='أولاً: اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»، وافتح «تنبيهات» من الشاشة الرئيسية، ثم فعّل.';}
const reg=navigator.serviceWorker&&navigator.serviceWorker.register('/push-sw.js');
const u8=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');const b=atob(s+'='.repeat((4-s.length%4)%4));return Uint8Array.from(b,c=>c.charCodeAt(0));};
async function on(){try{
 if(!reg)return say('هذا المتصفح لا يدعم التنبيهات');
 const p=await Notification.requestPermission();if(p!=='granted')return say('لم يُسمح بالتنبيهات — فعّلها من الإعدادات ← الإشعارات');
 const r=await reg,k=await (await fetch('/push/key')).json();
 let s=await r.pushManager.getSubscription();if(!s)s=await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8(k.key)});
 const x=await fetch('/push/subscribe',{method:'POST',body:JSON.stringify(s)});say(x.ok?'✓ التنبيهات مفعّلة':'تعذّر الحفظ');
}catch(e){say('خطأ: '+e.message)}}
document.getElementById('on').onclick=on;
document.getElementById('test').onclick=async()=>{const r=await fetch('/push/test',{method:'POST'});const d=await r.json();say(d.sent?'أُرسل تنبيه تجريبي ✓':'لا توجد أجهزة مفعّلة بعد');};
reg&&reg.then(r=>r.pushManager.getSubscription()).then(s=>{if(s)say('✓ التنبيهات مفعّلة على هذا الجهاز')});
</script></body></html>`;

const SW = `self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',e=>e.waitUntil((async()=>{
  let list=[];try{list=(await (await fetch('/push/latest',{cache:'no-store'})).json()).alerts||[]}catch(x){}
  if(!list.length)list=[{id:'x'+Date.now(),title:'⚽ DriveCast',body:'تحديث جديد للمباريات'}];
  for(const a of list.slice(0,4))await self.registration.showNotification(a.title,{body:a.body||'',tag:a.id,icon:'/push/icon.svg',data:{url:'https://drivecast.c-p.workers.dev/matches'}});
})()));
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.openWindow(e.notification.data&&e.notification.data.url||'/push'));});`;

const ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect width="180" height="180" rx="40" fill="#065f46"/><circle cx="90" cy="90" r="52" fill="#fff"/><path d="M90 62l26 19-10 30H74L64 81z" fill="#065f46"/></svg>`;

export async function handle(req, env, u) {
  if (u.pathname === '/push') return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  if (u.pathname === '/push-sw.js') return new Response(SW, { headers: { 'content-type': 'text/javascript', 'cache-control': 'no-cache' } });
  if (u.pathname === '/push/icon.svg') return new Response(ICON, { headers: { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=86400' } });
  if (u.pathname === '/push/manifest.json') return J({ name: 'تنبيهات DriveCast', short_name: 'تنبيهات', start_url: '/push', display: 'standalone', background_color: '#000', theme_color: '#000', icons: [{ src: '/push/icon.svg', sizes: 'any', type: 'image/svg+xml' }] });
  if (!env.PUSH) return J({ error: 'KV binding PUSH missing' }, 500);
  if (u.pathname === '/push/key') return J({ key: (await vapid(env)).pub });
  if (u.pathname === '/push/latest') return J({ alerts: ((await env.PUSH.get('alerts', 'json')) || []).filter(a => Date.now() - a.at < 5 * 60e3) });
  if (u.pathname === '/push/subscribe' && req.method === 'POST') {
    const s = await req.json().catch(() => null);
    if (!s || !/^https:\/\//.test(s.endpoint || '')) return J({ error: 'bad subscription' }, 400);
    const subs = ((await env.PUSH.get('subs', 'json')) || []).filter(x => x.endpoint !== s.endpoint);
    subs.push({ endpoint: s.endpoint, at: Date.now() });
    await env.PUSH.put('subs', JSON.stringify(subs.slice(-40)));
    return J({ ok: true, devices: subs.length });
  }
  if (u.pathname === '/push/test' && req.method === 'POST') {
    await addAlerts(env, [{ id: 'test-' + Date.now(), at: Date.now(), title: '⚽ تجربة: هدف!', body: 'هكذا يصلك الهدف والهاتف مقفل' }]);
    return J({ sent: await pushAll(env) });
  }
  return null;
}
