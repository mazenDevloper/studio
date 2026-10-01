"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import { Loader2, Play, Search, Tv, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fetchPlaylistText, fetchXtreamLive } from "@/app/actions/m3u";
import { M3uChannel, XtreamCreds, isHlsManifest, parseM3u, xtreamFromUrl, xtreamLiveUrl } from "@/lib/m3u";
import { cn } from "@/lib/utils";

/** Video element wired to hls.js (native HLS on Safari). */
function HlsVideo({ src, onError }: { src: string; onError: (msg: string) => void }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;
    let hls: Hls | null = null;
    const isHls = /\.m3u8?(\?|$)/i.test(src) || src.includes("m3u8");

    if (isHls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls?.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls?.recoverMediaError();
        else onError("تعذر تشغيل البث / Stream failed to play");
      });
    } else {
      video.src = src;
      video.play().catch(() => {});
    }
    return () => {
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [src, onError]);

  return <video ref={ref} controls autoPlay playsInline className="w-full h-full bg-black" />;
}

interface M3uPlayerPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional URL to load immediately when opened. */
  initialUrl?: string;
}

/**
 * M3uPlayerPopup - popup player for m3u8 streams, m3u playlists and Xtream Codes.
 */
export function M3uPlayerPopup({ open, onOpenChange, initialUrl }: M3uPlayerPopupProps) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [xt, setXt] = useState({ host: "", username: "", password: "" });
  const [channels, setChannels] = useState<M3uChannel[]>([]);
  const [xtCreds, setXtCreds] = useState<XtreamCreds | null>(null);
  const [current, setCurrent] = useState<{ name: string; url: string } | null>(null);
  const [group, setGroup] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadXtream = async (c: XtreamCreds) => {
    const res = await fetchXtreamLive(c.host, c.username, c.password);
    if (!res.ok) throw new Error(res.error);
    setXtCreds(c);
    setChannels(res.channels.map(ch => ({ ...ch, url: "" })));
  };

  const load = async (tab: "url" | "xtream") => {
    setError(""); setLoading(true); setChannels([]); setCurrent(null); setXtCreds(null); setGroup("all");
    try {
      if (tab === "xtream") {
        if (!xt.host || !xt.username || !xt.password) throw new Error("أكمل بيانات Xtream");
        const host = /^https?:\/\//i.test(xt.host) ? xt.host : `http://${xt.host}`;
        await loadXtream({ host, username: xt.username, password: xt.password });
        return;
      }
      const input = url.trim();
      if (!/^https?:\/\//i.test(input)) throw new Error("أدخل رابطا صحيحا يبدأ بـ http(s)");

      // Xtream-style URLs (get.php / player_api.php / /live/user/pass/id)
      const creds = xtreamFromUrl(input);
      if (creds && !/\/live\/[^/]+\/[^/]+\/\d+/.test(input)) {
        try { await loadXtream(creds); return; } catch { /* fall back to plain m3u */ }
      }
      // A direct live link: play right away
      if (/\/live\/[^/]+\/[^/]+\/\d+/.test(input)) {
        setCurrent({ name: "Live", url: input.endsWith(".m3u8") || input.includes(".") ? input : `${input}.m3u8` });
        return;
      }

      const res = await fetchPlaylistText(input);
      if (!res.ok) {
        // Server could not read it (e.g. geo/IP blocked): try playing directly in the browser.
        if (/\.m3u8?(\?|$)/i.test(input)) { setCurrent({ name: "Stream", url: input }); return; }
        throw new Error(res.error);
      }
      if (isHlsManifest(res.text)) { setCurrent({ name: "Stream", url: input }); return; }
      const list = parseM3u(res.text);
      if (!list.length) throw new Error("لم يتم العثور على قنوات / No channels found");
      setChannels(list);
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && initialUrl) { setUrl(initialUrl); }
  }, [open, initialUrl]);

  const groups = useMemo(() => ["all", ...Array.from(new Set(channels.map(c => c.group).filter(Boolean) as string[]))], [channels]);
  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return channels
      .filter(c => (group === "all" || c.group === group) && (!q || c.name.toLowerCase().includes(q)))
      .slice(0, 500);
  }, [channels, group, search]);

  const play = (c: M3uChannel) => {
    setError("");
    setCurrent({ name: c.name, url: xtCreds ? xtreamLiveUrl(xtCreds, c.id) : c.url });
  };

  const mixedContent = typeof window !== "undefined" && window.location.protocol === "https:" && current?.url.startsWith("http:");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] bg-black/95 border-white/10 text-white p-4 sm:p-6 gap-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Tv className="w-5 h-5 text-emerald-500" /> M3U / HLS / Xtream Player</DialogTitle>
          <DialogDescription className="text-white/50">m3u8 stream · m3u playlist · Xtream Codes</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="url" onValueChange={() => setError("")}>
          <TabsList className="bg-white/5">
            <TabsTrigger value="url">URL (m3u8 / m3u)</TabsTrigger>
            <TabsTrigger value="xtream">Xtream</TabsTrigger>
          </TabsList>
          <TabsContent value="url" className="flex gap-2">
            <Input dir="ltr" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && load("url")}
              placeholder="https://example.com/live.m3u8  or  playlist.m3u  or  get.php?username=..&password=.." className="bg-white/5 border-white/10" />
            <Button onClick={() => load("url")} disabled={loading} className="bg-emerald-500 text-black hover:bg-emerald-400">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            </Button>
          </TabsContent>
          <TabsContent value="xtream" className="flex flex-wrap gap-2">
            <Input dir="ltr" value={xt.host} onChange={e => setXt({ ...xt, host: e.target.value })} placeholder="http://host:port" className="bg-white/5 border-white/10 flex-1 min-w-[180px]" />
            <Input dir="ltr" value={xt.username} onChange={e => setXt({ ...xt, username: e.target.value })} placeholder="username" className="bg-white/5 border-white/10 w-36" />
            <Input dir="ltr" type="password" value={xt.password} onChange={e => setXt({ ...xt, password: e.target.value })} placeholder="password" className="bg-white/5 border-white/10 w-36" />
            <Button onClick={() => load("xtream")} disabled={loading} className="bg-emerald-500 text-black hover:bg-emerald-400">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            </Button>
          </TabsContent>
        </Tabs>

        {error && <div className="flex items-center gap-2 text-sm text-red-400"><AlertTriangle className="w-4 h-4" />{error}</div>}
        {mixedContent && <div className="text-xs text-yellow-400">البث http داخل صفحة https قد يحجبه المتصفح / http stream on an https page may be blocked.</div>}

        <div className={cn("grid gap-3", channels.length ? "md:grid-cols-[1fr_300px]" : "grid-cols-1")}>
          <div className="aspect-video bg-black rounded-xl overflow-hidden border border-white/10 flex items-center justify-center">
            {current
              ? <HlsVideo key={current.url} src={current.url} onError={setError} />
              : <span className="text-white/30 text-sm">{channels.length ? "اختر قناة / Pick a channel" : "أدخل رابطا للتشغيل / Enter a URL to play"}</span>}
          </div>

          {channels.length > 0 && (
            <div className="flex flex-col gap-2 min-h-0 md:max-h-[calc(95vw*0.5)]" style={{ maxHeight: 360 }}>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2 top-2.5 text-white/40" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" className="pl-8 bg-white/5 border-white/10" />
              </div>
              <select value={group} onChange={e => setGroup(e.target.value)} className="bg-white/5 border border-white/10 rounded-md h-9 px-2 text-sm">
                {groups.map(g => <option key={g} value={g} className="bg-black">{g === "all" ? "All" : g}</option>)}
              </select>
              <div className="overflow-y-auto space-y-1 pr-1">
                {visible.map(c => (
                  <button key={c.id} onClick={() => play(c)}
                    className={cn("w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm hover:bg-white/10",
                      current?.name === c.name && "bg-emerald-500/20")}>
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
      </DialogContent>
    </Dialog>
  );
}
