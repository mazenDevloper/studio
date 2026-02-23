
"use client";

import { useMediaStore } from "@/lib/store";
import { Play, Bell, Circle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function RemindersWidget() {
  const { reminders, toggleReminder } = useMediaStore();

  return (
    <div className="h-full bg-zinc-900/40 backdrop-blur-3xl rounded-[2.5rem] p-8 border border-white/5 flex flex-col gap-6 shadow-2xl">
      <div className="flex items-center justify-between mb-2">
         <h2 className="text-xl font-bold font-headline text-white/80">تذكيرات اليوم</h2>
         <div className="h-2 w-12 bg-primary/40 rounded-full" />
      </div>
      
      <div className="grid grid-cols-2 gap-4 flex-1">
        {reminders.map((reminder) => (
          <button
            key={reminder.id}
            onClick={() => toggleReminder(reminder.id)}
            className={cn(
              "relative flex items-center justify-between px-6 py-5 rounded-3xl border transition-all duration-300 group overflow-hidden",
              reminder.completed 
                ? "bg-primary/20 border-primary/40 active-glow" 
                : "bg-white/5 border-white/5 hover:bg-white/10"
            )}
          >
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            
            <div className="flex items-center gap-4 z-10">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-transform group-active:scale-90",
                reminder.completed ? "bg-primary text-white" : "bg-black/20"
              )}>
                {reminder.completed ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : reminder.iconType === 'play' ? (
                  <Play className={cn("w-5 h-5 fill-current", reminder.color)} />
                ) : reminder.iconType === 'bell' ? (
                  <Bell className={cn("w-5 h-5", reminder.color)} />
                ) : (
                  <Circle className={cn("w-5 h-5", reminder.color)} />
                )}
              </div>
              <span className={cn(
                "text-lg font-bold font-headline transition-colors",
                reminder.completed ? "text-white" : "text-white/60"
              )}>
                {reminder.label}
              </span>
            </div>
            
            {reminder.completed && (
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
