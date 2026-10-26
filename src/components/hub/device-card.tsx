"use client";

/**
 * One place in «المركز», drawn as the device itself: a TV on its stand, a car dashboard, Madar's headset (both
 * lenses), a phone, a tablet or a laptop. Inside its screen: the cover of what it last played, big title over the
 * cover, the progress bar of that screen and a «live» badge; below it the device's name, state and actions.
 */
import { ReactNode } from "react";
import { HubItem, fmtTime } from "@/lib/hub";

export type DevKind = "tv" | "car" | "madar" | "phone" | "tablet" | "computer";
export const devKind = (d: any): DevKind => d?.app === "madar" ? "madar" : (["tv", "car", "phone", "tablet", "computer"].includes(d?.kind) ? d.kind : "phone");
const NAME: Record<DevKind, string> = { tv: "التلفاز", car: "السيارة", madar: "مدار", phone: "الهاتف", tablet: "التابلت", computer: "الكمبيوتر" };
const TINT: Record<DevKind, string> = { tv: "#38bdf8", car: "#f59e0b", madar: "#a78bfa", phone: "#34d399", tablet: "#f472b6", computer: "#60a5fa" };

function Screen({ it, kind, playing, round = "rounded-xl" }: { it?: HubItem; kind: DevKind; playing: boolean; round?: string }) {
  const pct = it?.dur ? Math.min(100, Math.max(0, ((it.t || 0) / it.dur) * 100)) : null;
  return (
    <div className={"relative w-full h-full overflow-hidden bg-zinc-950 " + round}>
      {it?.thumb ? <img src={it.thumb} alt="" className="absolute inset-0 w-full h-full object-cover" /> : (
        <div className="absolute inset-0 grid place-items-center" style={{ background: `radial-gradient(circle at 50% 40%, ${TINT[kind]}33, transparent 70%)` }}>
          <span className="text-white/30 text-sm font-bold">{it ? "▶" : "لا شيء بعد"}</span>
        </div>
      )}
      {/* the title on the cover */}
      {it && <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" />}
      {it && (
        <div className="absolute inset-x-0 bottom-0 p-3 pb-4">
          {it.channel && <div className="text-[11px] font-bold text-white/70 truncate">{it.channel}</div>}
          <div className="text-[15px] md:text-base font-black leading-snug text-white line-clamp-2 drop-shadow">{it.title || it.id}</div>
          {pct != null && <div className="mt-1 text-[10px] text-white/70 tabular-nums" dir="ltr">{fmtTime(it.t)} / {fmtTime(it.dur)}</div>}
        </div>
      )}
      {/* this screen's progress */}
      {pct != null && (
        <div className="absolute inset-x-0 bottom-0 h-[5px] bg-white/15">
          <div className="h-full rounded-r-full" style={{ width: pct + "%", background: TINT[kind], boxShadow: `0 0 10px ${TINT[kind]}` }} />
        </div>
      )}
      {playing && <span className="absolute top-2 right-2 text-[10px] font-black rounded-full bg-rose-600 px-2 py-0.5 shadow-lg animate-pulse">● مباشر الآن</span>}
    </div>
  );
}

/** the device's body around its screen */
function Body({ kind, children }: { kind: DevKind; children: ReactNode }) {
  if (kind === "tv") return (
    <div className="w-full">
      <div className="rounded-2xl bg-zinc-900 p-[6px] ring-1 ring-white/10 shadow-[0_20px_60px_-20px_rgba(56,189,248,.45)]"><div className="aspect-video">{children}</div></div>
      <div className="mx-auto h-3 w-16 bg-gradient-to-b from-zinc-700 to-zinc-800" /><div className="mx-auto h-1.5 w-40 rounded-full bg-zinc-700" />
    </div>
  );
  if (kind === "car") return (
    <div className="w-full mb-10 rounded-[2rem] bg-gradient-to-b from-zinc-800 to-zinc-950 p-3 pb-6 ring-1 ring-white/10 relative shadow-[0_20px_60px_-20px_rgba(245,158,11,.45)]">
      <div className="aspect-[16/8] rounded-2xl ring-2 ring-black/60">{children}</div>
      <div className="absolute -bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-20 h-20 rounded-full border-[6px] border-zinc-700 bg-zinc-900/90 grid place-items-center text-xs text-white/40">◎</div>
    </div>
  );
  if (kind === "madar") return (
    <div className="w-full rounded-[2.5rem] bg-gradient-to-b from-zinc-800 to-zinc-950 p-3 ring-1 ring-white/10 shadow-[0_20px_60px_-20px_rgba(167,139,250,.55)]">
      <div className="grid grid-cols-2 gap-2 aspect-[16/7]">
        <div className="rounded-[45%_45%_40%_40%/55%_55%_45%_45%] overflow-hidden">{children}</div>
        <div className="rounded-[45%_45%_40%_40%/55%_55%_45%_45%] overflow-hidden">{children}</div>
      </div>
    </div>
  );
  if (kind === "computer") return (
    <div className="w-full">
      <div className="rounded-t-2xl bg-zinc-900 p-[6px] pb-2 ring-1 ring-white/10"><div className="aspect-[16/10]">{children}</div></div>
      <div className="h-3 rounded-b-xl bg-gradient-to-b from-zinc-600 to-zinc-800 mx-[-4%]" />
    </div>
  );
  if (kind === "tablet") return (
    <div className="w-full rounded-[1.6rem] bg-zinc-900 p-[10px] ring-1 ring-white/10 shadow-[0_20px_60px_-20px_rgba(244,114,182,.45)]"><div className="aspect-[4/3]">{children}</div></div>
  );
  // phone, landscape: rounded body, island
  return (
    <div className="w-full rounded-[2rem] bg-zinc-900 p-[8px] ring-1 ring-white/10 relative shadow-[0_20px_60px_-20px_rgba(52,211,153,.45)]">
      <div className="aspect-[19.5/9] relative">{children}<div className="absolute top-1/2 -translate-y-1/2 left-2 w-2.5 h-10 rounded-full bg-black/90" /></div>
    </div>
  );
}

// the brand of each device (logos you chose), picked from a list on its card
export const BRANDS: Record<string, { name: string; logo: string }> = {
  lexus: { name: "Lexus", logo: "https://imgs.search.brave.com/KyBBrmlyi50yjbxozuwJ1QCJd7fXu3Wrg6Bw2LrlTNw/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJzLmNvbS9p/bWFnZXMvdGh1bWJu/YWlsL3NsZWVrLWdy/ZXktbGV4dXMtbG9n/by00a3FwMnNyempx/eXhiMDA5LmpwZw" },
  hisense: { name: "Hisense", logo: "https://imgs.search.brave.com/MZy6CoXY4z_ALjQVKw5BaCaU2-cxozp4yam-9acwlic/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9sb2dv/ZGl4LmNvbS9sb2dv/Lzg3MTA0Ny5qcGc" },
  apple: { name: "iPhone", logo: "https://imgs.search.brave.com/5eu0HDdbkuz1eNjSGZLFXuJcWr2rq4YbqqzIHg88z7Y/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly96b25h/bG9nby5jb20vYXNz/ZXRzL2FwcGxlLWxv/Z28tcG5nLXN2Zy53/ZWJwP2Fzc2V0PTI2/NDE" },
  samsung: { name: "Samsung", logo: "https://imgs.search.brave.com/dnb11dGVJ1GzkjOIUGTvxyggq7pEQVGyWqlPgwf0qxg/rs:fit:0:180:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy85/LzljL1NhbXN1bmdf/bG9nb193b3JkbWFy/ay5zdmc" },
};
const DEFAULT_BRAND: Partial<Record<DevKind, string>> = { car: "lexus", tv: "hisense", phone: "apple", tablet: "samsung" };

export function DeviceCard({ dev, it, online, playing, actions, onOpen, brand, onBrand }: { dev: any; it?: HubItem; online: boolean; playing: boolean; actions?: ReactNode; onOpen?: () => void; brand?: string; onBrand?: (b: string) => void }) {
  const kind = devKind(dev);
  const round = kind === "madar" ? "rounded-none" : kind === "car" ? "rounded-2xl" : "rounded-xl";
  return (
    <div className="group rounded-[2rem] bg-white/[0.04] border border-white/10 p-4 backdrop-blur-xl hover:bg-white/[0.07] transition-colors">
      <button className="block w-full text-right" onClick={onOpen} disabled={!it}>
        <Body kind={kind}><Screen it={it} kind={kind} playing={playing} round={round} /></Body>
      </button>
      <div className="mt-5 flex items-center gap-2">
        {(() => { const b = BRANDS[brand ?? DEFAULT_BRAND[kind] ?? ""]; return b ? <img src={b.logo} alt={b.name} className="h-8 w-8 rounded-xl object-contain bg-white/90 p-1 shadow" /> : null; })()}
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: online ? TINT[kind] : "#52525b", boxShadow: online ? `0 0 10px ${TINT[kind]}` : "none" }} />
        <span className="font-black truncate">{dev.name}</span>
        <span className="text-[11px] text-white/45">{NAME[kind]} · {playing ? "يعرض الآن" : online ? "متصل" : "غير متصل"}</span>
      </div>
      {actions && <div className="mt-3 flex flex-wrap gap-1.5">{actions}</div>}
      {onBrand && (
        <select value={brand ?? DEFAULT_BRAND[kind] ?? ""} onChange={e => onBrand(e.target.value)}
          className="mt-3 w-full appearance-none rounded-2xl bg-white/[0.06] border border-white/10 px-4 py-2.5 text-sm font-bold text-white/80 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-white/20">
          {Object.entries(BRANDS).map(([k, b]) => <option key={k} value={k} className="bg-zinc-900">{b.name}</option>)}
          <option value="" className="bg-zinc-900">أخرى (بلا شعار)</option>
        </select>
      )}
    </div>
  );
}

export const act = "text-xs font-bold rounded-full px-3 py-1.5 bg-white/10 hover:bg-white/20 transition-colors";
