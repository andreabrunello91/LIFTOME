import { useState, useEffect, useRef, useCallback } from "react";
import { motion, PanInfo } from "framer-motion";
import { MessageCircle, Info, Star, Navigation, Clock, User, ChevronUp, ChevronDown, Phone, Check, Edit2, Trash2 } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = "pk.eyJ1IjoiYnJ1bmUyMiIsImEiOiJjbWo4Yms2bGQwMHAzM2RyMDlhamxidmFvIn0.I9xGBb5ZCgFC5KtahiI3sA";

interface LifterProfile {
  user_id: string;
  full_name: string;
  avatar_url: string;
  rating: number;
  total_reviews: number;
  is_kyc_verified: boolean;
  is_available: boolean;
}

interface ActiveTaskViewProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    published_price: number;
    status: string;
    location_lat: number | null;
    location_lng: number | null;
  };
  lifterProfile: LifterProfile;
  userPosition: { lat: number; lng: number };
  lifterPosition: { lat: number; lng: number } | null;
  unreadCount: number;
  onOpenChat: () => void;
  onOpenDetails: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onCancel: () => void;
  categoryEmoji: string;
}

function resolveTaskCoords(
  rawLat: number | null,
  rawLng: number | null,
  userPos: { lat: number; lng: number }
): { lat: number; lng: number } {
  const latA = rawLat != null ? Number(rawLat) : userPos.lat;
  const lngA = rawLng != null ? Number(rawLng) : userPos.lng;

  if (!Number.isFinite(latA) || !Number.isFinite(lngA)) {
    return { lat: userPos.lat, lng: userPos.lng };
  }

  const dA = Math.hypot(latA - userPos.lat, lngA - userPos.lng);
  const dB = Math.hypot(lngA - userPos.lat, latA - userPos.lng);
  const swapped = dB < dA;

  return swapped ? { lat: lngA, lng: latA } : { lat: latA, lng: lngA };
}

export function ActiveTaskMapView({
  task,
  lifterProfile,
  userPosition,
  lifterPosition,
  unreadCount,
  onOpenChat,
  onOpenDetails,
  onComplete,
  onEdit,
  onCancel,
  categoryEmoji,
}: ActiveTaskViewProps) {
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const lifterMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const taskIdRef = useRef<string | null>(null);

  const taskCoords = resolveTaskCoords(task.location_lat, task.location_lng, userPosition);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current && taskIdRef.current === task.id) return;

    // Cleanup previous
    mapRef.current?.remove();
    mapRef.current = null;
    userMarkerRef.current = null;
    lifterMarkerRef.current = null;
    taskIdRef.current = task.id;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const lifterPos = lifterPosition || { lat: taskCoords.lat + 0.002, lng: taskCoords.lng + 0.003 };

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [userPosition.lng, userPosition.lat],
      zoom: 14,
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), "top-right");

    mapRef.current.on("load", () => {
      setIsMapLoading(false);
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });

    // User marker (blue pulsing dot)
    const userMarkerEl = document.createElement("div");
    userMarkerEl.innerHTML = `
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
    userMarkerRef.current = new mapboxgl.Marker({ element: userMarkerEl })
      .setLngLat([userPosition.lng, userPosition.lat])
      .addTo(mapRef.current);

    // Lifter marker (green with avatar)
    const lifterMarkerEl = document.createElement("div");
    lifterMarkerEl.innerHTML = `
      <div style="position: relative;">
        <div style="width: 52px; height: 52px; background: white; border-radius: 50%; border: 4px solid #22c55e; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); overflow: hidden;">
          ${lifterProfile.avatar_url 
            ? `<img src="${lifterProfile.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;" />`
            : `<div style="width: 100%; height: 100%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; font-size: 20px;">👤</div>`
          }
        </div>
        <div style="position: absolute; top: -4px; left: -4px; width: 60px; height: 60px; border: 2px solid #22c55e; border-radius: 50%; animation: lifterPulse 2s infinite;"></div>
      </div>
      <style>
        @keyframes lifterPulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
      </style>
    `;
    lifterMarkerRef.current = new mapboxgl.Marker({ element: lifterMarkerEl })
      .setLngLat([lifterPos.lng, lifterPos.lat])
      .addTo(mapRef.current);

    // Fit bounds to show both markers
    const bounds = new mapboxgl.LngLatBounds()
      .extend([userPosition.lng, userPosition.lat])
      .extend([lifterPos.lng, lifterPos.lat]);
    mapRef.current.fitBounds(bounds, { padding: 80, duration: 500 });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [task.id]);

  // Update user marker position
  useEffect(() => {
    if (!userMarkerRef.current) return;
    userMarkerRef.current.setLngLat([userPosition.lng, userPosition.lat]);
  }, [userPosition.lat, userPosition.lng]);

  // Update lifter marker and route when position changes
  useEffect(() => {
    if (!mapRef.current || !lifterPosition) return;

    // Update lifter marker position
    if (lifterMarkerRef.current) {
      lifterMarkerRef.current.setLngLat([lifterPosition.lng, lifterPosition.lat]);
    }

    // Fetch and update route
    const updateRoute = async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/walking/${lifterPosition.lng},${lifterPosition.lat};${userPosition.lng},${userPosition.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
        );
        const data = await response.json();

        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          const distance = route.distance < 1000
            ? `${Math.round(route.distance)}m`
            : `${(route.distance / 1000).toFixed(1)}km`;
          const duration = `${Math.round(route.duration / 60)} min`;
          setRouteInfo({ distance, duration });

          // Update or add route layer
          if (mapRef.current) {
            const source = mapRef.current.getSource("route") as mapboxgl.GeoJSONSource;
            if (source) {
              source.setData({
                type: "Feature",
                properties: {},
                geometry: route.geometry,
              });
            } else if (mapRef.current.loaded()) {
              mapRef.current.addSource("route", {
                type: "geojson",
                data: {
                  type: "Feature",
                  properties: {},
                  geometry: route.geometry,
                },
              });

              mapRef.current.addLayer({
                id: "route",
                type: "line",
                source: "route",
                layout: { "line-join": "round", "line-cap": "round" },
                paint: { "line-color": "#22c55e", "line-width": 5, "line-opacity": 0.8 },
              });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching route:", error);
      }
    };

    updateRoute();
  }, [lifterPosition?.lat, lifterPosition?.lng, userPosition.lat, userPosition.lng]);

  // Resize map when panel changes
  useEffect(() => {
    const timer = setTimeout(() => {
      mapRef.current?.resize();
    }, 350);
    return () => clearTimeout(timer);
  }, [isMapExpanded]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.velocity.y < -200 || info.offset.y < -30) {
      setIsMapExpanded(false);
    } else if (info.velocity.y > 200 || info.offset.y > 30) {
      setIsMapExpanded(true);
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Map Section */}
      <motion.div
        className="relative bg-muted"
        animate={{
          height: isMapExpanded ? "calc(100% - 120px)" : "50%",
        }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        style={{ flexShrink: 0 }}
      >
        <div ref={mapContainerRef} className="absolute inset-0" />

        {isMapLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <div className="text-center">
              <span className="text-4xl animate-bounce block mb-2">🗺️</span>
              <p className="text-sm font-medium text-foreground">Caricamento mappa...</p>
            </div>
          </div>
        )}

        {/* Live indicator */}
        <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 z-10">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-xs font-bold">LIVE</span>
        </div>

        {/* Route info - ALWAYS visible */}
        <motion.div
          className="absolute top-4 left-4 z-10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-card/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-green-500/30">
            {routeInfo ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Navigation className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Distanza</p>
                    <p className="font-bold text-foreground text-lg">{routeInfo.distance}</p>
                  </div>
                </div>
                <div className="w-px h-10 bg-border" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Arrivo</p>
                    <p className="font-bold text-foreground text-lg">{routeInfo.duration}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-muted-foreground">Calcolo percorso...</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Map legend */}
        <div className="absolute bottom-6 left-3 flex items-center gap-2 z-10">
          <div className="bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-soft flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">Tu</span>
          </div>
          <div className="bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-soft flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">{lifterProfile.full_name.split(' ')[0]}</span>
          </div>
        </div>
      </motion.div>

      {/* Swipeable Lifter Panel */}
      <motion.div
        className="bg-background rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] overflow-hidden relative flex flex-col"
        style={{ marginTop: "-24px", zIndex: 20 }}
        animate={{
          height: isMapExpanded ? "120px" : "50%",
        }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
      >
        {/* Drag Handle */}
        <div className="w-full py-3 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none flex-shrink-0">
          <div className="w-12 h-1.5 bg-muted-foreground/40 rounded-full mb-1" />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {isMapExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                <span>Scorri per dettagli</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                <span>Scorri per mappa</span>
              </>
            )}
          </div>
        </div>

        {/* Mini view (collapsed) - Always shows distance/time and quick actions */}
        {isMapExpanded && (
          <div className="px-4 pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-3 border-green-500">
                    {lifterProfile.avatar_url ? (
                      <img src={lifterProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                </div>
                <div>
                  <p className="font-bold text-foreground">{lifterProfile.full_name}</p>
                  {routeInfo && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600 font-semibold">{routeInfo.distance}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-green-600 font-semibold">{routeInfo.duration}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onOpenDetails}
                  className="w-11 h-11 bg-muted rounded-full flex items-center justify-center tap-scale"
                >
                  <Info className="w-5 h-5 text-foreground" />
                </button>
                <button
                  onClick={onOpenChat}
                  className="w-11 h-11 bg-primary rounded-full flex items-center justify-center tap-scale relative"
                >
                  <MessageCircle className="w-5 h-5 text-primary-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Full content (expanded) */}
        {!isMapExpanded && (
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {/* Lifter card */}
            <div className="bg-green-500/10 rounded-2xl p-4 border border-green-500/30 mb-4">
              <div className="flex items-center gap-4 mb-3">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-green-500 shadow-lg">
                    {lifterProfile.avatar_url ? (
                      <img src={lifterProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <User className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-foreground text-lg">{lifterProfile.full_name}</h3>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= (lifterProfile.rating || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                    <span className="text-sm text-muted-foreground ml-1">
                      ({lifterProfile.total_reviews || 0})
                    </span>
                  </div>
                  {/* Route info badges */}
                  {routeInfo && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-green-500/20 px-2.5 py-1 rounded-lg">
                        <Navigation className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-bold text-green-700">{routeInfo.distance}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-green-500/20 px-2.5 py-1 rounded-lg">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-bold text-green-700">{routeInfo.duration}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Task info */}
            <div className="bg-card rounded-2xl p-4 border border-border mb-4">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl">{categoryEmoji}</span>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground">{task.title}</h4>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                  )}
                </div>
                <p className="text-xl font-bold text-primary">{task.published_price}€</p>
              </div>
            </div>

            {/* Action buttons */}
            <button
              onClick={onComplete}
              className="w-full h-14 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 tap-scale mb-3 shadow-lg"
            >
              <Check className="w-6 h-6" />
              Task Completato ✓
            </button>

            <div className="flex gap-3 mb-3">
              <button
                onClick={onOpenDetails}
                className="flex-1 h-12 bg-muted text-foreground rounded-xl font-semibold flex items-center justify-center gap-2 tap-scale"
              >
                <Info className="w-5 h-5" />
                Dettagli
              </button>
              <button
                onClick={onOpenChat}
                className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 tap-scale relative"
              >
                <MessageCircle className="w-5 h-5" />
                Chat
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onEdit}
                className="flex-1 h-12 bg-primary/10 text-primary rounded-xl font-semibold flex items-center justify-center gap-2 tap-scale"
              >
                <Edit2 className="w-5 h-5" />
                Modifica
              </button>
              <button
                onClick={onCancel}
                className="flex-1 h-12 bg-destructive/10 text-destructive rounded-xl font-semibold flex items-center justify-center gap-2 tap-scale"
              >
                <Trash2 className="w-5 h-5" />
                Annulla
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
