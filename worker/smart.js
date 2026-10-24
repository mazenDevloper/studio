// Madar's visionOS-style helpers on Workers AI:
//   POST /summarize   { url }                 → { ok, title, points: [..] }   (Safari's article summary)
//   POST /translate   { text, from?, to? }    → { ok, text }                  (live captions translated)
//   POST /vision/ask  { image, q? }           → { ok, say }                   (visual intelligence: "what is this?")
import { readable } from './reader.js';
const LLM = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const VISION = '@cf/meta/llama-3.2-11b-vision-instruct';
const TRANSLATE = '@cf/meta/m2m100-1.2b';

export async function summarize(req, env) {
  const { url, text } = await req.json().catch(() => ({}));
  let title = '', body = String(text || '');
  if (!body && url) { const r = await readable(url); if (r.error) return { ok: false, error: r.error }; title = r.title; body = r.blocks.map(b => b.text).join('\n'); }
  body = body.slice(0, 14000);
  if (body.length < 200) return { ok: false, error: 'لا يوجد نص كافٍ في الصفحة' };
  const r = await env.AI.run(LLM, {
    messages: [{ role: 'system', content: 'لخّص المقال بالعربية الفصحى المبسطة في 3 إلى 5 نقاط قصيرة، كل نقطة جملة واحدة مفيدة، دون مقدمة. أعد JSON فقط: {"points": ["...", "..."]}' }, { role: 'user', content: (title ? 'العنوان: ' + title + '\n' : '') + body }],
    max_tokens: 500, temperature: 0.2,
    response_format: { type: 'json_schema', json_schema: { type: 'object', properties: { points: { type: 'array', items: { type: 'string' } } }, required: ['points'] } },
  });
  let pts = [];
  try { const j = typeof r.response === 'string' ? JSON.parse(r.response) : r.response; pts = (j.points || []).map(String).filter(Boolean).slice(0, 6); } catch {}
  return { ok: pts.length > 0, title, points: pts };
}

export async function translate(req, env) {
  const { text, from = 'english', to = 'arabic' } = await req.json().catch(() => ({}));
  const t = String(text || '').slice(0, 1200);
  if (!t) return { ok: false };
  const r = await env.AI.run(TRANSLATE, { text: t, source_lang: from, target_lang: to });
  return { ok: !!r?.translated_text, text: r?.translated_text || '' };
}

export async function visionAsk(req, env) {
  const body = await req.json().catch(() => ({}));
  const m = /^data:image\/\w+;base64,(.+)$/.exec(String(body.image || ''));
  if (!m) return { ok: false, error: 'image?' };
  const bytes = Uint8Array.from(atob(m[1]), c => c.charCodeAt(0));
  if (bytes.length > 4e6) return { ok: false, error: 'too big' };
  const q = String(body.q || 'ما هذا الذي أمامي؟').slice(0, 300);
  const prompt = `You see what the user sees through mixed-reality glasses. The user asks (in Arabic): «${q}». Answer in English, in one or two short, concrete sentences suitable to be read aloud (it will be translated to Arabic). If the user asks to read text in the picture, quote the text.`;
  const run = () => env.AI.run(VISION, { image: [...bytes], prompt, max_tokens: 220, temperature: 0.2 });
  let r;
  try { r = await run(); }
  catch (e) { if (/agree/i.test(String(e && e.message))) { await env.AI.run(VISION, { prompt: 'agree' }).catch(() => {}); r = await run(); } else throw e; }
  let say = String((r && (r.response || r.description)) || '').trim();
  // the vision model often answers in English: translate it so it can be read aloud in Arabic
  if (say && !/[\u0600-\u06FF]/.test(say)) { const t = await env.AI.run(TRANSLATE, { text: say.slice(0, 1000), source_lang: 'english', target_lang: 'arabic' }).catch(() => null); if (t?.translated_text) say = t.translated_text; }
  return { ok: !!say, say };
}
