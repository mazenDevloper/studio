
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useMediaStore, Reminder, FavoriteTeam, Manuscript } from "@/lib/store";
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
  Pipette
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { searchFootballTeams } from "@/lib/football-api";
import { MAJOR_LEAGUES } from "@/lib/football-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

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
    fetchManuscripts
  } = useMediaStore();
  const { toast } = useToast();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isRefreshingManuscripts, setIsRefreshingManuscripts] = useState(false);
  const [localBgUrl, setLocalBgUrl] = useState(mapSettings.manuscriptBgUrl || "");
  const [localColorInput, setLocalColorInput] = useState("");
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
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    setLocalBgUrl(mapSettings.manuscriptBgUrl);
  }, [mapSettings.manuscriptBgUrl]);

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

  const handleGlobalSearch = useCallback(async () => {
    if (!clubSearch.trim() && searchLeagueId === "all") return;
    setIsSearching(true);
    try {
      const results = await searchFootballTeams(clubSearch, searchLeagueId === "all" ? undefined : searchLeagueId);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  }, [clubSearch, searchLeagueId]);

  const handleRefreshManuscripts = async () => {
    setIsRefreshingManuscripts(true);
    await fetchManuscripts();
    setIsRefreshingManuscripts(false);
    toast({ title: "تم التحديث", description: "تم جلب أحدث المخطوطات من السحابة بنجاح." });
  };

  const handleApplyBackground = () => {
    if (!localBgUrl.trim()) return;
    updateMapSettings({ manuscriptBgUrl: localBgUrl });
    addCustomWallBackground(localBgUrl);
    toast({ title: "تم الحفظ سحابياً", description: "تم تحديث خلفية حائط المخطوطة ومزامنتها بنجاح." });
  };

  const handleAddColor = () => {
    if (!localColorInput.trim()) return;
    addCustomManuscriptColor(localColorInput);
    setLocalColorInput("");
    toast({ title: "تم الحفظ", description: "تمت إضافة اللون/النسيج المخصص." });
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

  const handleAddManuscript = () => {
    if (!manuscriptInput.trim()) return;
    addManuscript({
      id: Math.random().toString(36).substr(2, 9),
      type: manuscriptType,
      content: manuscriptInput
    });
    setManuscriptInput("");
    toast({ title: "تمت الإضافة", description: manuscriptType === 'text' ? "تمت إضافة النص للمخطوطات" : "تمت إضافة الصورة للمخطوطات" });
  };

  const handleEdit = (r: Reminder) => {
    setEditingId(r.id);
    setForm(r);
  };

  const isFavTeam = (id: number) => favoriteTeams.some(t => t.id === id);

  return (
    <div className="p-12 space-y-12 max-w-7xl mx-auto pb-40 animate-in fade-in duration-700 text-right dir-rtl">
      <header className="flex flex-col gap-4">
        <h1 className="text-6xl font-black font-headline text-white tracking-tighter flex items-center gap-6">
          مركز التحكم <Settings className="w-12 h-12 text-primary animate-spin-slow" />
        </h1>
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
            <Card className="premium-glass p-10 space-y-8">
              <CardTitle className="text-2xl font-black text-white">زوم الخريطة</CardTitle>
              <Slider value={[mapSettings.zoom]} min={15} max={21} step={0.1} onValueChange={([v]) => updateMapSettings({ zoom: v })} />
            </Card>
            <Card className="premium-glass p-10">
              <CardTitle className="text-2xl font-black text-white mb-6">الخلفية</CardTitle>
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
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleApplyBackground} 
                        className="flex-1 h-14 bg-primary text-white font-black rounded-xl shadow-glow focusable"
                      >
                        <Upload className="w-5 h-5 ml-2" /> حفظ وتثبيت سحابي
                      </Button>
                    </div>
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

          <Card className="premium-glass p-10 space-y-8">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
                <Pipette className="w-6 h-6 text-emerald-400" />
                ألوان وأنسجة المخطوطات
              </CardTitle>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Customize Manuscript Colors or Textures</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-4">
                <div className="flex flex-col gap-3 p-6 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-xs font-black text-white/60 uppercase">إضافة لون (Hex) أو نسيج (URL)</span>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="#ffffff أو https://..." 
                      value={localColorInput} 
                      onChange={(e) => setLocalColorInput(e.target.value)}
                      className="bg-black/40 border-white/10 h-14 rounded-xl focusable"
                    />
                    <Button onClick={handleAddColor} className="h-14 w-14 bg-emerald-500 rounded-xl focusable"><Plus /></Button>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-8">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                  {customManuscriptColors.map((color, idx) => (
                    <div key={idx} className="relative group">
                      <div 
                        className="w-16 h-16 rounded-xl border-2 border-white/10 shadow-lg overflow-hidden flex items-center justify-center"
                        style={{ 
                          background: color.startsWith('http') ? `url(${color}) center/cover` : color 
                        }}
                      >
                        {color.startsWith('http') && <ImageIcon className="w-4 h-4 text-white/40" />}
                      </div>
                      <button 
                        onClick={() => removeCustomManuscriptColor(color)}
                        className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="premium-glass p-10 space-y-8">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
                  <ImageIcon className="w-6 h-6 text-accent" />
                  تخصيص المخطوطات والأذكار
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleRefreshManuscripts} 
                  disabled={isRefreshingManuscripts}
                  className="rounded-full bg-white/5 border border-white/10 hover:bg-white/10 focusable"
                >
                  <RefreshCw className={cn("w-5 h-5", isRefreshingManuscripts && "animate-spin")} />
                </Button>
              </div>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Cloud Sync Mode: Anywhere & Everywhere</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-5 space-y-6">
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 h-14">
                  <button onClick={() => setManuscriptType('text')} className={cn("flex-1 rounded-xl flex items-center justify-center gap-2 font-black text-xs transition-all", manuscriptType === 'text' ? "bg-white/10 text-white" : "text-white/40")}>
                    <TypeIcon className="w-4 h-4" /> نص ديواني
                  </button>
                  <button onClick={() => setManuscriptType('image')} className={cn("flex-1 rounded-xl flex items-center justify-center gap-2 font-black text-xs transition-all", manuscriptType === 'image' ? "bg-white/10 text-white" : "text-white/40")}>
                    <ImageIcon className="w-4 h-4" /> صورة مفرغة
                  </button>
                </div>
                <Input 
                  placeholder="اكتب التسبيح أو الذكر..."
                  value={manuscriptInput}
                  onChange={(e) => setManuscriptInput(e.target.value)}
                  className="h-16 bg-white/5 border-white/10 rounded-2xl px-6 text-right text-lg focusable"
                />
                <Button onClick={handleAddManuscript} className="w-full h-16 bg-accent text-black font-black text-xl rounded-2xl shadow-xl focusable">
                  إضافة للمخطوطات السحابية
                </Button>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <ScrollArea className="h-[280px] pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
                    {customManuscripts.length === 0 ? (
                      <div className="col-span-full py-16 flex flex-col items-center justify-center gap-4 bg-red-500/5 border border-dashed border-red-500/20 rounded-[2rem]">
                        <AlertTriangle className="w-12 h-12 text-red-500/40" />
                        <p className="text-white/60 text-center font-bold px-8 leading-relaxed">المخطوطات لم تجلب بعد. يرجى المحاولة لاحقاً.</p>
                        <Button onClick={handleRefreshManuscripts} variant="outline" className="rounded-full border-red-500/20 text-red-400 hover:bg-red-500/10">إعادة محاولة الجلب</Button>
                      </div>
                    ) : (
                      customManuscripts.map((item) => (
                        <div key={item.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group transition-all hover:border-white/20">
                          <div className="flex-1 min-w-0 mr-2">
                            {item.type === 'text' ? (
                              <span className="font-calligraphy text-lg text-white truncate block">{item.content}</span>
                            ) : (
                              <img src={item.content} className="h-10 w-auto object-contain brightness-0 invert opacity-60" alt="" />
                            )}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeManuscript(item.id)} className="w-10 h-10 rounded-full bg-red-600/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all focusable">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="prayers" className="outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prayerSettings.map((prayer) => (
              <Card key={prayer.id} className="premium-glass p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="text-xl font-black text-white">{prayer.name}</h3>
                  </div>
                  {prayer.id !== 'sunrise' && prayer.id !== 'duha' && (
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-white/40 uppercase font-black">مدة الإقامة</span>
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-6 h-6 rounded-lg bg-white/5"
                          onClick={() => updatePrayerSetting(prayer.id, { iqamahDuration: Math.max(0, prayer.iqamahDuration - 1) })}
                        >
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                        <span className="text-lg font-black text-accent tabular-nums">{prayer.iqamahDuration}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="w-6 h-6 rounded-lg bg-white/5"
                          onClick={() => updatePrayerSetting(prayer.id, { iqamahDuration: prayer.iqamahDuration + 1 })}
                        >
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white/60">الإزاحة (بالدقائق)</span>
                    <div className="flex items-center gap-3 bg-black/20 p-1 rounded-xl border border-white/5">
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => updatePrayerSetting(prayer.id, { offsetMinutes: prayer.offsetMinutes - 1 })}><ChevronDown className="w-4 h-4" /></Button>
                      <span className="w-8 text-center font-black text-white tabular-nums">{prayer.offsetMinutes}</span>
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => updatePrayerSetting(prayer.id, { offsetMinutes: prayer.offsetMinutes + 1 })}><ChevronUp className="w-4 h-4" /></Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex flex-col gap-2 p-3 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-white/40 uppercase">نافذة التنازلي</span>
                        <Switch checked={prayer.showCountdown} onCheckedChange={(v) => updatePrayerSetting(prayer.id, { showCountdown: v })} />
                      </div>
                      <Input 
                        type="number" 
                        value={prayer.countdownWindow} 
                        onChange={(e) => updatePrayerSetting(prayer.id, { countdownWindow: parseInt(e.target.value) || 0 })}
                        className="h-8 bg-black/40 border-none text-center font-black text-sm rounded-lg"
                      />
                    </div>
                    <div className="flex flex-col gap-2 p-3 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-white/40 uppercase">نافذة التصاعدي</span>
                        <Switch checked={prayer.showCountup} onCheckedChange={(v) => updatePrayerSetting(prayer.id, { showCountup: v })} />
                      </div>
                      <Input 
                        type="number" 
                        value={prayer.countupWindow} 
                        onChange={(e) => updatePrayerSetting(prayer.id, { countupWindow: parseInt(e.target.value) || 0 })}
                        className="h-8 bg-black/40 border-none text-center font-black text-sm rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reminders" className="grid grid-cols-1 lg:grid-cols-12 gap-8 outline-none">
          <div className="lg:col-span-6 space-y-8">
            <Card className="premium-glass p-10 space-y-6">
              <CardTitle className="text-2xl font-black text-white">{editingId ? "تعديل التذكير" : "إضافة تذكير يدوي"}</CardTitle>
              <div className="space-y-6">
                <Input placeholder="اسم التذكير..." className="bg-white/5 border-white/10 h-14 rounded-2xl px-6 text-right text-xl focusable" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
                <div className="grid grid-cols-2 gap-6">
                  <Select value={form.relativePrayer} onValueChange={(v) => setForm({ ...form, relativePrayer: v as any })}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-14 rounded-2xl focusable"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      {RELATIVE_PRAYER_OPTIONS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {form.relativePrayer === 'manual' ? (
                    <Input type="time" className="bg-white/5 border-white/10 h-14 rounded-2xl px-6 text-center text-xl focusable" value={form.manualTime} onChange={(e) => setForm({ ...form, manualTime: e.target.value })} />
                  ) : (
                    <Input type="number" placeholder="إزاحة..." className="bg-white/5 border-white/10 h-14 rounded-2xl px-6 text-center text-xl focusable" value={form.offsetMinutes} onChange={(e) => setForm({ ...form, offsetMinutes: parseInt(e.target.value) || 0 })} />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-8 py-4 border-y border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-white/40">العد التنازلي (-)</label>
                    <Switch checked={form.showCountdown} onCheckedChange={(v) => setForm({...form, showCountdown: v})} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-white/40">العد التصاعدي (+)</label>
                    <Switch checked={form.showCountup} onCheckedChange={(v) => setForm({...form, showCountup: v})} />
                  </div>
                </div>
                <Button onClick={handleSubmitReminder} className="w-full h-16 bg-primary text-white font-black text-2xl rounded-2xl shadow-xl focusable">حفظ التذكير</Button>
              </div>
            </Card>
          </div>
          <div className="lg:col-span-6 space-y-6 overflow-y-auto max-h-[600px] pr-2 no-scrollbar">
            {reminders.map((r) => {
              const baseColor = r.color || 'text-blue-400';
              return (
                <Card key={r.id} className="premium-glass p-6 group relative overflow-hidden">
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-6">
                      <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center border-2 transition-all", baseColor.replace('text-', 'bg-').split(' ')[0] + '/10', baseColor.replace('text-', 'border-').split(' ')[0] + '/20')}>
                        <Bell className={cn("w-8 h-8", baseColor)} />
                      </div>
                      <div className="flex flex-col gap-1 text-right">
                        <h3 className="font-black text-2xl text-white">{r.label}</h3>
                        <span className="text-[10px] font-black text-white/40 uppercase">{r.relativePrayer === 'manual' ? r.manualTime : `${RELATIVE_PRAYER_OPTIONS.find(p => p.id === r.relativePrayer)?.name} (${r.offsetMinutes >= 0 ? '+' : ''}${r.offsetMinutes})`}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(r)} className="w-14 h-14 rounded-full bg-white/5 focusable"><Edit2 className="w-6 h-6" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => removeReminder(r.id)} className="w-14 h-14 rounded-full bg-red-600/10 text-red-500 focusable"><Trash2 className="w-6 h-6" /></Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="football" className="outline-none space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-8">
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
                    <Search className="w-6 h-6 text-primary" />
                    البحث عن أندية عالمية (فلترة الدوري)
                  </CardTitle>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Global Club Database</p>
                </div>
                
                <div className="flex flex-col gap-4">
                  <div className="flex gap-3">
                    <Select value={searchLeagueId} onValueChange={setSearchLeagueId}>
                      <SelectTrigger className="w-48 bg-white/5 border-white/10 h-16 rounded-2xl text-right focusable">
                        <SelectValue placeholder="الدوري..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        <SelectItem value="all">كل الدوريات</SelectItem>
                        {MAJOR_LEAGUES.map(l => (
                          <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input 
                      placeholder="اسم النادي..." 
                      value={clubSearch} 
                      onChange={(e) => setClubSearch(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch()} 
                      className="h-16 bg-white/5 border-white/10 rounded-2xl px-8 text-right text-xl flex-1 focusable" 
                    />
                    <Button onClick={handleGlobalSearch} disabled={isSearching} className="h-16 w-16 bg-primary rounded-2xl shadow-xl focusable">
                      {isSearching ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Search className="w-8 h-8" />}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                  {searchResults.map((team: any) => {
                    const fav = isFavTeam(team.team.id);
                    return (
                      <div 
                        key={team.team.id} 
                        onClick={() => toggleFavoriteTeam({ id: team.team.id, name: team.team.name, logo: team.team.logo })}
                        className={cn(
                          "p-4 rounded-[2rem] border transition-all cursor-pointer flex flex-col items-center gap-3 focusable",
                          fav ? "bg-primary/20 border-primary shadow-glow" : "bg-white/5 border-white/10 hover:bg-white/10"
                        )}
                      >
                        <div className="relative w-16 h-16">
                          <img src={team.team.logo} alt="" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-[10px] font-black text-center line-clamp-1">{team.team.name}</span>
                        {fav ? <Star className="w-4 h-4 text-yellow-500 fill-current" /> : <Plus className="w-4 h-4 text-white/40" />}
                      </div>
                    );
                  })}
                </div>
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
