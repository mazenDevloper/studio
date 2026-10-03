"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Search, Play, Pause, Loader2, ChevronRight, X, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

/** quran.com API v4 through /api/quran (see that route). */
async function q<T = any>(path: string, params: Record<string, string> = {}): Promise<T> {
  const res = await fetch(`/api/quran?${new URLSearchParams({ path, ...params })}`);
  if (!res.ok) throw new Error(`quran.com ${res.status}`);
  return res.json();
}

interface Chapter { id: number; name_arabic: string; name_simple: string; verses_count: number; revelation_place: string }
interface Recitation { id: number; reciter_name: string; style?: string | null; translated_name?: { name: string } }
interface Verse { id: number; verse_key: string; text_uthmani: string }

const toArabic = (n: number | string) => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[+d]);
const PREFS = "quran-reader-v1";

/**
 * The Quran from quran.com: the surahs (search by name or number), the text in Uthmani script, a reciter of
 * your choice playing the whole surah, and the tafsir (al-Muyassar) of any verse you tap.
 */
export function QuranReader() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [reciters, setReciters] = useState<Recitation[]>([]);
  const [tafsirId, setTafsirId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [verses, setVerses] = useState<Verse[] | null>(null);
  const [reciterId, setReciterId] = useState<number>(7); // Mishari Rashid al-Afasy on quran.com
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [tafsir, setTafsir] = useState<{ key: string; text: string | null } | null>(null);
  const audio = useRef<HTMLAudioElement>(null);

  // the last surah and reciter are remembered on this device
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS) || "{}");
      if (p.reciterId) setReciterId(p.reciterId);
      if (p.chapterId) (window as any).__quranLastChapter = p.chapterId;
    } catch {}
    Promise.all([
      q<{ chapters: Chapter[] }>("chapters", { language: "ar" }),
      q<{ recitations: Recitation[] }>("resources/recitations", { language: "ar" }),
      q<{ tafsirs: { id: number; name: string; language_name: string }[] }>("resources/tafsirs", { language: "ar" }).catch(() => ({ tafsirs: [] })),
    ]).then(([c, r, t]) => {
      setChapters(c.chapters || []);
      setReciters(r.recitations || []);
      const ar = (t.tafsirs || []).filter(x => /arabic/i.test(x.language_name));
      setTafsirId((ar.find(x => /muyassar|ميسر/i.test(x.name)) ?? ar[0] ?? null)?.id ?? 16);
      const last = (window as any).__quranLastChapter;
      if (last) { const ch = (c.chapters || []).find(x => x.id === last); if (ch) open(ch); }
    }).catch(e => setError(e?.message || "تعذر الاتصال بـ quran.com"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (patch: Record<string, unknown>) => {
    try { localStorage.setItem(PREFS, JSON.stringify({ ...JSON.parse(localStorage.getItem(PREFS) || "{}"), ...patch })); } catch {}
  };

  const open = async (ch: Chapter) => {
    setChapter(ch); setVerses(null); setTafsir(null); setAudioUrl(null); setPlaying(false);
    save({ chapterId: ch.id });
    try {
      const v = await q<{ verses: Verse[] }>("quran/verses/uthmani", { chapter_number: String(ch.id) });
      setVerses(v.verses || []);
    } catch { setVerses([]); }
  };

  // the selected reciter's recording of the open surah
  useEffect(() => {
    if (!chapter) return;
    let stop = false;
    q<{ audio_file: { audio_url: string } }>(`chapter_recitations/${reciterId}/${chapter.id}`)
      .then(r => { if (!stop) setAudioUrl(r.audio_file?.audio_url ?? null); })
      .catch(() => { if (!stop) setAudioUrl(null); });
    return () => { stop = true; };
  }, [chapter, reciterId]);

  const togglePlay = () => {
    const a = audio.current;
    if (!a || !audioUrl) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  };

  const showTafsir = async (key: string) => {
    setTafsir({ key, text: null });
    try {
      const r = await q<{ tafsir: { text: string } }>(`tafsirs/${tafsirId ?? 16}/by_ayah/${key}`);
      setTafsir({ key, text: (r.tafsir?.text || "").replace(/<[^>]+>/g, "") || "لا يوجد تفسير" });
    } catch { setTafsir({ key, text: "تعذر تحميل التفسير" }); }
  };

  const list = useMemo(() => {
    const t = search.trim();
    if (!t) return chapters;
    return chapters.filter(c => c.name_arabic.includes(t) || c.name_simple.toLowerCase().includes(t.toLowerCase()) || String(c.id) === t.replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))));
  }, [chapters, search]);

  if (error) return <div className="h-full flex items-center justify-center text-white/50 font-bold">{error}</div>;

  return (
    <div className="h-full w-full flex flex-col md:flex-row bg-black text-white" dir="rtl">
      {/* surahs */}
      <aside className={cn("md:w-80 md:border-l border-white/10 flex flex-col min-h-0", chapter ? "hidden md:flex" : "flex flex-1 md:flex-none")}>
        <label className="relative m-4 flex">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن سورة بالاسم أو الرقم" className="w-full h-12 pr-11 pl-4 rounded-full bg-white/5 border border-white/10 outline-none" data-nav-id="quran-search" />
        </label>
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-6 space-y-1.5">
          {!chapters.length && <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div>}
          {list.map((c, i) => (
            <button key={c.id} onClick={() => open(c)} data-nav-id={`quran-surah-${i}`}
              className={cn("focusable no-focus-scale w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-right border",
                chapter?.id === c.id ? "bg-emerald-500/15 border-emerald-400/40" : "bg-white/5 border-white/5 hover:bg-white/10")}>
              <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-sm font-black shrink-0">{toArabic(c.id)}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-lg font-black leading-tight" style={{ fontFamily: "Amiri, serif" }}>سورة {c.name_arabic}</span>
                <span className="block text-[11px] text-white/40 font-bold">{c.revelation_place === "makkah" ? "مكية" : "مدنية"} · {toArabic(c.verses_count)} آية</span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* the surah */}
      <section className={cn("flex-1 min-h-0 flex flex-col", !chapter && "hidden md:flex")}>
        {!chapter ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white/30 gap-3"><BookOpen className="w-12 h-12" /><p className="font-black">اختر سورة</p></div>
        ) : (
          <>
            <header className="flex flex-wrap items-center gap-3 p-4 border-b border-white/10">
              <button onClick={() => setChapter(null)} className="md:hidden focusable no-focus-scale w-10 h-10 rounded-full bg-white/10 flex items-center justify-center" data-nav-id="quran-back"><ChevronRight className="w-5 h-5" /></button>
              <h2 className="text-3xl font-black" style={{ fontFamily: "Amiri, serif" }}>سورة {chapter.name_arabic}</h2>
              <div className="flex-1" />
              <label className="flex items-center gap-2 h-11 px-3 rounded-full bg-white/5 border border-white/10">
                <Mic className="w-4 h-4 text-emerald-400" />
                <select value={reciterId} onChange={e => { const id = Number(e.target.value); setReciterId(id); save({ reciterId: id }); }}
                  className="bg-transparent outline-none text-sm font-bold max-w-[13rem]" data-nav-id="quran-reciter">
                  {reciters.map(r => <option key={r.id} value={r.id} className="bg-zinc-900">{r.translated_name?.name || r.reciter_name}{r.style ? ` (${r.style})` : ""}</option>)}
                </select>
              </label>
              <button onClick={togglePlay} disabled={!audioUrl} data-nav-id="quran-play"
                className="focusable no-focus-scale h-11 px-5 rounded-full bg-emerald-500 text-black font-black flex items-center gap-2 disabled:opacity-40">
                {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />} {playing ? "إيقاف" : "استماع"}
              </button>
              {audioUrl && <audio ref={audio} src={audioUrl} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} preload="none" />}
            </header>
            <div className="flex-1 min-h-0 overflow-y-auto px-5 md:px-12 py-8">
              {chapter.id !== 1 && chapter.id !== 9 && <p className="text-center text-3xl mb-8 text-emerald-200" style={{ fontFamily: "Amiri, serif" }}>بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>}
              {!verses ? <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-emerald-400" /></div> : (
                <p className="text-3xl md:text-4xl leading-[2.4] text-justify" style={{ fontFamily: "Amiri, serif" }}>
                  {verses.map(v => (
                    <span key={v.id} onClick={() => showTafsir(v.verse_key)} className={cn("cursor-pointer rounded-lg transition-colors hover:bg-white/5", tafsir?.key === v.verse_key && "bg-emerald-500/15")}>
                      {v.text_uthmani} <span className="text-emerald-400 text-2xl">﴿{toArabic(v.verse_key.split(":")[1])}﴾</span>{" "}
                    </span>
                  ))}
                </p>
              )}
            </div>
            {tafsir && (
              <div className="border-t border-white/10 bg-zinc-950 p-5 max-h-[40%] overflow-y-auto relative">
                <button onClick={() => setTafsir(null)} className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center focusable no-focus-scale"><X className="w-4 h-4" /></button>
                <p className="text-xs font-black text-emerald-300 mb-2">التفسير الميسر · الآية {toArabic(tafsir.key.split(":")[1])}</p>
                {tafsir.text === null ? <Loader2 className="w-5 h-5 animate-spin text-emerald-400" /> : <p className="text-lg leading-loose text-white/85">{tafsir.text}</p>}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
