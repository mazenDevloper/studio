
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useMediaStore, Reminder, FavoriteTeam, Manuscript, PrayerSetting } from "@/lib/store";
import { 
  Settings, 
  Bell, 
  Trash2, 
  Edit2,
  Trophy,
  Search,
  Star,
  RefreshCw,
  Plus,
  Globe,
  Zap,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Type as TypeIcon,
  AlertTriangle,
  Palette,
  Upload,
  Eye,
  X,
  Pipette,
  AlertCircle,
  Database,
  Loader2,
  Monitor,
  Type,
  FileCode
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { MAJOR_LEAGUES } from "@/lib/football-data";
import { getExhaustedKeysCount, resetYoutubeBlacklist } from "@/lib/youtube";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { JSONBIN_MATCHES_SCHEDULE_BIN_ID, JSONBIN_MASTER_KEY } from "@/lib/constants";

const BACKGROUNDS = [
  "https://images.unsplash.com/photo-1534067783941-51c9c23ecefd",
  "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa",
  "https://images.unsplash.com/photo-1594911772125-07fc7a2d8d9f",
  "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0"
];

const STATIC_WALL_BACKGROUNDS = [
  { id: 'art-1', name: 'زيتي تجريدي', url: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=2000' },
  { id: 'art-2', name: 'ألوان مائية', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=2000' },
  { id: 'art-3', name: 'نسيج قماشي', url: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?q=80&w=2000' },
  { id: 'art-4', name: 'ظلال الرخام', url: 'https://images.unsplash.com/photo-1533154683836-84ea7a0bc310?q=80&w=2000' }
];

const RELATIVE_PRAYER_OPTIONS = [
  { id: 'fajr', name: 'الفجر' },
  { id: 'sunrise', name: 'الشروق' },
  { id: 'duha', name: 'الضحى' },
  { id: 'dhuhr', name: 'الظهر' },
  { id: 'asr', name: 'العصر' },
  { id: 'maghrib', name: 'المغرب' },
  { id: 'isha', name: 'العشاء' },
  { id: 'manual', name: 'يدوي (وقت محدد)' },
];

export function SettingsView() {
  const { 
    reminders, 
    addReminder, 
    removeReminder, 
    updateReminder,
    prayerSettings,
    updatePrayerSetting,
    customManuscripts,
    addManuscript,
    removeManuscript,
    customWallBackgrounds,
    addCustomWallBackground,
    removeCustomWallBackground,
    customManuscriptColors,
    addCustomManuscriptColor,
    removeCustomManuscriptColor,
    favoriteTeams, 
    toggleFavoriteTeam,
    favoriteLeagueIds,
    toggleFavoriteLeague,
    mapSettings, 
    updateMapSettings,
    fetchManuscripts,
    syncLeagueClubsToCloud,
    clubsCache,
    fetchClubsFromCache,
    isClubsLoading
  } = useMediaStore();
  const { toast } = useToast();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isRefreshingManuscripts, setIsRefreshingManuscripts] = useState(false);
  const [localBgUrl, setLocalBgUrl] = useState(mapSettings.manuscriptBgUrl || "");
  const [localColorInput, setLocalColorInput] = useState("");
  const [exhaustedKeys, setExhaustedKeys] = useState(0);
  const [isSeeding, setIsSeeding] = useState(false);
  
  const [form, setForm] = useState<Partial<Reminder>>({
    label: "",
    relativePrayer: "manual",
    manualTime: "08:00",
    offsetMinutes: 0,
    showCountdown: true,
    countdownWindow: 10,
    showCountup: true,
    countupWindow: 10,
    color: "text-blue-400",
    iconType: "bell"
  });

  const [manuscriptInput, setManuscriptInput] = useState("");
  const [manuscriptType, setManuscriptType] = useState<'text' | 'image'>('text');

  const [clubSearch, setClubSearch] = useState("");
  const [searchLeagueId, setSearchLeagueId] = useState<string>("all");
  const [isSyncingClubs, setIsSyncingClubs] = useState(false);

  useEffect(() => {
    setLocalBgUrl(mapSettings.manuscriptBgUrl);
    setExhaustedKeys(getExhaustedKeysCount());
  }, [mapSettings.manuscriptBgUrl]);

  useEffect(() => {
    if (searchLeagueId !== "all") {
      fetchClubsFromCache(searchLeagueId);
    }
  }, [searchLeagueId, fetchClubsFromCache]);

  const allAvailableWallBackgrounds = useMemo(() => {
    const list = [...STATIC_WALL_BACKGROUNDS.map(b => ({ ...b, isCustom: false }))];
    if (Array.isArray(customWallBackgrounds)) {
      customWallBackgrounds.forEach((url, i) => {
        if (!STATIC_WALL_BACKGROUNDS.some(s => s.url === url)) {
          list.push({ id: `custom-bg-${i}`, name: `خلفية مرفوعة ${i + 1}`, url, isCustom: true });
        }
      });
    }
    return list;
  }, [customWallBackgrounds]);

  const filteredClubsResults = useMemo(() => {
    if (!clubsCache) return [];
    return clubsCache.filter(item => 
      item.team.name.toLowerCase().includes(clubSearch.toLowerCase())
    );
  }, [clubsCache, clubSearch]);

  const handleSyncClubs = async () => {
    if (searchLeagueId === "all") {
      toast({ variant: "destructive", title: "تنبيه", description: "يرجى اختيار دوري محدد للتخزين." });
      return;
    }
    setIsSyncingClubs(true);
    try {
      await syncLeagueClubsToCloud(searchLeagueId);
      toast({ title: "تم التخزين", description: "تم حفظ أندية الدوري في قاعدة البيانات السحابية." });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ", description: "فشل تخزين الأندية سحابياً." });
    } finally {
      setIsSyncingClubs(false);
    }
  };

  const handleSeedMockData = async () => {
    setIsSeeding(true);
    const mockData = {
      "2026-03-27": [],
      "2026-03-28": [],
      "2026-03-29": [],
      "lastGlobalUpdate": 1774745481292,
      "2026-03-30": []
    };

    try {
      const res = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_MATCHES_SCHEDULE_BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_MASTER_KEY
        },
        body: JSON.stringify(mockData)
      });
      if (res.ok) {
        toast({ title: "تم ملاء البيانات", description: "تم تحديث المصفوفة التجريبية في السحابة بنجاح." });
      } else {
        throw new Error("Seed failed");
      }
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ", description: "فشل إرسال البيانات التجريبية." });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleRefreshManuscripts = async () => {
    setIsRefreshingManuscripts(true);
    await fetchManuscripts();
    setIsRefreshingManuscripts(false);
    toast({ title: "تم التحديث", description: "تم جلب أحدث المخطوطات من السحابة بنجاح." });
  };

  const handleResetKeys = () => {
    resetYoutubeBlacklist();
    setExhaustedKeys(0);
    toast({ title: "تم تصفية القائمة السوداء", description: "تمت إعادة تفعيل جميع مفاتيح YouTube بنجاح." });
  };

  const handleApplyBackground = () => {
    if (!localBgUrl.trim()) return;
    updateMapSettings({ manuscriptBgUrl: localBgUrl });
    addCustomWallBackground(localBgUrl);
    toast({ title: "تم الحفظ سحابياً", description: "تم تحديث خلفية حائط المخطوطة ومزامنتها بنجاح." });
  };

  const handleSubmitReminder = () => {
    if (!form.label?.trim()) return;
    const reminderData: Reminder = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      label: form.label!,
      relativePrayer: (form.relativePrayer as any) || 'manual',
      manualTime: form.manualTime,
      offsetMinutes: form.offsetMinutes || 0,
      showCountdown: form.showCountdown ?? true,
      countdownWindow: form.countdownWindow || 10,
      showCountup: form.showCountup ?? true,
      countupWindow: form.countupWindow || 10,
      completed: false,
      color: form.color || 'text-blue-400',
      iconType: 'bell',
    };
    if (editingId) {
      updateReminder(editingId, reminderData);
      setEditingId(null);
      toast({ title: "تم التعديل", description: "تم تحديث التذكير بنجاح." });
    } else {
      addReminder(reminderData);
      toast({ title: "تمت الإضافة", description: "تمت إضافة التذكير بنجاح." });
    }
    setForm({ label: "", relativePrayer: "manual", manualTime: "08:00", offsetMinutes: 0, showCountdown: true, countdownWindow: 10, showCountup: true, countupWindow: 10, color: "text-blue-400", iconType: "bell" });
  };

  const handleToggleFavorite = (team: any) => {
    toggleFavoriteTeam({ id: team.team.id, name: team.team.name, logo: team.team.logo });
    toast({ title: "تم التحديث", description: "تم تحديث قائمة التتبع السحابية." });
  };

  const isFavTeam = (id: number) => favoriteTeams.some(t => t.id === id);

  return (
    <div className="p-12 space-y-12 max-w-7xl mx-auto pb-40 animate-in fade-in duration-700 text-right dir-rtl">
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-6xl font-black font-headline text-white tracking-tighter flex items-center gap-6">
            مركز التحكم <Settings className="w-12 h-12 text-primary animate-spin-slow" />
          </h1>
          <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/10 shadow-2xl relative">
            <AlertCircle className={cn("w-6 h-6", exhaustedKeys > 5 ? "text-red-500" : "text-yellow-500")} />
            <div className="flex flex-col">
              <span className="text-white font-black text-lg tabular-nums leading-none">{exhaustedKeys} / 15</span>
              <span className="text-[9px] text-white/40 uppercase font-bold tracking-widest mt-1">مفاتيح مستنفدة حالياً</span>
            </div>
            <Button 
              onClick={handleResetKeys} 
              variant="ghost" 
              size="icon" 
              className="mr-2 h-10 w-10 rounded-full bg-red-600/10 hover:bg-red-600/20 text-red-500 focusable"
              title="تصفية القائمة السوداء"
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>
        </div>
        <p className="text-white/40 font-bold uppercase tracking-[0.6em] text-sm">System Configuration & Preferences</p>
      </header>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="bg-white/5 p-1 rounded-full border border-white/10 h-16 mb-12 flex justify-start w-fit">
          <TabsTrigger value="appearance" className="rounded-full px-10 h-full data-[state=active]:bg-primary font-bold text-lg focusable">المظهر</TabsTrigger>
          <TabsTrigger value="prayers" className="rounded-full px-10 h-full data-[state=active]:bg-primary font-bold text-lg focusable">الصلوات</TabsTrigger>
          <TabsTrigger value="reminders" className="rounded-full px-10 h-full data-[state=active]:bg-primary font-bold text-lg focusable">التذكيرات</TabsTrigger>
          <TabsTrigger value="football" className="rounded-full px-10 h-full data-[state=active]:bg-primary font-bold text-lg focusable">الرياضة</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-12 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="premium-glass p-10 space-y-10">
              <div className="flex flex-col gap-2">
                <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
                  <Monitor className="w-6 h-6 text-primary" />
                  زوم المتصفح والعرض
                </CardTitle>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Global Display Scaling</p>
              </div>
              
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black text-white/60">مقياس الواجهة (Display Scale)</span>
                    <span className="text-primary font-black">{Math.round((mapSettings.displayScale ?? 1.0) * 100)}%</span>
                  </div>
                  <Slider 
                    value={[mapSettings.displayScale ?? 1.0]} 
                    min={0.5} max={1.5} step={0.05} 
                    onValueChange={([v]) => updateMapSettings({ displayScale: v })} 
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black text-white/60">حجم الخط العالمي (Font Size)</span>
                    <span className="text-primary font-black">{Math.round((mapSettings.fontScale ?? 1.0) * 100)}%</span>
                  </div>
                  <Slider 
                    value={[mapSettings.fontScale ?? 1.0]} 
                    min={0.7} max={1.3} step={0.05} 
                    onValueChange={([v]) => updateMapSettings({ fontScale: v })} 
                  />
                </div>
              </div>
            </Card>

            <Card className="premium-glass p-10">
              <CardTitle className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                <ImageIcon className="w-6 h-6 text-accent" />
                الخلفية العامة
              </CardTitle>
              <div className="grid grid-cols-2 gap-4 h-64">
                {BACKGROUNDS.map((bg, idx) => (
                  <button key={idx} onClick={() => updateMapSettings({ backgroundIndex: idx })} className={cn("relative rounded-2xl overflow-hidden border-4 focusable", mapSettings.backgroundIndex === idx ? "border-primary" : "border-transparent opacity-40")}>
                    <img src={`${bg}?auto=format&fit=crop&q=40&w=300`} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <Card className="premium-glass p-10 space-y-8">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
                <Palette className="w-6 h-6 text-primary" />
                خلفية حائط المخطوطة (Wall Background)
              </CardTitle>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Customize Immersive Wall Experience</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="flex items-center justify-between bg-white/5 p-6 rounded-2xl border border-white/5 shadow-inner">
                  <div className="flex flex-col">
                    <span className="text-white font-black text-sm uppercase">تفعيل الخلفية الفنية</span>
                    <span className="text-[10px] text-white/40">تظهر خلف المخطوطات في وضع الحائط</span>
                  </div>
                  <Switch 
                    checked={mapSettings.showManuscriptBg} 
                    onCheckedChange={(v) => updateMapSettings({ showManuscriptBg: v })} 
                  />
                </div>

                <div className="space-y-3 bg-white/5 p-6 rounded-2xl border border-white/5">
                  <span className="text-xs font-black text-white/60 uppercase tracking-widest block mb-2">رابط خلفية مخصص (Cloud URL)</span>
                  <div className="flex flex-col gap-3">
                    <Input 
                      placeholder="https://..."
                      value={localBgUrl}
                      onChange={(e) => setLocalBgUrl(e.target.value)}
                      className="bg-black/40 border-white/10 h-14 rounded-xl focusable text-right text-sm"
                    />
                    <Button 
                      onClick={handleApplyBackground} 
                      className="w-full h-14 bg-primary text-white font-black rounded-xl shadow-glow focusable"
                    >
                      <Upload className="w-5 h-5 ml-2" /> حفظ وتثبيت سحابي
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-8">
                <ScrollArea className="h-[400px]">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-8 pr-4">
                    {allAvailableWallBackgrounds.map((bg) => (
                      <div key={bg.id} className="relative group">
                        <button 
                          onClick={() => {
                            setLocalBgUrl(bg.url);
                            updateMapSettings({ manuscriptBgUrl: bg.url });
                            toast({ title: "تم الاختيار", description: `تم تفعيل خلفية ${bg.name}` });
                          }}
                          className={cn(
                            "relative aspect-video w-full rounded-xl overflow-hidden border-2 transition-all focusable",
                            mapSettings.manuscriptBgUrl === bg.url ? "border-primary scale-105 shadow-glow" : "border-transparent opacity-40 hover:opacity-100"
                          )}
                        >
                          <img src={bg.url} className="w-full h-full object-cover" alt={bg.name} />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-[10px] font-black text-white uppercase">{bg.name}</span>
                          </div>
                        </button>
                        {bg.isCustom && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeCustomWallBackground(bg.url); }}
                            className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl z-20"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="prayers" className="space-y-8 outline-none">
          <Card className="premium-glass p-8 space-y-8">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
                <Clock className="w-6 h-6 text-primary" />
                تعديل أوقات الصلوات والإقامة
              </CardTitle>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Master Prayer & Iqamah Sync</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {prayerSettings.map((s) => (
                <div key={s.id} className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <span className="text-xl font-black text-white">{s.name}</span>
                    <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase">نشط</div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-white/40">
                        <span>إزاحة الوقت (دقيقة)</span>
                        <span className={cn(s.offsetMinutes !== 0 ? "text-primary" : "")}>{s.offsetMinutes} د</span>
                      </div>
                      <Slider 
                        value={[s.offsetMinutes]} 
                        min={-30} max={30} step={1} 
                        onValueChange={([v]) => updatePrayerSetting(s.id, { offsetMinutes: v })} 
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-white/40">
                        <span>مدة الإقامة (دقيقة)</span>
                        <span className="text-accent">{s.iqamahDuration} د</span>
                      </div>
                      <Slider 
                        value={[s.iqamahDuration]} 
                        min={0} max={45} step={1} 
                        onValueChange={([v]) => updatePrayerSetting(s.id, { iqamahDuration: v })} 
                      />
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <span className="text-[10px] font-black text-white/40 uppercase">بدء العد التنازلي قبل</span>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          value={s.countdownWindow} 
                          onChange={(e) => updatePrayerSetting(s.id, { countdownWindow: parseInt(e.target.value) })}
                          className="w-16 h-8 bg-black/40 border-white/10 rounded-lg text-center font-black text-xs"
                        />
                        <span className="text-[10px] text-white/20">د</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-8 outline-none">
          <Card className="premium-glass p-8 space-y-8">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
                <Bell className="w-6 h-6 text-primary" />
                إدارة التذكيرات الذكية
              </CardTitle>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Custom Notification Hub</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4 space-y-6 bg-white/5 p-8 rounded-[2.5rem] border border-white/5">
                <h3 className="text-lg font-black text-white mb-4">{editingId ? 'تعديل تذكير' : 'إضافة تذكير جديد'}</h3>
                <div className="space-y-4">
                  <Input placeholder="نص التذكير..." value={form.label} onChange={(e) => setForm({...form, label: e.target.value})} className="h-14 bg-black/40 border-white/10 rounded-xl px-6 focusable" />
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase px-2">مرتبط بـ:</label>
                    <Select value={form.relativePrayer} onValueChange={(v) => setForm({...form, relativePrayer: v as any})}>
                      <SelectTrigger className="h-14 bg-black/40 border-white/10 rounded-xl focusable">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        {RELATIVE_PRAYER_OPTIONS.map(opt => <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {form.relativePrayer === 'manual' && (
                    <Input type="time" value={form.manualTime} onChange={(e) => setForm({...form, manualTime: e.target.value})} className="h-14 bg-black/40 border-white/10 rounded-xl px-6 focusable" />
                  )}

                  <Button onClick={handleSubmitReminder} className="w-full h-14 bg-primary text-white font-black rounded-xl shadow-glow focusable">
                    {editingId ? 'تحديث التذكير' : 'حفظ التذكير'}
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-4">
                {reminders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 border-2 border-dashed border-white/10 rounded-[2.5rem]">
                    <Bell className="w-16 h-16 mb-4" />
                    <p className="font-black uppercase tracking-widest text-xs">لا توجد تذكيرات مخصصة حالياً</p>
                  </div>
                ) : reminders.map((r) => (
                  <div key={r.id} className="bg-white/5 p-6 rounded-2xl border border-white/5 flex items-center justify-between group">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Bell className={cn("w-6 h-6", r.color)} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-lg font-black text-white">{r.label}</span>
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                          {RELATIVE_PRAYER_OPTIONS.find(o => o.id === r.relativePrayer)?.name} 
                          {r.offsetMinutes !== 0 && ` (${r.offsetMinutes > 0 ? '+' : ''}${r.offsetMinutes} د)`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <Button variant="ghost" size="icon" onClick={() => { setForm(r); setEditingId(r.id); }} className="w-10 h-10 rounded-full bg-white/5 focusable"><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => removeReminder(r.id)} className="w-10 h-10 rounded-full bg-red-600/10 text-red-500 focusable"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="football" className="outline-none space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-8">
              <Card className="premium-glass p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-2">
                    <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
                      <Trophy className="w-6 h-6 text-accent" />
                      إدارة جدول المباريات السحابي
                    </CardTitle>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Cloud Schedule Management</p>
                  </div>
                  <Button 
                    onClick={handleSeedMockData} 
                    disabled={isSeeding}
                    className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-glow focusable flex items-center gap-2"
                  >
                    {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4" />}
                    ملاء البيانات التجريبية
                  </Button>
                </div>
                
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-black text-white/60 uppercase">معرف الجدول النشط:</span>
                    <code className="text-[10px] bg-black/40 px-3 py-1 rounded-lg text-primary">{JSONBIN_MATCHES_SCHEDULE_BIN_ID}</code>
                  </div>
                  <p className="text-[10px] text-white/30 leading-relaxed">
                    يستخدم هذا المعرف لمزامنة جدول المباريات عبر كافة الأجهزة. عند الضغط على "ملاء البيانات"، سيتم إرسال مصفوفة فارغة للتواريخ من 27 إلى 30 مارس 2026 لتصفير الجدول أو اختباره.
                  </p>
                </div>
              </Card>

              <Card className="premium-glass p-8 space-y-6">
                <div className="flex flex-col gap-2">
                  <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
                    <Globe className="w-6 h-6 text-accent" />
                    تتبع الدوريات الكبرى (Starred)
                  </CardTitle>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Master League Watchlist</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {MAJOR_LEAGUES.map(league => {
                    const isFav = favoriteLeagueIds.includes(league.id);
                    return (
                      <Button
                        key={league.id}
                        variant="outline"
                        onClick={() => toggleFavoriteLeague(league.id)}
                        className={cn(
                          "h-14 rounded-2xl border transition-all font-black text-xs justify-between px-6 focusable",
                          isFav ? "bg-accent/20 border-accent text-accent" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                        )}
                      >
                        {league.name}
                        {isFav ? <Star className="w-4 h-4 fill-current" /> : <Plus className="w-4 h-4" />}
                      </Button>
                    );
                  })}
                </div>
              </Card>

              <Card className="premium-glass p-8 space-y-6">
                <div className="flex flex-col gap-2">
                  <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
                    <Database className="w-6 h-6 text-primary" />
                    البحث السحابي (JSONBin Cache)
                  </CardTitle>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Integrated Cloud Search Hub</p>
                </div>
                
                <div className="flex flex-col gap-4">
                  <div className="flex gap-3">
                    <Select value={searchLeagueId} onValueChange={setSearchLeagueId}>
                      <SelectTrigger className="w-48 bg-white/5 border-white/10 h-16 rounded-2xl text-right focusable">
                        <SelectValue placeholder="اختر الدوري..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        <SelectItem value="all">اختر دوري للبحث</SelectItem>
                        {MAJOR_LEAGUES.map(l => (
                          <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                      <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 w-6 h-6" />
                      <Input 
                        placeholder="ابحث في الأندية المخزنة سحابياً..." 
                        value={clubSearch} 
                        onChange={(e) => setClubSearch(e.target.value)} 
                        className="h-16 bg-white/5 border-white/10 rounded-2xl pr-16 text-right text-xl w-full focusable" 
                      />
                    </div>
                    <Button 
                      onClick={handleSyncClubs} 
                      disabled={isSyncingClubs || searchLeagueId === 'all'} 
                      className="h-16 px-6 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl shadow-xl focusable flex items-center gap-2"
                    >
                      {isSyncingClubs ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                      تخزين الأندية
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[350px] pr-2">
                  {isClubsLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Loader2 className="w-10 h-10 animate-spin text-primary" />
                      <span className="text-white/40 font-bold">جاري جلب المستودع السحابي...</span>
                    </div>
                  ) : filteredClubsResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20 gap-4">
                      <Search className="w-12 h-12" />
                      <p className="text-sm font-bold uppercase tracking-widest">لا توجد أندية مخزنة لهذا الدوري</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-10">
                      {filteredClubsResults.map((team: any) => {
                        const fav = isFavTeam(team.team.id);
                        return (
                          <div 
                            key={team.team.id} 
                            onClick={() => handleToggleFavorite(team)}
                            className={cn(
                              "p-4 rounded-[2rem] border transition-all cursor-pointer flex flex-col items-center gap-3 focusable group/card",
                              fav ? "bg-primary/20 border-primary shadow-glow" : "bg-white/5 border-white/10 hover:bg-white/10"
                            )}
                          >
                            <div className="relative w-16 h-16">
                              <img src={team.team.logo} alt="" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-[10px] font-black text-center line-clamp-1 group-hover/card:text-white">{team.team.name}</span>
                            {fav ? <Star className="w-4 h-4 text-yellow-500 fill-current" /> : <Plus className="w-4 h-4 text-white/40 group-hover/card:text-white" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </Card>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <Card className="premium-glass p-8 space-y-6 h-full">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
                      <Trophy className="w-6 h-6 text-yellow-500" />
                      قائمة التتبع (Starred)
                    </CardTitle>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Active Watchlist</p>
                  </div>
                  <span className="bg-primary/20 text-primary px-4 py-1 rounded-full text-xs font-black">{favoriteTeams.length + favoriteLeagueIds.length} عنصر</span>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                  {favoriteTeams.length === 0 && favoriteLeagueIds.length === 0 ? (
                    <div className="py-20 text-center opacity-20 flex flex-col items-center gap-4">
                      <Trophy className="w-16 h-16" />
                      <p className="text-xs font-black uppercase tracking-widest">قائمة التتبع فارغة</p>
                    </div>
                  ) : (
                    <>
                      {favoriteLeagueIds.map(lid => {
                        const l = MAJOR_LEAGUES.find(ml => ml.id === lid);
                        return (
                          <div key={`l-${lid}`} className="p-4 rounded-2xl bg-accent/5 border border-accent/20 flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                              <Shield className="w-8 h-8 text-accent" />
                              <span className="text-sm font-black text-white/80">{l?.name || "دوري مخصص"}</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => toggleFavoriteLeague(lid)} className="w-10 h-10 rounded-full bg-red-600/10 text-red-500 focusable"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        );
                      })}
                      {favoriteTeams.map(t => (
                        <div key={`t-${t.id}`} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="relative w-10 h-10">
                              <img src={t.logo} alt="" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-sm font-black text-white/80">{t.name}</span>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => toggleFavoriteTeam(t)} className="w-10 h-10 rounded-full bg-red-600/10 text-red-500 focusable"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
