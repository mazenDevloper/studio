"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Mic } from "lucide-react";
import { nativeIsland } from "@/lib/native-app";
import { cn } from "@/lib/utils";

/**
 * The microphone beside the islands. In the Android app it opens the phone's voice commands; in a browser it
 * listens here (Web Speech) and does the simple ones: matches / azkar open their screens, anything else is
 * searched in the media screen and the first result plays.
 */
export function SiteVoiceButton() {
  const router = useRouter();
  const path = usePathname();
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const recRef = useRef<any>(null);

  const act = (text: string) => {
    const t = text.trim();
    if (!t) return;
    if (/مباري|ماتش|نتيج/.test(t)) { router.push("/matches"); return; }
    if (/اذكار|أذكار/.test(t)) { router.push("/football"); return; }
    const q = t.replace(/^\s*(شغّل|شغل|شغلي|شغّلي|ابحث عن|إبحث عن|ابحث|سمعني|سمّعني|أبي|ابي|حط)\s*/u, "").trim() || t;
    (window as any).__nativeMediaAction = { type: "voice", id: q };
    if (path === "/media") window.dispatchEvent(new CustomEvent("native-media-action"));
    else router.push("/media");
  };

  const start = () => {
    const plugin: any = nativeIsland();
    if (plugin?.voice) { plugin.voice().catch(() => {}); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("المتصفح لا يدعم التعرّف على الصوت (جرّب Chrome)"); return; }
    if (listening) { recRef.current?.stop(); return; }
    const r = new SR();
    r.lang = "ar-SA";
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = (e: any) => {
      const res = e.results[e.results.length - 1];
      setHeard(res[0].transcript);
      if (res.isFinal) act(res[0].transcript);
    };
    r.onend = () => { setListening(false); setTimeout(() => setHeard(""), 2500); };
    r.onerror = () => setListening(false);
    recRef.current = r;
    setHeard("");
    setListening(true);
    r.start();
  };

  return (
    <div className="relative pointer-events-auto">
      <button onClick={start} title="أمر صوتي"
        className={cn("shadow-2xl w-14 h-14 max-[639px]:w-12 max-[639px]:h-12 rounded-full flex items-center justify-center premium-glass cursor-pointer border active:scale-90 transition-all",
          listening ? "border-red-400 bg-red-600/40 animate-pulse" : "border-white/10")}>
        <Mic className={cn("w-6 h-6", listening ? "text-white" : "text-emerald-400")} />
      </button>
      {heard && (
        <div className="absolute top-14 right-0 min-w-[12rem] max-w-[20rem] rounded-2xl bg-black/85 border border-white/10 px-4 py-2 text-sm font-black text-white" dir="rtl">🎤 {heard}</div>
      )}
    </div>
  );
}
