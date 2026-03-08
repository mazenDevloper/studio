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

const FALLBACK_LOCATION = { lat: 17.067330, lng: 54.160190 };

export function MapWidget() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const carOverlayRef = useRef<google.maps.WebGLOverlayView | null>(null);
  const scriptLoadedRef = useRef(false);
  const isInteractingRef = useRef(false);

  const { isFullScreen } = useMediaStore();
  const [isLoading, setIsLoading] = useState(true);

  const tuner = { zoom: 20.0, tilt: 65, scale: 1.05 };

  const [carState, setCarState] = useState({ location: FALLBACK_LOCATION, heading: 0 });
  const carStateRef = useRef(carState);
  useEffect(() => { carStateRef.current = carState; }, [carState]);

  const setup3DMarker = useCallback((map: google.maps.Map) => {
    // Only attempt to setup WebGL if the map is rendered as a Vector map
    if (carOverlayRef.current) return;
    
    const overlay = new google.maps.WebGLOverlayView();
    carOverlayRef.current = overlay;

    overlay.onAdd = () => {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera();
      
      scene.add(new THREE.AmbientLight(0xffffff, 0.65));
      const light1 = new THREE.DirectionalLight(0xffffff, 0.68);
      light1.position.set(25, 8, 15); scene.add(light1);
      const light2 = new THREE.DirectionalLight(0xffffff, 0.75);
      light2.position.set(-25, 5, 15); scene.add(light2);

      const loader = new GLTFLoader();
      loader.load('https://dmusera.netlify.app/ES350E.gltf', (gltf) => {
        const model = gltf.scene;
        model.traverse(node => {
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            const col = (mesh.material as any).color.clone();
            const isTrans = (mesh.material as any).transparent || (mesh.material as any).opacity < 0.9;
            const isNeutral = (col.r === col.g && col.g === col.b) || (col.r < 0.5 && col.g < 0.5 && col.b < 0.5);

            if (isTrans || isNeutral) {
              mesh.material = new THREE.MeshPhongMaterial({
                color: isTrans ? col : 0x050505,
                specular: 0x444444,
                shininess: 100,
                side: THREE.DoubleSide,
                transparent: isTrans,
                opacity: (mesh.material as any).opacity
              });
            } else {
              mesh.material = new THREE.MeshStandardMaterial({
                color: 0x968165,
                metalness: 0.9,
                roughness: 0.15,
                envMapIntensity: 2.0
              });
            }
          }
        });
        model.rotation.x = Math.PI / 2;
        scene.add(model);
        (overlay as any).carModel = model;
      });
      (overlay as any).scene = scene;
      (overlay as any).camera = camera;
    };

    overlay.onContextRestored = ({ gl }) => {
      (overlay as any).renderer = new THREE.WebGLRenderer({ canvas: gl.canvas, context: gl, antialias: true, alpha: true });
      (overlay as any).renderer.autoClear = false;
    };

    overlay.onDraw = ({ transformer }) => {
      if (isFullScreen) return;
      
      const { renderer, scene, camera, carModel } = (overlay as any);
      if (!renderer || !scene || !mapInstanceRef.current) return;
      renderer.resetState();
      const zoom = mapInstanceRef.current.getZoom() || tuner.zoom;
      const pos = carStateRef.current.location;
      const heading = carStateRef.current.heading;
      const matrix = transformer.fromLatLngAltitude({ lat: pos.lat, lng: pos.lng, altitude: 3.5 });
      camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);
      if (carModel) {
        const finalScale = tuner.scale * Math.pow(2, tuner.zoom - zoom);
        carModel.scale.set(finalScale, finalScale, finalScale);
        carModel.rotation.y = -(heading * Math.PI) / 180 + Math.PI;
      }
      renderer.render(scene, camera);
      overlay.requestRedraw();
    };
    overlay.setMap(map);
  }, [isFullScreen]);

  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;
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
      
      map.addListener('dragstart', () => { isInteractingRef.current = true; });
      mapInstanceRef.current = map;
      
      // Attempt setup when idle/loaded
      map.addListener('tilesloaded', () => {
        if (map.getRenderingType() === 'VECTOR') {
          setup3DMarker(map);
        }
      });
      
      setIsLoading(false);
    };

    if (window.google && window.google.maps) initMap();
    else if (!scriptLoadedRef.current) {
      scriptLoadedRef.current = true;
      const script = document.createElement('script');
      // Added v=weekly for more stable vector support
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&v=weekly&callback=initMap`;
      script.async = true;
      (window as any).initMap = initMap;
      document.head.appendChild(script);
    }
  }, [setup3DMarker]);

  return (
    <Card className="h-full w-full overflow-hidden border-none bg-black relative group rounded-[2.5rem] shadow-2xl">
      <div ref={mapRef} className="absolute inset-0 z-0" />
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-md">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
      {!isFullScreen && (
        <div className="absolute bottom-8 right-8 z-20">
          <Button className="w-16 h-16 rounded-full bg-blue-600 shadow-2xl focusable" onClick={() => { 
            isInteractingRef.current = false; 
            navigator.geolocation.getCurrentPosition((p) => { 
              const pos = { lat: p.coords.latitude, lng: p.coords.longitude }; 
              mapInstanceRef.current?.setCenter(pos); mapInstanceRef.current?.setHeading(p.coords.heading || 0);
            }); 
          }}><Target className="w-7 h-7 text-white" /></Button>
        </div>
      )}
    </Card>
  );
}
