
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useMediaStore, Reminder, Manuscript, AppAction, MappingContext, IptvChannel } from "@/lib/store";
import { 
  Settings, Bell, Trash2, Edit2, Plus, Monitor, Palette, Keyboard, Clock, CheckCircle2, Save, BookOpen, LayoutGrid, Eye, Timer, Tv, ArrowRightLeft, Globe, Loader2, RefreshCw, Mic, ChevronUp, User, X, Type, PaintBucket, Upload, ChevronDown, MonitorPlay, Image as ImageIcon
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
    setIsRecordingKey, favoriteIptvChannels, toggleFavoriteIptvChannel, updateIptvChannel, reorderIptvChannelTo,
    favoriteReciters, removeReciter, updateReciter, reorderReciterTo, moveReciterToTop, saveRecitersReorder,
    syncMasterBin, syncEverythingToCloud, isInitialLoading, fetchPriorityData,
    isReorderMode, toggleReorderMode, pickedUpId, setPickedUpId, saveIptvReorder,
    customFonts, addCustomFont, removeCustomFont, customManuscriptColors, saveManuscriptsReorder
  } = useMediaStore();
  
  const { toast } = useToast();
  const fontInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const manuInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingReciterId, setEditingReciterId] = useState<string | null>(null);
  const [reciterNameInput, setReciterNameInput] = useState("");
  const [manuscriptInput, setManuscriptInput] = useState("");
  const [manuscriptType, setManuscriptType] = useState<'text' | 'image'>('text');
  const [ttfName, setTtfName] = useState("");
  
  const [selectedContext, setSelectedContext] = useState<MappingContext>('global');
  const [recordingAction, setRecordingAction] = useState<AppAction | null>(null);
  const [recordingType, setRecordingType] = useState<'single' | 'combo'>('single');
  const [firstKey, setFirstKey] = useState<string | null>(null);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchPriorityData('all');
  }, []);

  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({
    label: "", relativePrayer: "manual", manualTime: "12:00", offsetMinutes: 0, color: "text-blue-400", iconType: "bell", countdownWindow: 15, countupWindow: 15, expiryType: 'prayer', expiryValue: 'next'
  });

  const handleGlobalSave = async () => {
    setIsSyncing(true);
    try {
      await syncMasterBin();
      toast({ title: "تم الحفظ بنجاح", description: "تمت مزامنة الإعدادات المحلية مع السحابة" });
    } finally {
      setIsSyncing(false);
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
        setTtfName("");
      } else if (type === 'manuscript') {
        addManuscript({ id: Date.now().toString(), type: 'image', content: dataUrl });
        saveManuscriptsReorder();
      } else if (type === 'background') {
        addCustomWallBackground(dataUrl);
        updateMapSettings({ manuscriptBgUrl: dataUrl });
      }
      toast({ title: "تم الرفع بنجاح", description: "تمت إضافة العنصر من جهازك بنجاح" });
    };
    reader.readAsDataURL(file);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchPriorityData('all');
      toast({ title: "تم تحديث البيانات", description: "تم جلب أحدث محتوى من السحابة بنجاح" });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveReminder = () => {
    if (!newReminder.label) { toast({ variant: "destructive", title: "خطأ", description: "يرجى إدخل وصف" }); return; }
    const data = { ...newReminder, id: editingId || Date.now().toString() } as Reminder;
    if (editingId) updateReminder(editingId, data);
    else addReminder(data);
    setEditingId(null);
    setNewReminder({ label: "", relativePrayer: "manual", manualTime: "12:00", offsetMinutes: 0, color: "text-blue-400", iconType: "bell", countdownWindow: 15, countupWindow: 15, expiryType: 'prayer', expiryValue: 'next' });
    toast({ title: "تم الحفظ" });
  };

  const allAvailableFonts = useMemo(() => {
    return [...FONTS_POOL, ...customFonts.map(f => ({ name: f.name, value: f.name }))];
  }, [customFonts]);

  const handleSaveReciterName = (id: string) => {
    if (!reciterNameInput.trim()) return;
    updateReciter(id, reciterNameInput);
    setEditingReciterId(null);
    setReciterNameInput("");
    toast({ title: "تم تعديل الاسم", description: "تم تحديث اسم القارئ بنجاح" });
  };

  useEffect(() => {
    if (!recordingAction) return;
    setIsRecordingKey(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault(); e.stopPropagation();
      const key = normalizeKey(e);
      if (recordingType === 'single') {
        setKeyMapping(selectedContext, recordingAction, key);
        setRecordingAction(null); setIsRecordingKey(false);
        toast({ title: "تم التعيين", description: `تم ربط الزر ${key} بنجاح` });
      } else {
        if (!firstKey) {
          setFirstKey(key);
          toast({ title: "الزر الأول مسجل", description: "اضغط الزر الثاني لإتمام المجموعة" });
        } else {
          const combo = firstKey + key;
          setKeyMapping(selectedContext, recordingAction, combo);
          setRecordingAction(null); setFirstKey(null); setIsRecordingKey(false);
          toast({ title: "تم تعيين المجموعة", description: `تم ربط ${combo} بنجاح` });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => { window.removeEventListener("keydown", handleKeyDown, true); setIsRecordingKey(false); };
  }, [recordingAction, selectedContext, setKeyMapping, toast, setIsRecordingKey, recordingType, firstKey]);

  const actionLabels: Partial<Record<AppAction, string>> = {
    goto_home: "الذهاب للرئيسية", goto_media: "فتح الميديا", goto_quran: "فتح المصحف", goto_hihi2: "فتح Hihi2", goto_iptv: "فتح البث المباشر",
    goto_football: "فتح مركز كووورة", goto_settings: "فتح الإعدادات", player_next: "التالي", player_prev: "السابق", player_close: "إغلاق المشغل",
    player_fullscreen: "تبديل الشاشة", player_minimize: "تصغير/تكبير المشغل", player_save: "حفظ الفيديو", player_settings: "قائمة أزرار المشغل",
    player_playlist: "إظهار/إخفاء القائمة", nav_up: "تحريك للأعلى", nav_down: "تحريك للأسفل", nav_left: "تحريك لليمين", nav_right: "تحريك لليسار",
    nav_ok: "تأكيد / موافق", nav_back: "عودة للخلف", toggle_reorder: "وضع الترتيب", delete_item: "حذف عنصر", toggle_star: "تمييز بنجمة",
    inc_font: "تكبير خط المخطوطة (66)", dec_font: "تصغير خط المخطوطة (44)", next_manuscript: "المخطوطة التالية (88)", prev_manuscript: "المخطوطة السابقة (22)"
  };

  const contextLabels: Record<MappingContext, string> = {
    global: "العام (الأساسي)", player: "المشغل", dashboard: "الرئيسية", media: "الميديا", quran: "المصحف", football: "كرة القدم", iptv: "البث المباشر", settings: "الإعدادات"
  };

  return (
    <div className="p-12 space-y-12 max-w-7xl mx-auto pb-40 text-right dir-rtl transition-all duration-300">
      <header className="flex flex-col gap-4">
        <h1 className="text-6xl font-black text-white tracking-tighter flex items-center gap-6">مركز التحكم <Settings className="w-12 h-12 text-primary animate-spin-slow" /></h1>
        <p className="text-white/40 font-bold uppercase tracking-[0.6em] text-sm">System Configuration Hub</p>
      </header>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="bg-white/5 p-1 rounded-full border border-white/10 h-16 mb-12 flex justify-around overflow-x-auto no-scrollbar">
          <TabsTrigger value="appearance" className="rounded-full px-8 h-full font-bold focusable relative">المظهر</TabsTrigger>
          <TabsTrigger value="manuscripts" className="rounded-full px-8 h-full font-bold focusable relative">المخطوطات والخطوط</TabsTrigger>
          <TabsTrigger value="iptv_channels" className="rounded-full px-8 h-full font-bold focusable relative">قنوات البث</TabsTrigger>
          <TabsTrigger value="reciters" className="rounded-full px-8 h-full font-bold focusable relative">القراء</TabsTrigger>
          <TabsTrigger value="reminders" className="rounded-full px-8 h-full font-bold focusable relative">التذكيرات</TabsTrigger>
          <TabsTrigger value="buttonmap" className="rounded-full px-8 h-full font-bold focusable relative">الأزرار</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-12 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="premium-glass p-8 space-y-8 bg-white/5 border-white/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-black text-white flex items-center gap-3"><Monitor className="w-6 h-6 text-primary" />عرض الشاشة</CardTitle>
                <div className="flex gap-3">
                  <Button onClick={handleManualRefresh} disabled={isRefreshing} className="bg-zinc-800 text-white border border-white/10 rounded-full h-10 px-6 font-black focusable">{isRefreshing ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <RefreshCw className="w-4 h-4 ml-2" />} تحديث</Button>
                  <Button onClick={handleGlobalSave} disabled={isSyncing || isInitialLoading} className="bg-primary/20 text-primary border border-primary/40 rounded-full h-10 px-6 font-black focusable">{(isSyncing || isInitialLoading) ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Save className="w-4 h-4 ml-2" />} حفظ</Button>
                </div>
              </div>
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><span className="text-sm font-black text-white/60">زوم المحتوى</span><span className="text-primary font-black">{Math.round((displayScale ?? 1.0) * 100)}%</span></div>
                  <Slider value={[displayScale ?? 1.0]} min={0.5} max={1.5} step={0.05} onValueChange={([v]) => setDisplayScale(v)} />
                </div>
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-6">
                  <h4 className="text-lg font-bold text-white flex items-center gap-3"><MonitorPlay className="w-5 h-5 text-accent" />خلفية اللوحة المخصصة</h4>
                  <div className="flex gap-4">
                    <Input 
                      placeholder="رابط صورة الخلفية..." 
                      value={mapSettings.manuscriptBgUrl} 
                      onChange={(e) => updateMapSettings({ manuscriptBgUrl: e.target.value })} 
                      className="flex-1 bg-black/40 border-white/10 h-12 rounded-xl text-xs dir-ltr font-mono text-white"
                    />
                    <input type="file" hidden ref={bgInputRef} accept="image/*" onChange={(e) => handleFileUpload(e, 'background')} />
                    <Button onClick={() => bgInputRef.current?.click()} className="h-12 px-6 bg-accent/20 text-accent border border-accent/40 rounded-xl focusable"><Upload className="w-4 h-4 ml-2" /> رفع</Button>
                  </div>
                  
                  {customWallBackgrounds.length > 0 && (
                    <div className="space-y-4 mt-6">
                      <h5 className="text-xs font-black text-white/40 uppercase tracking-widest flex items-center gap-2"><ImageIcon className="w-3.5 h-3.5" /> الخلفيات المرفوعة</h5>
                      <div className="grid grid-cols-4 gap-4 max-h-48 overflow-y-auto no-scrollbar">
                        {customWallBackgrounds.map((bg, i) => (
                          <div 
                            key={i} 
                            onClick={() => { updateMapSettings({ manuscriptBgUrl: bg }); handleGlobalSave(); }}
                            className={cn(
                              "aspect-video rounded-xl overflow-hidden border-2 cursor-pointer transition-all relative group",
                              mapSettings.manuscriptBgUrl === bg ? "border-primary shadow-glow scale-105 z-10" : "border-white/5 hover:border-white/20"
                            )}
                          >
                            <img src={bg} className="w-full h-full object-cover" alt="" />
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeCustomWallBackground(bg); handleGlobalSave(); }}
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
            
            <Card className="premium-glass p-8 space-y-8 bg-white/5 border-white/10">
              <CardTitle className="text-2xl font-black text-white flex items-center gap-3"><PaintBucket className="w-6 h-6 text-primary" />تخصيص ألوان المخطوطة (للوحة فقط)</CardTitle>
              <div className="space-y-6">
                <div className="flex flex-wrap gap-4">
                  {customManuscriptColors.map((color, i) => (
                    <button 
                      key={i} 
                      onClick={() => { updateMapSettings({ manuscriptColor: color }); handleGlobalSave(); }}
                      className={cn(
                        "w-12 h-12 rounded-xl border-2 transition-all shadow-xl",
                        mapSettings.manuscriptColor === color ? "border-primary scale-110 shadow-glow" : "border-white/10 hover:border-white/30"
                      )}
                      style={{ background: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <Input 
                    type="text" 
                    placeholder="#ffffff" 
                    value={mapSettings.manuscriptColor}
                    className="flex-1 bg-black/40 border-white/10 text-center font-mono h-12 text-white"
                    onChange={(e) => updateMapSettings({ manuscriptColor: e.target.value })}
                  />
                  <Button onClick={handleGlobalSave} className="bg-primary/20 text-primary border border-primary/20 rounded-xl px-6 h-12 focusable">تثبيت اللون</Button>
                </div>
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex justify-between items-center"><span className="text-sm font-black text-white/60">حجم خط المخطوطة</span><span className="text-accent font-black">{(mapSettings.fontScale || 1.0).toFixed(1)}x</span></div>
                  <Slider value={[mapSettings.fontScale || 1.0]} min={0.3} max={2.0} step={0.1} onValueChange={([v]) => updateMapSettings({ fontScale: v })} />
                  <p className="text-[9px] text-white/20 text-center">يمكنك أيضاً استخدام أزرار 44 و 66 للتحكم في الحجم أثناء وضع اللوحة</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="manuscripts" className="space-y-12 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Card className="bg-white/5 border-white/10 p-8 rounded-[3rem]">
              <CardTitle className="text-2xl font-black text-white flex items-center gap-4 mb-8"><BookOpen className="w-8 h-8 text-primary" />إدارة المخطوطات</CardTitle>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <Select value={manuscriptType} onValueChange={(v) => setManuscriptType(v as any)}>
                    <SelectTrigger className="w-40 h-14 bg-black/40 border-white/10 rounded-xl px-6 text-white text-right"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-white/10 text-white dir-rtl"><SelectItem value="text">نص</SelectItem><SelectItem value="image">صورة</SelectItem></SelectContent>
                  </Select>
                  <Input placeholder={manuscriptType === 'text' ? "أدخل النص هنا..." : "أدخل رابط الصورة..."} value={manuscriptInput} onChange={(e) => setManuscriptInput(e.target.value)} className="h-14 flex-1 bg-black/40 border-white/10 rounded-xl px-6 text-white text-right" />
                  {manuscriptType === 'image' && (
                    <>
                      <input type="file" hidden ref={manuInputRef} accept="image/*" onChange={(e) => handleFileUpload(e, 'manuscript')} />
                      <Button onClick={() => manuInputRef.current?.click()} className="h-14 px-6 bg-zinc-800 text-white rounded-xl focusable"><Upload className="w-6 h-6" /></Button>
                    </>
                  )}
                  <Button onClick={() => { if(manuscriptInput) { addManuscript({ id: Date.now().toString(), type: manuscriptType, content: manuscriptInput, fontFamily: 'Aref Ruqaa' }); setManuscriptInput(""); saveManuscriptsReorder(); } }} className="h-14 px-8 bg-primary rounded-xl focusable"><Plus className="w-6 h-6" /></Button>
                </div>
                
                <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[600px] no-scrollbar">
                  {customManuscripts.map((m) => (
                    <div key={m.id} className="bg-black/40 border border-white/10 p-6 rounded-3xl flex items-center justify-between group hover:border-primary/40 transition-all">
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="flex flex-col gap-2">
                          <button onClick={() => { reorderManuscript(m.id, 'prev'); saveManuscriptsReorder(); }} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:bg-primary hover:text-white transition-all"><ChevronUp className="w-4 h-4" /></button>
                          <button onClick={() => { reorderManuscript(m.id, 'next'); saveManuscriptsReorder(); }} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:bg-primary hover:text-white transition-all"><ChevronDown className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="flex-1 text-right px-6 overflow-hidden">
                        {m.type === 'text' ? (
                          <div className="space-y-3">
                            <p className="text-xl font-bold text-white truncate leading-tight" style={{ fontFamily: m.fontFamily }}>{m.content}</p>
                            <Select value={m.fontFamily} onValueChange={(f) => { updateManuscript(m.id, { fontFamily: f }); saveManuscriptsReorder(); }}>
                              <SelectTrigger className="h-10 w-full max-w-[200px] bg-black/60 border-white/10 text-xs text-white"><SelectValue placeholder="اختر الخط" /></SelectTrigger>
                              <SelectContent className="bg-zinc-950 border-white/10 text-white dir-rtl">
                                {allAvailableFonts.map(font => <SelectItem key={font.value} value={font.value}>{font.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <div className="w-32 h-16 relative rounded-lg overflow-hidden border border-white/10 bg-zinc-900"><img src={m.content} className="w-full h-full object-contain" alt="" style={{ filter: 'brightness(0) invert(1)' }} /></div>
                        )}
                      </div>
                      <Button variant="ghost" onClick={() => { removeManuscript(m.id); saveManuscriptsReorder(); }} className="text-red-500 hover:bg-red-600/10 h-12 w-12 rounded-full"><Trash2 className="w-5 h-5" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="bg-white/5 border-white/10 p-8 rounded-[3rem]">
              <CardTitle className="text-2xl font-black text-white flex items-center gap-4 mb-8"><Type className="w-8 h-8 text-emerald-400" />إدارة خطوط TTF</CardTitle>
              <div className="space-y-6">
                <div className="flex flex-col gap-4 p-6 bg-black/40 rounded-3xl border border-white/10">
                  <Input placeholder="اسم الخط المخصص..." value={ttfName} onChange={(e) => setTtfName(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-xl px-6 text-white text-right" />
                  <div className="flex gap-4">
                    <input type="file" hidden ref={fontInputRef} accept=".ttf,.otf" onChange={(e) => handleFileUpload(e, 'font')} />
                    <Button onClick={() => fontInputRef.current?.click()} className="h-14 flex-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 rounded-xl focusable font-black"><Upload className="w-6 h-6 ml-3" /> رفع ملف خط (TTF)</Button>
                  </div>
                  <p className="text-[9px] text-white/20 text-center uppercase tracking-widest">ملاحظة: الخطوط المرفوعة تحفظ في السحابة وتكون متاحة عبر كافة أجهزتك</p>
                </div>
                
                <div className="space-y-3 overflow-y-auto max-h-[300px] no-scrollbar">
                  <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest px-2">الخطوط المتاحة</h4>
                  {customFonts.map((f) => (
                    <div key={f.name} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:border-emerald-500/40 transition-all">
                      <span className="text-white font-bold text-lg" style={{ fontFamily: f.name }}>{f.name} (معاينة النص)</span>
                      <Button variant="ghost" onClick={() => { removeCustomFont(f.name); handleGlobalSave(); }} className="text-red-500 h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="iptv_channels" className="space-y-8 animate-in fade-in duration-300">
          <Card className="bg-white/5 border-white/10 p-8 rounded-[3rem]">
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
                    <Input defaultValue={ch.url || ""} onChange={(e) => updateIptvChannel(ch.stream_id, { url: e.target.value })} className="h-10 bg-black/60 border-white/5 rounded-xl px-4 text-xs text-white dir-ltr flex-1" placeholder="http://..." />
                    <Button size="icon" onClick={() => { updateIptvChannel(ch.stream_id, { url: ch.url }); saveIptvReorder(); toast({ title: "تم الحفظ", description: `تحديث رابط ${ch.name}` }); }} className="h-10 w-10 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 focusable"><Save className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reciters" className="space-y-8 animate-in fade-in duration-300">
          <Card className="bg-white/5 border-white/10 p-8 rounded-[3rem]">
            <CardTitle className="text-3xl font-black text-white flex items-center gap-4 mb-10"><Mic className="w-8 h-8 text-primary" />إدارة المبدعين والقراء</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteReciters.map((r) => (
                <div key={r.channelid} className="bg-black/40 border border-white/5 p-6 rounded-[2.5rem] flex flex-col gap-4 group hover:border-primary/40 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 shadow-xl bg-zinc-900"><img src={r.image} className="w-full h-full object-cover" /></div>
                      {editingReciterId === r.channelid ? (
                        <div className="flex items-center gap-2">
                          <Input 
                            value={reciterNameInput} 
                            onChange={(e) => setReciterNameInput(e.target.value)} 
                            className="h-10 bg-black/60 border-white/20 rounded-xl px-4 text-sm text-white w-40"
                            placeholder="الاسم الجديد..."
                          />
                          <Button onClick={() => handleSaveReciterName(r.channelid)} className="h-10 w-10 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xl focusable"><CheckCircle2 className="w-4 h-4" /></Button>
                          <Button onClick={() => setEditingReciterId(null)} variant="ghost" className="h-10 w-10 bg-white/5 text-white/40 rounded-xl focusable"><X className="w-4 h-4" /></Button>
                        </div>
                      ) : (
                        <div className="flex flex-col text-right">
                          <h4 className="font-black text-xl text-white truncate max-w-[150px]">{r.name}</h4>
                          <span className="text-[10px] text-white/30 font-bold uppercase">قائمة المبدعين</span>
                        </div>
                      )}
                    </div>
                    {editingReciterId !== r.channelid && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingReciterId(r.channelid); setReciterNameInput(r.name); }} className="w-10 h-10 rounded-full bg-white/5 text-yellow-500 hover:bg-yellow-500 hover:text-black focusable"><Edit2 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { removeReciter(r.channelid); saveRecitersReorder(); }} className="w-10 h-10 rounded-full bg-red-600/10 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-12 animate-in fade-in duration-300">
          <Card className="bg-white/5 border-white/10 p-8 rounded-[3rem]">
            <CardTitle className="text-3xl font-black text-white flex items-center gap-4 mb-8">{editingId ? <Edit2 className="w-10 h-10 text-yellow-500" /> : <Bell className="w-10 h-10 text-primary" />} {editingId ? "تعديل التذكير" : "إضافة تذكير"}</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Input placeholder="وصف التذكير..." value={newReminder.label} onChange={(e) => setNewReminder({ ...newReminder, label: e.target.value })} className="h-16 bg-black/40 border-white/10 rounded-2xl px-6 text-xl text-white text-right focusable" />
              <Select value={newReminder.relativePrayer} onValueChange={(v) => setNewReminder({ ...newReminder, relativePrayer: v as any })}><SelectTrigger className="h-16 bg-black/40 border-white/10 rounded-2xl px-6 text-xl text-white text-right focusable"><SelectValue /></SelectTrigger><SelectContent className="bg-zinc-900 border-white/10 text-white dir-rtl"><SelectItem value="manual">وقت محدد</SelectItem>{prayerSettings.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent></Select>
              <Button onClick={handleSaveReminder} className="h-16 bg-primary text-white font-black text-xl rounded-2xl shadow-glow focusable"><Save className="w-7 h-7 ml-3" /> حفظ</Button>
            </div>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reminders.map((rem) => (
              <div key={rem.id} className="bg-white/5 border border-white/5 p-6 rounded-[2rem] flex items-center justify-between group">
                <div className="flex items-center gap-6"><div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center bg-black/40 shadow-xl", rem.color)}><Bell className="w-7 h-7" /></div><h4 className="text-xl font-black text-white">{rem.label}</h4></div>
                <div className="flex gap-2"><Button variant="ghost" onClick={() => { setEditingId(rem.id); setNewReminder(rem); }} className="w-12 h-12 rounded-full bg-white/5 text-white/40 hover:bg-yellow-500"><Edit2 className="w-5 h-5" /></Button><Button variant="ghost" onClick={() => { removeReminder(rem.id); handleGlobalSave(); }} className="w-12 h-12 rounded-full bg-red-600/10 text-red-500"><Trash2 className="w-5 h-5" /></Button></div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="buttonmap" className="space-y-8 animate-in fade-in duration-300">
          <div className="flex items-center justify-between bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5">
            <div className="flex items-center gap-6"><div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20 shadow-glow"><Keyboard className="w-8 h-8 text-primary" /></div><h2 className="text-4xl font-black text-white tracking-tighter">تخصيص الأزرار</h2></div>
            <div className="flex items-center gap-4"><Select value={selectedContext} onValueChange={(v) => setSelectedContext(v as any)}><SelectTrigger className="w-64 h-14 bg-black/60 border-white/10 rounded-2xl px-6 text-white text-right focusable"><SelectValue /></SelectTrigger><SelectContent className="bg-zinc-950 border-white/10 text-white dir-rtl">{Object.entries(contextLabels).map(([val, label]) => (<SelectItem key={val} value={val}>{label}</SelectItem>))}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Object.entries(keyMappings[selectedContext] || {}).map(([action, keys]) => (
              <Card key={action} className="bg-zinc-900/20 border-none p-8 rounded-[2.5rem] flex flex-col gap-6 relative group transition-all hover:bg-zinc-900/40">
                <div className="flex items-center justify-between"><h3 className="text-xl font-black text-white truncate max-w-[180px]">{actionLabels[action as AppAction] || action}</h3><div className="flex gap-2"><Button variant="ghost" size="icon" onClick={() => { setRecordingAction(action as AppAction); setFirstKey(null); }} className={cn("w-10 h-10 rounded-full transition-all", recordingAction === action ? "bg-yellow-500 text-black animate-pulse shadow-glow" : "bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white")}><Edit2 className="w-4 h-4" /></Button></div></div>
                <div className="flex flex-wrap gap-3">{(Array.isArray(keys) && keys.length > 0) ? keys.map(k => (
                  <div key={k} className="group/key relative">
                    <div className={cn("w-12 h-12 rounded-full flex flex-col items-center justify-center border-2 transition-all shadow-xl", !/^\d+$/.test(k) && !['Red', 'Green', 'Yellow', 'Blue'].includes(k) ? "bg-white text-black border-white" : "bg-zinc-800 text-white border-zinc-700", k === 'Red' && "bg-red-600 border-red-500", k === 'Green' && "bg-green-600 border-green-500", k === 'Yellow' && "bg-yellow-500 border-yellow-400 text-black", k === 'Blue' && "bg-blue-600 border-blue-500")}>
                      <span className="text-[7px] font-black uppercase opacity-60">زر</span>
                      <span className="text-[10px] font-black uppercase truncate px-1 w-full text-center">{k.length > 5 ? k.substring(0, 4) : k}</span>
                    </div>
                    <button onClick={() => removeSpecificKeyMapping(selectedContext, action as AppAction, k)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover/key:opacity-100 transition-opacity border border-white/20"><Trash2 className="w-2.5 h-2.5 text-white" /></button>
                  </div>
                )) : (<div className="h-12 flex items-center px-4 rounded-full bg-white/5 border border-dashed border-white/10"><span className="text-[10px] text-white/20 font-black uppercase tracking-widest">No Keys</span></div>)}</div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
