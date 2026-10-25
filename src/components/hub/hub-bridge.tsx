"use client";

/**
 * «المركز» on every DriveCast screen: reports what plays (where you stopped + watching time), receives what Madar or
 * another device sends (open a video / channel, play-pause, next…), offers «continue from Madar», shows Madar's live
 * islands (timers, today's workout) and lets you send what plays here to Madar or another screen with one tap.
 * Draws a small floating pill only when there is something to show.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMediaStore } from "@/lib/store";
import { getYoutubeTime } from "@/components/media/youtube-background-bridge";
import { hub, HubItem, KIND_AR, fmtTime } from "@/lib/hub";

export function openHubItem(it: HubItem) {
  const s = useMediaStore.getState();
  if (it.kind === "yt") {
    if (it.t && it.t > 5) s.updateVideoProgress(it.id, it.t);
    s.setActiveVideo({ id: it.id, title: it.title || "", description: "", thumbnail: it.thumb || `https://i.ytimg.com/vi/${it.id}/hqdefault.jpg`, publishedAt: "" } as any);
  } else if (it.kind === "iptv" || it.kind === "video" || it.kind === "360") {
    s.setActiveIptv({ name: it.title || "بث", stream_id: "hub-" + (it.url || it.id).slice(-40), stream_icon: it.thumb || "", category_id: "hub", url: it.url || it.id, type: "iptv" } as any);
  } else if (it.kind === "article" && it.url) listenArticle(it.url, it.title);
  else if (it.kind === "web" && (it.mode === "listen" || it.mode === "read") && it.url) listenArticle(it.url, it.title);
  else if (it.kind === "web" && it.mode === "summary" && it.url) {
    fetch("https://studio.c-p.workers.dev/summarize", { method: "POST", body: JSON.stringify({ url: it.url }) }).then(r => r.json()).then(r => { if (r.ok) speakAll([r.title, ...(r.points || [])]); }).catch(() => {});
  }
  else if (it.kind === "map") {
    const dest = it.lat != null ? `${it.lat},${it.lon}` : encodeURIComponent(it.title || it.url || "");
    if (it.mode === "save" || (!it.lat && it.url && it.mode !== "nav")) window.open(it.url || `https://www.google.com/maps?q=${dest}`, "_blank");
    else window.location.href = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
  }
  else if (it.kind === "text") { if (it.mode === "speak") speakAll([it.text || it.title || ""]); }
  else if (it.url) window.open(it.url, "_blank");
}

// articles saved in Madar, read aloud in the car (the server extracts the text; the phone's voice reads it)
export async function listenArticle(url: string, title?: string) {
  try {
    speechSynthesis.cancel();
    const r = await (await fetch("https://studio.c-p.workers.dev/read?url=" + encodeURIComponent(url))).json();
    const parts = [title || r.title, ...(r.blocks || []).map((b: any) => b.text)].filter(Boolean);
    speakAll(parts);
  } catch {}
}
export function speakAll(parts: string[]) {
  try {
    speechSynthesis.cancel();
    const v = speechSynthesis.getVoices().find(x => /^ar/i.test(x.lang));
    for (const p of parts) for (const chunk of String(p).match(/[^.!؟?\n]{1,220}[.!؟?\n]?/g) || []) { const u = new SpeechSynthesisUtterance(chunk); u.lang = "ar-SA"; if (v) u.voice = v; speechSynthesis.speak(u); }
  } catch {}
}

function playingItem(): HubItem | null {
  const s = useMediaStore.getState();
  if (s.activeVideo) {
    const v = s.activeVideo;
    return { id: v.id, kind: "yt", title: v.title, thumb: v.thumbnail, t: Math.round(getYoutubeTime(v.id) || s.videoProgress?.[v.id] || 0) };
  }
  if (s.activeIptv?.url) return { id: s.activeIptv.url, kind: "iptv", url: s.activeIptv.url, title: s.activeIptv.name, thumb: s.activeIptv.stream_icon };
  return null;
}
export function sendPlayingTo(deviceId: string) {
  const it = playingItem(); if (!it) return false;
  hub.sendTo(deviceId, { type: "open", item: it, now: true });
  return true;
}

export function HubBridge() {
  const router = useRouter();
  const [, force] = useState(0);
  const [offer, setOffer] = useState<HubItem | null>(null);
  const [incoming, setIncoming] = useState<{ item: HubItem; from: string } | null>(null);
  const [menu, setMenu] = useState(false);
  const greeted = useRef(false);

  useEffect(() => {
    hub.start();
    const off = hub.on((d: any) => {
      force(x => x + 1);
      if (d.type === "hello" && !greeted.current) {
        greeted.current = true;
        const r = Object.values(hub.state.resume || {}).filter(x => x.from?.id !== hub.me.id && Date.now() - (x.at || 0) < 12 * 3600e3).sort((a, b) => (b.at || 0) - (a.at || 0))[0];
        if (r) setOffer(r);
      }
      if (d.type === "msg") {
        const m = d.msg || {}, s = useMediaStore.getState(), who = d.from?.name || KIND_AR[d.from?.kind] || "جهاز";
        if (m.type === "open" && m.item) { if (m.now) openHubItem(m.item); else setIncoming({ item: m.item, from: who }); }
        else if (m.type === "control") {
          if (m.action === "toggle" || m.action === "play" || m.action === "pause") s.setIsPlaying(m.action === "play" ? true : m.action === "pause" ? false : !s.isPlaying);
          else if (m.action === "next") (s.activeIptv ? s.nextIptvChannel() : s.nextTrack());
          else if (m.action === "prev") (s.activeIptv ? s.prevIptvChannel() : s.prevTrack());
          else if (m.action === "back" && s.activeVideo) { const t = getYoutubeTime(s.activeVideo.id) || 0; s.updateVideoProgress(s.activeVideo.id, Math.max(0, t - 10)); }
        }
        else if (m.type === "ping") { try { const a = new AudioContext(), o = a.createOscillator(); o.frequency.value = 880; o.connect(a.destination); o.start(); o.stop(a.currentTime + 0.6); } catch {} setIncoming({ item: { id: "t", kind: "web", title: "🔔 " + who + " يبحث عن هذا الجهاز" }, from: who }); }
        else if (m.type === "say" && m.text) { speakAll([String(m.text)]); setIncoming({ item: { id: "t", kind: "web", title: "💬 " + String(m.text) }, from: who }); }
        else if (m.type === "sleep" && m.minutes > 0) { clearTimeout((window as any).__dcSleep); (window as any).__dcSleep = setTimeout(() => useMediaStore.getState().setIsPlaying(false), m.minutes * 60000); setIncoming({ item: { id: "t", kind: "web", title: "😴 يتوقف بعد " + m.minutes + " دقيقة" }, from: who }); }
        else if (m.type === "toast") setIncoming({ item: { id: "t", kind: "web", title: String(m.text || "") }, from: who });
      }
    });
    // what plays here: every 15 s (only while the page is visible and something plays)
    const timer = setInterval(() => {
      const s = useMediaStore.getState(); if (!s.isPlaying || document.hidden) return;
      const it = playingItem(); if (!it) return;
      if (it.kind !== "iptv" && (it.t || 0) < 20) return;
      hub.resume(it); hub.stat(it, 0.25, hub.me.kind === "car" ? "car" : "room");
    }, 15000);
    return () => { off(); clearInterval(timer); };
  }, []);

  // pills disappear on their own: «تابع» after 2 minutes, incoming notices after 30 s
  useEffect(() => { if (!offer) return; const t = setTimeout(() => setOffer(null), 120000); return () => clearTimeout(t); }, [offer]);
  useEffect(() => { if (!incoming) return; const t = setTimeout(() => setIncoming(null), incoming.item.id === "t" ? 15000 : 60000); return () => clearTimeout(t); }, [incoming]);

  const now = Date.now();
  const islands = (hub.state.islands || []).filter(i => !i.until || i.until > now);
  const madar = hub.madar(), others = hub.others(), playing = !!playingItem();
  if (!offer && !incoming && !islands.length && !(playing && others.length)) return null;

  const pill = "pointer-events-auto flex items-center gap-2 rounded-full bg-zinc-900/90 border border-white/10 px-4 py-2 text-white text-sm font-bold shadow-2xl backdrop-blur";
  return (
    <>
    <div dir="rtl" className="fixed top-3 left-1/2 -translate-x-1/2 z-[100002] flex flex-col items-center gap-2 pointer-events-none">
      {offer && (
        <div className={pill}>
          {offer.thumb && <img src={offer.thumb} alt="" className="w-12 h-7 rounded object-cover" />}
          <span className="max-w-[46vw] truncate">▶ تابع من {offer.from?.name || "مدار"}: {offer.title} · {fmtTime(offer.t)}</span>
          <button className="rounded-full bg-rose-600 px-3 py-1" onClick={() => { openHubItem(offer); setOffer(null); }}>أكمل</button>
          <button className="opacity-60 px-1" onClick={() => setOffer(null)}>✕</button>
        </div>
      )}
      {incoming && (
        <div className={pill}>
          <span className="max-w-[56vw] truncate">📥 من {incoming.from}: {incoming.item.title}</span>
          {incoming.item.id !== "t" && <button className="rounded-full bg-sky-600 px-3 py-1" onClick={() => { openHubItem(incoming.item); setIncoming(null); }}>افتح</button>}
          <button className="opacity-60 px-1" onClick={() => setIncoming(null)}>✕</button>
        </div>
      )}
      {islands.map(i => (
        <div key={i.id} className={pill} style={{ background: (i.tint || "#27272a") + "e6" }}>
          <span>{i.icon || "🔔"} {i.title}</span>
          {i.at && <span className="tabular-nums opacity-90">{fmtTime(Math.max(0, (i.at - now) / 1000))}</span>}
        </div>
      ))}
    </div>
    {playing && others.length > 0 && (
      <div dir="rtl" className="fixed bottom-28 left-3 z-[100002]">
        <div className="pointer-events-auto relative">
          <button className={pill} onClick={() => setMenu(!menu)}>📤 {madar.length ? "إلى مدار" : "أرسل"}</button>
          {menu && (
            <div className="absolute bottom-full mb-2 left-0 rounded-2xl bg-zinc-900/95 border border-white/10 p-2 min-w-[12rem]">
              {others.map(d => (
                <button key={d.id} className="block w-full text-right rounded-xl px-3 py-2 text-white hover:bg-white/10" onClick={() => { sendPlayingTo(d.id); setMenu(false); }}>{d.app === "madar" ? "🥽 " : "📺 "}{d.name}</button>
              ))}
              <button className="block w-full text-right rounded-xl px-3 py-2 text-white/70 hover:bg-white/10" onClick={() => { setMenu(false); router.push("/hub"); }}>المركز…</button>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}
