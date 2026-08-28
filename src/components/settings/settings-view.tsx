
"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useMediaStore, Reminder, Manuscript, MappingContext, AppAction, ManuscriptWord, YouTubeChannel, IptvChannel, Playlist, updateBin } from "@/lib/store";
import { 
   Settings, Bell, Trash2, Edit2, Plus, Minus, Keyboard, Timer, ArrowRightLeft, 
   Loader2, RefreshCw, Mic, X, Type, Zap, Sparkles, Upload, Clock, Youtube, Tv, Star, Magnet,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Maximize, Minimize, ImageIcon, Download, Search, Move,
  Maximize2, CloudDownload, FileImage, Save, BookOpen, Gamepad2, Palette, Library, UserCheck, Send, Check, Bookmark, 
  Play, SkipBack, SkipForward, VolumeX, Gamepad, Trophy, EyeOff, Calendar, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { searchYouTubeChannels, fetchYouTubePlaylistVideos } from "@/lib/youtube";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
   JSONBIN_CHANNELS_BIN_ID, JSONBIN_POPULAR_RECITERS_BIN_ID, JSONBIN_IPTV_FAVS_BIN_ID, 
   JSONBIN_MANUSCRIPTS_BIN_ID, JSONBIN_MASTER_BIN_ID, JSONBIN_FONTS_BIN_ID, JSONBIN_BACKGROUNDS_BIN_ID,
   JSONBIN_TEAM_LOGOS_BIN_ID, JSONBIN_MASTER_KEY
} from "@/lib/constants";

// --- SUB-COMPONENTS ---

const ManualTimeCounter = ({ 
  field, 
  label, 
  time, 
  onAdjust 
}: { 
  field: 'manualStartTime' | 'manualEndTime', 
  label: string, 
  time: string, 
  onAdjust: (field: 'manualStartTime' | 'manualEndTime', part: 'h' | 'm' | 'p', delta: number) => void 
}) => {
  const [h24, m] = time.split(':').map(Number);
  const h12 = h24 % 12 || 12;
  const isPm = h24 >= 12;

  return (
    <div className="space-y-3">
      <Label className="mr-4 font-black opacity-40">{label}</Label>
      <div className="flex items-center gap-2 bg-white/5 p-2 rounded-2xl border border-white/10 shadow-glow h-16">
        <div className="flex flex-col items-center gap-1">
           <button onClick={() => onAdjust(field, 'h', 1)} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center focusable"><Plus className="w-4 h-4" /></button>
           <span className="text-xl font-black w-10 text-center">{h12}</span>
           <button onClick={() => onAdjust(field, 'h', -1)} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center focusable"><Minus className="w-4 h-4" /></button>
        </div>
        <span className="font-black text-xl">:</span>
        <div className="flex flex-col items-center gap-1">
           <button onClick={() => onAdjust(field, 'm', 5)} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center focusable"><Plus className="w-4 h-4" /></button>
           <span className="text-xl font-black w-10 text-center">{m.toString().padStart(2, '0')}</span>
           <button onClick={() => onAdjust(field, 'm', -5)} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center focusable"><Minus className="w-4 h-4" /></button>
        </div>
        <button onClick={() => onAdjust(field, 'p', 0)} className="h-full px-4 bg-primary/20 text-primary border border-primary/20 rounded-xl font-black text-sm focusable ml-2">
          {isPm ? 'مساءً' : 'صباحاً'}
        </button>
      </div>
    </div>
  );
};

const TeamSelector = ({ 
  side, 
  search, 
  setSearch, 
  remForm, 
  onSelect,
  onAddToCloud
}: { 
  side: 'home' | 'away', 
  search: string, 
  setSearch: (v: string) => void, 
  remForm: any,
  onSelect: (logo: string, name: string) => void,
  onAddToCloud: (name: string, logo: string) => void
}) => {
  const logoField = side === 'home' ? 'homeLogo' : 'awayLogo';
  const nameField = side === 'home' ? 'homeName' : 'awayName';

  return (
    <div className="space-y-4">
      <Label className="mr-4 font-black opacity-40">{side === 'home' ? 'الفريق الأول (صاحب الأرض)' : 'الفريق الثاني (الضيف)'}</Label>
      <Input 
        value={search} 
        onChange={(e) => { setSearch(e.target.value); onSelect(remForm[logoField] || "", e.target.value); }} 
        className="h-16 bg-white/5 border-white/10 rounded-2xl font-black px-6 focusable" 
        placeholder="اكتب اسم الفريق..." 
      />
      <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
         <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 overflow-hidden">
            {remForm[logoField] ? <img src={remForm[logoField]} className="w-12 h-12 object-contain" alt="" /> : <Trophy className="w-8 h-8 text-white/10" />}
         </div>
         <Input 
           value={remForm[logoField] || ""} 
           onChange={(e) => onSelect(e.target.value, search)}
           className="h-12 bg-white/5 border-white/10 rounded-xl text-xs font-bold flex-1" 
           placeholder="رابط الشعار (URL)..." 
         />
         <Button 
           onClick={() => onAddToCloud(search, remForm[logoField] || "")}
           variant="outline"
           className="h-12 w-12 rounded-xl bg-emerald-600/20 text-emerald-400 border-emerald-500/30 focusable"
           title="حفظ الفريق للسحابة"
         >
           <Plus className="w-6 h-6" />
         </Button>
      </div>
    </div>
  );
};

/**
 * SettingsView v1560.0 - Sovereign Management Hub
 */
export function SettingsView() {
  const { 
     addReminder, removeReminder, reminders, updateReminder, skipMatch, skippedMatchIds,
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
    updateIptvChannel, playlists, addPlaylist, removePlaylist
  } = useMediaStore();
  
  const { toast } = useToast();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Team Search States
  const [homeSearch, setHomeSearch] = useState("");
  const [awaySearch, setAwaySearch] = useState("");

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

  // Reciter States
  const [reciterClickInput, setReciterClickInput] = useState("0");
  const [reciterSearch, setReciterSearch] = useState("");
  const [reciterResults, setReciterResults] = useState<YouTubeChannel[]>([]);
  const [isSearchingReciters, setIsSearchingReciters] = useState(false);
  const [editingReciterId, setEditingReciterId] = useState<string | null>(null);
  const [reciterNameInput, setReciterNameInput] = useState("");

  // Channel States
  const [channelSearch, setChannelSearch] = useState("");
  const [channelResults, setChannelResults] = useState<YouTubeChannel[]>([]);
  const [isSearchingChannels, setIsSearchingChannels] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [channelNameInput, setChannelNameInput] = useState("");

  // IPTV States
  const [editingIptvId, setEditingIptvId] = useState<string | null>(null);
  const [iptvEditForm, setIptvEditForm] = useState<any>({ name: "", url: "", stream_icon: "" });
  const [isAddingIptv, setIsAddingIptv] = useState(false);

  // Playlist States
  const [playlistInput, setPlaylistInput] = useState("");
  const [isAddingPlaylist, setIsAddingPlaylist] = useState(false);

  // New Creation States
  const [editingRemId, setEditingRemId] = useState<string | null>(null);
  const [remForm, setRemForm] = useState<Partial<Reminder>>({
    label: "", color: "text-primary", iconType: "bell", startType: "azan", startReference: "fajr", startOffset: 0,
    endType: "duration", durationMinutes: 30, countdownWindow: 15, showCountdown: true, manualStartTime: "05:00", manualEndTime: "22:00",
    homeLogo: "", awayLogo: "", matchDate: new Date().toISOString().split('T')[0], homeName: "", awayName: ""
  });

  const [editingZikrId, setEditingZikrId] = useState<string | null>(null);
  const [zikrInput, setZikrInput] = useState("");

  const sortedMatchReminders = useMemo(() => {
    return reminders
      .filter(r => r.iconType === 'match')
      .sort((a, b) => {
        const dateA = a.matchDate || "9999-12-31";
        const dateB = b.matchDate || "9999-12-31";
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return (a.manualStartTime || "00:00").localeCompare(b.manualStartTime || "00:00");
      });
  }, [reminders]);

  const getDayName = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ar-EG', { weekday: 'long' });
    } catch (e) { return ""; }
  };

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try { await fetchPriorityData('all'); } finally { setIsRefreshing(false); }
  }, [fetchPriorityData]);

  const handleDirectFetch = async (binId: string, label: string) => {
    toast({ title: "جلب سحابي", description: `جاري تحديث ${label} مباشرة من السحابة...` });
    await fetchSpecificBin(binId);
    toast({ title: "تم التحديث", description: `مزامنة ${label} اكتملت بنجاح.` });
  };

  const handleAddReminder = async () => {
    if (!remForm.label && remForm.iconType !== 'match') return;
    if (editingRemId) {
      updateReminder(editingRemId, remForm);
      setEditingRemId(null);
      toast({ title: "تم تحديث التذكير" });
    } else {
      addReminder({ ...remForm, id: Date.now().toString(), completed: false, showCountup: false } as Reminder);
      toast({ title: "تم إضافة التذكير" });
    }
    setRemForm({ label: "", color: "text-primary", iconType: "bell", startType: "azan", startReference: "fajr", startOffset: 0, endType: "duration", durationMinutes: 30, countdownWindow: 15, showCountdown: true, manualStartTime: "05:00", manualEndTime: "22:00", matchDate: new Date().toISOString().split('T')[0], homeName: "", awayName: "" });
    setHomeSearch(""); setAwaySearch("");
    await syncMasterBin();
  };

  const handleAddGeneralZikr = async () => {
    const text = zikrInput.trim();
    if (!text) return;
    if (editingZikrId) {
      updateAzkar(editingZikrId, { label: text });
      setEditingZikrId(null);
      toast({ title: "تم تحديث الذكر" });
    } else {
      addAzkar({ 
         id: Date.now().toString(), label: text, color: "text-emerald-400", iconType: "circle",
        startType: "manual", startOffset: 0, endType: "duration", durationMinutes: 1440,
        showCountdown: false, showCountup: false, completed: false, countdownWindow: 0
      });
      toast({ title: "تم إضافة الذكر" });
    }
    setZikrInput("");
    await syncMasterBin();
  };

  const handleAddTeamToCloud = async (name: string, logo: string) => {
    if (!name || !logo) {
      toast({ variant: "destructive", title: "بيانات ناقصة", description: "يرجى إدخال اسم الفريق ورابط الشعار." });
      return;
    }
    toast({ title: "جاري الرفع سحابياً", description: "جاري إضافة الفريق لقاعدة البيانات..." });
    try {
      const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_TEAM_LOGOS_BIN_ID}/latest`, { headers: { 'X-Master-Key': JSONBIN_MASTER_KEY } });
      const current = (await r.json()).record;
      const teams = Array.isArray(current) ? current : (current.teams || []);
      const exists = teams.some((t: any) => t.name === name);
      if (exists) { toast({ title: "الفريق موجود مسبقاً" }); return; }
      const updated = { teams: [...teams, { id: Date.now(), name, logo }] };
      await updateBin(JSONBIN_TEAM_LOGOS_BIN_ID, updated);
      toast({ title: "تم الإضافة بنجاح" });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ سحابي" });
    }
  };

  const adjustManualTime = (field: 'manualStartTime' | 'manualEndTime', part: 'h' | 'm' | 'p', delta: number) => {
    const current = remForm[field] || "05:00";
    let [h, m] = current.split(':').map(Number);
    if (part === 'h') h = (h + delta + 24) % 24;
    else if (part === 'm') m = (m + delta + 60) % 60;
    else if (part === 'p') h = (h + 12) % 24; 
    const newVal = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    setRemForm(prev => ({ ...prev, [field]: newVal }));
  };

  const handleTeamSelect = (side: 'home' | 'away', logo: string, name: string) => {
    const logoField = side === 'home' ? 'homeLogo' : 'awayLogo';
    const nameField = side === 'home' ? 'homeName' : 'awayName';
    setRemForm(prev => ({ ...prev, [logoField]: logo, [nameField]: name }));
    if (side === 'home') setHomeSearch(name);
    else setAwaySearch(name);
  };

  const handleSaveReciterName = async (id: string) => {
    updateReciterName(id, reciterNameInput);
    setEditingReciterId(null);
    await saveRecitersReorder();
    toast({ title: "تم تحديث الاسم" });
  };

  const handleAddPlaylistFromInput = async () => {
    const input = playlistInput.trim();
    if (!input) return;
    const listMatch = input.match(/[?&]list=([^&]+)/);
    if (listMatch) {
      toast({ title: "جاري الاستيراد" });
      const data = await fetchYouTubePlaylistVideos(listMatch[1]);
      if (data.videos.length > 0) {
        addPlaylist(data.title, data.videos);
        toast({ title: "تم الاستيراد بنجاح" });
      }
    } else {
      addPlaylist(input);
      toast({ title: "تم إنشاء المجلد" });
    }
    setPlaylistInput("");
    setIsAddingPlaylist(false);
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

  const handleAddReciterWithClicks = (r: YouTubeChannel) => {
    addReciter({ ...r, clickschannel: parseInt(reciterClickInput) || 0 });
    toast({ title: "تم إضافة القارئ" });
  };

  const handleSaveManuscript = async () => {
    if (!manuscriptInput && manuscriptType === 'text') return;
    const pngDataUrl = generateManuscriptPng(currentWords, selectedFont);
    const item: Manuscript = { id: editingManuscriptId || Date.now().toString(), type: manuscriptType, content: manuscriptInput, fontFamily: selectedFont, words: currentWords, pngDataUrl, x: 50, y: 50, scale: 1.0 };
    if (editingManuscriptId) updateManuscript(editingManuscriptId, item);
    else addManuscript(item);
    setEditingManuscriptId(null); setManuscriptInput(""); setCurrentWords([]); setManuscriptMode('write'); setSelectedWordId(null); setIsFullscreenEditor(false);
    toast({ title: "تم الحفظ" });
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
  const adjustWordScale = (delta: number) => { if (!selectedWordId) return; setCurrentWords(prev => prev.map(w => w.id === selectedWordId ? { ...w, scale: Math.max(0.1, w.scale + delta) } : w)); };

  const splitToWords = () => {
    const words = manuscriptInput.split(/\s+/).filter(Boolean);
    setCurrentWords(words.map((text, i) => ({ id: `word-${Date.now()}-${i}`, text, x: 50, y: 50 + (i * 10), scale: 1.0 })));
    setManuscriptMode('arrange');
  };

  const startRecording = (ctx: MappingContext, act: AppAction) => { setIsRecordingKey(true); setRecordingAction({ ctx, act }); toast({ title: "وضع التسجيل نشط" }); };

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (res) => { addCustomFont(file.name.split('.')[0], res.target?.result as string); toast({ title: "تم الرفع" }); };
    reader.readAsDataURL(file);
  };

  const COMMAND_KEYS = [
    { label: "الأحمر", key: "Red", icon: null, color: "bg-red-600" },
    { label: "الأخضر", key: "Green", icon: null, color: "bg-green-600" },
    { label: "الأصفر", key: "Yellow", icon: null, color: "bg-yellow-500" },
    { label: "الأزرق", key: "Blue", icon: null, color: "bg-blue-600" },
    { label: "الخروج", key: "Exit", icon: X, color: "bg-zinc-800" },
    { label: "الرجوع", key: "Back", icon: ChevronLeft, color: "bg-zinc-800" },
    { label: "التالي", key: "NextTrack", icon: SkipForward, color: "bg-zinc-700" },
    { label: "السابق", key: "PrevTrack", icon: SkipBack, color: "bg-zinc-700" },
    ...Array.from({ length: 10 }, (_, i) => ({ label: `رقم ${i}`, key: i.toString(), icon: null, color: "bg-zinc-600" }))
  ];

  return (
    <div data-nav-zone="content" className="p-12 space-y-12 max-w-7xl mx-auto pb-40 text-right dir-rtl bg-black min-h-full transition-none">
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-6xl font-black text-white tracking-tighter flex items-center gap-6">الإعدادات السيادية <Settings className="w-12 h-12 text-primary" /></h1>
          <p className="text-white/40 font-bold uppercase tracking-[0.6em] text-sm">Unified System Hub v1560.0</p>
        </div>
        <div className="flex gap-4">
          <Button onClick={handleManualRefresh} disabled={isRefreshing} className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-full h-14 px-8 font-black focusable"><RefreshCw className={cn("w-5 h-5 ml-2", isRefreshing && "animate-spin")} /> تحديث محلي</Button>
          <Button onClick={async () => { setIsSyncing(true); await syncMasterBin(); setIsSyncing(false); toast({ title: "تم الحفظ سحابياً بنجاح" }); }} disabled={isSyncing} className="bg-primary text-white rounded-full h-14 px-8 font-black shadow-glow focusable">{isSyncing ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Zap className="w-5 h-5 ml-2" />} تخزين سحابي (JSONBin)</Button>
        </div>
      </header>

      <Tabs defaultValue="reminders" className="w-full">
        <TabsList className="bg-white/5 p-1 rounded-full border border-white/10 h-20 mb-12 flex justify-around overflow-x-auto no-scrollbar shadow-2xl">
          <TabsTrigger value="manuscripts" className="rounded-full px-8 h-full font-black text-sm transition-none focusable">المخطوطات</TabsTrigger>
          <TabsTrigger value="reminders" className="rounded-full px-8 h-full font-black text-sm transition-none focusable">التذكيرات</TabsTrigger>
          <TabsTrigger value="azkar" className="rounded-full px-8 h-full font-black text-sm transition-none focusable">الأذكار</TabsTrigger>
          <TabsTrigger value="subscriptions" className="rounded-full px-8 h-full font-black text-sm transition-none focusable">الاشتراكات</TabsTrigger>
          <TabsTrigger value="iptv" className="rounded-full px-8 h-full font-black text-sm transition-none focusable">قنوات IPTV</TabsTrigger>
          <TabsTrigger value="backgrounds" className="rounded-full px-8 h-full font-black text-sm transition-none focusable">الخلفيات</TabsTrigger>
          <TabsTrigger value="reciters" className="rounded-full px-8 h-full font-black text-sm transition-none focusable">القراء</TabsTrigger>
          <TabsTrigger value="playlists" className="rounded-full px-8 h-full font-black text-sm transition-none focusable">المجلدات</TabsTrigger>
          <TabsTrigger value="buttonmap" className="rounded-full px-8 h-full font-black text-sm transition-none focusable">التحكم</TabsTrigger>
        </TabsList>

        <TabsContent value="manuscripts" className="space-y-8 animate-in fade-in duration-0">
          <Card className={cn( "bg-white/5 border-white/10 p-10 rounded-[3.5rem] relative shadow-2xl transition-all duration-500", isFullscreenEditor && "fixed inset-0 z-[100000] bg-black p-12 rounded-none overflow-hidden" )}>
            <div className="flex items-center justify-between mb-8 relative z-10">
              <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Type className="w-12 h-12 text-primary" /> استوديو التجميد 190</CardTitle>
              <div className="flex gap-4">
                 <Button onClick={() => handleDirectFetch(JSONBIN_MANUSCRIPTS_BIN_ID, "المخطوطات")} variant="outline" className="w-14 h-14 rounded-full bg-white/5 border-white/10 flex items-center justify-center text-white/40 focusable" title="جلب المخطوطات"><CloudDownload className="w-6 h-6" /></Button>
                 <Button onClick={() => handleDirectFetch(JSONBIN_FONTS_BIN_ID, "الخطوط")} variant="outline" className="w-14 h-14 rounded-full bg-white/5 border-white/10 flex items-center justify-center text-white/40 focusable" title="جلب الخطوط"><Download className="w-6 h-6" /></Button>
                 <button onClick={() => document.getElementById('font-upload-input')?.click()} className="w-14 h-14 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center shadow-glow border border-indigo-500/30 focusable" title="رفع خط جديد"><Upload className="w-6 h-6" /></button>
                 <input id="font-upload-input" type="file" className="hidden" accept=".ttf,.otf" onChange={handleFontUpload} />
                 <button onClick={() => setIsFullscreenEditor(!isFullscreenEditor)} className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white shadow-glow border border-white/20 focusable">{isFullscreenEditor ? <Minimize className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}</button>
                 <Button onClick={handleSaveManuscript} className="bg-emerald-500 text-black rounded-full h-14 px-8 font-black shadow-glow focusable">حفظ المخطوطة</Button>
              </div>
            </div>
            
            <div className="bg-black/40 p-8 rounded-[2rem] border border-white/5 mb-8 flex gap-4 shadow-2xl">
               <Input placeholder="أدخل نص النص..." value={manuscriptInput} onChange={(e) => setManuscriptInput(e.target.value)} className="h-16 bg-white/5 border-none rounded-xl text-2xl font-black text-white px-8 focusable" />
               <Button onClick={splitToWords} className="h-16 px-8 bg-blue-600 text-white rounded-xl font-black focusable">تقطيع الكلمات</Button>
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

            <div ref={canvasRef} onPointerMove={handlePointerMove} onPointerUp={() => setDraggingWord(null)} className={cn( "p-0 bg-zinc-900/60 rounded-[4rem] border-4 border-primary/20 relative overflow-hidden flex items-center justify-center shadow-[0_0_100px_rgba(0,0,0,0.8)] transition-none [container-type:inline-size]", isFullscreenEditor ? "h-[65vh] w-full" : "aspect-[4/3] w-full max-w-4xl mx-auto mb-10" )}>
              {currentWords.map((word) => (
                <div key={word.id} onPointerDown={() => handlePointerDown(word.id)} style={{ position: 'absolute', left: `${word.x}%`, top: `${word.y}%`, transform: `translate(-50%, -50%) scale(${word.scale})`, zIndex: draggingWord?.wordId === word.id ? 100 : 10, cursor: 'move', fontFamily: selectedFont, color: mapSettings.manuscriptColor, fontSize: '8.5cqw', textShadow: '0 0 30px rgba(255,255,255,0.4)', transition: 'none' }} className={cn( "select-none whitespace-nowrap leading-none p-4", selectedWordId === word.id && "ring-4 ring-primary rounded-[2rem] bg-primary/10 shadow-glow" )}>{word.text}</div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {customManuscripts.map(m => (
                <div key={m.id} className="bg-black/60 p-8 rounded-[3rem] border border-white/10 flex flex-col items-center shadow-2xl transition-all hover:border-primary/20">
                   <div className="w-full aspect-video bg-zinc-950 rounded-2xl mb-6 flex items-center justify-center overflow-hidden border border-white/5"><img src={m.pngDataUrl} className="max-w-[80%] max-h-[80%] object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" alt="" /></div>
                   <div className="flex gap-2 w-full"><Button onClick={() => { setEditingManuscriptId(m.id); setManuscriptInput(m.content); setCurrentWords(m.words || []); setSelectedFont(m.fontFamily || "Aref Ruqaa"); }} className="flex-1 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-2xl h-12 focusable">تحرير</Button><Button onClick={() => removeManuscript(m.id)} className="w-12 h-12 bg-red-600/10 text-red-500 border border-red-500/20 rounded-2xl h-12 focusable"><Trash2 className="w-5 h-5" /></Button></div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl relative">
              <div className="flex justify-between items-center mb-12">
                 <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Bell className="w-12 h-12 text-blue-400" /> إدارة التذكيرات السيادية</CardTitle>
                 <Button onClick={() => handleDirectFetch(JSONBIN_MASTER_BIN_ID, "التذكيرات")} variant="outline" className="w-14 h-14 rounded-full bg-white/5 border-white/10 flex items-center justify-center text-white/40 focusable shadow-glow"><CloudDownload className="w-6 h-6" /></Button>
              </div>

              <div className="bg-black/40 p-10 rounded-[3rem] border border-white/5 space-y-8 mb-12 shadow-2xl">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <Label className="mr-4 font-black opacity-40">اسم التذكير / المباراة</Label>
                       <Input value={remForm.label} onChange={(e) => setRemForm({...remForm, label: e.target.value})} className="h-16 bg-white/5 border-white/10 rounded-2xl text-xl font-black focusable" placeholder="مثال: ديربي لندن..." />
                    </div>
                    <div className="space-y-3">
                       <Label className="mr-4 font-black opacity-40">النوع / الأيقونة</Label>
                       <Select value={remForm.iconType} onValueChange={(v) => setRemForm({...remForm, iconType: v as any})}>
                          <SelectTrigger className="h-16 bg-white/5 border-white/10 rounded-2xl text-xl font-black focusable"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-zinc-950">
                             <SelectItem value="bell">تنبيه جرس</SelectItem>
                             <SelectItem value="play">تشغيل وسائط</SelectItem>
                             <SelectItem value="match">مباراة كرة قدم ⚽</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                 </div>

                 {remForm.iconType === 'match' ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in zoom-in-95">
                      <TeamSelector side="home" search={homeSearch} setSearch={setHomeSearch} remForm={remForm} onSelect={(logo, name) => handleTeamSelect('home', logo, name)} onAddToCloud={handleAddTeamToCloud} />
                      <TeamSelector side="away" search={awaySearch} setSearch={setAwaySearch} remForm={remForm} onSelect={(logo, name) => handleTeamSelect('away', logo, name)} onAddToCloud={handleAddTeamToCloud} />
                      <div className="space-y-3">
                         <Label className="mr-4 font-black opacity-40">تاريخ المباراة</Label>
                         <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 h-16 shadow-glow">
                            <Calendar className="w-6 h-6 text-primary" />
                            <Input type="date" value={remForm.matchDate} onChange={(e) => setRemForm(p => ({ ...p, matchDate: e.target.value }))} className="bg-transparent border-none text-xl font-black text-white p-0 focus-visible:ring-0" />
                         </div>
                      </div>
                      <ManualTimeCounter field="manualStartTime" label="توقيت المباراة" time={remForm.manualStartTime || "05:00"} onAdjust={adjustManualTime} />
                   </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div className="space-y-3">
                          <Label className="mr-4 font-black opacity-40">البداية</Label>
                          <Select value={remForm.startType} onValueChange={(v) => setRemForm({...remForm, startType: v as any})}>
                             <SelectTrigger className="h-16 bg-white/5 border-white/10 rounded-2xl text-lg font-black focusable"><SelectValue /></SelectTrigger>
                             <SelectContent className="bg-zinc-950">
                                <SelectItem value="azan">مرتبط بالأذان</SelectItem>
                                <SelectItem value="iqamah">مرتبط بالإقامة</SelectItem>
                                <SelectItem value="manual">توقيت يدوي</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>
                       {remForm.startType !== 'manual' ? (
                          <div className="space-y-3">
                             <Label className="mr-4 font-black opacity-40">مرجع الصلاة</Label>
                             <Select value={remForm.startReference} onValueChange={(v) => setRemForm({...remForm, startReference: v})}>
                                <SelectTrigger className="h-16 bg-white/5 border-white/10 rounded-2xl text-lg font-black focusable"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-zinc-950">
                                   {prayerSettings.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                             </Select>
                          </div>
                       ) : (
                          <ManualTimeCounter field="manualStartTime" label="وقت البداية" time={remForm.manualStartTime || "05:00"} onAdjust={adjustManualTime} />
                       )}
                       <div className="space-y-3">
                          <Label className="mr-4 font-black opacity-40">الإزاحة (دقائق)</Label>
                          <div className="flex items-center gap-2 bg-white/5 p-2 rounded-2xl border border-white/10 shadow-glow h-16">
                             <button onClick={() => setRemForm(p => ({ ...p, startOffset: (p.startOffset || 0) + 5 }))} className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center focusable"><Plus className="w-4 h-4" /></button>
                             <span className="text-2xl font-black w-16 text-center">{remForm.startOffset || 0}</span>
                             <button onClick={() => setRemForm(p => ({ ...p, startOffset: Math.max(-120, (p.startOffset || 0) - 5) }))} className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center focusable"><Minus className="w-6 h-6" /></button>
                          </div>
                       </div>
                    </div>
                 )}

                 <Button onClick={handleAddReminder} className="w-full h-20 bg-primary text-white rounded-[1.5rem] font-black text-2xl shadow-glow focusable">
                    {editingRemId ? "تحديث التذكير السيادي" : "حفظ التذكير السيادي الجديد"}
                 </Button>
              </div>

              <Tabs defaultValue="bell" className="w-full">
                 <TabsList className="bg-white/5 p-1 rounded-2xl h-14 mb-8 flex gap-2">
                    <TabsTrigger value="bell" className="flex-1 rounded-xl font-black text-xs focusable">تنبيهات الجرس</TabsTrigger>
                    <TabsTrigger value="play" className="flex-1 rounded-xl font-black text-xs focusable">تشغيل وسائط</TabsTrigger>
                    <TabsTrigger value="match" className="flex-1 rounded-xl font-black text-xs focusable">مركز المباريات</TabsTrigger>
                 </TabsList>
                 <TabsContent value="match" className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {sortedMatchReminders.map(rem => (
                       <div key={rem.id} className={cn("bg-black/60 p-6 rounded-[2.5rem] border flex flex-col gap-4 shadow-xl transition-all", editingRemId === rem.id ? "border-primary shadow-glow" : "border-white/10")}>
                          <div className="flex items-center justify-between gap-4 py-2">
                             <div className="flex flex-col items-center flex-1 gap-2">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 p-2 flex items-center justify-center border border-white/5">{rem.homeLogo ? <img src={rem.homeLogo} className="w-full h-full object-contain" alt="" /> : <Trophy className="w-8 h-8 text-white/10" />}</div>
                                <span className="text-[10px] font-black text-white/80 uppercase truncate w-full text-center">{rem.homeName || "HOME"}</span>
                             </div>
                             <div className="flex flex-col items-center justify-center min-w-[100px] gap-1">
                                <div className="text-3xl font-black text-white tabular-nums tracking-tighter">{rem.manualStartTime}</div>
                                <div className="px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-[9px] font-black text-primary uppercase">{rem.label || "مباراة"}</div>
                             </div>
                             <div className="flex flex-col items-center flex-1 gap-2">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 p-2 flex items-center justify-center border border-white/5">{rem.awayLogo ? <img src={rem.awayLogo} className="w-full h-full object-contain" alt="" /> : <Trophy className="w-8 h-8 text-white/10" />}</div>
                                <span className="text-[10px] font-black text-white/80 uppercase truncate w-full text-center">{rem.awayName || "AWAY"}</span>
                             </div>
                          </div>
                          <div className="flex items-center justify-between pt-4 border-t border-white/5">
                             <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-400" /><span className="text-sm font-black text-white">{rem.matchDate}</span></div>
                             <div className="flex gap-2">
                                <Button onClick={() => skipMatch(rem.id)} variant="ghost" size="icon" className={cn("w-10 h-10 rounded-full", skippedMatchIds.includes(rem.id) ? "text-red-500" : "text-emerald-400")}><Eye className="w-5 h-5" /></Button>
                                <Button onClick={() => { setEditingRemId(rem.id); setRemForm(rem); }} variant="ghost" size="icon" className="w-10 h-10 rounded-full text-emerald-400"><Edit2 className="w-5 h-5" /></Button>
                                <Button onClick={() => removeReminder(rem.id)} variant="ghost" size="icon" className="w-10 h-10 rounded-full text-red-500"><Trash2 className="w-5 h-5" /></Button>
                             </div>
                          </div>
                       </div>
                    ))}
                 </TabsContent>
              </Tabs>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
