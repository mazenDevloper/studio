
'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface FluidGlassProps {
  mode?: 'lens' | 'bar' | 'cube';
  scale?: number;
  className?: string;
}

/**
 * محرك الزجاج السائل المتطور - يستخدم تقنية SVG Distortion لمحاكاة الانكسار الضوئي
 * بأسلوب يحاكي المكونات الثلاثية الأبعاد ولكن بأداء فائق واستقرار كامل مع React 19.
 */
export function FluidGlass({ mode = 'lens', scale = 1, className }: FluidGlassProps) {
  const [seed, setSeed] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeed(s => (s % 100) + 1);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]", className)}>
      {/* فلتر التشويه السائل */}
      <svg className="hidden">
        <filter id="liquid-glass-distortion">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency={0.01 + (seed * 0.0001)} 
            numOctaves="3" 
            seed={seed}
            result="noise" 
          />
          <feDisplacementMap 
            in="SourceGraphic" 
            in2="noise" 
            scale={20 * scale} 
            xChannelSelector="R" 
            yChannelSelector="G" 
          />
        </filter>
      </svg>

      {/* طبقات الانعكاس والتمويه */}
      <div 
        className="absolute inset-0 opacity-60 mix-blend-overlay"
        style={{ 
          filter: 'url(#liquid-glass-distortion) blur(4px)',
          background: mode === 'bar' 
            ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)'
            : 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15), transparent 70%)'
        }}
      />
      
      {/* الحواف اللامعة الداخلية */}
      <div className="absolute inset-0 shadow-[inset_0_2px_15px_rgba(255,255,255,0.2),inset_0_-2px_15px_rgba(255,255,255,0.1)] rounded-[inherit]" />
    </div>
  );
}
