
'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial, Environment } from '@react-three/drei';
import * as THREE from 'three';

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

function GlassMesh({ mode = 'lens', ...props }: FluidGlassProps) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (!meshRef.current) return;
    // إضافة حركة سائلة تموجية
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.15;
    meshRef.current.rotation.y = Math.cos(state.clock.elapsedTime * 0.4) * 0.15;
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
  });

  const getGeometry = () => {
    switch (mode) {
      case 'cube': return <boxGeometry args={[1, 1, 1]} />;
      case 'bar': return <cylinderGeometry args={[0.5, 0.5, 2, 32]} />;
      default: return <sphereGeometry args={[1, 64, 64]} />;
    }
  };

  return (
    <mesh ref={meshRef} scale={props.scale || 1.5}>
      {getGeometry()}
      <MeshTransmissionMaterial
        backside
        backsideThickness={props.thickness || 5}
        thickness={props.thickness || 5}
        transmission={props.transmission || 1}
        ior={props.ior || 1.25} // زيادة معامل الانكسار لتشويه أقوى
        chromaticAberration={props.chromaticAberration || 0.15} // زيادة التشويه اللوني
        anisotropy={props.anisotropy || 0.5}
        distortion={props.distortion || 0.8} // زيادة التشويه السائل
        distortionScale={0.6}
        temporalDistortion={0.2}
        roughness={props.roughness || 0.05}
        attenuationDistance={0.5}
        attenuationColor="#ffffff"
        color="#ffffff"
      />
    </mesh>
  );
}

export function FluidGlass(props: FluidGlassProps) {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-70">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <GlassMesh {...props} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
