
'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface FluidGlassProps {
  mode?: 'lens' | 'bar' | 'cube';
  scale?: number;
  className?: string;
}

/**
 * Optimized FluidGlass - Reduced distortion scale and update frequency to save GPU.
 */
export function FluidGlass({ mode = 'lens', scale = 0.5, className }: FluidGlassProps) {
  const [seed, setSeed] = useState(1);

  useEffect(() => {
    // Reduced update frequency to 500ms to save CPU/GPU cycles
    const interval = setInterval(() => {
      setSeed(s => (s % 50) + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden rounded-[inherit]", className)}>
      {/* Reduced turbulence frequency for efficiency */}
      <svg className="hidden">
        <filter id="liquid-glass-distortion">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency={0.02} 
            numOctaves="2" 
            seed={seed}
            result="noise" 
          />
          <feDisplacementMap 
            in="SourceGraphic" 
            in2="noise" 
            scale={10 * scale} 
            xChannelSelector="R" 
            yChannelSelector="G" 
          />
        </filter>
      </svg>

      {/* Reflection and blur layers */}
      <div 
        className="absolute inset-0 opacity-40 mix-blend-overlay"
        style={{ 
          filter: 'url(#liquid-glass-distortion) blur(2px)',
          background: mode === 'bar' 
            ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)'
            : 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1), transparent 80%)'
        }}
      />
      
      {/* Interior shiny edges */}
      <div className="absolute inset-0 shadow-[inset_0_1px_10px_rgba(255,255,255,0.15),inset_0_-1px_10px_rgba(255,255,255,0.05)] rounded-[inherit]" />
    </div>
  );
}
