"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, Link2, Tv, Search, Unlink } from "lucide-react";
import Link from "next/link";
import { useMediaStore, type IptvChannel } from "@/lib/store";
import { channelKey, channelTokens, findFavoriteChannel } from "@/lib/match-channels";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * A match's TV channels as buttons. A channel found in the IPTV favourites plays straight away (the player opens
 * with the favourites as its side list); one that isn't found opens a picker, and the pick is remembered on that
 * favourite (synced to the cloud) for every later match.
 */
export function MatchChannelChips({ names, idPrefix, editable = false, className }: {
  names: string[];
  /** for remote/keyboard navigation ids */
  idPrefix: string;
  /** show a small "change link" button next to linked channels */
  editable?: boolean;
  className?: string;
}) {
  const favorites = useMediaStore(s => s.favoriteIptvChannels) || [];
  const setActiveIptv = useMediaStore(s => s.setActiveIptv);
  const [picking, setPicking] = useState<string | null>(null);
  const resolved = useMemo(() => names.map(n => ({ name: n, fav: findFavoriteChannel(n, favorites) })), [names, favorites]);

  const play = (fav: IptvChannel) => setActiveIptv(fav, favorites);

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {resolved.map(({ name, fav }, i) => (
          <span key={name} className="flex items-center gap-1">
            <button
              onClick={() => (fav ? play(fav) : setPicking(name))}
              data-nav-id={`${idPrefix}-ch-${i}`}
              title={fav ? `تشغيل ${fav.name}` : "اربط هذه القناة بقناة من المفضلة"}
              className={cn("focusable no-focus-scale h-8 pl-3 pr-1.5 rounded-full border text-[11px] font-black flex items-center gap-1.5 max-w-[15rem]",
                fav ? "bg-emerald-500/15 border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/25" : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10")}
            >
              {fav?.stream_icon
                ? <img src={fav.stream_icon} alt="" className="w-5 h-5 rounded-md object-contain bg-black/40 shrink-0" />
                : <Tv className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate" dir="ltr">{name}</span>
              {fav ? <Play className="w-3.5 h-3.5 fill-current shrink-0" /> : <Link2 className="w-3.5 h-3.5 shrink-0" />}
            </button>
            {editable && fav && (
              <button onClick={() => setPicking(name)} title="تغيير القناة المربوطة" className="focusable no-focus-scale w-7 h-7 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white flex items-center justify-center">
                <Link2 className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {picking && <ChannelPicker broadcast={picking} onClose={() => setPicking(null)} onPicked={play} />}
    </>
  );
}

function ChannelPicker({ broadcast, onClose, onPicked }: { broadcast: string; onClose: () => void; onPicked: (fav: IptvChannel) => void }) {
  const favorites = useMediaStore(s => s.favoriteIptvChannels) || [];
  const link = useMediaStore(s => s.linkIptvAlias);
  const ensureScreenData = useMediaStore(s => s.ensureScreenData);
  const [q, setQ] = useState("");
  const key = channelKey(broadcast);
  const linked = favorites.find(f => f.matchAliases?.includes(key));
  const suggested = findFavoriteChannel(broadcast, favorites);

  useEffect(() => { if (!favorites.length) ensureScreenData("/iptv"); }, [favorites.length, ensureScreenData]);

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

  const choose = (fav: IptvChannel) => {
    link(key, fav.stream_id);
    onClose();
    onPicked(fav);
  };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col bg-zinc-950 text-white border-white/10 rounded-[2rem]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right font-black leading-relaxed">
            اختر القناة التي تعرض <span dir="ltr" className="text-emerald-400">{broadcast}</span>
          </DialogTitle>
          <p className="text-right text-xs text-white/40 font-bold">تُحفظ في السحابة: الضغط على هذه القناة في أي مباراة سيفتح اختيارك مباشرة</p>
        </DialogHeader>
        {favorites.length === 0 ? (
          <div className="py-10 text-center text-sm text-white/50 font-bold space-y-3">
            <p>لا توجد قنوات في المفضلة بعد</p>
            <Link href="/iptv" onClick={onClose} className="inline-block h-9 leading-9 px-5 rounded-full bg-emerald-500 text-black text-xs font-black">افتح شاشة IPTV وأضف قنواتك</Link>
          </div>
        ) : (
          <>
            <label className="flex items-center gap-2 h-10 px-4 rounded-full bg-white/5 border border-white/10">
              <Search className="w-4 h-4 text-white/40" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث في المفضلة..." className="flex-1 bg-transparent outline-none text-sm" autoFocus />
            </label>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pl-1">
              {list.map((f, i) => (
                <button key={f.stream_id} onClick={() => choose(f)} data-nav-id={`channel-pick-${i}`}
                  className={cn("focusable no-focus-scale w-full flex items-center gap-3 rounded-2xl px-3 py-2 text-right border",
                    linked?.stream_id === f.stream_id ? "bg-emerald-500/20 border-emerald-400/50" : "bg-white/5 border-white/5 hover:bg-white/10")}>
                  {f.stream_icon ? <img src={f.stream_icon} alt="" className="w-9 h-9 rounded-lg object-contain bg-black/40 shrink-0" /> : <Tv className="w-5 h-5 text-white/40 shrink-0" />}
                  <span className="flex-1 min-w-0 truncate text-sm font-black" dir="auto">{f.name}</span>
                  {linked?.stream_id === f.stream_id
                    ? <span className="text-[10px] text-emerald-300 font-black shrink-0">مربوطة</span>
                    : suggested?.stream_id === f.stream_id && <span className="text-[10px] text-sky-300 font-black shrink-0">الأقرب</span>}
                </button>
              ))}
              {list.length === 0 && <p className="py-6 text-center text-xs text-white/40">لا نتائج</p>}
            </div>
            {linked && (
              <button onClick={() => { link(key, null); onClose(); }} className="focusable no-focus-scale self-start flex items-center gap-2 text-xs font-bold text-white/50 hover:text-red-300">
                <Unlink className="w-3.5 h-3.5" /> إلغاء الربط
              </button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
