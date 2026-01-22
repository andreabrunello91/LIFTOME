import { useEffect, useRef, useState } from "react";
import { Task } from "@/components/TaskCard";
import { Button } from "@/components/ui/button";
import { Star, MessageCircle, ChevronUp, MapPin } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = "pk.eyJ1IjoiYnJ1bmUyMiIsImEiOiJjbWo4Yms2bGQwMHAzM2RyMDlhamxidmFvIn0.I9xGBb5ZCgFC5KtahiI3sA";

interface AcceptedTaskViewProps {
  task: Task;
  userPosition: { lat: number; lng: number };
  onOpenDetails: () => void;
  onOpenChat: () => void;
  unreadCount?: number;
}

export function AcceptedTaskView({ task, userPosition, onOpenDetails, onOpenChat, unreadCount = 0 }: AcceptedTaskViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const taskPosition = {
    lat: task.lat || userPosition.lat + 0.003,
    lng: task.lng || userPosition.lng + 0.004,
  };

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Calculate center and bounds first
    const centerLng = (userPosition.lng + taskPosition.lng) / 2;
    const centerLat = (userPosition.lat + taskPosition.lat) / 2;

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

    // Disable automatic animations that cause zoom issues
    map.current.dragRotate.disable();
    map.current.touchPitch.disable();

    map.current.on("load", async () => {
      if (!map.current) return;
      setMapReady(true);

      // Add user marker
      const userEl = document.createElement("div");
      userEl.innerHTML = `
        <div style="width: 20px; height: 20px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>
      `;
      new mapboxgl.Marker({ element: userEl })
        .setLngLat([userPosition.lng, userPosition.lat])
        .addTo(map.current);

      // Add task marker with profile photo
      const taskEl = document.createElement("div");
      taskEl.innerHTML = `
        <div style="width: 50px; height: 50px; background: white; border: 3px solid hsl(24, 100%, 50%); border-radius: 50%; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
          ${task.clientAvatar 
            ? `<img src="${task.clientAvatar}" style="width: 100%; height: 100%; object-fit: cover;" />`
            : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 24px; background: hsl(24, 100%, 95%);">${task.emoji}</div>`
          }
        </div>
      `;
      new mapboxgl.Marker({ element: taskEl })
        .setLngLat([taskPosition.lng, taskPosition.lat])
        .addTo(map.current);

      // Fetch route from Mapbox Directions API
      try {
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/walking/${userPosition.lng},${userPosition.lat};${taskPosition.lng},${taskPosition.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
        );
        const data = await response.json();

        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          const distance = route.distance < 1000 
            ? `${Math.round(route.distance)}m` 
            : `${(route.distance / 1000).toFixed(1)}km`;
          const duration = `${Math.round(route.duration / 60)} min`;
          setRouteInfo({ distance, duration });

          // Add route line
          if (!map.current.getSource("route")) {
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

          // Fit bounds once, then let user control
          const bounds = new mapboxgl.LngLatBounds();
          bounds.extend([userPosition.lng, userPosition.lat]);
          bounds.extend([taskPosition.lng, taskPosition.lat]);
          map.current.fitBounds(bounds, { 
            padding: 60,
            duration: 0 // No animation to prevent zoom issues
          });
        }
      } catch (error) {
        console.error("Error fetching route:", error);
        const dist = Math.round(task.distance);
        setRouteInfo({ distance: `${dist}m`, duration: `${Math.round(dist / 80)} min` });
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Only run once on mount

  return (
    <div className="flex flex-col h-full">
      {/* Map Section */}
      <div className="relative h-[50vh] bg-muted">
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
                <span className="text-primary">📍</span>
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
          <span className="text-xs font-medium text-foreground">In corso</span>
        </div>
      </div>

      {/* Task Info Box */}
      <div className="flex-1 bg-background -mt-6 rounded-t-3xl relative z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div 
          className="flex justify-center pt-3 pb-2 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        <div className="px-5 pb-6">
          {/* Profile Row */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-muted border-2 border-primary flex items-center justify-center overflow-hidden">
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
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-12"
              onClick={onOpenDetails}
            >
              <ChevronUp className="w-4 h-4 mr-2" />
              Dettagli
            </Button>
            <Button
              variant="cta"
              className="flex-1 rounded-xl h-12 relative"
              onClick={onOpenChat}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}