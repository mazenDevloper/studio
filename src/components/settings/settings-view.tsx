
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
      <div className="flex items-center gap-2 bg-white/5 p-2 rounded-2xl border border-white/10 shadow-glow">
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
        <button onClick={() => onAdjust(field, 'p', 0)} className="h-16 px-4 bg-primary/20 text-primary border border-primary/20 rounded-xl font-black text-sm focusable ml-2">
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
  teamLogos, 
  remForm, 
  onSelect,
  onAddToCloud
}: { 
  side: 'home' | 'away', 
  search: string, 
  setSearch: (v: string) => void, 
  teamLogos: any[], 
  remForm: any,
  onSelect: (logo: string, name: string) => void,
  onAddToCloud: (name: string, logo: string) => void
}) => {
  const logoField = side === 'home' ? 'homeLogo' : 'awayLogo';
  const nameField = side === 'home' ? 'homeName' : 'awayName';

  return (
    <div className="space-y-4">
      <Label className="mr-4 font-black opacity-40">{side === 'home' ? 'الفريق الأول (صاحب الأرض)' : 'الفريق الثاني (الضيف)'}</Label>
      <div className="relative">
         <Input 
           value={search} 
           onChange={(e) => setSearch(e.target.value)} 
           className="h-16 bg-white/5 border-white/10 rounded-2xl font-black px-6 focusable" 
           placeholder="ابحث عن الفريق أو اكتب الاسم يدوياً..." 
         />
      </div>
      <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
         <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 overflow-hidden">
            {remForm[logoField] ? <img src={remForm[logoField]} className="w-12 h-12 object-contain" alt="" /> : <Trophy className="w-8 h-8 text-white/10" />}
         </div>
         <Input 
           value={remForm[logoField] || ""} 
           onChange={(e) => onSelect(e.target.value, remForm[nameField] || search)}
           className="h-12 bg-white/5 border-white/10 rounded-xl text-xs font-bold flex-1" 
           placeholder="رابط الشعار يدوياً (اختياري)..." 
         />
         <Button 
           onClick={() => onAddToCloud(remForm[nameField] || search, remForm[logoField] || "")}
           variant="outline"
           className="h-12 w-12 rounded-xl bg-emerald-600/20 text-emerald-400 border-emerald-500/30 focusable"
           title="إضافة للفريق للسحابة"
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
  const [teamLogos, setTeamLogos] = useState<{name: string, logo: string}[]>([]);
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

  // SOVEREIGN MATCH SORTING: Sort by date ASC, then time ASC
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

  // Helper to get day name from date string
  const getDayName = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ar-EG', { weekday: 'long' });
    } catch (e) { return ""; }
  };

  // Fetch Team Logos on mount
  useEffect(() => {
    const fetchLogos = async () => {
      try {
        const r = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_TEAM_LOGOS_BIN_ID}/latest`, { headers: { 'X-Master-Key': JSONBIN_MASTER_KEY } });
        if (r.ok) {
           const data = (await r.json()).record;
           setTeamLogos(Array.isArray(data) ? data : data.teams || []);
        }
      } catch(e) {}
    };
    fetchLogos();
  }, []);

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
      if (exists) {
        toast({ title: "الفريق موجود مسبقاً", description: "هذا الفريق مسجل بالفعل في السحابة." });
        return;
      }
      
      const updated = { teams: [...teams, { id: Date.now(), name, logo }] };
      await updateBin(JSONBIN_TEAM_LOGOS_BIN_ID, updated);
      setTeamLogos(updated.teams);
      toast({ title: "تم الإضافة بنجاح", description: `تم حفظ ${name} في السحابة السيادية.` });
    } catch (e) {
      toast({ variant: "destructive", title: "خطأ سحابي", description: "فشل الاتصال بمركز البيانات." });
    }
  };

  const adjustManualTime = (field: 'manualStartTime' | 'manualEndTime', part: 'h' | 'm' | 'p', delta: number) => {
    const current = remForm[field] || "05:00";
    let [h, m] = current.split(':').map(Number);
    
    if (part === 'h') {
      h = (h + delta + 24) % 24;
    } else if (part === 'm') {
      m = (m + delta + 60) % 60;
    } else if (part === 'p') {
      h = (h + 12) % 24; 
    }
    
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
      toast({ title: "جاري الاستيراد", description: "جاري سحب المجلد من يوتيوب..." });
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
    toast({ title: "تم إضافة القارئ", description: `بإجمالي ضغطات: ${reciterClickInput}` });
  };

  const handleSaveManuscript = async () => {
    if (!manuscriptInput && manuscriptType === 'text') return;
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

  const adjustWordScale = (delta: number) => {
    if (!selectedWordId) return;
    setCurrentWords(prev => prev.map(w => w.id === selectedWordId ? { ...w, scale: Math.max(0.1, w.scale + delta) } : w));
  };

  const splitToWords = () => {
    const words = manuscriptInput.split(/\s+/).filter(Boolean);
    setCurrentWords(words.map((text, i) => ({ id: `word-${Date.now()}-${i}`, text, x: 50, y: 50 + (i * 10), scale: 1.0 })));
    setManuscriptMode('arrange');
  };

  const startRecording = (ctx: MappingContext, act: AppAction) => { setIsRecordingKey(true); setRecordingAction({ ctx, act }); toast({ title: "وضع التسجيل نشط" }); };

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (res) => {
      const url = res.target?.result as string;
      addCustomFont(file.name.split('.')[0], url);
      toast({ title: "تم رفع الخط سحابياً" });
    };
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
    { label: "تشغيل/إيقاف", key: "MediaPlayPause", icon: Play, color: "bg-zinc-700" },
    { label: "كتم الصوت", key: "VolumeMute", icon: VolumeX, color: "bg-zinc-700" },
    { label: "الجوي ستيك 1", key: "Joy_1", icon: Gamepad, color: "bg-indigo-600" },
    { label: "الجوي ستيك 2", key: "Joy_2", icon: Gamepad, color: "bg-indigo-600" },
    { label: "الجوي ستيك 3", key: "Joy_3", icon: Gamepad, color: "bg-indigo-600" },
    { label: "الجوي ستيك 4", key: "Joy_4", icon: Gamepad, color: "bg-indigo-600" },
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
               <Input placeholder="أدخل نص النص ثم اضغط تقطيع للتحكم بالكلمات..." value={manuscriptInput} onChange={(e) => setManuscriptInput(e.target.value)} className="h-16 bg-white/5 border-none rounded-xl text-2xl font-black text-white px-8 focusable" />
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

            {selectedWordId && (
              <div className="flex items-center gap-4 bg-black/60 p-4 rounded-full border border-white/10 mb-6 max-w-fit mx-auto animate-in zoom-in-95 shadow-glow">
                <span className="text-[10px] font-black text-white/40 uppercase mr-4">تحجيم الكلمة:</span>
                <Button onClick={() => adjustWordScale(0.1)} size="icon" className="w-10 h-10 rounded-full bg-white/10 focusable"><Plus className="w-4 h-4" /></Button>
                <Button onClick={() => adjustWordScale(-0.1)} size="icon" className="w-10 h-10 rounded-full bg-white/10 focusable"><Minus className="w-4 h-4" /></Button>
                <Button onClick={() => setCurrentWords(prev => prev.map(w => w.id === selectedWordId ? { ...w, x: 50 } : w))} size="sm" className="bg-white/5 rounded-full px-4 text-[10px] font-black focusable">توسيط أفقي</Button>
                <Button onClick={() => setSelectedWordId(null)} size="icon" className="w-8 h-8 rounded-full bg-red-600/20 text-red-500 ml-4"><X className="w-4 h-4" /></Button>
              </div>
            )}

            <div ref={canvasRef} onPointerMove={handlePointerMove} onPointerUp={() => setDraggingWord(null)} className={cn( "p-0 bg-zinc-900/60 rounded-[4rem] border-4 border-primary/20 relative overflow-hidden flex items-center justify-center shadow-[0_0_100px_rgba(0,0,0,0.8)] transition-none [container-type:inline-size]", isFullscreenEditor ? "h-[65vh] w-full" : "aspect-[4/3] w-full max-w-4xl mx-auto mb-10" )}>
              {currentWords.map((word) => (
                <div 
                  key={word.id} 
                  onPointerDown={() => handlePointerDown(word.id)} 
                  style={{ 
                    position: 'absolute', left: `${word.x}%`, top: `${word.y}%`, 
                    transform: `translate(-50%, -50%) scale(${word.scale})`, 
                    zIndex: draggingWord?.wordId === word.id ? 100 : 10, 
                    cursor: 'move', fontFamily: selectedFont, color: mapSettings.manuscriptColor, 
                    fontSize: '8.5cqw', textShadow: '0 0 30px rgba(255,255,255,0.4)', transition: 'none' 
                  }} 
                  className={cn( "select-none whitespace-nowrap leading-none p-4", selectedWordId === word.id && "ring-4 ring-primary rounded-[2rem] bg-primary/10 shadow-glow" )}
                >
                  {word.text}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {customManuscripts.map(m => (
                <div key={m.id} className="bg-black/60 p-8 rounded-[3rem] border border-white/10 flex flex-col items-center shadow-2xl transition-all hover:border-primary/20 group">
                   <div className="w-full aspect-video bg-zinc-950 rounded-2xl mb-6 flex items-center justify-center overflow-hidden border border-white/5"><img src={m.pngDataUrl} className="max-w-[80%] max-h-[80%] object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" alt="" /></div>
                   <div className="flex gap-2 w-full"><Button onClick={() => { setEditingManuscriptId(m.id); setManuscriptInput(m.content); setCurrentWords(m.words || []); setSelectedFont(m.fontFamily || "Aref Ruqaa"); }} className="flex-1 h-12 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-2xl h-12 focusable">تحرير</Button><Button onClick={() => removeManuscript(m.id)} className="w-12 h-12 bg-red-600/10 text-red-500 border border-red-500/20 rounded-2xl h-12 focusable"><Trash2 className="w-5 h-5" /></Button></div>
                </div>
              ))}
              <div onClick={() => document.getElementById('manu-image-upload')?.click()} className="bg-black/40 border-2 border-dashed border-white/10 rounded-[3rem] p-8 flex flex-col items-center justify-center gap-4 text-white/20 hover:border-primary hover:text-primary transition-all cursor-pointer focusable shadow-2xl" tabIndex={0}>
                 <ImageIcon className="w-12 h-12" />
                 <span className="font-black text-center">رفع صورة مخطوطة جاهزة</span>
                 <input id="manu-image-upload" type="file" className="hidden" accept="image/*" onChange={(e) => {
                   const file = e.target.files?.[0]; if (!file) return;
                   const reader = new FileReader();
                   reader.onload = (res) => addManuscript({ id: Date.now().toString(), type: 'image', content: "صورة مرفوعة", pngDataUrl: res.target?.result as string, words: [], fontFamily: "Aref Ruqaa", x: 50, y: 50, scale: 1.0 });
                   reader.readAsDataURL(file);
                 }} />
              </div>
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
                      <TeamSelector 
                        side="home" 
                        search={homeSearch} 
                        setSearch={setHomeSearch} 
                        teamLogos={teamLogos} 
                        remForm={remForm} 
                        onSelect={(logo, name) => handleTeamSelect('home', logo, name)}
                        onAddToCloud={handleAddTeamToCloud}
                      />
                      <TeamSelector 
                        side="away" 
                        search={awaySearch} 
                        setSearch={setAwaySearch} 
                        teamLogos={teamLogos} 
                        remForm={remForm} 
                        onSelect={(logo, name) => handleTeamSelect('away', logo, name)}
                        onAddToCloud={handleAddTeamToCloud}
                      />
                      <div className="space-y-3">
                         <Label className="mr-4 font-black opacity-40">تاريخ المباراة</Label>
                         <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 h-16 shadow-glow">
                            <Calendar className="w-6 h-6 text-primary" />
                            <Input 
                              type="date" 
                              value={remForm.matchDate} 
                              onChange={(e) => setRemForm(p => ({ ...p, matchDate: e.target.value }))}
                              className="bg-transparent border-none text-xl font-black text-white p-0 focus-visible:ring-0" 
                            />
                         </div>
                         <p className="text-[10px] font-bold text-white/20 mr-4">ستظهر المباراة فقط في التاريخ المحدد</p>
                      </div>
                      <ManualTimeCounter 
                        field="manualStartTime" 
                        label="توقيت المباراة" 
                        time={remForm.manualStartTime || "05:00"} 
                        onAdjust={adjustManualTime} 
                      />
                   </div>
                 ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-3">
                            <Label className="mr-4 font-black opacity-40">اللون المميز</Label>
                            <Select value={remForm.color} onValueChange={(v) => setRemForm({...remForm, color: v})}>
                               <SelectTrigger className="h-16 bg-white/5 border-white/10 rounded-2xl text-xl font-black focusable"><SelectValue /></SelectTrigger>
                               <SelectContent className="bg-zinc-950">
                                  <SelectItem value="text-primary">أزرق سيادي</SelectItem>
                                  <SelectItem value="text-emerald-400">أخضر ملكي</SelectItem>
                                  <SelectItem value="text-yellow-500">ذهبي فاخر</SelectItem>
                                  <SelectItem value="text-red-500">أحمر تنبيهي</SelectItem>
                               </SelectContent>
                            </Select>
                         </div>
                      </div>

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
                             <>
                               <div className="space-y-3">
                                  <Label className="mr-4 font-black opacity-40">مرجع الصلاة</Label>
                                  <Select value={remForm.startReference} onValueChange={(v) => setRemForm({...remForm, startReference: v})}>
                                     <SelectTrigger className="h-16 bg-white/5 border-white/10 rounded-2xl text-lg font-black focusable"><SelectValue /></SelectTrigger>
                                     <SelectContent className="bg-zinc-950">
                                        {prayerSettings.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                     </SelectContent>
                                  </Select>
                               </div>
                             </>
                          ) : (
                             <ManualTimeCounter 
                               field="manualStartTime" 
                               label="وقت البداية المختار" 
                               time={remForm.manualStartTime || "05:00"} 
                               onAdjust={adjustManualTime} 
                             />
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

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                             <Label className="mr-4 font-black opacity-40">نوع النهاية</Label>
                             <Select value={remForm.endType} onValueChange={(v) => setRemForm({...remForm, endType: v as any})}>
                                <SelectTrigger className="h-16 bg-white/5 border-white/10 rounded-2xl text-lg font-black focusable"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-zinc-950">
                                   <SelectItem value="duration">مدة زمنية محددة</SelectItem>
                                   <SelectItem value="prayer">مرتبط بصلاة أخرى</SelectItem>
                                   <SelectItem value="manual">توقيت يدوي ثابت</SelectItem>
                                </SelectContent>                             </Select>
                          </div>
                          {remForm.endType === 'duration' ? (
                             <div className="space-y-3">
                                <Label className="mr-4 font-black opacity-40">المدة الزمنية (بالدقائق)</Label>
                                <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 shadow-glow">
                                   <button onClick={() => setRemForm(p => ({ ...p, durationMinutes: (p.durationMinutes || 0) + 15 }))} className="h-16 w-16 rounded-xl bg-white/10 flex items-center justify-center focusable"><Plus className="w-8 h-8" /></button>
                                   <span className="flex-1 text-3xl font-black text-center">{remForm.durationMinutes || 30}</span>
                                   <button onClick={() => setRemForm(p => ({ ...p, durationMinutes: Math.max(0, (p.durationMinutes || 0) - 15) }))} className="h-16 w-16 rounded-xl bg-white/10 flex items-center justify-center focusable"><Minus className="w-8 h-8" /></button>
                                </div>
                             </div>
                          ) : remForm.endType === 'manual' ? (
                             <ManualTimeCounter 
                               field="manualEndTime" 
                               label="وقت الانتهاء المختار" 
                               time={remForm.manualEndTime || "22:00"} 
                               onAdjust={adjustManualTime} 
                             />
                          ) : (
                             <div className="space-y-3">
                                <Label className="mr-4 font-black opacity-40">مرجع الانتهاء (الصلاة)</Label>
                                <Select value={remForm.endReference} onValueChange={(v) => setRemForm({...remForm, endReference: v})}>
                                   <SelectTrigger className="h-16 bg-white/5 border-white/10 rounded-2xl text-lg font-black focusable"><SelectValue /></SelectTrigger>
                                   <SelectContent className="bg-zinc-950">
                                      {prayerSettings.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                   </SelectContent>
                                </Select>
                             </div>
                          )}
                       </div>
                    </>
                 )}

                 <Button onClick={handleAddReminder} className="w-full h-20 bg-primary text-white rounded-[1.5rem] font-black text-2xl shadow-glow focusable">
                    {editingRemId ? <Edit2 className="w-8 h-8 ml-4" /> : <Plus className="w-8 h-8 ml-4" />}
                    {editingRemId ? "تحديث التذكير السيادي" : "حفظ التذكير السيادي الجديد"}
                 </Button>
              </div>

              <Tabs defaultValue="bell" className="w-full">
                 <TabsList className="bg-white/5 p-1 rounded-2xl h-14 mb-8 flex gap-2">
                    <TabsTrigger value="bell" className="flex-1 rounded-xl font-black text-xs transition-none focusable">تنبيهات الجرس</TabsTrigger>
                    <TabsTrigger value="play" className="flex-1 rounded-xl font-black text-xs transition-none focusable">تشغيل وسائط</TabsTrigger>
                    <TabsTrigger value="match" className="flex-1 rounded-xl font-black text-xs transition-none focusable">مركز المباريات</TabsTrigger>
                 </TabsList>
                 
                 <TabsContent value="bell" className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {reminders.filter(r => r.iconType === 'bell').map(rem => (
                       <div key={rem.id} className={cn("bg-black/60 p-8 rounded-[2.5rem] border flex items-center justify-between shadow-xl transition-all", editingRemId === rem.id ? "border-primary shadow-glow" : "border-white/10")}>
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-primary"><Bell className="w-7 h-7" /></div>
                            <div className="flex flex-col"><span className="text-2xl font-black text-white">{rem.label}</span><span className="text-[10px] font-bold text-white/20 uppercase">تنشيط: {rem.startType}</span></div>
                          </div>
                          <div className="flex gap-2">
                             <Button onClick={() => { setEditingRemId(rem.id); setRemForm(rem); }} variant="ghost" className="w-12 h-12 rounded-full text-emerald-400 hover:bg-emerald-400/10 focusable"><Edit2 className="w-6 h-6" /></Button>
                             <Button onClick={() => removeReminder(rem.id)} variant="ghost" className="w-12 h-12 rounded-full text-red-500 hover:bg-red-500/10 focusable"><Trash2 className="w-6 h-6" /></Button>
                          </div>
                       </div>
                    ))}
                 </TabsContent>

                 <TabsContent value="play" className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {reminders.filter(r => r.iconType === 'play').map(rem => (
                       <div key={rem.id} className={cn("bg-black/60 p-8 rounded-[2.5rem] border flex items-center justify-between shadow-xl transition-all", editingRemId === rem.id ? "border-primary shadow-glow" : "border-white/10")}>
                          <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-emerald-400"><Play className="w-7 h-7 fill-current" /></div>
                            <div className="flex flex-col"><span className="text-2xl font-black text-white">{rem.label}</span><span className="text-[10px] font-bold text-white/20 uppercase">تنشيط: {rem.startType}</span></div>
                          </div>
                          <div className="flex gap-2">
                             <Button onClick={() => { setEditingRemId(rem.id); setRemForm(rem); }} variant="ghost" className="w-12 h-12 rounded-full text-emerald-400 hover:bg-emerald-400/10 focusable"><Edit2 className="w-6 h-6" /></Button>
                             <Button onClick={() => removeReminder(rem.id)} variant="ghost" className="w-12 h-12 rounded-full text-red-500 hover:bg-red-500/10 focusable"><Trash2 className="w-6 h-6" /></Button>
                          </div>
                       </div>
                    ))}
                 </TabsContent>

                 <TabsContent value="match" className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {sortedMatchReminders.map(rem => (
                       <div key={rem.id} className={cn("bg-black/60 p-6 rounded-[2.5rem] border flex flex-col gap-4 shadow-xl transition-all relative overflow-hidden", editingRemId === rem.id ? "border-primary shadow-glow" : "border-white/10")}>
                          <div className="flex items-center justify-between gap-4 py-2">
                             <div className="flex flex-col items-center flex-1 gap-2">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 p-2 flex items-center justify-center border border-white/5 shadow-inner">
                                   {rem.homeLogo ? <img src={rem.homeLogo} className="w-full h-full object-contain" alt="" /> : <Trophy className="w-8 h-8 text-white/10" />}
                                </div>
                                <span className="text-[10px] font-black text-white/80 uppercase truncate w-full text-center">{rem.homeName || "HOME"}</span>
                             </div>
                             <div className="flex flex-col items-center justify-center min-w-[100px] gap-1">
                                <div className="text-3xl font-black text-white tabular-nums tracking-tighter">{rem.manualStartTime}</div>
                                <div className="px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-[9px] font-black text-primary uppercase">{rem.label || "مباراة"}</div>
                             </div>
                             <div className="flex flex-col items-center flex-1 gap-2">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 p-2 flex items-center justify-center border border-white/5 shadow-inner">
                                   {rem.awayLogo ? <img src={rem.awayLogo} className="w-full h-full object-contain" alt="" /> : <Trophy className="w-8 h-8 text-white/10" />}
                                </div>
                                <span className="text-[10px] font-black text-white/80 uppercase truncate w-full text-center">{rem.awayName || "AWAY"}</span>
                             </div>
                          </div>
                          
                          <div className="flex items-center justify-between pt-4 border-t border-white/5">
                             <div className="flex flex-col items-start gap-1">
                                <div className="flex items-center gap-2">
                                   <Calendar className="w-4 h-4 text-emerald-400" />
                                   <span className="text-sm font-black text-white tracking-tighter">{rem.matchDate}</span>
                                </div>
                                <span className="text-[10px] font-bold text-white/40 uppercase mr-6">{getDayName(rem.matchDate)}</span>
                             </div>
                             <div className="flex gap-2">
                                <Button onClick={() => skipMatch(rem.id)} variant="ghost" size="icon" className={cn("w-10 h-10 rounded-full", skippedMatchIds.includes(rem.id) ? "text-red-500" : "text-emerald-400")}><Eye className="w-5 h-5" /></Button>
                                <Button onClick={() => { setEditingRemId(rem.id); setRemForm(rem); if(rem.homeName) setHomeSearch(rem.homeName); if(rem.awayName) setAwaySearch(rem.awayName); }} variant="ghost" size="icon" className="w-10 h-10 rounded-full text-emerald-400"><Edit2 className="w-5 h-5" /></Button>
                                <Button onClick={() => removeReminder(rem.id)} variant="ghost" size="icon" className="w-10 h-10 rounded-full text-red-500"><Trash2 className="w-5 h-5" /></Button>
                             </div>
                          </div>
                       </div>
                    ))}
                 </TabsContent>
              </Tabs>
           </Card>
        </TabsContent>

        <TabsContent value="azkar" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl relative">
              <div className="flex justify-between items-center mb-12">
                 <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Bookmark className="w-12 h-12 text-emerald-400" /> إدارة الأذكار السيادية</CardTitle>
                 <Button onClick={() => handleDirectFetch(JSONBIN_MASTER_BIN_ID, "الأذكار")} variant="outline" className="w-14 h-14 rounded-full bg-white/5 border-white/10 flex items-center justify-center text-white/40 focusable"><CloudDownload className="w-6 h-6" /></Button>
              </div>

              <div className="bg-black/40 p-10 rounded-[3rem] border border-white/5 flex gap-6 mb-12 shadow-2xl">
                 <Input placeholder="أدخل نص الذكر السيادي الجديد..." value={zikrInput} onChange={(e) => setZikrInput(e.target.value)} className="h-16 bg-white/5 border-none rounded-xl text-2xl font-black text-white px-8 focusable flex-1" />
                 <Button onClick={handleAddGeneralZikr} className="h-16 px-12 bg-emerald-600 text-white text-xl font-black rounded-xl shadow-glow focusable">
                    {editingZikrId ? <Edit2 className="w-6 h-6 ml-3" /> : <Plus className="w-6 h-6 ml-3" />}
                    {editingZikrId ? "تحديث" : "إضافة"}
                 </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {generalAzkar.map(zikr => (
                   <div key={zikr.id} className={cn("bg-black/60 p-8 rounded-[2.5rem] border flex flex-col justify-between shadow-xl min-h-[160px] group transition-all", editingZikrId === zikr.id ? "border-emerald-500 shadow-glow" : "border-white/10 hover:border-emerald-500/20")}>
                      <p className="text-2xl font-black text-white leading-relaxed line-clamp-3">{zikr.label}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                         <div className="flex gap-2">
                            <button onClick={() => { setEditingZikrId(zikr.id); setZikrInput(zikr.label); }} className="w-10 h-10 rounded-full bg-emerald-600/20 text-emerald-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focusable"><Edit2 className="w-5 h-5" /></button>
                            <button onClick={() => removeAzkar(zikr.id)} className="w-10 h-10 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focusable"><Trash2 className="w-5 h-5" /></button>
                         </div>
                         <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">محفوظ سحابياً</span>
                      </div>
                   </div>
                 ))}
              </div>
           </Card>
        </TabsContent>

        <TabsContent value="reciters" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl relative">
              <div className="flex justify-between items-center mb-12">
                 <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Mic className="w-12 h-12 text-emerald-500" /> إدارة القراء</CardTitle>
                 <Button onClick={() => handleDirectFetch(JSONBIN_POPULAR_RECITERS_BIN_ID, "القراء")} variant="outline" className="w-14 h-14 rounded-full bg-white/5 border-white/10 flex items-center justify-center text-white/40 focusable"><CloudDownload className="w-6 h-6" /></Button>
              </div>

              <div className="bg-black/40 p-10 rounded-[3rem] border border-white/5 flex flex-col gap-6 mb-12 shadow-2xl">
                 <div className="flex gap-6">
                    <Input placeholder="...ابحث عن قارئ لإضافته من يوتيوب" value={reciterSearch} onChange={(e) => setReciterSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && performReciterSearch()} className="h-16 bg-white/5 border-white/10 rounded-2xl text-xl font-black text-white px-8 focusable flex-1" />
                    <Input type="number" placeholder="عدد الضغطات يدوياً..." value={reciterClickInput} onChange={(e) => setReciterClickInput(e.target.value)} className="h-16 w-48 bg-white/5 border-white/10 rounded-2xl text-center font-black text-white focusable" />
                    <Button onClick={performReciterSearch} className="h-16 px-12 bg-primary text-white text-xl font-black rounded-2xl shadow-glow focusable"><Search className="w-6 h-6 ml-3" /> ابحث</Button>
                 </div>
                 
                 {reciterResults.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 animate-in slide-in-from-top-4">
                       {reciterResults.map(res => (
                          <div key={res.channelid} onClick={() => handleAddReciterWithClicks(res)} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl hover:bg-white/10 cursor-pointer border border-white/5 focusable transition-all" tabIndex={0}>
                             <img src={res.image} className="w-12 h-12 rounded-full" alt="" />
                             <span className="font-black text-sm truncate">{res.name}</span>
                             <Plus className="w-4 h-4 mr-auto text-primary" />
                          </div>
                       ))}
                    </div>
                 )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {favoriteReciters.map(r => (
                  <div key={r.channelid} className="bg-black/60 p-8 rounded-[3rem] border border-white/10 flex flex-col items-center text-center group shadow-xl relative transition-all hover:border-primary/20">
                     <div className="relative mb-6">
                        <img src={r.image} className="w-32 h-32 rounded-full border-4 border-emerald-500/40 shadow-2xl" alt="" />
                        <div className="absolute -bottom-2 right-0 bg-emerald-500 text-black font-black text-[12px] px-3 py-1 rounded-full shadow-glow">{r.clickschannel || 0}</div>
                     </div>
                     
                     {editingReciterId === r.channelid ? (
                        <div className="flex gap-2 w-full mb-6 animate-in zoom-in-95">
                           <Input value={reciterNameInput} onChange={(e) => setReciterNameInput(e.target.value)} className="h-10 bg-white/5 border-white/10 rounded-xl font-black text-white" />
                           <button onClick={() => handleSaveReciterName(r.channelid)} className="w-10 h-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center"><Check className="w-5 h-5" /></button>
                        </div>
                     ) : (
                        <h3 className="text-xl font-black text-white mb-6 truncate w-full">{r.name}</h3>
                     )}

                     <div className="flex gap-2 w-full">
                        <Button onClick={() => { setEditingReciterId(r.channelid); setReciterNameInput(r.name); }} className="flex-1 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-2xl h-12 focusable"><Edit2 className="w-4 h-4 ml-2" /> تعديل</Button>
                        <Button onClick={() => removeReciter(r.channelid)} className="w-12 h-12 bg-red-600/10 text-red-500 border border-red-500/20 rounded-2xl h-12 focusable"><Trash2 className="w-4 h-4" /></Button>
                     </div>
                  </div>
                ))}
              </div>
           </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl relative">
              <div className="flex justify-between items-center mb-12">
                 <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Youtube className="w-12 h-12 text-red-600" /> البحث وإضافة الاشتراكات</CardTitle>
                 <Button onClick={() => handleDirectFetch(JSONBIN_CHANNELS_BIN_ID, "الاشتراكات")} variant="outline" className="w-14 h-14 rounded-full bg-white/5 border-white/10 flex items-center justify-center text-white/40 focusable"><CloudDownload className="w-6 h-6" /></Button>
              </div>

              <div className="bg-black/40 p-10 rounded-[3rem] border border-white/5 flex gap-6 mb-12 shadow-2xl">
                 <Input placeholder="...ابحث عن قناة يوتيوب لإضافتها" value={channelSearch} onChange={(e) => setChannelSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && performChannelSearch()} className="h-16 bg-white/5 border-white/10 rounded-2xl text-xl font-black text-white px-8 focusable flex-1" />
                 <Button onClick={performChannelSearch} className="h-16 px-12 bg-red-600 text-white text-xl font-black rounded-2xl shadow-glow focusable"><Search className="w-6 h-6 ml-3" /> ابحث</Button>
              </div>

              {channelResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12 animate-in slide-in-from-top-4">
                   {channelResults.map(res => (
                      <div key={res.channelid} onClick={() => { addChannel(res); toast({ title: "تم الإضافة" }); }} className="flex flex-col items-center gap-4 p-6 bg-white/5 rounded-[2.5rem] border border-white/10 hover:bg-white/10 cursor-pointer focusable transition-all" tabIndex={0}>
                         <img src={res.image} className="w-20 h-20 rounded-full" alt="" />
                         <span className="font-black text-xs text-center line-clamp-1">{res.name}</span>
                         <Plus className="w-6 h-6 text-primary" />
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
                        <div className="flex gap-2 w-full mb-6 animate-in zoom-in-95">
                           <Input value={channelNameInput} onChange={(e) => setChannelNameInput(e.target.value)} className="h-10 bg-white/5 border-white/10 rounded-xl font-black text-white" />
                           <button onClick={() => { setEditingChannelId(null); toast({ title: "تم التحديث" }); }} className="w-10 h-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center"><Check className="w-5 h-5" /></button>
                        </div>
                     ) : (
                        <h3 className="text-xl font-black text-white mb-6 truncate w-full">{c.name}</h3>
                     )}

                     <div className="flex gap-2 w-full">
                        <Button onClick={() => { setEditingChannelId(c.channelid); setChannelNameInput(c.name); }} className="flex-1 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-2xl h-12 focusable"><Edit2 className="w-4 h-4 ml-2" /> تحرير</Button>
                        <Button onClick={() => removeChannel(c.channelid)} className="w-12 h-12 bg-red-600/10 text-red-500 border border-red-500/20 rounded-2xl h-12 focusable"><Trash2 className="w-4 h-4" /></Button>
                     </div>
                  </div>
                ))}
              </div>
           </Card>
        </TabsContent>

        <TabsContent value="playlists" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl relative">
              <div className="flex justify-between items-center mb-12">
                 <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Library className="w-12 h-12 text-indigo-400" /> إدارة المجلدات السيادية</CardTitle>
                 <div className="flex gap-4">
                    <Button onClick={() => handleDirectFetch(JSONBIN_MASTER_BIN_ID, "المجلدات")} variant="outline" className="w-14 h-14 rounded-full bg-white/5 border-white/10 flex items-center justify-center text-white/40 focusable shadow-glow"><CloudDownload className="w-6 h-6" /></Button>
                    <Button onClick={() => setIsAddingPlaylist(true)} className="h-14 px-8 bg-indigo-600 text-white rounded-full font-black shadow-glow focusable"><Plus className="w-5 h-5 ml-2" /> إنشاء مجلد جديد</Button>
                 </div>
              </div>

              {isAddingPlaylist && (
                <div className="bg-black/40 p-10 rounded-[3rem] border border-white/5 flex gap-4 mb-12 shadow-2xl animate-in zoom-in-95">
                   <Input placeholder="أدخل اسم المجلد أو رابط قائمة تشغيل يوتيوب..." value={playlistInput} onChange={(e) => setPlaylistInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddPlaylistFromInput()} className="h-16 bg-white/5 border-white/10 rounded-2xl text-xl font-black focusable flex-1" />
                   <Button onClick={handleAddPlaylistFromInput} className="h-16 px-10 bg-indigo-600 text-white rounded-2xl font-black shadow-glow focusable"><Send className="w-6 h-6" /></Button>
                   <Button onClick={() => setIsAddingPlaylist(false)} className="h-16 px-6 bg-white/5 text-white rounded-2xl font-black focusable">إلغاء</Button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {playlists.map(p => (
                  <div key={p.id} className="bg-black/60 p-8 rounded-[3rem] border border-white/10 flex items-center justify-between group shadow-xl transition-all hover:border-indigo-500/20">
                    <div className="flex items-center gap-6">
                       <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 flex items-center justify-center border-2 border-indigo-500/40 shadow-glow"><Library className="w-7 h-7 text-indigo-400" /></div>
                       <div className="flex flex-col">
                          <span className="text-2xl font-black text-white">{p.name}</span>
                          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{p.videos.length} تلاوة</span>
                       </div>
                    </div>
                    <Button onClick={() => removePlaylist(p.id)} variant="ghost" className="w-12 h-12 rounded-full text-red-500 hover:bg-red-500/10 focusable"><Trash2 className="w-6 h-6" /></Button>
                  </div>
                ))}
              </div>
           </Card>
        </TabsContent>

        <TabsContent value="iptv" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl relative">
              <div className="flex justify-between items-center mb-12">
                 <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Tv className="w-12 h-12 text-emerald-500" /> إدارة قنوات IPTV السيادية</CardTitle>
                 <div className="flex gap-4">
                    <Button onClick={() => handleDirectFetch(JSONBIN_IPTV_FAVS_BIN_ID, "القنوات")} variant="outline" className="w-14 h-14 rounded-full bg-white/5 border-white/10 flex items-center justify-center text-white/40 focusable shadow-glow"><CloudDownload className="w-6 h-6" /></Button>
                    <Button onClick={() => { setIsAddingIptv(true); setIptvEditForm({ name: "", url: "", stream_icon: "" }); }} className="h-14 px-8 bg-emerald-600 text-white rounded-full font-black shadow-glow focusable"><Plus className="w-5 h-5 ml-2" /> إضافة قناة جديدة</Button>
                 </div>
              </div>

              {(isAddingIptv || editingIptvId) && (
                <div className="bg-black/40 p-10 rounded-[3rem] border border-white/10 space-y-8 mb-12 shadow-2xl animate-in zoom-in-95">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3"><Label className="mr-4 font-black opacity-40">اسم القناة</Label><Input value={iptvEditForm.name} onChange={(e) => setIptvEditForm({...iptvEditForm, name: e.target.value})} className="h-16 bg-white/5 border-white/10 rounded-2xl text-xl font-black focusable" /></div>
                      <div className="space-y-3"><Label className="mr-4 font-black opacity-40">أيقونة القناة (URL)</Label><Input value={iptvEditForm.stream_icon} onChange={(e) => setIptvEditForm({...iptvEditForm, stream_icon: e.target.value})} className="h-16 bg-white/5 border-white/10 rounded-2xl text-xl font-black focusable" /></div>
                   </div>
                   <div className="space-y-3"><Label className="mr-4 font-black opacity-40">رابط البث (M3U8 / URL)</Label><Input value={iptvEditForm.url} onChange={(e) => setIptvEditForm({...iptvEditForm, url: e.target.value})} className="h-16 bg-white/5 border-white/10 rounded-2xl text-xl font-black focusable" /></div>
                   <div className="flex gap-4">
                      <Button onClick={async () => {
                         if (isAddingIptv) addIptvChannel({ ...iptvEditForm, stream_id: "custom-"+Date.now(), category_id: "direct", type: 'web' });
                         else updateIptvChannel(editingIptvId!, iptvEditForm);
                         setIsAddingIptv(false); setEditingIptvId(null); toast({ title: "تم الحفظ سحابياً" });
                      }} className="flex-1 h-16 bg-primary text-white rounded-2xl font-black text-xl shadow-glow focusable">حفظ القناة</Button>
                      <Button onClick={() => { setIsAddingIptv(false); setEditingIptvId(null); }} className="h-16 px-10 bg-white/5 text-white rounded-2xl font-black focusable">إلغاء</Button>
                   </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {favoriteIptvChannels.map(ch => (
                   <div key={ch.stream_id} className="bg-black/60 p-8 rounded-[3rem] border border-white/10 flex items-center justify-between group shadow-xl">
                      <div className="flex items-center gap-6">
                        <img src={ch.stream_icon} className="w-16 h-16 rounded-2xl object-cover border border-white/10 shadow-glow" alt="" />
                        <div className="flex flex-col">
                           <span className="text-xl font-black text-white">{ch.name}</span>
                           <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest truncate max-w-[150px]">{ch.url}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                         <Button onClick={() => { setEditingIptvId(ch.stream_id); setIptvEditForm({ name: ch.name, url: ch.url, stream_icon: ch.stream_icon }); }} variant="ghost" className="w-10 h-10 rounded-full text-emerald-400 hover:bg-emerald-400/10 focusable"><Edit2 className="w-5 h-5" /></Button>
                         <Button onClick={() => toggleFavoriteIptvChannel(ch)} variant="ghost" className="w-10 h-10 rounded-full text-red-500 hover:bg-red-500/10 focusable"><Trash2 className="w-5 h-5" /></Button>
                      </div>
                   </div>
                 ))}
              </div>
           </Card>
        </TabsContent>

        <TabsContent value="backgrounds" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl relative">
              <div className="flex justify-between items-center mb-12">
                 <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Palette className="w-12 h-12 text-pink-500" /> إدارة الخلفيات والبيئة البصرية</CardTitle>
                 <div className="flex gap-4">
                    <Button onClick={() => handleDirectFetch(JSONBIN_BACKGROUNDS_BIN_ID, "الخلفيات")} variant="outline" className="w-14 h-14 rounded-full bg-white/5 border-white/10 flex items-center justify-center text-white/40 focusable shadow-glow"><CloudDownload className="w-6 h-6" /></Button>
                    <button onClick={() => document.getElementById('bg-upload-input')?.click()} className="h-14 px-8 bg-pink-600 text-white rounded-full font-black shadow-glow focusable"><Upload className="w-5 h-5 ml-2" /> رفع خلفية جديدة</button>
                    <input id="bg-upload-input" type="file" className="hidden" accept="image/*" onChange={(e) => {
                       const file = e.target.files?.[0]; if (!file) return;
                       const reader = new FileReader();
                       reader.onload = (res) => { addCustomWallBackground(res.target?.result as string); toast({ title: "تم الرفع سحابياً" }); };
                       reader.readAsDataURL(file);
                    }} />
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {customWallBackgrounds.map((url, idx) => (
                    <div key={idx} className="relative aspect-video rounded-[2.5rem] overflow-hidden border-4 border-white/5 group shadow-2xl transition-all hover:border-pink-500/20">
                       <img src={url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <Button onClick={async () => { updateMapSettings({ manuscriptBgUrl: url }); await syncMasterBin(); toast({ title: "تم تعيين الخلفية سحابياً" }); }} className="bg-white text-black font-black rounded-xl focusable">تطبيق كخلفية</Button>
                          <Button onClick={() => removeCustomWallBackground(url)} variant="ghost" className="w-12 h-12 rounded-full bg-red-600 text-white"><Trash2 className="w-6 h-6" /></Button>
                       </div>
                    </div>
                 ))}
              </div>
           </Card>
        </TabsContent>

        <TabsContent value="buttonmap" className="space-y-8 animate-in fade-in duration-0">
           <Card className="bg-white/5 border-white/10 p-10 rounded-[3.5rem] shadow-2xl relative">
              <div className="flex justify-between items-center mb-12">
                 <CardTitle className="text-4xl font-black text-white flex items-center gap-6"><Gamepad2 className="w-12 h-12 text-primary" /> معايرة التحكم السيادية v1560.0</CardTitle>
                 <div className="flex gap-4">
                    <Button onClick={() => handleDirectFetch(JSONBIN_MASTER_BIN_ID, "الأزرار")} variant="outline" className="w-14 h-14 rounded-full bg-white/5 border-white/10 flex items-center justify-center text-white/40 focusable shadow-glow"><CloudDownload className="w-6 h-6" /></Button>
                    <Button onClick={async () => { setIsSyncing(true); await syncMasterBin(); setIsSyncing(false); toast({ title: "تم الحفظ سحابياً" }); }} className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-glow focusable">{isSyncing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6" />}</Button>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                 <div className="p-8 bg-emerald-600/5 rounded-[3rem] border-2 border-emerald-500/20 space-y-6 shadow-xl">
                    <h3 className="text-xl font-black text-emerald-400 mb-4 flex items-center gap-3"><Magnet className="w-6 h-6" /> المعايرة الذكية للشاشات الصغيرة</h3>
                    <div className="flex items-center justify-between bg-black/40 p-6 rounded-2xl border border-white/5 shadow-2xl"><Label className="text-xl font-black text-white">تدوير الملاحة 90 درجة</Label><Switch checked={mapSettings.autoRotateNav90 ?? true} onCheckedChange={(v) => updateMapSettings({ autoRotateNav90: v })} /></div>
                    <div className="flex items-center justify-between bg-black/40 p-6 rounded-2xl border border-white/5 shadow-2xl"><Label className="text-xl font-black text-white">عكس الاتجاه الرأسي (Y)</Label><Switch checked={mapSettings.invertJoystickY ?? true} onCheckedChange={(v) => updateMapSettings({ invertJoystickY: v })} /></div>
                    <div className="flex items-center justify-between bg-black/40 p-6 rounded-2xl border border-white/5 shadow-2xl"><Label className="text-xl font-black text-white">عكس الاتجاه الأفقي (X)</Label><Switch checked={mapSettings.invertJoystickX ?? true} onCheckedChange={(v) => updateMapSettings({ invertJoystickX: v })} /></div>
                    <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest px-4 text-center">* تعمل هذه المعايرة آلياً ومفعلة بشكل تلقائي للشاشات الصغيرة</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {Object.entries(keyMappings).map(([ctx, actions]) => (
                   <div key={ctx} className="p-8 bg-black/40 rounded-[3rem] border border-white/10 shadow-xl transition-none">
                      <h3 className="text-2xl font-black text-primary mb-6 uppercase tracking-widest flex items-center gap-3"><Keyboard className="w-6 h-6" /> {ctx}</h3>
                      <div className="space-y-4">
                         {Object.entries(actions).map(([act, keys]) => (
                           <div key={act} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 transition-none group hover:bg-white/10">
                              <span className="text-sm font-bold text-white/60 uppercase">{act}</span>
                              <div className="flex gap-2">
                                {(Array.isArray(keys) ? keys : []).map(k => (
                                  <div key={k} className="px-3 py-1.5 bg-zinc-800 rounded-xl border border-zinc-600 flex items-center gap-3 shadow-glow"><span className="text-xs font-black text-white">{k}</span><button onClick={() => removeSpecificKeyMapping(ctx as any, act as any, k)} className="text-red-500 focusable transition-colors hover:text-red-400"><X className="w-3.5 h-3.5" /></button></div>
                                ))}
                                
                                <Dialog open={isRecordingKey && recordingAction?.ctx === ctx && recordingAction?.act === act} onOpenChange={(v) => { if(!v) { setIsRecordingKey(false); setRecordingAction(null); } }}>
                                   <DialogTrigger asChild>
                                      <button onClick={() => startRecording(ctx as any, act as any)} className="text-accent text-[10px] font-black focusable animate-pulse px-3 py-1.5 rounded-xl border border-accent/20 hover:bg-accent/10">سجل</button>
                                   </DialogTrigger>
                                   <DialogContent className="max-w-none w-screen h-screen bg-black/95 backdrop-blur-3xl border-none p-20 flex flex-col items-center justify-center">
                                      <div className="absolute top-10 right-10 z-[200]">
                                         <button onClick={() => { setIsRecordingKey(false); setRecordingAction(null); }} className="w-20 h-20 rounded-full bg-red-600/20 text-red-500 border-2 border-red-500/40 flex items-center justify-center shadow-glow focusable active:scale-90 transition-all"><X className="w-10 h-10" /></button>
                                      </div>
                                      <DialogHeader className="mb-20 text-center">
                                         <DialogTitle className="text-6xl font-black text-white tracking-widest uppercase mb-4">برمجة المفتاح السيادي</DialogTitle>
                                         <p className="text-primary font-bold uppercase tracking-[0.5em]">الإجراء: {act} | السياق: {ctx}</p>
                                      </DialogHeader>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-20 w-full max-w-6xl">
                                         <div className="bg-white/5 p-12 rounded-[4rem] border-2 border-white/10 flex flex-col items-center justify-center gap-8 shadow-2xl">
                                            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-4 border-primary/40 animate-pulse shadow-glow">
                                               <Mic className="w-12 h-12 text-primary" />
                                            </div>
                                            <h3 className="text-3xl font-black text-white">التسجيل بالضغط المباشر</h3>
                                            <p className="text-white/40 text-center font-bold">اضغط على أي زر في الريموت أو لوحة المفاتيح الآن للتسجيل الآلي</p>
                                         </div>

                                         <div className="bg-white/5 p-12 rounded-[4rem] border-2 border-white/10 flex flex-col gap-8 shadow-2xl">
                                            <h3 className="text-3xl font-black text-white text-center">الاختيار من مكتبة المفاتيح</h3>
                                            <ScrollArea className="h-[400px] pr-4">
                                               <div className="grid grid-cols-3 gap-4">
                                                  {COMMAND_KEYS.map((ck) => (
                                                     <button 
                                                        key={ck.key} 
                                                        onClick={() => { setKeyMapping(ctx as any, act as any, ck.key); toast({ title: "تم البرمجة", description: `تم ربط المفتاح ${ck.key}` }); }}
                                                        className={cn("p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 border border-white/5", ck.color)}
                                                     >
                                                        {ck.icon ? <ck.icon className="w-6 h-6 text-white" /> : <span className="text-xs font-black text-white">{ck.key}</span>}
                                                        <span className="text-[8px] font-bold text-white/60 uppercase">{ck.label}</span>
                                                     </button>
                                                  ))}
                                               </div>
                                            </ScrollArea>
                                         </div>
                                      </div>
                                   </DialogContent>
                                </Dialog>
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
