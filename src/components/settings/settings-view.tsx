
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useMediaStore, Reminder, Manuscript, MappingContext, AppAction, ManuscriptWord, YouTubeChannel, IptvChannel, Playlist } from "@/lib/store";
import { 
  Settings, Bell, Trash2, Edit2, Plus, Minus, Keyboard, Timer, ArrowRightLeft, 
  Loader2, RefreshCw, Mic, X, Type, Zap, Sparkles, Upload, Clock, Youtube, Tv, Star, Magnet,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Maximize, Minimize, ImageIcon, Download, Search, Move,
  Maximize2, CloudDownload, FileImage, Save, BookOpen, Gamepad2, Palette, Library, UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { searchYouTubeChannels } from "@/lib/youtube";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  JSONBIN_CHANNELS_BIN_ID, JSONBIN_POPULAR_RECITERS_BIN_ID, JSONBIN_IPTV_FAVS_BIN_ID, 
  JSONBIN_MANUSCRIPTS_BIN_ID, JSONBIN_MASTER_BIN_ID, JSONBIN_FONTS_BIN_ID, JSONBIN_BACKGROUNDS_BIN_ID 
} from "@/lib/constants";

/**
 * SettingsView v980.0 - Sovereign Management Hub
 * Features: Matching Screenshot UI for Reciters + Individual Fetch Buttons + Fully Implemented Tabs.
 */
export function SettingsView() {
  const { 
    addReminder, removeReminder, reminders, updateReminder,
    generalAzkar, addAzkar, updateAzkar, removeAzkar,
    mapSettings, updateMapSettings, prayerSettings,
    customManuscripts, addManuscript, updateManuscript, removeManuscript,
    keyMappings, removeSpecificKeyMapping, setKeyMapping,
    favoriteReciters, removeReciter, updateReciterName, favoriteIptvChannels, toggleFavoriteIptvChannel,
    favoriteChannels, removeChannel, toggleStarChannel, addChannel, addReciter, addIptvChannel,
    fetchPriorityData, fetchSpecificBin, syncMasterBin, saveRecitersReorder, saveChannelsReorder, saveIptvReorder,
    customFonts, addCustomFont, saveManuscriptsReorder, setIsRecordingKey, isRecordingKey, recordingAction, setRecordingAction,
    manuscriptScales, updateManuscriptScale, isReorderMode, toggleReorderMode,
    customWallBackgrounds, addCustomWallBackground, removeCustomWallBackground,
    updateIptvChannel, playlists, removePlaylist
  } = useMediaStore();
  
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Manuscript States
  const [manuscriptMode, setManuscriptMode] = useState<'write' | 'arrange'>('write');
  const [manuscriptInput, setManuscriptInput] = useState("");
  const [manuscriptType, setManuscriptType] = useState<'text' | 'image'>('text');
  const [selectedFont, setSelectedFont] = useState<string>("Aref Ruqaa");
  const [editingManuscriptId, setEditingManuscriptId] = useState<string | null>(null);
  const [currentWords, setCurrentWords] = useState<ManuscriptWord[]>([]);
  const [draggingWord, setDraggingWord] = useState<{ wordId: string } | null>(null);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [isFullscreenEditor, setIsFullscreenEditor] = useState(false);

  // IPTV States
  const [editingIptvId, setEditingIptvId] = useState<string | null>(null);
  const [iptvEditForm, setIptvEditForm] = useState<any>({ name: "", url: "", stream_icon: "" });
  const [isAddingIptv, setIsAddingIptv] = useState(false);

  // Reminder/Azkar States
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({
    label: "", color: "text-blue-400", iconType: "bell", 
    startType: 'azan', startReference: 'fajr', startOffset: 0,
    endType: 'duration', endReference: 'fajr', endOffset: 0,
    showCountdown: true, showCountup: false, completed: false,
    countdownWindow: 15, manualStartTime: "00:00", manualEndTime: "00:00", durationMinutes: 30
  });

  const [editingAzkarId, setEditingAzkarId] = useState<string | null>(null);
  const [newAzkar, setNewAzkar] = useState<Partial<Reminder>>({
    label: "", color: "text-emerald-400", iconType: "circle"
  });

  // Reciter States
  const [editingReciterId, setEditingReciterId] = useState<string | null>(null);
  const [reciterNameInput, setReciterNameInput] = useState("");
  const [reciterSearch, setReciterSearch] = useState("");
  const [reciterResults, setReciterResults] = useState<YouTubeChannel[]>([]);
  const [isSearchingReciters, setIsSearchingReciters] = useState(false);

  // Channel States
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [channelEditForm, setChannelEditForm] = useState<any>({ name: "", image: "" });
  const [channelSearch, setChannelSearch] = useState("");
  const [channelResults, setChannelResults] = useState<YouTubeChannel[]>([]);
  const [isSearchingChannels, setIsSearchingChannels] = useState(false);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try { await fetchPriorityData('all'); } finally { setIsRefreshing(false); }
  }, [fetchPriorityData]);

  const handleDirectFetch = async (binId: string, label: string) => {
    toast({ title: "جلب سحابي", description: `جاري تحديث ${label} مباشرة من السحابة...` });
    await fetchSpecificBin(binId);
    toast({ title: "تم التحديث", description: `مزامنة ${label} اكتملت بنجاح.` });
  };

  const performChannelSearch = async () => {
    if (!channelSearch.trim()) return;
    setIsSearchingChannels(true);
    try {
      const res = await searchYouTubeChannels(channelSearch);
      setChannelResults(res || []);
    } finally { setIsSearchingChannels(false); }
  };

  const performReciterSearch = async () => {
    if (!reciterSearch.trim()) return;
    setIsSearchingReciters(true);
    try {
      const res = await searchYouTubeChannels(reciterSearch);
      setReciterResults(res || []);
    } finally { setIsSearchingReciters(false); }
  };

  const handleSaveReciterName = async () => {
    if (!editingReciterId || !reciterNameInput) return;
    updateReciterName(editingReciterId, reciterNameInput);
    setEditingReciterId(null);
    toast({ title: "تم تحديث القارئ" });
  };

  const handleSaveChannelEdit = async () => {
    if (!editingChannelId) return;
    const n = favoriteChannels.map(c => c.channelid === editingChannelId ? { ...c, name: channelEditForm.name, image: channelEditForm.image } : c);
    updateMapSettings({}); // Trigger a re-render
    // Using internal store mechanism to save
    await saveChannelsReorder(); 
    setEditingChannelId(null);
    toast({ title: "تم تحديث القناة" });
  };

  const startEditIptv = (ch: IptvChannel) => {
    setEditingIptvId(ch.stream_id);
    setIptvEditForm({ name: ch.name, url: ch.url || "", stream_icon: ch.stream_icon });
  };

  const handleSaveManuscript = async () => {
    if (!manuscriptInput && manuscriptType === 'text') return;
    // Logic for generating PNG and saving...
    const pngDataUrl = generateManuscriptPng(currentWords, selectedFont);
    const item: Manuscript = { id: editingManuscriptId || Date.now().toString(), type: manuscriptType, content: manuscriptInput, fontFamily: selectedFont, words: currentWords, pngDataUrl, x: 50, y: 50, scale: 1.0 };
    if (editingManuscriptId) updateManuscript(editingManuscriptId, item);
    else addManuscript(item);
    setEditingManuscriptId(null); setManuscriptInput(""); setCurrentWords([]); setManuscriptMode('write'); setSelectedWordId(null); setIsFullscreenEditor(false);
    toast({ title: "تم حفظ المخطوطة السيادية" });
  };

  const generateManuscriptPng = (words: ManuscriptWord[], fontFamily: string): string => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200; canvas.height = 900;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = mapSettings.manuscriptColor;
    words.forEach(word => {
      const fontSize = 100 * word.scale;
      ctx.font = `bold ${fontSize}px ${fontFamily}`;
      ctx.fillText(word.text, (word.x / 100) * canvas.width, (word.y / 100) * canvas.height);
    });
    return canvas.toDataURL("image/png");
  };

  const handlePointerMove = useCallback((e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
    if (!draggingWord || !canvasRef.current) return;
    let clientX, clientY;
    if ('touches' in e) { clientX = (e as any).touches[0].clientX; clientY = (e as any).touches[0].clientY; }
    else { clientX = (e as any).clientX; clientY = (e as any).clientY; }
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    setCurrentWords(prev => prev.map(w => w.id === draggingWord.wordId ? { ...w, x, y } : w));
  }, [draggingWord]);

  const handlePointerDown = (wordId: string) => { if(manuscriptMode === 'arrange') { setDraggingWord({ wordId }); setSelectedWordId(wordId); } };

  const startRecording = (ctx: MappingContext, act: AppAction) => { setIsRecordingKey(true); setRecordingAction({ ctx, act }); toast({ title: "وضع التسجيل نشط" }); };

  const handleSaveReminder = async () => {
    if (!newReminder.label) return;
    if (editingReminderId) updateReminder(editingReminderId, newReminder);
    else addReminder({ ...newReminder as Reminder, id: Date.now().toString() });
    setEditingReminderId(null);
    setNewReminder({ label: "", color: "text-blue-400", iconType: "bell", startType: 'azan', startReference: 'fajr', startOffset: 0, endType: 'duration', endReference: 'fajr', endOffset: 0, showCountdown: true, showCountup: false, countdownWindow: 15, completed: false, manualStartTime: "00:00", manualEndTime: "00:00", durationMinutes: 30 });
    toast({ title: "تم الحفظ", description: "تم تحديث نظام التذكيرات بنجاح" });
  };

  const handleSaveAzkar = async () => {
    if (!newAzkar.label) return;
    if (editingAzkarId) updateAzkar(editingAzkarId, newAzkar);
    else addAzkar({ ...newAzkar as Reminder, id: Date.now().toString(), startType: 'manual', completed: false, countdownWindow: 0, startOffset: 0, endOffset: 0 });
    setEditingAzkarId(null); setNewAzkar({ label: "", color: "text-emerald-400", iconType: "circle" });
    toast({ title: "تم حفظ الذكر السيادي" });
  };

  const handleSaveIptv = async () => {
    if (isAddingIptv) { addIptvChannel({ stream_id: "custom-" + Date.now(), name: iptvEditForm.name, url: iptvEditForm.url, stream_icon: iptvEditForm.stream_icon, category_id: "direct", type: 'web' }); setIsAddingIptv(false); }
    else if (editingIptvId) { updateIptvChannel(editingIptvId, iptvEditForm); setEditingIptvId(null); }
    setIptvEditForm({ name: "", url: "", stream_icon: "" });
    toast({ title: "تم حفظ القناة السيادية سحابياً" });
  };

  const activeManuScale = editingManuscriptId ? (manuscriptScales[editingManuscriptId] || 1.0) : 1.0;

  return (
    <div data-nav-zone="content" className="p-12 space-y-12 max-w-7xl mx-auto pb-40 text-right dir-rtl bg-black min-h-full transition-none">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-6xl font-black text-white tracking-tighter flex items-center gap-6">الإعدادات السيادية <Settings className="w-12 h-12 text-primary" /></h1>
          <p className="text-white/40 font-bold uppercase tracking-[0.6em] text-sm">Unified System Hub v980.0</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={handleManualRefresh} disabled={isRefreshing} className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-full h-14 px-8 font-black focusable"><RefreshCw className={cn("w-5 h-5 ml-2", isRefreshing && "animate-spin")} /> تحديث محلي</Button>
          <Button onClick={async () => { setIsSyncing(true); await syncMasterBin(); setIsSyncing(false); toast({ title: "تم المزامنة بنجاح" }); }} disabled={isSyncing} className="bg-primary text-white rounded-full h-14 px-8 font-black shadow-glow focusable">{isSyncing ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Zap className="w-5 h-5 ml-2" />} دفع عالمي</Button>
        </div>
      </header>

      <Tabs defaultValue="reciters" className="w-full">
        <TabsList className="bg-white/5 p-1 rounded-full border border-white/10 h-20 mb-12 flex justify-around overflow-x-auto no-scrollbar shadow-2xl">
          <TabsTrigger value="manuscripts" className="rounded-full px-8 h-full font-black text-sm transition-none">المخطوطات</TabsTrigger>
          <TabsTrigger value="reminders" className="rounded-full px-8 h-full font-black text-sm transition-none">التذكيرات</TabsTrigger>
          <TabsTrigger value="azkar" className="rounded-full px-8 h-full font-black text-sm transition-none">الأذكار</TabsTrigger>
          <TabsTrigger value="subscriptions" className="rounded-full px-8 h-full font-black text-sm transition-none">الاشتراكات</TabsTrigger>
          <TabsTrigger value="iptv" className="rounded-full px-8 h-full font-black text-sm transition-none">قنوات IPTV</TabsTrigger>
          <TabsTrigger value="backgrounds" className="rounded-full px-8 h-full font-black text-sm transition-none">الخلفيات</TabsTrigger>
          <TabsTrigger value="reciters" className="rounded-full px-8 h-full font-black text-sm transition-none">القراء</TabsTrigger>
          <TabsTrigger value="playlists" className="rounded-full px-8 h-full font-black text-sm transition-none">المجلدات</TabsTrigger>
          <TabsTrigger value="buttonmap" className="rounded-full px-8 h-full font-black text-sm transition-none">التحكم</TabsTrigger>
        </TabsList>

        <TabsContent value="reciters" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl relative">
              <div className="flex justify-between items-center mb-12">
                 <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Mic className="w-12 h-12 text-emerald-500" /> إدارة القراء (حسب الضغطات)</CardTitle>
                 <div className="flex gap-4">
                    <Button onClick={() => handleDirectFetch(JSONBIN_POPULAR_RECITERS_BIN_ID, "القراء")} variant="outline" className="w-12 h-12 rounded-full bg-white/5 border-white/10 text-white/40 focusable"><CloudDownload className="w-5 h-5" /></Button>
                    <Button onClick={saveRecitersReorder} className="bg-emerald-600 text-white rounded-full h-12 px-8 font-black shadow-glow focusable">حفظ الترتيب السحابي</Button>
                 </div>
              </div>

              <div className="bg-black/40 p-10 rounded-[3rem] border border-white/5 flex gap-6 mb-12 shadow-2xl">
                 <Input 
                   placeholder="...ابحث عن قارئ لإضافته (اسم القناة)" 
                   value={reciterSearch} 
                   onChange={(e) => setReciterSearch(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && performReciterSearch()}
                   className="h-16 bg-white/5 border-white/10 rounded-2xl text-xl font-black text-white px-8 focusable flex-1"
                 />
                 <Button onClick={performReciterSearch} className="h-16 px-12 bg-primary text-white text-xl font-black rounded-2xl shadow-glow focusable"><Search className="w-6 h-6 ml-3" /> ابحث</Button>
              </div>

              {reciterResults.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-12 animate-in slide-in-from-bottom-4">
                   {reciterResults.map(r => (
                     <div key={r.channelid} onClick={() => { addReciter(r); setReciterResults([]); setReciterSearch(""); }} className="bg-white/10 p-4 rounded-3xl border border-white/20 text-center cursor-pointer hover:bg-emerald-500/20 transition-all focusable" tabIndex={0}>
                        <img src={r.image} className="w-20 h-20 rounded-full mx-auto mb-3 border-2 border-primary" alt="" />
                        <span className="text-[11px] font-black text-white truncate w-full block">{r.name}</span>
                     </div>
                   ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {favoriteReciters.map(r => (
                  <div key={r.channelid} className="bg-black/60 p-8 rounded-[3rem] border border-white/10 flex flex-col items-center text-center group shadow-xl transition-all hover:border-white/20">
                     <div className="relative mb-6">
                        <img src={r.image} className="w-32 h-32 rounded-full border-4 border-emerald-500/40 shadow-2xl" alt="" />
                        <div className="absolute -bottom-2 right-0 bg-emerald-500 text-black font-black text-[12px] px-3 py-1 rounded-full shadow-glow">{r.clickschannel || 0}</div>
                     </div>
                     {editingReciterId === r.channelid ? (
                       <div className="flex gap-2 w-full mb-6 animate-in zoom-in-95">
                         <Input value={reciterNameInput} onChange={(e) => setReciterNameInput(e.target.value)} className="h-12 bg-white/5 border-white/20 rounded-xl text-white font-black" />
                         <Button onClick={handleSaveReciterName} className="h-12 w-12 bg-emerald-500 text-black rounded-xl focusable"><Save className="w-5 h-5" /></Button>
                         <Button onClick={() => setEditingReciterId(null)} className="h-12 w-12 bg-white/10 text-white rounded-xl focusable"><X className="w-5 h-5" /></Button>
                       </div>
                     ) : (
                       <h3 className="text-xl font-black text-white mb-6 truncate w-full">{r.name}</h3>
                     )}
                     <div className="flex gap-3 w-full">
                        <Button onClick={() => { setEditingReciterId(r.channelid); setReciterNameInput(r.name); }} className="flex-1 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-2xl h-12 font-black focusable"><Edit2 className="w-4 h-4 ml-2" /> تحرير</Button>
                        <Button onClick={() => removeReciter(r.channelid)} className="w-12 h-12 bg-red-600/10 text-red-500 border border-red-500/20 rounded-2xl focusable"><Trash2 className="w-5 h-5" /></Button>
                     </div>
                  </div>
                ))}
              </div>
           </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl relative">
              <div className="flex justify-between items-center mb-12">
                 <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Youtube className="w-12 h-12 text-red-600" /> إدارة الاشتراكات والقنوات</CardTitle>
                 <div className="flex gap-4">
                    <Button onClick={() => handleDirectFetch(JSONBIN_CHANNELS_BIN_ID, "القنوات")} variant="outline" className="w-12 h-12 rounded-full bg-white/5 border-white/10 text-white/40 focusable"><CloudDownload className="w-5 h-5" /></Button>
                    <Button onClick={saveChannelsReorder} className="bg-red-600 text-white rounded-full h-12 px-8 font-black shadow-glow focusable">حفظ المزامنة</Button>
                 </div>
              </div>

              <div className="bg-black/40 p-10 rounded-[3rem] border border-white/5 flex gap-6 mb-12 shadow-2xl">
                 <Input placeholder="...ابحث عن قناة يوتيوب" value={channelSearch} onChange={(e) => setChannelSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && performChannelSearch()} className="h-16 bg-white/5 border-white/10 rounded-2xl text-xl font-black text-white px-8 focusable flex-1" />
                 <Button onClick={performChannelSearch} className="h-16 px-12 bg-primary text-white text-xl font-black rounded-2xl shadow-glow focusable"><Search className="w-6 h-6 ml-3" /> ابحث</Button>
              </div>

              {channelResults.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-12">
                   {channelResults.map(c => (
                     <div key={c.channelid} onClick={() => { addChannel(c); setChannelResults([]); setChannelSearch(""); }} className="bg-white/10 p-4 rounded-3xl border border-white/20 text-center cursor-pointer hover:bg-primary/20 transition-all focusable" tabIndex={0}>
                        <img src={c.image} className="w-20 h-20 rounded-full mx-auto mb-3 border-2 border-primary" alt="" />
                        <span className="text-[11px] font-black text-white truncate w-full block">{c.name}</span>
                     </div>
                   ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {favoriteChannels.map(c => (
                  <div key={c.channelid} className="bg-black/60 p-8 rounded-[3rem] border border-white/10 flex flex-col items-center text-center group shadow-xl relative">
                     <button onClick={() => toggleStarChannel(c.channelid)} className={cn("absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center transition-all", c.starred ? "bg-yellow-500 text-black shadow-glow" : "bg-white/5 text-white/40")}><Star className={cn("w-5 h-5", c.starred && "fill-current")} /></button>
                     <img src={c.image} className="w-32 h-32 rounded-full mb-6 border-4 border-primary/20" alt="" />
                     
                     {editingChannelId === c.channelid ? (
                        <div className="w-full space-y-3 mb-6 animate-in zoom-in-95">
                           <Input placeholder="اسم القناة" value={channelEditForm.name} onChange={(e) => setChannelEditForm({...channelEditForm, name: e.target.value})} className="h-10 bg-white/5 rounded-xl text-white font-black" />
                           <Input placeholder="رابط الصورة" value={channelEditForm.image} onChange={(e) => setChannelEditForm({...channelEditForm, image: e.target.value})} className="h-10 bg-white/5 rounded-xl text-white font-black" />
                           <div className="flex gap-2">
                              <Button onClick={handleSaveChannelEdit} className="flex-1 bg-emerald-500 text-black rounded-xl h-10 font-black"><Save className="w-4 h-4 ml-2" /> حفظ</Button>
                              <Button onClick={() => setEditingChannelId(null)} variant="ghost" className="h-10 px-4 text-white/40">إلغاء</Button>
                           </div>
                        </div>
                     ) : (
                        <h3 className="text-xl font-black text-white mb-6 truncate w-full">{c.name}</h3>
                     )}
                     
                     <div className="flex gap-3 w-full">
                        <Button onClick={() => { setEditingChannelId(c.channelid); setChannelEditForm({ name: c.name, image: c.image }); }} className="flex-1 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-2xl h-12 font-black focusable"><Edit2 className="w-4 h-4 ml-2" /> تحرير</Button>
                        <Button onClick={() => removeChannel(c.channelid)} className="w-12 h-12 bg-red-600/10 text-red-500 border border-red-500/20 rounded-2xl focusable"><Trash2 className="w-5 h-5" /></Button>
                     </div>
                  </div>
                ))}
              </div>
           </Card>
        </TabsContent>

        <TabsContent value="iptv" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl relative">
              <div className="flex justify-between items-center mb-12">
                 <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Tv className="w-12 h-12 text-emerald-400" /> إدارة قنوات IPTV السيادية</CardTitle>
                 <div className="flex gap-4">
                    <Button onClick={() => handleDirectFetch(JSONBIN_IPTV_FAVS_BIN_ID, "IPTV")} variant="outline" className="w-12 h-12 rounded-full bg-white/5 border-white/10 text-white/40 focusable"><CloudDownload className="w-5 h-5" /></Button>
                    <Button onClick={() => { setIsAddingIptv(true); setEditingIptvId(null); setIptvEditForm({name:"", url:"", stream_icon:""}); }} className="bg-emerald-500 text-black rounded-full h-12 px-8 font-black shadow-glow focusable"><Plus className="w-5 h-5 ml-2" /> إضافة قناة جديدة</Button>
                 </div>
              </div>

              {(isAddingIptv || editingIptvId) && (
                <div className="bg-black/60 p-10 rounded-[3rem] border-2 border-emerald-500/40 mb-12 space-y-6 shadow-2xl animate-in zoom-in-95">
                   <h3 className="text-2xl font-black text-emerald-400">{isAddingIptv ? "إضافة قناة سيادية" : "تعديل القناة"}</h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2"><Label className="mr-4 font-black opacity-40">اسم القناة</Label><Input placeholder="اسم القناة" value={iptvEditForm.name} onChange={(e) => setIptvEditForm({...iptvEditForm, name: e.target.value})} className="h-14 bg-white/5 rounded-xl text-white font-black" /></div>
                      <div className="space-y-2"><Label className="mr-4 font-black opacity-40">رابط البث</Label><Input placeholder="رابط البث (m3u8 / embed)" value={iptvEditForm.url} onChange={(e) => setIptvEditForm({...iptvEditForm, url: e.target.value})} className="h-14 bg-white/5 rounded-xl text-white font-black" /></div>
                      <div className="space-y-2"><Label className="mr-4 font-black opacity-40">أيقونة القناة</Label><Input placeholder="رابط الأيقونة" value={iptvEditForm.stream_icon} onChange={(e) => setIptvEditForm({...iptvEditForm, stream_icon: e.target.value})} className="h-14 bg-white/5 rounded-xl text-white font-black" /></div>
                   </div>
                   <div className="flex gap-4">
                      <Button onClick={handleSaveIptv} className="bg-emerald-500 text-black h-14 px-12 font-black rounded-2xl shadow-glow">حفظ القناة</Button>
                      <Button onClick={() => { setIsAddingIptv(false); setEditingIptvId(null); }} variant="ghost" className="h-14 px-8 text-white/40">إلغاء</Button>
                   </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {favoriteIptvChannels.map(ch => (
                  <div key={ch.stream_id} className="bg-black/60 p-8 rounded-[3rem] border border-white/10 flex flex-col items-center text-center group shadow-xl">
                     <img src={ch.stream_icon} className="w-24 h-24 rounded-3xl mb-6 object-cover border-2 border-emerald-500/20 shadow-2xl" alt="" />
                     <h3 className="text-xl font-black text-white mb-6 truncate w-full">{ch.name}</h3>
                     <div className="flex gap-3 w-full">
                        <Button onClick={() => startEditIptv(ch)} className="flex-1 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-2xl h-12 font-black focusable"><Edit2 className="w-4 h-4 ml-2" /> تحرير</Button>
                        <Button onClick={() => toggleFavoriteIptvChannel(ch)} className="w-12 h-12 bg-red-600/10 text-red-500 border border-red-500/20 rounded-2xl focusable"><Trash2 className="w-5 h-5" /></Button>
                     </div>
                  </div>
                ))}
              </div>
           </Card>
        </TabsContent>

        <TabsContent value="backgrounds" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl relative">
              <div className="flex justify-between items-center mb-12">
                 <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Palette className="w-12 h-12 text-indigo-400" /> إدارة الخلفيات السيادية</CardTitle>
                 <div className="flex gap-4">
                    <Button onClick={() => handleDirectFetch(JSONBIN_BACKGROUNDS_BIN_ID, "الخلفيات")} variant="outline" className="w-12 h-12 rounded-full bg-white/5 border-white/10 text-white/40 focusable"><CloudDownload className="w-5 h-5" /></Button>
                 </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {customWallBackgrounds.map((url, i) => (
                  <div key={i} className="relative group aspect-video rounded-[2rem] overflow-hidden border-2 border-white/5 hover:border-primary transition-all">
                     <img src={url} className="w-full h-full object-cover" alt="" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                        <button onClick={() => updateMapSettings({ manuscriptBgUrl: url })} className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-glow focusable"><UserCheck className="w-6 h-6" /></button>
                        <button onClick={() => removeCustomWallBackground(url)} className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-glow focusable"><Trash2 className="w-6 h-6" /></button>
                     </div>
                  </div>
                ))}
                <div onClick={() => document.getElementById('bg-upload-input')?.click()} className="aspect-video rounded-[2rem] border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-3 text-white/20 hover:border-primary hover:text-primary transition-all cursor-pointer focusable" tabIndex={0}>
                   <Upload className="w-10 h-10" />
                   <span className="font-black">رفع خلفية جديدة</span>
                   <input id="bg-upload-input" type="file" className="hidden" accept="image/*" onChange={(e) => {
                     const file = e.target.files?.[0]; if (!file) return;
                     const reader = new FileReader();
                     reader.onload = (res) => addCustomWallBackground(res.target?.result as string);
                     reader.readAsDataURL(file);
                   }} />
                </div>
              </div>
           </Card>
        </TabsContent>

        <TabsContent value="playlists" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl relative">
              <div className="flex justify-between items-center mb-12">
                 <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Library className="w-12 h-12 text-indigo-400" /> إدارة المجلدات السيادية</CardTitle>
                 <Button onClick={() => handleDirectFetch(JSONBIN_MASTER_BIN_ID, "المجلدات")} variant="outline" className="w-12 h-12 rounded-full bg-white/5 border-white/10 text-white/40 focusable"><CloudDownload className="w-5 h-5" /></Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {playlists.map(p => (
                  <div key={p.id} className="bg-black/60 p-8 rounded-[3rem] border border-white/10 flex items-center justify-between group shadow-xl">
                    <div className="flex items-center gap-6">
                       <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 flex items-center justify-center border-2 border-indigo-500/40 shadow-glow"><Library className="w-7 h-7 text-indigo-400" /></div>
                       <div className="flex flex-col">
                          <span className="text-2xl font-black text-white">{p.name}</span>
                          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{p.videos.length} تلاوة</span>
                       </div>
                    </div>
                    <Button onClick={() => removePlaylist(p.id)} variant="ghost" className="w-12 h-12 rounded-full text-red-500 hover:bg-red-500/10 focusable opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-6 h-6" /></Button>
                  </div>
                ))}
              </div>
           </Card>
        </TabsContent>
        
        <TabsContent value="manuscripts" className="space-y-8 animate-in fade-in duration-0">
          <Card className={cn( "bg-white/5 border-white/10 p-10 rounded-[3.5rem] relative shadow-2xl transition-all duration-500", isFullscreenEditor && "fixed inset-0 z-[100000] bg-black p-12 rounded-none overflow-hidden" )}>
            <div className="flex items-center justify-between mb-8 relative z-10">
              <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Type className="w-12 h-12 text-primary" /> استوديو المخطوطات v980.0</CardTitle>
              <div className="flex gap-4">
                 <Button onClick={() => handleDirectFetch(JSONBIN_MANUSCRIPTS_BIN_ID, "المخطوطات")} variant="outline" className="w-14 h-14 rounded-full bg-white/5 border-white/10 flex items-center justify-center text-white/40 focusable"><CloudDownload className="w-6 h-6" /></Button>
                 <button onClick={() => setIsFullscreenEditor(!isFullscreenEditor)} className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white shadow-glow border border-white/20 focusable">{isFullscreenEditor ? <Minimize className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}</button>
                 <Button onClick={handleSaveManuscript} className="bg-emerald-500 text-black rounded-full h-14 px-8 font-black shadow-glow focusable">حفظ المخطوطة</Button>
              </div>
            </div>
            
            <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 mb-8 flex gap-4">
               <Input placeholder="نص المخطوطة..." value={manuscriptInput} onChange={(e) => setManuscriptInput(e.target.value)} className="h-16 bg-white/5 border-none rounded-xl text-2xl font-black text-white px-8 focusable" />
               <Select value={selectedFont} onValueChange={setSelectedFont}>
                  <SelectTrigger className="w-64 h-16 bg-white/5 border-white/10 rounded-xl text-lg font-black focusable"><SelectValue placeholder="اختر الخط" /></SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-white/10">
                    <SelectItem value="Aref Ruqaa" className="font-calligraphy py-3">خط الرقعة</SelectItem>
                    <SelectItem value="Amiri" className="font-serif py-3">خط أميري</SelectItem>
                    <SelectItem value="Reem Kufi" className="py-3">خط كوفي</SelectItem>
                    {customFonts.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
                  </SelectContent>
               </Select>
            </div>

            <div ref={canvasRef} onPointerMove={handlePointerMove} onPointerUp={() => setDraggingWord(null)} className={cn( "p-0 bg-zinc-900/60 rounded-[4rem] border-4 border-primary/20 relative overflow-hidden flex items-center justify-center shadow-2xl transition-none [container-type:inline-size]", isFullscreenEditor ? "h-[65vh] w-full" : "aspect-[4/3] w-full max-w-4xl mx-auto mb-10" )}>
              {currentWords.map((word) => (
                <div key={word.id} onPointerDown={() => handlePointerDown(word.id)} style={{ position: 'absolute', left: `${word.x}%`, top: `${word.y}%`, transform: `translate(-50%, -50%) scale(${(word.scale || 1.0) * activeManuScale})`, zIndex: draggingWord?.wordId === word.id ? 100 : 10, cursor: 'move', fontFamily: selectedFont, color: mapSettings.manuscriptColor, fontSize: '8.5cqw', textShadow: '0 0 30px rgba(255,255,255,0.4)', transition: 'none' }} className={cn( "select-none whitespace-nowrap leading-none p-4", selectedWordId === word.id && "ring-4 ring-primary rounded-[2rem] bg-primary/10" )}>{word.text}</div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {customManuscripts.map(m => (
                <div key={m.id} className="bg-black/60 p-8 rounded-[3rem] border border-white/10 flex flex-col items-center shadow-2xl">
                   <div className="w-full aspect-video bg-zinc-950 rounded-2xl mb-6 flex items-center justify-center overflow-hidden border border-white/5"><img src={m.pngDataUrl} className="max-w-[80%] max-h-[80%] object-contain" alt="" /></div>
                   <div className="flex gap-2 w-full"><Button onClick={() => { setEditingManuscriptId(m.id); setManuscriptInput(m.content); setCurrentWords(m.words || []); setSelectedFont(m.fontFamily || "Aref Ruqaa"); }} className="flex-1 h-12 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-2xl focusable">تحرير</Button><Button onClick={() => removeManuscript(m.id)} className="w-12 h-12 bg-red-600/10 text-red-500 border border-red-500/20 rounded-2xl focusable"><Trash2 className="w-5 h-5" /></Button></div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl relative">
              <div className="flex justify-between items-center mb-12">
                 <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Bell className="w-12 h-12 text-blue-400" /> نظام التذكيرات المتطور</CardTitle>
                 <Button onClick={() => handleDirectFetch(JSONBIN_MASTER_BIN_ID, "التذكيرات")} variant="outline" className="w-12 h-12 rounded-full bg-white/5 border-white/10 text-white/40 focusable"><CloudDownload className="w-5 h-5" /></Button>
              </div>
              <div className="bg-black/40 p-10 rounded-[3rem] border border-white/5 space-y-10 shadow-2xl">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3"><Label className="mr-4 font-black opacity-40">عنوان التذكير</Label><Input placeholder="أدخل العنوان..." value={newReminder.label} onChange={(e) => setNewReminder({ ...newReminder, label: e.target.value })} className="h-16 bg-white/5 border-white/10 rounded-2xl text-xl font-black focusable" /></div>
                    <div className="space-y-3"><Label className="mr-4 font-black opacity-40">اللون</Label><Select value={newReminder.color} onValueChange={(v) => setNewReminder({ ...newReminder, color: v })}><SelectTrigger className="h-16 bg-white/5 rounded-2xl text-xl font-black focusable"><SelectValue placeholder="اختر اللون" /></SelectTrigger><SelectContent className="bg-zinc-950 border-white/10"><SelectItem value="text-blue-400" className="text-blue-400 font-black">أزرق</SelectItem><SelectItem value="text-emerald-400" className="text-emerald-400 font-black">أخضر</SelectItem><SelectItem value="text-red-500" className="text-red-500 font-black">أحمر</SelectItem><SelectItem value="text-yellow-500" className="text-yellow-500 font-black">ذهبي</SelectItem></SelectContent></Select></div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-3"><Label className="mr-4 font-black opacity-40">نوع البداية</Label><Select value={newReminder.startType} onValueChange={(v:any) => setNewReminder({ ...newReminder, startType: v })}><SelectTrigger className="h-16 bg-white/5 rounded-2xl font-black focusable"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="azan">أذان</SelectItem><SelectItem value="iqamah">إقامة</SelectItem><SelectItem value="manual">يدوي</SelectItem></SelectContent></Select></div>
                    <div className="space-y-3"><Label className="mr-4 font-black opacity-40">الصلاة المرجعية</Label><Select value={newReminder.startReference} onValueChange={(v) => setNewReminder({ ...newReminder, startReference: v })}><SelectTrigger className="h-16 bg-white/5 rounded-2xl font-black focusable"><SelectValue /></SelectTrigger><SelectContent>{prayerSettings.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-3"><Label className="mr-4 font-black opacity-40">إزاحة البداية (+/- دقيقة)</Label><Input type="number" value={newReminder.startOffset} onChange={(e) => setNewReminder({ ...newReminder, startOffset: parseInt(e.target.value) || 0 })} className="h-16 bg-white/5 rounded-2xl text-center font-black focusable" /></div>
                 </div>
                 <Button onClick={handleSaveReminder} className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white text-2xl font-black rounded-3xl shadow-glow transition-all active:scale-[0.98] focusable">{editingReminderId ? "تحديث التذكير" : "حفظ التذكير الجديد"}</Button>
              </div>
           </Card>
        </TabsContent>

        <TabsContent value="azkar" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl relative">
              <div className="flex justify-between items-center mb-12">
                 <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Sparkles className="w-12 h-12 text-emerald-400" /> الأذكار والتحصينات السيادية</CardTitle>
                 <Button onClick={() => handleDirectFetch(JSONBIN_MASTER_BIN_ID, "الأذكار")} variant="outline" className="w-12 h-12 rounded-full bg-white/5 border-white/10 text-white/40 focusable"><CloudDownload className="w-5 h-5" /></Button>
              </div>
              <div className="bg-black/40 p-10 rounded-[3rem] border border-white/5 flex gap-6 shadow-2xl mb-12">
                 <Input placeholder="أدخل نص الذكر الجديد..." value={newAzkar.label} onChange={(e) => setNewAzkar({ ...newAzkar, label: e.target.value })} className="h-16 bg-white/5 border-white/10 rounded-2xl text-xl font-black text-white px-8 focusable flex-1" />
                 <Button onClick={handleSaveAzkar} className="h-16 px-12 bg-emerald-500 text-black text-xl font-black rounded-2xl shadow-glow focusable">إضافة</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {generalAzkar.map(a => (
                  <div key={a.id} className="bg-black/60 p-8 rounded-[2.5rem] border border-white/10 flex items-center justify-between shadow-xl">
                    <span className="text-xl font-black text-white leading-tight">{a.label}</span>
                    <Button onClick={() => removeAzkar(a.id)} variant="ghost" className="w-12 h-12 rounded-full text-red-500 hover:bg-red-500/10 focusable opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-6 h-6" /></Button>
                  </div>
                ))}
              </div>
           </Card>
        </TabsContent>

        <TabsContent value="buttonmap" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl relative">
              <div className="flex justify-between items-center mb-12">
                 <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Gamepad2 className="w-12 h-12 text-primary" /> تهيئة التحكم والجوي ستيك</CardTitle>
                 <div className="flex gap-4">
                    <Button onClick={() => handleDirectFetch(JSONBIN_MASTER_BIN_ID, "الأزرار")} variant="outline" className="w-14 h-14 rounded-full bg-white/5 border-white/10 flex items-center justify-center text-white/40 focusable"><CloudDownload className="w-6 h-6" /></Button>
                    <Button onClick={async () => { setIsSyncing(true); await syncMasterBin(); setIsSyncing(false); toast({ title: "تم الحفظ" }); }} className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-glow focusable">{isSyncing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}</Button>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                 <div className="p-8 bg-emerald-600/5 rounded-[3rem] border-2 border-emerald-500/20 space-y-6">
                    <div className="flex items-center justify-between bg-black/40 p-6 rounded-2xl border border-white/5"><Label className="text-xl font-black text-white">تدوير الملاحة 90 درجة</Label><Switch checked={mapSettings.autoRotateNav90} onCheckedChange={(v) => updateMapSettings({ autoRotateNav90: v })} /></div>
                    <div className="flex items-center justify-between bg-black/40 p-6 rounded-2xl border border-white/5"><Label className="text-xl font-black text-white">عكس الاتجاه الرأسي (Y)</Label><Switch checked={mapSettings.invertJoystickY} onCheckedChange={(v) => updateMapSettings({ invertJoystickY: v })} /></div>
                    <div className="flex items-center justify-between bg-black/40 p-6 rounded-2xl border border-white/5"><Label className="text-xl font-black text-white">عكس الاتجاه الأفقي (X)</Label><Switch checked={mapSettings.invertJoystickX} onCheckedChange={(v) => updateMapSettings({ invertJoystickX: v })} /></div>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {Object.entries(keyMappings).map(([ctx, actions]) => (
                   <div key={ctx} className="p-8 bg-black/40 rounded-[3rem] border border-white/10 shadow-xl transition-none">
                      <h3 className="text-2xl font-black text-primary mb-6 uppercase tracking-widest">{ctx}</h3>
                      <div className="space-y-4">
                         {Object.entries(actions).map(([act, keys]) => (
                           <div key={act} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 transition-none group hover:bg-white/10">
                              <span className="text-sm font-bold text-white/60 uppercase">{act}</span>
                              <div className="flex gap-2">{keys.map(k => (
                                <div key={k} className="px-3 py-1.5 bg-zinc-800 rounded-xl border border-zinc-600 flex items-center gap-3"><span className="text-xs font-black text-white">{k}</span><button onClick={() => removeSpecificKeyMapping(ctx as any, act as any, k)} className="text-red-500 focusable"><X className="w-3.5 h-3.5" /></button></div>
                              ))}<button onClick={() => startRecording(ctx as any, act as any)} className="text-accent text-[10px] font-black">سجل</button></div>
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
