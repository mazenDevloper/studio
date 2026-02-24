
"use client";

import { useState } from "react";
import { useMediaStore, Reminder } from "@/lib/store";
import { 
  Settings, 
  Youtube, 
  Bell, 
  Trophy, 
  Info, 
  ShieldCheck, 
  Trash2, 
  Plus, 
  Save, 
  Key, 
  RefreshCw,
  Clock,
  Palette,
  Monitor,
  Maximize,
  Compass,
  Image as ImageIcon
} from "lucide-react";
import { YT_KEYS_POOL } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { AVAILABLE_TEAMS } from "@/lib/football-data";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const BACKGROUNDS = [
  "https://images.unsplash.com/photo-1534067783941-51c9c23ecefd",
  "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa",
  "https://images.unsplash.com/photo-1594911772125-07fc7a2d8d9f",
  "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0"
];

export function SettingsView() {
  const { 
    reminders, 
    addReminder, 
    removeReminder, 
    favoriteTeams, 
    toggleFavoriteTeam, 
    mapSettings, 
    updateMapSettings 
  } = useMediaStore();
  const { toast } = useToast();
  
  const [newReminder, setNewReminder] = useState({ label: "", startHour: 6, endHour: 22 });

  const handleAddReminder = () => {
    if (!newReminder.label.trim()) return;
    const reminder: Reminder = {
      id: Math.random().toString(36).substr(2, 9),
      label: newReminder.label,
      iconType: 'bell',
      completed: false,
      color: 'text-blue-400',
      startHour: newReminder.startHour,
      endHour: newReminder.endHour,
    };
    addReminder(reminder);
    setNewReminder({ label: "", startHour: 6, endHour: 22 });
    toast({ title: "تمت الإضافة", description: "تمت إضافة التذكير بنجاح." });
  };

  const saveToCache = () => {
    toast({
      title: "تم الحفظ بنجاح",
      description: "تم تخزين إعدادات الزوم والمنظور في الذاكرة المحلية المستديمة.",
    });
  };

  return (
    <div className="p-12 space-y-12 max-w-6xl mx-auto pb-40 animate-in fade-in duration-700">
      <header className="flex flex-col gap-4">
        <h1 className="text-6xl font-black font-headline text-white tracking-tighter flex items-center gap-6">
          مركز التحكم <Settings className="w-12 h-12 text-primary animate-spin-slow" />
        </h1>
        <p className="text-white/40 font-bold uppercase tracking-[0.6em] text-sm">System Configuration & Preferences</p>
      </header>

      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="bg-white/5 p-1 rounded-full border border-white/10 h-16 mb-12 flex justify-start w-fit overflow-x-auto no-scrollbar">
          <TabsTrigger value="appearance" className="rounded-full px-10 h-full data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-lg whitespace-nowrap">
            <Palette className="w-5 h-5 mr-3" /> المظهر والزوم
          </TabsTrigger>
          <TabsTrigger value="youtube" className="rounded-full px-10 h-full data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-lg whitespace-nowrap">
            <Youtube className="w-5 h-5 mr-3" /> YouTube
          </TabsTrigger>
          <TabsTrigger value="reminders" className="rounded-full px-10 h-full data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-lg whitespace-nowrap">
            <Bell className="w-5 h-5 mr-3" /> التذكيرات
          </TabsTrigger>
          <TabsTrigger value="football" className="rounded-full px-10 h-full data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-lg whitespace-nowrap">
            <Trophy className="w-5 h-5 mr-3" /> الرياضة
          </TabsTrigger>
          <TabsTrigger value="system" className="rounded-full px-10 h-full data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-lg whitespace-nowrap">
            <Info className="w-5 h-5 mr-3" /> النظام
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appearance" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="bg-zinc-900/50 border-white/10 rounded-[3rem] p-10 space-y-8">
              <CardTitle className="text-2xl font-black text-white flex items-center gap-4">
                <Maximize className="w-6 h-6 text-primary" /> زوم المتصفح والتحكم بالمنظور
              </CardTitle>
              
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <label className="text-xs font-black text-white/40 uppercase tracking-widest">زوم المتصفح (Map Zoom)</label>
                    <span className="text-primary font-bold">{mapSettings.zoom.toFixed(1)}</span>
                  </div>
                  <Slider 
                    value={[mapSettings.zoom]} 
                    min={15} max={21} step={0.1} 
                    onValueChange={([val]) => updateMapSettings({ zoom: val })} 
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <label className="text-xs font-black text-white/40 uppercase tracking-widest">إمالة الكاميرا (Tilt)</label>
                    <span className="text-primary font-bold">{mapSettings.tilt}°</span>
                  </div>
                  <Slider 
                    value={[mapSettings.tilt]} 
                    min={0} max={85} step={5} 
                    onValueChange={([val]) => updateMapSettings({ tilt: val })} 
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <label className="text-xs font-black text-white/40 uppercase tracking-widest">حجم السيارة (Car Scale)</label>
                    <span className="text-primary font-bold">{mapSettings.carScale.toFixed(2)}</span>
                  </div>
                  <Slider 
                    value={[mapSettings.carScale]} 
                    min={0.5} max={2.5} step={0.05} 
                    onValueChange={([val]) => updateMapSettings({ carScale: val })} 
                  />
                </div>
              </div>

              <Button onClick={saveToCache} className="w-full h-16 rounded-2xl bg-primary text-white text-lg font-black shadow-2xl">
                <Save className="w-6 h-6 mr-3" /> حفظ إعدادات الكاش
              </Button>
            </Card>

            <Card className="bg-zinc-900/50 border-white/10 rounded-[3rem] p-10 space-y-8">
              <CardTitle className="text-2xl font-black text-white flex items-center gap-4">
                <ImageIcon className="w-6 h-6 text-accent" /> خلفية النظام السينمائية
              </CardTitle>
              
              <div className="grid grid-cols-2 gap-4 h-64">
                {BACKGROUNDS.map((bg, idx) => (
                  <button 
                    key={idx}
                    onClick={() => updateMapSettings({ backgroundIndex: idx })}
                    className={cn(
                      "relative rounded-2xl overflow-hidden border-4 transition-all",
                      mapSettings.backgroundIndex === idx ? "border-primary scale-105 shadow-glow" : "border-transparent opacity-40 hover:opacity-100"
                    )}
                  >
                    <img src={`${bg}?auto=format&fit=crop&q=40&w=300`} className="w-full h-full object-cover" alt={`Background ${idx}`} />
                    {mapSettings.backgroundIndex === idx && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Save className="w-8 h-8 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/40 text-center uppercase tracking-widest font-bold">يتم الحفظ تلقائياً في ذاكرة الكاش</p>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="youtube" className="space-y-8">
          <Card className="bg-zinc-900/50 border-white/10 rounded-[3rem] overflow-hidden">
            <CardHeader className="p-10 border-b border-white/5">
              <CardTitle className="text-3xl font-black text-white flex items-center gap-4">
                <div className="p-3 bg-red-600/20 rounded-2xl">
                  <Key className="w-8 h-8 text-red-500" />
                </div>
                إدارة كوتا YouTube
              </CardTitle>
              <CardDescription className="text-white/40 text-lg">نظام التدوير التلقائي لضمان استمرار الخدمة.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {YT_KEYS_POOL.map((key, i) => (
                  <div key={i} className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 group">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Key {i + 1}</span>
                      <code className="text-xs text-white/60 font-mono truncate max-w-[200px]">{key}</code>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-2 h-2 rounded-full", i === 0 ? "bg-accent shadow-glow" : "bg-white/20")} />
                      <span className="text-[10px] font-black uppercase tracking-tighter opacity-40">{i === 0 ? "Active" : "Backup"}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-6 border-t border-white/5">
                <Button className="rounded-full bg-white/5 border border-white/10 text-white h-14 px-8 hover:bg-white/10">
                  <RefreshCw className="w-5 h-5 mr-3" /> اختبار كافة المفاتيح
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5">
              <Card className="bg-zinc-900/50 border-white/10 rounded-[3rem]">
                <CardHeader className="p-10">
                  <CardTitle className="text-2xl font-black text-white">إضافة تذكير جديد</CardTitle>
                </CardHeader>
                <CardContent className="p-10 pt-0 space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">العنوان</label>
                    <Input 
                      placeholder="مثلاً: أذكار الصباح" 
                      className="bg-white/5 border-white/10 h-14 rounded-2xl px-6 text-lg font-headline"
                      value={newReminder.label}
                      onChange={(e) => setNewReminder({ ...newReminder, label: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">من ساعة</label>
                      <Input 
                        type="number" 
                        className="bg-white/5 border-white/10 h-14 rounded-2xl px-6"
                        value={newReminder.startHour}
                        onChange={(e) => setNewReminder({ ...newReminder, startHour: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">إلى ساعة</label>
                      <Input 
                        type="number" 
                        className="bg-white/5 border-white/10 h-14 rounded-2xl px-6"
                        value={newReminder.endHour}
                        onChange={(e) => setNewReminder({ ...newReminder, endHour: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleAddReminder} className="w-full h-16 rounded-2xl bg-primary text-white text-lg font-black shadow-2xl mt-4">
                    <Plus className="w-6 h-6 mr-3" /> حفظ التذكير
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-7">
              <div className="space-y-4">
                {reminders.map((rem) => (
                  <div key={rem.id} className="glass-panel p-6 rounded-[2rem] flex items-center justify-between border-white/10">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                        <Bell className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="flex flex-col">
                        <h4 className="text-xl font-bold text-white">{rem.label}</h4>
                        <div className="flex items-center gap-3 mt-1 text-white/40 text-xs font-bold uppercase tracking-widest">
                          <Clock className="w-3.5 h-3.5" />
                          {rem.startHour}:00 - {rem.endHour}:00
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeReminder(rem.id)}
                      className="w-12 h-12 rounded-full text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="football" className="space-y-8">
           <Card className="bg-zinc-900/50 border-white/10 rounded-[3rem]">
            <CardHeader className="p-10">
              <CardTitle className="text-3xl font-black text-white">الفرق المفضلة</CardTitle>
              <CardDescription className="text-white/40">سيتم تتبع هذه الفرق في لوحة القيادة والجزيرة العلوية.</CardDescription>
            </CardHeader>
            <CardContent className="p-10 pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {AVAILABLE_TEAMS.map(team => {
                  const isFav = favoriteTeams.includes(team);
                  return (
                    <Button
                      key={team}
                      onClick={() => toggleFavoriteTeam(team)}
                      variant={isFav ? "default" : "outline"}
                      className={cn(
                        "rounded-2xl h-14 font-black text-xs transition-all",
                        isFav ? "bg-primary shadow-glow" : "border-white/10 text-white/60 hover:bg-white/5"
                      )}
                    >
                      {team}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-zinc-900/50 border-white/10 rounded-[3rem] p-10 flex flex-col items-center text-center gap-6">
               <div className="w-20 h-20 rounded-3xl bg-accent/20 flex items-center justify-center">
                  <ShieldCheck className="w-10 h-10 text-accent" />
               </div>
               <div className="space-y-2">
                 <h3 className="text-xl font-black text-white">حالة الترخيص</h3>
                 <p className="text-sm text-white/40">نسخة DriveCast v2.5.0</p>
               </div>
            </Card>

            <Card className="bg-zinc-900/50 border-white/10 rounded-[3rem] p-10 flex flex-col items-center text-center gap-6">
               <div className="w-20 h-20 rounded-3xl bg-blue-500/20 flex items-center justify-center">
                  <Palette className="w-10 h-10 text-blue-500" />
               </div>
               <div className="space-y-2">
                 <h3 className="text-xl font-black text-white">المظهر</h3>
                 <p className="text-sm text-white/40">الوضع السينمائي المفعل</p>
               </div>
            </Card>

            <Card className="bg-zinc-900/50 border-white/10 rounded-[3rem] p-10 flex flex-col items-center text-center gap-6">
               <div className="w-20 h-20 rounded-3xl bg-orange-500/20 flex items-center justify-center">
                  <RefreshCw className="w-10 h-10 text-orange-500" />
               </div>
               <div className="space-y-2">
                 <h3 className="text-xl font-black text-white">تحديث النظام</h3>
                 <p className="text-sm text-white/40">لا توجد تحديثات حالياً</p>
               </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
