"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, Link2, Tv, Search, Unlink } from "lucide-react";
import Link from "next/link";
import { useMediaStore, type IptvChannel } from "@/lib/store";
import { channelKey, channelTokens, findFavoriteChannel, isArabChannel } from "@/lib/match-channels";
import { catalogGroup, resolveChannel, searchCatalog, useIptvCatalog } from "@/lib/iptv-catalog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Load the whole IPTV playlist once, a moment after the page settles (the cards work with favourites meanwhile). */
function useCatalog() {
  const status = useIptvCatalog(s => s.status);
  useEffect(() => {
    if (status !== "idle") return;
    const t = setTimeout(() => useIptvCatalog.getState().load(), 1500);
    return () => clearTimeout(t);
  }, [status]);
  return useIptvCatalog(s => s.channels);
}

/**
 * A match's TV channels as buttons. A favourite plays first (green; the player opens with the favourites as its
 * side list); otherwise the same channel from the whole IPTV playlist (blue; preferring the league country's group,
 * e.g. DAZN from BELGIUM for a Belgian match); a channel found nowhere opens a picker, and the pick is remembered
 * on that favourite (synced to the cloud) for every later match.
 */
export function MatchChannelChips({ names, idPrefix, editable = false, className, country }: {
  names: string[];
  /** for remote/keyboard navigation ids */
  idPrefix: string;
  /** show a small "change link" button next to linked channels */
  editable?: boolean;
  className?: string;
  /** the league's country: picks the matching playlist group */
  country?: string;
}) {
  const favorites = useMediaStore(s => s.favoriteIptvChannels) || [];
  const setActiveIptv = useMediaStore(s => s.setActiveIptv);
  const catalog = useCatalog();
  const [picking, setPicking] = useState<string | null>(null);
  const resolved = useMemo(() => names.map(n => {
    const r = resolveChannel(n, favorites, findFavoriteChannel, country, isArabChannel(n));
    return { name: n, ch: r?.ch as IptvChannel | undefined, isFav: !!r?.fav };
  }), [names, favorites, country, catalog]); // catalog: re-resolve once the playlist arrives

  const play = (ch: IptvChannel, isFav = true) => setActiveIptv(ch, isFav ? favorites : catalogGroup(ch));

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {resolved.map(({ name, ch, isFav }, i) => (
          <span key={name} className="flex items-center gap-1">
            <button
              onClick={() => (ch ? play(ch, isFav) : setPicking(name))}
              data-nav-id={`${idPrefix}-ch-${i}`}
              title={ch ? `تشغيل ${ch.name}${isFav ? "" : ` (من قائمة IPTV${ch.group ? ` · ${ch.group}` : ""})`}` : "اربط هذه القناة بقناة من IPTV"}
              className={cn("focusable no-focus-scale h-8 pl-3 pr-1.5 rounded-full border text-[11px] font-black flex items-center gap-1.5 max-w-[15rem]",
                !ch ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                  : isFav ? "bg-emerald-500/15 border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/25"
                    : "bg-sky-500/15 border-sky-400/40 text-sky-200 hover:bg-sky-500/25")}
            >
              {ch?.stream_icon
                ? <img src={ch.stream_icon} alt="" className="w-5 h-5 rounded-md object-contain bg-black/40 shrink-0" />
                : <Tv className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate" dir="ltr">{name}</span>
              {ch ? <Play className="w-3.5 h-3.5 fill-current shrink-0" /> : <Link2 className="w-3.5 h-3.5 shrink-0" />}
            </button>
            {editable && ch && (
              <button onClick={() => setPicking(name)} title="تغيير القناة المربوطة" className="focusable no-focus-scale w-7 h-7 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white flex items-center justify-center">
                <Link2 className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {picking && <ChannelPicker broadcast={picking} country={country} onClose={() => setPicking(null)} onPicked={ch => play(ch)} />}
    </>
  );
}

function ChannelPicker({ broadcast, country, onClose, onPicked }: { broadcast: string; country?: string; onClose: () => void; onPicked: (fav: IptvChannel) => void }) {
  const favorites = useMediaStore(s => s.favoriteIptvChannels) || [];
  const link = useMediaStore(s => s.linkIptvAlias);
  const addFavorite = useMediaStore(s => s.addIptvChannel);
  const ensureScreenData = useMediaStore(s => s.ensureScreenData);
  const catalogStatus = useIptvCatalog(s => s.status);
  const [q, setQ] = useState("");
  const key = channelKey(broadcast);
  const linked = favorites.find(f => f.matchAliases?.includes(key));
  const suggested = findFavoriteChannel(broadcast, favorites);

  useEffect(() => { if (!favorites.length) ensureScreenData("/iptv"); }, [favorites.length, ensureScreenData]);
  useEffect(() => { useIptvCatalog.getState().load(); }, []);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const all = t ? favorites.filter(f => f.name.toLowerCase().includes(t)) : favorites;
    // the closest names first: the exact match, then the most shared words ("SSC 1 HD" -> SSC channels)
    const words = new Set(channelTokens(broadcast));
    // a shared name word (ssc, bein...) counts more than a shared number
    const shared = (f: IptvChannel) => channelTokens(f.name).reduce((n, w) => n + (words.has(w) ? (/^\d+$/.test(w) ? 1 : 2) : 0), 0);
    const ranked = all.map((f, i) => ({ f, i, s: shared(f) })).sort((a, b) => b.s - a.s || a.i - b.i).map(x => x.f);
    return suggested ? [suggested, ...ranked.filter(f => f.stream_id !== suggested.stream_id)] : ranked;
  }, [favorites, q, suggested, broadcast]);

  // the whole playlist: the best match for this broadcast first, then a text search (default: the broadcast's name)
  const playlist = useMemo(() => {
    if (catalogStatus !== "ready") return [];
    const best = resolveChannel(broadcast, [], () => null, country, isArabChannel(broadcast))?.ch as IptvChannel | undefined;
    const term = q.trim() || channelTokens(broadcast).filter(t => !/^\d+$/.test(t)).join(" ");
    const hits = searchCatalog(term, 60);
    const favIds = new Set(favorites.map(f => f.stream_id));
    return (best ? [best, ...hits.filter(h => h.stream_id !== best.stream_id)] : hits).filter(h => !favIds.has(h.stream_id));
  }, [catalogStatus, broadcast, country, q, favorites]);

  const choose = (ch: IptvChannel, fromPlaylist = false) => {
    // a playlist channel joins the favourites, so the link is saved in the cloud like any other
    if (fromPlaylist) addFavorite(ch);
    link(key, ch.stream_id);
    onClose();
    onPicked(ch);
  };

  const row = (f: IptvChannel, i: number, fromPlaylist: boolean) => (
    <button key={`${fromPlaylist ? "p" : "f"}-${f.stream_id}`} onClick={() => choose(f, fromPlaylist)} data-nav-id={`channel-pick-${fromPlaylist ? "p" : "f"}${i}`}
      className={cn("focusable no-focus-scale w-full flex items-center gap-3 rounded-2xl px-3 py-2 text-right border",
        linked?.stream_id === f.stream_id ? "bg-emerald-500/20 border-emerald-400/50" : "bg-white/5 border-white/5 hover:bg-white/10")}>
      {f.stream_icon ? <img src={f.stream_icon} alt="" className="w-9 h-9 rounded-lg object-contain bg-black/40 shrink-0" /> : <Tv className="w-5 h-5 text-white/40 shrink-0" />}
      <span className="flex-1 min-w-0 text-right">
        <span className="block truncate text-sm font-black" dir="auto">{f.name}</span>
        {fromPlaylist && f.group && <span className="block truncate text-[10px] text-white/40 font-bold" dir="auto">{f.group}</span>}
      </span>
      {linked?.stream_id === f.stream_id
        ? <span className="text-[10px] text-emerald-300 font-black shrink-0">مربوطة</span>
        : (fromPlaylist ? i === 0 && !q.trim() : suggested?.stream_id === f.stream_id) && <span className="text-[10px] text-sky-300 font-black shrink-0">الأقرب</span>}
    </button>
  );

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col bg-zinc-950 text-white border-white/10 rounded-[2rem]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right font-black leading-relaxed">
            اختر القناة التي تعرض <span dir="ltr" className="text-emerald-400">{broadcast}</span>
          </DialogTitle>
          <p className="text-right text-xs text-white/40 font-bold">تُحفظ في السحابة: الضغط على هذه القناة في أي مباراة سيفتح اختيارك مباشرة</p>
        </DialogHeader>
        <label className="flex items-center gap-2 h-10 px-4 rounded-full bg-white/5 border border-white/10">
          <Search className="w-4 h-4 text-white/40" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث في المفضلة وقائمة IPTV كاملة..." className="flex-1 bg-transparent outline-none text-sm" autoFocus />
        </label>
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pl-1">
          {list.length > 0 && <p className="text-[11px] text-emerald-300/80 font-black pt-1">المفضلة</p>}
          {list.map((f, i) => row(f, i, false))}
          <p className="text-[11px] text-sky-300/80 font-black pt-2">قائمة IPTV كاملة</p>
          {catalogStatus === "loading" && <p className="py-3 text-center text-xs text-white/40">جاري تحميل القائمة...</p>}
          {catalogStatus === "error" && (
            <p className="py-3 text-center text-xs text-white/40">تعذر تحميل القائمة · <Link href="/iptv" onClick={onClose} className="text-emerald-300 underline">افتح شاشة IPTV</Link></p>
          )}
          {playlist.map((f, i) => row(f, i, true))}
          {catalogStatus === "ready" && playlist.length === 0 && <p className="py-3 text-center text-xs text-white/40">لا نتائج</p>}
        </div>
        {linked && (
          <button onClick={() => { link(key, null); onClose(); }} className="focusable no-focus-scale self-start flex items-center gap-2 text-xs font-bold text-white/50 hover:text-red-300">
            <Unlink className="w-3.5 h-3.5" /> إلغاء الربط
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}
