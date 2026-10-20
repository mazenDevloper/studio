"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, PartyPopper, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { GOAL_TEST_EVENT } from "@/components/football/goal-celebration";

const API = "https://studio.c-p.workers.dev";
const u8 = (s: string) => { s = s.replace(/-/g, "+").replace(/_/g, "/"); const b = atob(s + "=".repeat((4 - (s.length % 4)) % 4)); return Uint8Array.from(b, c => c.charCodeAt(0)); };

/** Goal / kick-off / full-time alerts with the phone locked and DriveCast closed (Web Push, free). */
export function PushAlerts() {
  const [state, setState] = useState("");
  const [on, setOn] = useState(false);
  const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
  const standalone = typeof window !== "undefined" && ((navigator as unknown as { standalone?: boolean }).standalone || matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches);
  const ios = typeof navigator !== "undefined" && /iPhone|iPad/.test(navigator.userAgent);

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.register("/push-sw.js").then(r => r.pushManager.getSubscription()).then(s => setOn(!!s)).catch(() => {});
    // a push while the site is open: the goal animation plays here too
    const onMsg = (e: MessageEvent) => { if (e.data?.dcPush?.some((a: { title: string }) => a.title.includes("هدف"))) window.dispatchEvent(new CustomEvent(GOAL_TEST_EVENT)); };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, [supported]);

  const enable = async () => {
    try {
      if (!supported) return setState("هذا المتصفح لا يدعم التنبيهات");
      if (Notification.permission !== "granted" && (await Notification.requestPermission()) !== "granted") return setState("لم يُسمح بالتنبيهات — فعّلها من الإعدادات ← الإشعارات ← DriveCast");
      const reg = await navigator.serviceWorker.register("/push-sw.js");
      await navigator.serviceWorker.ready;
      const { key } = await (await fetch(API + "/push/key")).json();
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(key) });
      const r = await fetch(API + "/push/subscribe", { method: "POST", body: JSON.stringify(sub) });
      setOn(r.ok); setState(r.ok ? "✓ التنبيهات مفعّلة على هذا الجهاز" : "تعذّر الحفظ في السيرفر");
    } catch (e) { setState("خطأ: " + (e instanceof Error ? e.message : String(e))); }
  };
  const test = async () => {
    const d = await (await fetch(API + "/push/test", { method: "POST" })).json().catch(() => ({ sent: 0 }));
    setState(d.sent ? "أُرسل تنبيه تجريبي — اقفل الشاشة لتراه كما سيصلك" : "لا توجد أجهزة مفعّلة بعد");
  };

  return (
    <Card className="bg-white/5 border-white/10 p-8 rounded-[2.5rem] shadow-2xl lg:col-span-2">
      <CardTitle className="text-3xl font-black text-white flex items-center gap-4"><BellRing className="w-10 h-10 text-emerald-400" /> تنبيهات المباريات</CardTitle>
      <p className="text-white/60 mt-3 leading-7">
        الأهداف (مع الهدّاف) وبداية ونهاية مباريات فرقك تصلك خلال دقيقة، والهاتف مقفل وDriveCast مغلق.
        {ios && !standalone && " على الآيفون: أضف DriveCast للشاشة الرئيسية من زر المشاركة، وافتحه منها، ثم فعّل."}
      </p>
      <div className="flex flex-wrap gap-3 mt-6">
        <Button onClick={enable} className="rounded-full h-12 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black focusable"><Bell className="w-5 h-5 ml-2" />{on ? "مفعّلة · إعادة التفعيل" : "فعّل التنبيهات"}</Button>
        <Button onClick={test} variant="outline" className="rounded-full h-12 px-6 bg-white/5 border-white/10 focusable"><Send className="w-5 h-5 ml-2" /> تنبيه تجريبي</Button>
        <Button onClick={() => window.dispatchEvent(new CustomEvent(GOAL_TEST_EVENT))} variant="outline" className="rounded-full h-12 px-6 bg-white/5 border-white/10 focusable"><PartyPopper className="w-5 h-5 ml-2" /> معاينة أنيميشن الهدف</Button>
      </div>
      {state && <p className="text-sky-300 mt-4 font-bold">{state}</p>}
    </Card>
  );
}
