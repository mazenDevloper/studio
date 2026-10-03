"use client";

import { useState } from "react";
import { Plus, X, RotateCcw, Check, ChevronUp } from "lucide-react";
import { useMediaStore } from "@/lib/store";
import { defaultLeagueChannels, findLeagueOverride, leagueKey } from "@/lib/match-channels";
import type { TopMatch } from "@/lib/match-core";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { IptvChannelSelect } from "@/components/iptv/iptv-channel-select";

/**
 * Edit / add the default channels of a league: they are shown first on every match card of that league (and
 * replace the built-in rights holder). Saved in the cloud with the other match settings.
 */
export function LeagueChannelsEditor({ league, onClose }: { league: TopMatch["league"]; onClose: () => void }) {
  // edit the entry this league already uses (it may have been added by hand in the settings)
  const overrides = useMediaStore(s => s.leagueChannelOverrides);
  const found = findLeagueOverride(overrides, league);
  const key = found?.[0] ?? leagueKey(league);
  const saved = found?.[1];
  const setLeagueChannels = useMediaStore(s => s.setLeagueChannels);
  const defaults = defaultLeagueChannels(league);
  const [list, setList] = useState<string[]>(saved ?? defaults);
  const [picking, setPicking] = useState(false);

  const addName = (n: string) => {
    n = n.trim();
    if (n && !list.some(c => c.toLowerCase() === n.toLowerCase())) setList(l => [...l, n]);
  };
  const up = (i: number) => { if (i <= 0) return; const l = [...list]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; setList(l); };
  const save = () => { setLeagueChannels(key, list); onClose(); };
  const reset = () => { setLeagueChannels(key, null); onClose(); };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-zinc-950 text-white border-white/10 rounded-[2rem]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right font-black leading-relaxed">
            قنوات <span className="text-emerald-400" dir="auto">{league.name}</span>
          </DialogTitle>
          <p className="text-right text-xs text-white/40 font-bold">تظهر أولاً في كل مباريات هذا الدوري · تُحفظ في السحابة</p>
        </DialogHeader>

        <div className="space-y-1.5">
          {list.map((c, i) => (
            <div key={c} className="flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-3 h-11">
              <span className="flex-1 min-w-0 truncate text-sm font-black" dir="ltr">{c}</span>
              {i > 0 && (
                <button onClick={() => up(i)} title="رفع" data-nav-id={`league-ch-up-${i}`} className="focusable no-focus-scale w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/50">
                  <ChevronUp className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setList(list.filter(x => x !== c))} title="حذف" data-nav-id={`league-ch-del-${i}`} className="focusable no-focus-scale w-8 h-8 rounded-full hover:bg-red-500/20 flex items-center justify-center text-white/50 hover:text-red-300">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {list.length === 0 && <p className="py-3 text-center text-xs text-white/40">لا قنوات · ستظهر قنوات المصادر فقط</p>}
        </div>

        {/* add: categories first, then the category's channels (search filters both), or a typed name */}
        {picking ? (
          <IptvChannelSelect onPick={ch => { addName(ch.name); setPicking(false); }} />
        ) : (
          <button onClick={() => setPicking(true)} data-nav-id="league-ch-add"
            className="focusable no-focus-scale w-full h-11 rounded-full bg-white/10 text-sm font-black flex items-center justify-center gap-1.5">
            <Plus className="w-4 h-4" /> إضافة قناة
          </button>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button onClick={save} data-nav-id="league-ch-save" className="focusable no-focus-scale flex-1 h-11 rounded-full bg-emerald-500 text-black text-sm font-black flex items-center justify-center gap-1.5">
            <Check className="w-4 h-4" /> حفظ
          </button>
          <button onClick={reset} disabled={!saved} data-nav-id="league-ch-reset" title={defaults.length ? `الافتراضي: ${defaults.join("، ")}` : "بدون قناة افتراضية"}
            className={cn("focusable no-focus-scale h-11 px-4 rounded-full bg-white/5 border border-white/10 text-xs font-black flex items-center gap-1.5", !saved && "opacity-40")}>
            <RotateCcw className="w-4 h-4" /> الافتراضي
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
