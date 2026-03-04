
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, AlertTriangle, ZoomIn, ZoomOut, Target } from "lucide-react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { useMediaStore } from "@/lib/store";
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
  const scriptLoadedRef = useRef(false);

  const { mapSettings, updateMapSettings } = useMediaStore();
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const [carState, setCarState] = useState({
    location: { lat: 17.067330, lng: 54.160190 },
    heading: 0
  });

  const carStateRef = useRef(carState);
  useEffect(() => { carStateRef.current = carState; }, [carState]);

  const setup3DMarker = useCallback((map: google.maps.Map) => {
    if (carOverlayRef.current) return;

    const overlay = new google.maps.WebGLOverlayView();
    carOverlayRef.current = overlay;

    overlay.onAdd = () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera();
      
      scene.add(new THREE.AmbientLight(0xffffff, 5.5));
      const sun = new THREE.DirectionalLight(0xffffff, 4.4);
      sun.position.set(10, 25, 10);
      scene.add(sun);

      const loader = new GLTFLoader();
      // Using requested stable model URL
      loader.load('https://dmusera.netlify.app/E350E.gltf', (gltf) => {
        const model = gltf.scene;
        model.traverse(node => {
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            if (mesh.material) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              mat.emissive = mat.color.clone().multiplyScalar(0.2);
              mat.metalness = 0.4;
              mat.roughness = 0.5;
              mat.depthWrite = true;
              mat.transparent = false;
              mat.side = THREE.DoubleSide;
              mat.needsUpdate = true;
            }
          }
        });
        model.rotation.x = Math.PI / 2;
        model.scale.set(1.5, 1.5, 1.5);
        scene.add(model);
        (overlay as any).carModel = model;
      }, undefined, (error) => {
        console.error("Failed to load 3D Model:", error);
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
      const model = (overlay as any).carModel;
      
      if (!renderer || !scene || !mapInstanceRef.current) return;

      renderer.resetState();
      const matrix = transformer.fromLatLngAltitude({ 
        lat: carStateRef.current.location.lat, 
        lng: carStateRef.current.location.lng, 
        altitude: 0 
      });
      
      camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);
      if (model) {
        model.rotation.y = -(carStateRef.current.heading * Math.PI) / 180 + Math.PI;
      }

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
          zoom: mapSettings.zoom,
          tilt: mapSettings.tilt,
          mapId: '6c6951a9289b612a97923702', 
          disableDefaultUI: true,
          styles: DARK_MAP_STYLE,
          gestureHandling: "greedy",
          renderingType: google.maps.RenderingType.VECTOR
        });
        mapInstanceRef.current = map;
        setup3DMarker(map);
        setIsLoading(false);
      } catch (e) {
        setApiError(true);
        setIsLoading(false);
      }
    };

    if (window.google && window.google.maps) {
      initMap();
    } else if (!scriptLoadedRef.current) {
      scriptLoadedRef.current = true;
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap`;
      script.async = true;
      (window as any).initMap = initMap;
      document.head.appendChild(script);
    }
  }, [setup3DMarker, mapSettings.zoom, mapSettings.tilt]);

  return (
    <Card className="h-full w-full overflow-hidden border-none bg-black relative group rounded-[2.5rem] shadow-2xl">
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        </div>
      )}
      {apiError ? (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-900/50">
          <AlertTriangle className="w-10 h-10 text-red-500" />
          <h3 className="text-xl font-bold text-white mt-4">نظام الخرائط غير متصل</h3>
        </div>
      ) : (
        <div ref={mapRef} className="absolute inset-0 z-0" />
      )}
      <div className="absolute top-6 right-6 z-20 flex flex-col gap-3">
        <div className="flex flex-col bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl">
          <Button size="icon" variant="ghost" onClick={() => updateMapSettings({ zoom: Math.min(21, mapSettings.zoom + 0.5) })} className="h-10 w-10 text-primary focusable"><ZoomIn className="w-5 h-5" /></Button>
          <Button size="icon" variant="ghost" onClick={() => updateMapSettings({ zoom: Math.max(15, mapSettings.zoom - 0.5) })} className="h-10 w-10 text-primary focusable"><ZoomOut className="w-5 h-5" /></Button>
        </div>
      </div>
      <div className="absolute bottom-8 right-8 z-20">
        <Button className="w-16 h-16 rounded-full bg-blue-600 shadow-2xl hover:bg-blue-500 focusable" onClick={() => {
          if (navigator.geolocation && mapInstanceRef.current) {
            navigator.geolocation.getCurrentPosition((p) => {
              const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
              mapInstanceRef.current?.setCenter(pos);
            });
          }
        }}>
          <Target className="w-7 h-7 text-white" />
        </Button>
      </div>
    </Card>
  );
}
