
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Compass, Navigation, MapPin, Search, Clock, Zap, Bookmark, Star, Trash2, Map as MapIcon } from "lucide-react";
import { GOOGLE_MAPS_API_KEY } from "@/lib/constants";
import { useMediaStore, SavedPlace } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "featureType": "poi.park", "elementType": "labels.text.stroke", "stylers": [{ "color": "#1b1b1b" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] },
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#373737" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#3c3c3c" }] },
  { "featureType": "road.highway.controlled_access", "elementType": "geometry", "stylers": [{ "color": "#4e4e4e" }] },
  { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "featureType": "transit", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#3d3d3d" }] }
];

export function MapWidget() {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [currentMarker, setCurrentMarker] = useState<google.maps.Marker | null>(null);
  const [navigationData, setNavigationData] = useState<{
    destination: string;
    distance: string;
    duration: string;
    eta: string;
  } | null>(null);
  const [showSavedPlaces, setShowSavedPlaces] = useState(false);
  const { savedPlaces, savePlace, removePlace } = useMediaStore();
  const [currentPlace, setCurrentPlace] = useState<SavedPlace | null>(null);

  const startNavigation = useCallback((destination: google.maps.LatLng, name: string = "Target Location") => {
    if (!map || !directionsRenderer) return;

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: map.getCenter()!,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result);
          const leg = result.routes[0].legs[0];
          
          const arrivalTime = new Date();
          arrivalTime.setSeconds(arrivalTime.getSeconds() + (leg.duration?.value || 0));

          setNavigationData({
            destination: leg.end_address,
            distance: leg.distance?.text || "0 KM",
            duration: leg.duration?.text || "0 Min",
            eta: arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });

          // Update current place status
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
  }, [map, directionsRenderer]);

  // Load API and Init Map
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap`;
    script.async = true;
    window.initMap = () => {
      if (mapRef.current) {
        const newMap = new google.maps.Map(mapRef.current, {
          center: { lat: 21.4225, lng: 39.8262 }, // Makkah
          zoom: 15,
          disableDefaultUI: true,
          styles: DARK_MAP_STYLE,
          gestureHandling: "greedy"
        });
        setMap(newMap);

        const renderer = new google.maps.DirectionsRenderer({
          map: newMap,
          suppressMarkers: false,
          polylineOptions: {
            strokeColor: "#3b82f6",
            strokeWeight: 6,
            strokeOpacity: 0.8
          }
        });
        setDirectionsRenderer(renderer);

        // Click Listener to drop pin
        newMap.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: e.latLng }, (results, status) => {
              let name = "Selected Point";
              if (status === "OK" && results && results[0]) {
                // Try to find a meaningful name
                const poi = results.find(r => r.types.includes("point_of_interest") || r.types.includes("establishment"));
                name = poi ? poi.formatted_address.split(',')[0] : results[0].formatted_address.split(',')[0];
              }
              startNavigation(e.latLng!, name);
            });
          }
        });

        // Setup Autocomplete
        if (searchInputRef.current) {
          const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current);
          autocomplete.bindTo("bounds", newMap);
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) return;

            newMap.setCenter(place.geometry.location);
            newMap.setZoom(17);
            
            startNavigation(place.geometry.location, place.name || "Search Result");
          });
        }
      }
    };
    document.head.appendChild(script);
  }, [startNavigation]);

  const handleSavePlace = () => {
    if (currentPlace) {
      savePlace(currentPlace);
    }
  };

  return (
    <Card className="h-full w-full overflow-hidden border-none bg-black relative group rounded-[2.5rem] ios-shadow">
      <div ref={mapRef} className="absolute inset-0 z-0" />
      
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none z-10" />

      {/* CarPlay Style HUD Overlay */}
      <div className="absolute top-6 left-6 z-20 flex flex-col gap-4 items-start w-[380px]">
        
        {/* Search Bar */}
        <div className="relative w-full group">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-blue-500 transition-colors">
            <Search className="w-5 h-5" />
          </div>
          <Input 
            ref={searchInputRef}
            placeholder="Tap map or search destination"
            className="w-full h-16 pl-14 pr-6 bg-black/80 backdrop-blur-3xl border-white/5 rounded-2xl text-white font-headline font-bold text-lg ios-shadow focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Navigation Intelligence Panel */}
        {navigationData && (
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
                  onClick={handleSavePlace}
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
                directionsRenderer?.setDirections({ routes: [] });
                if (map) map.setZoom(15);
                setCurrentPlace(null);
              }}
            >
              Cancel Navigation
            </Button>
          </div>
        )}
      </div>

      {/* Floating System Controls */}
      <div className="absolute bottom-8 right-8 z-20 flex flex-col gap-4">
        <Button 
          className="w-16 h-16 rounded-full bg-zinc-900/90 backdrop-blur-3xl flex items-center justify-center border border-white/10 shadow-2xl hover:bg-white/10 transition-all"
          onClick={() => setShowSavedPlaces(!showSavedPlaces)}
        >
          <Bookmark className={`w-7 h-7 ${showSavedPlaces ? "text-yellow-500 fill-current" : "text-white"}`} />
        </Button>
        <Button 
          className="w-16 h-16 rounded-full bg-zinc-900/90 backdrop-blur-3xl flex items-center justify-center border border-white/10 shadow-2xl hover:bg-white/10 transition-all"
          onClick={() => {
            if (map) {
              map.setCenter({ lat: 21.4225, lng: 39.8262 });
              map.setZoom(15);
            }
          }}
        >
          <Compass className="w-7 h-7 text-white animate-[spin_15s_linear_infinite]" />
        </Button>
      </div>

      {/* Saved Places Panel */}
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
                    if (map) {
                      const pos = new google.maps.LatLng(place.lat, place.lng);
                      map.setCenter(pos);
                      map.setZoom(17);
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
