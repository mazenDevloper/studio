
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, MapPin, MapPinOff, ChevronUp, ChevronDown } from "lucide-react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/constants";
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
  const carOverlayRef = useRef<any>(null);
  const carModelRef = useRef<THREE.Group | null>(null);
  const scriptLoadedRef = useRef(false);
  const isInteractingRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);

  const { isFullScreen } = useMediaStore();
  const [isLoading, setIsLoading] = useState(true);
  const [geoError, setGeoError] = useState(false);

  const tuner = { zoom: 19.5, tilt: 65, scale: 1.02, offset: 45 };

  const [carState, setCarState] = useState({ location: FALLBACK_LOCATION, heading: 0 });
  const carStateRef = useRef(carState);
  useEffect(() => { carStateRef.current = carState; }, [carState]);

  const adjustTilt = (amount: number) => {
    if (!mapInstanceRef.current) return;
    const currentTilt = mapInstanceRef.current.getTilt() || tuner.tilt;
    const newTilt = Math.min(Math.max(currentTilt + amount, 0), 75);
    mapInstanceRef.current.setTilt(newTilt);
  };

  const setup3DCarSystem = useCallback((map: google.maps.Map) => {
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
      // Using local path as primary, fallback to netlify if needed
      loader.load('/ES350E/ES350E.gltf', (gltf) => {
        const model = gltf.scene;
        model.traverse(node => {
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            const originalColor = (mesh.material as any).color?.clone() || new THREE.Color(0xffffff);
            const isTransparent = (mesh.material as any).transparent || (mesh.material as any).opacity < 0.9;
            const isNeutral = (originalColor.r === originalColor.g && originalColor.g === originalColor.b) || 
                              (originalColor.r < 0.5 && originalColor.g < 0.5 && originalColor.b < 0.5);

            if (isTransparent || isNeutral) {
              mesh.material = new THREE.MeshPhongMaterial({
                color: isTransparent ? originalColor : 0x050505,
                specular: 0x444444,
                shininess: 100,
                side: THREE.DoubleSide,
                transparent: isTransparent,
                opacity: (mesh.material as any).opacity || 1
              });
            } else {
              mesh.material = new THREE.MeshPhongMaterial({
                color: 0xcccaac, // Royal Gold
                specular: 0x888888,
                shininess: 2000,
                emissive: 0x221100,
                emissiveIntensity: 0.2,
                side: THREE.DoubleSide,
                flatShading: false
              });
            }
            (mesh.material as any).needsUpdate = true;
          }
        });
        model.rotation.x = Math.PI / 2;
        scene.add(model);
        carModelRef.current = model;
      }, undefined, (err) => {
        console.warn("Local GLTF not found, trying remote fallback...", err);
        loader.load('https://dmusera.netlify.app/ES350E.gltf', (gltf) => {
          const model = gltf.scene;
          model.rotation.x = Math.PI / 2;
          scene.add(model);
          carModelRef.current = model;
        });
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
      
      const { renderer, scene, camera } = (overlay as any);
      if (!renderer || !scene || !mapInstanceRef.current || !carModelRef.current) return;
      
      renderer.resetState();
      const zoom = mapInstanceRef.current.getZoom() || tuner.zoom;
      const pos = carStateRef.current.location;
      const heading = carStateRef.current.heading;
      
      const matrix = transformer.fromLatLngAltitude({ lat: pos.lat, lng: pos.lng, altitude: 3.5 });
      camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);
      
      const finalScale = tuner.scale * Math.pow(2, 20 - zoom);
      carModelRef.current.scale.set(finalScale, finalScale, finalScale);
      carModelRef.current.rotation.y = -(heading * Math.PI) / 180 + Math.PI;
      
      renderer.render(scene, camera);
      overlay.requestRedraw();
    };
    overlay.setMap(map);
  }, [isFullScreen]);

  const updateLocation = useCallback((pos: GeolocationPosition) => {
    const { latitude: lat, longitude: lng, heading } = pos.coords;
    const currentHeading = heading || 0;
    
    setCarState({ location: { lat, lng }, heading: currentHeading });
    
    if (mapInstanceRef.current && !isInteractingRef.current) {
      mapInstanceRef.current.moveCamera({
        center: { lat, lng },
        heading: currentHeading,
        tilt: tuner.tilt,
        zoom: tuner.zoom
      });
      mapInstanceRef.current.panBy(tuner.offset, 0);
    }
  }, []);

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
      map.addListener('tilesloaded', () => {
        if (map.getRenderingType() === 'VECTOR') {
          setup3DCarSystem(map);
        }
      });
      
      mapInstanceRef.current = map;
      new google.maps.TrafficLayer().setMap(map);
      setIsLoading(false);

      if (navigator.geolocation) {
        watchIdRef.current = navigator.geolocation.watchPosition(updateLocation, (err) => {
          console.error(err);
          setGeoError(true);
        }, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000
        });
      }
    };

    if (window.google && window.google.maps) initMap();
    else if (!scriptLoadedRef.current) {
      scriptLoadedRef.current = true;
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&v=weekly&callback=initMap`;
      script.async = true;
      (window as any).initMap = initMap;
      document.head.appendChild(script);
    }

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [setup3DCarSystem, updateLocation]);

  return (
    <Card className="h-full w-full overflow-hidden border-none bg-black relative group rounded-[2.5rem] shadow-2xl">
      <div ref={mapRef} className="absolute inset-0 z-0" />
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-md">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}
      
      {geoError && (
        <div className="absolute top-0 left-0 w-full h-full bg-black/70 text-white flex flex-col items-center justify-center text-center p-4 z-10 rounded-[2.5rem]">
          <MapPinOff className="w-12 h-12 text-red-500 mb-4" />
          <h3 className="font-bold text-lg mb-2">خدمة تحديد المواقع معطلة</h3>
          <p className="text-sm text-white/80">يرجى تمكين أذونات الموقع في إعدادات المتصفح لهذا الموقع للاستفادة من ميزات الخريطة.</p>
        </div>
      )}

      {!isFullScreen && (
        <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-3">
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors duration-200 flex items-center justify-center text-sm navigable focusable shadow-xl"
            tabIndex={0}
            onClick={() => { 
              isInteractingRef.current = false; 
              navigator.geolocation.getCurrentPosition(updateLocation); 
            }}
          >
            <MapPin className="w-5 h-5" />
          </button>

          <div className="relative z-[1000] flex flex-col gap-2">
            <div className="flex gap-2 bg-black/50 p-2 rounded-xl backdrop-blur border border-white/10 shadow-lg">
              <button onClick={() => adjustTilt(5)} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-white w-10 h-10 flex items-center justify-center focusable">
                <ChevronUp className="w-5 h-5" />
              </button>
              <span className="text-white text-[10px] uppercase font-bold self-center w-8 text-center">Tilt</span>
              <button onClick={() => adjustTilt(-5)} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-white w-10 h-10 flex items-center justify-center focusable">
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
