
"use client";

import { useState, useEffect, useMemo } from "react";
import { useMediaStore, IptvChannel } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tv, List, ChevronRight, Loader2, X, Star, Zap, Search, ArrowRightLeft, Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getIptvCategories, getIptvChannels } from "@/app/actions/iptv";
import { cn } from "@/lib/utils";
import { ShortcutBadge } from "@/components/layout/car-dock";
import { M3uPlayerPopup } from "@/components/iptv/m3u-player-popup";
import { IptvSource, LoadResult, loadSource } from "@/lib/m3u-loader";
import { M3uChannel } from "@/lib/m3u";
import { useIsWide } from "@/hooks/use-is-wide";
import { useToast } from "@/hooks/use-toast";

const SOURCE_KEY = "iptv_source_v1";
const PAGE_SIZE = 120;

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
    isReorderMode, reorderIptvChannelTo, toggleReorderMode, setIsFullScreen,
    activeIptv, isFullScreen, isMinimized
  } = useMediaStore();
  const isWide = useIsWide();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [channels, setChannels] = useState<IptvChannel[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [sourceChannels, setSourceChannels] = useState<IptvChannel[]>([]);
  const [group, setGroup] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // The global player docks beside this list while a channel plays (wide screens only).
  const isDocked = !!activeIptv && !isFullScreen && !isMinimized && isWide;
  const dockedPaddingStyle = isDocked ? (dockSide === 'left' ? { paddingRight: "44vw" } : { paddingLeft: "44vw" }) : undefined;

  const isDockLeft = dockSide === 'left';

  const applySource = (res: LoadResult) => {
    const list = res.channels.map(toIptvChannel);
    setSourceChannels(list);
    setGroup("all");
    setVisibleCount(PAGE_SIZE);
    return list;
  };

  // Restore the last loaded link (only the link is stored; channels are re-fetched).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SOURCE_KEY);
      if (!saved) return;
      loadSource(JSON.parse(saved) as IptvSource).then(res => { if (!res.single) applySource(res); }).catch(() => {});
    } catch {}
  }, []);

  const handleSourceLoaded = (res: LoadResult, source: IptvSource) => {
    try { localStorage.setItem(SOURCE_KEY, JSON.stringify(source)); } catch {}
    const list = applySource(res);
    if (res.single) { playChannel(list[0], list); return; }
    setChannels(list); setSelectedCat("source");
    toast({ title: "تم تحميل القائمة", description: `${list.length} قناة` });
  };

  const clearSource = () => {
    try { localStorage.removeItem(SOURCE_KEY); } catch {}
    setSourceChannels([]); setSelectedCat(null); setChannels([]);
  };

  const playChannel = (ch: IptvChannel, list: IptvChannel[]) => {
    // Wide screens: keep the player docked next to the list. Narrow screens: full-screen as before.
    setActiveIptv(ch, list, isWide);
    if (isWide) setIsFullScreen(false);
  };

  useEffect(() => { 
    fetchCategories(); 
    setSelectedCat('direct');
    setTimeout(() => {
      const firstChannel = document.querySelector('[data-nav-id="iptv-channel-0"]') as HTMLElement;
      firstChannel?.focus();
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
        setTimeout(() => { (document.querySelector('[data-nav-id="iptv-channel-0"]') as HTMLElement)?.focus(); }, 300);
      }
    } finally { setLoading(false); }
  };

  const filteredChannels = useMemo(() => {
    const list = Array.isArray(channels) ? channels : [];
    const q = search.toLowerCase();
    return list.filter(c => c.name && c.name.toLowerCase().includes(q) && (selectedCat !== 'source' || group === 'all' || c.group === group));
  }, [channels, search, group, selectedCat]);

  const sourceGroups = useMemo(() => Array.from(new Set(sourceChannels.map(c => c.group).filter(Boolean) as string[])), [sourceChannels]);

  const allCategories = useMemo(() => {
    if (!sourceChannels.length) return categories;
    const [direct, ...rest] = categories;
    const src = { category_id: "source", category_name: `قائمة الرابط (${sourceChannels.length})` };
    return direct ? [direct, src, ...rest] : [src, ...rest];
  }, [categories, sourceChannels.length]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, group, selectedCat]);

  return (
    <div data-nav-zone="content" style={dockedPaddingStyle} className={cn("p-8 space-y-8 pb-32 transition-[padding] duration-300", isDockLeft ? "text-right dir-rtl" : "text-left dir-ltr")}>
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black font-headline text-white tracking-tighter flex items-center gap-4">
            مركز البث المباشر <Tv className="w-10 h-10 text-emerald-500 animate-pulse" />
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mr-1">Premium Live Feed Hub</p>
        </div>
        <div className="flex gap-4">
          {selectedCat === 'direct' && (
            <Button 
              onClick={toggleReorderMode} 
              variant={isReorderMode ? "default" : "outline"} 
              className={cn("rounded-full focusable h-12 px-6 relative", isReorderMode ? "bg-yellow-500 text-black shadow-glow" : "bg-white/5")}
              data-nav-id="iptv-reorder-btn"
            >
              <ShortcutBadge action="toggle_reorder" className="-bottom-3 -left-3" />
              <ArrowRightLeft className="w-4 h-4 ml-2" /> {isReorderMode ? "إيقاف الترتيب" : "ترتيب المفضلة"}
            </Button>
          )}
          <Button onClick={() => setLinkOpen(true)} variant="outline" className="rounded-full focusable h-12 px-6 bg-white/5" data-nav-id="iptv-link-btn">
            <Link2 className="w-4 h-4 ml-2" /> رابط
          </Button>
          <Button onClick={() => fetchChannels('direct')} variant="outline" className={cn("rounded-full focusable h-12 px-6", selectedCat === 'direct' ? "bg-emerald-500 text-black shadow-glow" : "bg-white/5")} data-nav-id="iptv-fav-toggle">
            <Zap className="w-4 h-4 ml-2" /> المفضلة
          </Button>
          {selectedCat === 'source' && (
            <Button onClick={clearSource} variant="outline" className="rounded-full focusable h-12 px-6 bg-white/5 text-red-400" data-nav-id="iptv-clear-source">
              <X className="w-4 h-4 ml-2" /> حذف القائمة
            </Button>
          )}
          {selectedCat && (
            <Button variant="ghost" onClick={() => setSelectedCat(null)} className="rounded-full bg-white/5 border border-white/10 text-white focusable h-12 px-6" data-nav-id="iptv-back-btn">
              <X className="w-4 h-4 ml-2" /> العودة
            </Button>
          )}
        </div>
      </header>

      {!selectedCat ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in duration-700" data-row-id="iptv-categories">
          {loading ? (
            <div className="col-span-full py-40 flex justify-center"><Loader2 className="w-12 h-12 animate-spin text-emerald-500" /></div>
          ) : allCategories.map((cat, idx) => (
            <Card key={idx} onClick={() => fetchChannels(cat.category_id)} data-nav-id={`iptv-cat-${idx}`} className="group bg-white/5 border-white/5 hover:border-emerald-500 transition-all cursor-pointer focusable rounded-[2.5rem] shadow-xl outline-none" tabIndex={0}>
              <CardContent className="p-8 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/10 border border-white/10"><List className="w-7 h-7 text-white/40" /></div>
                  <h3 className="font-black text-xl text-white truncate max-w-[200px]">{cat.category_name}</h3>
                </div>
                <ChevronRight className="w-6 h-6 text-white/20 group-hover:text-emerald-500 transition-all" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Input placeholder="ابحث عن قناة..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white/5 border-white/10 h-20 rounded-[2rem] px-8 text-2xl text-white shadow-2xl focusable outline-none" data-nav-id="iptv-search-input" />
          {selectedCat === 'source' && sourceGroups.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" data-row-id="iptv-groups">
              {["all", ...sourceGroups].map((g, i) => (
                <button key={g} onClick={() => setGroup(g)} data-nav-id={`iptv-group-${i}`}
                  className={cn("shrink-0 h-10 px-5 rounded-full text-sm font-black border focusable", group === g ? "bg-emerald-500 text-black border-emerald-500" : "bg-white/5 text-white/70 border-white/10")}>
                  {g === "all" ? "الكل" : g}
                </button>
              ))}
            </div>
          )}
          <div className={cn("grid gap-8", isDocked ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6")} data-row-id="iptv-channels-grid">
            {filteredChannels.slice(0, visibleCount).map((ch, idx) => (
              <div 
                key={idx} 
                draggable={isReorderMode && selectedCat === 'direct'}
                onDragStart={(e) => handleDragStart(e, ch.stream_id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, ch.stream_id)}
                onClick={() => { 
                  if (isReorderMode) {
                    setPickedUpId(pickedUpId === ch.stream_id ? null : ch.stream_id);
                  } else {
                    playChannel(ch, filteredChannels); 
                  }
                }} 
                data-nav-id={`iptv-channel-${idx}`} data-type="iptv" data-id={ch.stream_id} 
                className={cn(
                  "group w-full aspect-square rounded-[3rem] bg-white/5 border-4 focusable cursor-pointer overflow-hidden relative shadow-2xl transition-all outline-none", 
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
                {ch.stream_icon ? <img src={ch.stream_icon} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" /> : <div className="w-full h-full flex items-center justify-center bg-zinc-900"><Tv className="w-14 h-14 text-white/10" /></div>}
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
      <M3uPlayerPopup open={linkOpen} onOpenChange={setLinkOpen} onLoad={handleSourceLoaded} />
    </div>
  );
}
