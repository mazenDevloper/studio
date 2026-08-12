
"use client";

import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { 
  Sparkles, Youtube, Search, Trophy, RefreshCw, Activity, BookOpen, Loader2, MonitorPlay, Minimize2, Edit3, Save 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect, useCallback } from "react";
import { suggestPersonalizedYouTubeContent } from "@/ai/flows/suggest-personalized-youtube-content-flow";
import { searchYouTubeVideos, fetchChannelVideos } from "@/lib/youtube";
import { fetchFootballData } from "@/lib/football-api";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { JSONBIN_MANUSCRIPTS_BIN_ID, JSONBIN_PRAYER_TIMES_BIN_ID } from "@/lib/constants";

/**
 * SovereignShortcutsWidget v200.0 - Editable Links & Search Pulse
 */
export function SovereignShortcutsWidget() {
  const router = useRouter();
  const { toast } = useToast();
  const { 
    setActiveQuranUrl, lastPlayedVideo, setActiveVideo, setActiveIptv,
    favoriteChannels, syncMasterBin, fetchPriorityData, mapSettings, updateMapSettings, fetchSpecificBin
  } = useMediaStore();

  const [footballHeadline, setFootballHeadline] = useState("رصد حي للملاعب");
  const [isAiDiscoveryActive, setIsAiDiscoveryActive] = useState(false);
  const [isSystemRefreshing, setIsSystemRefreshing] = useState(false);
  const [isQuranProcessing, setIsQuranProcessing] = useState(false);
  const [isOmanProcessing, setIsOmanProcessing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempUrl, setTempUrl] = useState("");

  const QURAN_CHANNEL_AVATAR = "https://yt3.ggpht.com/ytc/AIdro_mesiGG76gww2WnpFVUFbMz-s2d4IjJJVhDqJuCVscqKLY=s88-c-k-c0xffffffff-no-rj-mo";
  const OMAN_TV_AVATAR = "https://gallery-images.me/pics/arabicfta/oman.png";

  const executeSpiritualPulse = useCallback(async () => {
    if (isQuranProcessing) return;
    setIsQuranProcessing(true);
    toast({ title: "النبض الروحي", description: "جاري البحث عن بث مباشر لمكة المكرمة..." });
    
    try {
      const results = await searchYouTubeVideos("بث مباشر مكة المكرمة", 5);
      const liveVideo = results.find(v => v.isLive) || (results.length > 0 ? results[0] : null);
      
      if (liveVideo) {
        setActiveVideo(liveVideo);
      } else {
        setActiveQuranUrl("https://quran.com/ar/radio?autoplay=1");
        router.push("/quran");
      }
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ", description: "فشل استدعاء البث" });
    } finally {
      setIsQuranProcessing(false);
    }
  }, [setActiveVideo, setActiveQuranUrl, router, toast, isQuranProcessing]);

  const executeOmanLive = useCallback(async () => {
    setIsOmanProcessing(true);
    toast({ title: "عمان مباشر", description: "جاري استدعاء البث الرسمي لسلطنة عمان..." });
    try {
      setActiveIptv({
        stream_id: "oman-tv-live",
        name: "قناة عمان مباشر",
        stream_icon: OMAN_TV_AVATAR,
        category_id: "direct",
        url: mapSettings.omanUrl,
        type: 'web'
      });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ", description: "فشل استدعاء بث عمان" });
    } finally {
      setIsOmanProcessing(false);
    }
  }, [setActiveIptv, toast, mapSettings.omanUrl]);

  const executeSystemOptimizer = useCallback(async () => {
    if (isSystemRefreshing) return;
    setIsSystemRefreshing(true);
    toast({ title: "محسن النظام", description: "جاري مزامنة المخطوطات والصلوات..." });
    try {
      await Promise.all([
        fetchSpecificBin(JSONBIN_MANUSCRIPTS_BIN_ID),
        fetchSpecificBin(JSONBIN_PRAYER_TIMES_BIN_ID),
        syncMasterBin()
      ]);
      toast({ title: "تم التحسين", description: "النظام الآن في قمة أدائه السحابي." });
    } finally {
      setIsSystemRefreshing(false);
    }
  }, [syncMasterBin, fetchSpecificBin, isSystemRefreshing, toast]);

  const handleStartEdit = (id: string, currentUrl: string) => {
    setEditingId(id);
    setTempUrl(currentUrl);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const updates: any = {};
    if (editingId === 'oman-live') updates.omanUrl = tempUrl;
    else if (editingId === 'bein-1') updates.bein1Url = tempUrl;
    else if (editingId === 'mbc-1') updates.mbc1Url = tempUrl;
    
    updateMapSettings(updates);
    setEditingId(null);
    toast({ title: "تم الحفظ", description: "تم تحديث الرابط وحفظه سحابياً." });
  };

  const commands = useMemo(() => [
    {
      id: "spiritual-pulse",
      label: "النبض الروحي",
      sublabel: isQuranProcessing ? "جاري الاستدعاء..." : "بث مباشر مكة",
      icon: BookOpen,
      avatar: QURAN_CHANNEL_AVATAR,
      gradient: "from-emerald-600/20 to-emerald-950/60",
      action: executeSpiritualPulse,
      isLoading: isQuranProcessing
    },
    {
      id: "oman-live",
      label: "عمان مباشر",
      sublabel: isOmanProcessing ? "جاري الاتصال..." : "البث الرسمي الحكومي",
      icon: MonitorPlay,
      avatar: OMAN_TV_AVATAR,
      gradient: "from-blue-600/20 to-blue-950/60",
      action: executeOmanLive,
      isLoading: isOmanProcessing,
      editable: true,
      url: mapSettings.omanUrl
    },
    {
      id: "bein-1",
      label: "beIN Sports 1",
      sublabel: "البث المباشر للمباريات",
      icon: MonitorPlay,
      avatar: "https://gallery-images.me/pics/bein/bein-sports-2.png",
      gradient: "from-purple-600/20 to-purple-950/60",
      action: () => setActiveIptv({
        stream_id: "bein-1-live",
        name: "beIN Sports 1 HD",
        stream_icon: "https://gallery-images.me/pics/bein/bein-sports-2.png",
        category_id: "direct",
        url: mapSettings.bein1Url,
        type: 'web'
      }),
      editable: true,
      url: mapSettings.bein1Url
    },
    {
      id: "mbc-1",
      label: "MBC 1",
      sublabel: "البث المباشر للبرامج",
      icon: MonitorPlay,
      avatar: "https://gallery-images.me/pics/mbc/mbc_ae_1.png",
      gradient: "from-zinc-600/20 to-zinc-950/60",
      action: () => setActiveIptv({
        stream_id: "mbc-1-live",
        name: "MBC 1",
        stream_icon: "https://gallery-images.me/pics/mbc/mbc_ae_1.png",
        category_id: "direct",
        url: mapSettings.mbc1Url,
        type: 'web'
      }),
      editable: true,
      url: mapSettings.mbc1Url
    },
    {
      id: "atomic-resume",
      label: "الاستكمال الذري",
      sublabel: lastPlayedVideo ? `استئناف: ${lastPlayedVideo.title}` : "سجل المشاهدة",
      icon: Activity,
      avatar: lastPlayedVideo?.thumbnail,
      gradient: "from-orange-600/20 to-orange-950/60",
      action: () => lastPlayedVideo && setActiveVideo(lastPlayedVideo),
      disabled: !lastPlayedVideo
    },
    {
      id: "football-radar",
      label: "نبض الملاعب",
      sublabel: footballHeadline,
      icon: Trophy,
      gradient: "from-rose-600/20 to-rose-950/60",
      action: () => router.push('/hihi2'),
      isLive: footballHeadline.includes('-')
    },
    {
      id: "system-optimizer",
      label: "محسن النظام",
      sublabel: "معايرة شاملة",
      icon: RefreshCw,
      gradient: "from-blue-600/20 to-blue-950/60",
      action: executeSystemOptimizer,
      isLoading: isSystemRefreshing
    }
  ], [lastPlayedVideo, footballHeadline, isSystemRefreshing, isQuranProcessing, isOmanProcessing, executeSpiritualPulse, executeOmanLive, executeSystemOptimizer, router, setActiveVideo, setActiveIptv, mapSettings]);

  return (
    <div className="grid grid-cols-7 gap-4 p-8 h-full items-center">
      {commands.map((cmd, idx) => {
        const Icon = cmd.icon;
        const isEditing = editingId === cmd.id;
        return (
          <div key={cmd.id} className="relative h-48 group">
             <button
              onClick={isEditing ? undefined : cmd.action}
              disabled={cmd.disabled || cmd.isLoading}
              className={cn(
                "w-full h-full rounded-[3.5rem] overflow-hidden flex flex-col p-8 text-right dir-rtl focusable transition-all active:scale-95 border-2",
                (cmd.disabled || cmd.isLoading) ? "opacity-40 grayscale cursor-not-allowed" : "cursor-pointer hover:border-white/20",
                `bg-gradient-to-br ${cmd.gradient} border-white/5 backdrop-blur-3xl shadow-2xl`
              )}
              tabIndex={0}
              data-nav-id={`shortcut-item-${idx}`}
            >
              <div className="relative z-10 flex flex-col h-full justify-between w-full">
                <div className={cn(
                  "w-16 h-16 rounded-[2rem] bg-black/40 backdrop-blur-3xl flex items-center justify-center border border-white/10 shadow-2xl group-hover:scale-110 transition-transform relative overflow-hidden",
                  cmd.isLoading && "animate-spin"
                )}>
                  {cmd.avatar ? (
                    <img src={cmd.avatar} className="w-full h-full object-cover rounded-[2rem]" alt="" />
                  ) : cmd.isLoading ? (
                    <Loader2 className="w-8 h-8 text-white" />
                  ) : (
                    <Icon className={cn("w-9 h-9 text-white", cmd.isLive && "animate-pulse")} />
                  )}
                </div>
                
                {isEditing ? (
                   <div className="mt-auto space-y-2 w-full animate-in zoom-in-95 duration-200">
                      <Input value={tempUrl} onChange={(e) => setTempUrl(e.target.value)} className="h-8 bg-black/60 border-white/20 text-[8px] font-bold text-white px-2" placeholder="URL..." />
                      <button onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }} className="w-full h-6 bg-emerald-500 rounded-lg flex items-center justify-center text-black"><Save className="w-3 h-3" /></button>
                   </div>
                ) : (
                  <div className="flex flex-col gap-1 mt-auto">
                    <span className="text-xl font-black text-white tracking-tighter truncate leading-tight">{cmd.label}</span>
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] truncate">{cmd.sublabel}</span>
                  </div>
                )}
              </div>
            </button>
            
            {(cmd.editable && !isEditing) && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleStartEdit(cmd.id, cmd.url || ""); }}
                className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focusable z-20"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
