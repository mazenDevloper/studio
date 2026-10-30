"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Mic } from "lucide-react";
import { nativeIsland } from "@/lib/native-app";
import { cn } from "@/lib/utils";
import { hub } from "@/lib/hub";

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

  const [answer, setAnswer] = useState("");
  const hist = useRef<{ role: string; content: string }[]>([]);
  // «المساعد» (Workers AI on the DriveCast server): answers aloud from your live matches and prayers, and can act
  const ask = async (q: string, fallback?: () => void) => {
    setAnswer("…");
    try {
      // the assistant sees every device on now and what each plays, and carries out commands on them itself
      const r = await (await fetch("https://studio.c-p.workers.dev/ask", { method: "POST", body: JSON.stringify({ q, history: hist.current, app: "drivecast", device: hub.me?.id }) })).json();
      if (!r?.say && !(r?.done || []).length) { setAnswer(""); fallback?.(); return; }
      hist.current = [...hist.current, { role: "user", content: q }, { role: "assistant", content: r.say }].slice(-8);
      setAnswer(r.say); setTimeout(() => setAnswer(""), 9000);
      try { const u = new SpeechSynthesisUtterance(r.say); u.lang = "ar-SA"; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { /* */ }
      const a = r.action || {}, v = String(a.value || "");
      if (a.type === "open_matches") router.push("/matches");
      else if (a.type === "open_url" && /^https?:\/\//.test(v)) window.open(v, "_blank");
      else if (a.type === "open_app" && v === "youtube") router.push("/media");
    } catch { if (fallback) { setAnswer(""); fallback(); } else { setAnswer("المساعد غير متاح الآن"); setTimeout(() => setAnswer(""), 3000); } }
  };

  const act = (text: string) => {
    const t = text.trim();
    if (!t) return;
    // everything goes to the assistant first: it understands the meaning (any wording) and acts on any device;
    // the simple word rules below are only the fallback when it can't be reached
    ask(t, () => local(t));
  };
  const local = (t: string) => {
    if (/مباري|ماتش|نتيج/.test(t)) { router.push("/matches"); return; }
    if (/اذكار|أذكار/.test(t)) { router.push("/football"); return; }
    const q = t.replace(/^\s*(شغّل|شغل|شغلي|شغّلي|ابحث عن|إبحث عن|ابحث|سمعني|سمّعني|أبي|ابي|حط)\s*/u, "").trim() || t;
    (window as any).__nativeMediaAction = { type: "voice", id: q };
    if (path === "/media") window.dispatchEvent(new CustomEvent("native-media-action"));
    else router.push("/media");
  };

  // the iPhone app listens itself and sends the sentence here
  const actRef = useRef(act);
  actRef.current = act;
  useEffect(() => {
    const on = (e: Event) => {
      const t = String((e as CustomEvent).detail || "");
      setHeard(t);
      setTimeout(() => setHeard(""), 2500);
      actRef.current(t);
    };
    window.addEventListener("native-voice", on);
    return () => window.removeEventListener("native-voice", on);
  }, []);

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
        className={cn("shadow-2xl w-12 h-12 rounded-full flex items-center justify-center premium-glass cursor-pointer border active:scale-90 transition-all",
          listening ? "border-red-400 bg-red-600/40 animate-pulse" : "border-white/10")}>
        <Mic className={cn("w-5 h-5", listening ? "text-white" : "text-emerald-400")} />
      </button>
      {answer && (
        <div className="absolute top-14 right-0 w-[22rem] max-w-[80vw] rounded-2xl bg-black/90 border border-emerald-400/30 px-4 py-3 text-sm font-bold text-white leading-6 z-50" dir="rtl">✨ {answer}</div>
      )}
      {heard && !answer && (
        <div className="absolute top-14 right-0 min-w-[12rem] max-w-[20rem] rounded-2xl bg-black/85 border border-white/10 px-4 py-2 text-sm font-black text-white" dir="rtl">🎤 {heard}</div>
      )}
    </div>
  );
}
