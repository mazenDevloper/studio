
"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useMediaStore, Reminder, Manuscript, AppAction, MappingContext } from "@/lib/store";
import { 
  Settings, Bell, Trash2, Edit2, Trophy, Star, Plus, Monitor, ImageIcon, Type as TypeIcon, Palette, Upload, Save, Timer, Keyboard, MousePointer2, X as LucideX, Clock, MapPin, CheckCircle2, Play, Circle, Search, User, BookOpen, Info, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn, normalizeKey } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShortcutBadge } from "@/components/layout/car-dock";
import { convertTo12Hour } from "@/lib/constants";
import Image from "next/image";

export function SettingsView() {
  const { 
    addReminder, updateReminder, removeReminder, reminders,
    mapSettings, updateMapSettings, prayerSettings, updatePrayerSetting,
    customManuscripts, addManuscript, removeManuscript, prayerTimes,
    keyMappings, setKeyMapping, removeSpecificKeyMapping, clearKeyMappings,
    isAltModeActive, toggleAltMode
  } = useMediaStore();
  
  const { toast } = useToast();
  const [mappingAction, setMappingAction] = useState<{context: MappingContext, action: AppAction} | null>(null);
  const [selectedContext, setSelectedContext] = useState<MappingContext>('global');
  const [manuscriptInput, setManuscriptInput] = useState("");
  const [manuscriptType, setManuscriptType] = useState<'text' | 'image'>('text');

  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({
    label: "", relativePrayer: "manual", manualTime: "12:00", offsetMinutes: 0, color: "text-blue-400", iconType: "bell"
  });

  const manualSelectionKeys = [
    'Red', 'Green', 'Yellow', 'Blue', 'Sub', 'Back', 'Exit', 
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter',
    'Info', 'Text', 'Settings', 'PageUp', 'PageDown'
  ];

  useEffect(() => {
    if (!mappingAction) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault(); e.stopImmediatePropagation();
      const normalized = normalizeKey(e);
      setKeyMapping(mappingAction.context, mappingAction.action, normalized);
      setMappingAction(null);
      toast({ title: "تم البرمجة", description: `تم تعيين [${normalized}] بنجاح.` });
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [mappingAction, setKeyMapping, toast]);

  const handleManualKeySelect = (key: string) => {
    if (!mappingAction) return;
    setKeyMapping(mappingAction.context, mappingAction.action, key);
    setMappingAction(null);
    toast({ title: "تم البرمجة", description: `تم تعيين [${key}] بنجاح.` });
  };

  const handleAddReminder = () => {
    if (!newReminder.label) { toast({ variant: "destructive", title: "خطأ", description: "يرجى إدخل وصف للتذكير" }); return; }
    addReminder({
      id: Date.now().toString(),
      label: newReminder.label!,
      relativePrayer: newReminder.relativePrayer as any,
      manualTime: newReminder.manualTime,
      offsetMinutes: newReminder.offsetMinutes || 0,
      showCountdown: true, countdownWindow: 15, showCountup: false, countupWindow: 0, completed: false,
      color: newReminder.color || "text-blue-400", iconType: newReminder.iconType as any
    });
    setNewReminder({ label: "", relativePrayer: "manual", manualTime: "12:00", offsetMinutes: 0, color: "text-blue-400", iconType: "bell" });
    toast({ title: "تمت الإضافة", description: "تمت إضافة التذكير المخصص بنجاح." });
  };

  const actionLabels: Record<string, string> = {
    goto_home: "الذهاب للرئيسية", goto_media: "فتح الميديا", goto_quran: "فتح المصحف",
    goto_hihi2: "فتح Hihi2", goto_iptv: "فتح البث المباشر", goto_football: "فتح مركز كووورة",
    goto_settings: "فتح الإعدادات", player_next: "التالي", player_prev: "السابق",
    player_fullscreen: "تبديل الشاشة", player_close: "إغلاق المشغل", player_save: "حفظ الفيديو",
    player_playlist: "إظهار/إخفاء القائمة", player_minimize: "تصغير/تكبير المشغل", player_settings: "قائمة أزرار المشغل",
    focus_search: "تحديد شريط البحث", focus_reciters: "تحديد قائمة القراء", focus_surahs: "تحديد قائمة السور",
    goto_tab_appearance: "تاب المظهر", goto_tab_prayers: "تاب الصلوات", 
    goto_tab_reminders: "تاب التذكيرات", goto_tab_buttonmap: "تاب الأزرار",
    nav_back: "زر الرجوع", nav_ok: "زر الموافقة (Enter)"
  };

  const contexts: Record<MappingContext, string> = {
    global: "العام (الأساسي)", player: "المشغل (أثناء العمل)", dashboard: "الداشبورد",
    media: "الميديا", quran: "القرآن", football: "كووورة", iptv: "البث المباشر", settings: "الإعدادات"
  };

  const currentDayTimes = useMemo(() => {
    if (!prayerTimes?.length) return null;
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    return prayerTimes.find(pt => pt.date.endsWith(`-${day}`)) || prayerTimes[0];
  }, [prayerTimes]);

  const RemoteKeyShape = ({ name }: { name: string }) => {
    const isColor = ['Red', 'Green', 'Yellow', 'Blue'].includes(name);
    const isNumber = /^\d$/.test(name);
    const isHardware = ['Sub', 'Info', 'Back', 'Exit'].includes(name);
    const isWhite = !isColor && !isNumber && !isHardware;

    return (
      <div className={cn(
        "px-4 py-2 flex flex-col items-center justify-center transition-all duration-500 min-w-[60px]",
        isColor ? "rounded-[0.6rem] border-t border-white/20 h-[40px]" : "rounded-full border-2 border-zinc-600 h-[50px] w-[50px]",
        name === 'Red' && "bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.6)]",
        name === 'Green' && "bg-green-600 shadow-[0_0_15px_rgba(22,163,74,0.6)]",
        name === 'Yellow' && "bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.6)] text-black border-t-black/10",
        name === 'Blue' && "bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.6)]",
        isWhite && "bg-white text-black border-white shadow-glow h-[50px] w-[50px] rounded-full",
        (isNumber || isHardware) && !isWhite && "bg-zinc-800 shadow-2xl text-accent"
      )}>
        <span className={cn(
          "text-[6.5px] font-black uppercase tracking-tighter opacity-80 mb-0.5",
          (name === 'Yellow' || isWhite) ? "text-black" : "text-white"
        )}>زر</span>
        <span className={cn(
          "text-[9px] font-black uppercase tracking-widest",
          (name === 'Yellow' || isWhite) ? "text-black" : "text-white"
        )}>{name}</span>
      </div>
    );
  };

  return (
    <div className="p-12 space-y-12 max-w-7xl mx-auto pb-40 text-right dir-rtl">
      {mappingAction && (
        <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-10">
          <div className="w-full max-w-5xl space-y-8 p-12 bg-white/5 rounded-[3rem] border border-white/10 shadow-glow text-center">
            <Keyboard className="w-20 h-20 text-primary mx-auto animate-bounce" />
            <div className="space-y-2">
              <h2 className="text-4xl font-black text-white">برمجة زر جديد للسياق: {contexts[mappingAction.context]}</h2>
              <p className="text-xl text-primary font-bold">اضغط الآن على الزر المطلوب من الريموت أو اختر من القائمة أدناه</p>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 pt-8 border-t border-white/10">
              {manualSelectionKeys.map(k => (
                <button 
                  key={k} 
                  onClick={() => handleManualKeySelect(k)}
                  className="h-12 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-black hover:bg-primary hover:text-white transition-all focusable"
                >
                  {k}
                </button>
              ))}
            </div>

            <Button variant="ghost" onClick={() => setMappingAction(null)} className="text-white/40 focusable h-14 px-8 rounded-2xl mt-8">إلغاء العملية</Button>
          </div>
        </div>
      )}

      <header className="flex flex-col gap-4">
        <h1 className="text-6xl font-black text-white tracking-tighter flex items-center gap-6">مركز التحكم <Settings className="w-12 h-12 text-primary animate-spin-slow" /></h1>
        <p className="text-white/40 font-bold uppercase tracking-[0.6em] text-sm">System Configuration Hub</p>
      </header>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="bg-white/5 p-1 rounded-full border border-white/10 h-16 mb-12 flex justify-start w-fit">
          <TabsTrigger value="appearance" className="rounded-full px-10 h-full font-bold text-lg focusable relative" data-nav-id="settings-tab-appearance">
            <ShortcutBadge action="goto_tab_appearance" className="-top-3 -left-3" />
            المظهر
          </TabsTrigger>
          <TabsTrigger value="prayers" className="rounded-full px-10 h-full font-bold text-lg focusable relative" data-nav-id="settings-tab-prayers">
            <ShortcutBadge action="goto_tab_prayers" className="-top-3 -left-3" />
            الصلوات
          </TabsTrigger>
          <TabsTrigger value="reminders" className="rounded-full px-10 h-full font-bold text-lg focusable relative" data-nav-id="settings-tab-reminders">
            <ShortcutBadge action="goto_tab_reminders" className="-top-3 -left-3" />
            التذكيرات
          </TabsTrigger>
          <TabsTrigger value="buttonmap" className="rounded-full px-10 h-full font-bold text-lg focusable relative" data-nav-id="settings-tab-buttonmap">
            <ShortcutBadge action="goto_tab_buttonmap" className="-top-3 -left-3" />
            الأزرار
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="premium-glass p-8 space-y-8 bg-white/5 border-white/10 grid-item" tabIndex={0}>
              <CardTitle className="text-2xl font-black text-white flex items-center gap-3"><Monitor className="w-6 h-6 text-primary" />عرض الشاشة</CardTitle>
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><span className="text-sm font-black text-white/60">مقياس الواجهة الذكي</span><span className="text-primary font-black">{Math.round((mapSettings.displayScale ?? 1.0) * 100)}%</span></div>
                  <Slider value={[mapSettings.displayScale ?? 1.0]} min={0.5} max={1.5} step={0.05} onValueChange={([v]) => updateMapSettings({ displayScale: v })} />
                </div>
                <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5">
                  <div className="space-y-1"><h4 className="text-lg font-bold text-white">خلفية لوحة الأذكار</h4><p className="text-xs text-white/40">إظهار الصور خلف النصوص في الداشبورد</p></div>
                  <Switch checked={mapSettings.showManuscriptBg} onCheckedChange={(v) => updateMapSettings({ showManuscriptBg: v })} />
                </div>
                <div className="flex items-center justify-between p-6 bg-blue-600/10 rounded-2xl border border-blue-600/20">
                  <div className="space-y-1">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">المود البديل (الملاحة الرقمية) <Zap className="w-4 h-4 text-yellow-500" /></h4>
                    <p className="text-xs text-white/40">تحويل الأسهم إلى أرقام 2,8,4,6 (تفعيل عبر زر Sub)</p>
                  </div>
                  <Switch checked={isAltModeActive} onCheckedChange={toggleAltMode} />
                </div>
              </div>
            </Card>
            
            <div className="flex flex-col gap-8">
              <Card className="premium-glass p-8 space-y-8 bg-white/5 border-white/10 grid-item" tabIndex={0}>
                <CardTitle className="text-2xl font-black text-white flex items-center gap-3"><ImageIcon className="w-6 h-6 text-primary" />إضافة محتوى للوحة</CardTitle>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <Input placeholder="نص المخطوطة أو رابط الصورة..." value={manuscriptInput} onChange={(e) => setManuscriptInput(e.target.value)} className="h-14 bg-black/40 border-white/10 rounded-xl px-6 text-white text-right flex-1" />
                    <Button onClick={() => { if(manuscriptInput) { addManuscript({ id: Date.now().toString(), type: manuscriptType, content: manuscriptInput }); setManuscriptInput(""); toast({title: "تمت الإضافة"}); } }} className="h-14 w-14 bg-primary rounded-xl focusable"><Plus className="w-6 h-6" /></Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant={manuscriptType === 'text' ? 'default' : 'outline'} onClick={() => setManuscriptType('text')} className="flex-1 rounded-xl h-12 focusable">نصي</Button>
                    <Button variant={manuscriptType === 'image' ? 'default' : 'outline'} onClick={() => setManuscriptType('image')} className="flex-1 rounded-xl h-12 focusable">صورة</Button>
                  </div>
                </div>
              </Card>

              <Card className="premium-glass p-8 bg-white/5 border-white/10 grid-item" tabIndex={0}>
                <CardTitle className="text-2xl font-black text-white flex items-center gap-3 mb-6"><ImageIcon className="w-6 h-6 text-primary" />إدارة اللوحات الحالية</CardTitle>
                <ScrollArea className="h-64 pr-4">
                  <div className="grid grid-cols-1 gap-4">
                    {customManuscripts.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 group">
                        <div className="flex items-center gap-4 min-w-0">
                          {m.type === 'text' ? (
                            <span className="font-calligraphy text-lg text-white truncate max-w-[200px]">{m.content}</span>
                          ) : (
                            <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 shrink-0">
                              <img src={m.content} className="w-full h-full object-cover" alt="" />
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => { removeManuscript(m.id); toast({title: "تم الحذف"}); }} className="text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-full focusable">
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    ))}
                    {customManuscripts.length === 0 && (
                      <div className="py-12 text-center opacity-20">
                        <p className="text-xs font-black uppercase tracking-widest">لا توجد مخطوطات حالياً</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="prayers" className="space-y-8 animate-in fade-in duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {prayerSettings.map((p, idx) => (
              <Card key={p.id} className="bg-white/5 border-white/10 p-8 rounded-[2.5rem] focusable grid-item" tabIndex={0}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20"><Timer className="w-6 h-6 text-primary" /></div><div><h3 className="text-xl font-black text-white">{p.name}</h3><p className="text-xs text-white/40 uppercase tracking-widest">Prayer Config</p></div></div>
                  <Switch checked={p.showCountdown} onCheckedChange={(v) => updatePrayerSetting(p.id, { showCountdown: v })} />
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center"><span className="text-xs font-black text-white/40">الإزاحة (دقائق)</span><span className="text-primary font-black">{p.offsetMinutes > 0 ? `+${p.offsetMinutes}` : p.offsetMinutes}</span></div>
                    <Slider value={[p.offsetMinutes]} min={-60} max={60} step={1} onValueChange={([v]) => updatePrayerSetting(p.id, { offsetMinutes: v })} />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center"><span className="text-xs font-black text-white/40">وقت الإقامة</span><span className="text-accent font-black">{p.iqamahDuration} د</span></div>
                    <Slider value={[p.iqamahDuration]} min={0} max={60} step={1} onValueChange={([v]) => updatePrayerSetting(p.id, { iqamahDuration: v })} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-12 animate-in fade-in duration-700">
          <Card className="bg-white/5 border-white/10 p-8 rounded-[3rem] focusable grid-item" tabIndex={0}>
            <CardTitle className="text-2xl font-black text-white flex items-center gap-4 mb-8"><Bell className="w-8 h-8 text-primary" />إضافة تذكير مخصص</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Input placeholder="وصف التذكير..." value={newReminder.label} onChange={(e) => setNewReminder({ ...newReminder, label: e.target.value })} className="h-14 bg-black/40 border-white/10 rounded-xl px-6 text-white text-right" />
              <Select value={newReminder.relativePrayer} onValueChange={(v) => setNewReminder({ ...newReminder, relativePrayer: v as any })}>
                <SelectTrigger className="h-14 bg-black/40 border-white/10 rounded-xl px-6 text-white text-right"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white dir-rtl">
                  <SelectItem value="manual">وقت يدوي</SelectItem>
                  {prayerSettings.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({currentDayTimes ? convertTo12Hour(currentDayTimes[p.id === 'duha' ? 'sunrise' : p.id]) : '--:--'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newReminder.relativePrayer === 'manual' ? (
                <Input type="time" value={newReminder.manualTime} onChange={(e) => setNewReminder({ ...newReminder, manualTime: e.target.value })} className="h-14 bg-black/40 border-white/10 rounded-xl px-6 text-white" />
              ) : (
                <Input type="number" value={newReminder.offsetMinutes} onChange={(e) => setNewReminder({ ...newReminder, offsetMinutes: parseInt(e.target.value) })} className="h-14 bg-black/40 border-white/10 rounded-xl px-6 text-white text-right" />
              )}
            </div>
            <Button onClick={handleAddReminder} className="h-14 bg-primary text-white font-black text-lg rounded-xl w-full mt-8 shadow-glow focusable"><Plus className="w-6 h-6 ml-3" />حفظ التذكير</Button>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reminders.map((rem) => (
              <Card key={rem.id} className="bg-white/5 border-white/10 p-6 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center bg-black/20", rem.color)}>
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{rem.label}</h4>
                    <p className="text-xs text-white/40">
                      {rem.relativePrayer === 'manual' ? rem.manualTime : `مرتبط بـ ${prayerSettings.find(p=>p.id===rem.relativePrayer)?.name || rem.relativePrayer}`}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeReminder(rem.id)} className="text-white/20 hover:text-red-500 rounded-full focusable">
                  <Trash2 className="w-5 h-5" />
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="buttonmap" className="space-y-12 animate-in fade-in duration-700">
          <div className="flex items-center justify-between bg-white/5 p-6 rounded-[2rem] border border-white/10">
            <h3 className="text-2xl font-black text-white flex items-center gap-4"><Keyboard className="w-8 h-8 text-primary" />تخصيص أزرار التحكم</h3>
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-white/40">اختر السياق:</span>
              <Select value={selectedContext} onValueChange={(v) => setSelectedContext(v as MappingContext)}>
                <SelectTrigger className="w-64 h-12 bg-black/40 border-white/10 rounded-xl text-right"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white dir-rtl">
                  {Object.entries(contexts).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.keys(actionLabels).map((action, idx) => (
              <div key={action} className="p-6 bg-black/40 rounded-[2rem] border border-white/5 flex flex-col gap-4 focusable grid-item" tabIndex={0}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-white/80">{actionLabels[action]}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setMappingAction({context: selectedContext, action: action as AppAction})} className="w-10 h-10 rounded-full bg-primary/20 text-primary border border-primary/20 flex items-center justify-center focusable"><Edit2 className="w-5 h-5" /></button>
                    <button onClick={() => clearKeyMappings(selectedContext, action as AppAction)} className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center focusable"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 min-h-[40px] pt-2">
                  {(keyMappings[selectedContext]?.[action] || []).map((key, kIdx) => (
                    <div key={kIdx} className="relative group/key">
                      <RemoteKeyShape name={key} />
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeSpecificKeyMapping(selectedContext, action as AppAction, key); }} 
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover/key:opacity-100 transition-opacity focusable"
                      >
                        <LucideX className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
