
"use client";

import { useState, useEffect } from "react";
import { useMediaStore, IptvChannel } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tv, List, ChevronRight, Loader2, Play, Search, X, AlertCircle, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getIptvCategories, getIptvChannels } from "@/app/actions/iptv";
import { cn } from "@/lib/utils";

export function IptvView() {
  const { setActiveIptv, favoriteIptvChannels, toggleFavoriteIptvChannel } = useMediaStore();
  const [categories, setCategories] = useState<any[]>([]);
  const [channels, setChannels] = useState<IptvChannel[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIptvCategories();
      if (data && Array.isArray(data)) {
        setCategories(data);
      } else {
        throw new Error("Invalid response");
      }
    } catch (e) {
      setError("فشل الاتصال بمزود الخدمة عبر البروكسي.");
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async (catId: string) => {
    setLoading(true);
    setSelectedCat(catId);
    setError(null);
    try {
      const data = await getIptvChannels(catId);
      if (data && Array.isArray(data)) {
        setChannels(data);
      }
    } catch (e) {
      setError("فشل جلب القنوات لهذا القسم.");
    } finally {
      setLoading(false);
    }
  };

  const isStarred = (id: string) => favoriteIptvChannels.some(c => c.stream_id === id);

  // Fixed filtering logic with safety checks for undefined names
  const filteredChannels = channels.filter(c => 
    c.name && typeof c.name === 'string' && c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 pb-32 dir-rtl text-right">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black font-headline text-white tracking-tighter flex items-center gap-4">
            مركز البث المباشر <Tv className="w-10 h-10 text-emerald-500 animate-pulse" />
          </h1>
          <span className="text-[10px] text-white/40 font-bold uppercase tracking-[0.4em]">Extreme Cloud Proxy Hub</span>
        </div>
        
        <div className="flex items-center gap-4">
          {favoriteIptvChannels.length > 0 && !selectedCat && (
            <Button 
              variant="outline"
              onClick={() => { setChannels(favoriteIptvChannels); setSelectedCat("favorites"); }}
              className="rounded-full bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20 focusable"
            >
              <Star className="w-4 h-4 ml-2 fill-current" /> القنوات المفضلة
            </Button>
          )}
          {selectedCat && (
            <Button 
              variant="ghost" 
              onClick={() => { setSelectedCat(null); setChannels([]); setError(null); setSearch(""); }}
              className="rounded-full bg-white/5 border border-white/10 text-white focusable"
            >
              <X className="w-4 h-4 ml-2" /> العودة للقوائم
            </Button>
          )}
        </div>
      </header>

      {error && (
        <div className="bg-red-600/20 border border-red-500/40 p-6 rounded-[2rem] flex items-center gap-4 animate-in fade-in zoom-in-95">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <div className="flex-1">
            <h3 className="font-black text-white">خطأ في الاتصال</h3>
            <p className="text-white/60 text-sm">{error}</p>
          </div>
          <Button onClick={fetchCategories} variant="outline" className="rounded-full border-white/10 focusable">إعادة المحاولة</Button>
        </div>
      )}

      {!selectedCat ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in duration-700">
          {loading ? (
            <div className="col-span-full py-40 flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
              <span className="text-white/40 font-black uppercase tracking-widest">تحميل التصنيفات الآمنة...</span>
            </div>
          ) : categories.map((cat, idx) => (
            <Card 
              key={cat.category_id}
              onClick={() => fetchChannels(cat.category_id)}
              className="group bg-white/5 border-white/5 hover:bg-emerald-600/20 hover:border-emerald-500/40 transition-all duration-500 cursor-pointer focusable overflow-hidden relative"
              tabIndex={0}
              data-nav-id={`iptv-cat-${idx}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                    <List className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h3 className="font-black text-lg text-white truncate max-w-[180px]">{cat.category_name}</h3>
                </div>
                <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-emerald-500 transition-colors" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-6 duration-700">
          <div className="relative max-w-xl">
            <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20" />
            <Input 
              placeholder="ابحث عن قناة..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border-white/10 h-16 rounded-[1.5rem] pr-16 text-xl focusable text-right"
              data-nav-id="iptv-search"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {loading ? (
              <div className="col-span-full py-40 flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
              </div>
            ) : filteredChannels.map((ch, idx) => (
              <div 
                key={ch.stream_id}
                className="flex flex-col items-center gap-4 group relative"
              >
                <div 
                  onClick={() => setActiveIptv(ch)}
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2.5rem] bg-white/5 border-4 border-white/5 group-hover:border-emerald-500 group-focus:border-emerald-500 transition-all duration-500 cursor-pointer focusable outline-none overflow-hidden relative shadow-2xl"
                  tabIndex={0}
                  data-nav-id={`iptv-ch-${idx}`}
                >
                  {ch.stream_icon ? (
                    <img src={ch.stream_icon} alt="" className="w-full h-full object-cover group-hover:scale-115 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <Tv className="w-12 h-12 text-white/10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-all" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <div className="w-14 h-14 rounded-full bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.6)] flex items-center justify-center">
                      <Play className="w-7 h-7 text-white fill-current ml-1" />
                    </div>
                  </div>
                </div>
                
                {/* Star Toggle Button */}
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleFavoriteIptvChannel(ch); }}
                  className={cn(
                    "absolute top-2 right-2 w-10 h-10 rounded-full backdrop-blur-xl border border-white/10 flex items-center justify-center transition-all z-30 focusable",
                    isStarred(ch.stream_id) ? "bg-yellow-500 text-black opacity-100 shadow-glow" : "bg-black/60 text-white/40 hover:text-white opacity-0 group-hover:opacity-100 group-focus:opacity-100"
                  )}
                  tabIndex={0}
                >
                  <Star className={cn("w-5 h-5", isStarred(ch.stream_id) && "fill-current")} />
                </button>

                <span className="font-black text-sm text-white/70 group-hover:text-white text-center truncate w-full px-2">{ch.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
