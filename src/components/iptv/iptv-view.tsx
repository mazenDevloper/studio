
"use client";

import { useState, useEffect, useMemo } from "react";
import { useMediaStore, IptvChannel } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tv, List, ChevronRight, Loader2, Play, Search, X, Star, Zap, Link as LinkIcon, Plus, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getIptvCategories, getIptvChannels } from "@/app/actions/iptv";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export function IptvView() {
  const { setActiveIptv, favoriteIptvChannels, toggleFavoriteIptvChannel, setIptvPlaylist, reorderFavoriteIptv } = useMediaStore();
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [channels, setChannels] = useState<IptvChannel[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [isManualAddOpen, setIsManualAddOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [manualIcon, setManualIcon] = useState("");

  useEffect(() => { 
    fetchCategories(); 
    setSelectedCat('direct');
    setChannels(favoriteIptvChannels);
  }, []);

  useEffect(() => {
    if (selectedCat === 'direct') {
      setChannels(favoriteIptvChannels);
    }
  }, [favoriteIptvChannels, selectedCat]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await getIptvCategories();
      const directCat = { category_id: "direct", category_name: "القنوات المفضلة (Direct)" };
      setCategories([directCat, ...(Array.isArray(data) ? data : [])]);
    } catch {
      console.error("Failed to fetch IPTV categories");
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async (catId: string) => {
    if (catId === 'direct') { 
      setChannels(favoriteIptvChannels); 
      setSelectedCat(catId); 
      return; 
    }
    setLoading(true);
    setSelectedCat(catId);
    try {
      const data = await getIptvChannels(catId);
      if (Array.isArray(data)) {
        const transformed = data.map((ch: any) => ({
          ...ch,
          type: 'web',
          url: `http://playstop.watch:2095/live/W87d737/Pd37qj34/${ch.stream_id}.m3u8`
        }));
        setChannels(transformed);
      }
    } finally {
      setLoading(false);
    }
  };

  const isStarred = (id: string) => favoriteIptvChannels.some(c => c.stream_id === id);

  const sortedAndFilteredChannels = useMemo(() => {
    if (selectedCat === 'direct') return channels.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));
    
    return [...channels]
      .sort((a, b) => {
        const aStarred = isStarred(a.stream_id);
        const bStarred = isStarred(b.stream_id);
        if (aStarred && !bStarred) return -1;
        if (!aStarred && bStarred) return 1;
        return 0;
      })
      .filter(c => 
        c.name && typeof c.name === 'string' && c.name.toLowerCase().includes(search.toLowerCase())
      );
  }, [channels, search, favoriteIptvChannels, selectedCat]);

  const handleChannelSelect = (ch: IptvChannel, idx: number) => {
    setActiveIptv(ch);
    setIptvPlaylist(sortedAndFilteredChannels, idx);
  };

  const handleManualAdd = () => {
    if (!manualName.trim() || !manualUrl.trim()) return;
    
    const newChannel: IptvChannel = {
      stream_id: `custom-${Date.now()}`,
      name: manualName,
      url: manualUrl,
      stream_icon: manualIcon || "https://picsum.photos/seed/iptv/200",
      category_id: "direct",
      starred: true,
      type: 'web',
      stream_type: 'live'
    };

    toggleFavoriteIptvChannel(newChannel);
    setIsManualAddOpen(false);
    setManualName("");
    setManualUrl("");
    setManualIcon("");
    toast({ title: "تمت الإضافة", description: "تمت إضافة القناة لمفضلة البث المباشر" });
  };

  return (
    <div className="p-8 space-y-8 pb-32 dir-rtl text-right">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black font-headline text-white tracking-tighter flex items-center gap-4">
            مركز البث المباشر <Tv className="w-10 h-10 text-emerald-500 animate-pulse" />
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mr-1">Premium Live Feed Hub</p>
        </div>
        <div className="flex items-center gap-4">
          <Dialog open={isManualAddOpen} onOpenChange={setIsManualAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-full bg-white/5 border-white/10 text-emerald-400 h-12 px-6 focusable">
                <LinkIcon className="w-4 h-4 ml-2" /> إضافة رابط يدوي
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-950 border-white/10 rounded-[2.5rem] p-8 w-[90%] max-w-md mx-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-white mb-4 text-right">إضافة قناة بث مباشر</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <Input placeholder="اسم القناة..." value={manualName} onChange={(e) => setManualName(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl px-6 text-white text-right" />
                <Input placeholder="رابط البث (URL)..." value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl px-6 text-white text-right" />
                <Input placeholder="رابط الشعار (اختياري)..." value={manualIcon} onChange={(e) => setManualIcon(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl px-6 text-white text-right" />
                <Button onClick={handleManualAdd} className="w-full h-14 bg-emerald-600 text-white font-black rounded-2xl shadow-xl focusable">
                  حفظ في المفضلة
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={() => fetchChannels('direct')} variant="outline" className={cn("rounded-full transition-all focusable h-12 px-6", selectedCat === 'direct' ? "bg-emerald-500 text-black border-emerald-400 shadow-glow" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500")}>
            <Zap className="w-4 h-4 ml-2 fill-current" /> القنوات المفضلة
          </Button>
          {selectedCat && (
            <Button variant="ghost" onClick={() => { setSelectedCat(null); setChannels([]); setSearch(""); }} className="rounded-full bg-white/5 border border-white/10 text-white focusable h-12 px-6">
              <X className="w-4 h-4 ml-2" /> العودة للقوائم
            </Button>
          )}
        </div>
      </header>

      {!selectedCat ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in duration-700">
          {loading ? (
            <div className="col-span-full py-40 flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
              <span className="text-white/40 font-black uppercase tracking-widest">جاري جلب القوائم...</span>
            </div>
          ) : categories.map((cat, idx) => (
            <Card key={cat.category_id} onClick={() => fetchChannels(cat.category_id)} data-nav-id={`iptv-cat-${idx}`} className="group iptv-cat-item bg-white/5 border-white/5 hover:border-emerald-500 transition-all cursor-pointer focusable overflow-hidden rounded-[2.5rem] shadow-xl" tabIndex={0}>
              <CardContent className="p-8 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-500", cat.category_id === 'direct' ? "bg-emerald-500/20 border-emerald-500/20 group-hover:scale-110 shadow-lg" : "bg-white/10 border-white/10")}>
                    {cat.category_id === 'direct' ? <Zap className="w-7 h-7 text-emerald-500" /> : <List className="w-7 h-7 text-white/40" />}
                  </div>
                  <h3 className="font-black text-xl text-white truncate max-w-[200px]">{cat.category_name}</h3>
                </div>
                <ChevronRight className="w-6 h-6 text-white/20 group-hover:text-emerald-500 group-hover:translate-x-[-5px] transition-all" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Input placeholder="ابحث عن قناة في هذه القائمة..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white/5 border-white/10 h-20 rounded-[2rem] pr-16 text-2xl focusable text-right shadow-2xl" data-nav-id="iptv-search-input" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
            {loading ? (
              <div className="col-span-full py-40 flex justify-center"><Loader2 className="w-16 h-16 animate-spin text-emerald-500" /></div>
            ) : sortedAndFilteredChannels.map((ch, idx) => (
              <div key={ch.stream_id} className="flex flex-col items-center gap-4 group relative">
                <div onClick={() => handleChannelSelect(ch, idx)} data-nav-id={`iptv-channel-${idx}`} className={cn("iptv-channel-item w-36 h-36 sm:w-44 sm:h-44 rounded-[2.8rem] bg-white/5 border-4 transition-all cursor-pointer focusable overflow-hidden relative shadow-2xl", isStarred(ch.stream_id) ? "border-yellow-500/50" : "border-white/5 hover:border-emerald-500")} tabIndex={0}>
                  {ch.stream_icon ? <img src={ch.stream_icon} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <div className="w-full h-full flex items-center justify-center bg-zinc-900"><Tv className="w-14 h-14 text-white/10" /></div>}
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-all" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-all"><Play className="w-8 h-8 text-white fill-current ml-1" /></div></div>
                </div>
                
                {/* Reorder and Star Controls */}
                <div className="absolute top-2 right-2 flex flex-col gap-2 z-30 transition-all">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleFavoriteIptvChannel(ch); }} 
                    className={cn(
                      "w-11 h-11 rounded-full backdrop-blur-xl border border-white/10 flex items-center justify-center transition-all focusable", 
                      isStarred(ch.stream_id) ? "bg-yellow-500 text-black opacity-100 shadow-glow" : "bg-black/60 text-white/40 opacity-0 group-hover:opacity-100"
                    )}
                  >
                    <Star className={cn("w-6 h-6", isStarred(ch.stream_id) && "fill-current")} />
                  </button>
                  
                  {selectedCat === 'direct' && idx > 0 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); reorderFavoriteIptv(idx, 'up'); }}
                      className="w-11 h-11 rounded-full bg-blue-600/80 backdrop-blur-xl text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focusable border border-white/10 shadow-lg"
                      title="تحريك للأعلى"
                    >
                      <ChevronUp className="w-6 h-6" />
                    </button>
                  )}
                </div>

                <span className={cn("font-black text-base text-center truncate w-full px-2 transition-colors", isStarred(ch.stream_id) ? "text-yellow-500" : "text-white/70 group-hover:text-white")}>{ch.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
