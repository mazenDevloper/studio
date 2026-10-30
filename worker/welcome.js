// «مرحباً» on entering DriveCast or Madar: the greeting of the hour, today's date (Gregorian + Hijri), the next
// prayer, your team's match today, and every device that is on now (with what it plays).
//   GET /hub/welcome   →  { greet, date:{weekday,day,month,year,hijri}, next?, match?, devices:[{id,name,kind,app,playing?}] }
import { nowData } from './index.js';

const TZ = 'Asia/Muscat';
const KIND_AR = { tv: 'التلفاز', car: 'السيارة', phone: 'الهاتف', tablet: 'التابلت', computer: 'الكمبيوتر', madar: 'مدار' };
export const kindOf = d => d.app === 'madar' ? 'madar' : d.app === 'sys' ? 'tablet' : (KIND_AR[d.kind] ? d.kind : 'phone');

export async function hubDevices(env) {
  const r = await env.HUB.get(env.HUB.idFromName('home')).fetch('https://hub/hub/state').then(x => x.json()).catch(() => ({}));
  const resume = Object.values(r.state?.resume || {}), now = Date.now();
  const devices = (r.devices || []).map(d => {
    const p = resume.filter(x => x.from?.id === d.id && now - (x.at || 0) < 20 * 60e3).sort((a, b) => b.at - a.at)[0];
    return { id: d.id, name: d.name, kind: kindOf(d), app: d.app, label: KIND_AR[kindOf(d)], playing: p ? { kind: p.kind, title: p.title, id: p.id, url: p.url, t: p.t, thumb: p.thumb } : null };
  });
  // one entry per device id (a device reconnecting can briefly show twice); a device's background link (sys-<code>)
  // shows only while its Madar page is closed - then it is that device, asleep or in the background
  const ids = new Set(devices.map(d => d.id));
  const list = devices.filter(d => !(d.app === 'sys' && ids.has('madar-' + d.id.slice(4)))).map(d => d.app === 'sys' ? { ...d, kind: 'tablet', label: 'مدار · ' + (d.name || '').split(' · ')[0], asleep: true } : d);
  return { devices: [...new Map(list.map(d => [d.id, d])).values()], state: r.state || {} };
}

export async function welcome(env) {
  const now = new Date(), h = +now.toLocaleString('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false });
  const greet = h < 5 ? 'مساء الخير' : h < 12 ? 'صباح الخير' : h < 17 ? 'نهارك سعيد' : 'مساء الخير';
  const f = o => new Intl.DateTimeFormat('ar-OM', { timeZone: TZ, ...o }).format(now);
  const date = { weekday: f({ weekday: 'long' }), day: f({ day: 'numeric' }), month: f({ month: 'long' }), year: f({ year: 'numeric' }),
    hijri: new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { timeZone: TZ, day: 'numeric', month: 'long' }).format(now) };
  const [d, hub] = await Promise.all([nowData(env, 27).catch(() => ({ matches: [], events: [] })), hubDevices(env).catch(() => ({ devices: [] }))]);
  const azan = (d.events || []).find(e => e.kind === 'azan' && e.at > Date.now());
  const m = (d.matches || []).filter(x => x.favorite).find(x => x.status === 'live') || (d.matches || []).filter(x => x.favorite).find(x => x.status === 'upcoming' && x.timestamp * 1000 - Date.now() < 18 * 3600e3);
  const t12 = ms => new Date(ms).toLocaleTimeString('ar-OM', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
  return {
    greet, date,
    next: azan ? { title: azan.title, at: azan.at, time: t12(azan.at), mins: Math.round((azan.at - Date.now()) / 60e3) } : null,
    match: m ? { id: m.id, home: m.home, away: m.away, live: m.status === 'live', score: m.score, time: m.omanTime, elapsed: m.elapsed, league: m.league?.name } : null,
    devices: hub.devices, at: Date.now(),
  };
}
