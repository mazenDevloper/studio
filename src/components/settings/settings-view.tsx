"use client";

import { useState, useEffect, useRef } from "react";
import { useMediaStore, Reminder, Manuscript, MappingContext, AppAction } from "@/lib/store";
import { 
  Settings, Bell, Trash2, Edit2, Plus, Monitor, Palette, Keyboard, Timer, ArrowRightLeft, 
  Loader2, RefreshCw, Mic, X, Type, ImageIcon, Zap, Save, Sparkles, MonitorPlay, Upload, Link, ChevronUp, ChevronDown, CheckCircle2, Circle, ArrowUpCircle
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

/**
 * SettingsView v4000.0 - Sovereign Edition (Match cc61600)
 * Features: Giant Typography, Global Push (Zap), and Unified System Sync.
 */
export function SettingsView() {
  const { 
    addReminder, removeReminder, updateReminder, reminders,
    mapSettings, updateMapSettings, prayerSettings, updatePrayerSetting,
    customManuscripts, addManuscript, updateManuscript, removeManuscript, reorderManuscript,
    keyMappings, setKeyMapping, removeSpecificKeyMapping,
    customWallBackgrounds, addCustomWallBackground, removeCustomWallBackground,
    displayScale, setDisplayScale, dockScale, setDockScale,
    favoriteReciters, removeReciter, updateReciter, reorderReciter, moveReciterToTop, addRecitersBatch,
    fetchPriorityData, syncMasterBin, saveRecitersReorder, saveManuscriptsReorder,
    customFonts, addCustomFont, removeCustomFont
  } = useMediaStore();
  
  const { toast } = useToast();
  const bgInputRef = useRef<HTMLInputElement>(null);
  const manuscriptFileRef = useRef<HTMLInputElement>(null);
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
    showCountdown: true, showCountup: false, countdownWindow: 15, completed: false
  });

  useEffect(() => { 
    fetchPriorityData('all'); 
    // Sovereign Auto-Refresh On Load (v4000 Logic)
    const timer = setTimeout(() => {
      handleManualRefresh();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try { 
      await fetchPriorityData('all'); 
      toast({ title: "تم تحديث البيانات سحابياً" }); 
    } catch (e) {
      console.error("Refresh Error:", e);
    } finally { 
      setIsRefreshing(false); 
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'bg' | 'manuscript' | 'font') => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (res) => {
      const dataUrl = res.target?.result as string;
      if (target === 'bg') {
        addCustomWallBackground(dataUrl); 
        updateMapSettings({ manuscriptBgUrl: dataUrl });
        setTimeout(() => syncMasterBin(), 500);
      } else if (target === 'manuscript') {
        addManuscript({ id: Date.now().toString(), type: 'image', content: dataUrl });
        setTimeout(() => saveManuscriptsReorder(), 500);
      } else if (target === 'font') {
        const fontName = file.name.split('.')[0].replace(/\s+/g, '-');
        addCustomFont(fontName, dataUrl);
        setTimeout(() => syncMasterBin(), 500);
      }
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
    toast({ title: "تم حفظ المخطوطة سحابياً" });
  };

  const loadManuscriptForEdit = (m: Manuscript) => {
    setManuscriptInput(m.content);
    setManuscriptType(m.type);
    setSelectedFont(m.fontFamily || "");
    setEditingManuscriptId(m.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveReminder = async () => {
    if (!newReminder.label) return;
    const id = editingReminderId || Date.now().toString();
    addReminder({ ...newReminder, id } as Reminder);
    setNewReminder({ label: "", color: "text-blue-400", iconType: "bell", startType: 'azan', startReference: 'fajr', startOffset: 0, endType: 'duration', endReference: 'fajr', endOffset: 0, showCountdown: true, showCountup: false, countdownWindow: 15, completed: false });
    setEditingReminderId(null);
    await syncMasterBin();
    toast({ title: editingReminderId ? "تم التعديل والحفظ سحابياً" : "تمت إضافة التذكير والحفظ" });
  };

  const loadReminderForEdit = (r: Reminder) => {
    setNewReminder({ ...r });
    setEditingReminderId(r.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImportReciters = async () => {
    try {
      const parsed = JSON.parse(jsonReciters);
      const batch = Array.isArray(parsed) ? parsed : (parsed.reciters || []);
      addRecitersBatch(batch);
      setJsonReciters("");
      await saveRecitersReorder();
      toast({ title: "تم استيراد القراء وحفظهم" });
    } catch {
      toast({ variant: "destructive", title: "خطأ في نص JSON" });
    }
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
          <p className="text-white/40 font-bold uppercase tracking-[0.6em] text-sm">Unified System Hub v4000.0</p>
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
          <TabsTrigger value="backgrounds" className="rounded-full px-10 h-full font-black text-lg focusable">خلفيات اللوحة</TabsTrigger>
          <TabsTrigger value="reminders" className="rounded-full px-10 h-full font-black text-lg focusable">التذكيرات</TabsTrigger>
          <TabsTrigger value="reciters" className="rounded-full px-10 h-full font-black text-lg focusable">القراء</TabsTrigger>
          <TabsTrigger value="manuscripts" className="rounded-full px-10 h-full font-black text-lg focusable">المخطوطات</TabsTrigger>
          <TabsTrigger value="buttonmap" className="rounded-full px-10 h-full font-black text-lg focusable">الأزرار</TabsTrigger>
        </TabsList>

        <TabsContent value="backgrounds" className="space-y-8 animate-in fade-in duration-500">
          <Card className="p-10 space-y-10 bg-white/5 border-white/10 rounded-[3.5rem]">
            <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><ImageIcon className="w-12 h-12 text-primary" />إدارة خلفيات اللوحة السيادية</CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="p-8 bg-black/40 rounded-[3rem] border border-white/10 space-y-6">
                 <span className="text-xs font-black text-white/40 uppercase">إضافة عن طريق الرابط</span>
                 <div className="flex gap-4">
                   <Input placeholder="رابط الصورة المباشر..." value={bgUrlInput} onChange={(e) => setBgUrlInput(e.target.value)} className="h-16 bg-white/5 border-white/10 text-xl font-bold rounded-2xl" />
                   <Button onClick={async () => { if(bgUrlInput) { addCustomWallBackground(bgUrlInput); updateMapSettings({ manuscriptBgUrl: bgUrlInput }); setBgUrlInput(""); await syncMasterBin(); toast({ title: "تمت الإضافة والحفظ" }); } }} className="bg-blue-600 h-16 px-8 rounded-2xl font-black shadow-glow"><Link className="w-5 h-5 ml-2" /> إضافة</Button>
                 </div>
              </div>
              <div className="p-8 bg-black/40 rounded-[3rem] border border-white/10 flex flex-col justify-center items-center gap-6">
                 <span className="text-xs font-black text-white/40 uppercase">رفع ملف محلي (UPLOAD)</span>
                 <input type="file" hidden ref={bgInputRef} accept="image/*" onChange={(e) => handleFileUpload(e, 'bg')} />
                 <Button onClick={() => bgInputRef.current?.click()} className="w-full h-16 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-2xl font-black text-xl shadow-glow"><Upload className="w-6 h-6 ml-2" /> اختيار من الجهاز</Button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 max-h-[400px] overflow-y-auto p-6 bg-black/20 rounded-[3rem] border border-white/5 custom-scrollbar">
              {customWallBackgrounds?.map((bg, i) => (
                <div key={`${bg}-${i}`} onClick={() => { updateMapSettings({ manuscriptBgUrl: bg }); syncMasterBin(); toast({ title: "تم اختيار الخلفية" }); }} className={cn("aspect-video rounded-[2rem] overflow-hidden border-4 cursor-pointer transition-all relative group shadow-2xl", mapSettings.manuscriptBgUrl === bg ? "border-primary shadow-glow scale-105" : "border-transparent opacity-60 hover:opacity-100")}>
                  <img src={bg} className="w-full h-full object-cover" alt="" />
                </div>
              ))}
            </div>
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
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <span className="text-xs font-black text-white/40 uppercase">لون التذكير</span>
                    <Select value={newReminder.color} onValueChange={(v) => setNewReminder({ ...newReminder, color: v })}>
                      <SelectTrigger className="h-16 bg-white/5 border-white/10 rounded-xl text-xl font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-950 text-white dir-rtl">
                        <SelectItem value="text-blue-400">أزرق</SelectItem>
                        <SelectItem value="text-emerald-400">أخضر</SelectItem>
                        <SelectItem value="text-purple-400">أرجواني</SelectItem>
                        <SelectItem value="text-orange-400">برتقالي</SelectItem>
                        <SelectItem value="text-red-500">أحمر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleSaveReminder} className="w-full h-20 bg-primary rounded-[2rem] text-2xl font-black shadow-glow">
                  {editingReminderId ? "حفظ التعديلات السيادية" : "إضافة التذكير السيادي"}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {reminders.map((r) => (
                <div key={r.id} className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 flex items-center justify-between group hover:border-primary/40 transition-all shadow-xl">
                  <span className={cn("text-4xl font-black", r.color)}>{r.label}</span>
                  <div className="flex gap-4">
                    <Button onClick={() => loadReminderForEdit(r)} className="w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 focusable"><Edit2 className="w-8 h-8" /></Button>
                    <Button onClick={async () => { removeReminder(r.id); await syncMasterBin(); }} className="w-16 h-16 rounded-full bg-red-600/20 text-red-500 border border-red-500/30 focusable"><Trash2 className="w-8 h-8" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

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
                      <SelectItem value="Alkalami">Alkalami</SelectItem>
                      <SelectItem value="Gulzar">Gulzar</SelectItem>
                      {customFonts?.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleSaveManuscript} className="h-16 px-10 bg-primary rounded-xl shadow-glow font-black text-xl">حفظ</Button>
                </div>
              </div>
              <div className="p-8 bg-black/40 rounded-[3rem] border border-white/10 flex flex-col justify-center items-center gap-4">
                 <input type="file" hidden ref={fontFileRef} accept=".ttf,.otf" onChange={(e) => handleFileUpload(e, 'font')} />
                 <Button onClick={() => fontFileRef.current?.click()} className="w-full h-16 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-xl font-black shadow-glow"><Upload className="w-5 h-5 ml-2" /> رفع خط مخصص (TTF)</Button>
                 <div className="flex gap-2 flex-wrap justify-center">
                    {customFonts?.map(f => (
                      <div key={f.name} className="bg-white/10 px-4 py-2 rounded-full border border-white/10 flex items-center gap-3">
                        <span className="text-xs font-bold text-white/60">{f.name}</span>
                        <button onClick={() => removeCustomFont(f.name)} className="text-red-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-h-[600px] overflow-y-auto custom-scrollbar p-4">
              {customManuscripts.map((m) => (
                <div key={m.id} className="bg-black/60 p-10 rounded-[3rem] border border-white/10 flex flex-col items-center justify-between group relative shadow-2xl">
                  <div className="w-full flex-1 flex items-center justify-center min-h-[120px] mb-6">
                    {m.type === 'text' ? (
                      <p className="text-4xl text-center leading-relaxed" style={{ fontFamily: m.fontFamily || 'inherit' }}>{m.content}</p>
                    ) : <img src={m.content} className="max-h-32 object-contain" alt="" />}
                  </div>
                  <div className="flex gap-3 w-full">
                    <Button onClick={() => loadManuscriptForEdit(m)} className="flex-1 h-14 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-2xl focusable"><Edit2 className="w-6 h-6" /></Button>
                    <Button onClick={() => removeManuscript(m.id)} className="flex-1 h-14 bg-red-600/20 text-red-500 border border-red-500/30 rounded-2xl focusable"><Trash2 className="w-6 h-6" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reciters" className="space-y-8">
          <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem]">
            <CardTitle className="text-4xl font-black text-white flex items-center gap-6 mb-12"><Mic className="w-12 h-12 text-primary" />إدارة القراء والمبدعين</CardTitle>
            <div className="bg-black/40 p-10 rounded-[3rem] border border-white/10 mb-12 space-y-6">
               <span className="text-xs font-black text-white/40 uppercase">استيراد جماعي (JSON)</span>
               <textarea value={jsonReciters} onChange={(e) => setJsonReciters(e.target.value)} placeholder='[{"name": "...", "channelid": "...", "image": "..."}]' className="w-full h-40 bg-black/60 border border-white/10 rounded-2xl p-6 text-emerald-400 font-mono text-sm custom-scrollbar" />
               <Button onClick={handleImportReciters} className="w-full h-16 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-2xl font-black shadow-glow"><ArrowUpCircle className="w-6 h-6 ml-2" /> استيراد وحفظ سحابي</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {favoriteReciters.map((r) => (
                <div key={r.channelid} className="bg-black/60 p-8 rounded-[3rem] border border-white/10 flex flex-col items-center gap-6 shadow-2xl group relative overflow-hidden">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10"><img src={r.image} className="w-full h-full object-cover" /></div>
                  <h4 className="text-xl font-black text-white text-center truncate w-full">{r.name}</h4>
                  <div className="flex gap-3 w-full">
                    <Button onClick={async () => { removeReciter(r.channelid); await saveRecitersReorder(); }} className="flex-1 h-12 bg-red-600/20 text-red-500 border border-red-500/30 rounded-xl focusable"><Trash2 className="w-5 h-5" /></Button>
                    <Button onClick={() => moveReciterToTop(r.channelid)} className="flex-1 h-12 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-xl focusable"><ChevronUp className="w-5 h-5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="buttonmap" className="space-y-8">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem]">
              <CardTitle className="text-4xl font-black text-white flex items-center gap-6 mb-12"><Keyboard className="w-12 h-12 text-primary" />خارطة الأزرار والتحكم</CardTitle>
              <div className="flex gap-4 mb-10 overflow-x-auto pb-4 no-scrollbar">
                {Object.keys(keyMappings).map(ctx => (
                  <Button key={ctx} onClick={() => setSelectedContext(ctx as MappingContext)} variant={selectedContext === ctx ? "default" : "outline"} className={cn("rounded-full px-8 h-14 font-black text-lg focusable", selectedContext === ctx ? "bg-primary shadow-glow" : "bg-white/5 border-white/10")}>{ctx.toUpperCase()}</Button>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(keyMappings[selectedContext] || {}).map(([action, keys]) => (
                  <div key={action} className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 space-y-4 shadow-xl">
                    <span className="text-xs font-black text-white/40 uppercase tracking-widest">{action}</span>
                    <div className="flex gap-3 flex-wrap">
                       {Array.isArray(keys) && keys.map(k => (
                         <div key={k} className="bg-primary/20 px-5 py-2.5 rounded-xl border border-primary/40 flex items-center gap-4">
                           <span className="text-xl font-black text-primary">{k}</span>
                           <button onClick={() => removeSpecificKeyMapping(selectedContext, action as AppAction, k)} className="text-white/40 hover:text-red-500"><X className="w-4 h-4" /></button>
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
