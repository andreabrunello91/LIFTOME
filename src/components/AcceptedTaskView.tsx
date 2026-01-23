import { useEffect, useRef, useState } from "react";
import { Task } from "@/components/TaskCard";
import { Star, MessageCircle, ChevronUp, ChevronDown, MapPin, Info, User, Navigation } from "lucide-react";
import { motion, PanInfo } from "framer-motion";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = "pk.eyJ1IjoiYnJ1bmUyMiIsImEiOiJjbWo4Yms2bGQwMHAzM2RyMDlhamxidmFvIn0.I9xGBb5ZCgFC5KtahiI3sA";

interface AcceptedTaskViewProps {
  task: Task;
  userPosition: { lat: number; lng: number };
  lifterPosition?: { lat: number; lng: number } | null;
  onOpenDetails: () => void;
  onOpenChat: () => void;
  unreadCount?: number;
}

export function AcceptedTaskView({ task, userPosition, lifterPosition, onOpenDetails, onOpenChat, unreadCount = 0 }: AcceptedTaskViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const lifterMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const taskPosition = {
    lat: task.lat || userPosition.lat + 0.003,
    lng: task.lng || userPosition.lng + 0.004,
  };

  // Calculate lifter position with fallback
  const currentLifterPos = lifterPosition || {
    lat: taskPosition.lat + 0.002,
    lng: taskPosition.lng + 0.003,
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const centerLng = (userPosition.lng + currentLifterPos.lng) / 2;
    const centerLat = (userPosition.lat + currentLifterPos.lat) / 2;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [centerLng, centerLat],
      zoom: 14,
      interactive: true,
      dragPan: true,
      scrollZoom: true,
      doubleClickZoom: true,
      touchZoomRotate: true,
    });

    map.current.dragRotate.disable();
    map.current.touchPitch.disable();

    map.current.on("load", async () => {
      if (!map.current) return;
      setMapReady(true);

      // Add user marker with pulse
      const userEl = document.createElement("div");
      userEl.innerHTML = `
        <div style="position: relative;">
          <div style="width: 20px; height: 20px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>
          <div style="position: absolute; top: -5px; left: -5px; width: 30px; height: 30px; background: rgba(59, 130, 246, 0.3); border-radius: 50%; animation: pulse 2s infinite;"></div>
        </div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(2); opacity: 0; }
          }
        </style>
      `;
      new mapboxgl.Marker({ element: userEl })
        .setLngLat([userPosition.lng, userPosition.lat])
        .addTo(map.current);

      // Add lifter marker with profile photo
      const lifterEl = document.createElement("div");
      lifterEl.innerHTML = `
        <div style="width: 52px; height: 52px; background: white; border: 4px solid #22c55e; border-radius: 50%; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
          ${task.clientAvatar 
            ? `<img src="${task.clientAvatar}" style="width: 100%; height: 100%; object-fit: cover;" />`
            : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 24px; background: #dcfce7;">👤</div>`
          }
        </div>
      `;
      lifterMarkerRef.current = new mapboxgl.Marker({ element: lifterEl })
        .setLngLat([currentLifterPos.lng, currentLifterPos.lat])
        .addTo(map.current);

      // Fetch and display route
      await updateRoute(currentLifterPos);

      // Fit bounds
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([userPosition.lng, userPosition.lat]);
      bounds.extend([currentLifterPos.lng, currentLifterPos.lat]);
      map.current.fitBounds(bounds, { padding: 80, duration: 0 });
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update lifter position and route when lifterPosition changes
  useEffect(() => {
    if (!map.current || !mapReady) return;

    // Update lifter marker position
    if (lifterMarkerRef.current && lifterPosition) {
      lifterMarkerRef.current.setLngLat([lifterPosition.lng, lifterPosition.lat]);
    }

    // Update route
    if (lifterPosition) {
      updateRoute(lifterPosition);
    }
  }, [lifterPosition?.lat, lifterPosition?.lng, mapReady]);

  const updateRoute = async (lifterPos: { lat: number; lng: number }) => {
    if (!map.current) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/walking/${lifterPos.lng},${lifterPos.lat};${userPosition.lng},${userPosition.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
      );
      const data = await response.json();

      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        const distance = route.distance < 1000 
          ? `${Math.round(route.distance)}m` 
          : `${(route.distance / 1000).toFixed(1)}km`;
        const duration = `${Math.round(route.duration / 60)} min`;
        setRouteInfo({ distance, duration });

        // Update or add route source
        const source = map.current.getSource("route") as mapboxgl.GeoJSONSource;
        if (source) {
          source.setData({
            type: "Feature",
            properties: {},
            geometry: route.geometry,
          });
        } else {
          map.current.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: route.geometry,
            },
          });

          map.current.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#FF5A00",
              "line-width": 5,
              "line-opacity": 0.8,
            },
          });
        }
      }
    } catch (error) {
      console.error("Error fetching route:", error);
      const dist = Math.round(task.distance);
      setRouteInfo({ distance: `${dist}m`, duration: `${Math.round(dist / 80)} min` });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Map Section - expandable */}
      <motion.div 
        className="relative bg-muted"
        animate={{ 
          height: isMapExpanded ? 'calc(100% - 100px)' : '50%'
        }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        style={{ flexShrink: 0 }}
      >
        <div ref={mapContainer} className="absolute inset-0" />
        
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
            <div className="text-center">
              <span className="text-4xl animate-bounce block mb-2">🗺️</span>
              <p className="text-sm font-medium text-foreground">Caricamento mappa...</p>
            </div>
          </div>
        )}
        
        {/* Route info overlay */}
        {routeInfo && (
          <div className="absolute top-4 left-4 right-4 flex justify-center z-10">
            <div className="bg-card/95 backdrop-blur-sm px-5 py-3 rounded-2xl shadow-lg flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-primary" />
                <span className="font-bold text-foreground">{routeInfo.distance}</span>
              </div>
              <div className="w-px h-5 bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">🚶</span>
                <span className="font-medium text-foreground">{routeInfo.duration}</span>
              </div>
            </div>
          </div>
        )}

        {/* Live indicator */}
        <div className="absolute top-4 right-4 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-soft flex items-center gap-2 z-10">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-foreground">In arrivo</span>
        </div>

        {/* Map legend - moved up to avoid panel overlap */}
        <div className="absolute bottom-8 left-3 flex items-center gap-2 z-10">
          <div className="bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-soft flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">Tu</span>
          </div>
          <div className="bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-soft flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-medium text-muted-foreground">{task.clientName}</span>
          </div>
        </div>
      </motion.div>

      {/* Swipeable Task Info Panel */}
      <motion.div 
        className="bg-background rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] overflow-hidden relative flex-1"
        style={{ marginTop: "-24px", zIndex: 20 }}
        animate={{ 
          height: isMapExpanded ? '100px' : '50%'
        }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={(_: any, info: PanInfo) => {
          if (info.velocity.y < -200 || info.offset.y < -30) {
            setIsMapExpanded(false);
          } else if (info.velocity.y > 200 || info.offset.y > 30) {
            setIsMapExpanded(true);
          }
        }}
      >
        {/* Drag Handle */}
        <div className="w-full py-3 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none">
          <div className="w-12 h-1.5 bg-muted-foreground/40 rounded-full mb-1.5" />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {isMapExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                <span>Trascina per dettagli</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                <span>Trascina per mappa</span>
              </>
            )}
          </div>
        </div>

        {/* Collapsed mini-view */}
        {isMapExpanded && (
          <div className="px-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-green-500">
                {task.clientAvatar ? (
                  <img src={task.clientAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{task.clientName}</p>
                <p className="text-xs text-green-600">In arrivo • {routeInfo?.duration || '...'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={onOpenDetails}
                className="w-10 h-10 bg-muted rounded-full flex items-center justify-center tap-scale"
              >
                <Info className="w-5 h-5 text-foreground" />
              </button>
              <button 
                onClick={onOpenChat}
                className="w-10 h-10 bg-primary rounded-full flex items-center justify-center tap-scale relative"
              >
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Full content when not expanded */}
        {!isMapExpanded && (
          <div className="px-5 pb-6 overflow-y-auto" style={{ height: 'calc(100% - 50px)' }}>
            {/* Profile Row */}
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-muted border-3 border-green-500 flex items-center justify-center overflow-hidden">
                {task.clientAvatar ? (
                  <img src={task.clientAvatar} alt={task.clientName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">{task.emoji}</span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-foreground">{task.clientName}</h3>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium text-foreground">{task.rating?.toFixed(1) || "4.8"}</span>
                  <span className="text-muted-foreground text-sm">• {task.reviewCount || 0} recensioni</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-primary">{task.price}€</span>
              </div>
            </div>

            {/* Task info */}
            <div className="bg-muted/50 rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{task.emoji}</span>
                <h4 className="font-semibold text-foreground">{task.title}</h4>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{task.distance}m da te</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={onOpenDetails}
                className="flex-1 h-12 bg-muted text-foreground rounded-xl font-semibold flex items-center justify-center gap-2 tap-scale"
              >
                <Info className="w-4 h-4" />
                Dettagli
              </button>
              <button
                onClick={onOpenChat}
                className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 tap-scale relative"
              >
                <MessageCircle className="w-4 h-4" />
                Chat
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
