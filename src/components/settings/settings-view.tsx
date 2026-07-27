
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMediaStore, Reminder, Manuscript, MappingContext, AppAction, ManuscriptWord } from "@/lib/store";
import { 
  Settings, Bell, Trash2, Edit2, Plus, Minus, Monitor, Palette, Keyboard, Timer, ArrowRightLeft, 
  Loader2, RefreshCw, Mic, X, Type, ImageIcon, Zap, Save, Sparkles, MonitorPlay, Upload, Link, 
  ChevronUp, ChevronDown, CheckCircle2, Circle, ArrowUpCircle, Clock, Youtube, Tv, Move, LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * SettingsView v130.0 - Unified Studio Engine
 * Features: Write/Arrange combined mode, 1ms Hyper-Sync.
 */
export function SettingsView() {
  const { 
    addReminder, removeReminder, reminders, updateReminder,
    mapSettings, updateMapSettings, prayerSettings,
    customManuscripts, addManuscript, updateManuscript, removeManuscript,
    keyMappings, removeSpecificKeyMapping, setKeyMapping,
    customWallBackgrounds, addCustomWallBackground,
    favoriteReciters, removeReciter, moveReciterToTop, favoriteIptvChannels, toggleFavoriteIptvChannel,
    favoriteChannels, removeChannel, toggleStarChannel,
    fetchPriorityData, syncMasterBin, saveRecitersReorder, saveChannelsReorder, saveIptvReorder,
    customFonts, addCustomFont, updateManuscriptTransform, updateWordTransform, saveManuscriptsReorder,
    isRecordingKey, setIsRecordingKey
  } = useMediaStore();
  
  const { toast } = useToast();
  const bgInputRef = useRef<HTMLInputElement>(null);
  const fontFileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeRecordingAction, setActiveRecordingAction] = useState<{ ctx: MappingContext, act: AppAction } | null>(null);
  
  // Unified Manuscript Studio State
  const [manuscriptMode, setManuscriptMode] = useState<'write' | 'arrange'>('write');
  const [manuscriptInput, setManuscriptInput] = useState("");
  const [manuscriptType, setManuscriptType] = useState<'text' | 'image'>('text');
  const [selectedFont, setSelectedFont] = useState<string>("Aref Ruqaa");
  const [editingManuscriptId, setEditingManuscriptId] = useState<string | null>(null);
  const [currentWords, setCurrentWords] = useState<ManuscriptWord[]>([]);
  const [draggingWord, setDraggingWord] = useState<{ wordId: string } | null>(null);

  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({
    label: "", color: "text-blue-400", iconType: "bell", 
    startType: 'azan', startReference: 'fajr', startOffset: 0,
    endType: 'duration', endReference: 'fajr', endOffset: 0,
    showCountdown: true, showCountup: false, countdownWindow: 15, completed: false,
    manualStartTime: "00:00", manualEndTime: "00:00", durationMinutes: 30
  });

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try { await fetchPriorityData('all'); } finally { setIsRefreshing(false); }
  }, [fetchPriorityData]);

  // Logic: Split words automatically ONLY in 'write' mode when text changes
  useEffect(() => {
    if (manuscriptMode === 'write' && manuscriptInput.trim()) {
      const text = manuscriptInput.trim();
      const words = text.split(/\s+/).map((t, i, arr) => ({
        id: `word-${i}`,
        text: t,
        x: 50 + (i - (arr.length - 1) / 2) * 12,
        y: 50,
        scale: 1.0
      }));
      setCurrentWords(words);
    }
  }, [manuscriptInput, manuscriptMode]);

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

  const startEditManuscript = (m: Manuscript) => {
    setEditingManuscriptId(m.id);
    setManuscriptInput(m.content);
    setManuscriptType(m.type);
    setSelectedFont(m.fontFamily || "Aref Ruqaa");
    setCurrentWords(m.words || []);
    setManuscriptMode('arrange');
    canvasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleSaveManuscript = async () => {
    if (!manuscriptInput && manuscriptType === 'text') return;
    const item: Manuscript = {
      id: editingManuscriptId || Date.now().toString(),
      type: manuscriptType,
      content: manuscriptInput,
      fontFamily: selectedFont,
      words: currentWords,
      x: 50, y: 50, scale: 1.0
    };
    
    if (editingManuscriptId) updateManuscript(editingManuscriptId, item);
    else addManuscript(item);
    
    setEditingManuscriptId(null);
    setManuscriptInput("");
    setCurrentWords([]);
    setManuscriptMode('write');
    await saveManuscriptsReorder();
    toast({ title: "تم حفظ المخطوطة السيادية" });
  };

  const startEditReminder = (r: Reminder) => { setEditingReminderId(r.id); setNewReminder(r); };

  const handleSaveReminder = async () => {
    if (!newReminder.label) return;
    if (editingReminderId) updateReminder(editingReminderId, newReminder);
    else addReminder({ ...newReminder as Reminder, id: Date.now().toString() });
    
    setEditingReminderId(null);
    setNewReminder({
      label: "", color: "text-blue-400", iconType: "bell", startType: 'azan', startReference: 'fajr', startOffset: 0,
      endType: 'duration', endReference: 'fajr', endOffset: 0, showCountdown: true, showCountup: false, countdownWindow: 15,
      completed: false, manualStartTime: "00:00", manualEndTime: "00:00", durationMinutes: 30
    });
    toast({ title: "تم حفظ التذكير" });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingWord || !canvasRef.current || manuscriptMode !== 'arrange') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setCurrentWords(prev => prev.map(w => w.id === draggingWord.wordId ? { ...w, x, y } : w));
  }, [draggingWord, manuscriptMode]);

  const handleMouseUp = () => setDraggingWord(null);

  const startRecording = (ctx: MappingContext, act: AppAction) => {
    setIsRecordingKey(true);
    setActiveRecordingAction({ ctx, act });
    (window as any).activeRecordingAction = { ctx, act };
    toast({ title: "وضع التسجيل نشط", description: "اضغط على أي زر في الريموت لتعيينه" });
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
          <p className="text-white/40 font-bold uppercase tracking-[0.6em] text-sm">Unified System Hub v13k</p>
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
        <TabsList className="bg-white/5 p-1 rounded-full border border-white/10 h-20 mb-12 flex justify-around overflow-x-auto no-scrollbar">
          <TabsTrigger value="manuscripts" className="rounded-full px-8 h-full font-black text-lg focusable">المخطوطات</TabsTrigger>
          <TabsTrigger value="reminders" className="rounded-full px-8 h-full font-black text-lg focusable">التذكيرات</TabsTrigger>
          <TabsTrigger value="subscriptions" className="rounded-full px-8 h-full font-black text-lg focusable">الاشتراكات</TabsTrigger>
          <TabsTrigger value="iptv" className="rounded-full px-8 h-full font-black text-lg focusable">قنوات IPTV</TabsTrigger>
          <TabsTrigger value="reciters" className="rounded-full px-8 h-full font-black text-lg focusable">القراء</TabsTrigger>
          <TabsTrigger value="buttonmap" className="rounded-full px-8 h-full font-black text-lg focusable">الأزرار</TabsTrigger>
          <TabsTrigger value="backgrounds" className="rounded-full px-8 h-full font-black text-lg focusable">الخلفيات</TabsTrigger>
        </TabsList>

        <TabsContent value="manuscripts" className="space-y-8">
          <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] relative overflow-hidden">
            <div className="flex items-center justify-between mb-8 relative z-10">
              <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Type className="w-12 h-12 text-primary" />استوديو الخطاط المحترف v3.0</CardTitle>
              <div className="flex gap-4">
                 <div className="bg-black/40 p-1.5 rounded-full border border-white/10 flex gap-2">
                    <button onClick={() => setManuscriptMode('write')} className={cn("px-6 h-11 rounded-full text-sm font-black transition-all", manuscriptMode === 'write' ? "bg-primary text-white shadow-glow" : "text-white/40")}>وضع الكتابة</button>
                    <button onClick={() => setManuscriptMode('arrange')} className={cn("px-6 h-11 rounded-full text-sm font-black transition-all", manuscriptMode === 'arrange' ? "bg-accent text-black shadow-glow" : "text-white/40")}>وضع الترتيب</button>
                 </div>
                 <Button onClick={handleSaveManuscript} className="bg-emerald-500 text-black rounded-full h-14 px-8 font-black shadow-glow">حفظ المخطوطة</Button>
              </div>
            </div>
            
            {/* Unified Canvas Staging Area */}
            <div 
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="mb-10 p-8 bg-zinc-900/60 rounded-[4rem] border-4 border-primary/20 relative overflow-hidden flex items-center justify-center min-h-[550px] shadow-2xl"
            >
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
              
              {currentWords.map((word) => (
                <div 
                  key={word.id}
                  onMouseDown={() => manuscriptMode === 'arrange' && setDraggingWord({ wordId: word.id })}
                  style={{ 
                    position: 'absolute', 
                    left: `${word.x}%`, 
                    top: `${word.y}%`, 
                    transform: `translate(-50%, -50%) scale(${word.scale || 1.0})`,
                    zIndex: draggingWord?.wordId === word.id ? 100 : 10,
                    cursor: manuscriptMode === 'arrange' ? 'move' : 'default',
                    fontFamily: selectedFont,
                    color: mapSettings.manuscriptColor,
                    textShadow: '0 0 30px rgba(255,255,255,0.4)',
                  }}
                  className={cn(
                    "transition-transform duration-100 select-none text-7xl md:text-[10rem] whitespace-nowrap leading-none p-4",
                    manuscriptMode === 'arrange' && "ring-2 ring-accent/30 rounded-[2rem] bg-accent/5 backdrop-blur-sm"
                  )}
                >
                  {word.text}
                  {manuscriptMode === 'arrange' && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={(e) => { e.stopPropagation(); setCurrentWords(prev => prev.map(w => w.id === word.id ? { ...w, scale: (w.scale || 1.0) + 0.1 } : w)); }} className="w-8 h-8 rounded-full bg-accent text-black flex items-center justify-center shadow-lg"><Plus className="w-4 h-4" /></button>
                       <button onClick={(e) => { e.stopPropagation(); setCurrentWords(prev => prev.map(w => w.id === word.id ? { ...w, scale: Math.max(0.1, (w.scale || 1.0) - 0.1) } : w)); }} className="w-8 h-8 rounded-full bg-accent text-black flex items-center justify-center shadow-lg"><Minus className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              ))}

              {!manuscriptInput && currentWords.length === 0 && (
                <div className="flex flex-col items-center gap-6 opacity-20">
                   <Sparkles className="w-24 h-24 text-primary" />
                   <p className="text-2xl font-black uppercase tracking-widest text-center">أدخل نص المخطوطة في الأسفل <br/> لتبدأ السحر</p>
                </div>
              )}
            </div>

            {/* Dynamic Controls Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
              <div className="lg:col-span-2 space-y-6 bg-black/40 p-8 rounded-[3rem] border border-white/10">
                <div className="flex gap-4">
                   <Input 
                      placeholder="اكتب المخطوطة السيادية هنا..." 
                      value={manuscriptInput} 
                      onChange={(e) => setManuscriptInput(e.target.value)} 
                      className="h-20 bg-white/5 border-none px-8 rounded-2xl text-3xl font-black focus-visible:ring-primary shadow-2xl" 
                   />
                   <Select value={selectedFont} onValueChange={setSelectedFont}>
                      <SelectTrigger className="h-20 w-64 bg-white/5 border-none text-xl font-black rounded-2xl"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-950 text-white dir-rtl">
                        <SelectItem value="Amiri">Amiri</SelectItem>
                        <SelectItem value="Reem Kufi">Reem Kufi</SelectItem>
                        <SelectItem value="Aref Ruqaa">Aref Ruqaa</SelectItem>
                        <SelectItem value="Alkalami">Alkalami</SelectItem>
                        <SelectItem value="Gulzar">Gulzar</SelectItem>
                        {customFonts?.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
                      </SelectContent>
                   </Select>
                </div>
                <div className="flex justify-between items-center px-4">
                   <div className="flex items-center gap-4 text-white/40">
                      <LayoutGrid className="w-5 h-5" />
                      <span className="text-xs font-black uppercase tracking-widest">تحكمات الاستوديو المتقدمة</span>
                   </div>
                   {editingManuscriptId && <button onClick={() => { setEditingManuscriptId(null); setManuscriptInput(""); setCurrentWords([]); setManuscriptMode('write'); }} className="text-red-500 text-sm font-black flex items-center gap-2 hover:underline"><X className="w-4 h-4" /> إلغاء التعديل</button>}
                </div>
              </div>
              
              <div className="bg-black/40 p-8 rounded-[3rem] border border-white/10 flex flex-col justify-center gap-4">
                 <input type="file" hidden ref={fontFileRef} accept=".ttf,.otf" onChange={(e) => handleFileUpload(e, 'font')} />
                 <Button onClick={() => fontFileRef.current?.click()} className="w-full h-16 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-2xl font-black shadow-glow"><Upload className="w-6 h-6 ml-3" /> رفع خط مخصص (TTF)</Button>
                 <p className="text-[10px] text-center text-white/20 font-bold uppercase tracking-widest">Sovereign Font Injection Engine</p>
              </div>
            </div>

            {/* Global List with Instant Cache Recall */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              {customManuscripts.map((m) => (
                <div key={m.id} className="bg-black/60 p-8 rounded-[3rem] border border-white/10 flex flex-col items-center justify-between group shadow-2xl hover:border-primary/40 transition-all">
                  <div className="w-full flex-1 flex items-center justify-center min-h-[140px] mb-6 overflow-hidden">
                    <p className="text-2xl text-center leading-relaxed truncate font-black" style={{ fontFamily: m.fontFamily || 'inherit', color: mapSettings.manuscriptColor }}>{m.content}</p>
                  </div>
                  <div className="flex gap-3 w-full">
                    <Button onClick={() => startEditManuscript(m)} className="flex-1 h-14 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-2xl hover:bg-emerald-600 transition-all font-black"><Edit2 className="w-5 h-5 ml-2" /> تحرير</Button>
                    <Button onClick={() => removeManuscript(m.id)} className="w-14 h-14 bg-red-600/20 text-red-500 border border-red-500/30 rounded-2xl"><Trash2 className="w-5 h-5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* باقي التبويبات تظل كما هي مع التأكد من الحفظ التلقائي */}
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
                        <Input type="number" placeholder="+/-" value={newReminder.startOffset} onChange={(e) => setNewReminder({ ...newReminder, startOffset: parseInt(e.target.value) || 0 })} className="w-24 h-14 bg-white/5 text-center font-bold" />
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
              <Button onClick={handleSaveReminder} className="h-20 w-full bg-primary rounded-[2rem] text-2xl font-black shadow-glow">{editingReminderId ? "تحديث التذكير" : "إضافة تذكير سيادي"}</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reminders.map(r => (
                <div key={r.id} className="bg-black/40 p-8 rounded-[2.5rem] border border-white/5 flex items-center justify-between group shadow-xl">
                  <div className="flex items-center gap-5">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5", r.color)}><Bell className="w-6 h-6" /></div>
                    <span className={cn("text-2xl font-black", r.color)}>{r.label}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => startEditReminder(r)} variant="ghost" className="w-12 h-12 rounded-full hover:bg-white/10 text-white/40"><Edit2 className="w-5 h-5" /></Button>
                    <Button onClick={() => removeReminder(r.id)} variant="ghost" className="w-12 h-12 rounded-full hover:bg-red-600/20 text-red-500"><Trash2 className="w-5 h-5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-8">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem]">
             <div className="flex justify-between items-center mb-12">
               <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Youtube className="w-12 h-12 text-red-600" /> إدارة الاشتراكات</CardTitle>
               <Button onClick={saveChannelsReorder} className="bg-primary/20 text-primary border border-primary/40 rounded-full h-14 px-8 font-black shadow-glow">حفظ الترتيب السحابي</Button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {favoriteChannels.map(ch => (
                  <div key={ch.channelid} className="bg-black/60 p-6 rounded-[2.5rem] border border-white/10 flex flex-col items-center gap-4 relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl"><img src={ch.image} className="w-full h-full object-cover" alt="" /></div>
                    <span className="text-xl font-black text-white truncate w-full text-center">{ch.name}</span>
                    <div className="flex gap-2 w-full">
                       <button onClick={() => toggleStarChannel(ch.channelid)} className={cn("flex-1 h-12 rounded-xl flex items-center justify-center transition-all", ch.starred ? "bg-yellow-500 text-black shadow-glow" : "bg-white/5 text-white/40")}><Zap className={cn("w-5 h-5", ch.starred && "fill-current")} /></button>
                       <button onClick={() => removeChannel(ch.channelid)} className="flex-1 h-12 rounded-xl bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))}
             </div>
           </Card>
        </TabsContent>

        <TabsContent value="iptv" className="space-y-8">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem]">
             <div className="flex justify-between items-center mb-12">
               <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Tv className="w-12 h-12 text-emerald-500" /> قنوات IPTV المفضلة</CardTitle>
               <Button onClick={saveIptvReorder} className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-full h-14 px-8 font-black shadow-glow">حفظ الترتيب السحابي</Button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {favoriteIptvChannels.map(ch => (
                  <div key={ch.stream_id} className="bg-black/60 p-6 rounded-[2.5rem] border border-white/10 flex flex-col items-center gap-4 relative group">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white/10 shadow-2xl bg-zinc-900"><img src={ch.stream_icon} className="w-full h-full object-cover" alt="" /></div>
                    <span className="text-xl font-black text-white truncate w-full text-center">{ch.name}</span>
                    <Button onClick={() => toggleFavoriteIptvChannel(ch)} className="w-full h-12 bg-red-600/20 text-red-500 border border-red-500/30 rounded-xl"><Trash2 className="w-5 h-5 ml-2" /> حذف</Button>
                  </div>
                ))}
             </div>
           </Card>
        </TabsContent>

        <TabsContent value="reciters" className="space-y-8">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem]">
             <div className="flex justify-between items-center mb-12">
               <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Mic className="w-12 h-12 text-emerald-400" /> القراء والمبدعون</CardTitle>
               <Button onClick={saveRecitersReorder} className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-full h-14 px-8 font-black shadow-glow">حفظ الترتيب السحابي</Button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {favoriteReciters.map(r => (
                  <div key={r.channelid} className="bg-black/60 p-6 rounded-[2.5rem] border border-white/10 flex flex-col items-center gap-4 relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-emerald-500/20 shadow-2xl"><img src={r.image} className="w-full h-full object-cover" alt="" /></div>
                    <span className="text-xl font-black text-white truncate w-full text-center">{r.name}</span>
                    <div className="flex gap-2 w-full">
                       <button onClick={() => moveReciterToTop(r.channelid)} className="flex-1 h-12 rounded-xl bg-white/5 text-white/40 hover:bg-emerald-500 transition-all flex items-center justify-center"><ArrowUpCircle className="w-5 h-5" /></button>
                       <button onClick={() => removeReciter(r.channelid)} className="flex-1 h-12 rounded-xl bg-red-600/20 text-red-500 hover:bg-red-600 transition-all flex items-center justify-center"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>
                ))}
             </div>
           </Card>
        </TabsContent>

        <TabsContent value="buttonmap" className="space-y-8">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem]">
             <CardTitle className="text-4xl font-black text-white flex items-center gap-6 mb-12"><Keyboard className="w-12 h-12 text-primary" /> تسجيل اختصارات التحكم</CardTitle>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {Object.entries(keyMappings).map(([ctx, actions]) => (
                  <div key={ctx} className="p-8 bg-black/40 rounded-[3rem] border border-white/10 shadow-xl">
                     <h3 className="text-2xl font-black text-primary mb-6 uppercase tracking-widest">{ctx} Context</h3>
                     <div className="space-y-4">
                        {Object.entries(actions).map(([act, keys]) => (
                          <div key={act} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                             <div className="flex flex-col">
                               <span className="text-sm font-bold text-white/60 uppercase">{act.replace(/_/g, ' ')}</span>
                               <button 
                                 onClick={() => startRecording(ctx as any, act as any)} 
                                 className={cn(
                                   "text-[10px] font-black uppercase mt-1 text-right transition-colors", 
                                   (activeRecordingAction?.act === act && activeRecordingAction?.ctx === ctx) ? "text-red-500 animate-pulse" : "text-accent hover:text-white"
                                 )}
                               >
                                 {(activeRecordingAction?.act === act && activeRecordingAction?.ctx === ctx) ? "جاري التسجيل..." : "تسجيل مفتاح جديد"}
                               </button>
                             </div>
                             <div className="flex gap-2">
                                {keys.map(k => (
                                  <div key={k} className="px-3 py-1 bg-zinc-800 rounded-lg border border-zinc-600 flex items-center gap-2">
                                     <span className="text-xs font-black text-white">{k}</span>
                                     <button onClick={() => removeSpecificKeyMapping(ctx as any, act as any, k)} className="text-red-500 hover:scale-110"><X className="w-3 h-3" /></button>
                                  </div>
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

        <TabsContent value="backgrounds" className="space-y-8">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem]">
             <CardTitle className="text-4xl font-black text-white flex items-center gap-6 mb-12"><Palette className="w-12 h-12 text-primary" /> تخصيص المظهر والخلفيات</CardTitle>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 bg-black/40 rounded-[3rem] border-4 border-dashed border-white/10 flex flex-col items-center justify-center gap-6 text-center group cursor-pointer hover:border-primary/40 transition-all" onClick={() => bgInputRef.current?.click()}>
                   <input type="file" hidden ref={bgInputRef} accept="image/*" onChange={(e) => handleFileUpload(e, 'bg')} />
                   <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform"><Plus className="w-10 h-10" /></div>
                   <div className="space-y-1"><p className="text-xl font-black text-white">رفع خلفية مخصصة</p><p className="text-xs text-white/20 font-bold uppercase tracking-widest">Image Overlay Engine</p></div>
                </div>
                {customWallBackgrounds.map((bg, idx) => (
                  <div key={idx} className="relative aspect-video rounded-[2.5rem] overflow-hidden border-2 border-white/5 group shadow-2xl">
                     <img src={bg} className="w-full h-full object-cover" alt="" />
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4">
                        <Button onClick={() => updateMapSettings({ manuscriptBgUrl: bg })} className="bg-primary text-white rounded-xl h-12 px-6 font-black"><Zap className="w-4 h-4 ml-2" /> تعيين كخلفية</Button>
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
