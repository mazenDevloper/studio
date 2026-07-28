"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMediaStore, Reminder, Manuscript, MappingContext, AppAction, ManuscriptWord } from "@/lib/store";
import { 
  Settings, Bell, Trash2, Edit2, Plus, Minus, Palette, Keyboard, Timer, ArrowRightLeft, 
  Loader2, RefreshCw, Mic, X, Type, Zap, Save, Sparkles, Upload, Clock, Youtube, Tv, LayoutGrid, Star, CheckCircle2, Circle, Magnet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * SettingsView v17000.0 - Precision Studio
 * Features: Atomic Word Splitting, Fixed Aspect Studio, and Unified Sync.
 */
export function SettingsView() {
  const { 
    addReminder, removeReminder, reminders, updateReminder,
    mapSettings, updateMapSettings, prayerSettings,
    customManuscripts, addManuscript, updateManuscript, removeManuscript,
    keyMappings, removeSpecificKeyMapping, setKeyMapping,
    customWallBackgrounds, addCustomWallBackground,
    favoriteReciters, removeReciter, updateReciterName, favoriteIptvChannels, toggleFavoriteIptvChannel,
    favoriteChannels, removeChannel, toggleStarChannel,
    fetchPriorityData, syncMasterBin, saveRecitersReorder, saveChannelsReorder, saveIptvReorder,
    customFonts, addCustomFont, saveManuscriptsReorder, setIsRecordingKey
  } = useMediaStore();
  
  const { toast } = useToast();
  const bgInputRef = useRef<HTMLInputElement>(null);
  const fontFileRef = useRef<HTMLInputElement>(null);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'bg' | 'font') => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (res) => {
      const dataUrl = res.target?.result as string;
      if (target === 'bg') { addCustomWallBackground(dataUrl); updateMapSettings({ manuscriptBgUrl: dataUrl }); }
      else if (target === 'font') { const name = file.name.split('.')[0].replace(/\s+/g, '-'); addCustomFont(name, dataUrl); }
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
    setEditingManuscriptId(null); setManuscriptInput(""); setCurrentWords([]); setManuscriptMode('write');
    toast({ title: "تم حفظ المخطوطة السيادية" });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingWord || !canvasRef.current || manuscriptMode !== 'arrange') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setCurrentWords(prev => prev.map(w => w.id === draggingWord.wordId ? { ...w, x, y } : w));
  }, [draggingWord, manuscriptMode]);

  const handleMouseUp = () => setDraggingWord(null);

  const applyMagnetSnap = (wordId: string) => {
    const word = currentWords.find(w => w.id === wordId);
    if (!word) return;
    let closestX = word.x;
    let closestY = word.y;
    let minDistX = 5;
    let minDistY = 5;

    currentWords.forEach(other => {
      if (other.id === wordId) return;
      if (Math.abs(other.x - word.x) < minDistX) closestX = other.x;
      if (Math.abs(other.y - word.y) < minDistY) closestY = other.y;
    });

    setCurrentWords(prev => prev.map(w => w.id === wordId ? { ...w, x: closestX, y: closestY } : w));
  };

  const startRecording = (ctx: MappingContext, act: AppAction) => {
    setIsRecordingKey(true);
    setActiveRecordingAction({ ctx, act });
    (window as any).activeRecordingAction = { ctx, act };
    toast({ title: "وضع التسجيل نشط" });
  };

  const startEditReminder = (r: Reminder) => {
    setEditingReminderId(r.id);
    setNewReminder(r);
  };

  const handleSaveReminder = async () => {
    if (!newReminder.label) return;
    if (editingReminderId) updateReminder(editingReminderId, newReminder);
    else addReminder({ ...newReminder as Reminder, id: Date.now().toString() });
    setEditingReminderId(null);
    setNewReminder({ label: "", color: "text-blue-400", iconType: "bell", startType: 'azan', startReference: 'fajr', startOffset: 0, endType: 'duration', endReference: 'fajr', endOffset: 0, showCountdown: true, showCountup: false, countdownWindow: 15, completed: false, manualStartTime: "00:00", manualEndTime: "00:00", durationMinutes: 30 });
  };

  const handleSaveReciterName = () => {
    if (!editingReciterId || !reciterNameInput) return;
    updateReciterName(editingReciterId, reciterNameInput);
    setEditingReciterId(null);
  };

  return (
    <div className="p-12 space-y-12 max-w-7xl mx-auto pb-40 text-right dir-rtl bg-black min-h-full transition-none">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-6xl font-black text-white tracking-tighter flex items-center gap-6">الإعدادات السيادية <Settings className="w-12 h-12 text-primary" /></h1>
          <p className="text-white/40 font-bold uppercase tracking-[0.6em] text-sm">Unified System Hub v17k</p>
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
          <TabsTrigger value="reciters" className="rounded-full px-8 h-full font-black text-lg data-[state=active]:bg-primary transition-none">القراء</TabsTrigger>
          <TabsTrigger value="buttonmap" className="rounded-full px-8 h-full font-black text-lg data-[state=active]:bg-primary transition-none">الأزرار</TabsTrigger>
        </TabsList>

        <TabsContent value="manuscripts" className="space-y-8 animate-in fade-in duration-0">
          <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-8 relative z-10">
              <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Type className="w-12 h-12 text-primary" />استوديو التجميد الذري v17.0</CardTitle>
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
              className="mb-10 p-24 bg-zinc-900/60 rounded-[4rem] border-4 border-primary/20 relative overflow-hidden flex items-center justify-center aspect-[4/3] w-full max-w-4xl mx-auto shadow-2xl transition-none"
            >
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
                    fontSize: '4vw',
                    textShadow: '0 0 30px rgba(255,255,255,0.4)',
                    transition: 'none'
                  }}
                  className={cn(
                    "select-none whitespace-nowrap leading-none p-4 group/word",
                    manuscriptMode === 'arrange' && "ring-2 ring-accent/30 rounded-[2rem] bg-accent/5 backdrop-blur-sm"
                  )}
                >
                  {word.text}
                  {manuscriptMode === 'arrange' && (
                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover/word:opacity-100 transition-opacity bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/10 z-[200]">
                       <button onClick={(e) => { e.stopPropagation(); setCurrentWords(prev => prev.map(w => w.id === word.id ? { ...w, scale: (w.scale || 1.0) + 0.1 } : w)); }} className="w-8 h-8 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg focusable"><Plus className="w-4 h-4" /></button>
                       <button onClick={(e) => { e.stopPropagation(); setCurrentWords(prev => prev.map(w => w.id === word.id ? { ...w, scale: Math.max(0.1, (w.scale || 1.0) - 0.1) } : w)); }} className="w-8 h-8 rounded-full bg-orange-500 text-black flex items-center justify-center shadow-lg focusable"><Minus className="w-4 h-4" /></button>
                       <div className="w-px h-6 bg-white/10 mx-1" />
                       <button onClick={(e) => { e.stopPropagation(); applyMagnetSnap(word.id); }} className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg focusable"><Magnet className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 mt-12">
              <div className="lg:col-span-2 space-y-6 bg-black/40 p-8 rounded-[3rem] border border-white/10">
                <div className="flex gap-4">
                   <Input placeholder="اكتب المخطوطة السيادية هنا..." value={manuscriptInput} onChange={(e) => setManuscriptInput(e.target.value)} className="h-20 bg-white/5 border-none px-8 rounded-2xl text-3xl font-black text-white focusable" />
                   <Select value={selectedFont} onValueChange={setSelectedFont}>
                      <SelectTrigger className="h-20 w-64 bg-white/5 border-none text-xl font-black rounded-2xl focusable"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-950 text-white dir-rtl">
                        <SelectItem value="Amiri">Amiri</SelectItem><SelectItem value="Reem Kufi">Reem Kufi</SelectItem><SelectItem value="Aref Ruqaa">Aref Ruqaa</SelectItem>
                        {customFonts?.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
                      </SelectContent>
                   </Select>
                </div>
              </div>
              <div className="bg-black/40 p-8 rounded-[3rem] border border-white/10 flex flex-col justify-center gap-4">
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
                  <div className="space-y-4">
                    <label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">عنوان التذكير</label>
                    <Input placeholder="أدخل العنوان..." value={newReminder.label} onChange={(e) => setNewReminder({ ...newReminder, label: e.target.value })} className="h-16 bg-white/5 text-white text-2xl font-black rounded-2xl focusable" />
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">اللون المميز</label>
                    <Select value={newReminder.color} onValueChange={(v) => setNewReminder({ ...newReminder, color: v })}>
                      <SelectTrigger className="h-16 bg-white/5 border-none text-xl font-black rounded-2xl focusable"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-950 text-white dir-rtl">
                        <SelectItem value="text-blue-400">أزرق سيادي</SelectItem>
                        <SelectItem value="text-emerald-400">أخضر زمردي</SelectItem>
                        <SelectItem value="text-orange-400">برتقالي ناري</SelectItem>
                        <SelectItem value="text-purple-400">بنفسجي ملكي</SelectItem>
                        <SelectItem value="text-red-500">أحمر تحذيري</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-4">
                    <label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">وقت البداية</label>
                    <Select value={newReminder.startType} onValueChange={(v: any) => setNewReminder({ ...newReminder, startType: v })}>
                      <SelectTrigger className="h-16 bg-white/5 border-none text-xl font-black rounded-2xl focusable"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-950 text-white dir-rtl">
                        <SelectItem value="azan">مرتبط بالأذان</SelectItem>
                        <SelectItem value="iqamah">مرتبط بالإقامة</SelectItem>
                        <SelectItem value="manual">وقت يدوي</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(newReminder.startType === 'azan' || newReminder.startType === 'iqamah') && (
                    <div className="space-y-4">
                      <label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">الصلاة المرجعية</label>
                      <Select value={newReminder.startReference} onValueChange={(v) => setNewReminder({ ...newReminder, startReference: v })}>
                        <SelectTrigger className="h-16 bg-white/5 border-none text-xl font-black rounded-2xl focusable"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-950 text-white dir-rtl">
                          {prayerSettings.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {newReminder.startType === 'manual' && (
                    <div className="space-y-4">
                      <label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">توقيت محدد</label>
                      <Input type="time" value={newReminder.manualStartTime} onChange={(e) => setNewReminder({ ...newReminder, manualStartTime: e.target.value })} className="h-16 bg-white/5 text-white text-xl font-black rounded-2xl focusable" />
                    </div>
                  )}
                  <div className="space-y-4">
                    <label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">إزاحة البداية (دقائق)</label>
                    <Input type="number" value={newReminder.startOffset} onChange={(e) => setNewReminder({ ...newReminder, startOffset: parseInt(e.target.value) || 0 })} className="h-16 bg-white/5 text-white text-xl font-black rounded-2xl focusable" />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-4">
                    <label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">وقت الانتهاء</label>
                    <Select value={newReminder.endType} onValueChange={(v: any) => setNewReminder({ ...newReminder, endType: v })}>
                      <SelectTrigger className="h-16 bg-white/5 border-none text-xl font-black rounded-2xl focusable"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-zinc-950 text-white dir-rtl">
                        <SelectItem value="duration">مدة محددة</SelectItem>
                        <SelectItem value="azan">مرتبط بالأذان</SelectItem>
                        <SelectItem value="iqamah">مرتبط بالإقامة</SelectItem>
                        <SelectItem value="manual">وقت يدوي</SelectItem>
                        <SelectItem value="prayer">للصلاة التالية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newReminder.endType === 'duration' ? (
                    <div className="space-y-4">
                      <label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">المدة (دقائق)</label>
                      <Input type="number" value={newReminder.durationMinutes} onChange={(e) => setNewReminder({ ...newReminder, durationMinutes: parseInt(e.target.value) || 30 })} className="h-16 bg-white/5 text-white text-xl font-black rounded-2xl focusable" />
                    </div>
                  ) : newReminder.endType === 'manual' ? (
                    <div className="space-y-4">
                      <label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">توقيت الانتهاء</label>
                      <Input type="time" value={newReminder.manualEndTime} onChange={(e) => setNewReminder({ ...newReminder, manualEndTime: e.target.value })} className="h-16 bg-white/5 text-white text-xl font-black rounded-2xl focusable" />
                    </div>
                  ) : (newReminder.endType === 'azan' || newReminder.endType === 'iqamah' || newReminder.endType === 'prayer') && (
                    <div className="space-y-4">
                      <label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">صلاة الانتهاء</label>
                      <Select value={newReminder.endReference} onValueChange={(v) => setNewReminder({ ...newReminder, endReference: v })}>
                        <SelectTrigger className="h-16 bg-white/5 border-none text-xl font-black rounded-2xl focusable"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-950 text-white dir-rtl">
                          {prayerSettings.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-4">
                    <label className="text-xs font-black text-white/40 uppercase tracking-widest mr-4">إزاحة الانتهاء (دقائق)</label>
                    <Input type="number" value={newReminder.endOffset} onChange={(e) => setNewReminder({ ...newReminder, endOffset: parseInt(e.target.value) || 0 })} className="h-16 bg-white/5 text-white text-xl font-black rounded-2xl focusable" />
                  </div>
               </div>

               <Button onClick={handleSaveReminder} className="h-20 w-full bg-primary rounded-[2rem] text-2xl font-black shadow-glow focusable">
                 {editingReminderId ? "تحديث التذكير السيادي" : "حفظ التذكير السيادي الجديد"}
               </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {reminders.map(r => (
                 <div key={r.id} className="bg-black/40 p-8 rounded-[3rem] border border-white/10 flex items-center justify-between group shadow-xl transition-none">
                    <div className="flex items-center gap-5">
                       <div className={cn("w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center", r.color)}>
                         {r.iconType === 'bell' ? <Bell className="w-6 h-6" /> : <Timer className="w-6 h-6" />}
                       </div>
                       <div className="flex flex-col">
                         <span className={cn("text-2xl font-black", r.color)}>{r.label}</span>
                         <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{r.startType} ref: {r.startReference} → {r.endType}</span>
                       </div>
                    </div>
                    <div className="flex gap-3">
                       <Button onClick={() => startEditReminder(r)} variant="ghost" className="w-12 h-12 rounded-full text-emerald-400 hover:bg-emerald-400/10 focusable transition-none"><Edit2 className="w-5 h-5 ml-2" /> تحرير</Button>
                       <Button onClick={() => removeReminder(r.id)} variant="ghost" className="w-12 h-12 rounded-full text-red-500 hover:bg-red-500/10 focusable transition-none"><Trash2 className="w-5 h-5" /></Button>
                    </div>
                 </div>
               ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl">
             <div className="flex justify-between items-center mb-12">
               <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Youtube className="w-12 h-12 text-red-600" /> إدارة الاشتراكات</CardTitle>
               <Button onClick={saveChannelsReorder} className="bg-primary text-white rounded-full h-14 px-8 font-black focusable shadow-glow">حفظ الترتيب السحابي</Button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {favoriteChannels.map(ch => (
                  <div key={ch.channelid} className="bg-black/60 p-8 rounded-[3rem] border border-white/10 flex flex-col items-center gap-6 relative group shadow-xl transition-none">
                    <div className="relative">
                      <img src={ch.image} className="w-28 h-24 rounded-full border-4 border-white/10 shadow-2xl object-cover" alt="" />
                      <button 
                        onClick={() => toggleStarChannel(ch.channelid)}
                        className={cn("absolute -top-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-none focusable shadow-lg", ch.starred ? "bg-yellow-500 text-black border-yellow-400" : "bg-black/60 text-white/40 border-white/10")}
                      >
                        <Star className={cn("w-5 h-5", ch.starred && "fill-current")} />
                      </button>
                    </div>
                    <span className="text-xl font-black text-white truncate w-full text-center">{ch.name}</span>
                    <button onClick={() => removeChannel(ch.channelid)} className="w-full h-12 bg-red-600/20 text-red-500 rounded-2xl flex items-center justify-center transition-none hover:bg-red-600/40 focusable"><Trash2 className="w-5 h-5" /></button>
                  </div>
                ))}
             </div>
           </Card>
        </TabsContent>

        <TabsContent value="iptv" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl">
             <div className="flex justify-between items-center mb-12">
               <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Tv className="w-12 h-12 text-emerald-500" /> قنوات IPTV المفضلة</CardTitle>
               <Button onClick={saveIptvReorder} className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-full h-14 px-8 font-black focusable shadow-glow">حفظ الترتيب السحابي</Button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {favoriteIptvChannels.map(ch => (
                  <div key={ch.stream_id} className="bg-black/60 p-8 rounded-[3rem] border border-white/10 flex flex-col items-center gap-6 relative group shadow-xl transition-none">
                    <img src={ch.stream_icon} className="w-24 h-24 rounded-2xl border-4 border-white/10 shadow-2xl object-cover" alt="" />
                    <span className="text-xl font-black text-white truncate w-full text-center">{ch.name}</span>
                    <Button onClick={() => toggleFavoriteIptvChannel(ch)} className="w-full h-12 bg-red-600/20 text-red-500 border border-red-600/20 rounded-2xl transition-none focusable"><Trash2 className="w-5 h-5 ml-2" /> حذف من المفضلة</Button>
                  </div>
                ))}
             </div>
           </Card>
        </TabsContent>

        <TabsContent value="reciters" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl">
             <div className="flex justify-between items-center mb-12">
               <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Mic className="w-12 h-12 text-emerald-500" /> إدارة القراء والمبتهلين</CardTitle>
               <Button onClick={saveRecitersReorder} className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-full h-14 px-8 font-black focusable shadow-glow">حفظ الترتيب السحابي</Button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {favoriteReciters.map(r => (
                  <div key={r.channelid} className="bg-black/60 p-8 rounded-[3rem] border border-white/10 flex flex-col items-center gap-6 relative group shadow-xl transition-none">
                    <img src={r.image} className="w-24 h-24 rounded-full border-4 border-emerald-500/30 shadow-2xl object-cover" alt="" />
                    {editingReciterId === r.channelid ? (
                      <div className="flex flex-col gap-3 w-full">
                        <Input value={reciterNameInput} onChange={(e) => setReciterNameInput(e.target.value)} className="h-10 bg-white/10 text-white text-center rounded-xl focusable" />
                        <div className="flex gap-2">
                           <Button onClick={handleSaveReciterName} className="flex-1 bg-emerald-500 text-black rounded-xl h-10 focusable">حفظ</Button>
                           <Button onClick={() => setEditingReciterId(null)} className="w-10 h-10 bg-white/10 rounded-xl focusable"><X className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="text-xl font-black text-white truncate w-full text-center">{r.name}</span>
                        <div className="flex gap-2 w-full">
                           <button onClick={() => startEditReciter(r)} className="flex-1 h-12 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center transition-none focusable"><Edit2 className="w-5 h-5" /></button>
                           <button onClick={() => removeReciter(r.channelid)} className="w-12 h-12 bg-red-600/20 text-red-500 rounded-2xl flex items-center justify-center transition-none focusable"><Trash2 className="w-5 h-5" /></button>
                        </div>
                      </>
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
                             <div className="flex flex-col">
                               <span className="text-sm font-bold text-white/60 uppercase tracking-tighter">{act.replace(/_/g, ' ')}</span>
                               <button 
                                 onClick={() => startRecording(ctx as any, act as any)} 
                                 className={cn("text-[10px] font-black uppercase mt-1 text-right transition-none", (activeRecordingAction?.act === act && activeRecordingAction?.ctx === ctx) ? "text-red-500 animate-pulse" : "text-accent")}
                               >
                                 {(activeRecordingAction?.act === act && activeRecordingAction?.ctx === ctx) ? "جاري التسجيل..." : "تسجيل زر جديد"}
                               </button>
                             </div>
                             <div className="flex gap-2">
                                {keys.map(k => (
                                  <div key={k} className="px-3 py-1.5 bg-zinc-800 rounded-xl border border-zinc-600 flex items-center gap-3 shadow-lg">
                                     <span className="text-xs font-black text-white tabular-nums">{k}</span>
                                     <button onClick={() => removeSpecificKeyMapping(ctx as any, act as any, k)} className="text-red-500 hover:scale-125 transition-none focusable"><X className="w-3.5 h-3.5" /></button>
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
      </Tabs>
    </div>
  );
}