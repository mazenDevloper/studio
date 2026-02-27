
'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial, Environment } from '@react-three/drei';
import * as THREE from 'three';

interface FluidGlassSceneProps {
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

function GlassMesh({ mode = 'lens', ...props }: FluidGlassSceneProps) {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (!meshRef.current) return;
    // حركة سائلة تموجية معقدة لمحاكاة الزجاج المنصهر
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
    meshRef.current.rotation.y = Math.cos(state.clock.elapsedTime * 0.3) * 0.2;
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.1;
    meshRef.current.scale.setScalar((props.scale || 1.5) + Math.sin(state.clock.elapsedTime * 0.5) * 0.02);
  });

  const getGeometry = () => {
    switch (mode) {
      case 'cube': return <boxGeometry args={[1.2, 1.2, 1.2]} />;
      case 'bar': return <cylinderGeometry args={[0.6, 0.6, 2.5, 64]} />;
      default: return <sphereGeometry args={[1, 128, 128]} />;
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
        ior={props.ior || 1.15}
        chromaticAberration={props.chromaticAberration || 0.1}
        anisotropy={props.anisotropy || 0.01}
        distortion={props.distortion || 0.9} 
        distortionScale={0.8}
        temporalDistortion={0.3}
        roughness={props.roughness || 0.02}
        attenuationDistance={0.8}
        attenuationColor="#ffffff"
        color="#ffffff"
      />
    </mesh>
  );
}

export default function FluidGlassScene(props: FluidGlassSceneProps) {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-80 mix-blend-screen">
      <Canvas camera={{ position: [0, 0, 5], fov: 35 }} dpr={[1, 2]}>
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={2} />
        <GlassMesh {...props} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
