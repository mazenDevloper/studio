
"use client";

import { useState, useEffect, useMemo, useDeferredValue } from "react";
import { useMediaStore, IptvChannel } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Tv, List, ChevronRight, Loader2, Star, ArrowRightLeft, Link2, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getIptvCategories, getIptvChannels } from "@/app/actions/iptv";
import { cn } from "@/lib/utils";
import { ShortcutBadge } from "@/components/layout/car-dock";
import { M3uPlayerPopup } from "@/components/iptv/m3u-player-popup";
import { IptvSource, LoadResult, loadSource } from "@/lib/m3u-loader";
import { DEFAULT_IPTV_SOURCE } from "@/lib/iptv-defaults";
import { M3uChannel } from "@/lib/m3u";
import { useToast } from "@/hooks/use-toast";

const SOURCE_KEY = "iptv_source_v1";
const PAGE_SIZE = 120;
const GROUPS_PREVIEW = 12;

const toIptvChannel = (c: M3uChannel): IptvChannel => ({
  name: c.name, stream_id: `m3u:${c.url}`, stream_icon: c.logo || "", category_id: "source", url: c.url, type: "live", group: c.group,
});

/**
 * IptvView v115.0 - Free-Grid Navigation Hub
 * Optimized for spatial remote navigation across categories and channels.
 */
export function IptvView() {
  const { 
    setActiveIptv, favoriteIptvChannels, toggleFavoriteIptvChannel, dockSide, pickedUpId, setPickedUpId,
    isReorderMode, reorderIptvChannelTo, toggleReorderMode, activeIptv
  } = useMediaStore();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [channels, setChannels] = useState<IptvChannel[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>("source");
  const [sourceStatus, setSourceStatus] = useState<"loading" | "ready" | "error">("loading");
  const [activeSource, setActiveSource] = useState<IptvSource>(DEFAULT_IPTV_SOURCE);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  // Keep typing instant even with thousands of channels: the grid re-filters at low priority.
  const deferredSearch = useDeferredValue(search);
  const [linkOpen, setLinkOpen] = useState(false);
  const [sourceChannels, setSourceChannels] = useState<IptvChannel[]>([]);
  const [group, setGroup] = useState("all");
  const [groupsExpanded, setGroupsExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const isDockLeft = dockSide === 'left';

  const applySource = (res: LoadResult) => {
    const list = res.channels.map(toIptvChannel);
    setSourceChannels(list);
    setGroup("all");
    setVisibleCount(PAGE_SIZE);
    return list;
  };

  // Load the saved link, or the default playlist on first run (only the link is stored; channels are re-fetched).
  const loadInitialSource = (src: IptvSource) => {
    setSourceStatus("loading"); setActiveSource(src);
    loadSource(src)
      .then(res => { applySource(res); setSourceStatus("ready"); })
      .catch(() => {
        setSourceStatus("error");
        setSelectedCat(cur => (cur === "source" ? "direct" : cur));
        toast({ title: "تعذر تحميل القائمة", description: "تحقق من الرابط أو الاتصال", variant: "destructive" });
      });
  };

  useEffect(() => {
    let saved: IptvSource = DEFAULT_IPTV_SOURCE;
    try { const raw = localStorage.getItem(SOURCE_KEY); if (raw) saved = JSON.parse(raw) as IptvSource; } catch {}
    loadInitialSource(saved);
  }, []);

  const handleSourceLoaded = (res: LoadResult, source: IptvSource) => {
    try { localStorage.setItem(SOURCE_KEY, JSON.stringify(source)); } catch {}
    const list = applySource(res);
    setActiveSource(source); setSourceStatus("ready");
    if (res.single) { playChannel(list[0], list); return; }
    setChannels(list); setSelectedCat("source");
    toast({ title: "تم تحميل القائمة", description: `${list.length} قناة` });
  };

  const resetSource = () => {
    try { localStorage.removeItem(SOURCE_KEY); } catch {}
    setSourceChannels([]); setChannels([]); setSelectedCat("source");
    loadInitialSource(DEFAULT_IPTV_SOURCE);
  };

  const playChannel = (ch: IptvChannel, list: IptvChannel[]) => {
    // Cinema mode: the global player opens full-screen (like the media screen), with the channel list as a side panel.
    setActiveIptv(ch, list);
  };

  useEffect(() => { 
    fetchCategories(); 
    // Only grab focus when nothing else has it, so typing in the search box is never interrupted.
    setTimeout(() => {
      if (document.activeElement && document.activeElement !== document.body) return;
      (document.querySelector('[data-nav-id="iptv-channel-0"]') as HTMLElement)?.focus();
    }, 800);
  }, []);

  useEffect(() => {
    if (selectedCat === 'source') setChannels(sourceChannels);
  }, [sourceChannels, selectedCat]);

  useEffect(() => {
    if (selectedCat === 'direct') {
      setChannels(Array.isArray(favoriteIptvChannels) ? favoriteIptvChannels : []);
    }
  }, [favoriteIptvChannels, selectedCat]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!isReorderMode || selectedCat !== 'direct') return;
    e.dataTransfer.setData("id", id);
    setPickedUpId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isReorderMode || selectedCat !== 'direct') return;
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    if (!isReorderMode || selectedCat !== 'direct') return;
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("id");
    if (sourceId === targetId) return;
    reorderIptvChannelTo(sourceId, targetId);
    setPickedUpId(null);
  };

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await getIptvCategories();
      const directCat = { category_id: "direct", category_name: "القنوات المفضلة" };
      setCategories([directCat, ...(Array.isArray(data) ? data : [])]);
    } finally { setLoading(false); }
  };

  const fetchChannels = async (catId: string) => {
    if (catId === 'source') { setChannels(sourceChannels); setSelectedCat(catId); setGroup('all'); setVisibleCount(PAGE_SIZE); return; }
    if (catId === 'direct') { setChannels(Array.isArray(favoriteIptvChannels) ? favoriteIptvChannels : []); setSelectedCat(catId); return; }
    setLoading(true); setSelectedCat(catId);
    try {
      const data = await getIptvChannels(catId);
      if (Array.isArray(data)) {
        const transformed = data.map((ch: any) => ({ ...ch, type: 'web', url: `http://playstop.watch:2095/live/W87d737/Pd37qj34/${ch.stream_id}.m3u8` }));
        setChannels(transformed);
        setTimeout(() => {
          if (document.activeElement && document.activeElement !== document.body) return;
          (document.querySelector('[data-nav-id="iptv-channel-0"]') as HTMLElement)?.focus();
        }, 300);
      }
    } finally { setLoading(false); }
  };

  const filteredChannels = useMemo(() => {
    const list = Array.isArray(channels) ? channels : [];
    const q = deferredSearch.toLowerCase();
    return list.filter(c => c.name && c.name.toLowerCase().includes(q) && (selectedCat !== 'source' || group === 'all' || c.group === group));
  }, [channels, deferredSearch, group, selectedCat]);

  const sourceGroups = useMemo(() => Array.from(new Set(sourceChannels.map(c => c.group).filter(Boolean) as string[])), [sourceChannels]);

  const allCategories = useMemo(() => {
    const [direct, ...rest] = categories.length ? categories : [{ category_id: "direct", category_name: "القنوات المفضلة" }];
    const src = { category_id: "source", category_name: sourceChannels.length ? `قائمتي (${sourceChannels.length})` : "قائمتي" };
    return [src, direct, ...rest];
  }, [categories, sourceChannels.length]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, group, selectedCat]);

  const cols = "grid-cols-2 md:grid-cols-3 xl:grid-cols-5";

  return (
    <div dir="ltr" className={cn("h-screen flex overflow-hidden relative", isDockLeft ? "flex-row" : "flex-row-reverse")}>
      {/* Categories: full-height side panel next to the car dock */}
      <aside data-nav-zone="sidebar" dir="rtl" className={cn("flex h-full z-[110] premium-glass flex-col shrink-0 bg-black/60 border-white/5 w-[34%] md:w-[22%] min-w-[180px]", isDockLeft ? "border-r" : "border-l")}>
        <div className="p-4 flex items-center gap-3 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-glow"><List className="w-5 h-5 text-white" /></div>
          <h2 className="text-lg font-black text-white tracking-tight">التصنيفات</h2>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar p-3 pb-40 space-y-2">
          {allCategories.map((cat, idx) => (
            <div key={String(cat.category_id) + idx} data-row-id={`iptv-cat-row-${idx}`} className="space-y-1.5">
              <button
                onClick={() => fetchChannels(String(cat.category_id))}
                data-nav-id={`iptv-cat-${idx}`}
                className={cn("w-full flex items-center justify-between gap-2 p-3 rounded-2xl border text-right focusable transition-all outline-none",
                  String(selectedCat) === String(cat.category_id) ? "bg-emerald-600 border-emerald-400 text-white shadow-glow" : "bg-white/5 border-white/5 text-white/80 hover:bg-white/10")}
              >
                <span className="font-black text-sm truncate">{cat.category_name}</span>
                <ChevronRight className="w-4 h-4 shrink-0 opacity-50 rotate-180" />
              </button>
              {cat.category_id === "source" && sourceGroups.length > 0 && (
                <div className="mr-3 pr-2 border-r border-white/10 space-y-1" data-row-id="iptv-groups">
                  {["all", ...(groupsExpanded ? sourceGroups : sourceGroups.slice(0, GROUPS_PREVIEW))].map((g, i) => (
                    <button key={g} onClick={() => { setSelectedCat("source"); setChannels(sourceChannels); setGroup(g); }} data-nav-id={`iptv-group-${i}`}
                      className={cn("w-full text-right px-3 h-9 rounded-xl text-xs font-black truncate focusable outline-none transition-all",
                        selectedCat === "source" && group === g ? "bg-emerald-500 text-black" : "bg-white/5 text-white/70 hover:bg-white/10")}>
                      {g === "all" ? "الكل" : g}
                    </button>
                  ))}
                  {sourceGroups.length > GROUPS_PREVIEW && (
                    <button onClick={() => setGroupsExpanded(v => !v)} data-nav-id="iptv-groups-more"
                      className="w-full text-center h-9 rounded-xl text-xs font-black text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 focusable outline-none">
                      {groupsExpanded ? "أقل" : `المزيد (${sourceGroups.length - GROUPS_PREVIEW})`}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      <main data-nav-zone="content" className="flex-1 min-w-0 overflow-y-auto no-scrollbar p-6 pb-40 space-y-6" dir="rtl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black font-headline text-white tracking-tighter flex items-center gap-4">
              مركز البث المباشر <Tv className="w-8 h-8 text-emerald-500 animate-pulse" />
            </h1>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Premium Live Feed Hub</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {selectedCat === 'direct' && (
              <Button onClick={toggleReorderMode} variant={isReorderMode ? "default" : "outline"} className={cn("rounded-full focusable h-11 px-5 relative", isReorderMode ? "bg-yellow-500 text-black shadow-glow" : "bg-white/5")} data-nav-id="iptv-reorder-btn">
                <ShortcutBadge action="toggle_reorder" className="-bottom-3 -left-3" />
                <ArrowRightLeft className="w-4 h-4 ml-2" /> {isReorderMode ? "إيقاف الترتيب" : "ترتيب المفضلة"}
              </Button>
            )}
            <Button onClick={() => setLinkOpen(true)} variant="outline" className="rounded-full focusable h-11 px-5 bg-white/5" data-nav-id="iptv-link-btn">
              <Link2 className="w-4 h-4 ml-2" /> رابط
            </Button>
            <Button onClick={resetSource} variant="outline" className="rounded-full focusable h-11 px-5 bg-white/5" data-nav-id="iptv-reset-source" title="استعادة الرابط الافتراضي">
              <RotateCcw className="w-4 h-4 ml-2" /> الافتراضي
            </Button>
          </div>
        </header>

        <Input placeholder="ابحث عن قناة..." value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" inputMode="search" enterKeyHint="search" className="bg-white/5 border-white/10 h-14 rounded-[2rem] px-6 text-lg text-white shadow-2xl focusable no-focus-scale outline-none" data-nav-id="iptv-search-input" />

        {sourceStatus === 'error' && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3">
            <span className="text-sm font-bold text-red-300">تعذر تحميل القائمة. قد يكون الرابط محجوباً من السيرفر أو انتهت مهلة الاتصال.</span>
            <Button onClick={() => loadInitialSource(activeSource)} variant="outline" className="rounded-full h-10 px-5 bg-white/5 focusable shrink-0" data-nav-id="iptv-retry-source">
              <RotateCcw className="w-4 h-4 ml-2" /> إعادة المحاولة
            </Button>
          </div>
        )}

        {(loading || (selectedCat === 'source' && sourceStatus === 'loading')) ? (
          <div className="py-32 flex flex-col items-center gap-4 text-white/40"><Loader2 className="w-12 h-12 animate-spin text-emerald-500" /><span className="text-sm font-bold">جاري تحميل القنوات...</span></div>
        ) : filteredChannels.length === 0 ? (
          <div className="py-32 text-center text-white/30 font-bold">لا توجد قنوات</div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className={cn("grid gap-6", cols)} data-row-id="iptv-channels-grid">
              {filteredChannels.slice(0, visibleCount).map((ch, idx) => (
                <div
                  key={ch.stream_id + idx}
                  draggable={isReorderMode && selectedCat === 'direct'}
                  onDragStart={(e) => handleDragStart(e, ch.stream_id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, ch.stream_id)}
                  onClick={() => {
                    if (isReorderMode) setPickedUpId(pickedUpId === ch.stream_id ? null : ch.stream_id);
                    else playChannel(ch, filteredChannels);
                  }}
                  data-nav-id={`iptv-channel-${idx}`} data-type="iptv" data-id={ch.stream_id}
                  className={cn(
                    "group w-full aspect-square rounded-[2.5rem] bg-white/5 border-4 focusable cursor-pointer overflow-hidden relative shadow-2xl transition-all outline-none",
                    pickedUpId === ch.stream_id ? "border-accent animate-pulse scale-105 z-50 bg-accent/20" : activeIptv?.stream_id === ch.stream_id ? "border-emerald-500 shadow-glow" : "border-transparent hover:border-emerald-500 focus:border-emerald-500",
                    isReorderMode && selectedCat === 'direct' && "cursor-move"
                  )}
                  tabIndex={0}
                >
                  {isReorderMode && selectedCat === 'direct' && (
                    <div className="absolute top-4 left-4 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center border border-accent/40 shadow-glow z-50">
                      <ArrowRightLeft className={cn("w-5 h-5 text-accent", pickedUpId === ch.stream_id && "animate-bounce")} />
                    </div>
                  )}
                  {ch.stream_icon ? <img src={ch.stream_icon} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" onError={(e) => (e.currentTarget.style.display = "none")} /> : <div className="w-full h-full flex items-center justify-center bg-zinc-900"><Tv className="w-14 h-14 text-white/10" /></div>}
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-end p-4">
                    <span className="text-white text-xs font-black text-center truncate w-full">{ch.name}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavoriteIptvChannel(ch); }}
                    className={cn("absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all", favoriteIptvChannels.some(c => c.stream_id === ch.stream_id) ? "bg-yellow-500 text-black" : "bg-black/60 text-white/40")}
                  >
                    <ShortcutBadge action="delete_item" className="-top-2 -right-2 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity" />
                    <Star className={cn("w-5 h-5", favoriteIptvChannels.some(c => c.stream_id === ch.stream_id) && "fill-current")} />
                  </button>
                </div>
              ))}
            </div>
            {filteredChannels.length > visibleCount && (
              <div className="flex justify-center">
                <Button onClick={() => setVisibleCount(v => v + PAGE_SIZE)} variant="outline" className="rounded-full h-12 px-8 bg-white/5 focusable" data-nav-id="iptv-show-more">
                  عرض المزيد ({filteredChannels.length - visibleCount})
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      <M3uPlayerPopup open={linkOpen} onOpenChange={setLinkOpen} initialUrl={activeSource.kind === "url" ? activeSource.url : undefined} onLoad={handleSourceLoaded} />
    </div>
  );
}
