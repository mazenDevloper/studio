// LiveKit (watch together with voice): the server signs a short ticket for one room; the secret never leaves here.
//   GET /lk/token?room=madar-home&name=مدار · iPhone  →  { url, token }
const LK_URL = 'wss://dcast-2u01obue.livekit.cloud';
const LK_KEY = 'APIWcdJH8xWFKMe';
const b64u = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const enc = o => b64u(new TextEncoder().encode(JSON.stringify(o)));
export async function lkToken(env, u) {
  if (!env.LIVEKIT_SECRET) return { error: 'LIVEKIT_SECRET missing' };
  const room = (u.searchParams.get('room') || 'madar-home').replace(/[^\w\-]/g, '').slice(0, 40) || 'madar-home';
  const name = (u.searchParams.get('name') || 'ضيف').slice(0, 40);
  const id = (u.searchParams.get('id') || crypto.randomUUID()).slice(0, 64);
  const now = Math.floor(Date.now() / 1000);
  const body = enc({ iss: LK_KEY, sub: id, name, nbf: now - 10, exp: now + 6 * 3600,
    video: { room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true } });
  const head = enc({ alg: 'HS256', typ: 'JWT' });
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.LIVEKIT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = b64u(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(head + '.' + body)));
  return { url: LK_URL, token: head + '.' + body + '.' + sig, room };
}
