"use client";

/**
 * «المركز» in DriveCast: the car / TV / phone side of DriveCast ⇄ Madar. One WebSocket to the server's hub
 * (studio worker, Durable Object): continue watching across places, send anything to Madar or another device,
 * Madar's scenes / notes / plan / summaries / timers here, and a remote for Madar's videos. The server prepares
 * the thumbnails, titles, islands and suggestions; this page only reports what it plays and draws what arrives.
 */
export const HUB = "https://studio.c-p.workers.dev/hub";

export type HubKind = "car" | "tv" | "phone" | "tablet" | "computer";
export interface HubDevice { id: string; name: string; kind: string; app: string; since?: number }
export interface HubItem { id: string; kind: "yt" | "iptv" | "video" | "360" | "web" | "article" | "scene"; title?: string; url?: string; t?: number; dur?: number; thumb?: string; channel?: string; at?: number; from?: HubDevice; name?: string; lines?: string[]; text?: string }
export interface HubState {
  resume?: Record<string, HubItem>; history?: HubItem[]; scenes?: { name: string; count: number; env?: string; media?: { url: string; title: string }[] }[];
  notes?: { id: string; text: string }[]; body?: { last?: Record<string, any>; prev?: Record<string, any> }; workouts?: any[]; plan?: { goal?: string; today?: string };
  islands?: { id: string; icon?: string; title: string; sub?: string; at?: number; until?: number; tint?: string }[];
  articles?: HubItem[]; briefs?: HubItem[]; ai?: { q: string; a: string; at?: number }[];
}
export const KIND_AR: Record<string, string> = { car: "السيارة", tv: "التلفاز", phone: "الهاتف", tablet: "التابلت", madar: "مدار", computer: "الكمبيوتر" };
export const fmtTime = (t = 0) => { t = Math.max(0, Math.round(t)); return (t >= 3600 ? Math.floor(t / 3600) + ":" + String(Math.floor(t / 60) % 60).padStart(2, "0") : Math.floor(t / 60)) + ":" + String(t % 60).padStart(2, "0"); };

type Listener = (e: any) => void;

function guessKind(): HubKind {
  if (typeof navigator === "undefined") return "phone";
  const ua = navigator.userAgent;
  if (/VIDAA|SmartTV|SMART-TV|Tizen|Web0S|HbbTV|AFT\w|BRAVIA/i.test(ua)) return "tv";
  if (location.pathname.startsWith("/car-dashboard")) return "car";
  if (/iPad|Tablet|SM-X|SM-T/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return "tablet";
  if (/Windows NT|Macintosh|X11/i.test(ua) && !/Mobile/i.test(ua)) return "computer";
  return "phone";
}
export function myDevice(): HubDevice {
  let d: any = null;
  try { d = JSON.parse(localStorage.getItem("dc.hubDevice") || "null"); } catch {}
  if (!d?.id) {
    const kind = guessKind();
    d = { id: "dc-" + Math.random().toString(36).slice(2, 10), name: "DriveCast · " + KIND_AR[kind], kind, app: "drivecast" };
    try { localStorage.setItem("dc.hubDevice", JSON.stringify(d)); } catch {}
  }
  return d;
}
export function setMyDevice(patch: Partial<HubDevice>) {
  const d = { ...myDevice(), ...patch };
  if (patch.kind && !patch.name) d.name = "DriveCast · " + (KIND_AR[patch.kind] || patch.kind);
  try { localStorage.setItem("dc.hubDevice", JSON.stringify(d)); } catch {}
  hub.reconnect();
}

class HubClient {
  state: HubState = {}; devices: HubDevice[] = []; ws: WebSocket | null = null;
  private listeners = new Set<Listener>(); private backoff = 2000; private retry: any; private ping: any; started = false;
  start() {
    if (this.started || typeof window === "undefined") return; this.started = true;
    this.connect();
    document.addEventListener("visibilitychange", () => { if (!document.hidden && (!this.ws || this.ws.readyState > 1)) this.connect(); });
  }
  reconnect() { if (this.started) this.connect(); }
  get me() { return myDevice(); }
  get online() { return this.ws?.readyState === 1; }
  others() { return this.devices.filter(d => d.id !== this.me.id); }
  madar() { return this.others().filter(d => d.app === "madar"); }
  on(fn: Listener) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private emit(e: any) { this.listeners.forEach(f => { try { f(e); } catch {} }); }
  private connect() {
    clearTimeout(this.retry);
    try { this.ws?.close(); } catch {}
    const me = this.me, q = new URLSearchParams({ id: me.id, name: me.name, kind: me.kind, app: "drivecast" });
    let ws: WebSocket;
    try { ws = new WebSocket(HUB.replace(/^http/, "ws") + "/ws?" + q); } catch { this.later(); return; }
    this.ws = ws;
    ws.onopen = () => { this.backoff = 2000; clearInterval(this.ping); this.ping = setInterval(() => this.send({ op: "ping" }), 50000); };
    ws.onclose = () => { clearInterval(this.ping); if (this.ws === ws) this.later(); };
    ws.onmessage = e => { let d: any; try { d = JSON.parse(e.data); } catch { return; } this.onMessage(d); };
  }
  private later() { this.retry = setTimeout(() => this.connect(), this.backoff); this.backoff = Math.min(60000, this.backoff * 2); }
  send(o: any) { if (this.ws?.readyState === 1) { this.ws.send(JSON.stringify(o)); return true; } return false; }
  op(o: any) { if (!this.send(o)) fetch(HUB + "/op", { method: "POST", body: JSON.stringify(o) }).catch(() => {}); }
  private onMessage(d: any) {
    if (d.type === "hello") { this.state = d.state || {}; this.devices = d.devices || []; }
    if (d.type === "devices") this.devices = d.devices || [];
    if (d.type === "set") (this.state as any)[d.key] = d.value;
    if (d.type === "resume") { const r = (this.state.resume ||= {}); if (d.item.done) delete r[d.item.id]; else r[d.item.id] = d.item; }
    this.emit(d);
  }
  sendTo(to: string, msg: any) { this.op({ op: "send", to, msg }); }
  resume(item: HubItem) { this.send({ op: "resume", item }); }
  stat(item: HubItem, minutes: number, place: "car" | "room") { this.send({ op: "stat", item, minutes, place }); }
  push(key: string, item: any, max?: number) { this.op({ op: "push", key, item, max }); }
}
export const hub = new HubClient();
