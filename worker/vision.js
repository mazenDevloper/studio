// «اقرأ صورة الميزان»: a screenshot of a body-composition app (Eufy, Xiaomi, Huawei…) → the numbers as JSON.
//   POST /vision/body  { image: 'data:image/jpeg;base64,…' }  →  { ok, metrics: { weight, muscle, … }, raw }
// Workers AI vision model; the app falls back to on-device OCR when this fails.
const MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';
const KEYS = ['weight', 'muscle', 'bmi', 'subcutaneous', 'bodyFat', 'water', 'fatMass', 'bmr', 'boneMass', 'leanMass', 'protein', 'visceral', 'bodyAge', 'skeletal'];
const PROMPT = `This is a screenshot of a body composition scale app (labels may be Arabic).
Read every metric and return ONLY a JSON object with these keys (numbers, no units; null if absent):
weight (kg, الوزن), muscle (kg, كتلة العضلات), bmi (مؤشر كتلة الجسم), subcutaneous (% , دهون تحت الجلد), bodyFat (% , النسبة المئوية لدهون الجسم),
water (% , الماء), fatMass (kg, كتلة دهون الجسم), bmr (kcal, معدل الاستقلاب الأساسي), boneMass (kg, كتلة العظام), leanMass (kg, كتلة الجسم الغث / الخالية من الدهون),
protein (% , البروتين), visceral (الدهون الحشوية), bodyAge (عمر الجسم), skeletal (kg, كتلة العضلة الهيكلية), bodyType (text, نوع الجسم).`;
export async function visionBody(req, env) {
  if (!env.AI) return { ok: false, error: 'no AI' };
  const body = await req.json().catch(() => ({}));
  const m = /^data:image\/\w+;base64,(.+)$/.exec(String(body.image || ''));
  if (!m) return { ok: false, error: 'image?' };
  const bytes = Uint8Array.from(atob(m[1]), c => c.charCodeAt(0));
  if (bytes.length > 4e6) return { ok: false, error: 'too big' };
  const run = () => env.AI.run(MODEL, { image: [...bytes], prompt: PROMPT, max_tokens: 400, temperature: 0 });
  let r;
  try { r = await run(); }
  catch (e) {
    // the model's licence must be accepted once
    if (/agree/i.test(String(e && e.message))) { await env.AI.run(MODEL, { prompt: 'agree' }).catch(() => {}); r = await run(); } else throw e;
  }
  const raw = String((r && (r.response || r.description)) || '');
  let j = {};
  try { j = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); } catch {}
  const metrics = {};
  for (const k of KEYS) { const v = parseFloat(String(j[k] ?? '').replace(',', '.')); if (isFinite(v)) metrics[k] = v; }
  if (j.bodyType) metrics.bodyType = String(j.bodyType).slice(0, 40);
  return { ok: Object.keys(metrics).length > 3, metrics, raw: raw.slice(0, 1500) };
}
