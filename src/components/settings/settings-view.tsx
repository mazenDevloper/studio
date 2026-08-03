
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMediaStore, Reminder, Manuscript, MappingContext, AppAction, ManuscriptWord, IptvChannel } from "@/lib/store";
import { 
  Settings, Bell, Trash2, Edit2, Plus, Minus, Keyboard, Timer, ArrowRightLeft, 
  Loader2, RefreshCw, Mic, X, Type, Zap, Sparkles, Upload, Clock, Youtube, Tv, Star, Magnet,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Maximize, Minimize, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * SettingsView v80.0 - Sovereign Control & Vision Hub
 * Features: Background Management, Full IPTV CRUD, Manuscript Studio.
 */
export function SettingsView() {
  const { 
    addReminder, removeReminder, reminders, updateReminder,
    mapSettings, updateMapSettings, prayerSettings,
    customManuscripts, addManuscript, updateManuscript, removeManuscript,
    keyMappings, removeSpecificKeyMapping, setKeyMapping,
    favoriteReciters, removeReciter, updateReciterName, favoriteIptvChannels, toggleFavoriteIptvChannel,
    favoriteChannels, removeChannel, toggleStarChannel,
    fetchPriorityData, syncMasterBin, saveRecitersReorder, saveChannelsReorder, saveIptvReorder,
    customFonts, addCustomFont, saveManuscriptsReorder, setIsRecordingKey,
    manuscriptScales, updateManuscriptScale, isReorderMode, toggleReorderMode,
    customWallBackgrounds, addCustomWallBackground, removeCustomWallBackground,
    updateIptvChannel
  } = useMediaStore();
  
  const { toast } = useToast();
  const fontFileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeRecordingAction, setActiveRecordingAction] = useState<{ ctx: MappingContext, act: AppAction } | null>(null);
  
  const [manuscriptMode, setManuscriptMode] = useState<'write' | 'arrange'>('write');
  const [manuscriptInput, setManuscriptInput] = useState("");
  const [manuscriptType, setManuscriptType] = useState<'text' | 'image'>('text');
  const [selectedFont, setSelectedFont] = useState<string>("Aref Ruqaa");
  const [editingManuscriptId, setEditingManuscriptId] = useState<string | null>(null);
  const [currentWords, setCurrentWords] = useState<ManuscriptWord[]>([]);
  const [draggingWord, setDraggingWord] = useState<{ wordId: string } | null>(null);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);

  const [editingIptvId, setEditingIptvId] = useState<string | null>(null);
  const [iptvEditForm, setIptvEditInput] = useState<Partial<IptvChannel>>({});

  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({
    label: "", color: "text-blue-400", iconType: "bell", 
    startType: 'azan', startReference: 'fajr', startOffset: 0,
    endType: 'duration', endReference: 'fajr', endOffset: 0,
    showCountdown: true, showCountup: false, countdownWindow: 15, completed: false,
    manualStartTime: "00:00", manualEndTime: "00:00", durationMinutes: 30
  });

  const [editingReciterId, setEditingReciterId] = useState<string | null>(null);
  const [reciterNameInput, setReciterNameInput] = useState("");

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try { await fetchPriorityData('all'); } finally { setIsRefreshing(false); }
  }, [fetchPriorityData]);

  useEffect(() => {
    if (manuscriptMode === 'write' && manuscriptInput.trim() && !editingManuscriptId) {
      const words = manuscriptInput.trim().split(/\s+/).map((t, i, arr) => ({
        id: `word-${i}-${Date.now()}`,
        text: t,
        x: 50 + (i - (arr.length - 1) / 2) * 12,
        y: 50,
        scale: 1.0
      }));
      setCurrentWords(words);
    }
  }, [manuscriptInput, manuscriptMode, editingManuscriptId]);

  const moveWord = (wordId: string, dx: number, dy: number, ds: number = 0) => {
    setCurrentWords(prev => prev.map(w => w.id === wordId ? { 
      ...w, 
      x: Math.max(0, Math.min(100, w.x + dx)), 
      y: Math.max(0, Math.min(100, w.y + dy)),
      scale: Math.max(0.1, w.scale + ds)
    } : w));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'bg' | 'font') => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (res) => {
      const dataUrl = res.target?.result as string;
      if (target === 'font') { 
        const name = file.name.split('.')[0].replace(/\s+/g, '-'); 
        addCustomFont(name, dataUrl); 
      } else if (target === 'bg') {
        addCustomWallBackground(dataUrl);
      }
      toast({ title: "تم الرفع بنجاح" });
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
    setEditingManuscriptId(null); setManuscriptInput(""); setCurrentWords([]); setManuscriptMode('write'); setSelectedWordId(null);
    toast({ title: "تم حفظ المخطوطة السيادية" });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingWord || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setCurrentWords(prev => prev.map(w => w.id === draggingWord.wordId ? { ...w, x, y } : w));
  }, [draggingWord]);

  const handleMouseUp = () => setDraggingWord(null);

  const applyMagnetSnap = (wordId: string) => {
    const word = currentWords.find(w => w.id === wordId);
    if (!word) return;
    let cX = word.x, cY = word.y;
    currentWords.forEach(other => {
      if (other.id === wordId) return;
      if (Math.abs(other.x - word.x) < 3) cX = other.x;
      if (Math.abs(other.y - word.y) < 3) cY = other.y;
    });
    setCurrentWords(prev => prev.map(w => w.id === wordId ? { ...w, x: cX, y: cY } : w));
  };

  const startRecording = (ctx: MappingContext, act: AppAction) => {
    setIsRecordingKey(true);
    setActiveRecordingAction({ ctx, act });
    toast({ title: "وضع التسجيل نشط" });
  };

  const handleSaveReminder = async () => {
    if (!newReminder.label) return;
    if (editingReminderId) updateReminder(editingReminderId, newReminder);
    else addReminder({ ...newReminder as Reminder, id: Date.now().toString() });
    setEditingReminderId(null);
    setNewReminder({ label: "", color: "text-blue-400", iconType: "bell", startType: 'azan', startReference: 'fajr', startOffset: 0, endType: 'duration', endReference: 'fajr', endOffset: 0, showCountdown: true, showCountup: false, countdownWindow: 15, completed: false, manualStartTime: "00:00", manualEndTime: "00:00", durationMinutes: 30 });
  };

  const startEditIptv = (ch: IptvChannel) => {
    setEditingIptvId(ch.stream_id);
    setIptvEditInput({ name: ch.name, url: ch.url, stream_icon: ch.stream_icon });
  };

  const handleSaveIptv = async () => {
    if (!editingIptvId) return;
    updateIptvChannel(editingIptvId, iptvEditForm);
    setEditingIptvId(null);
    toast({ title: "تم تحديث القناة وحفظها سحابياً" });
  };

  const startEditReciter = (r: any) => { setEditingReciterId(r.channelid); setReciterNameInput(r.name); };
  const handleSaveReciterName = () => { if (!editingReciterId || !reciterNameInput) return; updateReciterName(editingReciterId, reciterNameInput); setEditingReciterId(null); };

  const activeManuScale = editingManuscriptId ? (manuscriptScales[editingManuscriptId] || 1.0) : 1.0;

  return (
    <div className="p-12 space-y-12 max-w-7xl mx-auto pb-40 text-right dir-rtl bg-black min-h-full transition-none">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-6xl font-black text-white tracking-tighter flex items-center gap-6">الإعدادات السيادية <Settings className="w-12 h-12 text-primary" /></h1>
          <p className="text-white/40 font-bold uppercase tracking-[0.6em] text-sm">Unified System Hub v80k</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={handleManualRefresh} disabled={isRefreshing} className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-full h-14 px-8 font-black focusable"><RefreshCw className={cn("w-5 h-5 ml-2", isRefreshing && "animate-spin")} /> تحديث محلي</Button>
          <Button onClick={async () => { setIsSyncing(true); await syncMasterBin(); setIsSyncing(false); toast({ title: "تم المزامنة بنجاح" }); }} disabled={isSyncing} className="bg-primary text-white rounded-full h-14 px-8 font-black focusable shadow-glow">{isSyncing ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Zap className="w-5 h-5 ml-2" />} دفع عالمي</Button>
        </div>
      </header>

      <Tabs defaultValue="manuscripts" className="w-full">
        <TabsList className="bg-white/5 p-1 rounded-full border border-white/10 h-20 mb-12 flex justify-around overflow-x-auto no-scrollbar shadow-2xl">
          <TabsTrigger value="manuscripts" className="rounded-full px-8 h-full font-black text-lg data-[state=active]:bg-primary transition-none">المخطوطات</TabsTrigger>
          <TabsTrigger value="reminders" className="rounded-full px-8 h-full font-black text-lg data-[state=active]:bg-primary transition-none">التذكيرات</TabsTrigger>
          <TabsTrigger value="subscriptions" className="rounded-full px-8 h-full font-black text-lg data-[state=active]:bg-primary transition-none">الاشتراكات</TabsTrigger>
          <TabsTrigger value="iptv" className="rounded-full px-8 h-full font-black text-lg data-[state=active]:bg-primary transition-none">قنوات IPTV</TabsTrigger>
          <TabsTrigger value="backgrounds" className="rounded-full px-8 h-full font-black text-lg data-[state=active]:bg-primary transition-none">الخلفيات</TabsTrigger>
          <TabsTrigger value="reciters" className="rounded-full px-8 h-full font-black text-lg data-[state=active]:bg-primary transition-none">القراء</TabsTrigger>
          <TabsTrigger value="buttonmap" className="rounded-full px-8 h-full font-black text-lg data-[state=active]:bg-primary transition-none">الأزرار</TabsTrigger>
        </TabsList>

        <TabsContent value="manuscripts" className="space-y-8 animate-in fade-in duration-0">
          <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-8 relative z-10">
              <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Type className="w-12 h-12 text-primary" />استوديو التجميد v80.0</CardTitle>
              <div className="flex gap-4">
                 <div className="bg-black/40 p-1.5 rounded-full border border-white/10 flex gap-2">
                    <button onClick={() => setManuscriptMode('write')} className={cn("px-6 h-11 rounded-full text-sm font-black transition-none focusable", manuscriptMode === 'write' ? "bg-primary text-white" : "text-white/40")}>وضع الكتابة</button>
                    <button onClick={() => setManuscriptMode('arrange')} className={cn("px-6 h-11 rounded-full text-sm font-black transition-none focusable", manuscriptMode === 'arrange' ? "bg-accent text-black" : "text-white/40")}>وضع الترتيب</button>
                 </div>
                 <Button onClick={handleSaveManuscript} className="bg-emerald-500 text-black rounded-full h-14 px-8 font-black shadow-glow focusable">حفظ المخطوطة</Button>
              </div>
            </div>
            
            <div 
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="mb-10 p-0 bg-zinc-900/60 rounded-[4rem] border-4 border-primary/20 relative overflow-hidden flex items-center justify-center aspect-[4/3] w-full max-w-4xl mx-auto shadow-2xl transition-none [container-type:inline-size]"
            >
              {currentWords.map((word) => (
                <div 
                  key={word.id}
                  onMouseDown={() => { if(manuscriptMode === 'arrange') { setDraggingWord({ wordId: word.id }); setSelectedWordId(word.id); }}}
                  style={{ 
                    position: 'absolute', 
                    left: `${word.x}%`, 
                    top: `${word.y}%`, 
                    transform: `translate(-50%, -50%) scale(${(word.scale || 1.0) * activeManuScale})`,
                    zIndex: draggingWord?.wordId === word.id ? 100 : 10,
                    cursor: manuscriptMode === 'arrange' ? 'move' : 'default',
                    fontFamily: selectedFont,
                    color: mapSettings.manuscriptColor,
                    fontSize: '8.5cqw',
                    textShadow: '0 0 30px rgba(255,255,255,0.4)',
                    transition: 'none'
                  }}
                  className={cn(
                    "select-none whitespace-nowrap leading-none p-4",
                    selectedWordId === word.id && "ring-4 ring-primary rounded-[2rem] bg-primary/10"
                  )}
                >
                  {word.text}
                </div>
              ))}
            </div>

            {selectedWordId && manuscriptMode === 'arrange' && (
              <div className="flex items-center justify-center gap-10 bg-black/60 backdrop-blur-3xl p-8 rounded-[3rem] border-2 border-primary/40 mb-10 shadow-2xl animate-in zoom-in-50 duration-0">
                 <div className="flex flex-col items-center gap-4">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">تحريك الكلمة</span>
                    <div className="grid grid-cols-3 gap-3">
                       <div />
                       <button onClick={() => moveWord(selectedWordId, 0, -1)} className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center focusable"><ChevronUp className="w-6 h-6" /></button>
                       <div />
                       <button onClick={() => moveWord(selectedWordId, -1, 0)} className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center focusable"><ChevronRight className="w-6 h-6" /></button>
                       <button onClick={() => moveWord(selectedWordId, 0, 1)} className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center focusable"><ChevronDown className="w-6 h-6" /></button>
                       <button onClick={() => moveWord(selectedWordId, 1, 0)} className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center focusable"><ChevronLeft className="w-6 h-6" /></button>
                    </div>
                 </div>
                 <div className="w-px h-20 bg-white/10" />
                 <div className="flex flex-col items-center gap-4">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">تغيير الحجم</span>
                    <div className="flex gap-4">
                       <button onClick={() => moveWord(selectedWordId, 0, 0, 0.1)} className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center focusable"><Maximize className="w-8 h-8" /></button>
                       <button onClick={() => moveWord(selectedWordId, 0, 0, -0.1)} className="w-16 h-16 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center focusable"><Minimize className="w-8 h-8" /></button>
                    </div>
                 </div>
                 <div className="w-px h-20 bg-white/10" />
                 <button onClick={() => applyMagnetSnap(selectedWordId)} className="h-16 px-8 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center gap-4 focusable font-black"><Magnet className="w-6 h-6" /> محاذاة مغناطيسية</button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
              <div className="lg:col-span-2 space-y-6 bg-black/40 p-8 rounded-[3rem] border border-white/10 shadow-xl">
                <div className="flex gap-4">
                   <Input placeholder="اكتب المخطوطة السيادية هنا..." value={manuscriptInput} onChange={(e) => setManuscriptInput(e.target.value)} className="h-20 bg-white/5 border-none px-8 rounded-2xl text-3xl font-black text-white focusable" />
                   <Select value={selectedFont} onValueChange={setSelectedFont}>
                      <SelectTrigger className="h-20 w-64 bg-white/5 border-none text-xl font-black rounded-2xl focusable"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-950 text-white dir-rtl"><SelectItem value="Amiri">Amiri</SelectItem><SelectItem value="Reem Kufi">Reem Kufi</SelectItem><SelectItem value="Aref Ruqaa">Aref Ruqaa</SelectItem>{customFonts?.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}</SelectContent>
                   </Select>
                </div>
              </div>
              <div className="bg-black/40 p-8 rounded-[3rem] border border-white/10 flex flex-col justify-center gap-4 shadow-xl">
                 {editingManuscriptId && (
                   <div className="flex flex-col items-center gap-4 mb-4">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">تكبير شامل للمخطوطة</span>
                      <div className="flex gap-3">
                         <button onClick={() => updateManuscriptScale(editingManuscriptId, 0.05)} className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center focusable"><Plus className="w-6 h-6" /></button>
                         <div className="w-12 h-12 flex items-center justify-center font-black text-white">{activeManuScale.toFixed(2)}</div>
                         <button onClick={() => updateManuscriptScale(editingManuscriptId, -0.05)} className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center focusable"><Minus className="w-6 h-6" /></button>
                      </div>
                   </div>
                 )}
                 <input type="file" hidden ref={fontFileRef} accept=".ttf,.otf" onChange={(e) => handleFileUpload(e, 'font')} />
                 <Button onClick={() => fontFileRef.current?.click()} className="w-full h-16 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-2xl font-black focusable"><Upload className="w-6 h-6 ml-3" /> رفع خط مخصص</Button>
              </div>
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              {customManuscripts.map((m) => (
                <div key={m.id} className="bg-black/60 p-8 rounded-[3rem] border border-white/10 flex flex-col items-center justify-between group shadow-2xl transition-none">
                  <p className="text-2xl text-center leading-relaxed truncate font-black mb-6" style={{ fontFamily: m.fontFamily || 'inherit', color: mapSettings.manuscriptColor }}>{m.content}</p>
                  <div className="flex gap-3 w-full">
                    <Button onClick={() => startEditManuscript(m)} className="flex-1 h-14 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-2xl font-black focusable"><Edit2 className="w-5 h-5 ml-2" /> تحرير</Button>
                    <Button onClick={() => removeManuscript(m.id)} className="w-14 h-14 bg-red-600/20 text-red-500 border border-red-500/30 rounded-2xl focusable"><Trash2 className="w-5 h-5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-8 animate-in fade-in duration-0">
          <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl">
            <CardTitle className="text-4xl font-black text-white flex items-center gap-6 mb-12"><Bell className="w-12 h-12 text-primary" /> نظام التذكيرات المتطور</CardTitle>
            <div className="bg-black/40 p-10 rounded-[3rem] border border-white/10 mb-12 shadow-2xl space-y-10">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4"><label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">عنوان التذكير</label><Input placeholder="أدخل العنوان..." value={newReminder.label} onChange={(e) => setNewReminder({ ...newReminder, label: e.target.value })} className="h-16 bg-white/5 text-white text-2xl font-black rounded-2xl focusable" /></div>
                  <div className="space-y-4"><label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">اللون المميز</label><Select value={newReminder.color} onValueChange={(v) => setNewReminder({ ...newReminder, color: v })}><SelectTrigger className="h-16 bg-white/5 border-none text-xl font-black rounded-2xl focusable"><SelectValue /></SelectTrigger><SelectContent className="bg-zinc-950 text-white dir-rtl"><SelectItem value="text-blue-400">أزرق سيادي</SelectItem><SelectItem value="text-emerald-400">أخضر زمردي</SelectItem><SelectItem value="text-orange-400">برتقالي ناري</SelectItem><SelectItem value="text-purple-400">بنفسجي ملكي</SelectItem><SelectItem value="text-red-500">أحمر تحذيري</SelectItem></SelectContent></Select></div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-4"><label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">نوع البداية</label><Select value={newReminder.startType} onValueChange={(v: any) => setNewReminder({ ...newReminder, startType: v })}><SelectTrigger className="h-16 bg-white/5 border-none text-xl font-black rounded-2xl focusable"><SelectValue /></SelectTrigger><SelectContent className="bg-zinc-950 text-white dir-rtl"><SelectItem value="azan">مرتبط بالأذان</SelectItem><SelectItem value="iqamah">مرتبط بالإقامة</SelectItem><SelectItem value="manual">وقت يدوي</SelectItem></SelectContent></Select></div>
                  {(newReminder.startType === 'azan' || newReminder.startType === 'iqamah') && (<div className="space-y-4"><label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">مرجع البداية</label><Select value={newReminder.startReference} onValueChange={(v) => setNewReminder({ ...newReminder, startReference: v })}><SelectTrigger className="h-16 bg-white/5 border-none text-xl font-black rounded-2xl focusable"><SelectValue /></SelectTrigger><SelectContent className="bg-zinc-950 text-white dir-rtl">{prayerSettings.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>)}
                  <div className="space-y-4"><label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">إزاحة البداية (دقائق)</label><Input type="number" value={newReminder.startOffset} onChange={(e) => setNewReminder({ ...newReminder, startOffset: parseInt(e.target.value) || 0 })} className="h-16 bg-white/5 text-white text-xl font-black rounded-2xl focusable" /></div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-4"><label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">نوع الانتهاء</label><Select value={newReminder.endType} onValueChange={(v: any) => setNewReminder({ ...newReminder, endType: v })}><SelectTrigger className="h-16 bg-white/5 border-none text-xl font-black rounded-2xl focusable"><SelectValue /></SelectTrigger><SelectContent className="bg-zinc-950 text-white dir-rtl"><SelectItem value="azan">مرتبط بالأذان</SelectItem><SelectItem value="iqamah">مرتبط بالإقامة</SelectItem><SelectItem value="prayer">صلاة تالية</SelectItem><SelectItem value="duration">مدة زمنية</SelectItem><SelectItem value="manual">وقت يدوي</SelectItem></SelectContent></Select></div>
                  {newReminder.endType !== 'duration' && newReminder.endType !== 'manual' && (<div className="space-y-4"><label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">مرجع الانتهاء</label><Select value={newReminder.endReference} onValueChange={(v) => setNewReminder({ ...newReminder, endReference: v })}><SelectTrigger className="h-16 bg-white/5 border-none text-xl font-black rounded-2xl focusable"><SelectValue /></SelectTrigger><SelectContent className="bg-zinc-950 text-white dir-rtl">{prayerSettings.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>)}
                  {newReminder.endType === 'duration' && (<div className="space-y-4"><label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">المدة (دقائق)</label><Input type="number" value={newReminder.durationMinutes} onChange={(e) => setNewReminder({ ...newReminder, durationMinutes: parseInt(e.target.value) || 30 })} className="h-16 bg-white/5 text-white text-xl font-black rounded-2xl focusable" /></div>)}
               </div>
               <Button onClick={handleSaveReminder} className="h-20 w-full bg-primary rounded-[2rem] text-2xl font-black shadow-glow focusable">{editingReminderId ? "تحديث التذكير السيادي" : "حفظ التذكير السيادي الجديد"}</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {reminders.map(r => (
                 <div key={r.id} className="bg-black/40 p-8 rounded-[3rem] border border-white/10 flex items-center justify-between group shadow-xl transition-none">
                    <div className="flex items-center gap-5"><div className={cn("w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center", r.color)}>{r.iconType === 'bell' ? <Bell className="w-6 h-6" /> : <Timer className="w-6 h-6" />}</div><div className="flex flex-col"><span className={cn("text-2xl font-black", r.color)}>{r.label}</span><span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{r.startType} → {r.endType}</span></div></div>
                    <div className="flex gap-3"><Button onClick={() => { setEditingReminderId(r.id); setNewReminder(r); }} variant="ghost" className="w-12 h-12 rounded-full text-emerald-400 hover:bg-emerald-400/10 focusable transition-none"><Edit2 className="w-5 h-5 ml-2" /> تحرير</Button><Button onClick={() => removeReminder(r.id)} variant="ghost" className="w-12 h-12 rounded-full text-red-500 hover:bg-red-500/10 focusable transition-none"><Trash2 className="w-5 h-5" /></Button></div>
                 </div>
               ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl">
             <div className="flex justify-between items-center mb-12">
               <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Youtube className="w-12 h-12 text-red-600" /> إدارة الاشتراكات (الترددات المجرسة)</CardTitle>
               <div className="flex gap-4">
                 <Button onClick={toggleReorderMode} className={cn("rounded-full h-14 px-8 font-black focusable", isReorderMode ? "bg-blue-600 text-white shadow-glow" : "bg-white/10")}>{isReorderMode ? "إنهاء الترتيب" : "ترتيب يدوي"}</Button>
                 <Button onClick={saveChannelsReorder} className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-full h-14 px-8 font-black focusable shadow-glow">حفظ السحابة</Button>
               </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {favoriteChannels.map(ch => (
                  <div key={ch.channelid} className="bg-black/60 p-8 rounded-[3rem] border border-white/10 flex flex-col items-center gap-6 relative group shadow-xl transition-none">
                    <div className="relative">
                      <img src={ch.image} className="w-24 h-24 rounded-full border-4 border-white/10 shadow-2xl object-cover" alt="" />
                      <button onClick={() => toggleStarChannel(ch.channelid)} className={cn("absolute -top-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center border-2 border-black shadow-2xl transition-all", ch.starred ? "bg-yellow-500 text-black scale-110" : "bg-zinc-800 text-white/20")}>
                        <Star className={cn("w-5 h-5", ch.starred && "fill-current")} />
                      </button>
                    </div>
                    <span className="text-xl font-black text-white truncate w-full text-center">{ch.name}</span>
                    <button onClick={() => removeChannel(ch.channelid)} className="w-12 h-12 bg-red-600/20 text-red-500 border border-red-500/30 rounded-2xl flex items-center justify-center transition-none focusable"><Trash2 className="w-5 h-5" /></button>
                  </div>
                ))}
             </div>
           </Card>
        </TabsContent>

        <TabsContent value="iptv" className="space-y-8 animate-in fade-in duration-0">
          <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl">
            <div className="flex justify-between items-center mb-12">
              <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Tv className="w-12 h-12 text-emerald-500" /> إدارة قنوات IPTV السيادية</CardTitle>
              <Button onClick={saveIptvReorder} className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-full h-14 px-8 font-black focusable shadow-glow">حفظ السحابة</Button>
            </div>

            {editingIptvId && (
              <div className="bg-black/60 p-10 rounded-[3rem] border-2 border-primary/40 mb-12 shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-4">تعديل بيانات القناة <Edit2 className="w-6 h-6 text-primary" /></h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                  <div className="space-y-4"><label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">اسم القناة</label><Input value={iptvEditForm.name} onChange={(e) => setIptvEditInput({ ...iptvEditForm, name: e.target.value })} className="h-16 bg-white/5 text-white text-xl font-black rounded-2xl focusable" /></div>
                  <div className="space-y-4"><label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">رابط البث</label><Input value={iptvEditForm.url} onChange={(e) => setIptvEditInput({ ...iptvEditForm, url: e.target.value })} className="h-16 bg-white/5 text-white text-lg font-bold rounded-2xl focusable dir-ltr" /></div>
                  <div className="space-y-4"><label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">رابط الأيقونة</label><Input value={iptvEditForm.stream_icon} onChange={(e) => setIptvEditInput({ ...iptvEditForm, stream_icon: e.target.value })} className="h-16 bg-white/5 text-white text-lg font-bold rounded-2xl focusable dir-ltr" /></div>
                </div>
                <div className="flex gap-4">
                  <Button onClick={handleSaveIptv} className="flex-1 h-16 bg-primary text-white text-xl font-black rounded-2xl shadow-glow focusable">حفظ التغييرات</Button>
                  <Button onClick={() => setEditingIptvId(null)} className="w-16 h-16 bg-white/5 text-white/40 rounded-2xl focusable"><X className="w-8 h-8" /></Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {favoriteIptvChannels.map((ch) => (
                <div key={ch.stream_id} className="bg-black/60 p-8 rounded-[3rem] border border-white/10 flex flex-col items-center gap-6 relative group shadow-xl transition-none">
                  <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-white/10 bg-zinc-950">
                    {ch.stream_icon ? <img src={ch.stream_icon} className="w-full h-full object-cover" alt="" /> : <Tv className="w-full h-full p-6 text-white/10" />}
                  </div>
                  <span className="text-xl font-black text-white truncate w-full text-center">{ch.name}</span>
                  <div className="flex gap-3 w-full">
                    <Button onClick={() => startEditIptv(ch)} className="flex-1 h-12 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center focusable"><Edit2 className="w-5 h-5 ml-2" /> تعديل</Button>
                    <button onClick={() => toggleFavoriteIptvChannel(ch)} className="w-12 h-12 bg-red-600/20 text-red-500 border border-red-500/30 rounded-2xl flex items-center justify-center focusable"><Trash2 className="w-5 h-5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="backgrounds" className="space-y-8 animate-in fade-in duration-0">
          <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl">
            <div className="flex justify-between items-center mb-12">
              <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><ImageIcon className="w-12 h-12 text-primary" /> خلفيات النظام السيادية</CardTitle>
              <div className="flex gap-4">
                <input type="file" hidden ref={bgFileRef} accept="image/*" onChange={(e) => handleFileUpload(e, 'bg')} />
                <Button onClick={() => bgFileRef.current?.click()} className="bg-primary text-white rounded-full h-14 px-8 font-black shadow-glow focusable"><Upload className="w-5 h-5 ml-2" /> رفع خلفية جديدة</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {customWallBackgrounds.map((bgUrl, idx) => (
                <div key={idx} className={cn(
                  "relative aspect-video rounded-[3rem] overflow-hidden border-4 cursor-pointer transition-all group shadow-2xl",
                  mapSettings.manuscriptBgUrl === bgUrl ? "border-primary shadow-glow scale-105" : "border-white/5 hover:border-white/20"
                )} onClick={() => updateMapSettings({ manuscriptBgUrl: bgUrl })}>
                  <img src={bgUrl} className="w-full h-full object-cover" alt="" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white font-black text-lg uppercase tracking-widest">تعيين كخلفية</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeCustomWallBackground(bgUrl); }}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focusable"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  {mapSettings.manuscriptBgUrl === bgUrl && (
                    <div className="absolute top-4 left-4 bg-primary text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-glow">النشطة</div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reciters" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl">
             <div className="flex justify-between items-center mb-12">
               <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Mic className="w-12 h-12 text-emerald-500" /> إدارة القراء (حسب الضغطات)</CardTitle>
               <Button onClick={saveRecitersReorder} className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-full h-14 px-8 font-black focusable shadow-glow">حفظ الترتيب السحابي</Button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {favoriteReciters.map(r => (
                  <div key={r.channelid} className="bg-black/60 p-8 rounded-[3rem] border border-white/10 flex flex-col items-center gap-6 relative group shadow-xl transition-none">
                    <div className="relative"><img src={r.image} className="w-24 h-24 rounded-full border-4 border-emerald-500/30 shadow-2xl object-cover" alt="" /><div className="absolute -bottom-2 -right-2 bg-emerald-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg">{r.clickschannel || 0}</div></div>
                    {editingReciterId === r.channelid ? (
                      <div className="flex flex-col gap-3 w-full"><Input value={reciterNameInput} onChange={(e) => setReciterNameInput(e.target.value)} className="h-10 bg-white/10 text-white text-center rounded-xl focusable" /><div className="flex gap-2"><Button onClick={handleSaveReciterName} className="flex-1 bg-emerald-500 text-black rounded-xl h-10 focusable">حفظ</Button><Button onClick={() => setEditingReciterId(null)} className="w-10 h-10 bg-white/10 rounded-xl focusable"><X className="w-4 h-4" /></Button></div></div>
                    ) : (
                      <><span className="text-xl font-black text-white truncate w-full text-center">{r.name}</span><div className="flex gap-2 w-full"><button onClick={() => startEditReciter(r)} className="flex-1 h-12 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center transition-none focusable"><Edit2 className="w-5 h-5 ml-2" /> تحرير</button><button onClick={() => removeReciter(r.channelid)} className="w-12 h-12 bg-red-600/20 text-red-500 rounded-2xl flex items-center justify-center transition-none focusable"><Trash2 className="w-5 h-5" /></button></div></>
                    )}
                  </div>
                ))}
             </div>
           </Card>
        </TabsContent>

        <TabsContent value="buttonmap" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl">
             <CardTitle className="text-4xl font-black text-white flex items-center gap-6 mb-12"><Keyboard className="w-12 h-12 text-primary" /> تسجيل وبرمجة الأزرار</CardTitle>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {Object.entries(keyMappings).map(([ctx, actions]) => (
                  <div key={ctx} className="p-8 bg-black/40 rounded-[3rem] border border-white/10 shadow-xl transition-none">
                     <h3 className="text-2xl font-black text-primary mb-6 uppercase tracking-widest">{ctx} Context</h3>
                     <div className="space-y-4">
                        {Object.entries(actions).map(([act, keys]) => (
                          <div key={act} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 transition-none group hover:bg-white/10">
                             <div className="flex flex-col"><span className="text-sm font-bold text-white/60 uppercase tracking-tighter">{act.replace(/_/g, ' ')}</span><button onClick={() => startRecording(ctx as any, act as any)} className={cn("text-[10px] font-black uppercase mt-1 text-right transition-none", (activeRecordingAction?.act === act && activeRecordingAction?.ctx === ctx) ? "text-red-500 animate-pulse" : "text-accent")}>{(activeRecordingAction?.act === act && activeRecordingAction?.ctx === ctx) ? "جاري التسجيل..." : "تسجيل زر جديد"}</button></div>
                             <div className="flex gap-2">{keys.map(k => (<div key={k} className="px-3 py-1.5 bg-zinc-800 rounded-xl border border-zinc-600 flex items-center gap-3 shadow-lg"><span className="text-xs font-black text-white tabular-nums">{k}</span><button onClick={() => removeSpecificKeyMapping(ctx as any, act as any, k)} className="text-red-500 hover:scale-125 transition-none focusable"><X className="w-3.5 h-3.5" /></button></div>))}</div>
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
