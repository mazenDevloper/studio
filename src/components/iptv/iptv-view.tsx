
"use client";

import { useState, useEffect, useMemo } from "react";
import { useMediaStore, IptvChannel } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tv, List, ChevronRight, Loader2, X, Star, Zap, Search, ArrowRightLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getIptvCategories, getIptvChannels } from "@/app/actions/iptv";
import { cn } from "@/lib/utils";
import { ShortcutBadge } from "@/components/layout/car-dock";

export function IptvView() {
  const { 
    setActiveIptv, favoriteIptvChannels, toggleFavoriteIptvChannel, dockSide, pickedUpId, setPickedUpId,
    isReorderMode, reorderIptvChannelTo, toggleReorderMode
  } = useMediaStore();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [channels, setChannels] = useState<IptvChannel[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const isDockLeft = dockSide === 'left';

  useEffect(() => { 
    fetchCategories(); 
    setSelectedCat('direct');
    setTimeout(() => {
      const firstChannel = document.querySelector('[data-nav-id="iptv-channel-0"]') as HTMLElement;
      firstChannel?.focus();
    }, 800);
  }, []);

  useEffect(() => {
    if (selectedCat === 'direct') {
      setChannels(Array.isArray(favoriteIptvChannels) ? favoriteIptvChannels : []);
    }
  }, [favoriteIptvChannels, selectedCat]);

  // Drag and Drop Logic
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
    if (catId === 'direct') { setChannels(Array.isArray(favoriteIptvChannels) ? favoriteIptvChannels : []); setSelectedCat(catId); return; }
    setLoading(true); setSelectedCat(catId);
    try {
      const data = await getIptvChannels(catId);
      if (Array.isArray(data)) {
        const transformed = data.map((ch: any) => ({ ...ch, type: 'web', url: `http://playstop.watch:2095/live/W87d737/Pd37qj34/${ch.stream_id}.m3u8` }));
        setChannels(transformed);
        setTimeout(() => { document.querySelector('[data-nav-id="iptv-channel-0"]')?.focus(); }, 300);
      }
    } finally { setLoading(false); }
  };

  const filteredChannels = useMemo(() => {
    const list = Array.isArray(channels) ? channels : [];
    return list.filter(c => c.name && c.name.toLowerCase().includes(search.toLowerCase()));
  }, [channels, search]);

  return (
    <div className={cn("p-8 space-y-8 pb-32", isDockLeft ? "text-right dir-rtl" : "text-left dir-ltr")}>
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
            >
              <ShortcutBadge action="toggle_reorder" className="-bottom-3 -left-3" />
              <ArrowRightLeft className="w-4 h-4 ml-2" /> {isReorderMode ? "إيقاف الترتيب" : "ترتيب المفضلة"}
            </Button>
          )}
          <Button onClick={() => fetchChannels('direct')} variant="outline" className={cn("rounded-full focusable h-12 px-6", selectedCat === 'direct' ? "bg-emerald-500 text-black shadow-glow" : "bg-white/5")} data-nav-id="iptv-fav-toggle">
            <Zap className="w-4 h-4 ml-2" /> المفضلة
          </Button>
          {selectedCat && (
            <Button variant="ghost" onClick={() => setSelectedCat(null)} className="rounded-full bg-white/5 border border-white/10 text-white focusable h-12 px-6" data-nav-id="iptv-back-btn">
              <X className="w-4 h-4 ml-2" /> العودة
            </Button>
          )}
        </div>
      </header>

      {!selectedCat ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in duration-700" data-row-id="iptv-categories">
          {loading ? (
            <div className="col-span-full py-40 flex justify-center"><Loader2 className="w-12 h-12 animate-spin text-emerald-500" /></div>
          ) : categories.map((cat, idx) => (
            <Card key={idx} onClick={() => fetchChannels(cat.category_id)} data-nav-id={`iptv-cat-${idx}`} className="group bg-white/5 border-white/5 hover:border-emerald-500 transition-all cursor-pointer focusable rounded-[2.5rem] shadow-xl" tabIndex={0}>
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
          <Input placeholder="ابحث عن قناة..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white/5 border-white/10 h-20 rounded-[2rem] px-8 text-2xl text-white shadow-2xl search-input-quiet" data-nav-id="iptv-search-input" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8" data-row-id="iptv-channels-grid">
            {filteredChannels.map((ch, idx) => (
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
                    setActiveIptv(ch, filteredChannels); 
                  }
                }} 
                data-nav-id={`iptv-channel-${idx}`} data-type="iptv" data-id={ch.stream_id} 
                className={cn(
                  "group w-full aspect-square rounded-[2.8rem] bg-white/5 border-4 focusable cursor-pointer overflow-hidden relative shadow-2xl transition-all", 
                  pickedUpId === ch.stream_id ? "border-accent animate-pulse scale-105 z-50 bg-accent/20" : "border-transparent hover:border-emerald-500",
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
        </div>
      )}
    </div>
  );
}
