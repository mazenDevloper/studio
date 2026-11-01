// «/yt/find?q=…&pick=views|long|new»: the best YouTube video for spoken words, no API key - YouTube's own search page
// (ytInitialData), read on the server because a browser can't. pick: views = the most watched («الأجمل»، «الأفضل»),
// long = the longest («الأطول»), new = the newest; default = YouTube's first answer.
const SP = { views: 'CAM%3D', new: 'CAI%3D' };
const secs = t => String(t || '').split(':').reduce((a, x) => a * 60 + (+x || 0), 0);
const views = t => +String(t || '').replace(/[^\d]/g, '') || 0;
export async function ytFind(u) {
  const q = (u.searchParams.get('q') || '').slice(0, 200), picks = (u.searchParams.get('pick') || '').split(','), pick = picks.includes('new') ? 'new' : picks.includes('views') ? 'views' : '';
  if (!q) return { items: [] };
  const r = await fetch('https://www.youtube.com/results?search_query=' + encodeURIComponent(q) + (SP[pick] ? '&sp=' + SP[pick] : ''), {
    headers: { 'accept-language': 'ar,en;q=0.8', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36', cookie: 'CONSENT=YES+1; SOCS=CAI' } });
  const html = await r.text();
  const m = html.match(/var ytInitialData = (\{.+?\});<\/script>/s) || html.match(/ytInitialData"\]\s*=\s*(\{.+?\});/s);
  if (!m) return { items: [] };
  const out = [];
  (function walk(o) {
    if (!o || typeof o !== 'object' || out.length >= 20) return;
    if (o.videoRenderer?.videoId) { const v = o.videoRenderer; out.push({ id: v.videoId, title: v.title?.runs?.map(x => x.text).join('') || '', len: secs(v.lengthText?.simpleText), views: views(v.viewCountText?.simpleText), by: v.ownerText?.runs?.[0]?.text || '' }); return; }
    for (const k in o) walk(o[k]);
  })(JSON.parse(m[1]));
  let items = out.filter(x => x.len > 0);   // live streams and shorts without a length are left out
  // «الأجمل الأطول»: among the 5 most watched, the longest; «الأطول» alone: the longest of the first answers
  if (picks.includes('views')) items.sort((a, b) => b.views - a.views);
  if (picks.includes('long')) items = [...items.slice(0, picks.includes('views') ? 5 : 10)].sort((a, b) => b.len - a.len).concat(items.slice(picks.includes('views') ? 5 : 10));
  return { items: items.slice(0, 8) };
}
