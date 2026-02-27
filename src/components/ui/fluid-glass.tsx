
'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

// تحميل المكون ثلاثي الأبعاد ديناميكياً لمنع أخطاء Evaluation في السيرفر
const Scene = dynamic(() => import('./fluid-glass-scene'), { 
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-white/5 animate-pulse" />
});

interface FluidGlassProps {
  mode?: 'lens' | 'bar' | 'cube';
  scale?: number;
  ior?: number;
  thickness?: number;
  chromaticAberration?: number;
  anisotropy?: number;
  transmission?: number;
  roughness?: number;
  distortion?: number;
}

export function FluidGlass(props: FluidGlassProps) {
  return (
    <Suspense fallback={null}>
      <Scene {...props} />
    </Suspense>
  );
}
