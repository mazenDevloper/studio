"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Star, Folder, Tv, Loader2, Plus } from "lucide-react";
import { useMediaStore, type IptvChannel } from "@/lib/store";
import { catalogGroups, channelsInGroup, useIptvCatalog } from "@/lib/iptv-catalog";
import { cn } from "@/lib/utils";

const FAVORITES = "__favorites__";
const MAX_ROWS = 300;

/**
 * Pick an IPTV channel in two steps: a searchable list of categories (the favourites first, then the playlist's
 * groups), then that category's channels with the same search box filtering the channels. `onPick` gets the
 * channel; `allowName` also offers to add the typed text as a plain channel name.
 */
export function IptvChannelSelect({ onPick, allowName = true, className }: {
  onPick: (ch: IptvChannel | { name: string }) => void;
  allowName?: boolean;
  className?: string;
}) {
  const favorites = useMediaStore(s => s.favoriteIptvChannels) || [];
  const ensureScreenData = useMediaStore(s => s.ensureScreenData);
  const status = useIptvCatalog(s => s.status);
  const catalog = useIptvCatalog(s => s.channels);
  const [group, setGroup] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => { useIptvCatalog.getState().load(); }, []);
  useEffect(() => { if (!favorites.length) ensureScreenData("/iptv"); }, [favorites.length, ensureScreenData]);

  const t = q.trim().toLowerCase();
  const groups = useMemo(() => {
    const all = [{ name: FAVORITES, count: favorites.length }, ...catalogGroups()];
    return t ? all.filter(g => (g.name === FAVORITES ? "المفضلة favorites" : g.name).toLowerCase().includes(t)) : all;
  }, [catalog, favorites.length, t]); // eslint-disable-line react-hooks/exhaustive-deps
  const channels = useMemo(() => {
    if (!group) return [];
    const list = group === FAVORITES ? favorites : channelsInGroup(group);
    const hits = t ? list.filter(c => c.name.toLowerCase().includes(t)) : list;
    return hits.slice(0, MAX_ROWS);
  }, [group, favorites, catalog, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (g: string) => { setGroup(g); setQ(""); };
  const back = () => { setGroup(null); setQ(""); };
  const label = (g: string) => (g === FAVORITES ? "القنوات المفضلة" : g);
  const row = "focusable no-focus-scale w-full flex items-center gap-3 rounded-2xl px-3 py-2 text-right border bg-white/5 border-white/5 hover:bg-white/10";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        {group && (
          <button type="button" onClick={back} title="رجوع للتصنيفات" data-nav-id="iptv-select-back"
            className="focusable no-focus-scale h-10 px-3 rounded-full bg-white/10 text-xs font-black flex items-center gap-1 shrink-0">
            <ChevronRight className="w-4 h-4" /> التصنيفات
          </button>
        )}
        <label className="relative flex-1 min-w-0 flex">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input value={q} onChange={e => setQ(e.target.value)} dir="auto" data-nav-id="iptv-select-search"
            placeholder={group ? `ابحث في ${label(group)}...` : "ابحث عن تصنيف..."}
            className="w-full h-10 pr-9 pl-3 rounded-full bg-black/40 border border-white/10 outline-none text-sm text-white" />
        </label>
      </div>
      {group && <p className="text-[11px] font-black text-emerald-300/80 truncate" dir="auto">{label(group)}</p>}

      <div className="max-h-72 overflow-y-auto space-y-1.5 pl-1">
        {!group && groups.map((g, i) => (
          <button type="button" key={g.name} onClick={() => open(g.name)} data-nav-id={`iptv-select-group-${i}`} className={row}>
            {g.name === FAVORITES ? <Star className="w-5 h-5 fill-yellow-400 text-yellow-400 shrink-0" /> : <Folder className="w-5 h-5 text-sky-300/70 shrink-0" />}
            <span className="flex-1 min-w-0 truncate text-sm font-black" dir="auto">{label(g.name)}</span>
            <span className="text-[11px] text-white/40 font-bold shrink-0">{g.count}</span>
            <ChevronLeft className="w-4 h-4 text-white/30 shrink-0" />
          </button>
        ))}
        {!group && status === "loading" && <p className="py-2 text-center text-xs text-white/40 flex items-center justify-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري تحميل تصنيفات IPTV...</p>}
        {!group && status === "error" && <p className="py-2 text-center text-xs text-white/40">تعذر تحميل قائمة IPTV · المفضلة فقط</p>}

        {group && channels.map((c, i) => (
          <button type="button" key={c.stream_id} onClick={() => onPick(c)} data-nav-id={`iptv-select-ch-${i}`} className={row}>
            {c.stream_icon ? <img src={c.stream_icon} alt="" className="w-8 h-8 rounded-lg object-contain bg-black/40 shrink-0" /> : <Tv className="w-5 h-5 text-white/40 shrink-0" />}
            <span className="flex-1 min-w-0 truncate text-sm font-black" dir="auto">{c.name}</span>
            <Plus className="w-4 h-4 text-emerald-400 shrink-0" />
          </button>
        ))}
        {((group && channels.length === 0) || (!group && groups.length === 0 && status !== "loading")) && <p className="py-3 text-center text-xs text-white/40">لا نتائج</p>}
      </div>

      {allowName && q.trim() && (
        <button type="button" onClick={() => { onPick({ name: q.trim() }); setQ(""); }} data-nav-id="iptv-select-name"
          className="focusable no-focus-scale h-9 px-4 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-black flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> أضف «{q.trim()}» بالاسم
        </button>
      )}
    </div>
  );
}
