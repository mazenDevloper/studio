// «مساعد مدار» - a small assistant on Workers AI. It knows the live situation (your teams' matches, goals and
// scorers, the next prayers, Oman time) and answers in short Arabic; it can also ask the app to do something.
//   POST /ask  { q, history?: [{role, content}], app?: 'madar' | 'drivecast' }
//   → { say, action?: { type: 'open_matches' | 'open_url' | 'environment' | 'open_app' | 'none', value? } }
import { nowData } from './index.js';

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

export async function ask(req, env) {
  if (!env.AI) return { say: 'المساعد غير مفعّل في السيرفر', action: { type: 'none' } };
  const body = await req.json().catch(() => ({}));
  const q = String(body.q || '').slice(0, 500);
  if (!q) return { say: '', action: { type: 'none' } };
  const d = await nowData(env, 27).catch(() => ({ matches: [], events: [], teams: [] }));
  const sys = `أنت «مساعد مدار»، مساعد صوتي ودود داخل تطبيق ${body.app === 'drivecast' ? 'DriveCast' : 'مدار (نظارة الواقع المختلط)'} لمستخدم في عُمان.
أجب بالعربية الفصحى المبسطة في جملة أو جملتين قصيرتين تصلحان للقراءة بصوت عالٍ. لا تخترع نتائج أو مواعيد غير موجودة في المعلومات.
المعلومات الحية الآن:
${situation(d)}
إذا طلب المستخدم فعل شيء ضع الإجراء المناسب: open_matches (المباريات/النتائج)، open_url (فتح موقع، value = الرابط الكامل)، environment (تغيير البيئة، value واحدة من: passthrough, night, cinema, sunset, lounge, realStudy, study)، open_app (value: youtube, shahid, netflix, makkah, games, keyboard)، وإلا none.
أعد JSON فقط بالشكل: {"say": "...", "action": {"type": "...", "value": "..."}}`;
  const history = Array.isArray(body.history) ? body.history.slice(-6).filter(m => m && (m.role === 'user' || m.role === 'assistant')).map(m => ({ role: m.role, content: String(m.content).slice(0, 400) })) : [];
  const r = await env.AI.run(MODEL, {
    messages: [{ role: 'system', content: sys }, ...history, { role: 'user', content: q }],
    max_tokens: 220, temperature: 0.3,
    response_format: { type: 'json_schema', json_schema: { type: 'object', properties: { say: { type: 'string' }, action: { type: 'object', properties: { type: { type: 'string' }, value: { type: 'string' } }, required: ['type'] } }, required: ['say'] } },
  });
  let out = r && r.response;
  if (typeof out === 'string') { try { out = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1)); } catch (e) { out = { say: out }; } }
  out = out && typeof out === 'object' ? out : { say: 'لم أفهم، أعد السؤال' };
  return { say: String(out.say || '').slice(0, 400), action: out.action && out.action.type ? out.action : { type: 'none' } };
}
