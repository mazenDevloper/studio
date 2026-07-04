
"use client";

import { useState, useEffect, useRef } from "react";
import { useMediaStore, Reminder, Manuscript, MappingContext, AppAction } from "@/lib/store";
import { 
  Settings, Bell, Trash2, Edit2, Plus, Monitor, Palette, Keyboard, Timer, ArrowRightLeft, 
  Loader2, RefreshCw, Mic, X, Type, ImageIcon, Zap, Save, Sparkles, MonitorPlay, Upload, Link, ChevronUp, ChevronDown, CheckCircle2, Circle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export function SettingsView() {
  const { 
    addReminder, removeReminder, updateReminder, reminders,
    mapSettings, updateMapSettings, prayerSettings, updatePrayerSetting,
    customManuscripts, addManuscript, updateManuscript, removeManuscript, reorderManuscript,
    keyMappings, setKeyMapping, removeSpecificKeyMapping,
    customWallBackgrounds, addCustomWallBackground, removeCustomWallBackground,
    displayScale, setDisplayScale, dockScale, setDockScale,
    favoriteReciters, removeReciter, updateReciter, reorderReciter, addRecitersBatch,
    fetchPriorityData, syncMasterBin, saveRecitersReorder, saveManuscriptsReorder,
    isInitialLoading, favoriteChannels, saveChannelsReorder, isReorderMode, toggleReorderMode
  } = useMediaStore();
  
  const { toast } = useToast();
  const bgInputRef = useRef<HTMLInputElement>(null);
  const manuscriptFileRef = useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedContext, setSelectedContext] = useState<MappingContext>('global');
  const [bgUrlInput, setBgUrlInput] = useState("");
  const [manuscriptInput, setManuscriptInput] = useState("");
  const [manuscriptType, setManuscriptType] = useState<'text' | 'image'>('text');
  const [jsonReciters, setJsonReciters] = useState("");

  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({
    label: "", color: "text-blue-400", iconType: "bell", 
    startType: 'azan', startReference: 'fajr', startOffset: 0,
    endType: 'duration', endReference: 'fajr', endOffset: 0,
    showCountdown: true, showCountup: false, countdownWindow: 15, completed: false
  });

  const COLORS = [
    { name: "أزرق", value: "text-blue-400" },
    { name: "أخضر", value: "text-emerald-400" },
    { name: "أرجواني", value: "text-purple-400" },
    { name: "برتقالي", value: "text-orange-400" },
    { name: "أحمر", value: "text-red-500" },
    { name: "أصفر", value: "text-yellow-400" },
    { name: "أبيض", value: "text-white" }
  ];

  useEffect(() => { fetchPriorityData('all'); }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try { await fetchPriorityData('all'); toast({ title: "تم تحديث البيانات سحابياً" }); } finally { setIsRefreshing(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'bg' | 'manuscript') => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (res) => {
      const dataUrl = res.target?.result as string;
      if (target === 'bg') {
        addCustomWallBackground(dataUrl); 
        updateMapSettings({ manuscriptBgUrl: dataUrl });
      } else {
        addManuscript({ id: Date.now().toString(), type: 'image', content: dataUrl });
      }
      toast({ title: "تم الرفع بنجاح" });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveReminder = () => {
    if (!newReminder.label) return;
    const id = editingReminderId || Date.now().toString();
    addReminder({ ...newReminder, id } as Reminder);
    setNewReminder({ label: "", color: "text-blue-400", iconType: "bell", startType: 'azan', startReference: 'fajr', startOffset: 0, endType: 'duration', endReference: 'fajr', endOffset: 0, showCountdown: true, showCountup: false, countdownWindow: 15, completed: false });
    setEditingReminderId(null);
    toast({ title: editingReminderId ? "تم التعديل بنجاح" : "تمت إضافة التذكير" });
  };

  const loadReminderForEdit = (r: Reminder) => {
    setNewReminder(r);
    setEditingReminderId(r.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImportReciters = () => {
    try {
      const parsed = JSON.parse(jsonReciters);
      const batch = Array.isArray(parsed) ? parsed : (parsed.reciters || []);
      addRecitersBatch(batch);
      setJsonReciters("");
      toast({ title: "تم استيراد القراء بنجاح" });
    } catch {
      toast({ variant: "destructive", title: "خطأ في نص JSON" });
    }
  };

  const prayersList = [
    { id: 'fajr', name: 'الفجر' }, { id: 'sunrise', name: 'الشروق' }, { id: 'duha', name: 'الضحى' },
    { id: 'dhuhr', name: 'الظهر' }, { id: 'asr', name: 'العصر' }, { id: 'maghrib', name: 'المغرب' }, { id: 'isha', name: 'العشاء' }
  ];

  const actionsByContext: Record<MappingContext, AppAction[]> = {
    global: ['nav_up', 'nav_down', 'nav_left', 'nav_right', 'nav_ok', 'nav_back', 'goto_home', 'goto_media', 'goto_quran', 'goto_hihi2', 'goto_iptv', 'goto_football', 'goto_settings', 'toggle_reorder', 'inc_zoom', 'dec_zoom', 'inc_font', 'dec_font', 'next_manuscript', 'prev_manuscript'],
    player: ['player_next', 'player_prev', 'player_save', 'player_fullscreen', 'player_playlist', 'player_minimize', 'player_close', 'player_settings'],
    dashboard: [], media: ['focus_search', 'focus_reciters', 'focus_surahs'], quran: ['focus_search', 'focus_reciters', 'focus_surahs'], football: [], iptv: [],
    settings: ['goto_tab_appearance', 'goto_tab_prayers', 'goto_tab_reminders', 'goto_tab_manuscripts', 'goto_tab_buttonmap', 'goto_tab_reciters']
  };

  return (
    <div className="p-12 space-y-12 max-w-7xl mx-auto pb-40 text-right dir-rtl bg-black min-h-full">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-2"><h1 className="text-6xl font-black text-white tracking-tighter flex items-center gap-6">الإعدادات السيادية <Settings className="w-12 h-12 text-primary animate-spin-slow" /></h1><p className="text-white/40 font-bold uppercase tracking-[0.6em] text-sm">Unified System Hub v2600.0</p></div>
        <div className="flex gap-4">
          <Button onClick={handleManualRefresh} disabled={isRefreshing} className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-full h-14 px-8 font-black focusable shadow-glow">{isRefreshing ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <RefreshCw className="w-5 h-5 ml-2" />} تحديث محلي</Button>
          <Button onClick={async () => { setIsSyncing(true); await syncMasterBin(); setIsSyncing(false); toast({ title: "تم الدفع العالمي بنجاح" }); }} disabled={isSyncing} className="bg-primary text-white rounded-full h-14 px-8 font-black focusable shadow-glow">{isSyncing ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Zap className="w-5 h-5 ml-2" />} دفع عالمي</Button>
        </div>
      </header>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="bg-white/5 p-1 rounded-full border border-white/10 h-20 mb-12 flex justify-around">
          <TabsTrigger value="appearance" className="rounded-full px-10 h-full font-black text-lg focusable">المظهر</TabsTrigger>
          <TabsTrigger value="prayers" className="rounded-full px-10 h-full font-black text-lg focusable">الصلاة</TabsTrigger>
          <TabsTrigger value="reminders" className="rounded-full px-10 h-full font-black text-lg focusable">التذكيرات</TabsTrigger>
          <TabsTrigger value="reciters" className="rounded-full px-10 h-full font-black text-lg focusable">القراء</TabsTrigger>
          <TabsTrigger value="manuscripts" className="rounded-full px-10 h-full font-black text-lg focusable">المخطوطات</TabsTrigger>
          <TabsTrigger value="buttonmap" className="rounded-full px-10 h-full font-black text-lg focusable">الأزرار</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-8">
          <Card className="p-8 space-y-8 bg-white/5 border-white/10 rounded-[3rem]">
            <CardTitle className="text-3xl font-black text-white flex items-center gap-4"><ImageIcon className="w-8 h-8 text-primary" />خلفيات اللوحة السيادية</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <span className="text-xs font-black text-white/40 uppercase">إضافة عن طريق الرابط</span>
                 <div className="flex gap-4">
                   <Input placeholder="رابط الصورة المباشر..." value={bgUrlInput} onChange={(e) => setBgUrlInput(e.target.value)} className="h-16 bg-white/5 border-white/10 text-xl" />
                   <Button onClick={() => { if(bgUrlInput) { addCustomWallBackground(bgUrlInput); updateMapSettings({ manuscriptBgUrl: bgUrlInput }); setBgUrlInput(""); } }} className="bg-blue-600 h-16 px-8 rounded-2xl"><Link className="w-5 h-5 ml-2" /> إضافة</Button>
                 </div>
              </div>
              <div className="space-y-4">
                 <span className="text-xs font-black text-white/40 uppercase">رفع ملف مباشر</span>
                 <input type="file" hidden ref={bgInputRef} accept="image/*" onChange={(e) => handleFileUpload(e, 'bg')} />
                 <Button onClick={() => bgInputRef.current?.click()} className="w-full h-16 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-2xl"><Upload className="w-6 h-6 ml-2" /> اختيار من الجهاز (UPLOAD)</Button>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-4 max-h-[300px] overflow-y-auto p-4 bg-black/20 rounded-3xl custom-scrollbar">
              {customWallBackgrounds?.map((bg, i) => (
                <div key={i} onClick={() => updateMapSettings({ manuscriptBgUrl: bg })} className={cn("aspect-video rounded-xl overflow-hidden border-4 cursor-pointer transition-all relative group", mapSettings.manuscriptBgUrl === bg ? "border-primary shadow-glow" : "border-transparent opacity-60 hover:opacity-100")}>
                  <img src={bg} className="w-full h-full object-cover" alt="" />
                  <button onClick={(e) => { e.stopPropagation(); removeCustomWallBackground(bg); }} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-2xl"><Trash2 className="w-3 h-3 text-white" /></button>
                </div>
              ))}
            </div>
            <Button onClick={syncMasterBin} className="w-full bg-primary h-16 rounded-[2rem] font-black text-xl shadow-glow mt-8"><Save className="w-6 h-6 ml-2" /> حفظ المظهر سحابياً</Button>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-8">
          <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem]">
            <CardTitle className="text-4xl font-black text-white flex items-center gap-6 mb-12">
              <Bell className="w-12 h-12 text-primary" /> {editingReminderId ? "تعديل التذكير" : "إضافة تذكير جديد"}
            </CardTitle>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 bg-black/40 p-10 rounded-[3rem] border border-white/10 mb-12 shadow-2xl">
              <div className="space-y-6">
                <Input placeholder="اسم التذكير..." value={newReminder.label} onChange={(e) => setNewReminder({ ...newReminder, label: e.target.value })} className="h-20 bg-white/5 text-white text-3xl font-black rounded-2xl" />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-black text-white/40 uppercase">اللون</span>
                    <Select value={newReminder.color} onValueChange={(v) => setNewReminder({ ...newReminder, color: v })}>
                      <SelectTrigger className="h-16 bg-white/5 border-white/10 rounded-xl text-xl font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-950 text-white dir-rtl">
                        {COLORS.map(c => <SelectItem key={c.value} value={c.value} className={c.value}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-black text-white/40 uppercase">توقيت البداية</span>
                    <Select value={newReminder.startType} onValueChange={(v) => setNewReminder({ ...newReminder, startType: v as any })}>
                      <SelectTrigger className="h-16 bg-white/5 border-white/10 rounded-xl text-xl font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-950 text-white dir-rtl">
                        <SelectItem value="azan">عند أذان صلاة معينة</SelectItem>
                        <SelectItem value="iqamah">عند إقامة صلاة معينة</SelectItem>
                        <SelectItem value="manual">وقت حر (يدوي)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(newReminder.startType === 'azan' || newReminder.startType === 'iqamah') && (
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <span className="text-xs font-black text-white/40 uppercase">الصلاة المرتبطة</span>
                      <Select value={newReminder.startReference} onValueChange={(v) => setNewReminder({ ...newReminder, startReference: v })}>
                        <SelectTrigger className="h-16 bg-white/5 border-white/10 rounded-xl text-xl font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-950 text-white dir-rtl">
                          {prayersList.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32 space-y-2">
                      <span className="text-xs font-black text-white/40 uppercase">الإزاحة</span>
                      <Input type="number" value={newReminder.startOffset} onChange={(e) => setNewReminder({ ...newReminder, startOffset: parseInt(e.target.value) || 0 })} className="h-16 bg-white/5 text-center font-bold text-xl" />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-xs font-black text-white/40 uppercase">توقيت الانتهاء</span>
                    <Select value={newReminder.endType} onValueChange={(v) => setNewReminder({ ...newReminder, endType: v as any })}>
                      <SelectTrigger className="h-16 bg-white/5 border-white/10 rounded-xl text-xl font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-950 text-white dir-rtl">
                        <SelectItem value="azan">عند أذان صلاة معينة</SelectItem>
                        <SelectItem value="iqamah">عند إقامة صلاة معينة</SelectItem>
                        <SelectItem value="manual">وقت حر (يدوي)</SelectItem>
                        <SelectItem value="duration">بعد مرور مدة</SelectItem>
                        <SelectItem value="prayer">عند صلاة تالية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(newReminder.endType === 'azan' || newReminder.endType === 'iqamah' || newReminder.endType === 'prayer') && (
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <span className="text-xs font-black text-white/40 uppercase">الصلاة المرتبطة</span>
                        <Select value={newReminder.endReference} onValueChange={(v) => setNewReminder({ ...newReminder, endReference: v })}>
                          <SelectTrigger className="h-16 bg-white/5 border-white/10 rounded-xl text-xl font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-zinc-950 text-white dir-rtl">
                            {prayersList.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24 space-y-2">
                        <span className="text-xs font-black text-white/40 uppercase">الإزاحة</span>
                        <Input type="number" value={newReminder.endOffset} onChange={(e) => setNewReminder({ ...newReminder, endOffset: parseInt(e.target.value) || 0 })} className="h-16 bg-white/5 text-center font-bold" />
                      </div>
                    </div>
                  )}
                  {newReminder.endType === 'duration' && (
                    <div className="space-y-2">
                      <span className="text-xs font-black text-white/40 uppercase">المدة (بالدقائق)</span>
                      <Input type="number" value={newReminder.durationMinutes} onChange={(e) => setNewReminder({ ...newReminder, durationMinutes: parseInt(e.target.value) || 0 })} className="h-16 bg-white/5 text-xl font-bold text-center" />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-10 flex flex-col justify-center">
                <div className="flex items-center justify-between bg-white/5 p-6 rounded-[2rem]">
                  <div className="flex items-center gap-4"><Switch checked={newReminder.showCountdown} onCheckedChange={(v) => setNewReminder({ ...newReminder, showCountdown: v })} /><span className="text-xl font-black text-white">العد التنازلي</span></div>
                  <div className="flex items-center gap-4"><Switch checked={newReminder.showCountup} onCheckedChange={(v) => setNewReminder({ ...newReminder, showCountup: v })} /><span className="text-xl font-black text-white">العد التصاعدي</span></div>
                </div>
                <div className="flex gap-4">
                  <Button onClick={handleSaveReminder} className="flex-1 h-20 bg-primary rounded-[2rem] text-2xl font-black shadow-glow">
                    {editingReminderId ? "حفظ التعديلات" : "إضافة التذكير السيادي"}
                  </Button>
                  {editingReminderId && <Button onClick={() => setEditingReminderId(null)} className="h-20 w-20 bg-red-600 rounded-[2rem]"><X className="w-8 h-8" /></Button>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {reminders.map((r) => (
                <div key={r.id} className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 flex items-center justify-between group hover:border-primary/40 transition-all shadow-xl">
                  <div className="flex items-center gap-8">
                    <div className={cn("w-20 h-20 rounded-[1.5rem] flex items-center justify-center bg-white/5", r.color)}><Bell className="w-10 h-10 shadow-glow" /></div>
                    <div className="flex flex-col text-right">
                       <span className={cn("text-3xl font-black", r.color)}>{r.label}</span>
                       <span className="text-xs font-bold text-white/20 uppercase tracking-widest mt-1">ID: {r.id}</span>
                    </div>
                  </div>
                  <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-all">
                    <Button onClick={() => loadReminderForEdit(r)} className="w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 focusable"><Edit2 className="w-8 h-8" /></Button>
                    <Button onClick={() => removeReminder(r.id)} className="w-16 h-16 rounded-full bg-red-600/20 text-red-500 border border-red-500/30 focusable"><Trash2 className="w-8 h-8" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={syncMasterBin} className="w-full bg-primary h-20 rounded-[2.5rem] font-black mt-12 shadow-glow text-2xl"><Save className="w-8 h-8 ml-3" /> حفظ كافة التذكيرات سحابياً</Button>
          </Card>
        </TabsContent>

        <TabsContent value="prayers" className="space-y-8">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem]">
              <CardTitle className="text-4xl font-black text-white flex items-center gap-6 mb-12"><Timer className="w-12 h-12 text-primary" />إعدادات الصلاة السيادية</CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {prayerSettings.map((s) => (
                  <div key={s.id} className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 flex flex-col gap-6">
                    <div className="flex items-center justify-between"><h4 className="text-3xl font-black text-white">{s.name}</h4><div className="px-4 py-1.5 rounded-full bg-primary/20 text-primary text-xs font-black uppercase tracking-widest">{s.id}</div></div>
                    <div className="space-y-4">
                      <div className="flex justify-between text-xs font-black text-white/40 uppercase"><span>الإزاحة (دقائق)</span><span>{s.offsetMinutes}</span></div>
                      <Slider value={[s.offsetMinutes]} min={-60} max={60} step={1} onValueChange={([v]) => updatePrayerSetting(s.id, { offsetMinutes: v })} />
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between text-xs font-black text-white/40 uppercase"><span>مدة الإقامة (دقائق)</span><span>{s.iqamahDuration}</span></div>
                      <Slider value={[s.iqamahDuration]} min={0} max={60} step={1} onValueChange={([v]) => updatePrayerSetting(s.id, { iqamahDuration: v })} />
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={syncMasterBin} className="w-full bg-primary h-20 rounded-[2.5rem] font-black mt-12 shadow-glow text-2xl"><Save className="w-8 h-8 ml-3" /> حفظ كافة إعدادات الصلاة سحابياً</Button>
           </Card>
        </TabsContent>

        <TabsContent value="reciters" className="space-y-8">
          <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem]">
            <CardTitle className="text-4xl font-black text-white flex items-center gap-6 mb-12"><Mic className="w-12 h-12 text-emerald-500" />رادار القراء (عمود واحد)</CardTitle>
            
            <div className="flex items-center justify-between mb-8">
              <div className="bg-black/40 p-8 rounded-[3rem] border border-white/10 flex-1 space-y-6">
                 <span className="text-xs font-black text-white/40 uppercase">استيراد دفعة واحدة (JSON TEXT)</span>
                 <textarea value={jsonReciters} onChange={(e) => setJsonReciters(e.target.value)} placeholder='{"reciters": [...]}' className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-code text-sm" />
                 <Button onClick={handleImportReciters} className="bg-emerald-600 px-10 h-14 rounded-xl font-black shadow-glow">استيراد القائمة</Button>
              </div>
              <div className="mx-8">
                <Button onClick={toggleReorderMode} variant={isReorderMode ? "default" : "outline"} className={cn("rounded-full h-16 px-8 relative", isReorderMode ? "bg-yellow-500 text-black shadow-glow" : "bg-white/5")}>
                  <ArrowRightLeft className="w-5 h-5 ml-2" /> {isReorderMode ? "إيقاف الترتيب" : "تفعيل الترتيب بالأسهم"}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-4">
              {favoriteReciters.map((r, i) => (
                <div key={r.channelid} className="bg-black/40 border border-white/5 p-6 rounded-[2rem] flex items-center justify-between group hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl"><img src={r.image} className="w-full h-full object-cover" /></div>
                    <h4 className="font-black text-2xl text-white">{r.name}</h4>
                  </div>
                  <div className="flex items-center gap-4">
                    {isReorderMode && (
                      <div className="flex flex-col gap-2">
                        <button onClick={() => reorderReciter(r.channelid, 'prev')} className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/20 hover:bg-emerald-600"><ChevronUp className="w-6 h-6" /></button>
                        <button onClick={() => reorderReciter(r.channelid, 'next')} className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/20 hover:bg-emerald-600"><ChevronDown className="w-6 h-6" /></button>
                      </div>
                    )}
                    <Button variant="ghost" onClick={() => removeReciter(r.channelid)} className="text-red-500 w-12 h-12 rounded-full hover:bg-red-600/20"><Trash2 className="w-6 h-6" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={saveRecitersReorder} className="w-full bg-emerald-600 h-20 rounded-[2.5rem] font-black mt-12 shadow-glow text-2xl"><Save className="w-8 h-8 ml-3" /> حفظ قائمة القراء سحابياً</Button>
          </Card>
        </TabsContent>

        <TabsContent value="manuscripts" className="space-y-8">
          <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem]">
            <CardTitle className="text-4xl font-black text-white flex items-center gap-6 mb-12"><Type className="w-12 h-12 text-primary" />مخزن المخطوطات</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="p-8 bg-black/40 rounded-[3rem] border border-white/10 space-y-6">
                <span className="text-xs font-black text-white/40 uppercase">إضافة نص أو رابط</span>
                <div className="flex gap-4">
                  <Select value={manuscriptType} onValueChange={(v) => setManuscriptType(v as any)}>
                    <SelectTrigger className="w-40 h-16 bg-white/5 text-white font-black rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-950 text-white dir-rtl"><SelectItem value="text">نصية</SelectItem><SelectItem value="image">صورة رابط</SelectItem></SelectContent>
                  </Select>
                  <Input placeholder="أدخل المحتوى..." value={manuscriptInput} onChange={(e) => setManuscriptInput(e.target.value)} className="h-16 flex-1 bg-white/5 px-6 rounded-xl" />
                  <Button onClick={() => { if(manuscriptInput) { addManuscript({ id: Date.now().toString(), type: manuscriptType, content: manuscriptInput }); setManuscriptInput(""); } }} className="h-16 px-8 bg-primary rounded-xl shadow-glow"><Plus className="w-8 h-8" /></Button>
                </div>
              </div>
              <div className="p-8 bg-black/40 rounded-[3rem] border border-white/10 flex flex-col justify-center items-center gap-6">
                 <span className="text-xs font-black text-white/40 uppercase">رفع مخطوطة من الجهاز</span>
                 <input type="file" hidden ref={manuscriptFileRef} accept="image/*" onChange={(e) => handleFileUpload(e, 'manuscript')} />
                 <Button onClick={() => manuscriptFileRef.current?.click()} className="w-full h-16 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl font-black shadow-glow"><Upload className="w-6 h-6 ml-3" /> اختيار ملف (UPLOAD)</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 max-h-[500px] overflow-y-auto custom-scrollbar">
              {customManuscripts.map((m) => (
                <div key={m.id} className="bg-black/40 border border-white/5 p-8 rounded-[2.5rem] flex items-center justify-between group hover:border-primary/40 transition-all">
                  <div className="flex-1 overflow-hidden flex items-center gap-8">
                    <div className="flex flex-col gap-2">
                       <button onClick={() => reorderManuscript(m.id, 'prev')} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20 hover:bg-primary"><ChevronUp className="w-4 h-4" /></button>
                       <button onClick={() => reorderManuscript(m.id, 'next')} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/20 hover:bg-primary"><ChevronDown className="w-4 h-4" /></button>
                    </div>
                    {m.type === 'text' ? <p className="text-2xl font-black text-white truncate">{m.content}</p> : <img src={m.content} className="h-20 object-contain invert brightness-0" />}
                  </div>
                  <div className="flex gap-2">
                    {m.type === 'text' && <Button onClick={() => { setManuscriptInput(m.content); setManuscriptType('text'); removeManuscript(m.id); }} className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-400"><Edit2 className="w-5 h-5" /></Button>}
                    <Button variant="ghost" onClick={() => removeManuscript(m.id)} className="text-red-500 w-12 h-12 rounded-full hover:bg-red-600/20"><Trash2 className="w-6 h-6" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={saveManuscriptsReorder} className="w-full bg-primary h-20 rounded-[2.5rem] font-black mt-12 shadow-glow text-2xl"><Save className="w-8 h-8 ml-3" /> حفظ المخطوطات سحابياً</Button>
          </Card>
        </TabsContent>

        <TabsContent value="buttonmap" className="space-y-8">
          <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem]">
            <CardTitle className="text-4xl font-black text-white flex items-center gap-6 mb-12"><Keyboard className="w-12 h-12 text-primary" /> خريطة الأزرار السيادية</CardTitle>
            <div className="grid grid-cols-4 gap-4 mb-12">
              {Object.keys(keyMappings).map((ctx) => (
                <Button key={ctx} onClick={() => setSelectedContext(ctx as MappingContext)} variant={selectedContext === ctx ? "default" : "outline"} className={cn("rounded-2xl h-16 font-black", selectedContext === ctx ? "bg-primary" : "bg-white/5")}>{ctx.toUpperCase()}</Button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[600px] overflow-y-auto custom-scrollbar p-6 bg-black/40 rounded-[3rem] border border-white/10">
              {actionsByContext[selectedContext]?.map((action) => (
                <div key={action} className="bg-white/5 p-6 rounded-2xl flex items-center justify-between border border-white/5 group hover:border-primary/40 transition-all">
                  <div className="flex flex-col text-right"><span className="text-xl font-black text-white">{action.replace(/_/g, ' ').toUpperCase()}</span><span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">App Action System</span></div>
                  <div className="flex gap-2">
                    {keyMappings[selectedContext]?.[action]?.map((key, i) => (<div key={i} className="px-4 py-2 bg-primary/20 text-primary border border-primary/40 rounded-xl font-black text-xs flex items-center gap-2">{key}<button onClick={() => removeSpecificKeyMapping(selectedContext, action, key)}><X className="w-3 h-3" /></button></div>))}
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={syncMasterBin} className="w-full bg-primary h-20 rounded-[2.5rem] font-black mt-12 shadow-glow text-2xl"><Save className="w-8 h-8 ml-3" /> حفظ خريطة الأزرار سحابياً</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
