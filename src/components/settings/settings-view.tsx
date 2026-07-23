
"use client";

import { useState, useEffect, useRef } from "react";
import { useMediaStore, Reminder, Manuscript, MappingContext, AppAction } from "@/lib/store";
import { 
  Settings, Bell, Trash2, Edit2, Plus, Monitor, Palette, Keyboard, Timer, ArrowRightLeft, 
  Loader2, RefreshCw, Mic, X, Type, ImageIcon, Zap, Save, Sparkles, MonitorPlay, Upload, Link, ChevronUp, ChevronDown, CheckCircle2, Circle, ArrowUpCircle, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SettingsView() {
  const { 
    addReminder, removeReminder, reminders,
    mapSettings, updateMapSettings, prayerSettings,
    customManuscripts, addManuscript, updateManuscript, removeManuscript,
    keyMappings, removeSpecificKeyMapping,
    customWallBackgrounds, addCustomWallBackground,
    favoriteReciters, removeReciter, moveReciterToTop, addRecitersBatch,
    fetchPriorityData, syncMasterBin, saveRecitersReorder, saveManuscriptsReorder,
    customFonts, addCustomFont, removeCustomFont
  } = useMediaStore();
  
  const { toast } = useToast();
  const bgInputRef = useRef<HTMLInputElement>(null);
  const fontFileRef = useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedContext, setSelectedContext] = useState<MappingContext>('global');
  const [bgUrlInput, setBgUrlInput] = useState("");
  const [manuscriptInput, setManuscriptInput] = useState("");
  const [manuscriptType, setManuscriptType] = useState<'text' | 'image'>('text');
  const [selectedFont, setSelectedFont] = useState<string>("");
  const [editingManuscriptId, setEditingManuscriptId] = useState<string | null>(null);
  const [jsonReciters, setJsonReciters] = useState("");

  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({
    label: "", color: "text-blue-400", iconType: "bell", 
    startType: 'azan', startReference: 'fajr', startOffset: 0,
    endType: 'duration', endReference: 'fajr', endOffset: 0,
    showCountdown: true, showCountup: false, countdownWindow: 15, completed: false,
    manualStartTime: "00:00", manualEndTime: "00:00", durationMinutes: 30
  });

  useEffect(() => { 
    fetchPriorityData('all'); 
    const timer = setTimeout(() => handleManualRefresh(), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try { await fetchPriorityData('all'); } finally { setIsRefreshing(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'bg' | 'font') => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (res) => {
      const dataUrl = res.target?.result as string;
      if (target === 'bg') {
        addCustomWallBackground(dataUrl); 
        updateMapSettings({ manuscriptBgUrl: dataUrl });
      } else if (target === 'font') {
        const fontName = file.name.split('.')[0].replace(/\s+/g, '-');
        addCustomFont(fontName, dataUrl);
      }
      setTimeout(() => syncMasterBin(), 500);
      toast({ title: "تم الرفع والحفظ بنجاح" });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveManuscript = async () => {
    if (!manuscriptInput) return;
    if (editingManuscriptId) {
      updateManuscript(editingManuscriptId, { content: manuscriptInput, type: manuscriptType, fontFamily: selectedFont });
      setEditingManuscriptId(null);
    } else {
      addManuscript({ id: Date.now().toString(), type: manuscriptType, content: manuscriptInput, fontFamily: selectedFont });
    }
    setManuscriptInput("");
    setSelectedFont("");
    await saveManuscriptsReorder();
    toast({ title: "تم حفظ المخطوطة" });
  };

  const handleSaveReminder = async () => {
    if (!newReminder.label) return;
    const id = editingReminderId || Date.now().toString();
    addReminder({ ...newReminder, id } as Reminder);
    setNewReminder({ label: "", color: "text-blue-400", iconType: "bell", startType: 'azan', startReference: 'fajr', startOffset: 0, endType: 'duration', endReference: 'fajr', endOffset: 0, showCountdown: true, showCountup: false, countdownWindow: 15, completed: false, manualStartTime: "00:00", manualEndTime: "00:00", durationMinutes: 30 });
    setEditingReminderId(null);
    await syncMasterBin();
    toast({ title: "تم حفظ التذكير سحابياً" });
  };

  const prayersList = [
    { id: 'fajr', name: 'الفجر' }, { id: 'sunrise', name: 'الشروق' }, { id: 'duha', name: 'الضحى' },
    { id: 'dhuhr', name: 'الظهر' }, { id: 'asr', name: 'العصر' }, { id: 'maghrib', name: 'المغرب' }, { id: 'isha', name: 'العشاء' }
  ];

  return (
    <div className="p-12 space-y-12 max-w-7xl mx-auto pb-40 text-right dir-rtl bg-black min-h-full">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-6xl font-black text-white tracking-tighter flex items-center gap-6">
            الإعدادات السيادية <Settings className="w-12 h-12 text-primary animate-spin-slow" />
          </h1>
          <p className="text-white/40 font-bold uppercase tracking-[0.6em] text-sm">Unified System Hub v9998.0</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={handleManualRefresh} disabled={isRefreshing} className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-full h-14 px-8 font-black focusable shadow-glow">
            {isRefreshing ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <RefreshCw className="w-5 h-5 ml-2" />} تحديث محلي
          </Button>
          <Button onClick={async () => { setIsSyncing(true); await syncMasterBin(); setIsSyncing(false); toast({ title: "تم المزامنة بنجاح" }); }} disabled={isSyncing} className="bg-primary text-white rounded-full h-14 px-8 font-black focusable shadow-glow">
            {isSyncing ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Zap className="w-5 h-5 ml-2" />} دفع عالمي
          </Button>
        </div>
      </header>

      <Tabs defaultValue="manuscripts" className="w-full">
        <TabsList className="bg-white/5 p-1 rounded-full border border-white/10 h-20 mb-12 flex justify-around">
          <TabsTrigger value="backgrounds" className="rounded-full px-10 h-full font-black text-lg focusable">الخلفيات</TabsTrigger>
          <TabsTrigger value="reminders" className="rounded-full px-10 h-full font-black text-lg focusable">التذكيرات</TabsTrigger>
          <TabsTrigger value="manuscripts" className="rounded-full px-10 h-full font-black text-lg focusable">الخطوط</TabsTrigger>
          <TabsTrigger value="buttonmap" className="rounded-full px-10 h-full font-black text-lg focusable">الأزرار</TabsTrigger>
        </TabsList>

        <TabsContent value="manuscripts" className="space-y-8">
          <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem]">
            <CardTitle className="text-4xl font-black text-white flex items-center gap-6 mb-12"><Type className="w-12 h-12 text-primary" />مخزن المخطوطات والخطوط</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="p-8 bg-black/40 rounded-[3rem] border border-white/10 space-y-6">
                <div className="flex items-center gap-4">
                  <Select value={manuscriptType} onValueChange={(v) => setManuscriptType(v as any)}>
                    <SelectTrigger className="w-40 h-16 bg-white/5 text-white font-black rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-950 text-white dir-rtl"><SelectItem value="text">نصية</SelectItem><SelectItem value="image">صورة رابط</SelectItem></SelectContent>
                  </Select>
                  <Input placeholder="أدخل المحتوى..." value={manuscriptInput} onChange={(e) => setManuscriptInput(e.target.value)} className="h-16 flex-1 bg-white/5 px-6 rounded-xl text-xl font-bold" />
                </div>
                <div className="flex gap-4">
                  <Select value={selectedFont} onValueChange={setSelectedFont}>
                    <SelectTrigger className="h-16 flex-1 bg-white/5 text-white font-bold rounded-xl"><SelectValue placeholder="اختر الخط..." /></SelectTrigger>
                    <SelectContent className="bg-zinc-950 text-white dir-rtl">
                      <SelectItem value="Amiri">Amiri</SelectItem>
                      <SelectItem value="Reem Kufi">Reem Kufi</SelectItem>
                      <SelectItem value="Aref Ruqaa">Aref Ruqaa</SelectItem>
                      {customFonts?.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleSaveManuscript} className="h-16 px-10 bg-primary rounded-xl shadow-glow font-black text-xl">حفظ</Button>
                </div>
              </div>
              <div className="p-8 bg-black/40 rounded-[3rem] border border-white/10 flex flex-col justify-center items-center gap-4">
                 <input type="file" hidden ref={fontFileRef} accept=".ttf,.otf" onChange={(e) => handleFileUpload(e, 'font')} />
                 <Button onClick={() => fontFileRef.current?.click()} className="w-full h-16 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-xl font-black shadow-glow"><Upload className="w-5 h-5 ml-2" /> رفع خط مخصص (TTF)</Button>
                 <div className="w-full flex flex-col gap-3 mt-4">
                    <span className="text-xs font-black text-white/40 uppercase">معاينة الخطوط المرفوعة</span>
                    <div className="grid grid-cols-2 gap-4">
                      {customFonts?.map(f => (
                        <div key={f.name} className="bg-white/5 p-4 rounded-xl border border-white/10 flex items-center justify-between group">
                          <span className="text-lg truncate flex-1 text-right" style={{ fontFamily: f.name }}>نص تجريبي: {f.name}</span>
                          <button onClick={() => removeCustomFont(f.name)} className="text-red-500 hover:scale-110 ml-2"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {customManuscripts.map((m) => (
                <div key={m.id} className="bg-black/60 p-10 rounded-[3rem] border border-white/10 flex flex-col items-center justify-between group shadow-2xl">
                  <div className="w-full flex-1 flex items-center justify-center min-h-[120px] mb-6">
                    {m.type === 'text' ? <p className="text-4xl text-center leading-relaxed" style={{ fontFamily: m.fontFamily || 'inherit' }}>{m.content}</p> : <img src={m.content} className="max-h-32 object-contain" />}
                  </div>
                  <div className="flex gap-3 w-full"><Button onClick={() => removeManuscript(m.id)} className="flex-1 h-14 bg-red-600/20 text-red-500 border border-red-500/30 rounded-2xl"><Trash2 className="w-6 h-6" /></Button></div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-8">
          <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem]">
            <CardTitle className="text-4xl font-black text-white flex items-center gap-6 mb-12"><Bell className="w-12 h-12 text-primary" /> نظام التذكيرات المتقدم</CardTitle>
            <div className="bg-black/40 p-10 rounded-[3rem] border border-white/10 mb-12 shadow-2xl space-y-10">
              <Input placeholder="عنوان التذكير..." value={newReminder.label} onChange={(e) => setNewReminder({ ...newReminder, label: e.target.value })} className="h-20 bg-white/5 text-white text-3xl font-black rounded-2xl" />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h3 className="text-xl font-black text-primary flex items-center gap-3"><Clock className="w-6 h-6" /> وقت البداية</h3>
                  <div className="flex gap-4">
                    <Select value={newReminder.startType} onValueChange={(v) => setNewReminder({ ...newReminder, startType: v as any })}>
                      <SelectTrigger className="w-40 h-14 bg-white/5 font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="dir-rtl"><SelectItem value="manual">وقت محدد</SelectItem><SelectItem value="azan">بعد الأذان</SelectItem><SelectItem value="iqamah">بعد الإقامة</SelectItem></SelectContent>
                    </Select>
                    {newReminder.startType === 'manual' ? (
                      <Input type="time" value={newReminder.manualStartTime} onChange={(e) => setNewReminder({ ...newReminder, manualStartTime: e.target.value })} className="h-14 bg-white/5 text-xl font-black" />
                    ) : (
                      <div className="flex gap-2 flex-1">
                        <Select value={newReminder.startReference} onValueChange={(v) => setNewReminder({ ...newReminder, startReference: v })}>
                          <SelectTrigger className="flex-1 h-14 bg-white/5 font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent className="dir-rtl">{prayersList.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="number" placeholder="+/- دقايق" value={newReminder.startOffset} onChange={(e) => setNewReminder({ ...newReminder, startOffset: parseInt(e.target.value) || 0 })} className="w-24 h-14 bg-white/5 text-center font-bold" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-black text-red-400 flex items-center gap-3"><Timer className="w-6 h-6" /> وقت النهاية</h3>
                  <div className="flex gap-4">
                    <Select value={newReminder.endType} onValueChange={(v) => setNewReminder({ ...newReminder, endType: v as any })}>
                      <SelectTrigger className="w-40 h-14 bg-white/5 font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="dir-rtl"><SelectItem value="duration">مدة زمنية</SelectItem><SelectItem value="manual">وقت محدد</SelectItem><SelectItem value="prayer">صلاة أخرى</SelectItem></SelectContent>
                    </Select>
                    {newReminder.endType === 'duration' ? (
                      <Input type="number" placeholder="دقائق" value={newReminder.durationMinutes} onChange={(e) => setNewReminder({ ...newReminder, durationMinutes: parseInt(e.target.value) || 0 })} className="flex-1 h-14 bg-white/5 text-center font-black" />
                    ) : newReminder.endType === 'manual' ? (
                      <Input type="time" value={newReminder.manualEndTime} onChange={(e) => setNewReminder({ ...newReminder, manualEndTime: e.target.value })} className="h-14 bg-white/5 text-xl font-black" />
                    ) : (
                      <Select value={newReminder.endReference} onValueChange={(v) => setNewReminder({ ...newReminder, endReference: v })}>
                        <SelectTrigger className="flex-1 h-14 bg-white/5 font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="dir-rtl">{prayersList.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveReminder} className="w-full h-20 bg-primary rounded-[2rem] text-2xl font-black shadow-glow">حفظ التذكير السيادي</Button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {reminders.map(r => (
                <div key={r.id} className="bg-black/40 p-6 rounded-2xl border border-white/5 flex items-center justify-between">
                  <span className={cn("text-2xl font-black", r.color)}>{r.label}</span>
                  <Button onClick={() => removeReminder(r.id)} className="w-12 h-12 rounded-full bg-red-600/20 text-red-500"><Trash2 className="w-6 h-6" /></Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
