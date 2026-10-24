"use client";
// «زر المشاركة» in DriveCast: what another app shared → the shared «أرسل إلى» page (Madar's site), which sends it to
// Madar, the car, the TV or later through «المركز».
import { useEffect } from "react";
export default function SharePage() {
  useEffect(() => { location.replace("https://mazendevloper.github.io/fit/share.html" + location.search); }, []);
  return <div dir="rtl" className="p-8 text-white">📤 لحظة…</div>;
}
