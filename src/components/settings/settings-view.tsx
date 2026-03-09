
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
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleGlobalSearch = useCallback(async () => {
    setIsSearching(true);
    try {
      const results = await searchFootballTeams(clubSearch);
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  }, [clubSearch]);

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
    setForm({ label: "", relativePrayer: "manual", manualTime: "08:00", offsetMinutes: 0, showCountdown: true, countdownWindow: 10, showCountup: true, countupWindow: 10, color: "text-blue-400", iconType: "bell" });
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
        <TabsList className="bg-white/5 p-1 rounded-full border border-white/10 h-16 mb-12 flex justify-start w-fit">
          <TabsTrigger value="appearance" className="rounded-full px-10 h-full data-[state=active]:bg-primary font-bold text-lg">المظهر</TabsTrigger>
          <TabsTrigger value="reminders" className="rounded-full px-10 h-full data-[state=active]:bg-primary font-bold text-lg">التذكيرات</TabsTrigger>
          <TabsTrigger value="football" className="rounded-full px-10 h-full data-[state=active]:bg-primary font-bold text-lg">الرياضة</TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="grid grid-cols-1 lg:grid-cols-2 gap-8 outline-none">
          <Card className="bg-zinc-900/50 border-white/10 rounded-[3rem] p-10 space-y-8">
            <CardTitle className="text-2xl font-black text-white">زوم الخريطة</CardTitle>
            <Slider value={[mapSettings.zoom]} min={15} max={21} step={0.1} onValueChange={([v]) => updateMapSettings({ zoom: v })} />
          </Card>
          <Card className="bg-zinc-900/50 border-white/10 rounded-[3rem] p-10">
            <CardTitle className="text-2xl font-black text-white mb-6">الخلفية</CardTitle>
            <div className="grid grid-cols-2 gap-4 h-64">
              {BACKGROUNDS.map((bg, idx) => (
                <button key={idx} onClick={() => updateMapSettings({ backgroundIndex: idx })} className={cn("relative rounded-2xl overflow-hidden border-4", mapSettings.backgroundIndex === idx ? "border-primary" : "border-transparent opacity-40")}>
                  <img src={`${bg}?auto=format&fit=crop&q=40&w=300`} className="w-full h-full object-cover" alt="" />
                </button>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="grid grid-cols-1 lg:grid-cols-12 gap-8 outline-none">
          <div className="lg:col-span-6 space-y-8">
            <Card className="bg-zinc-900/50 border-white/10 rounded-[3rem] p-10 space-y-6">
              <CardTitle className="text-2xl font-black text-white">{editingId ? "تعديل التذكير" : "إضافة تذكير ذكي"}</CardTitle>
              <div className="space-y-6">
                <Input placeholder="اسم التذكير..." className="bg-white/5 border-white/10 h-14 rounded-2xl px-6 text-right text-xl" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
                <div className="grid grid-cols-2 gap-6">
                  <Select value={form.relativePrayer} onValueChange={(v) => setForm({ ...form, relativePrayer: v as any })}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-14 rounded-2xl"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      {PRAYERS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {form.relativePrayer === 'manual' ? (
                    <Input type="time" className="bg-white/5 border-white/10 h-14 rounded-2xl px-6 text-center text-xl" value={form.manualTime} onChange={(e) => setForm({ ...form, manualTime: e.target.value })} />
                  ) : (
                    <Input type="number" placeholder="الإزاحة..." className="bg-white/5 border-white/10 h-14 rounded-2xl px-6 text-center text-xl" value={form.offsetMinutes} onChange={(e) => setForm({ ...form, offsetMinutes: parseInt(e.target.value) || 0 })} />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-8 py-4 border-y border-white/5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-white/40">العد التنازلي (-)</label>
                    <Switch checked={form.showCountdown} onCheckedChange={(v) => setForm({...form, showCountdown: v})} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-white/40">العد التصاعدي (+)</label>
                    <Switch checked={form.showCountup} onCheckedChange={(v) => setForm({...form, showCountup: v})} />
                  </div>
                </div>
                <Button onClick={handleSubmitReminder} className="w-full h-16 bg-primary text-white font-black text-2xl rounded-2xl shadow-xl">حفظ التذكير</Button>
              </div>
            </Card>
          </div>
          <div className="lg:col-span-6 space-y-6 overflow-y-auto max-h-[600px] pr-2 no-scrollbar">
            {reminders.map((r) => {
              const color = r.color || 'text-blue-400';
              return (
                <Card key={r.id} className="bg-zinc-900/50 border-white/5 rounded-[2.5rem] p-6 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center border-2 transition-all", color.replace('text-', 'bg-') + '/10', color.replace('text-', 'border-') + '/20')}>
                        <Bell className={cn("w-8 h-8", color)} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <h3 className="font-black text-2xl text-white">{r.label}</h3>
                        <span className="text-[10px] font-black text-white/40 uppercase">{r.relativePrayer === 'manual' ? r.manualTime : `${PRAYERS.find(p => p.id === r.relativePrayer)?.name} (${r.offsetMinutes >= 0 ? '+' : ''}${r.offsetMinutes})`}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(r)} className="w-14 h-14 rounded-full bg-white/5"><Edit2 className="w-6 h-6" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => removeReminder(r.id)} className="w-14 h-14 rounded-full bg-red-600/10 text-red-500"><Trash2 className="w-6 h-6" /></Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="football" className="outline-none">
          <Card className="bg-zinc-900/50 border-white/10 rounded-[3rem] p-10">
            <Input placeholder="بحث عن أندية..." value={clubSearch} onChange={(e) => setClubSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleGlobalSearch()} className="h-14 bg-white/5 border-white/10 mb-6 text-right" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {favoriteTeams.map(t => (
                <div key={t.id} className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col items-center gap-3">
                  <img src={t.logo} className="w-12 h-12 object-contain" alt="" />
                  <span className="text-[10px] font-black text-primary">{t.name}</span>
                  <Button onClick={() => toggleFavoriteTeam(t)} size="icon" className="w-8 h-8 rounded-full bg-red-600/20 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
