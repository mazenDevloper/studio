"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Play, Search, Tv, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { HlsVideo } from "@/components/iptv/hls-video";
import { IptvSource, LoadResult, loadSource } from "@/lib/m3u-loader";
import { M3uChannel } from "@/lib/m3u";
import { cn } from "@/lib/utils";

interface M3uPlayerPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional URL to pre-fill the input with. */
  initialUrl?: string;
  /**
   * Source-loader mode: when given, the loaded channels are handed to the caller
   * (e.g. the IPTV screen + global player) and the dialog closes instead of playing inline.
   */
  onLoad?: (result: LoadResult, source: IptvSource) => void;
}

/**
 * M3uPlayerPopup - load m3u8 streams, m3u playlists and Xtream Codes.
 * Standalone mode plays inline; with `onLoad` it only loads the source.
 */
export function M3uPlayerPopup({ open, onOpenChange, initialUrl, onLoad }: M3uPlayerPopupProps) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [xt, setXt] = useState({ host: "", username: "", password: "" });
  const [channels, setChannels] = useState<M3uChannel[]>([]);
  const [current, setCurrent] = useState<{ name: string; url: string } | null>(null);
  const [group, setGroup] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (open && initialUrl) setUrl(initialUrl); }, [open, initialUrl]);

  const load = async (source: IptvSource) => {
    setError(""); setLoading(true); setChannels([]); setCurrent(null); setGroup("all");
    try {
      const res = await loadSource(source);
      if (onLoad) { onLoad(res, source); onOpenChange(false); return; }
      if (res.single) setCurrent({ name: res.channels[0].name, url: res.channels[0].url });
      else setChannels(res.channels);
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const groups = useMemo(() => ["all", ...Array.from(new Set(channels.map(c => c.group).filter(Boolean) as string[]))], [channels]);
  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return channels.filter(c => (group === "all" || c.group === group) && (!q || c.name.toLowerCase().includes(q))).slice(0, 500);
  }, [channels, group, search]);

  const mixedContent = typeof window !== "undefined" && window.location.protocol === "https:" && current?.url.startsWith("http:");
  const showPlayer = !onLoad;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] overflow-y-auto bg-black/95 border-white/10 text-white p-4 sm:p-6 gap-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Tv className="w-5 h-5 text-emerald-500" /> M3U / HLS / Xtream</DialogTitle>
          <DialogDescription className="text-white/50">m3u8 stream · m3u playlist · Xtream Codes</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="url" onValueChange={() => setError("")}>
          <TabsList className="bg-white/5">
            <TabsTrigger value="url">URL (m3u8 / m3u)</TabsTrigger>
            <TabsTrigger value="xtream">Xtream</TabsTrigger>
          </TabsList>
          <TabsContent value="url" className="flex gap-2">
            <Input dir="ltr" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && load({ kind: "url", url })}
              placeholder="https://example.com/live.m3u8  or  playlist.m3u  or  get.php?username=..&password=.." className="bg-white/5 border-white/10" />
            <Button onClick={() => load({ kind: "url", url })} disabled={loading} className="bg-emerald-500 text-black hover:bg-emerald-400">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            </Button>
          </TabsContent>
          <TabsContent value="xtream" className="flex flex-wrap gap-2">
            <Input dir="ltr" value={xt.host} onChange={e => setXt({ ...xt, host: e.target.value })} placeholder="http://host:port" className="bg-white/5 border-white/10 flex-1 min-w-[180px]" />
            <Input dir="ltr" value={xt.username} onChange={e => setXt({ ...xt, username: e.target.value })} placeholder="username" className="bg-white/5 border-white/10 w-36" />
            <Input dir="ltr" type="password" value={xt.password} onChange={e => setXt({ ...xt, password: e.target.value })} placeholder="password" className="bg-white/5 border-white/10 w-36" />
            <Button onClick={() => load({ kind: "xtream", ...xt })} disabled={loading} className="bg-emerald-500 text-black hover:bg-emerald-400">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            </Button>
          </TabsContent>
        </Tabs>

        {error && <div className="flex items-center gap-2 text-sm text-red-400"><AlertTriangle className="w-4 h-4" />{error}</div>}
        {mixedContent && <div className="text-xs text-yellow-400">البث http داخل صفحة https قد يحجبه المتصفح / http stream on an https page may be blocked.</div>}

        {showPlayer && (
          <div className={cn("grid gap-3", channels.length ? "md:grid-cols-[1fr_300px]" : "grid-cols-1")}>
            <div className="aspect-video bg-black rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
              {current
                ? <HlsVideo key={current.url} src={current.url} onError={setError} />
                : <span className="text-white/30 text-sm">{channels.length ? "اختر قناة / Pick a channel" : "أدخل رابطا للتشغيل / Enter a URL to play"}</span>}
            </div>

            {channels.length > 0 && (
              <div className="flex flex-col gap-2 min-h-0" style={{ maxHeight: 360 }}>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2 top-2.5 text-white/40" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" className="pl-8 bg-white/5 border-white/10" />
                </div>
                <select value={group} onChange={e => setGroup(e.target.value)} className="bg-white/5 border border-white/10 rounded-md h-9 px-2 text-sm">
                  {groups.map(g => <option key={g} value={g} className="bg-black">{g === "all" ? "All" : g}</option>)}
                </select>
                <div className="overflow-y-auto space-y-1 pr-1">
                  {visible.map(c => (
                    <button key={c.id} onClick={() => { setError(""); setCurrent({ name: c.name, url: c.url }); }}
                      className={cn("w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm hover:bg-white/10", current?.url === c.url && "bg-emerald-500/20")}>
                      {c.logo ? <img src={c.logo} alt="" loading="lazy" className="w-7 h-7 object-contain rounded" onError={e => (e.currentTarget.style.display = "none")} /> : <Tv className="w-5 h-5 text-white/30" />}
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                  {!visible.length && <p className="text-xs text-white/40 p-2">No results</p>}
                </div>
                <p className="text-[10px] text-white/30">{channels.length} channels</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
