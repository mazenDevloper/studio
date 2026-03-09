
"use client";

import { useState, useCallback } from "react";
import { useMediaStore, Reminder } from "@/lib/store";
import { 
  Settings, 
  Bell, 
  Trophy, 
  Info, 
  ShieldCheck, 
  Trash2, 
  Plus, 
  Maximize, 
  Search, 
  Star,
  Palette,
  Loader2,
  Globe,
  Edit2,
  Clock,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { searchFootballTeams } from "@/lib/football-api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BACKGROUNDS = [
  "https://images.unsplash.com/photo-1534067783941-51c9c23ecefd",
  "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa",
  "https://images.unsplash.com/photo-1594911772125-07fc7a2d8d9f",
  "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0"
];

const PRAYERS = [
  { id: 'fajr', name: 'الفجر' },
  { id: 'sunrise', name: 'الشروق' },
  { id: 'dhuhr', name: 'الظهر' },
  { id: 'asr', name: 'العصر' },
  { id: 'maghrib', name: 'المغرب' },
  { id: 'isha', name: 'العشاء' },
  { id: 'manual', name: 'يدوي (وقت محدد)' },
];

export function SettingsView() {
  const { 
    reminders, 
    addReminder, 
    removeReminder, 
    updateReminder,
    favoriteTeams, 
    toggleFavoriteTeam,
    mapSettings, 
    updateMapSettings 
  } = useMediaStore();
  const { toast } = useToast();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Reminder>>({
    label: "",
    relativePrayer: "manual",
    manualTime: "08:00",
    offsetMinutes: 0,
    showCountdown: true,
    countdownWindow: 10,
    showCountup: true,
    countupWindow: 10,
    color: "text-blue-400",
    iconType: "bell"
  });

  const [clubSearch, setClubSearch] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("all");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleGlobalSearch = useCallback(async () => {
    setIsSearching(true);
    try {
      const results = await searchFootballTeams(clubSearch, leagueFilter);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  }, [clubSearch, leagueFilter]);

  const handleSubmitReminder = () => {
    if (!form.label?.trim()) return;
    
    const reminderData: Reminder = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      label: form.label!,
      relativePrayer: (form.relativePrayer as any) || 'manual',
      manualTime: form.manualTime,
      offsetMinutes: form.offsetMinutes || 0,
      showCountdown: form.showCountdown ?? true,
      countdownWindow: form.countdownWindow || 10,
      showCountup: form.showCountup ?? true,
      countupWindow: form.countupWindow || 10,
      completed: false,
      color: form.color || 'text-blue-400',
      iconType: 'bell',
    };

    if (editingId) {
      updateReminder(editingId, reminderData);
      setEditingId(null);
      toast({ title: "تم التعديل", description: "تم تحديث التذكير بنجاح." });
    } else {
      addReminder(reminderData);
      toast({ title: "تمت الإضافة", description: "تمت إضافة التذكير بنجاح." });
    }
    
    setForm({ 
      label: "", 
      relativePrayer: "manual", 
      manualTime: "08:00", 
      offsetMinutes: 0, 
      showCountdown: true, 
      countdownWindow: 10, 
      showCountup: true, 
      countupWindow: 10, 
      color: "text-blue-400", 
      iconType: "bell" 
    });
  };

  const handleEdit = (r: Reminder) => {
    setEditingId(r.id);
    setForm(r);
  };

  return (
    <div className="p-12 space-y-12 max-w-7xl mx-auto pb-40 animate-in fade-in duration-700 text-right dir-rtl">
      <header className="flex flex-col gap-4">
        <h1 className="text-6xl font-black font-headline text-white tracking-tighter flex items-center gap-6">
          مركز التحكم <Settings className="w-12 h-12 text-primary animate-spin-slow" />
        </h1>
        <p className="text-white/40 font-bold uppercase tracking-[0.6em] text-sm">System Configuration & Preferences</p>
      </header>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="bg-white/5 p-1 rounded-full border border-white/10 h-16 mb-12 flex justify-start w-fit overflow-x-auto no-scrollbar">
          <TabsTrigger value="appearance" className="rounded-full px-10 h-full data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-lg focusable">
            <Palette className="w-5 h-5 ml-3" /> المظهر
          </TabsTrigger>
          <TabsTrigger value="reminders" className="rounded-full px-10 h-full data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-lg focusable">
            <Bell className="w-5 h-5 ml-3" /> التذكيرات الذكية
          </TabsTrigger>
          <TabsTrigger value="football" className="rounded-full px-10 h-full data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-lg focusable">
            <Trophy className="w-5 h-5 ml-3" /> الرياضة
          </TabsTrigger>
          <TabsTrigger value="system" className="rounded-full px-10 h-full data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-lg focusable">
            <Info className="w-5 h-5 ml-3" /> النظام
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-8 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-zinc-900/50 border-white/10 rounded-[3rem] p-10 space-y-8">
              <CardTitle className="text-2xl font-black text-white flex items-center gap-4">
                <Maximize className="w-8 h-8 text-primary" /> زوم المتصفح
              </CardTitle>
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">زوم الخريطة</label>
                    <span className="text-primary font-black text-lg bg-primary/10 px-4 py-1 rounded-lg border border-primary/20">{mapSettings.zoom.toFixed(1)}</span>
                  </div>
                  <Slider value={[mapSettings.zoom]} min={15} max={21} step={0.1} onValueChange={([val]) => updateMapSettings({ zoom: val })} className="cursor-pointer focusable" />
                </div>
              </div>
            </Card>
            <Card className="bg-zinc-900/50 border-white/10 rounded-[3rem] p-10">
              <CardTitle className="text-2xl font-black text-white mb-6">الخلفية</CardTitle>
              <div className="grid grid-cols-2 gap-4 h-64">
                {BACKGROUNDS.map((bg, idx) => (
                  <button key={idx} onClick={() => updateMapSettings({ backgroundIndex: idx })} className={cn("relative rounded-2xl overflow-hidden border-4 transition-all focusable", mapSettings.backgroundIndex === idx ? "border-primary scale-105 shadow-glow" : "border-transparent opacity-40 hover:opacity-100")}>
                    <img src={`${bg}?auto=format&fit=crop&q=40&w=300`} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-12 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 space-y-8">
              <Card className="bg-zinc-900/50 border-white/10 rounded-[3rem] p-10 space-y-6">
                <CardTitle className="text-2xl font-black text-white flex items-center gap-4 mb-4">
                  <Plus className="w-8 h-8 text-accent" /> {editingId ? "تعديل التذكير" : "إضافة تذكير ذكي"}
                </CardTitle>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">اسم التذكير</label>
                    <Input placeholder="مثلاً: صلاة الضحى" className="bg-white/5 border-white/10 h-14 rounded-2xl px-6 focusable text-right text-xl" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">نوع التوقيت</label>
                      <Select value={form.relativePrayer} onValueChange={(val) => setForm({ ...form, relativePrayer: val as any })}>
                        <SelectTrigger className="bg-white/5 border-white/10 h-14 rounded-2xl focusable text-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white rounded-2xl">
                          {PRAYERS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {form.relativePrayer === 'manual' ? (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">وقت التذكير (ساعة:دقيقة)</label>
                        <Input type="time" className="bg-white/5 border-white/10 h-14 rounded-2xl px-6 focusable text-center text-xl" value={form.manualTime} onChange={(e) => setForm({ ...form, manualTime: e.target.value })} />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">الإزاحة (بعد/قبل بالدقائق)</label>
                        <Input type="number" placeholder="مثلاً: 15" className="bg-white/5 border-white/10 h-14 rounded-2xl px-6 focusable text-center text-xl" value={form.offsetMinutes} onChange={(e) => setForm({ ...form, offsetMinutes: parseInt(e.target.value) || 0 })} />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-8 py-4 border-y border-white/5">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">العد التنازلي (-)</label>
                        <Switch checked={form.showCountdown} onCheckedChange={(val) => setForm({...form, showCountdown: val})} />
                      </div>
                      <div className={cn("space-y-2 transition-opacity", !form.showCountdown && "opacity-20 pointer-events-none")}>
                        <span className="text-[9px] text-primary/60 font-bold">مدة الظهور قبل الحدث</span>
                        <Input type="number" className="bg-white/5 border-white/10 h-12 rounded-xl px-4 text-center focusable" value={form.countdownWindow} onChange={(e) => setForm({...form, countdownWindow: parseInt(e.target.value) || 0})} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">العد التصاعدي (+)</label>
                        <Switch checked={form.showCountup} onCheckedChange={(val) => setForm({...form, showCountup: val})} />
                      </div>
                      <div className={cn("space-y-2 transition-opacity", !form.showCountup && "opacity-20 pointer-events-none")}>
                        <span className="text-[9px] text-accent/60 font-bold">مدة البقاء بعد الحدث</span>
                        <Input type="number" className="bg-white/5 border-white/10 h-12 rounded-xl px-4 text-center focusable" value={form.countupWindow} onChange={(e) => setForm({...form, countupWindow: parseInt(e.target.value) || 0})} />
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSubmitReminder} className="w-full h-16 bg-primary text-white font-black text-2xl rounded-2xl shadow-xl hover:scale-[1.02] transition-all focusable">
                    {editingId ? "تحديث التذكير" : "حفظ التذكير وربطه بالجزيرة"}
                  </Button>
                  
                  {editingId && (
                    <Button variant="ghost" onClick={() => { 
                      setEditingId(null); 
                      setForm({ label: "", relativePrayer: "manual", manualTime: "08:00", offsetMinutes: 0, showCountdown: true, countdownWindow: 10, showCountup: true, countupWindow: 10, color: "text-blue-400", iconType: "bell" }); 
                    }} className="w-full h-12 text-white/40">إلغاء التعديل</Button>
                  )}
                </div>
              </Card>
            </div>

            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center justify-between px-4">
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                  <Zap className="w-6 h-6 text-accent" /> التذكيرات النشطة
                </h2>
                <span className="text-xs text-white/40 font-bold uppercase tracking-widest">{reminders.length} تذكير</span>
              </div>
              
              <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[600px] pr-2 no-scrollbar">
                {reminders.length === 0 ? (
                  <div className="py-32 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10 flex flex-col items-center gap-4">
                    <Bell className="w-16 h-16 text-white/5" />
                    <p className="text-white/20 font-bold uppercase tracking-widest">لا توجد تذكيرات مخصصة حالياً</p>
                  </div>
                ) : reminders.map((r) => {
                  const colorClass = r.color || 'text-blue-400';
                  return (
                    <Card key={r.id} className="bg-zinc-900/50 border-white/5 rounded-[2.5rem] p-6 hover:border-primary/40 transition-all group relative overflow-hidden">
                      <div className="flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-6">
                          <div className={cn(
                            "w-16 h-16 rounded-3xl flex items-center justify-center border-2 transition-all", 
                            colorClass.replace('text-', 'bg-') + '/10', 
                            colorClass.replace('text-', 'border-') + '/20'
                          )}>
                            <Bell className={cn("w-8 h-8", colorClass)} />
                          </div>
                          <div className="flex flex-col gap-1 text-right">
                            <h3 className="font-black text-2xl text-white tracking-tight">{r.label}</h3>
                            <div className="flex items-center gap-3 text-[10px] font-black text-white/40 uppercase tracking-[0.1em]">
                              <span className="bg-white/10 px-3 py-1 rounded-full flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                {r.relativePrayer === 'manual' ? `وقت ثابت: ${r.manualTime}` : `مرتبط بـ ${PRAYERS.find(p => p.id === r.relativePrayer)?.name}`}
                              </span>
                              {r.relativePrayer !== 'manual' && (
                                <span className="text-accent">{r.offsetMinutes >= 0 ? `بعد بـ ${r.offsetMinutes} د` : `قبل بـ ${Math.abs(r.offsetMinutes)} د`}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(r)} className="w-14 h-14 rounded-full bg-white/5 hover:bg-white/10 text-white focusable">
                            <Edit2 className="w-6 h-6" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => removeReminder(r.id)} className="w-14 h-14 rounded-full bg-red-600/10 hover:bg-red-600 text-white focusable">
                            <Trash2 className="w-6 h-6" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="football" className="space-y-12 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
              <Card className="bg-zinc-900/50 border-white/10 rounded-[2.5rem] p-8">
                <CardTitle className="text-xl font-black text-white flex items-center gap-3 mb-6">
                  <Globe className="w-6 h-6 text-primary" /> Club Scout
                </CardTitle>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Team Name</label>
                    <Input placeholder="Search teams..." className="bg-white/5 border-white/10 h-14 px-6 rounded-2xl focusable text-right" value={clubSearch} onChange={(e) => setClubSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch()} />
                  </div>
                  <Button onClick={handleGlobalSearch} disabled={isSearching} className="w-full h-14 rounded-2xl bg-primary text-white font-black focusable">
                    {isSearching ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6 ml-2" />} Scout DB
                  </Button>
                </div>
              </Card>
            </div>
            <div className="lg:col-span-8 flex flex-col gap-8">
              <Card className="bg-zinc-900/50 border-white/10 rounded-[2.5rem] p-8 flex-1">
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="text-xl font-black text-white flex items-center gap-3">
                     المفضلات الحالية <Star className="w-6 h-6 text-yellow-500 fill-current" />
                  </CardTitle>
                </CardHeader>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {favoriteTeams.map((team) => (
                    <div key={team.id} className="p-4 rounded-[1.5rem] bg-primary/10 border border-primary/30 flex flex-col items-center gap-3 group animate-in zoom-in-95">
                       <img src={team.logo} className="w-14 h-14 object-contain" alt="" />
                       <span className="text-[10px] font-black text-center truncate w-full text-primary uppercase">{team.name}</span>
                       <Button onClick={() => toggleFavoriteTeam(team)} size="icon" className="w-10 h-10 rounded-full bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white transition-all">
                          <Trash2 className="w-5 h-5" />
                       </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-8 outline-none">
          <Card className="bg-zinc-900/50 border-white/10 rounded-[3rem] p-10 flex flex-col items-center gap-6 text-center">
             <ShieldCheck className="w-12 h-12 text-accent" />
             <h3 className="text-2xl font-black text-white">النظام مفعل وبحالة ممتازة</h3>
             <span className="text-sm text-white/40 uppercase tracking-[0.4em]">v3.8.5 Island Precision Ultimate</span>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
