
"use client";

import Image from "next/image";

export function InspirationWidget() {
  return (
    <div className="h-full bg-zinc-900/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 overflow-hidden relative shadow-2xl group">
      <Image 
        src="https://images.unsplash.com/photo-1594911772125-07fc7a2d8d9f?q=80&w=1000"
        alt="Inspiration"
        fill
        className="object-cover opacity-60 group-hover:scale-110 transition-transform duration-1000 grayscale hover:grayscale-0"
        data-ai-hint="islamic calligraphy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      
      <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
         <div className="w-full h-full border-2 border-white/10 rounded-[2rem] p-8 flex flex-col items-center justify-center">
            <h2 className="text-5xl font-bold font-headline text-white leading-relaxed drop-shadow-2xl">
              اللهم اجعلني في تدبيرك وتيسيرك وتسخيرك
            </h2>
            <div className="h-1 w-24 bg-primary/60 rounded-full mt-8" />
         </div>
      </div>
    </div>
  );
}
