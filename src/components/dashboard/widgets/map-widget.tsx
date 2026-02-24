
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Compass, Navigation, MapPin, Search, Clock, Zap, Bookmark, Star, Trash2, Map as MapIcon, AlertTriangle, ExternalLink, Target, Loader2, Flag, ChevronUp, ChevronDown, Plus, Minus, Save } from "lucide-react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/constants";
import { useMediaStore, SavedPlace } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { cn } from "@/lib/utils";
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const DARK_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
  { "featureType": "administrative.country", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
  { "featureType": "administrative.land_parcel", "stylers": [{ "visibility": "off" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

const HOME1_COORDS = { lat: 17.067330, lng: 54.160190 }; 
const HOME2_COORDS = { lat: 17.081852, lng: 54.158345 };

declare global {
  interface Window {
    initGoogleMaps: () => void;
    gm_authFailure?: () => void;
  }
}

export function MapWidget() {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const carOverlayRef = useRef<google.maps.WebGLOverlayView | null>(null);
  const carModelRef = useRef<THREE.Group | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [navigationData, setNavigationData] = useState<{
    destination: string;
    distance: string;
    duration: string;
    eta: string;
  } | null>(null);
  
  const [trafficStats, setTrafficData] = useState<{
    home1: { delay: number; colorClass: string };
    home2: { delay: number; colorClass: string };
  }>({
    home1: { delay: -1, colorClass: 'bg-zinc-800' },
    home2: { delay: -1, colorClass: 'bg-zinc-800' }
  });

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

  const [showSavedPlaces, setShowSavedPlaces] = useState(false);
  const { savedPlaces, savePlace, removePlace } = useMediaStore();
  const [currentPlace, setCurrentPlace] = useState<SavedPlace | null>(null);

  const mapPlaceholder = PlaceHolderImages.find(img => img.id === 'map-placeholder');

  const getTrafficColorClass = (delayPercentage: number) => {
    if (delayPercentage === -1) return 'bg-zinc-800 text-white/50';
    if (delayPercentage < 5) return 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]';
    if (delayPercentage < 20) return 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]';
    return 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]';
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
      light1.position.set(25, 8, 15); 
      scene.add(light1);

      const light2 = new THREE.DirectionalLight(0xffffff, 0.75);
      light2.position.set(-25, 5, 15); 
      scene.add(light2);

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
              node.material = new THREE.MeshPhongMaterial({
                color: 0xcccaac, // Royal Gold Deep
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
        lat: carState.location.lat, 
        lng: carState.location.lng, 
        altitude: 3.5 
      });
      
      camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix);

      const finalScale = tuner.scale * Math.pow(2, 20 - zoom); 
      carModelRef.current.scale.set(finalScale, finalScale, finalScale);
      carModelRef.current.rotation.y = -(carState.heading * Math.PI) / 180 + Math.PI;

      renderer.render(scene, camera);
      overlay.requestRedraw(); 
    };

    overlay.setMap(map);
  }, [carState, tuner]);

  const fetchTrafficStatus = async (destination: { lat: number; lng: number }) => {
    if (!window.google || !mapInstanceRef.current || !directionsServiceRef.current) return -1;

    const origin = mapInstanceRef.current.getCenter();
    if (!origin) return -1;

    try {
      const response = await directionsServiceRef.current.route({
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: google.maps.TrafficModel.BEST_GUESS
        }
      });

      if (response.status === 'OK') {
        const leg = response.routes[0].legs[0];
        const durationInTraffic = leg.duration_in_traffic?.value || leg.duration?.value || 0;
        const predictedDuration = leg.duration?.value || 1;

        if (predictedDuration > 0) {
          const delay = Math.round(((durationInTraffic - predictedDuration) / predictedDuration) * 100);
          return Math.max(0, delay);
        }
      }
      return -1;
    } catch (e) {
      console.error("Traffic status fetch failed:", e);
      return -1;
    }
  };

  const updateTrafficIndicators = useCallback(async () => {
    const delay1 = await fetchTrafficStatus(HOME1_COORDS);
    const delay2 = await fetchTrafficStatus(HOME2_COORDS);

    setTrafficData({
      home1: { delay: delay1, colorClass: getTrafficColorClass(delay1) },
      home2: { delay: delay2, colorClass: getTrafficColorClass(delay2) }
    });
  }, []);

  const displayLocationMarker = (coords: { lat: number; lng: number }, title: string) => {
    if (!mapInstanceRef.current) return;

    const tempMarker = new google.maps.Marker({
      position: coords,
      map: mapInstanceRef.current,
      title: title,
      animation: google.maps.Animation.BOUNCE,
      icon: {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 8,
        fillColor: "#FF00FF",
        fillOpacity: 0.9,
        strokeColor: "#FFFFFF",
        strokeWeight: 2
      }
    });

    mapInstanceRef.current.setCenter(coords);
    mapInstanceRef.current.setZoom(16);

    setTimeout(() => {
      tempMarker.setMap(null);
    }, 10000);
  };

  const startNavigation = (destination: google.maps.LatLng, name: string = "Target Location") => {
    const map = mapInstanceRef.current;
    if (!map || !directionsServiceRef.current || !directionsRendererRef.current) return;

    directionsServiceRef.current.route(
      {
        origin: map.getCenter()!,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result && directionsRendererRef.current) {
          directionsRendererRef.current.setDirections(result);
          const leg = result.routes[0].legs[0];
          
          const arrivalTime = new Date();
          arrivalTime.setSeconds(arrivalTime.getSeconds() + (leg.duration?.value || 0));

          setNavigationData({
            destination: leg.end_address,
            distance: leg.distance?.text || "0 KM",
            duration: leg.duration?.text || "0 Min",
            eta: arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });

          setCurrentPlace({
            id: `pin-${Date.now()}`,
            name: name,
            address: leg.end_address,
            lat: destination.lat(),
            lng: destination.lng()
          });
        }
      }
    );
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation && mapInstanceRef.current) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCarState({
            location: pos,
            heading: position.coords.heading || 0
          });
          mapInstanceRef.current?.setCenter(pos);
          mapInstanceRef.current?.setZoom(tuner.zoom);
          mapInstanceRef.current?.setHeading(position.coords.heading || 0);
          updateTrafficIndicators();
        }
      );
    }
  };

  useEffect(() => {
    window.gm_authFailure = () => {
      setApiError(true);
      setIsLoading(false);
    };

    const initMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      try {
        const map = new google.maps.Map(mapRef.current, {
          center: carState.location,
          zoom: tuner.zoom,
          tilt: tuner.tilt,
          mapId: '6c6951a9289b612a97923702', // WebGL required ID
          disableDefaultUI: true,
          styles: DARK_MAP_STYLE,
          gestureHandling: "greedy",
          renderingType: google.maps.RenderingType.VECTOR
        });
        mapInstanceRef.current = map;

        directionsServiceRef.current = new google.maps.DirectionsService();
        const renderer = new google.maps.DirectionsRenderer({
          map: map,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: "#3b82f6",
            strokeWeight: 6,
            strokeOpacity: 0.8
          }
        });
        directionsRendererRef.current = renderer;

        setup3DCarSystem(map);

        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: e.latLng }, (results, status) => {
              let name = "Selected Point";
              if (status === "OK" && results && results[0]) {
                const poi = results.find(r => r.types.includes("point_of_interest"));
                name = poi ? poi.formatted_address.split(',')[0] : results[0].formatted_address.split(',')[0];
              }
              startNavigation(e.latLng!, name);
            });
          }
        });

        if (searchInputRef.current) {
          const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current);
          autocomplete.bindTo("bounds", map);
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) return;
            map.setCenter(place.geometry.location);
            map.setZoom(17);
            startNavigation(place.geometry.location, place.name || "Search Result");
          });
        }

        setIsLoading(false);
        updateTrafficIndicators();
      } catch (e) {
        console.error("Map Init Error", e);
        setApiError(true);
        setIsLoading(false);
      }
    };

    if (window.google && window.google.maps) {
      initMap();
    } else {
      window.initGoogleMaps = initMap;
      if (!document.getElementById('google-maps-script')) {
        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGoogleMaps`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }

    const trafficInterval = setInterval(updateTrafficIndicators, 600000); 

    return () => clearInterval(trafficInterval);
  }, [updateTrafficIndicators, setup3DCarSystem]);

  return (
    <Card className="h-full w-full overflow-hidden border-none bg-black relative group rounded-[2.5rem] ios-shadow">
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        </div>
      )}

      {apiError ? (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-900/50 backdrop-blur-3xl">
          {mapPlaceholder && (
            <Image 
              src={mapPlaceholder.imageUrl} 
              alt="Map Preview" 
              fill 
              className="object-cover opacity-20 grayscale pointer-events-none"
            />
          )}
          <div className="relative z-10 space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-red-500/20 flex items-center justify-center mx-auto border border-red-500/30">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-headline font-bold text-white">Navigation Offline</h3>
              <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
                Google Maps API requires billing to be enabled. Please visit the Cloud Console to activate your account.
              </p>
            </div>
            <Button asChild className="bg-white text-black font-bold rounded-2xl h-12 px-8 hover:bg-zinc-200">
              <a href="https://console.cloud.google.com/project/_/billing/enable" target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" /> Enable Billing
              </a>
            </Button>
          </div>
        </div>
      ) : (
        <div ref={mapRef} className="absolute inset-0 z-0" />
      )}
      
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none z-10" />

      {/* Map Tuner Controls */}
      {!apiError && !isLoading && (
        <div className="absolute top-6 right-6 z-20 flex flex-col gap-2">
          <div className="flex flex-col gap-1 bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-white/10">
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => setTuner(prev => ({ ...prev, scale: prev.scale + 0.05 }))}
              className="h-10 w-10 text-white hover:bg-white/10"
            >
              <Plus className="w-4 h-4" />
            </Button>
            <span className="text-[10px] text-white/40 font-bold text-center uppercase tracking-tighter">Scale</span>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => setTuner(prev => ({ ...prev, scale: Math.max(0.1, prev.scale - 0.05) }))}
              className="h-10 w-10 text-white hover:bg-white/10"
            >
              <Minus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-col gap-1 bg-black/60 backdrop-blur-xl p-2 rounded-2xl border border-white/10">
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => {
                const newTilt = Math.min(75, tuner.tilt + 5);
                setTuner(prev => ({ ...prev, tilt: newTilt }));
                mapInstanceRef.current?.setTilt(newTilt);
              }}
              className="h-10 w-10 text-white hover:bg-white/10"
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <span className="text-[10px] text-white/40 font-bold text-center uppercase tracking-tighter">Tilt</span>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => {
                const newTilt = Math.max(0, tuner.tilt - 5);
                setTuner(prev => ({ ...prev, tilt: newTilt }));
                mapInstanceRef.current?.setTilt(newTilt);
              }}
              className="h-10 w-10 text-white hover:bg-white/10"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
          <Button 
            size="icon" 
            className="h-12 w-12 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/40"
            onClick={() => {
              localStorage.setItem('map_tuner_settings', JSON.stringify(tuner));
              alert("✅ تم حفظ إعدادات العرض بنجاح!");
            }}
          >
            <Save className="w-5 h-5" />
          </Button>
        </div>
      )}

      <div className="absolute top-6 left-6 z-20 flex flex-col gap-4 items-start w-[380px]">
        <div className="relative w-full group">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-blue-500 transition-colors">
            <Search className="w-5 h-5" />
          </div>
          <Input 
            ref={searchInputRef}
            disabled={apiError || isLoading}
            placeholder={apiError ? "Navigation unavailable" : "Tap map or search destination"}
            className="w-full h-16 pl-14 pr-6 bg-black/80 backdrop-blur-3xl border-white/5 rounded-2xl text-white font-headline font-bold text-lg ios-shadow focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-muted-foreground/50 disabled:opacity-50"
          />
        </div>

        {/* Traffic Indicators Buttons */}
        {!apiError && !isLoading && (
          <div className="flex gap-2 w-full mt-2">
            <Button
              variant="secondary"
              onClick={() => displayLocationMarker(HOME1_COORDS, 'إشارات ق')}
              className={cn(
                "flex-1 h-14 rounded-2xl font-bold transition-all border border-white/10 backdrop-blur-xl",
                trafficStats.home1.colorClass
              )}
            >
              إشارات ق {trafficStats.home1.delay !== -1 ? `(${trafficStats.home1.delay}%)` : ''}
            </Button>
            <Button
              variant="secondary"
              onClick={() => displayLocationMarker(HOME2_COORDS, 'تقاطع ش')}
              className={cn(
                "flex-1 h-14 rounded-2xl font-bold transition-all border border-white/10 backdrop-blur-xl",
                trafficStats.home2.colorClass
              )}
            >
              تقاطع ش {trafficStats.home2.delay !== -1 ? `(${trafficStats.home2.delay}%)` : ''}
            </Button>
          </div>
        )}

        {navigationData && !apiError && (
          <div className="p-6 rounded-[2.5rem] bg-black/90 backdrop-blur-3xl border border-white/10 space-y-5 w-full shadow-2xl animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-[1.2rem] bg-blue-600 flex items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.4)]">
                <Navigation className="text-white w-9 h-9 rotate-45" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-headline font-bold text-xl text-white truncate">{currentPlace?.name || "Active Route"}</h3>
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-3 h-3 fill-current" /> GPS Active • 5G
                </p>
              </div>
              {currentPlace && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => savePlace(currentPlace)}
                  className={`rounded-2xl h-12 w-12 transition-all ${savedPlaces.some(p => p.address === currentPlace.address) ? "text-yellow-500 bg-yellow-500/10" : "text-white/40 hover:bg-white/10"}`}
                >
                  <Star className={`w-6 h-6 ${savedPlaces.some(p => p.address === currentPlace.address) ? "fill-current" : ""}`} />
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-[1.5rem] border border-white/5">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest block mb-1">Arrival</span>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-xl font-bold text-white font-headline">{navigationData.eta}</span>
                </div>
              </div>
              <div className="bg-white/5 p-4 rounded-[1.5rem] border border-white/5">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest block mb-1">Dist</span>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-accent" />
                  <span className="text-xl font-bold text-white font-headline">{navigationData.distance}</span>
                </div>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full h-14 rounded-2xl bg-white/5 border-white/10 text-white font-bold hover:bg-red-500/10 hover:text-red-500 transition-all border-none"
              onClick={() => {
                setNavigationData(null);
                directionsRendererRef.current?.setDirections({ routes: [] });
                mapInstanceRef.current?.setZoom(15);
                setCurrentPlace(null);
              }}
            >
              Cancel Navigation
            </Button>
          </div>
        )}
      </div>

      <div className="absolute bottom-8 right-8 z-20 flex flex-col gap-4">
        <Button 
          className="w-16 h-16 rounded-full bg-zinc-900/90 backdrop-blur-3xl flex items-center justify-center border border-white/10 shadow-2xl hover:bg-white/10 transition-all"
          onClick={() => setShowSavedPlaces(!showSavedPlaces)}
        >
          <Bookmark className={`w-7 h-7 ${showSavedPlaces ? "text-yellow-500 fill-current" : "text-white"}`} />
        </Button>
        <Button 
          className="w-16 h-16 rounded-full bg-blue-600 backdrop-blur-3xl flex items-center justify-center border border-white/10 shadow-2xl hover:bg-blue-500 transition-all"
          onClick={handleGetCurrentLocation}
        >
          <Target className="w-7 h-7 text-white" />
        </Button>
        {!apiError && (
          <Button 
            className="w-16 h-16 rounded-full bg-zinc-900/90 backdrop-blur-3xl flex items-center justify-center border border-white/10 shadow-2xl hover:bg-white/10 transition-all"
            onClick={() => {
              mapInstanceRef.current?.setCenter(carState.location);
              mapInstanceRef.current?.setZoom(tuner.zoom);
              mapInstanceRef.current?.setTilt(tuner.tilt);
            }}
          >
            <Compass className="w-7 h-7 text-white animate-[spin_15s_linear_infinite]" />
          </Button>
        )}
      </div>

      {showSavedPlaces && (
        <div className="absolute inset-y-0 right-0 w-80 bg-black/95 backdrop-blur-3xl border-l border-white/10 z-30 p-8 flex flex-col gap-6 animate-in slide-in-from-right-full duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-headline font-bold text-white">Saved Hub</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowSavedPlaces(false)} className="text-white">
              <Zap className="w-5 h-5 rotate-45 text-blue-400" />
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4">
            {savedPlaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-center opacity-40">
                <MapIcon className="w-12 h-12 text-muted-foreground" />
                <p className="text-xs font-bold uppercase tracking-widest">No saved points</p>
              </div>
            ) : (
              savedPlaces.map((place) => (
                <div 
                  key={place.id}
                  className="p-4 rounded-[1.5rem] bg-white/5 border border-white/5 hover:bg-white/10 transition-all group cursor-pointer"
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      const pos = new google.maps.LatLng(place.lat, place.lng);
                      mapInstanceRef.current.setCenter(pos);
                      mapInstanceRef.current.setZoom(17);
                      startNavigation(pos, place.name);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-white truncate text-sm">{place.name}</h4>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 rounded-xl"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePlace(place.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-[9px] text-muted-foreground truncate uppercase font-bold tracking-widest">{place.address}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
