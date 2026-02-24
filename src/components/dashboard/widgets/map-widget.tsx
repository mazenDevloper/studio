
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Compass, Plus, Minus, ChevronUp, ChevronDown, Target, Loader2, AlertTriangle, Save } from "lucide-react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const DARK_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

export function MapWidget() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const carOverlayRef = useRef<google.maps.WebGLOverlayView | null>(null);
  const carModelRef = useRef<THREE.Group | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const scriptLoadedRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const [tuner, setTuner] = useState({
    zoom: 19.5,
    tilt: 65,
    scale: 1.02,
    offset: 45
  });

  const [carState, setCarState] = useState({
    location: { lat: 17.067330, lng: 54.160190 },
    heading: 0
  });

  const carStateRef = useRef(carState);
  useEffect(() => { carStateRef.current = carState; }, [carState]);

  const tunerRef = useRef(tuner);
  useEffect(() => { tunerRef.current = tuner; }, [tuner]);

  const setup3DCarSystem = useCallback((map: google.maps.Map) => {
    if (carOverlayRef.current) return;

    const overlay = new google.maps.WebGLOverlayView();
    carOverlayRef.current = overlay;

    overlay.onAdd = () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera();
      
      // نظام إضاءة الاستوديو لإبراز اللمعة الذهبية
      scene.add(new THREE.AmbientLight(0xffffff, 0.65));
      const light1 = new THREE.DirectionalLight(0xffffff, 0.68);
      light1.position.set(25, 8, 15); 
      scene.add(light1);

      const loader = new GLTFLoader();
      loader.load('https://dmusera.netlify.app/ES350E.gltf', (gltf) => {
        const carModel = gltf.scene;
        carModelRef.current = carModel;
        
        carModel.traverse((node: any) => {
          if (node.isMesh) {
            const originalColor = node.material.color.clone();
            const isTransparent = node.material.transparent || node.material.opacity < 0.9;
            const isNeutral = (originalColor.r === originalColor.g && originalColor.g === originalColor.b) || 
                             (originalColor.r < 0.5 && originalColor.g < 0.5 && originalColor.b < 0.5);

            if (isTransparent || isNeutral) {
              node.material = new THREE.MeshPhongMaterial({
                color: isTransparent ? originalColor : 0x050505,
                specular: 0x444444,
                shininess: 100,
                side: THREE.DoubleSide,
                transparent: isTransparent,
                opacity: node.material.opacity
              });
            } else {
              // الهيكل الذهبي الملكي
              node.material = new THREE.MeshPhongMaterial({
                color: 0xcccaac,
                specular: 0x888888,    
                shininess: 2000,       
                emissive: 0x221100,    
                emissiveIntensity: 0.2,
                side: THREE.DoubleSide,
                flatShading: false
              });
            }
            node.material.needsUpdate = true;
          }
        });

        carModel.rotation.x = Math.PI / 2;
        scene.add(carModel);
      });

      (overlay as any).scene = scene;
      (overlay as any).camera = camera;
    };

    overlay.onContextRestored = ({ gl }) => {
      (overlay as any).renderer = new THREE.WebGLRenderer({
        canvas: gl.canvas,
        context: gl,
        antialias: true,
        alpha: true
      });
      (overlay as any).renderer.autoClear = false;
    };

    overlay.onDraw = ({ transformer }) => {
      const renderer = (overlay as any).renderer;
      const scene = (overlay as any).scene;
      const camera = (overlay as any).camera;
      
      if (!renderer || !carModelRef.current || !mapInstanceRef.current) return;

      renderer.resetState();

      const zoom = mapInstanceRef.current.getZoom() || 19;
      const matrix = transformer.fromLatLngAltitude({ 
        lat: carStateRef.current.location.lat, 
        lng: carStateRef.current.location.lng, 
        altitude: 3.5 
      });
      
      camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);

      // معادلة الحجم الديناميكي
      const finalScale = tunerRef.current.scale * Math.pow(2, 20 - zoom); 
      carModelRef.current.scale.set(finalScale, finalScale, finalScale);
      carModelRef.current.rotation.y = -(carStateRef.current.heading * Math.PI) / 180 + Math.PI;

      renderer.render(scene, camera);
      overlay.requestRedraw(); 
    };

    overlay.setMap(map);
  }, []);

  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        const map = new google.maps.Map(mapRef.current, {
          center: carState.location,
          zoom: tuner.zoom,
          tilt: tuner.tilt,
          mapId: '6c6951a9289b612a97923702', 
          disableDefaultUI: true,
          styles: DARK_MAP_STYLE,
          gestureHandling: "greedy",
          renderingType: google.maps.RenderingType.VECTOR
        });
        mapInstanceRef.current = map;

        setup3DCarSystem(map);

        if (navigator.geolocation) {
          watchIdRef.current = navigator.geolocation.watchPosition((pos) => {
            const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCarState({
              location: newPos,
              heading: pos.coords.heading || 0
            });
            if (mapInstanceRef.current) {
               mapInstanceRef.current.setCenter(newPos);
               if (pos.coords.heading !== null) {
                 mapInstanceRef.current.setHeading(pos.coords.heading);
               }
            }
          }, (err) => {
            console.error("Geo watch error", err);
          }, { enableHighAccuracy: true });
        }

        setIsLoading(false);
      } catch (e) {
        console.error("Map Init Error", e);
        setApiError(true);
        setIsLoading(false);
      }
    };

    if (window.google && window.google.maps) {
      initMap();
    } else if (!scriptLoadedRef.current) {
      scriptLoadedRef.current = true;
      const scriptId = 'google-maps-sdk';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap`;
        script.async = true;
        (window as any).initMap = initMap;
        document.head.appendChild(script);
      }
    }

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [setup3DCarSystem]);

  return (
    <Card className="h-full w-full overflow-hidden border-none bg-black relative group rounded-[2.5rem] shadow-2xl">
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <span className="text-white/60 font-bold text-xs uppercase tracking-widest">Initializing Navigation...</span>
          </div>
        </div>
      )}

      {apiError ? (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-900/50 backdrop-blur-3xl">
          <div className="w-20 h-20 rounded-3xl bg-red-500/20 flex items-center justify-center mx-auto border border-red-500/30">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h3 className="text-2xl font-headline font-bold text-white mt-4">Map System Offline</h3>
          <p className="text-sm text-white/40 max-w-xs mt-2">Check API configuration and billing status.</p>
        </div>
      ) : (
        <div ref={mapRef} className="absolute inset-0 z-0" />
      )}
      
      {!apiError && !isLoading && (
        <div className="absolute top-6 right-6 z-20 flex flex-col gap-2">
          <div className="flex flex-col gap-1 bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-white/10">
            <Button size="icon" variant="ghost" onClick={() => setTuner(prev => ({ ...prev, scale: prev.scale + 0.05 }))} className="h-10 w-10 text-white">
              <Plus className="w-4 h-4" />
            </Button>
            <span className="text-[10px] text-white/40 font-bold text-center">CAR</span>
            <Button size="icon" variant="ghost" onClick={() => setTuner(prev => ({ ...prev, scale: Math.max(0.1, prev.scale - 0.05) }))} className="h-10 w-10 text-white">
              <Minus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-col gap-1 bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-white/10">
            <Button size="icon" variant="ghost" onClick={() => setTuner(prev => ({ ...prev, tilt: Math.min(75, tuner.tilt + 5) }))} className="h-10 w-10 text-white">
              <ChevronUp className="w-4 h-4" />
            </Button>
            <span className="text-[10px] text-white/40 font-bold text-center">TILT</span>
            <Button size="icon" variant="ghost" onClick={() => setTuner(prev => ({ ...prev, tilt: Math.max(0, tuner.tilt - 5) }))} className="h-10 w-10 text-white">
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
          <Button size="icon" className="h-12 w-12 rounded-2xl bg-blue-600 text-white shadow-lg" onClick={() => alert("✅ Saved Settings")}>
            <Save className="w-5 h-5" />
          </Button>
        </div>
      )}

      <div className="absolute bottom-8 right-8 z-20 flex flex-col gap-4">
        <Button className="w-16 h-16 rounded-full bg-blue-600 shadow-2xl hover:bg-blue-500 transition-all active:scale-95" onClick={() => {
          if (navigator.geolocation && mapInstanceRef.current) {
            navigator.geolocation.getCurrentPosition((p) => {
              const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
              mapInstanceRef.current?.setCenter(pos);
            });
          }
        }}>
          <Target className="w-7 h-7 text-white" />
        </Button>
        <Button className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl">
          <Compass className="w-7 h-7 text-white animate-[spin_10s_linear_infinite]" />
        </Button>
      </div>
    </Card>
  );
}
