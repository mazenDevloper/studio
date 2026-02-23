
"use client";

import { useMediaStore } from "@/lib/store";
import { Play, Bell, Circle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export function RemindersWidget() {
  const { reminders, toggleReminder } = useMediaStore();

  return (
    <div className="h-full bg-zinc-900/40 backdrop-blur-3xl rounded-[2.5rem] p-6 border border-white/5 flex flex-col gap-4 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between mb-1">
         <h2 className="text-sm font-bold font-headline text-white/40 uppercase tracking-widest">التذكيرات اليومية</h2>
         <div className="h-1 w-8 bg-primary/40 rounded-full" />
      </div>
      
      <ScrollArea className="flex-1 pr-2">
        <div className="flex flex-col gap-3">
          {reminders.map((reminder) => (
            <button
              key={reminder.id}
              onClick={() => toggleReminder(reminder.id)}
              className={cn(
                "relative flex items-center justify-between px-5 py-3 rounded-2xl border transition-all duration-300 group overflow-hidden",
                reminder.completed 
                  ? "bg-primary/20 border-primary/40" 
                  : "bg-white/5 border-white/5 hover:bg-white/10"
              )}
            >
              <div className="flex items-center gap-3 z-10">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-transform group-active:scale-90",
                  reminder.completed ? "bg-primary text-white" : "bg-black/20"
                )}>
                  {reminder.completed ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : reminder.iconType === 'play' ? (
                    <Play className={cn("w-4 h-4 fill-current", reminder.color)} />
                  ) : reminder.iconType === 'bell' ? (
                    <Bell className={cn("w-4 h-4", reminder.color)} />
                  ) : (
                    <Circle className={cn("w-4 h-4", reminder.color)} />
                  )}
                </div>
                <span className={cn(
                  "text-sm font-bold font-headline transition-colors",
                  reminder.completed ? "text-white" : "text-white/60"
                )}>
                  {reminder.label}
                </span>
              </div>
              
              {reminder.completed && (
                <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-glow" />
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
