
"use client";

import { useMediaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { 
  Sparkles, Youtube, Search, Trophy, RefreshCw, Activity, BookOpen, Loader2 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect, useCallback } from "react";
import { suggestPersonalizedYouTubeContent } from "@/ai/flows/suggest-personalized-youtube-content-flow";
import { searchYouTubeVideos } from "@/lib/youtube";
import { fetchFootballData } from "@/lib/football-api";
import { useToast } from "@/hooks/use-toast";

export function SovereignShortcutsWidget() {
  const router = useRouter();
  const { toast } = useToast();
  const { 
    setActiveQuranUrl, lastPlayedVideo, setActiveVideo,
    favoriteChannels, syncMasterBin, fetchPriorityData
  } = useMediaStore();

  const [footballHeadline, setFootballHeadline] = useState("رصد حي للملاعب");
  const [isAiDiscoveryActive, setIsAiDiscoveryActive] = useState(false);
  const [isSystemRefreshing, setIsSystemRefreshing] = useState(false);
  const [isQuranProcessing, setIsQuranProcessing] = useState(false);

  const QURAN_CHANNEL_AVATAR = "https://yt3.ggpht.com/ytc/AIdro_mesiGG76gww2WnpFVUFbMz-s2d4IjJJVhDqJuCVscqKLY=s88-c-k-c0xffffffff-no-rj-mo";

  const executeSpiritualPulse = useCallback(async () => {
    setIsQuranProcessing(true);
    toast({ title: "النبض الروحي", description: "جاري استدعاء البث المباشر الموثق..." });
    try {
      const searchResults = await searchYouTubeVideos("بث مباشر الحرم المكي القرآن الكريم Makkah Live", 1);
      if (searchResults.length > 0) {
        setActiveVideo(searchResults[0]);
      } else {
        setActiveQuranUrl("https://quran.com/ar/radio?autoplay=1");
        router.push("/quran");
      }
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ", description: "فشل استدعاء البث" });
    } finally {
      setIsQuranProcessing(false);
    }
  }, [setActiveVideo, setActiveQuranUrl, router, toast]);

  const executeAIDiscovery = useCallback(async () => {
    if (isAiDiscoveryActive) return;
    setIsAiDiscoveryActive(true);
    toast({ title: "محرك الاكتشاف", description: "جاري تحليل النمط وتوليد توصية سيادية..." });
    try {
      const favNames = favoriteChannels.map(c => c.name);
      const aiResult = await suggestPersonalizedYouTubeContent({ favoriteChannels: favNames });
      if (aiResult.suggestions && aiResult.suggestions.length > 0) {
        const res = await searchYouTubeVideos(aiResult.suggestions[0].title, 1);
        if (res.length > 0) setActiveVideo(res[0]);
      }
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ", description: "تعذر تشغيل محرك AI" });
    } finally {
      setIsAiDiscoveryActive(false);
    }
  }, [favoriteChannels, isAiDiscoveryActive, setActiveVideo, toast]);

  const refreshFootballRadar = useCallback(async () => {
    try {
      const matches = await fetchFootballData('live');
      if (matches && matches.length > 0) {
        setFootballHeadline(`${matches[0].homeTeam} ${matches[0].score?.home}-${matches[0].score?.away} ${matches[0].awayTeam}`);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    refreshFootballRadar();
  }, [refreshFootballRadar]);

  const executeSystemOptimizer = useCallback(async () => {
    if (isSystemRefreshing) return;
    setIsSystemRefreshing(true);
    toast({ title: "محسن النظام", description: "جاري مزامنة السحابة..." });
    try {
      await syncMasterBin();
      await fetchPriorityData('all');
    } finally {
      setIsSystemRefreshing(false);
    }
  }, [syncMasterBin, fetchPriorityData, isSystemRefreshing, toast]);

  const commands = useMemo(() => [
    {
      id: "spiritual-pulse",
      label: "النبض الروحي",
      sublabel: isQuranProcessing ? "جاري الاستدعاء..." : "بث مباشر من مكة",
      icon: BookOpen,
      avatar: QURAN_CHANNEL_AVATAR,
      gradient: "from-emerald-600/20 to-emerald-950/60",
      action: executeSpiritualPulse,
      isLoading: isQuranProcessing
    },
    {
      id: "ai-discovery",
      label: "اكتشاف الذكاء",
      sublabel: "توصيات AI مؤتمتة",
      icon: Sparkles,
      gradient: "from-indigo-600/20 to-indigo-950/60",
      action: executeAIDiscovery,
      isLoading: isAiDiscoveryActive
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
    },
    {
      id: "media-radar",
      label: "رادار الميديا",
      sublabel: "البحث الصوتي الذكي",
      icon: Search,
      gradient: "from-zinc-600/20 to-zinc-950/60",
      action: () => router.push('/media')
    }
  ], [lastPlayedVideo, footballHeadline, isAiDiscoveryActive, isSystemRefreshing, isQuranProcessing, executeSpiritualPulse, executeAIDiscovery, executeSystemOptimizer, router, setActiveVideo]);

  return (
    <div className="grid grid-cols-6 gap-6 p-8 h-full items-center">
      {commands.map((cmd, idx) => {
        const Icon = cmd.icon;
        return (
          <button
            key={cmd.id}
            onClick={cmd.action}
            disabled={cmd.disabled || cmd.isLoading}
            className={cn(
              "group relative h-48 rounded-[3.5rem] overflow-hidden flex flex-col p-8 text-right dir-rtl focusable transition-all active:scale-95 border-2",
              (cmd.disabled || cmd.isLoading) ? "opacity-40 grayscale cursor-not-allowed" : "cursor-pointer hover:border-white/20",
              `bg-gradient-to-br ${cmd.gradient} border-white/5 backdrop-blur-3xl shadow-2xl`
            )}
            tabIndex={0}
            data-nav-id={`shortcut-item-${idx}`}
          >
            <div className="relative z-10 flex flex-col h-full justify-between">
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
              <div className="flex flex-col gap-1 mt-auto">
                <span className="text-2xl font-black text-white tracking-tighter truncate leading-tight">{cmd.label}</span>
                <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] truncate">{cmd.sublabel}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
