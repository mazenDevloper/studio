// «مساعد مدار» - a small assistant on Workers AI. It knows the live situation (your teams' matches, goals and
// scorers, the next prayers, Oman time) and answers in short Arabic; it can also ask the app to do something.
//   POST /ask  { q, history?: [{role, content}], app?: 'madar' | 'drivecast' }
//   → { say, action?: { type: 'open_matches' | 'open_url' | 'environment' | 'open_app' | 'none', value? } }
import { nowData } from './index.js';
import { hubDevices } from './welcome.js';
import { binGet } from './files.js';

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const omanNow = () => new Date().toLocaleString('ar-OM', { timeZone: 'Asia/Muscat', weekday: 'long', hour: 'numeric', minute: '2-digit' });
const t12 = ms => new Date(ms).toLocaleTimeString('ar-OM', { timeZone: 'Asia/Muscat', hour: 'numeric', minute: '2-digit' });

function situation(d) {
  const st = { live: 'مباشرة الآن', upcoming: 'قادمة', finished: 'انتهت' };
  const lines = (d.matches || []).slice(0, 14).map(m => {
    const sc = m.status === 'upcoming' ? 'الساعة ' + m.omanTime : (m.score.home ?? 0) + '-' + (m.score.away ?? 0);
    const g = (d.goals?.[m.id] || []).map(x => (x.side === 'home' ? m.home.name : m.away.name) + ': ' + x.player + ' ' + x.minute).join('، ');
    return `- ${m.home.name} × ${m.away.name} (${m.league?.name || ''}) ${st[m.status] || ''} ${sc}${m.elapsed ? ' الدقيقة ' + m.elapsed : ''}${g ? ' · الأهداف: ' + g : ''}`;
  });
  const ev = (d.events || []).slice(0, 4).map(e => `- ${e.title} ${t12(e.at)}`);
  return `الوقت في عُمان: ${omanNow()}\nفرق المستخدم المفضلة: ${(d.teams || []).map(t => t.name).join('، ') || 'غير محددة'}\nمباريات فرقه:\n${lines.join('\n') || '- لا مباريات قريبة'}\nالصلوات والتذكيرات القادمة:\n${ev.join('\n') || '- لا يوجد'}`;
}

// What the assistant can play anywhere: what you watched lately (every device) + your favourite channels
async function catalog(env, state) {
  const out = [], seen = new Set(), add = it => { const k = it.kind + ':' + (it.url || it.id); if (!seen.has(k) && out.length < 40) { seen.add(k); out.push(it); } };
  for (const x of Object.values(state.resume || {}).sort((a, b) => b.at - a.at)) add({ kind: x.kind, id: x.id, url: x.url, title: x.title, thumb: x.thumb, t: x.t });
  for (const x of state.history || []) add({ kind: x.kind, id: x.id, url: x.url, title: x.title, thumb: x.thumb });
  try { const iptv = await binGet(env, '69a87b8bd0ea881f40eeec0c'); for (const c of (iptv.iptv || iptv.channels || [])) if (c.url) add({ kind: 'iptv', id: c.url, url: c.url, title: c.name, thumb: c.stream_icon }); } catch (e) {}
  return out.map((x, i) => ({ ...x, n: i + 1 }));
}

export async function ask(req, env) {
  if (!env.AI) return { say: 'المساعد غير مفعّل في السيرفر', action: { type: 'none' } };
  const body = await req.json().catch(() => ({}));
  const q = String(body.q || '').slice(0, 500);
  if (!q) return { say: '', action: { type: 'none' } };
  const [d, hub] = await Promise.all([nowData(env, 27).catch(() => ({ matches: [], events: [], teams: [] })), hubDevices(env).catch(() => ({ devices: [], state: {} }))]);
  const items = await catalog(env, hub.state || {});
  const me = String(body.device || '');
  const devLines = hub.devices.map(x => `- id=${x.id} · ${x.label} «${x.name}»${x.id === me ? ' (الجهاز الذي يكلمك الآن)' : ''}${x.asleep ? ' · في الخلفية (يمكن إيقاظه)' : ''}${x.playing ? ' · يعرض الآن: ' + x.playing.title : ' · لا يعرض شيئاً'}`);
  const itemLines = items.map(x => `${x.n}. ${x.title || x.id} (${x.kind === 'iptv' ? 'قناة' : x.kind === 'yt' ? 'يوتيوب' : x.kind})`);
  const sys = `أنت «المساعد»، عقل منزل المستخدم الذكي في عُمان: يتحكم بتطبيقَي DriveCast (السيارة، التلفاز، الهاتف، التابلت) ومدار (نظارة الواقع المختلط). المستخدم يكلمك الآن من ${body.app === 'drivecast' ? 'DriveCast' : 'مدار'}.
افهم المعنى لا الكلمات: «شغّل الجزيرة في الصالة» = افتح قناة الجزيرة على التلفاز. «وقّف اللي في السيارة» = إيقاف على جهاز السيارة. «كمّل اللي كنت أشوفه» = افتح آخر ما شاهده على الجهاز الحالي. «قول لأهل البيت إني وصلت» = رسالة صوتية على التلفاز. «وين النتيجة؟» = أجب من المباريات.
أجب بالعربية في جملة أو جملتين قصيرتين تصلحان للقراءة بصوت عالٍ. لا تخترع نتائج أو مواعيد أو أجهزة غير موجودة.

المعلومات الحية:
${situation(d)}
الأجهزة المتصلة الآن:
${devLines.join('\n') || '- لا أجهزة متصلة غير هذا'}
ما يمكن تشغيله (رقم. العنوان):
${itemLines.join('\n') || '- لا شيء محفوظ'}${body.context ? '\nسياق إضافي من الجهاز:\n' + String(body.context).slice(0, 1000) : ''}

الأوامر على الأجهزة (devices): مصفوفة، كل عنصر {"do": "...", "device": "<id من القائمة أو here للجهاز الحالي أو all>", ...}:
- {"do":"play","device":..,"item":<رقم من القائمة>}   تشغيل شيء على جهاز
- {"do":"control","device":..,"action":"play|pause|toggle|next|prev"}
- {"do":"say","device":..,"text":"..."}   رسالة تُقرأ بصوت على ذلك الجهاز
- {"do":"sleep","device":..,"minutes":N}   إيقاف بعد دقائق
- {"do":"ping","device":..}   ليرنّ الجهاز ويُعثر عليه
- {"do":"wake","device":..}   إيقاظ جهاز فيه مدار (حتى لو كانت شاشته نائمة)
وإجراء واحد على الشاشة الحالية (action): open_matches، open_url (value رابط كامل)، environment (مدار: passthrough, night, cinema, sunset, lounge, realStudy, study)، open_app (youtube, shahid, netflix, makkah, games, keyboard)، أو none.
أعد JSON فقط: {"say":"...","devices":[...],"action":{"type":"...","value":"..."}}`;
  const history = Array.isArray(body.history) ? body.history.slice(-6).filter(m => m && (m.role === 'user' || m.role === 'assistant')).map(m => ({ role: m.role, content: String(m.content).slice(0, 400) })) : [];
  const r = await env.AI.run(MODEL, {
    messages: [{ role: 'system', content: sys }, ...history, { role: 'user', content: q }],
    max_tokens: 400, temperature: 0.2,
    response_format: { type: 'json_schema', json_schema: { type: 'object', properties: {
      say: { type: 'string' },
      devices: { type: 'array', items: { type: 'object', properties: { do: { type: 'string' }, device: { type: 'string' }, item: { type: 'number' }, action: { type: 'string' }, text: { type: 'string' }, minutes: { type: 'number' } }, required: ['do', 'device'] } },
      action: { type: 'object', properties: { type: { type: 'string' }, value: { type: 'string' } }, required: ['type'] } }, required: ['say'] } },
  });
  let out = r && r.response;
  if (typeof out === 'string') { try { out = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1)); } catch (e) { out = { say: out }; } }
  out = out && typeof out === 'object' ? out : { say: 'لم أفهم، أعد السؤال' };
  // carry out the device commands through «المركز» (the devices receive them like any other message)
  const done = [], hubObj = env.HUB.get(env.HUB.idFromName('home'));
  const known = new Set(hub.devices.map(x => x.id));
  for (const c of (Array.isArray(out.devices) ? out.devices : []).slice(0, 4)) {
    const to = c.device === 'here' ? me : c.device === 'all' ? 'all' : c.device;
    if (to !== 'all' && !known.has(to)) continue;
    const dest = c.do === 'wake' ? (to === 'all' ? 'kind:sys' : to.startsWith('madar-') ? 'sys-' + to.slice(6) : to) : to;
    let msg = null;
    if (c.do === 'play') { const it = items.find(x => x.n === +c.item); if (it) { const { n, ...item } = it; msg = { type: 'open', item, now: true }; } }
    else if (c.do === 'control' && /^(play|pause|toggle|next|prev)$/.test(c.action || '')) msg = { type: 'control', action: c.action };
    else if (c.do === 'say' && c.text) msg = { type: 'say', text: String(c.text).slice(0, 200) };
    else if (c.do === 'sleep' && c.minutes > 0) msg = { type: 'sleep', minutes: Math.min(240, +c.minutes) };
    else if (c.do === 'ping') msg = { type: 'ping' };
    else if (c.do === 'wake') msg = { type: 'wake', share: true };
    if (!msg) continue;
    const res = await hubObj.fetch('https://hub/hub/op', { method: 'POST', body: JSON.stringify({ op: 'send', to: dest, msg }) }).then(x => x.json()).catch(() => ({}));
    done.push({ ...c, to, delivered: res.delivered || 0 });   // «here» too: the hub delivers it to the asking device like any other
  }
  return { say: String(out.say || '').slice(0, 400), action: out.action && out.action.type ? out.action : { type: 'none' }, done };
}
