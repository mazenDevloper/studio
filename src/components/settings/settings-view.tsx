
"use client";

import { useState, useMemo, useEffect } from "react";
import { useMediaStore, Reminder, Manuscript, AppAction, MappingContext, IptvChannel } from "@/lib/store";
import { 
  Settings, Bell, Trash2, Edit2, Plus, Monitor, Palette, Keyboard, Clock, CheckCircle2, Save, BookOpen, LayoutGrid, Eye, Timer, Tv, ArrowRightLeft
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

/**
 * SettingsView v106.0 - Hyper-Fast & Channel Management
 * Expanded zoom slider max to 1.5 (150%) to support new defaults.
 */
export function SettingsView() {
  const { 
    addReminder, removeReminder, updateReminder, reminders,
    mapSettings, updateMapSettings, prayerSettings, updatePrayerSetting,
    customManuscripts, addManuscript, removeManuscript,
    keyMappings, setKeyMapping, removeSpecificKeyMapping,
    customWallBackgrounds, addCustomWallBackground, autoHideIsland, setAutoHideIsland,
    displayScale, setDisplayScale, dockScale, setDockScale,
    setIsRecordingKey, favoriteIptvChannels, toggleFavoriteIptvChannel, reorderIptvChannelTo
  } = useMediaStore();
  
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [bgInput, setBgInput] = useState("");
  const [manuscriptInput, setManuscriptInput] = useState("");
  const [manuscriptType, setManuscriptType] = useState<'text' | 'image'>('text');
  const [selectedContext, setSelectedContext] = useState<MappingContext>('global');
  const [recordingAction, setRecordingAction] = useState<AppAction | null>(null);
  const [recordingType, setRecordingType] = useState<'single' | 'combo'>('single');
  const [firstKey, setFirstKey] = useState<string | null>(null);

  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({
    label: "", relativePrayer: "manual", manualTime: "12:00", offsetMinutes: 0, color: "text-blue-400", iconType: "bell", countdownWindow: 15, countupWindow: 15, expiryType: 'prayer', expiryValue: 'next'
  });

  const getDisplayNumber = (index: number) => {
    let num = 11 + index;
    if (num >= 13) num++;
    if (num >= 17) num++;
    return num;
  };

  const handleSaveReminder = () => {
    if (!newReminder.label) { toast({ variant: "destructive", title: "خطأ", description: "يرجى إدخال وصف" }); return; }
    const data = { ...newReminder, id: editingId || Date.now().toString() } as Reminder;
    if (editingId) updateReminder(editingId, data);
    else addReminder(data);
    setEditingId(null);
    setNewReminder({ label: "", relativePrayer: "manual", manualTime: "12:00", offsetMinutes: 0, color: "text-blue-400", iconType: "bell", countdownWindow: 15, countupWindow: 15, expiryType: 'prayer', expiryValue: 'next' });
    toast({ title: "تم الحفظ" });
  };

  const handleEdit = (rem: Reminder) => {
    setEditingId(rem.id);
    setNewReminder(rem);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!recordingAction) return;
    setIsRecordingKey(true);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const key = normalizeKey(e);
      
      if (recordingType === 'single') {
        setKeyMapping(selectedContext, recordingAction, key);
        setRecordingAction(null);
        setIsRecordingKey(false);
        toast({ title: "تم التعيين", description: `تم ربط الزر ${key} بنجاح` });
      } else {
        if (!firstKey) {
          setFirstKey(key);
          toast({ title: "الزر الأول مسجل", description: "اضغط الزر الثاني لإتمام المجموعة" });
        } else {
          const combo = firstKey + key;
          setKeyMapping(selectedContext, recordingAction, combo);
          setRecordingAction(null);
          setFirstKey(null);
          setIsRecordingKey(false);
          toast({ title: "تم تعيين المجموعة", description: `تم ربط ${combo} بنجاح` });
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      setIsRecordingKey(false);
    };
  }, [recordingAction, selectedContext, setKeyMapping, toast, setIsRecordingKey, recordingType, firstKey]);

  const wallPresets = [
    "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?q=80&w=2000", 
    "https://images.unsplash.com/photo-1594911772125-07fc7a2d8d9f?q=80&w=2000", 
    "https://images.unsplash.com/photo-1519817650390-64a93db51149?q=80&w=2000"
  ];
  const allBackgrounds = useMemo(() => Array.from(new Set([...wallPresets, ...customWallBackgrounds])), [customWallBackgrounds, wallPresets]);

  const actionLabels: Partial<Record<AppAction, string>> = {
    goto_home: "الذهاب للرئيسية",
    goto_media: "فتح الميديا",
    goto_quran: "فتح المصحف",
    goto_hihi2: "فتح Hihi2",
    goto_iptv: "فتح البث المباشر",
    goto_football: "فتح مركز كووورة",
    goto_settings: "فتح الإعدادات",
    player_next: "التالي",
    player_prev: "السابق",
    player_close: "إغلاق المشغل",
    player_fullscreen: "تبديل الشاشة",
    player_minimize: "تصغير/تكبير المشغل",
    player_save: "حفظ الفيديو",
    player_settings: "قائمة أزرار المشغل",
    player_playlist: "إظهار/إخفاء القائمة",
    nav_up: "تحريك للأعلى",
    nav_down: "تحريك للأسفل",
    nav_left: "تحريك لليمين",
    nav_right: "تحريك لليسار",
    nav_ok: "تأكيد / موافق",
    nav_back: "عودة للخلف",
    toggle_reorder: "وضع الترتيب",
    delete_item: "حذف عنصر",
    toggle_star: "تمييز بنجمة"
  };

  const contextLabels: Record<MappingContext, string> = {
    global: "العام (الأساسي)",
    player: "المشغل",
    dashboard: "الرئيسية",
    media: "الميديا",
    quran: "المصحف",
    football: "كرة القدم",
    iptv: "البث المباشر",
    settings: "الإعدادات"
  };

  const ActionKeyBadge = ({ k, action, context }: { k: string, action: AppAction, context: MappingContext }) => {
    const isNumber = /^\d$/.test(k);
    const isWhite = !isNumber && !['Red', 'Green', 'Yellow', 'Blue'].includes(k);

    return (
      <div className="group/key relative">
        <div className={cn(
          "w-12 h-12 rounded-full flex flex-col items-center justify-center border-2 transition-all shadow-xl",
          isWhite ? "bg-white text-black border-white" : "bg-zinc-800 text-white border-zinc-700",
          k === 'Red' && "bg-red-600 border-red-500",
          k === 'Green' && "bg-green-600 border-green-500",
          k === 'Yellow' && "bg-yellow-500 border-yellow-400 text-black",
          k === 'Blue' && "bg-blue-600 border-blue-500"
        )}>
          <span className="text-[7px] font-black uppercase opacity-60">زر</span>
          <span className="text-[10px] font-black uppercase truncate px-1 w-full text-center">
            {k.length > 5 ? k.substring(0, 4) : k}
          </span>
        </div>
        <button 
          onClick={() => removeSpecificKeyMapping(context, action, k)}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover/key:opacity-100 transition-opacity border border-white/20"
        >
          <Trash2 className="w-2.5 h-2.5 text-white" />
        </button>
      </div>
    );
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
          <TabsTrigger value="prayers" className="rounded-full px-8 h-full font-bold focusable relative">الصلوات</TabsTrigger>
          <TabsTrigger value="reminders" className="rounded-full px-8 h-full font-bold focusable relative">التذكيرات</TabsTrigger>
          <TabsTrigger value="iptv_channels" className="rounded-full px-8 h-full font-bold focusable relative">قنوات البث</TabsTrigger>
          <TabsTrigger value="manuscripts" className="rounded-full px-8 h-full font-bold focusable relative">المخطوطات</TabsTrigger>
          <TabsTrigger value="buttonmap" className="rounded-full px-8 h-full font-bold focusable relative">الأزرار</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-12 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="premium-glass p-8 space-y-8 bg-white/5 border-white/10">
              <CardTitle className="text-2xl font-black text-white flex items-center gap-3"><Monitor className="w-6 h-6 text-primary" />عرض الشاشة</CardTitle>
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black text-white/60">زوم المحتوى (لهذا الجهاز)</span>
                    <span className="text-primary font-black">{Math.round((displayScale ?? 0.8) * 100)}%</span>
                  </div>
                  <Slider value={[displayScale ?? 0.8]} min={0.5} max={1.5} step={0.05} onValueChange={([v]) => setDisplayScale(v)} />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-black text-white/60">زوم شريط الأدوات (Car Dock)</span>
                    <span className="text-accent font-black">{Math.round((dockScale ?? 1.0) * 100)}%</span>
                  </div>
                  <Slider value={[dockScale ?? 1.0]} min={0.5} max={1.5} step={0.05} onValueChange={([v]) => setDockScale(v)} />
                </div>
                <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5">
                  <div className="space-y-1"><h4 className="text-lg font-bold text-white">إخفاء الجزيرة تلقائياً</h4><p className="text-xs text-white/40">تظهر فقط عند وجود عد تنازلي</p></div>
                  <Switch checked={autoHideIsland} onCheckedChange={setAutoHideIsland} />
                </div>
              </div>
            </Card>
            <Card className="premium-glass p-8 space-y-8 bg-white/5 border-white/10">
              <CardTitle className="text-2xl font-black text-white flex items-center gap-3">
                <Palette className="w-6 h-6 text-primary" />
                خلفية اللوحة
                <span className="text-[10px] text-primary/60 font-black uppercase tracking-widest ml-auto bg-primary/10 px-3 py-1 rounded-full border border-primary/20">Synced Source</span>
              </CardTitle>
              <div className="space-y-6">
                <div className="flex gap-4"><Input placeholder="رابط صورة جديدة..." value={bgInput} onChange={(e) => setBgInput(e.target.value)} className="h-14 bg-black/40 border-white/10 rounded-xl px-6 text-white text-right flex-1" /><Button onClick={() => { if(bgInput) { addCustomWallBackground(bgInput); updateMapSettings({ manuscriptBgUrl: bgInput }); setBgInput(""); toast({title: "تمت الإضافة"}); } }} className="h-14 w-14 bg-primary rounded-xl focusable"><Plus className="w-6 h-6" /></Button></div>
                <div className="grid grid-cols-3 gap-4">{allBackgrounds.map((url, i) => (<div key={i} onClick={() => updateMapSettings({ manuscriptBgUrl: url })} className={cn("aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition-all group relative", mapSettings.manuscriptBgUrl === url ? "border-primary shadow-glow scale-105" : "border-transparent opacity-60 hover:opacity-100")}><img src={url} className="w-full h-full object-cover" alt="" /></div>))}</div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="iptv_channels" className="space-y-8 animate-in fade-in duration-300">
          <Card className="bg-white/5 border-white/10 p-8 rounded-[3rem]">
            <div className="flex items-center justify-between mb-10">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-3xl font-black text-white flex items-center gap-4"><Tv className="w-8 h-8 text-emerald-500" />إدارة قنوات البث المباشر</CardTitle>
                <p className="text-white/40 font-bold text-xs mr-12">تحكم بأرقام القنوات (11-23) عبر إعادة الترتيب</p>
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl flex items-center gap-4">
                <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">عدد المفضلات:</span>
                <span className="text-2xl font-black text-white">{favoriteIptvChannels.length}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteIptvChannels.map((ch, idx) => (
                <div 
                  key={ch.stream_id} 
                  className="bg-black/40 border border-white/5 p-6 rounded-[2.5rem] flex items-center justify-between group hover:border-emerald-500/40 transition-all duration-300"
                >
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 shadow-xl">
                        <img src={ch.stream_icon} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-emerald-500 border-4 border-black flex items-center justify-center shadow-glow">
                        <span className="text-sm font-black text-black">{getDisplayNumber(idx)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <h4 className="font-black text-white truncate max-w-[150px]">{ch.name}</h4>
                      <span className="text-[10px] text-white/30 font-bold uppercase tracking-tighter">رقم الاختصار: {getDisplayNumber(idx)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => reorderIptvChannelTo(ch.stream_id, favoriteIptvChannels[Math.max(0, idx - 1)].stream_id)}
                        disabled={idx === 0}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/40"
                      >
                        <Plus className="w-4 h-4 rotate-180" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => reorderIptvChannelTo(ch.stream_id, favoriteIptvChannels[Math.min(favoriteIptvChannels.length - 1, idx + 1)].stream_id)}
                        disabled={idx === favoriteIptvChannels.length - 1}
                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/40"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => toggleFavoriteIptvChannel(ch)}
                      className="w-10 h-10 rounded-full bg-red-600/10 text-red-500 border border-red-600/20 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {favoriteIptvChannels.length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4 opacity-20">
                  <Tv className="w-20 h-20" />
                  <p className="font-black text-xl">لا توجد قنوات مفضلة حالياً</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="buttonmap" className="space-y-8 animate-in fade-in duration-300">
          <div className="flex items-center justify-between bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20 shadow-glow">
                <Keyboard className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-4xl font-black text-white tracking-tighter">تخصيص أزرار التحكم</h2>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-white/40 font-bold">اختر السياق:</span>
              <Select value={selectedContext} onValueChange={(v) => setSelectedContext(v as any)}>
                <SelectTrigger className="w-64 h-14 bg-black/60 border-white/10 rounded-2xl px-6 text-white text-right focusable">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-white/10 text-white dir-rtl">
                  {Object.entries(contextLabels).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Object.entries(keyMappings[selectedContext] || {}).map(([action, keys]) => (
              <Card key={action} className="bg-zinc-900/20 border-none p-8 rounded-[2.5rem] flex flex-col gap-6 relative group overflow-hidden transition-all hover:bg-zinc-900/40">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-white truncate max-w-[180px]">
                    {actionLabels[action as AppAction] || action}
                  </h3>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => { setRecordingAction(action as AppAction); setFirstKey(null); }}
                      className={cn("w-10 h-10 rounded-full transition-all", recordingAction === action ? "bg-yellow-500 text-black animate-pulse shadow-glow" : "bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600 hover:text-white")}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => useMediaStore.getState().clearKeyMappings(selectedContext, action as AppAction)}
                      className="w-10 h-10 rounded-full bg-red-600/10 text-red-500 border border-red-600/20 hover:bg-red-600 hover:text-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {recordingAction === action && (
                  <div className="flex flex-col gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl animate-in zoom-in-95">
                    <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">نوع البرمجة</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setRecordingType('single'); setFirstKey(null); }} 
                        className={cn("px-4 py-2 rounded-xl text-xs font-black transition-all", recordingType === 'single' ? "bg-yellow-500 text-black" : "bg-white/5 text-white/40 border border-white/5")}
                      >زر واحد</button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setRecordingType('combo'); setFirstKey(null); }}
                        className={cn("px-4 py-2 rounded-xl text-xs font-black transition-all", recordingType === 'combo' ? "bg-yellow-500 text-black" : "bg-white/5 text-white/40 border border-white/5")}
                      >مجموعة (زرين)</button>
                    </div>
                    {recordingType === 'combo' && firstKey && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                        <span className="text-[10px] text-white/60 font-bold">الزر الأول: {firstKey} ... اضغط الزر الثاني</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  {Array.isArray(keys) && keys.length > 0 ? (
                    keys.map(k => (
                      <ActionKeyBadge key={k} k={k} action={action as AppAction} context={selectedContext} />
                    ))
                  ) : (
                    <div className="h-12 flex items-center px-4 rounded-full bg-white/5 border border-dashed border-white/10">
                      <span className="text-[10px] text-white/20 font-black uppercase tracking-widest">No Keys Map</span>
                    </div>
                  )}
                  {recordingAction === action && !firstKey && (
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-yellow-500 flex items-center justify-center animate-pulse">
                      <Eye className="w-5 h-5 text-yellow-500" />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="manuscripts" className="space-y-8 animate-in fade-in duration-300">
          <Card className="bg-white/5 border-white/10 p-8 rounded-[3rem]">
            <CardTitle className="text-2xl font-black text-white flex items-center gap-4 mb-8"><BookOpen className="w-8 h-8 text-primary" />إضافة مخطوطة أو صورة</CardTitle>
            <div className="flex gap-4 mb-8">
              <Select value={manuscriptType} onValueChange={(v) => setManuscriptType(v as any)}>
                <SelectTrigger className="w-40 h-14 bg-black/40 border-white/10 rounded-xl px-6 text-white text-right"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-950 border-white/10 text-white dir-rtl">
                  <SelectItem value="text">نص</SelectItem>
                  <SelectItem value="image">رابط صورة</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder={manuscriptType === 'text' ? "أدخل النص هنا..." : "أدخل رابط الصورة..."} value={manuscriptInput} onChange={(e) => setManuscriptInput(e.target.value)} className="h-14 flex-1 bg-black/40 border-white/10 rounded-xl px-6 text-white text-right" />
              <Button onClick={() => { if(manuscriptInput) { addManuscript({ id: Date.now().toString(), type: manuscriptType, content: manuscriptInput }); setManuscriptInput(""); toast({title: "تمت الإضافة"}); } }} className="h-14 px-8 bg-primary rounded-xl focusable"><Plus className="w-6 h-6 ml-2" />إضافة</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {customManuscripts.map((m) => (
                <Card key={m.id} className="bg-white/5 border-white/10 p-6 rounded-2xl relative group overflow-hidden">
                  {m.type === 'text' ? <p className="text-lg font-bold text-white text-center line-clamp-3">{m.content}</p> : <img src={m.content} className="h-32 w-full object-contain" alt="" />}
                  <Button variant="destructive" size="icon" onClick={() => removeManuscript(m.id)} className="absolute top-2 right-2 w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></Button>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-8 animate-in fade-in duration-300">
          <Card className="bg-white/5 border-white/10 p-8 rounded-[3rem]">
            <CardTitle className="text-2xl font-black text-white flex items-center gap-4 mb-8">{editingId ? <Edit2 className="w-8 h-8 text-yellow-500" /> : <Bell className="w-8 h-8 text-primary" />}{editingId ? "تعديل التذكير" : "إضافة تذكير"}</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-white/40 uppercase px-2">وصف التذكير</span>
                <Input placeholder="مثال: شرب الماء..." value={newReminder.label} onChange={(e) => setNewReminder({ ...newReminder, label: e.target.value })} className="h-14 bg-black/40 border-white/10 rounded-xl px-6 text-white text-right" />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-black text-white/40 uppercase px-2">وقت البدء</span>
                <Select value={newReminder.relativePrayer} onValueChange={(v) => setNewReminder({ ...newReminder, relativePrayer: v as any })}>
                  <SelectTrigger className="h-14 bg-black/40 border-white/10 rounded-xl px-6 text-white text-right"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white dir-rtl">
                    <SelectItem value="manual">وقت يدوي</SelectItem>
                    {prayerSettings.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              {newReminder.relativePrayer === 'manual' ? (
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-white/40 uppercase px-2">الساعة</span>
                  <Input type="time" value={newReminder.manualTime} onChange={(e) => setNewReminder({ ...newReminder, manualTime: e.target.value })} className="h-14 bg-black/40 border-white/10 rounded-xl px-6 text-white" />
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-white/40 uppercase px-2">الإزاحة (بالدقائق)</span>
                  <div className="h-14 flex items-center px-4 bg-black/40 rounded-xl border border-white/10">
                    <Slider value={[newReminder.offsetMinutes || 0]} min={-60} max={60} step={1} onValueChange={([v]) => setNewReminder({ ...newReminder, offsetMinutes: v })} className="flex-1" />
                    <span className="w-12 text-center text-xs font-black text-primary">{newReminder.offsetMinutes}د</span>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <span className="text-[10px] font-black text-white/40 uppercase px-2">نوع الانتهاء</span>
                <Select value={newReminder.expiryType} onValueChange={(v) => setNewReminder({ ...newReminder, expiryType: v as any })}>
                  <SelectTrigger className="h-14 bg-black/40 border-white/10 rounded-xl px-6 text-white text-right"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white dir-rtl">
                    <SelectItem value="prayer">ربط بصلاة</SelectItem>
                    <SelectItem value="manual">وقت يدوي محدد</SelectItem>
                    <SelectItem value="duration">مدة عرض محددة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black text-white/40 uppercase px-2">قيمة الانتهاء</span>
                {newReminder.expiryType === 'prayer' ? (
                  <Select value={newReminder.expiryValue} onValueChange={(v) => setNewReminder({ ...newReminder, expiryValue: v })}>
                    <SelectTrigger className="h-14 bg-black/40 border-white/10 rounded-xl px-6 text-white text-right"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white dir-rtl">
                      <SelectItem value="next">الصلاة التالية (تلقائي)</SelectItem>
                      {prayerSettings.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                ) : newReminder.expiryType === 'manual' ? (
                  <Input type="time" value={newReminder.expiryValue} onChange={(e) => setNewReminder({ ...newReminder, expiryValue: e.target.value })} className="h-14 bg-black/40 border-white/10 rounded-xl px-6 text-white" />
                ) : (
                  <div className="h-14 flex items-center px-4 bg-black/40 rounded-xl border border-white/10">
                    <Slider value={[parseInt(newReminder.expiryValue || '30')]} min={1} max={120} step={1} onValueChange={([v]) => setNewReminder({ ...newReminder, expiryValue: v.toString() })} className="flex-1" />
                    <span className="w-12 text-center text-xs font-black text-accent">{newReminder.expiryValue || '30'}د</span>
                  </div>
                )}
              </div>

              <Button onClick={handleSaveReminder} className="h-14 bg-primary text-white font-black text-lg rounded-xl shadow-glow focusable mt-auto"><Save className="w-6 h-6 ml-3" />{editingId ? "تحديث التذكير" : "إضافة التذكير"}</Button>
            </div>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {reminders.map((rem) => (
              <Card key={rem.id} className="bg-white/5 border-white/10 p-6 rounded-2xl flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center bg-black/20", rem.color)}><Bell className="w-5 h-5" /></div>
                  <div>
                    <h4 className="font-bold text-white">{rem.label}</h4>
                    <span className="text-[9px] text-white/30 uppercase font-black">ينتهي: {rem.expiryType === 'prayer' ? (rem.expiryValue === 'next' ? 'الصلاة التالية' : rem.expiryValue) : rem.expiryValue}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(rem)} className={cn("rounded-full transition-all", editingId === rem.id ? "bg-yellow-500 text-black" : "text-white/20 hover:text-yellow-500")}><Edit2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => removeReminder(rem.id)} className="text-white/20 hover:text-red-500 rounded-full"><Trash2 className="w-5 h-5" /></Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="prayers" className="space-y-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prayerSettings.map(p => (
              <Card key={p.id} className="bg-white/5 border-white/10 p-6 rounded-3xl space-y-6">
                <div className="flex items-center justify-between"><h3 className="text-xl font-black text-white">{p.name}</h3><Clock className="w-5 h-5 text-primary" /></div>
                <div className="space-y-4">
                  <div className="space-y-2"><div className="flex justify-between text-xs text-white/40"><span>الإزاحة</span><span>{p.offsetMinutes} د</span></div><Slider value={[p.offsetMinutes]} min={-60} max={60} step={1} onValueChange={([v]) => updatePrayerSetting(p.id, { offsetMinutes: v })} /></div>
                  {p.iqamahDuration !== undefined && (
                    <div className="space-y-2"><div className="flex justify-between text-xs text-white/40"><span>وقت الإقامة</span><span>{p.iqamahDuration} د</span></div><Slider value={[p.iqamahDuration]} min={0} max={45} step={1} onValueChange={([v]) => updatePrayerSetting(p.id, { iqamahDuration: v })} /></div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
