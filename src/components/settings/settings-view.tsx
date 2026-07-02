
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useMediaStore, Reminder, Manuscript, AppAction, MappingContext, IptvChannel, PrayerSetting } from "@/lib/store";
import { 
  Settings, Bell, Trash2, Edit2, Plus, Monitor, Palette, Keyboard, Clock, CheckCircle2, Save, BookOpen, LayoutGrid, Eye, Timer, Tv, ArrowRightLeft, Globe, Loader2, RefreshCw, Mic, ChevronUp, User, X, Type, PaintBucket, Upload, ChevronDown, MonitorPlay, Image as ImageIcon, Zap, Activity, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn, normalizeKey } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShortcutBadge } from "@/components/layout/car-dock";
import { getDisplayNumber as getGlobalDisplayNumber } from "@/lib/constants";
import Image from "next/image";

const FONTS_POOL = [
  { name: 'Inter', value: 'Inter' },
  { name: 'Amiri', value: 'Amiri' },
  { name: 'Aref Ruqaa', value: 'Aref Ruqaa' },
  { name: 'Reem Kufi', value: 'Reem Kufi' },
  { name: 'Alkalami', value: 'Alkalami' },
  { name: 'Gulzar', value: 'Gulzar' }
];

export function SettingsView() {
  const { 
    addReminder, removeReminder, updateReminder, reminders,
    mapSettings, updateMapSettings, prayerSettings, updatePrayerSetting,
    customManuscripts, addManuscript, updateManuscript, removeManuscript, reorderManuscript,
    keyMappings, setKeyMapping, removeSpecificKeyMapping,
    customWallBackgrounds, addCustomWallBackground, removeCustomWallBackground, autoHideIsland, setAutoHideIsland,
    displayScale, setDisplayScale, dockScale, setDockScale,
    setIsRecordingKey, favoriteIptvChannels, updateIptvChannel,
    favoriteReciters, removeReciter, updateReciter,
    syncMasterBin, isInitialLoading, fetchPriorityData,
    customFonts, addCustomFont, removeCustomFont, 
    customManuscriptColors,
    autoRefreshEnabled, setAutoRefreshEnabled, autoRefreshTimes, setAutoRefreshTimes
  } = useMediaStore();
  
  const { toast } = useToast();
  const fontInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const manuInputRef = useRef<HTMLInputElement>(null);

  const [editingReciterId, setEditingReciterId] = useState<string | null>(null);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [reciterNameInput, setReciterNameInput] = useState("");
  const [manuscriptInput, setManuscriptInput] = useState("");
  const [manuscriptType, setManuscriptType] = useState<'text' | 'image'>('text');
  const [ttfName, setTtfName] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [selectedContext, setSelectedContext] = useState<MappingContext>('global');
  const [recordingAction, setRecordingAction] = useState<AppAction | null>(null);

  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({
    label: "", relativePrayer: "manual", referencePoint: 'azan', manualTime: "12:00", offsetMinutes: 0, color: "text-blue-400", iconType: "bell", countdownWindow: 15, countupWindow: 15, expiryType: 'prayer', expiryReference: 'azan', expiryValue: 'next'
  });

  useEffect(() => {
    fetchPriorityData('all');
  }, []);

  const handleGlobalPush = async () => {
    setIsSyncing(true);
    try {
      await syncMasterBin();
      toast({ title: "تم الدفع العالمي بنجاح", description: "تم تحديث كافة الأجهزة المسجلة فوراً" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchPriorityData('all');
      toast({ title: "تم تحديث البيانات", description: "تم جلب أحدث نسخة من السحابة بنجاح" });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'font' | 'manuscript' | 'background') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (res) => {
      const dataUrl = res.target?.result as string;
      if (type === 'font') {
        const name = ttfName || file.name.replace(/\.[^/.]+$/, "");
        addCustomFont(name, dataUrl);
      } else if (type === 'manuscript') {
        addManuscript({ id: Date.now().toString(), type: 'image', content: dataUrl });
      } else if (type === 'background') {
        addCustomWallBackground(dataUrl);
        updateMapSettings({ manuscriptBgUrl: dataUrl });
      }
      toast({ title: "تم الرفع والمزامنة بنجاح" });
    };
    reader.readAsDataURL(file);
  };

  const addPresetReminders = () => {
    const presets: Reminder[] = [
      { id: 'rem-morning', label: "أذكار الصباح", relativePrayer: 'fajr', referencePoint: 'azan', offsetMinutes: 10, color: "text-orange-400", iconType: 'bell', completed: false, countdownWindow: 30, countupWindow: 120, expiryType: 'prayer', expiryValue: 'sunrise', showCountdown: true, showCountup: true },
      { id: 'rem-evening', label: "أذكار المساء", relativePrayer: 'asr', referencePoint: 'azan', offsetMinutes: 15, color: "text-blue-400", iconType: 'bell', completed: false, countdownWindow: 30, countupWindow: 120, expiryType: 'prayer', expiryValue: 'maghrib', showCountdown: true, showCountup: true },
      { id: 'rem-sunnah-fajr', label: "نافلة الفجر (القبلية)", relativePrayer: 'fajr', referencePoint: 'azan', offsetMinutes: 5, color: "text-emerald-400", iconType: 'play', completed: false, countdownWindow: 20, countupWindow: 25, expiryType: 'iqamah', expiryReference: 'azan', expiryValue: 'fajr', showCountdown: true, showCountup: true },
      { id: 'rem-sunnah-dhuhr-pre', label: "نافلة الظهر (القبلية)", relativePrayer: 'dhuhr', referencePoint: 'azan', offsetMinutes: 5, color: "text-emerald-400", iconType: 'play', completed: false, countdownWindow: 20, countupWindow: 20, expiryType: 'iqamah', expiryReference: 'azan', expiryValue: 'dhuhr', showCountdown: true, showCountup: true },
      { id: 'rem-witr', label: "صلاة الوتر والتهجد", relativePrayer: 'isha', referencePoint: 'azan', offsetMinutes: 45, color: "text-purple-400", iconType: 'bell', completed: false, countdownWindow: 120, countupWindow: 60, expiryType: 'prayer', expiryValue: 'fajr', showCountdown: true, showCountup: true },
    ];
    presets.forEach(p => addReminder(p));
    toast({ title: "تم إضافة التذكيرات الروحية والسنن" });
  };

  const handleSaveReminder = () => {
    if (!newReminder.label) { toast({ variant: "destructive", title: "خطأ", description: "يرجى إدخل وصف" }); return; }
    if (editingReminderId) {
      updateReminder(editingReminderId, newReminder);
      setEditingReminderId(null);
      toast({ title: "تم تحديث التذكير" });
    } else {
      const data = { ...newReminder, id: Date.now().toString() } as Reminder;
      addReminder(data);
      toast({ title: "تم الحفظ" });
    }
    setNewReminder({ label: "", relativePrayer: "manual", referencePoint: 'azan', manualTime: "12:00", offsetMinutes: 0, color: "text-blue-400", iconType: "bell", countdownWindow: 15, countupWindow: 15, expiryType: 'prayer', expiryReference: 'azan', expiryValue: 'next' });
  };

  const handleEditReminder = (rem: Reminder) => {
    setEditingReminderId(rem.id);
    setNewReminder(rem);
    document.querySelector('[value="reminders"]')?.scrollIntoView({ behavior: 'smooth' });
  };

  const allAvailableFonts = useMemo(() => {
    return [...FONTS_POOL, ...customFonts.map(f => ({ name: f.name, value: f.name }))];
  }, [customFonts]);

  useEffect(() => {
    if (!recordingAction) return;
    setIsRecordingKey(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault(); e.stopPropagation();
      const key = normalizeKey(e);
      setKeyMapping(selectedContext, recordingAction, key);
      setRecordingAction(null); 
      setIsRecordingKey(false);
      toast({ title: "تم التعيين", description: `تم ربط الزر ${key}` });
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => { 
      window.removeEventListener("keydown", handleKeyDown, true); 
      setIsRecordingKey(false);
    };
  }, [recordingAction, selectedContext, setKeyMapping, toast, setIsRecordingKey]);

  const actionLabels: Partial<Record<AppAction, string>> = {
    goto_home: "الذهاب للرئيسية", goto_media: "فتح الميديا", goto_quran: "فتح المصحف", goto_hihi2: "فتح Hihi2", goto_iptv: "فتح البث المباشر",
    goto_football: "فتح مركز كووورة", goto_settings: "فتح الإعدادات", player_next: "التالي", player_prev: "السابق", player_close: "إغلاق المشغل",
    player_fullscreen: "تبديل الشاشة", player_minimize: "تصغير/تكبير المشغل", player_save: "حفظ الفيديو", player_settings: "قائمة أزرار المشغل",
    nav_up: "تحريك للأعلى", nav_down: "تحريك للأسفل", nav_left: "تحريك لليمين", nav_right: "تحريك لليسار",
    nav_ok: "تأكيد / موافق", nav_back: "عودة للخلف", toggle_reorder: "وضع الترتيب", delete_item: "حذف عنصر", toggle_star: "تمييز بنجمة",
    inc_font: "تكبير خط المخطوطة (66)", dec_font: "تصغير خط المخطوطة (44)", next_manuscript: "المخطوطة التالية (88)", prev_manuscript: "المخطوطة السابقة (22)"
  };

  const contextLabels: Record<MappingContext, string> = {
    global: "العام (الأساسي)", player: "المشغل", dashboard: "الرئيسية", media: "الميديا", quran: "المصحف", football: "كرة القدم", iptv: "البث المباشر", settings: "الإعدادات"
  };

  return (
    <div className="p-12 space-y-12 max-w-7xl mx-auto pb-40 text-right dir-rtl transition-all duration-300">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-6xl font-black text-white tracking-tighter flex items-center gap-6">مركز التحكم <Settings className="w-12 h-12 text-primary animate-spin-slow" /></h1>
          <p className="text-white/40 font-bold uppercase tracking-[0.6em] text-sm">Autonomous System Hub v1100.0</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={handleManualRefresh} disabled={isRefreshing} className="bg-emerald-600 text-white border-none rounded-full h-14 px-8 font-black focusable shadow-glow">
            {isRefreshing ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <RefreshCw className="w-5 h-5 ml-2" />} تحديث محلي
          </Button>
          <Button onClick={handleGlobalPush} disabled={isSyncing || isInitialLoading} className="bg-primary text-white border-none rounded-full h-14 px-8 font-black focusable shadow-glow">
            {(isSyncing || isInitialLoading) ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Zap className="w-5 h-5 ml-2" />} دفع عالمي
          </Button>
        </div>
      </header>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="bg-white/5 p-1 rounded-full border border-white/10 h-16 mb-12 flex justify-around overflow-x-auto no-scrollbar">
          <TabsTrigger value="appearance" className="rounded-full px-8 h-full font-bold focusable relative">المظهر</TabsTrigger>
          <TabsTrigger value="automation" className="rounded-full px-8 h-full font-bold focusable relative">الأتمتة</TabsTrigger>
          <TabsTrigger value="prayers" className="rounded-full px-8 h-full font-bold focusable relative">الصلاة</TabsTrigger>
          <TabsTrigger value="reminders" className="rounded-full px-8 h-full font-bold focusable relative">التذكيرات</TabsTrigger>
          <TabsTrigger value="reciters" className="rounded-full px-8 h-full font-bold focusable relative">القراء</TabsTrigger>
          <TabsTrigger value="manuscripts" className="rounded-full px-8 h-full font-bold focusable relative">المخطوطات</TabsTrigger>
          <TabsTrigger value="iptv_channels" className="rounded-full px-8 h-full font-bold focusable relative">قنوات البث</TabsTrigger>
          <TabsTrigger value="buttonmap" className="rounded-full px-8 h-full font-bold focusable relative">الأزرار</TabsTrigger>
        </TabsList>

        <TabsContent value="reminders" className="space-y-6">
          <Card className="bg-white/5 border-white/10 p-8 rounded-[3rem]">
            <div className="flex justify-between items-center mb-8">
              <CardTitle className="text-2xl font-black text-white flex items-center gap-4"><Bell className="w-8 h-8 text-primary" />إدارة التذكيرات</CardTitle>
              <Button onClick={addPresetReminders} className="bg-purple-600/20 text-purple-400 border border-purple-500/40 rounded-full px-6 h-12 font-black focusable"><Sparkles className="w-4 h-4 ml-2" /> إضافة حزمة السنن والأذكار</Button>
            </div>
            
            <div className="flex flex-col gap-6 mb-8 p-8 bg-black/40 rounded-[2.5rem] border border-white/10">
              <div className="flex items-center justify-between gap-4">
                <Input placeholder="عنوان التذكير..." value={newReminder.label} onChange={(e) => setNewReminder({ ...newReminder, label: e.target.value })} className="h-14 bg-white/5 text-white text-xl font-bold flex-1" />
                <Select value={newReminder.color} onValueChange={(v) => setNewReminder({ ...newReminder, color: v })}>
                  <SelectTrigger className="w-32 h-14 bg-white/5 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-950 text-white"><SelectItem value="text-blue-400">أزرق</SelectItem><SelectItem value="text-orange-400">برتقالي</SelectItem><SelectItem value="text-emerald-400">أخضر</SelectItem><SelectItem value="text-purple-400">بنفسجي</SelectItem><SelectItem value="text-red-400">أحمر</SelectItem></SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 p-6 bg-white/5 rounded-2xl border border-white/5">
                  <h5 className="text-xs font-black text-primary uppercase tracking-widest">توقيت البداية</h5>
                  <div className="flex gap-3">
                    <Select value={newReminder.relativePrayer} onValueChange={(v) => setNewReminder({ ...newReminder, relativePrayer: v as any })}>
                      <SelectTrigger className="flex-1 h-12 bg-black/40 text-white"><SelectValue placeholder="المرجع..." /></SelectTrigger>
                      <SelectContent className="bg-zinc-950 text-white dir-rtl">
                        {prayerSettings.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        <SelectItem value="manual">وقت حر (يدوي)</SelectItem>
                      </SelectContent>
                    </Select>
                    {newReminder.relativePrayer !== 'manual' && (
                      <Select value={newReminder.referencePoint} onValueChange={(v) => setNewReminder({ ...newReminder, referencePoint: v as any })}>
                        <SelectTrigger className="w-32 h-12 bg-black/40 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-950 text-white dir-rtl"><SelectItem value="azan">الأذان</SelectItem><SelectItem value="iqamah">الإقامة</SelectItem></SelectContent>
                      </Select>
                    )}
                  </div>
                  {newReminder.relativePrayer === 'manual' ? (
                    <Input type="time" value={newReminder.manualTime} onChange={(e) => setNewReminder({ ...newReminder, manualTime: e.target.value })} className="h-12 bg-black/40 text-white" />
                  ) : (
                    <div className="flex items-center gap-3">
                      <Input type="number" value={Math.abs(newReminder.offsetMinutes || 0)} onChange={(e) => setNewReminder({ ...newReminder, offsetMinutes: (newReminder.offsetMinutes || 0) >= 0 ? parseInt(e.target.value) || 0 : -parseInt(e.target.value) || 0 })} className="w-24 h-12 bg-black/40 text-white text-center" />
                      <Select value={(newReminder.offsetMinutes || 0) >= 0 ? "after" : "before"} onValueChange={(v) => setNewReminder({ ...newReminder, offsetMinutes: v === 'after' ? Math.abs(newReminder.offsetMinutes || 0) : -Math.abs(newReminder.offsetMinutes || 0) })}>
                        <SelectTrigger className="flex-1 h-12 bg-black/40 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-950 text-white dir-rtl"><SelectItem value="before">قبل الحدث</SelectItem><SelectItem value="after">بعد الحدث</SelectItem></SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="space-y-4 p-6 bg-white/5 rounded-2xl border border-white/5">
                  <h5 className="text-xs font-black text-emerald-400 uppercase tracking-widest">توقيت الانتهاء</h5>
                  <Select value={newReminder.expiryType} onValueChange={(v) => setNewReminder({ ...newReminder, expiryType: v as any })}>
                    <SelectTrigger className="h-12 bg-black/40 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-950 text-white dir-rtl"><SelectItem value="duration">بعد مدة (بالدقائق)</SelectItem><SelectItem value="prayer">عند أذان صلاة أخرى</SelectItem><SelectItem value="iqamah">عند إقامة صلاة أخرى</SelectItem><SelectItem value="manual">وقت محدد</SelectItem></SelectContent>
                  </Select>
                  {newReminder.expiryType === 'duration' && <Input type="number" placeholder="الدقائق..." value={newReminder.expiryValue} onChange={(e) => setNewReminder({ ...newReminder, expiryValue: e.target.value })} className="h-12 bg-black/40 text-white" />}
                  {(newReminder.expiryType === 'prayer' || newReminder.expiryType === 'iqamah') && (
                    <Select value={newReminder.expiryValue} onValueChange={(v) => setNewReminder({ ...newReminder, expiryValue: v })}>
                      <SelectTrigger className="h-12 bg-black/40 text-white"><SelectValue placeholder="اختر الصلاة..." /></SelectTrigger>
                      <SelectContent className="bg-zinc-950 text-white dir-rtl">
                        {prayerSettings.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        <SelectItem value="next">الصلاة القادمة تلقائياً</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {newReminder.expiryType === 'manual' && <Input type="time" value={newReminder.expiryValue} onChange={(e) => setNewReminder({ ...newReminder, expiryValue: e.target.value })} className="h-12 bg-black/40 text-white" />}
                </div>
              </div>
              
              <div className="flex gap-4">
                <Button onClick={handleSaveReminder} className="h-16 flex-1 bg-primary text-xl font-black rounded-2xl shadow-glow focusable">
                  {editingReminderId ? <Save className="w-6 h-6 ml-3" /> : <Plus className="w-6 h-6 ml-3" />}
                  {editingReminderId ? "حفظ التعديلات" : "إضافة التذكير المخصص"}
                </Button>
                {editingReminderId && <Button variant="ghost" onClick={() => { setEditingReminderId(null); setNewReminder({}); }} className="h-16 px-8 bg-white/5 text-white/40 rounded-2xl">إلغاء</Button>}
              </div>
            </div>

            <div className="space-y-4">
              {reminders.map((r) => (
                <div key={r.id} className="bg-black/40 p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:border-primary/40 transition-all">
                  <div className="flex items-center gap-6">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 shadow-lg", r.color)}><Bell className="w-6 h-6" /></div>
                    <div className="flex flex-col">
                      <span className={cn("text-2xl font-black", r.color)}>{r.label}</span>
                      <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
                        {r.relativePrayer === 'manual' ? `يبدأ عند ${r.manualTime}` : `يبدأ ${r.offsetMinutes! < 0 ? 'قبل' : 'بعد'} ${r.referencePoint === 'azan' ? 'أذان' : 'إقامة'} ${prayerSettings.find(ps => ps.id === r.relativePrayer)?.name} بـ ${Math.abs(r.offsetMinutes!)} دقيقة`}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" onClick={() => handleEditReminder(r)} className="text-white/60 hover:bg-white/10 rounded-full w-12 h-12"><Edit2 className="w-5 h-5" /></Button>
                    <Button variant="ghost" onClick={() => removeReminder(r.id)} className="text-red-500 hover:bg-red-500/20 rounded-full w-12 h-12"><Trash2 className="w-6 h-6" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-12 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="premium-glass p-8 space-y-8 bg-white/5 border-white/10">
              <CardTitle className="text-2xl font-black text-white flex items-center gap-3"><MonitorPlay className="w-6 h-6 text-primary" />خلفية اللوحة المخصصة</CardTitle>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <Input placeholder="رابط صورة الخلفية..." value={mapSettings.manuscriptBgUrl} onChange={(e) => updateMapSettings({ manuscriptBgUrl: e.target.value })} className="flex-1 bg-black/40 border-white/10 h-12 rounded-xl text-xs text-white" />
                  <input type="file" hidden ref={bgInputRef} accept="image/*" onChange={(e) => handleFileUpload(e, 'background')} />
                  <Button onClick={() => bgInputRef.current?.click()} className="h-12 px-6 bg-accent/20 text-accent border border-accent/40 rounded-xl focusable"><Upload className="w-4 h-4 ml-2" /> رفع</Button>
                </div>
                
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2"><ImageIcon className="w-3.5 h-3.5" /> معرض الصور المرفوعة</h5>
                  <div className="grid grid-cols-4 gap-4 max-h-[300px] overflow-y-auto no-scrollbar p-2 bg-black/20 rounded-2xl border border-white/5">
                    {customWallBackgrounds?.map((bg, i) => (
                      <div key={i} onClick={() => updateMapSettings({ manuscriptBgUrl: bg })} className={cn("aspect-video rounded-xl overflow-hidden border-2 cursor-pointer transition-all relative group", mapSettings.manuscriptBgUrl === bg ? "border-primary shadow-glow" : "border-white/5")}>
                        <img src={bg} className="w-full h-full object-cover" alt="" />
                        <button onClick={(e) => { e.stopPropagation(); removeCustomWallBackground(bg); }} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3 text-white" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
            <Card className="premium-glass p-8 space-y-8 bg-white/5 border-white/10">
              <CardTitle className="text-2xl font-black text-white flex items-center gap-3"><Palette className="w-6 h-6 text-primary" />تعديل ألوان وضع اللوحة</CardTitle>
              <div className="space-y-6">
                <div className="flex flex-wrap gap-3">
                  {customManuscriptColors.map((color, i) => (
                    <button key={i} onClick={() => updateMapSettings({ manuscriptColor: color })} className={cn("w-12 h-12 rounded-xl border-2 transition-all", mapSettings.manuscriptColor === color ? "border-primary scale-110 shadow-glow" : "border-white/10")} style={{ background: color }} />
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-4 pt-4 border-t border-white/5">
                   <div className="space-y-3"><div className="flex justify-between text-xs font-black text-white/40 uppercase"><span>صبغة اللون (Hue)</span><span>{mapSettings.hue || 0}°</span></div><Slider value={[mapSettings.hue || 0]} min={0} max={360} step={1} onValueChange={([v]) => updateMapSettings({ hue: v })} /></div>
                   <div className="space-y-3"><div className="flex justify-between text-xs font-black text-white/40 uppercase"><span>التشبع (Saturation)</span><span>{mapSettings.saturation}%</span></div><Slider value={[mapSettings.saturation || 100]} min={0} max={200} step={1} onValueChange={([v]) => updateMapSettings({ saturation: v })} /></div>
                   <div className="space-y-3"><div className="flex justify-between text-xs font-black text-white/40 uppercase"><span>السطوع (Brightness)</span><span>{mapSettings.brightness}%</span></div><Slider value={[mapSettings.brightness || 100]} min={0} max={200} step={1} onValueChange={([v]) => updateMapSettings({ brightness: v })} /></div>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem]">
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30"><Activity className="w-8 h-8 text-emerald-500 animate-pulse" /></div>
                <div><CardTitle className="text-4xl font-black text-white tracking-tighter">الأتمتة الشاملة</CardTitle><p className="text-white/30 font-bold text-xs uppercase tracking-widest mt-1">Autonomous Synchronization Engine</p></div>
              </div>
              <Switch checked={autoRefreshEnabled} onCheckedChange={setAutoRefreshEnabled} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {autoRefreshTimes.map((time, idx) => (
                <div key={idx} className="bg-black/40 p-6 rounded-[2rem] border border-white/10 space-y-4">
                  <span className="text-xs font-black text-white/40 uppercase tracking-widest">تحديث {idx + 1}</span>
                  <Input type="time" value={time} onChange={(e) => handleTimeChange(idx, e.target.value)} className="h-14 bg-white/5 border-white/10 text-2xl font-black text-center text-white rounded-xl" />
                </div>
              ))}
              <Button onClick={() => setAutoRefreshTimes([...autoRefreshTimes, "00:00"])} className="h-28 rounded-[2rem] border-2 border-dashed border-white/10 bg-transparent text-white/20 hover:bg-white/5 hover:text-white transition-all"><Plus className="w-8 h-8" /></Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="prayers" className="space-y-6">
          <Card className="bg-white/5 border-white/10 p-8 rounded-[3rem]">
            <CardTitle className="text-2xl font-black text-white flex items-center gap-4 mb-8"><Timer className="w-8 h-8 text-primary" />ضبط أوقات الصلاة</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {prayerSettings.map((s) => (
                <div key={s.id} className="bg-black/40 p-6 rounded-3xl border border-white/5 space-y-4">
                  <div className="flex justify-between items-center"><span className="text-xl font-bold text-white">{s.name}</span><div className="flex items-center gap-2"><span className="text-xs text-white/40">إزاحة</span><Input type="number" value={s.offsetMinutes} onChange={(e) => updatePrayerSetting(s.id, { offsetMinutes: parseInt(e.target.value) || 0 })} className="w-20 bg-white/5 h-8 text-center text-white" /></div></div>
                  <div className="flex justify-between items-center"><span className="text-sm text-white/60">مدة الإقامة (دقيقة)</span><Input type="number" value={s.iqamahDuration} onChange={(e) => updatePrayerSetting(s.id, { iqamahDuration: parseInt(e.target.value) || 0 })} className="w-20 bg-white/5 h-8 text-center text-white" /></div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reciters" className="space-y-6">
          <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem]">
            <CardTitle className="text-3xl font-black text-white flex items-center gap-4 mb-12"><Mic className="w-10 h-10 text-emerald-500" />إدارة القراء والمبدعين</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {favoriteReciters.map((r) => (
                <div key={r.channelid} className="bg-black/40 border border-white/5 p-6 rounded-[2.5rem] flex flex-col gap-6 group hover:border-emerald-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 bg-zinc-900"><img src={r.image} className="w-full h-full object-cover" /></div>
                      <div className="flex flex-col">
                        {editingReciterId === r.channelid ? (
                          <div className="flex gap-2">
                            <Input value={reciterNameInput} onChange={(e) => setReciterNameInput(e.target.value)} className="bg-white/5 text-white h-10 text-lg font-black w-48" />
                            <Button size="icon" onClick={() => { updateReciter(r.channelid, reciterNameInput); setEditingReciterId(null); toast({title:"تم الحفظ"}); }} className="bg-emerald-500 text-black rounded-lg h-10 w-10"><Save className="w-4 h-4" /></Button>
                          </div>
                        ) : <h4 className="font-black text-2xl text-white truncate max-w-[200px]">{r.name}</h4>}
                        <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Official Reciter Profile</span>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" onClick={() => { setEditingReciterId(r.channelid); setReciterNameInput(r.name); }} className="w-10 h-10 rounded-full bg-white/5 text-white/60"><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" onClick={() => removeReciter(r.channelid)} className="w-10 h-10 rounded-full bg-red-600/10 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="manuscripts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Card className="bg-white/5 border-white/10 p-8 rounded-[3rem]">
              <CardTitle className="text-2xl font-black text-white flex items-center gap-4 mb-8"><BookOpen className="w-8 h-8 text-primary" />قائمة المخطوطات</CardTitle>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <Select value={manuscriptType} onValueChange={(v) => setManuscriptType(v as any)}>
                    <SelectTrigger className="w-40 h-14 bg-black/40 border-white/10 rounded-xl text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-white/10 text-white dir-rtl"><SelectItem value="text">نص</SelectItem><SelectItem value="image">صورة</SelectItem></SelectContent>
                  </Select>
                  <Input placeholder="المحتوى..." value={manuscriptInput} onChange={(e) => setManuscriptInput(e.target.value)} className="h-14 flex-1 bg-black/40 border-white/10 rounded-xl text-white" />
                  {manuscriptType === 'image' && (
                    <><input type="file" hidden ref={manuInputRef} accept="image/*" onChange={(e) => handleFileUpload(e, 'manuscript')} /><Button onClick={() => manuInputRef.current?.click()} className="h-14 px-6 bg-zinc-800 text-white rounded-xl focusable"><Upload className="w-6 h-6" /></Button></>
                  )}
                  <Button onClick={() => { if(manuscriptInput || manuscriptType === 'image') { addManuscript({ id: Date.now().toString(), type: manuscriptType, content: manuscriptInput, fontFamily: 'Aref Ruqaa' }); setManuscriptInput(""); } }} className="h-14 px-8 bg-primary rounded-xl focusable"><Plus className="w-6 h-6" /></Button>
                </div>
                <div className="space-y-4 max-h-[500px] overflow-y-auto no-scrollbar">
                  {customManuscripts.map((m) => (
                    <div key={m.id} className="bg-black/40 border border-white/10 p-6 rounded-3xl flex items-center justify-between group">
                      <div className="flex flex-col gap-2 shrink-0">
                        <button onClick={() => reorderManuscript(m.id, 'prev')} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:bg-primary"><ChevronUp className="w-4 h-4" /></button>
                        <button onClick={() => reorderManuscript(m.id, 'next')} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:bg-primary"><ChevronDown className="w-4 h-4" /></button>
                      </div>
                      <div className="flex-1 px-6 overflow-hidden">
                        {m.type === 'text' ? (
                          <div className="space-y-3">
                            <p className="text-xl font-bold text-white truncate" style={{ fontFamily: m.fontFamily }}>{m.content}</p>
                            <Select value={m.fontFamily} onValueChange={(f) => updateManuscript(m.id, { fontFamily: f })}>
                              <SelectTrigger className="h-10 w-full max-w-[200px] bg-black/60 border-white/10 text-xs text-white"><SelectValue placeholder="الخط" /></SelectTrigger>
                              <SelectContent className="bg-zinc-950 text-white dir-rtl">{allAvailableFonts.map(font => <SelectItem key={font.value} value={font.value}>{font.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        ) : <div className="w-32 h-16 relative rounded-lg overflow-hidden border border-white/10 bg-white/5"><img src={m.content} className="w-full h-full object-contain" alt="" style={{ filter: 'brightness(0) invert(1)' }} /></div>}
                      </div>
                      <Button variant="ghost" onClick={() => removeManuscript(m.id)} className="text-red-500 h-12 w-12 rounded-full"><Trash2 className="w-5 h-5" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
            <Card className="bg-white/5 border-white/10 p-8 rounded-[3rem]">
              <CardTitle className="text-2xl font-black text-white flex items-center gap-4 mb-8"><Type className="w-8 h-8 text-emerald-400" />إدارة الخطوط (TTF)</CardTitle>
              <div className="space-y-6">
                <div className="flex flex-col gap-4 p-6 bg-black/40 rounded-3xl border border-white/10">
                  <Input placeholder="اسم الخط..." value={ttfName} onChange={(e) => setTtfName(e.target.value)} className="h-14 bg-white/5 text-white" />
                  <input type="file" hidden ref={fontInputRef} accept=".ttf,.otf" onChange={(e) => handleFileUpload(e, 'font')} />
                  <Button onClick={() => fontInputRef.current?.click()} className="h-14 w-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 rounded-xl font-black focusable"><Upload className="w-6 h-6 ml-3" /> رفع ملف خط</Button>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar">
                  {customFonts.map((f) => (
                    <div key={f.name} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group">
                      <span className="text-white font-bold text-lg" style={{ fontFamily: f.name }}>{f.name}</span>
                      <Button variant="ghost" onClick={() => removeCustomFont(f.name)} className="text-red-500 h-10 w-10 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="iptv_channels" className="space-y-8 animate-in fade-in duration-300">
          <Card className="bg-white/5 border-white/10 p-8 rounded-[3.5rem]">
            <CardTitle className="text-3xl font-black text-white flex items-center gap-4 mb-10"><Tv className="w-8 h-8 text-emerald-500" />إدارة قنوات البث</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {favoriteIptvChannels.map((ch, idx) => (
                <div key={ch.stream_id} className="bg-black/40 border border-white/5 p-6 rounded-[2.5rem] flex flex-col gap-4 group hover:border-emerald-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 shadow-xl"><img src={ch.stream_icon} className="w-full h-full object-cover" /></div>
                        <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-emerald-500 border-4 border-black flex items-center justify-center"><span className="text-sm font-black text-black">{getGlobalDisplayNumber(idx)}</span></div>
                      </div>
                      <div className="flex flex-col"><h4 className="font-black text-white truncate max-w-[150px]">{ch.name}</h4><span className="text-[10px] text-white/30 font-bold uppercase">التردد: {getGlobalDisplayNumber(idx)}</span></div>
                    </div>
                    <Button variant="ghost" onClick={() => toggleFavoriteIptvChannel(ch)} className="w-10 h-10 rounded-full bg-red-600/10 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex gap-2">
                    <Input defaultValue={ch.url || ""} onChange={(e) => updateIptvChannel(ch.stream_id, { url: e.target.value })} className="h-10 bg-black/60 border-white/5 rounded-xl px-4 text-xs text-white dir-ltr flex-1" />
                    <Button size="icon" onClick={() => { updateIptvChannel(ch.stream_id, { url: ch.url }); syncMasterBin(); toast({ title: "تم التحديث" }); }} className="h-10 w-10 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 focusable"><Save className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="buttonmap" className="space-y-8 animate-in fade-in duration-300">
          <div className="flex items-center justify-between bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5">
            <div className="flex items-center gap-6"><div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center shadow-glow"><Keyboard className="w-8 h-8 text-primary" /></div><h2 className="text-4xl font-black text-white tracking-tighter">تخصيص الأزرار</h2></div>
            <Select value={selectedContext} onValueChange={(v) => setSelectedContext(v as any)}><SelectTrigger className="w-64 h-14 bg-black/60 border-white/10 rounded-2xl px-6 text-white"><SelectValue /></SelectTrigger><SelectContent className="bg-zinc-950 border-white/10 text-white dir-rtl">{Object.entries(contextLabels).map(([val, label]) => (<SelectItem key={val} value={val}>{label}</SelectItem>))}</SelectContent></Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Object.entries(keyMappings[selectedContext] || {}).map(([action, keys]) => (
              <Card key={action} className="bg-zinc-900/20 border-none p-8 rounded-[2.5rem] flex flex-col gap-6 relative group transition-all hover:bg-zinc-900/40">
                <div className="flex items-center justify-between"><h3 className="text-xl font-black text-white truncate max-w-[180px]">{actionLabels[action as AppAction] || action}</h3><Button variant="ghost" size="icon" onClick={() => { setRecordingAction(action as AppAction); }} className={cn("w-10 h-10 rounded-full", recordingAction === action ? "bg-yellow-500 text-black animate-pulse" : "bg-blue-600/10 text-blue-400 border border-blue-500/20")}><Edit2 className="w-4 h-4" /></Button></div>
                <div className="flex flex-wrap gap-3">{keys.map(k => (
                  <div key={k} className="group/key relative">
                    <div className={cn("w-12 h-12 rounded-full flex flex-col items-center justify-center border-2 shadow-xl", !/^\d+$/.test(k) && !['Red', 'Green', 'Yellow', 'Blue'].includes(k) ? "bg-white text-black border-white" : "bg-zinc-800 text-white border-zinc-700", k === 'Red' && "bg-red-600 border-red-500", k === 'Green' && "bg-green-600 border-green-500", k === 'Yellow' && "bg-yellow-500 border-yellow-400 text-black", k === 'Blue' && "bg-blue-600 border-blue-500")}>
                      <span className="text-[7px] font-black uppercase opacity-60">زر</span>
                      <span className="text-[10px] font-black uppercase truncate px-1 w-full text-center">{k}</span>
                    </div>
                    <button onClick={() => removeSpecificKeyMapping(selectedContext, action as AppAction, k)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover/key:opacity-100 border border-white/20"><Trash2 className="w-2.5 h-2.5 text-white" /></button>
                  </div>
                ))}</div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
