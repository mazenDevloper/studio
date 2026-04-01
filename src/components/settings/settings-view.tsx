
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
  ImageIcon,
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
  FileCode,
  Sparkles,
  Timer,
  Save
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
  "https://images.unsplash.com/photo-1446776811953-bd23d57bd21aa",
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

const ICON_OPTIONS = [
  { id: 'bell', icon: Bell },
  { id: 'play', icon: RefreshCw },
  { id: 'circle', icon: Database },
];

const COLOR_OPTIONS = [
  { id: 'text-blue-400', class: 'bg-blue-400' },
  { id: 'text-emerald-400', class: 'bg-emerald-400' },
  { id: 'text-orange-400', class: 'bg-orange-400' },
  { id: 'text-red-400', class: 'bg-red-400' },
  { id: 'text-purple-400', class: 'bg-purple-400' },
  { id: 'text-accent', class: 'bg-accent' },
];

export function SettingsView() {
  // ATOMIC SELECTORS TO PREVENT TypeError
  const addReminder = useMediaStore(s => s.addReminder);
  const updateReminder = useMediaStore(s => s.updateReminder);
  const removeReminder = useMediaStore(s => s.removeReminder);
  const reminders = useMediaStore(s => s.reminders);
  const mapSettings = useMediaStore(s => s.mapSettings);
  const updateMapSettings = useMediaStore(s => s.updateMapSettings);
  const favoriteTeams = useMediaStore(s => s.favoriteTeams);
  const toggleFavoriteTeam = useMediaStore(s => s.toggleFavoriteTeam);
  const favoriteLeagueIds = useMediaStore(s => s.favoriteLeagueIds);
  const toggleFavoriteLeague = useMediaStore(s => s.toggleFavoriteLeague);
  const clubsCache = useMediaStore(s => s.clubsCache);
  const isClubsLoading = useMediaStore(s => s.isClubsLoading);
  const customWallBackgrounds = useMediaStore(s => s.customWallBackgrounds);
  const prayerSettings = useMediaStore(s => s.prayerSettings);
  const updatePrayerSetting = useMediaStore(s => s.updatePrayerSetting);
  const customManuscripts = useMediaStore(s => s.customManuscripts);
  const addManuscript = useMediaStore(s => s.addManuscript);
  const removeManuscript = useMediaStore(s => s.removeManuscript);
  const addCustomWallBackground = useMediaStore(s => s.addCustomWallBackground);
  const removeCustomWallBackground = useMediaStore(s => s.removeCustomWallBackground);
  
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [localBgUrl, setLocalBgUrl] = useState(mapSettings.manuscriptBgUrl || "");
  const [exhaustedKeys, setExhaustedKeys] = useState(0);
  
  const [form, setForm] = useState<Partial<Reminder>>({
    label: "",
    relativePrayer: "manual",
    manualTime: "08:00",
    offsetMinutes: 0,
    showCountdown: true,
    countdownWindow: 15,
    showCountup: true,
    countupWindow: 15,
    color: "text-blue-400",
    iconType: "bell"
  });

  const [manuscriptInput, setManuscriptInput] = useState("");
  const [manuscriptType, setManuscriptType] = useState<'text' | 'image'>('text');

  const [clubSearch, setClubSearch] = useState("");

  useEffect(() => {
    setLocalBgUrl(mapSettings.manuscriptBgUrl);
    setExhaustedKeys(getExhaustedKeysCount());
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

  const filteredClubsResults = useMemo(() => {
    if (!clubsCache) return [];
    return clubsCache.filter(item => 
      item.team.name.toLowerCase().includes(clubSearch.toLowerCase())
    );
  }, [clubsCache, clubSearch]);

  const handleApplyBackground = () => {
    if (!localBgUrl.trim()) return;
    if (typeof updateMapSettings === 'function') updateMapSettings({ manuscriptBgUrl: localBgUrl });
    if (typeof addCustomWallBackground === 'function') addCustomWallBackground(localBgUrl);
    toast({ title: "تم الحفظ سحابياً", description: "تم تحديث خلفية حائط المخطوطة ومزامنتها بنجاح." });
  };

  const handleResetKeys = () => {
    resetYoutubeBlacklist();
    setExhaustedKeys(0);
    toast({ title: "تمت التصفية", description: "تمت إزالة كافة مفاتيح YouTube من القائمة السوداء بنجاح." });
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
      countdownWindow: form.countdownWindow || 15,
      showCountup: form.showCountup ?? true,
      countupWindow: form.countupWindow || 15,
      completed: false,
      color: form.color || 'text-blue-400',
      iconType: (form.iconType as any) || 'bell',
    };
    
    if (editingId) {
      if (typeof updateReminder === 'function') {
        updateReminder(editingId, reminderData);
        setEditingId(null);
        toast({ title: "تم التعديل", description: "تم تحديث التذكير ومزامنته سحابياً." });
      }
    } else {
      if (typeof addReminder === 'function') {
        addReminder(reminderData);
        toast({ title: "تمت الإضافة", description: "تمت إضافة التذكير ومزامنته سحابياً." });
      }
    }
    
    setForm({ 
      label: "", relativePrayer: "manual", manualTime: "08:00", 
      offsetMinutes: 0, showCountdown: true, countdownWindow: 15, 
      showCountup: true, countupWindow: 15, color: "text-blue-400", 
      iconType: "bell" 
    });
  };

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
                  <button key={idx} onClick={() => updateMapSettings({ backgroundIndex: idx })} className={cn("relative rounded-2xl overflow-hidden border-4 focusable", mapSettings.backgroundIndex === idx ? "border-primary scale-105 shadow-glow" : "border-transparent opacity-40")}>
                    <img src={`${bg}?auto=format&fit=crop&q=40&w=300`} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <Card className="premium-glass p-10 space-y-8">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-amber-400" />
                إدارة المخطوطات والورد (Manuscripts)
              </CardTitle>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Cloud Synchronized Manuscripts Hub</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4 space-y-6 bg-white/5 p-8 rounded-[2.5rem] border border-white/5">
                <h3 className="text-lg font-black text-white mb-4">إضافة مخطوطة سحابية</h3>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button onClick={() => setManuscriptType('text')} className={cn("flex-1 h-12 rounded-xl focusable", manuscriptType === 'text' ? "bg-primary" : "bg-white/5 opacity-40")}>نص</Button>
                    <Button onClick={() => setManuscriptType('image')} className={cn("flex-1 h-12 rounded-xl focusable", manuscriptType === 'image' ? "bg-primary" : "bg-white/5 opacity-40")}>صورة</Button>
                  </div>
                  <textarea 
                    placeholder={manuscriptType === 'text' ? "ادخل نص الورد أو الذكر..." : "ادخل رابط الصورة المباشر..."}
                    value={manuscriptInput}
                    onChange={(e) => setManuscriptInput(e.target.value)}
                    className="w-full min-h-[120px] bg-black/40 border-white/10 rounded-xl p-4 text-white text-right text-sm focusable"
                  />
                  <Button onClick={() => {
                    if (manuscriptInput.trim()) {
                      addManuscript({ id: Math.random().toString(36).substr(2, 9), type: manuscriptType, content: manuscriptInput });
                      setManuscriptInput("");
                      toast({ title: "تم الحفظ", description: "تمت إضافة المخطوطة سحابياً." });
                    }
                  }} className="w-full h-14 bg-amber-600 text-white font-black rounded-xl shadow-glow focusable">حفظ سحابي</Button>
                </div>
              </div>
              <div className="lg:col-span-8">
                <ScrollArea className="h-[450px] pr-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-10">
                    {customManuscripts.map((m) => (
                      <div key={m.id} className="bg-white/5 p-6 rounded-2xl border border-white/5 flex flex-col justify-between min-h-[180px] group">
                        <div className="flex-1 flex items-center justify-center overflow-hidden">
                          {m.type === 'text' ? <p className="font-calligraphy text-2xl text-white text-center leading-relaxed">{m.content}</p> : <img src={m.content} className="max-h-32 w-auto object-contain" />}
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{m.type}</span>
                          <Button variant="ghost" size="icon" onClick={() => removeManuscript(m.id)} className="w-9 h-9 rounded-full bg-red-600/10 text-red-500 focusable opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></Button>
                        </div>
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
                  <span className="text-xl font-black text-white block border-b border-white/5 pb-4">{s.name}</span>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-white/40">
                        <span>إزاحة الوقت</span>
                        <span className="text-primary">{s.offsetMinutes} د</span>
                      </div>
                      <Slider value={[s.offsetMinutes]} min={-30} max={30} step={1} onValueChange={([v]) => updatePrayerSetting(s.id, { offsetMinutes: v })} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-white/40">
                        <span>مدة الإقامة</span>
                        <span className="text-accent">{s.iqamahDuration} د</span>
                      </div>
                      <Slider value={[s.iqamahDuration]} min={0} max={45} step={1} onValueChange={([v]) => updatePrayerSetting(s.id, { iqamahDuration: v })} />
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
                إدارة التذكيرات الذكية (Cloud Management)
              </CardTitle>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Master Notification Hub</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-5 space-y-6 bg-white/5 p-8 rounded-[3rem] border border-white/5">
                <h3 className="text-xl font-black text-white mb-4">{editingId ? 'تعديل تذكير سحابي' : 'إضافة تذكير جديد'}</h3>
                <div className="space-y-6">
                  <Input placeholder="نص التذكير..." value={form.label} onChange={(e) => setForm({...form, label: e.target.value})} className="h-14 bg-black/40 border-white/10 rounded-xl px-6 focusable" />
                  <div className="grid grid-cols-2 gap-4">
                    <Select value={form.relativePrayer} onValueChange={(v) => setForm({...form, relativePrayer: v as any})}>
                      <SelectTrigger className="h-14 bg-black/40 border-white/10 rounded-xl focusable"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        {RELATIVE_PRAYER_OPTIONS.map(opt => <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={form.iconType} onValueChange={(v) => setForm({...form, iconType: v as any})}>
                      <SelectTrigger className="h-14 bg-black/40 border-white/10 rounded-xl focusable"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        {ICON_OPTIONS.map(opt => <SelectItem key={opt.id} value={opt.id}>{opt.id}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.relativePrayer === 'manual' ? (
                    <Input type="time" value={form.manualTime} onChange={(e) => setForm({...form, manualTime: e.target.value})} className="h-14 bg-black/40 border-white/10 rounded-xl px-6 focusable" />
                  ) : (
                    <div className="space-y-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-white/40 mb-2">
                        <span>إزاحة الوقت</span>
                        <span className="text-primary">{form.offsetMinutes} د</span>
                      </div>
                      <Slider value={[form.offsetMinutes || 0]} min={-120} max={120} step={1} onValueChange={([v]) => setForm({...form, offsetMinutes: v})} />
                    </div>
                  )}
                  <Button onClick={handleSubmitReminder} className="w-full h-16 bg-primary text-white font-black text-xl rounded-2xl shadow-glow focusable">
                    <Save className="w-6 h-6 ml-3" /> {editingId ? 'تحديث التذكير سحابياً' : 'حفظ التذكير سحابياً'}
                  </Button>
                </div>
              </div>
              <div className="lg:col-span-7">
                <ScrollArea className="h-[600px] pr-4">
                  <div className="flex flex-col gap-4 pb-10">
                    {reminders.map((r) => (
                      <div key={r.id} className="bg-white/5 p-6 rounded-2xl border border-white/5 flex items-center justify-between group">
                        <div className="flex items-center gap-6">
                          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border", r.color.replace('text', 'bg').replace('400', '500') + '/20')}>
                            <Bell className={cn("w-7 h-7", r.color)} />
                          </div>
                          <span className="text-xl font-black text-white">{r.label}</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          <Button variant="ghost" size="icon" onClick={() => { setForm(r); setEditingId(r.id); }} className="w-12 h-12 rounded-full bg-white/5 focusable"><Edit2 className="w-5 h-5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => removeReminder(r.id)} className="w-12 h-12 rounded-full bg-red-600/10 text-red-500 focusable"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="football" className="outline-none space-y-12">
          <Card className="premium-glass p-8 space-y-6">
            <CardTitle className="text-2xl font-black text-white flex items-center gap-3"><Trophy className="w-6 h-6 text-accent" /> تتبع الدوريات الكبرى</CardTitle>
            <div className="grid grid-cols-2 gap-3">
              {MAJOR_LEAGUES.map(league => {
                const isFav = favoriteLeagueIds.includes(league.id);
                return (
                  <Button key={league.id} variant="outline" onClick={() => toggleFavoriteLeague(league.id)} className={cn("h-14 rounded-2xl border font-black text-xs justify-between px-6 focusable", isFav ? "bg-accent/20 border-accent text-accent" : "bg-white/5 border-white/10 text-white/40")}>
                    {league.name}
                    {isFav ? <Star className="w-4 h-4 fill-current" /> : <Plus className="w-4 h-4" />}
                  </Button>
                );
              })}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
