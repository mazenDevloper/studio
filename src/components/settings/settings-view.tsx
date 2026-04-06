
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useMediaStore, Reminder, Manuscript, AppAction } from "@/lib/store";
import { 
  Settings, Bell, Trash2, Edit2, Trophy, Search, Star, RefreshCw, Plus, Globe, Zap, Clock,
  ChevronDown, ChevronUp, ImageIcon, Type as TypeIcon, Monitor, Database, Loader2, Gamepad2, Keyboard,
  MousePointer2, Tv, SkipForward, SkipBack, Bookmark, LayoutGrid, Maximize2, Minimize2, Save, Timer,
  Palette, Grid, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn, normalizeKey } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { MAJOR_LEAGUES } from "@/lib/football-data";
import { searchFootballTeams } from "@/lib/football-api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

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

const BUTTON_ACTION_CATEGORIES = [
  {
    title: 'أزرار التنقل الأساسية',
    items: [
      { id: 'nav_up', label: 'للأعلى (Up)', icon: ChevronUp },
      { id: 'nav_down', label: 'للأسفل (Down)', icon: ChevronDown },
      { id: 'nav_left', label: 'يسار (Left)', icon: ChevronLeft },
      { id: 'nav_right', label: 'يمين (Right)', icon: ChevronRight },
      { id: 'nav_ok', label: 'موافق / إدخال (OK/Enter)', icon: MousePointer2 },
      { id: 'nav_back', label: 'رجوع (Back)', icon: X },
    ]
  },
  {
    title: 'تحكم المشغل (أثناء العمل)',
    items: [
      { id: 'player_next', label: 'القناة التالية', icon: SkipForward },
      { id: 'player_prev', label: 'القناة السابقة', icon: SkipBack },
      { id: 'player_save', label: 'حفظ الفيديو', icon: Bookmark },
      { id: 'player_fullscreen', label: 'تبديل ملء الشاشة (Cinema)', icon: Maximize2 },
      { id: 'player_playlist', label: 'إظهار/إخفاء القائمة', icon: LayoutGrid },
      { id: 'player_minimize', label: 'تصغير المشغل (Minimize)', icon: Minimize2 },
      { id: 'player_close', label: 'إغلاق المشغل (Close)', icon: X },
    ]
  },
  {
    title: 'اختصارات التطبيقات',
    items: [
      { id: 'goto_home', label: 'الرئيسية (Home)', icon: Monitor },
      { id: 'goto_media', label: 'الميديا (Media)', icon: Globe },
      { id: 'goto_quran', label: 'القرآن (Quran)', icon: Database },
      { id: 'goto_hihi2', label: 'هاي كورة (Hihi2)', icon: Trophy },
      { id: 'goto_iptv', label: 'البث المباشر (IPTV)', icon: Tv },
      { id: 'goto_football', label: 'كووورة (Football)', icon: Trophy },
      { id: 'goto_settings', label: 'الإعدادات (Settings)', icon: Settings },
    ]
  }
];

function X({ className }: { className?: string }) { 
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

function ChevronLeft({ className }: { className?: string }) { return <ChevronDown className={cn(className, "rotate-90")} />; }
function ChevronRight({ className }: { className?: string }) { return <ChevronDown className={cn(className, "-rotate-90")} />; }

export function SettingsView() {
  const { 
    addReminder, updateReminder, removeReminder, reminders,
    mapSettings, updateMapSettings, prayerSettings, updatePrayerSetting,
    customManuscripts, addManuscript, removeManuscript,
    keyMappings, setKeyMapping, clearKeyMappings,
    favoriteTeams, toggleFavoriteTeam, favoriteLeagueIds, toggleFavoriteLeague,
    customWallBackgrounds, addCustomWallBackground, removeCustomWallBackground
  } = useMediaStore();
  
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mappingAction, setMappingAction] = useState<AppAction | null>(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [teamResults, setTeamResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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
  const [bgUrlInput, setBgUrlInput] = useState("");

  useEffect(() => {
    if (!mappingAction) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      const normalized = normalizeKey(e);
      setKeyMapping(mappingAction, normalized);
      setMappingAction(null);
      toast({ title: "تم البرمجة", description: `تم تعيين الزر [${normalized}] للوظيفة المحددة بنجاح.` });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mappingAction, setKeyMapping, toast]);

  const handleSearchTeams = async () => {
    if (!teamSearch.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchFootballTeams(teamSearch);
      setTeamResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmitReminder = () => {
    if (!form.label?.trim()) return;
    const data: Reminder = {
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
      updateReminder(editingId, data);
      setEditingId(null);
      toast({ title: "تم التعديل", description: "تم تحديث التذكير سحابياً." });
    } else {
      addReminder(data);
      toast({ title: "تمت الإضافة", description: "تمت إضافة التذكير سحابياً." });
    }
    setForm({ label: "", relativePrayer: "manual", manualTime: "08:00", offsetMinutes: 0, showCountdown: true, countdownWindow: 15, showCountup: true, countupWindow: 15, color: "text-blue-400", iconType: "bell" });
  };

  const allBackgrounds = useMemo(() => {
    return [
      ...STATIC_WALL_BACKGROUNDS, 
      ...customWallBackgrounds.map((url, i) => ({ id: `custom-bg-${i}`, name: `خلفية مخصصة ${i+1}`, url, isCustom: true }))
    ];
  }, [customWallBackgrounds]);

  const handleAddBackground = () => {
    if (!bgUrlInput.trim()) return;
    addCustomWallBackground(bgUrlInput);
    setBgUrlInput("");
    toast({ title: "تمت الإضافة", description: "تمت إضافة الخلفية المخصصة بنجاح." });
  };

  return (
    <div className="p-12 space-y-12 max-w-7xl mx-auto pb-40 animate-in fade-in duration-700 text-right dir-rtl relative">
      {mappingAction && (
        <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-3xl flex items-center justify-center animate-in fade-in duration-500">
          <div className="text-center space-y-8 max-w-md p-12 bg-white/5 rounded-[3rem] border border-white/10 shadow-glow">
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center mx-auto animate-bounce"><Keyboard className="w-12 h-12 text-white" /></div>
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-white tracking-tighter">برمجة زر جديد</h2>
              <p className="text-xl text-primary font-bold">يرجى الضغط الآن على الزر الذي تريد استخدامه لهذه الوظيفة</p>
            </div>
            <Button variant="ghost" onClick={() => setMappingAction(null)} className="text-white/40 hover:text-white mt-4 focusable">إلغاء العملية</Button>
          </div>
        </div>
      )}

      <header className="flex flex-col gap-4">
        <h1 className="text-6xl font-black font-headline text-white tracking-tighter flex items-center gap-6">
          مركز التحكم <Settings className="w-12 h-12 text-primary animate-spin-slow" />
        </h1>
        <p className="text-white/40 font-bold uppercase tracking-[0.6em] text-sm">System Configuration & Detailed Preferences</p>
      </header>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="bg-white/5 p-1 rounded-full border border-white/10 h-16 mb-12 flex justify-start w-fit">
          <TabsTrigger value="appearance" className="rounded-full px-10 h-full data-[state=active]:bg-primary font-bold text-lg focusable">المظهر</TabsTrigger>
          <TabsTrigger value="football" className="rounded-full px-10 h-full data-[state=active]:bg-primary font-bold text-lg focusable">كرة القدم</TabsTrigger>
          <TabsTrigger value="prayers" className="rounded-full px-10 h-full data-[state=active]:bg-primary font-bold text-lg focusable">الصلوات</TabsTrigger>
          <TabsTrigger value="reminders" className="rounded-full px-10 h-full data-[state=active]:bg-primary font-bold text-lg focusable">التذكيرات</TabsTrigger>
          <TabsTrigger value="buttonmap" className="rounded-full px-10 h-full data-[state=active]:bg-primary font-bold text-lg focusable">برمجة الأزرار</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-12">
          <div className="grid grid-cols-1 gap-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="premium-glass p-8 space-y-8">
                <CardTitle className="text-2xl font-black text-white flex items-center gap-3"><Monitor className="w-6 h-6 text-primary" />عرض الشاشة</CardTitle>
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center"><span className="text-sm font-black text-white/60">مقياس الواجهة الذكية</span><span className="text-primary font-black">{Math.round((mapSettings.displayScale ?? 1.0) * 100)}%</span></div>
                    <Slider value={[mapSettings.displayScale ?? 1.0]} min={0.5} max={1.5} step={0.05} onValueChange={([v]) => updateMapSettings({ displayScale: v })} />
                  </div>
                  <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5">
                    <div className="space-y-1"><h4 className="text-lg font-bold text-white">خلفية لوحة الأذكار</h4><p className="text-xs text-white/40">إظهار الصور الفنية خلف نصوص الأذكار</p></div>
                    <Switch checked={mapSettings.showManuscriptBg} onCheckedChange={(v) => updateMapSettings({ showManuscriptBg: v })} />
                  </div>
                </div>
              </Card>

              <Card className="premium-glass p-8 space-y-8">
                <CardTitle className="text-2xl font-black text-white flex items-center gap-3"><ImageIcon className="w-6 h-6 text-primary" />إضافة محتوى جديد</CardTitle>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <Input placeholder={manuscriptType === 'text' ? "أدخل نص الذكر أو الحكمة..." : "أدخل رابط صورة المخطوطة..."} value={manuscriptInput} onChange={(e) => setManuscriptInput(e.target.value)} className="h-14 bg-black/40 border-white/10 rounded-xl px-6 focusable text-white text-right flex-1" />
                    <Button onClick={() => { if(manuscriptInput) { addManuscript({ id: Date.now().toString(), type: manuscriptType, content: manuscriptInput }); setManuscriptInput(""); toast({title: "تمت الإضافة"}); } }} className="h-14 w-14 bg-primary rounded-xl focusable"><Plus className="w-6 h-6" /></Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant={manuscriptType === 'text' ? 'default' : 'outline'} onClick={() => setManuscriptType('text')} className="flex-1 rounded-xl h-12 focusable">نصي</Button>
                    <Button variant={manuscriptType === 'image' ? 'default' : 'outline'} onClick={() => setManuscriptType('image')} className="flex-1 rounded-xl h-12 focusable">صورة</Button>
                  </div>
                </div>
              </Card>
            </div>

            <section className="space-y-6">
              <h3 className="text-2xl font-black text-white flex items-center gap-3"><TypeIcon className="w-6 h-6 text-primary" />المخطوطات الحالية</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {customManuscripts.map((m, idx) => (
                  <div key={m.id} className="group relative bg-white/5 rounded-[2rem] border border-white/10 overflow-hidden focusable h-48 flex items-center justify-center p-4 transition-all hover:bg-white/10" tabIndex={0} data-nav-id={`manuscript-item-${idx}`}>
                    {m.type === 'text' ? (
                      <p className="font-calligraphy text-xl text-white text-center line-clamp-3">{m.content}</p>
                    ) : (
                      <img src={m.content} className="w-full h-full object-contain" alt="" />
                    )}
                    <button 
                      onClick={() => removeManuscript(m.id)}
                      className="absolute top-4 left-4 w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all focusable"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-white flex items-center gap-3"><Palette className="w-6 h-6 text-primary" />خلفيات اللوحة</h3>
                <div className="flex gap-3 w-full max-w-md">
                  <Input placeholder="رابط خلفية مخصصة..." value={bgUrlInput} onChange={(e) => setBgUrlInput(e.target.value)} className="bg-white/5 border-white/10 h-12 rounded-xl text-right focusable" />
                  <Button onClick={handleAddBackground} className="bg-primary h-12 rounded-xl focusable px-6"><Upload className="w-5 h-5 ml-2" /> رفع</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {allBackgrounds.map((bg, idx) => (
                  <div 
                    key={bg.id} 
                    onClick={() => updateMapSettings({ manuscriptBgUrl: bg.url })}
                    className={cn(
                      "group relative rounded-[2rem] overflow-hidden focusable h-40 cursor-pointer border-4 transition-all",
                      mapSettings.manuscriptBgUrl === bg.url ? "border-primary shadow-glow scale-105" : "border-white/5 opacity-60 hover:opacity-100"
                    )}
                    tabIndex={0}
                    data-nav-id={`bg-item-${idx}`}
                  >
                    <Image src={bg.url} alt={bg.name} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                      <span className="text-xs font-black text-white">{bg.name}</span>
                    </div>
                    {mapSettings.manuscriptBgUrl === bg.url && (
                      <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        <Save className="w-4 h-4 text-white" />
                      </div>
                    )}
                    {(bg as any).isCustom && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeCustomWallBackground(bg.url); }}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="football" className="space-y-8">
          <Card className="premium-glass p-8 space-y-8">
            <CardTitle className="text-2xl font-black text-white flex items-center gap-3"><Trophy className="w-6 h-6 text-primary" />تخصيص مركز كووورة</CardTitle>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h3 className="text-xl font-black text-primary border-b border-primary/20 pb-2">الدوريات المفضلة</h3>
                <div className="grid grid-cols-2 gap-3">
                  {MAJOR_LEAGUES.map((league, idx) => (
                    <div key={league.id} onClick={() => toggleFavoriteLeague(league.id)} data-nav-id={`league-item-${idx}`} className={cn("p-4 rounded-xl border transition-all cursor-pointer focusable flex items-center gap-3", favoriteLeagueIds.includes(league.id) ? "bg-primary/20 border-primary text-white" : "bg-white/5 border-white/5 text-white/40")} tabIndex={0}>
                      <div className={cn("w-2 h-2 rounded-full", favoriteLeagueIds.includes(league.id) ? "bg-primary animate-pulse" : "bg-white/10")} />
                      <span className="text-sm font-bold">{league.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <h3 className="text-xl font-black text-primary border-b border-primary/20 pb-2">الأندية والمنتخبات</h3>
                <div className="flex gap-3">
                  <Input placeholder="بحث عن فريق..." value={teamSearch} onChange={(e) => setTeamSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearchTeams()} className="h-14 bg-black/40 border-white/10 rounded-xl px-6 focusable text-white text-right flex-1" />
                  <Button onClick={handleSearchTeams} disabled={isSearching} className="h-14 w-14 bg-primary rounded-xl focusable">{isSearching ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}</Button>
                </div>
                <ScrollArea className="h-64 rounded-2xl bg-white/5 p-4 border border-white/5">
                  <div className="grid grid-cols-1 gap-2">
                    {teamResults.map((tr, idx) => (
                      <div key={tr.team.id} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5 hover:border-primary transition-all">
                        <div className="flex items-center gap-4"><img src={tr.team.logo} className="w-8 h-8 object-contain" alt="" /><span className="font-bold text-white text-sm">{tr.team.name}</span></div>
                        <Button variant="ghost" onClick={() => toggleFavoriteTeam({ id: tr.team.id, name: tr.team.name, logo: tr.team.logo })} className={cn("rounded-full focusable h-10 px-6", favoriteTeams.some(t => t.id === tr.team.id) ? "bg-yellow-500/20 text-yellow-500" : "text-white/40")}>
                          {favoriteTeams.some(t => t.id === tr.team.id) ? <Star className="w-4 h-4 fill-current" /> : <Plus className="w-4 h-4" />}
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="prayers" className="space-y-8">
          <Card className="premium-glass p-8 space-y-8">
            <CardTitle className="text-2xl font-black text-white flex items-center gap-3"><Clock className="w-6 h-6 text-primary" />أوقات الصلوات والاقامة</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {prayerSettings.map((ps, idx) => (
                <div key={ps.id} className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 space-y-6 focusable" tabIndex={0} data-nav-id={`prayer-card-${idx}`}>
                  <div className="flex items-center justify-between border-b border-white/5 pb-4"><h3 className="text-2xl font-black text-primary">{ps.name}</h3><Timer className="w-6 h-6 text-white/20" /></div>
                  <div className="space-y-4">
                    <div className="space-y-2"><div className="flex justify-between text-xs font-black text-white/40 uppercase"><span>إزاحة الوقت</span><span>{ps.offsetMinutes > 0 ? `+${ps.offsetMinutes}` : ps.offsetMinutes} د</span></div><Slider value={[ps.offsetMinutes]} min={-60} max={60} step={1} onValueChange={([v]) => updatePrayerSetting(ps.id, { offsetMinutes: v })} /></div>
                    <div className="space-y-2"><div className="flex justify-between text-xs font-black text-white/40 uppercase"><span>الإقامة</span><span>{ps.iqamahDuration} د</span></div><Slider value={[ps.iqamahDuration]} min={0} max={60} step={1} onValueChange={([v]) => updatePrayerSetting(ps.id, { iqamahDuration: v })} /></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-8 outline-none">
          <Card className="premium-glass p-8 space-y-8">
            <CardTitle className="text-2xl font-black text-white flex items-center gap-3"><Bell className="w-6 h-6 text-primary" />التذكيرات الذكية</CardTitle>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-5 space-y-6 bg-white/5 p-8 rounded-[3rem] border border-white/5">
                <div className="space-y-6">
                  <Input placeholder="نص التذكير..." value={form.label} onChange={(e) => setForm({...form, label: e.target.value})} className="h-14 bg-black/40 border-white/10 rounded-xl px-6 focusable text-white text-right" data-nav-id="reminder-input-label" />
                  <div className="grid grid-cols-2 gap-4">
                    <Select value={form.relativePrayer} onValueChange={(v: any) => setForm({...form, relativePrayer: v})}>
                      <SelectTrigger className="h-12 rounded-xl focusable" data-nav-id="reminder-select-ref"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RELATIVE_PRAYER_OPTIONS.map(opt => <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {form.relativePrayer === 'manual' ? (
                      <Input type="time" value={form.manualTime} onChange={(e) => setForm({...form, manualTime: e.target.value})} className="h-12 bg-black/40 border-white/10 rounded-xl px-4 focusable" />
                    ) : (
                      <Input type="number" value={form.offsetMinutes} onChange={(e) => setForm({...form, offsetMinutes: parseInt(e.target.value)})} className="h-12 bg-black/40 border-white/10 rounded-xl px-4 focusable" />
                    )}
                  </div>
                  <Button onClick={handleSubmitReminder} className="w-full h-16 bg-primary text-white font-black text-xl rounded-2xl shadow-glow focusable" data-nav-id="reminder-submit-btn">
                    <Save className="w-6 h-6 ml-3" /> {editingId ? 'تحديث' : 'حفظ'}
                  </Button>
                </div>
              </div>
              <div className="lg:col-span-7">
                <ScrollArea className="h-[500px]">
                  <div className="flex flex-col gap-4">
                    {reminders.map((r, idx) => (
                      <div key={r.id} className="bg-white/5 p-6 rounded-2xl border border-white/5 flex items-center justify-between group focusable" tabIndex={0} data-nav-id={`reminder-item-${idx}`}>
                        <div className="flex items-center gap-6"><div className={cn("w-12 h-12 rounded-full flex items-center justify-center bg-white/5 shadow-inner", r.color)}><Bell className="w-6 h-6" /></div><div className="flex flex-col"><span className="text-xl font-black text-white">{r.label}</span></div></div>
                        <div className="flex items-center gap-2"><Button variant="ghost" size="icon" onClick={() => { setForm(r); setEditingId(r.id); }} className="w-12 h-12 rounded-full focusable"><Edit2 className="w-5 h-5 text-white/40" /></Button><Button variant="ghost" size="icon" onClick={() => removeReminder(r.id)} className="w-12 h-12 rounded-full focusable"><Trash2 className="w-5 h-5 text-red-500/60" /></Button></div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="buttonmap" className="space-y-8 outline-none">
          <Card className="premium-glass p-8 space-y-8">
            <CardTitle className="text-2xl font-black text-white flex items-center gap-3"><Gamepad2 className="w-6 h-6 text-primary" />برمجة الأزرار</CardTitle>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {BUTTON_ACTION_CATEGORIES.map((cat, catIdx) => (
                <div key={catIdx} className="space-y-6">
                  <h3 className="text-xl font-black text-primary border-b border-primary/20 pb-2">{cat.title}</h3>
                  <div className="flex flex-col gap-3">
                    {cat.items.map((item, itemIdx) => (
                      <div key={item.id} onClick={() => setMappingAction(item.id as AppAction)} className={cn("w-full p-5 rounded-[1.5rem] bg-white/5 border border-white/5 hover:border-primary transition-all flex items-center justify-between focusable cursor-pointer", mappingAction === item.id && "border-primary bg-primary/10 shadow-glow")} tabIndex={0} data-nav-id={`keymap-${catIdx}-${itemIdx}`}>
                        <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><item.icon className="w-5 h-5 text-white/60" /></div><span className="font-bold text-white/80">{item.label}</span></div>
                        <div className="flex gap-2">
                          {keyMappings[item.id]?.map((k, kIdx) => (
                            <span key={kIdx} className="px-3 py-1 bg-primary/20 rounded-lg border border-primary/20 text-primary font-black text-xs">{k}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
