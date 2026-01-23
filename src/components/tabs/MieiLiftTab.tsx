import { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { MessageCircle, Info, Trash2, Edit2, X, Star, Shield, MapPin, Clock, ChevronLeft, Navigation, Loader2, User, Users, CheckCircle, Check, ChevronUp, ChevronDown } from "lucide-react";
import { ChatView } from "@/components/ChatView";
import { Task } from "@/components/TaskCard";
import { toast } from "@/hooks/use-toast";
import { notificationService } from "@/services/notificationService";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { TipPopup } from "@/components/TipPopup";
import { ReviewPopup } from "@/components/ReviewPopup";
import { motion, PanInfo } from "framer-motion";
import { WaitingForLifterView } from "@/components/WaitingForLifterView";
import { ActiveTaskMapView } from "@/components/ActiveTaskMapView";

const MAPBOX_TOKEN = "pk.eyJ1IjoiYnJ1bmUyMiIsImEiOiJjbWo4Yms2bGQwMHAzM2RyMDlhamxidmFvIn0.I9xGBb5ZCgFC5KtahiI3sA";

interface DBTask {
  id: string;
  client_id: string;
  lifter_id: string | null;
  title: string;
  description: string | null;
  category: string;
  price: number;
  published_price: number;
  status: string;
  is_sos: boolean;
  is_scheduled: boolean;
  scheduled_at: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  lifter_location_lat?: number | null;
  lifter_location_lng?: number | null;
  lifter_location_updated_at?: string | null;
}

interface TaskApplication {
  id: string;
  task_id: string;
  lifter_id: string;
  status: string;
  created_at: string;
  lifter_profile?: {
    user_id: string;
    full_name: string;
    avatar_url: string;
    rating: number;
    total_reviews: number;
    is_kyc_verified: boolean;
    is_available: boolean;
    bio?: string;
    skills?: string[];
  };
}

interface LifterProfile {
  user_id: string;
  full_name: string;
  avatar_url: string;
  rating: number;
  total_reviews: number;
  is_kyc_verified: boolean;
  is_available: boolean;
  location_lat?: number;
  location_lng?: number;
}

const categoryEmojis: Record<string, string> = {
  spesa: "🛒",
  montaggio: "🔧",
  riparazioni: "🔨",
  traslochi: "📦",
  pulizie: "🧹",
  giardinaggio: "🌱",
  tech: "💻",
  altro: "✨",
};

function resolveTaskCoords(
  rawLat: number | null,
  rawLng: number | null,
  userPos: { lat: number; lng: number }
): { lat: number; lng: number; swapped: boolean } {
  const latA = rawLat != null ? Number(rawLat) : userPos.lat;
  const lngA = rawLng != null ? Number(rawLng) : userPos.lng;

  if (!Number.isFinite(latA) || !Number.isFinite(lngA)) {
    return { lat: userPos.lat, lng: userPos.lng, swapped: false };
  }

  // Heuristic: if coords were stored swapped, choose the interpretation closer to the user's position.
  const dA = Math.hypot(latA - userPos.lat, lngA - userPos.lng);
  const dB = Math.hypot(lngA - userPos.lat, latA - userPos.lng);
  const swapped = dB < dA;

  return swapped ? { lat: lngA, lng: latA, swapped } : { lat: latA, lng: lngA, swapped };
}

type TabMode = "in_corso" | "programmati";
type ViewMode = "list" | "chat" | "details" | "proposals" | "accepted";

interface MieiLiftTabProps {
  onOpenChat?: (userId: string) => void;
}

export const MieiLiftTab = forwardRef<HTMLDivElement, MieiLiftTabProps>(function MieiLiftTab({ onOpenChat }, ref) {
  const [tabMode, setTabMode] = useState<TabMode>("in_corso");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [tasks, setTasks] = useState<DBTask[]>([]);
  const [applications, setApplications] = useState<TaskApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [editingTask, setEditingTask] = useState<DBTask | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [detailTask, setDetailTask] = useState<DBTask | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [selectedTaskForProposals, setSelectedTaskForProposals] = useState<DBTask | null>(null);
  const [assignedLifterProfile, setAssignedLifterProfile] = useState<LifterProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("Cliente");
  
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [lifterPosition, setLifterPosition] = useState<{ lat: number; lng: number } | null>(null);
  
  // Completion flow states
  const [showTipPopup, setShowTipPopup] = useState(false);
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const [completingTask, setCompletingTask] = useState<DBTask | null>(null);
  const [tipAmount, setTipAmount] = useState(0);
  
  // Unread messages count
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Map fullscreen state
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const acceptedMapContainer = useRef<HTMLDivElement>(null);

  const map = useRef<mapboxgl.Map | null>(null);
  const acceptedMap = useRef<mapboxgl.Map | null>(null);

  const mapKeyRef = useRef<string | null>(null);
  const acceptedMapKeyRef = useRef<string | null>(null);

  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const lifterMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const taskMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const taskMarkerAvatarUrlRef = useRef<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const hasUserPosition = userPosition !== null;

  // Fetch tasks and applications from database
  const fetchTasksAndApplications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }
    setCurrentUserId(user.id);

    // Fetch current user's profile name for notifications
    const { data: myProfile } = await supabase.rpc('get_public_profile', { profile_user_id: user.id });
    if (myProfile && myProfile.length > 0) {
      setCurrentUserName(myProfile[0].full_name || 'Cliente');
    }

    // Fetch tasks
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('client_id', user.id)
      .neq('status', 'completato')
      .neq('status', 'cancellato')
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
    } else {
      setTasks(tasksData || []);
      
      // Fetch lifter profile if task is assigned
      const assignedTask = tasksData?.find(t => t.lifter_id && (t.status === 'accettato' || t.status === 'in_arrivo'));
      if (assignedTask?.lifter_id) {
        const { data: lifterData } = await supabase
          .rpc('get_public_profile', { profile_user_id: assignedTask.lifter_id });
        if (lifterData && lifterData.length > 0) {
          setAssignedLifterProfile(lifterData[0]);
        }
      }
    }

    // Fetch applications for user's tasks
    const { data: appsData, error: appsError } = await supabase
      .from('task_applications')
      .select('*')
      .eq('status', 'pending');

    if (appsError) {
      console.error('Error fetching applications:', appsError);
    } else if (appsData && appsData.length > 0) {
      // Fetch FULL lifter profiles for applications (with bio and skills)
      const lifterIds = [...new Set(appsData.map(a => a.lifter_id))];
      
      // Fetch each profile individually to get bio and skills
      const profilePromises = lifterIds.map(id => 
        supabase.rpc('get_public_profile', { profile_user_id: id })
      );
      const profileResults = await Promise.all(profilePromises);
      
      const profileMap = new Map<string, any>();
      profileResults.forEach(result => {
        if (result.data && result.data.length > 0) {
          const profile = result.data[0];
          profileMap.set(profile.user_id, profile);
        }
      });
      
      const appsWithProfiles = appsData.map(app => ({
        ...app,
        lifter_profile: profileMap.get(app.lifter_id)
      }));
      
      setApplications(appsWithProfiles);
    } else {
      setApplications([]);
    }

    setIsLoading(false);
  }, []);

  // Use ref to avoid recreating subscription on every render
  const fetchTasksAndApplicationsRef = useRef(fetchTasksAndApplications);
  fetchTasksAndApplicationsRef.current = fetchTasksAndApplications;

  useEffect(() => {
    fetchTasksAndApplications();

    let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
    
    const debouncedFetch = () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        fetchTasksAndApplicationsRef.current();
      }, 300);
    };

    // Subscribe to realtime updates with debounce
    const tasksChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        debouncedFetch
      )
      .subscribe();

    const appsChannel = supabase
      .channel('applications-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_applications' },
        debouncedFetch
      )
      .subscribe();

    return () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(appsChannel);
    };
  }, []);

  // Filter tasks by type
  const activeTasks = tasks.filter(t => !t.is_scheduled && (t.status === 'in_attesa' || t.status === 'accettato' || t.status === 'in_arrivo'));
  const scheduledTasks = tasks.filter(t => t.is_scheduled);
  const activeTask = activeTasks[0] || null;

  // Set lifter position from task data when available (NO automatic viewMode switch)
  useEffect(() => {
    if (!activeTask || activeTask.status === 'in_attesa') return;
    
    // Priority: use lifter_location fields on task (most accurate), then profile, then fallback
    if (activeTask.lifter_location_lat && activeTask.lifter_location_lng) {
      setLifterPosition({
        lat: Number(activeTask.lifter_location_lat),
        lng: Number(activeTask.lifter_location_lng),
      });
    } else if (assignedLifterProfile?.location_lat && assignedLifterProfile?.location_lng) {
      setLifterPosition({
        lat: Number(assignedLifterProfile.location_lat),
        lng: Number(assignedLifterProfile.location_lng),
      });
    }
  }, [activeTask?.id, activeTask?.status, activeTask?.lifter_location_lat, activeTask?.lifter_location_lng, assignedLifterProfile?.location_lat, assignedLifterProfile?.location_lng]);

  // Subscribe to task changes for real-time lifter position updates
  useEffect(() => {
    if (!activeTask?.id || activeTask.status === 'completato' || activeTask.status === 'in_attesa') return;

    const channel = supabase
      .channel(`task-lifter-pos-${activeTask.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${activeTask.id}`,
        },
        (payload: any) => {
          const updated = payload.new;
          if (updated.lifter_location_lat && updated.lifter_location_lng) {
            setLifterPosition({
              lat: Number(updated.lifter_location_lat),
              lng: Number(updated.lifter_location_lng),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTask?.id, activeTask?.status]);

  // Fetch unread messages count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!currentUserId || !activeTask?.id) {
        setUnreadCount(0);
        return;
      }
      
      const { data, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('task_id', activeTask.id)
        .eq('is_read', false)
        .neq('sender_id', currentUserId);
      
      if (!error && data) {
        setUnreadCount(data.length);
      }
    };

    fetchUnreadCount();

    // Subscribe to new messages
    if (activeTask?.id) {
      const channel = supabase
        .channel(`messages-unread-${activeTask.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `task_id=eq.${activeTask.id}`,
          },
          () => fetchUnreadCount()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUserId, activeTask?.id]);

  // Reset unread count when opening chat
  useEffect(() => {
    if (viewMode === 'chat' && activeTask?.id && currentUserId) {
      // Mark messages as read when entering chat
      supabase
        .from('messages')
        .update({ is_read: true })
        .eq('task_id', activeTask.id)
        .neq('sender_id', currentUserId)
        .then(() => setUnreadCount(0));
    }
  }, [viewMode, activeTask?.id, currentUserId]);

  // Get applications for a specific task
  const getApplicationsForTask = (taskId: string) => {
    return applications.filter(app => app.task_id === taskId);
  };

  // Live position tracking
  useEffect(() => {
    // Use last known position (if any) to avoid showing a random fallback.
    try {
      const saved = localStorage.getItem("liftome_last_pos_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          typeof parsed.lat === "number" &&
          typeof parsed.lng === "number" &&
          Number.isFinite(parsed.lat) &&
          Number.isFinite(parsed.lng)
        ) {
          setUserPosition({ lat: parsed.lat, lng: parsed.lng });
        }
      }
    } catch {
      // ignore
    }

    if (!("geolocation" in navigator)) {
      setIsLocating(false);
      toast({
        title: "Posizione non disponibile",
        description: "Il dispositivo non supporta la geolocalizzazione.",
      });
      return;
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };

    const onSuccess = (position: GeolocationPosition) => {
      const newPos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      setUserPosition(newPos);
      setIsLocating(false);

      try {
        localStorage.setItem("liftome_last_pos_v1", JSON.stringify(newPos));
      } catch {
        // ignore
      }

      // Warn if accuracy is very low (likely approximate / IP-based)
      const accuracy = position.coords.accuracy;
      if (typeof accuracy === "number" && accuracy > 1500) {
        toast({
          title: "Posizione approssimativa",
          description: "Attiva la posizione precisa (GPS) nelle impostazioni del telefono/browser.",
        });
      }

      // Update user marker smoothly
      if (userMarkerRef.current) {
        userMarkerRef.current.setLngLat([newPos.lng, newPos.lat]);
      }
    };

    const onError = (err: GeolocationPositionError) => {
      console.warn("Geolocation error:", err);
      setIsLocating(false);

      // Do NOT set a hardcoded fallback location (would look like a wrong position)
      toast({
        title: "Non riesco a rilevare la tua posizione",
        description: "Consenti la posizione e abilita 'posizione precisa' per vedere il punto corretto.",
      });
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, options);

    watchIdRef.current = navigator.geolocation.watchPosition(
      onSuccess,
      () => {
        // keep silent: watch can fail intermittently
      },
      { ...options, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Initialize map for active task (DO NOT re-create on every GPS update)
  const activeTaskIdRef = useRef<string | null>(null);

  // Check if we have enough position data to show the map
  // Either user position OR task position is sufficient to initialize
  const taskHasPosition = activeTask?.location_lat != null && activeTask?.location_lng != null;
  const canShowMap = hasUserPosition || taskHasPosition;

  useEffect(() => {
    if (
      tabMode !== "in_corso" ||
      viewMode !== "list" ||
      !activeTask ||
      !mapContainer.current ||
      !canShowMap
    ) {
      return;
    }

    // Only initialize when task changes (or first time we get a position)
    if (map.current && activeTaskIdRef.current === activeTask.id) return;

    // Cleanup previous instance
    map.current?.remove();
    map.current = null;
    userMarkerRef.current = null;
    taskMarkerRef.current = null;
    taskMarkerAvatarUrlRef.current = null;

    activeTaskIdRef.current = activeTask.id;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Use task position as fallback if user position is not available
    const fallbackPos = { 
      lat: Number(activeTask.location_lat) || 45.5416, 
      lng: Number(activeTask.location_lng) || 10.2118 
    };
    const pos = userPosition || fallbackPos;
    
    const { lat: taskLat, lng: taskLng, swapped } = resolveTaskCoords(
      activeTask.location_lat,
      activeTask.location_lng,
      pos
    );

    if (swapped) {
      console.warn("Task coordinates looked swapped; using corrected order.", {
        taskId: activeTask.id,
        location_lat: activeTask.location_lat,
        location_lng: activeTask.location_lng,
      });
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [taskLng, taskLat],
      zoom: 14,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: false }), "top-right");

    // Geolocate button (no auto-follow to avoid jitter/auto-zoom)
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showUserHeading: true,
        showUserLocation: true,
      }),
      "top-right"
    );

    map.current.touchZoomRotate.enable();
    map.current.dragPan.enable();

    // User marker (only show if we have actual user position)
    if (userPosition) {
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
        .addTo(map.current);
    }

    // Task marker
    const renderTaskMarker = () => {
      const taskMarkerEl = document.createElement("div");
      const isAssigned = activeTask.status === "accettato" || activeTask.status === "in_arrivo";
      const emoji = categoryEmojis[activeTask.category] || "📍";

      if (isAssigned && assignedLifterProfile?.avatar_url) {
        taskMarkerEl.innerHTML = `
          <div style="width: 52px; height: 52px; background: white; border-radius: 50%; border: 4px solid #22c55e; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3); overflow: hidden;">
            <img src="${assignedLifterProfile.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
        `;
        taskMarkerAvatarUrlRef.current = assignedLifterProfile.avatar_url;
      } else {
        taskMarkerEl.innerHTML = `
          <div style="width: 48px; height: 48px; background: white; border-radius: 50%; border: 3px solid #FF5A00; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-size: 24px;">
            ${emoji}
          </div>
        `;
        taskMarkerAvatarUrlRef.current = null;
      }

      taskMarkerRef.current = new mapboxgl.Marker({ element: taskMarkerEl })
        .setLngLat([taskLng, taskLat])
        .addTo(map.current!);
    };

    renderTaskMarker();

    // Add route line and fetch route info when lifter is assigned
    map.current.on("load", async () => {
      if (!map.current) return;
      
      const isAssigned = activeTask.status === "accettato" || activeTask.status === "in_arrivo";
      
      if (isAssigned && lifterPosition && userPosition) {
        // Fetch walking route
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
                layout: { "line-join": "round", "line-cap": "round" },
                paint: { "line-color": "#22c55e", "line-width": 5, "line-opacity": 0.8 },
              });
            }
          }
        } catch (error) {
          console.error("Error fetching route:", error);
        }
      }
    });

    // Fit bounds - if we have user position, include both; otherwise just center on task
    if (userPosition) {
      const bounds = new mapboxgl.LngLatBounds()
        .extend([userPosition.lng, userPosition.lat])
        .extend([taskLng, taskLat]);
      map.current.fitBounds(bounds, { padding: 60, duration: 0 });
    } else {
      // Just center on task location
      map.current.setCenter([taskLng, taskLat]);
      map.current.setZoom(15);
    }

    return () => {
      map.current?.remove();
      map.current = null;
      userMarkerRef.current = null;
      taskMarkerRef.current = null;
      taskMarkerAvatarUrlRef.current = null;
      activeTaskIdRef.current = null;
    };
    // IMPORTANT: don't depend on userPosition to avoid recreating map at every GPS tick
  }, [tabMode, viewMode, activeTask?.id, canShowMap, lifterPosition]);

  // Add user marker when position becomes available after map init
  useEffect(() => {
    if (!map.current || !userPosition || userMarkerRef.current) return;
    
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
      .addTo(map.current);
    
    // Also fit bounds now that we have user position
    if (activeTask?.location_lat != null && activeTask?.location_lng != null) {
      const { lat: taskLat, lng: taskLng } = resolveTaskCoords(
        activeTask.location_lat,
        activeTask.location_lng,
        userPosition
      );
      const bounds = new mapboxgl.LngLatBounds()
        .extend([userPosition.lng, userPosition.lat])
        .extend([taskLng, taskLat]);
      map.current.fitBounds(bounds, { padding: 60, duration: 500 });
    }
  }, [userPosition, activeTask?.location_lat, activeTask?.location_lng]);

  // Update user marker position smoothly
  useEffect(() => {
    if (!userMarkerRef.current || !userPosition) return;
    userMarkerRef.current.setLngLat([userPosition.lng, userPosition.lat]);
  }, [userPosition?.lat, userPosition?.lng]);

  // Update task marker position without recreating the map
  useEffect(() => {
    if (!map.current || !activeTask || activeTaskIdRef.current !== activeTask.id) return;
    if (!taskMarkerRef.current) return;

    const pos = userPosition;
    if (!pos) return;

    const { lat: taskLat, lng: taskLng } = resolveTaskCoords(
      activeTask.location_lat,
      activeTask.location_lng,
      pos
    );

    taskMarkerRef.current.setLngLat([taskLng, taskLat]);
  }, [
    activeTask?.id,
    activeTask?.location_lat,
    activeTask?.location_lng,
    userPosition?.lat,
    userPosition?.lng,
  ]);

  // If avatar/status changes, rebuild only the task marker (avoid full map reset)
  useEffect(() => {
    if (!map.current || !activeTask || activeTaskIdRef.current !== activeTask.id) return;

    const isAssigned = activeTask.status === "accettato" || activeTask.status === "in_arrivo";
    const nextAvatar = isAssigned ? assignedLifterProfile?.avatar_url ?? null : null;

    if (taskMarkerAvatarUrlRef.current === nextAvatar) return;

    // Remove old marker and recreate it with updated element
    taskMarkerRef.current?.remove();
    taskMarkerRef.current = null;

    const pos = userPosition;
    if (!pos) return;

    const { lat: taskLat, lng: taskLng } = resolveTaskCoords(
      activeTask.location_lat,
      activeTask.location_lng,
      pos
    );

    const taskMarkerEl = document.createElement("div");
    const emoji = categoryEmojis[activeTask.category] || "📍";

    if (isAssigned && nextAvatar) {
      taskMarkerEl.innerHTML = `
        <div style="width: 52px; height: 52px; background: white; border-radius: 50%; border: 4px solid #22c55e; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3); overflow: hidden;">
          <img src="${nextAvatar}" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
      `;
      taskMarkerAvatarUrlRef.current = nextAvatar;
    } else {
      taskMarkerEl.innerHTML = `
        <div style="width: 48px; height: 48px; background: white; border-radius: 50%; border: 3px solid #FF5A00; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-size: 24px;">
          ${emoji}
        </div>
      `;
      taskMarkerAvatarUrlRef.current = null;
    }

    taskMarkerRef.current = new mapboxgl.Marker({ element: taskMarkerEl })
      .setLngLat([taskLng, taskLat])
      .addTo(map.current);
  }, [
    activeTask?.id,
    activeTask?.status,
    assignedLifterProfile?.avatar_url,
    userPosition?.lat,
    userPosition?.lng,
    hasUserPosition,
  ]);

  // Update route in list view when lifter position changes
  useEffect(() => {
    if (!map.current || !lifterPosition || !userPosition || viewMode !== "list") return;
    
    const isAssigned = activeTask?.status === "accettato" || activeTask?.status === "in_arrivo";
    if (!isAssigned) return;

    const updateListRoute = async () => {
      if (!map.current) return;
      
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

          // Update existing route source or add new one
          const source = map.current.getSource("route") as mapboxgl.GeoJSONSource;
          if (source) {
            source.setData({
              type: "Feature",
              properties: {},
              geometry: route.geometry,
            });
          } else if (map.current.loaded()) {
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
              layout: { "line-join": "round", "line-cap": "round" },
              paint: { "line-color": "#22c55e", "line-width": 5, "line-opacity": 0.8 },
            });
          }
        }
      } catch (error) {
        console.error("Error updating route:", error);
      }
    };

    updateListRoute();
  }, [lifterPosition?.lat, lifterPosition?.lng, userPosition?.lat, userPosition?.lng, viewMode, activeTask?.status]);

  // Initialize accepted map with route (do not recreate on each GPS update)
  useEffect(() => {
    if (
      viewMode !== "accepted" ||
      !acceptedMapContainer.current ||
      !activeTask ||
      !assignedLifterProfile ||
      !hasUserPosition
    ) {
      return;
    }

    const acceptedKey = activeTask.id;
    if (acceptedMap.current && acceptedMapKeyRef.current === acceptedKey) return;

    acceptedMap.current?.remove();
    acceptedMap.current = null;
    acceptedMapKeyRef.current = acceptedKey;

    mapboxgl.accessToken = MAPBOX_TOKEN;

     const pos = userPosition!;
     const { lat: taskLat, lng: taskLng, swapped } = resolveTaskCoords(
       activeTask.location_lat,
       activeTask.location_lng,
       pos
     );

     if (swapped) {
       console.warn("Task coordinates looked swapped (accepted view); using corrected order.", {
         taskId: activeTask.id,
         location_lat: activeTask.location_lat,
         location_lng: activeTask.location_lng,
       });
     }

     const lifterLat = lifterPosition?.lat ?? taskLat + 0.002;
     const lifterLng = lifterPosition?.lng ?? taskLng + 0.003;

    acceptedMap.current = new mapboxgl.Map({
      container: acceptedMapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [(pos.lng + lifterLng) / 2, (pos.lat + lifterLat) / 2],
      zoom: 15,
    });

    acceptedMap.current.on("load", async () => {
      if (!acceptedMap.current) return;

      // User marker with pulse
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
        .setLngLat([pos.lng, pos.lat])
        .addTo(acceptedMap.current);

      // Lifter marker with profile photo
      const lifterMarkerEl = document.createElement("div");
      lifterMarkerEl.innerHTML = `
        <div style="width: 52px; height: 52px; background: white; border-radius: 50%; border: 4px solid #22c55e; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); overflow: hidden;">
          ${assignedLifterProfile.avatar_url
            ? `<img src="${assignedLifterProfile.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;" />`
            : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 24px; background: #dcfce7;">👤</div>`
          }
        </div>
      `;

      lifterMarkerRef.current = new mapboxgl.Marker({ element: lifterMarkerEl })
        .setLngLat([lifterLng, lifterLat])
        .addTo(acceptedMap.current);

      // Fetch walking route once
      try {
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/walking/${lifterLng},${lifterLat};${pos.lng},${pos.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
        );
        const data = await response.json();

        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          const distance = route.distance < 1000 ? `${Math.round(route.distance)}m` : `${(route.distance / 1000).toFixed(1)}km`;
          const duration = `${Math.round(route.duration / 60)} min`;
          setRouteInfo({ distance, duration });

          acceptedMap.current.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: route.geometry,
            } as any,
          });

          acceptedMap.current.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#FF5A00", "line-width": 5, "line-opacity": 0.8 },
          });
        }
      } catch (error) {
        console.error("Error fetching route:", error);
      }

      const bounds = new mapboxgl.LngLatBounds().extend([pos.lng, pos.lat]).extend([lifterLng, lifterLat]);
      acceptedMap.current.fitBounds(bounds, { padding: 80, duration: 0 });
    });

    return () => {
      acceptedMap.current?.remove();
      acceptedMap.current = null;
      acceptedMapKeyRef.current = null;
    };
  }, [viewMode, activeTask?.id, assignedLifterProfile?.avatar_url, hasUserPosition]);

  // Update lifter marker position and route when lifterPosition changes
  useEffect(() => {
    if (!acceptedMap.current || !lifterPosition || !userPosition) return;
    
    // Update lifter marker position
    if (lifterMarkerRef.current) {
      lifterMarkerRef.current.setLngLat([lifterPosition.lng, lifterPosition.lat]);
    }

    // Update route
    const updateRoute = async () => {
      if (!acceptedMap.current) return;
      
      try {
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/walking/${lifterPosition.lng},${lifterPosition.lat};${userPosition.lng},${userPosition.lat}?geometries=geojson&access_token=${MAPBOX_TOKEN}`
        );
        const data = await response.json();

        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          const distance = route.distance < 1000 ? `${Math.round(route.distance)}m` : `${(route.distance / 1000).toFixed(1)}km`;
          const duration = `${Math.round(route.duration / 60)} min`;
          setRouteInfo({ distance, duration });

          // Update existing route source or add new one
          const source = acceptedMap.current.getSource("route") as mapboxgl.GeoJSONSource;
          if (source) {
            source.setData({
              type: "Feature",
              properties: {},
              geometry: route.geometry,
            });
          }
        }
      } catch (error) {
        console.error("Error updating route:", error);
      }
    };

    updateRoute();
  }, [lifterPosition?.lat, lifterPosition?.lng, userPosition?.lat, userPosition?.lng]);

  const handleOpenChat = () => {
    if (activeTask?.lifter_id) {
      setViewMode("chat");
    }
  };

  const handleOpenDetails = (task: DBTask) => {
    setDetailTask(task);
    setViewMode("details");
  };

  const handleOpenProposals = (task: DBTask) => {
    setSelectedTaskForProposals(task);
    setViewMode("proposals");
  };

  const handleAssignLifter = async (application: TaskApplication) => {
    console.log('Assign click:', { applicationId: application.id, taskId: application.task_id, lifterId: application.lifter_id });

    try {
      // Ensure we have a lifter profile to display (safe public data via RPC)
      let publicLifter = application.lifter_profile;
      if (!publicLifter) {
        const { data: lifterData, error: lifterErr } = await supabase
          .rpc('get_public_profile', { profile_user_id: application.lifter_id });
        if (lifterErr) console.error('get_public_profile error:', lifterErr);
        publicLifter = lifterData?.[0];
      }

      // Update task with lifter_id and status
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          lifter_id: application.lifter_id,
          status: 'accettato'
        })
        .eq('id', application.task_id);

      if (taskError) {
        console.error('Task update error:', taskError);
        toast({
          title: "Errore",
          description: "Impossibile assegnare il Lifter",
          variant: "destructive",
        });
        return;
      }

      // Update application status to accepted
      const { error: appError } = await supabase
        .from('task_applications')
        .update({ status: 'accepted' })
        .eq('id', application.id);

      if (appError) console.error('Application update error:', appError);

      // Reject other applications for this task
      const { error: rejectError } = await supabase
        .from('task_applications')
        .update({ status: 'rejected' })
        .eq('task_id', application.task_id)
        .neq('id', application.id);

      if (rejectError) console.error('Reject others error:', rejectError);

      const lifterName = publicLifter?.full_name || 'Lifter';
      const task = tasks.find(t => t.id === application.task_id);

      // Send push notification to the Lifter that they've been assigned
      await notificationService.notifyLifterAssigned(
        application.lifter_id,
        currentUserName,
        task?.title || 'Task'
      );

      // Also show local notification for client
      notificationService.showLocalNotification({
        title: "Lifter assegnato! 🎉",
        message: `${lifterName} sta arrivando`,
        type: "task_accepted"
      });

      toast({
        title: "Lifter assegnato! 🎉",
        description: `${lifterName} è stato assegnato al task`,
      });

      // Set lifter position (slightly offset from task location for demo)
      const newLifterPosition = task?.location_lat && task?.location_lng ? {
        lat: Number(task.location_lat) + 0.002,
        lng: Number(task.location_lng) + 0.003,
      } : userPosition ? {
        lat: userPosition.lat + 0.002,
        lng: userPosition.lng + 0.003,
      } : null;

      // Create updated lifter profile (only public fields used in UI)
      const lifterProfile: LifterProfile = {
        user_id: application.lifter_id,
        full_name: publicLifter?.full_name || 'Lifter',
        avatar_url: publicLifter?.avatar_url || '',
        rating: Number(publicLifter?.rating || 0),
        total_reviews: Number(publicLifter?.total_reviews || 0),
        is_kyc_verified: Boolean(publicLifter?.is_kyc_verified),
        is_available: Boolean(publicLifter?.is_available),
      };

      // Update tasks locally to include lifter_id immediately
      const updatedTasks = tasks.map(t =>
        t.id === application.task_id
          ? { ...t, lifter_id: application.lifter_id, status: 'accettato' }
          : t
      );

      setTasks(updatedTasks);
      setLifterPosition(newLifterPosition);
      setAssignedLifterProfile(lifterProfile);
      setSelectedTaskForProposals(null);
      setApplications(applications.filter(a => a.task_id !== application.task_id));

      // Switch to accepted view on next tick to ensure DOM mounts map container
      setTimeout(() => setViewMode("accepted"), 0);

    } catch (err) {
      console.error('Error assigning lifter:', err);
      toast({
        title: "Errore",
        description: "Si è verificato un errore. Riprova.",
        variant: "destructive",
      });
    }
  };


  const handleCancelTask = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'cancellato' })
      .eq('id', taskId);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile annullare il task",
        variant: "destructive",
      });
    } else {
      setTasks(tasks.filter(t => t.id !== taskId));
      setDetailTask(null);
      setViewMode("list");
      setShowCancelConfirm(false);
      toast({
        title: "Task annullato",
        description: "Il task è stato annullato con successo",
      });
    }
  };

  const handleEditTask = (task: DBTask) => {
    setEditingTask(task);
    setEditDescription(task.description || "");
    setEditPrice(task.published_price.toString());
  };

  const handleSaveEdit = async () => {
    if (!editingTask) return;
    
    const newPrice = parseFloat(editPrice) || editingTask.published_price;
    const { error } = await supabase
      .from('tasks')
      .update({ 
        description: editDescription,
        published_price: newPrice,
        price: newPrice / 0.8,
      })
      .eq('id', editingTask.id);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile modificare il task",
        variant: "destructive",
      });
    } else {
      setTasks(tasks.map(t => 
        t.id === editingTask.id 
          ? { ...t, description: editDescription, published_price: newPrice, price: newPrice / 0.8 }
          : t
      ));
      if (detailTask?.id === editingTask.id) {
        setDetailTask({ ...detailTask, description: editDescription, published_price: newPrice, price: newPrice / 0.8 });
      }
      setEditingTask(null);
      toast({
        title: "Task modificato",
        description: "Le modifiche sono state salvate",
      });
    }
  };

  // Task completion flow handlers
  const handleCompleteTask = async () => {
    if (!activeTask) return;

    if (!activeTask.lifter_id) {
      toast({
        title: "Non ancora assegnato",
        description: "Puoi completare il task solo dopo aver assegnato un Lifter.",
        variant: "destructive",
      });
      return;
    }

    setCompletingTask(activeTask);

    // Ensure we have at least the public lifter profile for popups
    if (!assignedLifterProfile || assignedLifterProfile.user_id !== activeTask.lifter_id) {
      const { data, error } = await supabase.rpc('get_public_profile', {
        profile_user_id: activeTask.lifter_id,
      });
      if (error) {
        console.warn('get_public_profile error (complete flow):', error);
      } else if (data?.[0]) {
        setAssignedLifterProfile(data[0]);
      }
    }

    setShowTipPopup(true);
  };

  const handleTipConfirm = async (amount: number) => {
    setTipAmount(amount);
    setShowTipPopup(false);

    // If we didn't have profile yet, try once more before showing review
    const lifterId = completingTask?.lifter_id;
    if (lifterId && (!assignedLifterProfile || assignedLifterProfile.user_id !== lifterId)) {
      const { data } = await supabase.rpc('get_public_profile', { profile_user_id: lifterId });
      if (data?.[0]) setAssignedLifterProfile(data[0]);
    }

    setShowReviewPopup(true);
  };

  const handleTipSkip = async () => {
    setTipAmount(0);
    setShowTipPopup(false);

    const lifterId = completingTask?.lifter_id;
    if (lifterId && (!assignedLifterProfile || assignedLifterProfile.user_id !== lifterId)) {
      const { data } = await supabase.rpc('get_public_profile', { profile_user_id: lifterId });
      if (data?.[0]) setAssignedLifterProfile(data[0]);
    }

    setShowReviewPopup(true);
  };

  const handleReviewSubmit = async (rating: number, comment: string) => {
    if (!completingTask || !completingTask.lifter_id) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Mark task as completed
      await supabase
        .from('tasks')
        .update({ 
          status: 'completato',
          completed_at: new Date().toISOString()
        })
        .eq('id', completingTask.id);

      // Save review with tip
      await supabase
        .from('reviews')
        .insert({
          task_id: completingTask.id,
          reviewer_id: user.id,
          reviewee_id: completingTask.lifter_id!,
          rating,
          comment: comment || null,
          tip_amount: tipAmount
        });

      // Update lifter's rating
      const { data: existingReviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', completingTask.lifter_id!);
      
      if (existingReviews) {
        const totalRating = existingReviews.reduce((sum, r) => sum + r.rating, 0);
        const avgRating = totalRating / existingReviews.length;
        
        // We can't update profiles directly, but the rating will be calculated on view
      }

      // Send notifications
      notificationService.showLocalNotification({
        type: 'task_completed',
        title: 'Task completato!',
        message: 'Grazie per aver usato Liftome! 🎉',
        data: { taskId: completingTask.id }
      });

      // Show success toast
      toast({
        title: "Task completato! ✅",
        description: tipAmount > 0 
          ? `Mancia di ${tipAmount.toFixed(2)}€ inviata${assignedLifterProfile?.full_name ? ` a ${assignedLifterProfile.full_name}` : ""}`
          : "Grazie per il tuo feedback!",
      });

    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il completamento",
        variant: "destructive"
      });
    }

    // Reset state and go back to list
    setShowReviewPopup(false);
    setCompletingTask(null);
    setTipAmount(0);
    setAssignedLifterProfile(null);
    setLifterPosition(null);
    setRouteInfo(null);
    setViewMode("list");
    fetchTasksAndApplications();
  };

  const handleReviewSkip = async () => {
    if (!completingTask) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Mark task as completed
      await supabase
        .from('tasks')
        .update({ 
          status: 'completato',
          completed_at: new Date().toISOString()
        })
        .eq('id', completingTask.id);

      // Save tip if given (without review)
      if (tipAmount > 0 && completingTask.lifter_id) {
        await supabase
          .from('reviews')
          .insert({
            task_id: completingTask.id,
            reviewer_id: user.id,
            reviewee_id: completingTask.lifter_id,
            rating: 5, // Default rating when skipped
            tip_amount: tipAmount
          });
      }

      toast({
        title: "Task completato! ✅",
        description: "Grazie per aver usato Liftome!",
      });

    } catch (error) {
      console.error('Error completing task:', error);
    }

    // Reset state and go back to list
    setShowReviewPopup(false);
    setCompletingTask(null);
    setTipAmount(0);
    setAssignedLifterProfile(null);
    setLifterPosition(null);
    setRouteInfo(null);
    setViewMode("list");
    fetchTasksAndApplications();
  };

  const formatScheduledDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
    return d.toLocaleDateString('it-IT', options);
  };

  const getStatusBadge = (status: string, hasProposals: boolean = false) => {
    switch (status) {
      case 'in_attesa':
        return hasProposals ? (
          <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Proposte ricevute
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            In attesa
          </span>
        );
      case 'accettato':
      case 'in_arrivo':
        return (
          <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-600">
            <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            In corso
          </span>
        );
      default:
        return null;
    }
  };

  // Tip popup
  if (showTipPopup && completingTask) {
    return (
      <TipPopup
        taskPrice={completingTask.published_price}
        lifterName={assignedLifterProfile?.full_name || "il Lifter"}
        onConfirm={handleTipConfirm}
        onSkip={handleTipSkip}
      />
    );
  }

  // Review popup
  if (showReviewPopup && completingTask) {
    return (
      <ReviewPopup
        lifterName={assignedLifterProfile?.full_name || "il Lifter"}
        lifterAvatar={assignedLifterProfile?.avatar_url || undefined}
        onSubmit={handleReviewSubmit}
        onSkip={handleReviewSkip}
      />
    );
  }

  // Proposals view
  if (viewMode === "proposals" && selectedTaskForProposals) {
    const taskApps = getApplicationsForTask(selectedTaskForProposals.id);

    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col" style={{ top: '70px', bottom: '60px' }}>
        {/* Header */}
        <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button 
            onClick={() => {
              setViewMode("list");
              setSelectedTaskForProposals(null);
            }}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center tap-scale"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Proposte ricevute</h1>
            <p className="text-sm text-muted-foreground">{selectedTaskForProposals.title}</p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {taskApps.length > 0 ? (
            taskApps.map((app) => {
              // Calculate distance from user to task
              const taskLat = selectedTaskForProposals.location_lat || userPosition?.lat || 45.5416;
              const taskLng = selectedTaskForProposals.location_lng || userPosition?.lng || 10.2118;
              const userLat = userPosition?.lat || 45.5416;
              const userLng = userPosition?.lng || 10.2118;
              const distance = Math.round(
                Math.sqrt(
                  Math.pow((taskLat - userLat) * 111000, 2) +
                  Math.pow((taskLng - userLng) * 111000 * Math.cos(userLat * Math.PI / 180), 2)
                )
              );
              
              return (
                <div key={app.id} className="bg-card rounded-2xl p-4 shadow-card border border-border">
                  {/* Lifter profile */}
                  <div className="flex items-start gap-4 mb-4">
                    {/* Large circular photo */}
                    <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-primary flex-shrink-0">
                      {app.lifter_profile?.avatar_url ? (
                        <img 
                          src={app.lifter_profile.avatar_url} 
                          alt={app.lifter_profile.full_name} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <User className="w-10 h-10 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      {/* Name and KYC badge */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-foreground">
                          {app.lifter_profile?.full_name || "Lifter"}
                        </h3>
                        {app.lifter_profile?.is_kyc_verified && (
                          <span className="flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm">
                            <Shield className="w-3 h-3" />
                            KYC ✓
                          </span>
                        )}
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={cn(
                              "w-4 h-4",
                              star <= (app.lifter_profile?.rating || 0) 
                                ? "fill-yellow-400 text-yellow-400" 
                                : "text-muted-foreground"
                            )} 
                          />
                        ))}
                        <span className="text-sm text-muted-foreground ml-1">
                          ({app.lifter_profile?.total_reviews || 0})
                        </span>
                      </div>

                      {/* Distance */}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{distance < 1000 ? `${distance}m` : `${(distance / 1000).toFixed(1)}km`}</span>
                      </div>

                      {/* Price */}
                      <p className="text-xl font-bold text-primary">
                        {selectedTaskForProposals.published_price}€
                      </p>
                    </div>
                  </div>

                  {/* Bio */}
                  {app.lifter_profile?.bio && (
                    <div className="mb-3 p-3 bg-muted rounded-xl">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {app.lifter_profile.bio}
                      </p>
                    </div>
                  )}

                  {/* Skills tags */}
                  {app.lifter_profile?.skills && app.lifter_profile.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {app.lifter_profile.skills.slice(0, 5).map((skill, idx) => (
                        <span 
                          key={idx} 
                          className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Assign button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void handleAssignLifter(app);
                    }}
                    className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-bold text-lg flex items-center justify-center gap-2 tap-scale"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Assegna a questo Lifter
                  </button>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-5xl mb-4">📭</span>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nessuna proposta ancora
              </h3>
              <p className="text-muted-foreground text-sm">
                I Lifter vicini possono candidarsi al tuo task
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Chat view
  if (viewMode === "chat" && activeTask?.lifter_id && currentUserId) {
    const taskForChat: Task = {
      id: activeTask.id,
      title: activeTask.title,
      emoji: categoryEmojis[activeTask.category] || "📍",
      description: activeTask.description || "",
      price: activeTask.published_price,
      distance: 0,
      clientName: assignedLifterProfile?.full_name || "Lifter",
      clientAvatar: assignedLifterProfile?.avatar_url || "",
      rating: assignedLifterProfile?.rating || 0,
      reviewCount: assignedLifterProfile?.total_reviews || 0,
      status: "accepted",
      type: activeTask.is_scheduled ? "programmato" : "ora",
    };
    return (
      <ChatView
        task={taskForChat}
        onBack={() => setViewMode("accepted")}
        currentUserId={currentUserId}
        taskId={activeTask.id}
      />
    );
  }

  // Accepted view with expandable map, route, and chat button
  if (viewMode === "accepted" && activeTask && assignedLifterProfile) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col" style={{ top: '70px', bottom: '60px' }}>
        {/* Map Section - expandable with motion */}
        <motion.div 
          className="relative bg-muted"
          animate={{ 
            height: isMapExpanded ? 'calc(100% - 100px)' : '50%'
          }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          style={{ flexShrink: 0 }}
        >
          <div 
            ref={acceptedMapContainer} 
            className="absolute inset-0"
            key="accepted-map"
          />
          
          {/* Route info overlay - positioned to avoid banner */}
          {routeInfo && (
            <div className="absolute top-14 left-4 z-10">
              <div className="bg-card/95 backdrop-blur-sm px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-green-600" />
                  <span className="font-bold text-foreground">{routeInfo.distance}</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-foreground">{routeInfo.duration}</span>
                </div>
              </div>
            </div>
          )}

          {/* Live indicator */}
          <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 z-10">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-bold">In arrivo</span>
          </div>
          
          {/* Map legend - moved up to avoid panel overlap */}
          <div className="absolute bottom-8 left-3 flex items-center gap-2 z-10">
            <div className="bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-soft flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-xs font-medium text-muted-foreground">Tu</span>
            </div>
            <div className="bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-soft flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-medium text-muted-foreground">{assignedLifterProfile.full_name}</span>
            </div>
          </div>
        </motion.div>

        {/* Swipeable Task Info Panel */}
        <motion.div 
          className="bg-background rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] overflow-hidden relative"
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
                  {assignedLifterProfile.avatar_url ? (
                    <img src={assignedLifterProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">{assignedLifterProfile.full_name}</p>
                  <p className="text-xs text-green-600">In arrivo • {routeInfo?.duration || '...'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenDetails(activeTask)}
                  className="w-10 h-10 bg-muted rounded-full flex items-center justify-center tap-scale"
                >
                  <Info className="w-5 h-5 text-foreground" />
                </button>
                <button 
                  onClick={() => setViewMode("chat")}
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
              {/* Lifter Profile Row */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-muted border-3 border-green-500 flex items-center justify-center overflow-hidden">
                  {assignedLifterProfile.avatar_url ? (
                    <img src={assignedLifterProfile.avatar_url} alt={assignedLifterProfile.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-foreground">{assignedLifterProfile.full_name}</h3>
                    {assignedLifterProfile.is_kyc_verified && (
                      <Shield className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-foreground">{assignedLifterProfile.rating?.toFixed(1) || "4.8"}</span>
                    <span className="text-muted-foreground text-sm">• {assignedLifterProfile.total_reviews || 0} recensioni</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-primary">{activeTask.published_price}€</span>
                </div>
              </div>

              {/* Task info */}
              <div className="bg-muted/50 rounded-xl p-3 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{categoryEmojis[activeTask.category] || "📍"}</span>
                  <h4 className="font-semibold text-foreground">{activeTask.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{activeTask.description}</p>
                {activeTask.location_address && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{activeTask.location_address}</span>
                  </div>
                )}
              </div>

              {/* Task Completato button - main CTA */}
              <button
                onClick={handleCompleteTask}
                className="w-full h-14 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 tap-scale mb-3 shadow-lg"
              >
                <Check className="w-6 h-6" />
                Task Completato ✓
              </button>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleOpenDetails(activeTask)}
                  className="flex-1 h-12 bg-muted text-foreground rounded-xl font-semibold flex items-center justify-center gap-2 tap-scale"
                >
                  <Info className="w-4 h-4" />
                  Dettagli
                </button>
                <button
                  onClick={() => setViewMode("chat")}
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

              {/* Edit/Cancel buttons */}
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => handleEditTask(activeTask)}
                  className="flex-1 h-12 bg-primary/10 text-primary rounded-xl font-semibold flex items-center justify-center gap-2 tap-scale"
                >
                  <Edit2 className="w-4 h-4" />
                  Modifica
                </button>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="flex-1 h-12 bg-destructive text-destructive-foreground rounded-xl font-semibold flex items-center justify-center gap-2 tap-scale"
                >
                  <Trash2 className="w-4 h-4" />
                  Annulla
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }
  // Full-screen details view
  if (viewMode === "details" && detailTask) {
    const isActive = detailTask.id === activeTask?.id;
    const isAssigned = detailTask.status === 'accettato' || detailTask.status === 'in_arrivo';

    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col" style={{ top: '70px', bottom: '60px' }}>
        {/* Header */}
        <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button 
            onClick={() => setViewMode("list")}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center tap-scale"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Dettagli Task</h1>
        </div>

        {/* Content - scrollable area */}
        <div className="flex-1 overflow-y-auto pb-28">
          {/* Lifter info if assigned */}
          {isAssigned && assignedLifterProfile && (
            <div className="p-4 bg-green-500/10 border-b border-green-500/20">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden border-3 border-green-500">
                  {assignedLifterProfile.avatar_url ? (
                    <img 
                      src={assignedLifterProfile.avatar_url} 
                      alt={assignedLifterProfile.full_name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground">{assignedLifterProfile.full_name}</h3>
                    {assignedLifterProfile.is_kyc_verified && (
                      <Shield className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm text-muted-foreground">
                      {assignedLifterProfile.rating} ({assignedLifterProfile.total_reviews})
                    </span>
                  </div>
                  <span className="text-sm text-green-600 font-medium">In arrivo...</span>
                </div>
                <button
                  onClick={handleOpenChat}
                  className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center tap-scale relative"
                >
                  <MessageCircle className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Task info */}
          <div className="p-4 bg-card border-b border-border">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">{categoryEmojis[detailTask.category] || "📍"}</span>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground">{detailTask.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {detailTask.is_scheduled && detailTask.scheduled_at
                    ? `📅 ${formatScheduledDate(detailTask.scheduled_at)}`
                    : "⚡ Immediato"
                  }
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{detailTask.published_price}€</p>
                {getStatusBadge(detailTask.status, getApplicationsForTask(detailTask.id).length > 0)}
              </div>
            </div>
            
            <div className="bg-muted rounded-xl p-4">
              <h3 className="font-semibold text-foreground mb-2">Descrizione</h3>
              <p className="text-sm text-muted-foreground">{detailTask.description}</p>
            </div>

            {detailTask.location_address && (
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{detailTask.location_address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed bottom actions */}
        <div className="flex-shrink-0 p-4 bg-card border-t border-border">
          <div className="flex gap-3">
            <button 
              onClick={() => handleEditTask(detailTask)}
              className="flex-1 h-14 bg-muted text-foreground rounded-2xl font-semibold flex items-center justify-center gap-2 tap-scale"
            >
              <Edit2 className="w-5 h-5" />
              Modifica
            </button>
            <button 
              onClick={() => setShowCancelConfirm(true)}
              className="flex-1 h-14 bg-destructive text-destructive-foreground rounded-2xl font-semibold flex items-center justify-center gap-2 tap-scale"
            >
              <Trash2 className="w-5 h-5" />
              Annulla
            </button>
          </div>
        </div>

        {/* Cancel confirmation */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-card rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-foreground mb-2">Annullare il task?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Questa azione non può essere annullata.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 h-12 bg-muted text-foreground rounded-xl font-medium tap-scale"
                >
                  No, mantieni
                </button>
                <button
                  onClick={() => handleCancelTask(detailTask.id)}
                  className="flex-1 h-12 bg-destructive text-destructive-foreground rounded-xl font-medium tap-scale"
                >
                  Sì, annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingTask && (
          <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
            <div className="bg-card w-full max-w-lg rounded-t-3xl p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">Modifica task</h3>
                <button 
                  onClick={() => setEditingTask(null)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Descrizione
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full h-24 p-3 bg-muted border border-border rounded-xl text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Prezzo (€)
                  </label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full h-12 px-4 bg-muted border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                
                <button 
                  onClick={handleSaveEdit}
                  className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold tap-scale"
                >
                  Salva modifiche
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const contentHeight = "calc(100vh - 70px - 60px)";
  const halfHeight = "calc((100vh - 70px - 60px) / 2)";

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ height: contentHeight }}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: contentHeight }}>
      {/* Tab toggle */}
      <div className="px-4 py-2 bg-background flex-shrink-0">
        <div className="flex gap-2 bg-muted rounded-2xl p-1">
          <button
            onClick={() => setTabMode("in_corso")}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200",
              tabMode === "in_corso"
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground"
            )}
          >
            🔄 In corso
          </button>
          <button
            onClick={() => setTabMode("programmati")}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 relative",
              tabMode === "programmati"
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground"
            )}
          >
            📅 Programmati
            {scheduledTasks.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {scheduledTasks.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {tabMode === "in_corso" ? (
        activeTask ? (
          // Show waiting view when task is in_attesa with no proposals
          activeTask.status === 'in_attesa' && getApplicationsForTask(activeTask.id).length === 0 ? (
            <WaitingForLifterView
              taskTitle={activeTask.title}
              taskCategory={activeTask.category}
              taskPrice={activeTask.published_price}
              taskDescription={activeTask.description || undefined}
              categoryEmoji={categoryEmojis[activeTask.category] || "✨"}
              onEdit={() => {
                setDetailTask(activeTask);
                handleEditTask(activeTask);
              }}
              onCancel={() => {
                setDetailTask(activeTask);
                setShowCancelConfirm(true);
              }}
            />
          ) : activeTask.status === 'in_attesa' && getApplicationsForTask(activeTask.id).length > 0 ? (
            // Show proposals view when task has applications
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Users className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">
                Hai ricevuto {getApplicationsForTask(activeTask.id).length} {getApplicationsForTask(activeTask.id).length === 1 ? 'proposta' : 'proposte'}!
              </h2>
              <p className="text-muted-foreground mb-6 max-w-xs">
                Dai un'occhiata ai Lifter che si sono candidati per il tuo task
              </p>
              <button
                onClick={() => {
                  setSelectedTaskForProposals(activeTask);
                  setViewMode("proposals");
                }}
                className="w-full max-w-xs h-14 bg-primary text-primary-foreground rounded-2xl font-bold text-lg shadow-lg tap-scale"
              >
                Vedi proposte
              </button>
              <div className="flex gap-3 mt-4 w-full max-w-xs">
                <button
                  onClick={() => {
                    setDetailTask(activeTask);
                    handleEditTask(activeTask);
                  }}
                  className="flex-1 h-12 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-semibold flex items-center justify-center gap-2 tap-scale transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Modifica
                </button>
                <button
                  onClick={() => {
                    setDetailTask(activeTask);
                    setShowCancelConfirm(true);
                  }}
                  className="flex-1 h-12 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-xl font-semibold flex items-center justify-center gap-2 tap-scale transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Annulla
                </button>
              </div>
            </div>
          ) : (activeTask.status === 'accettato' || activeTask.status === 'in_arrivo') && assignedLifterProfile && userPosition ? (
            // Show active task map view when lifter is assigned
            <ActiveTaskMapView
              task={activeTask}
              lifterProfile={assignedLifterProfile}
              userPosition={userPosition}
              lifterPosition={lifterPosition}
              unreadCount={unreadCount}
              onOpenChat={handleOpenChat}
              onOpenDetails={() => handleOpenDetails(activeTask)}
              onComplete={handleCompleteTask}
              onEdit={() => {
                handleOpenDetails(activeTask);
                setTimeout(() => handleEditTask(activeTask), 0);
              }}
              onCancel={() => {
                handleOpenDetails(activeTask);
                setTimeout(() => setShowCancelConfirm(true), 0);
              }}
              categoryEmoji={categoryEmojis[activeTask.category] || "✨"}
            />
          ) : (
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* Map Section */}
            <motion.div 
              className="relative bg-muted"
              animate={{ 
                height: isMapExpanded ? 'calc(100% - 100px)' : '50%'
              }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              style={{ flexShrink: 0 }}
            >
              <div ref={mapContainer} className="absolute inset-0" />

              {isLocating && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                  <div className="text-center">
                    <span className="text-4xl animate-bounce block mb-2">📍</span>
                    <p className="text-sm font-medium text-foreground">Localizzazione...</p>
                  </div>
                </div>
              )}

              {/* Route info when lifter is assigned - positioned to avoid overlap */}
              {(activeTask.status === 'accettato' || activeTask.status === 'in_arrivo') && routeInfo && (
                <div className="absolute top-14 left-4 z-10">
                  <div className="bg-card/95 backdrop-blur-sm px-4 py-2.5 rounded-2xl shadow-lg flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Navigation className="w-4 h-4 text-green-600" />
                      <span className="font-bold text-foreground">{routeInfo.distance}</span>
                    </div>
                    <div className="w-px h-4 bg-border" />
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-foreground">{routeInfo.duration}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Live indicator when assigned */}
              {(activeTask.status === 'accettato' || activeTask.status === 'in_arrivo') && (
                <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 z-10">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span className="text-xs font-bold">In arrivo</span>
                </div>
              )}

              {/* Map legend - moved higher to avoid panel overlap */}
              <div className="absolute bottom-8 left-3 flex items-center gap-2 z-10">
                <div className="bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-soft flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  <span className="text-xs font-medium text-muted-foreground">Tu</span>
                </div>
                {(activeTask.status === 'accettato' || activeTask.status === 'in_arrivo') && assignedLifterProfile ? (
                  <div className="bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-soft flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-medium text-muted-foreground">{assignedLifterProfile.full_name}</span>
                  </div>
                ) : (
                  <div className="bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-soft flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Task</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Swipeable Content Panel */}
            <motion.div 
              className="bg-background rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] overflow-hidden relative"
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

              {/* Collapsed mini-view - shows when map is expanded */}
              {isMapExpanded && (
                <div className="px-4 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {(activeTask.status === 'accettato' || activeTask.status === 'in_arrivo') && assignedLifterProfile ? (
                        <>
                          <div className="w-12 h-12 rounded-full overflow-hidden border-3 border-green-500">
                            {assignedLifterProfile.avatar_url ? (
                              <img src={assignedLifterProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center">
                                <User className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{assignedLifterProfile.full_name}</p>
                            {routeInfo ? (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-green-600 font-medium">📍 {routeInfo.distance}</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-green-600 font-medium">🚶 {routeInfo.duration}</span>
                              </div>
                            ) : (
                              <p className="text-xs text-green-600">In arrivo...</p>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-3xl">{categoryEmojis[activeTask.category] || "📍"}</span>
                          <div>
                            <p className="font-bold text-foreground">{activeTask.title}</p>
                            <p className="text-sm text-primary font-bold">{activeTask.published_price}€</p>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleOpenDetails(activeTask)}
                        className="w-11 h-11 bg-muted rounded-full flex items-center justify-center tap-scale"
                      >
                        <Info className="w-5 h-5 text-foreground" />
                      </button>
                      {activeTask.lifter_id && (
                        <button 
                          onClick={handleOpenChat}
                          className="w-11 h-11 bg-primary rounded-full flex items-center justify-center tap-scale relative"
                        >
                          <MessageCircle className="w-5 h-5 text-primary-foreground" />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Full content when expanded */}
              {!isMapExpanded && (
                <div className="flex-1 overflow-y-auto px-4 pb-4">
                  {/* Task card */}
                  <div className={cn(
                    "bg-card rounded-2xl p-4 shadow-card border",
                    (activeTask.status === 'accettato' || activeTask.status === 'in_arrivo') 
                      ? "border-green-500" 
                      : "border-border"
                  )}>
                    {/* Assigned Lifter header with ETA */}
                    {(activeTask.status === 'accettato' || activeTask.status === 'in_arrivo') && assignedLifterProfile && (
                      <div className="bg-green-500/10 rounded-xl p-3 mb-4 border border-green-500/30">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-14 h-14 rounded-full overflow-hidden border-3 border-green-500">
                            {assignedLifterProfile.avatar_url ? (
                              <img src={assignedLifterProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-muted flex items-center justify-center">
                                <User className="w-7 h-7 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-foreground text-lg">{assignedLifterProfile.full_name}</p>
                              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                            </div>
                            {routeInfo ? (
                              <div className="flex items-center gap-3 mt-1">
                                <div className="flex items-center gap-1.5 bg-green-500/20 px-2 py-1 rounded-lg">
                                  <Navigation className="w-4 h-4 text-green-600" />
                                  <span className="text-sm font-bold text-green-700">{routeInfo.distance}</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-green-500/20 px-2 py-1 rounded-lg">
                                  <Clock className="w-4 h-4 text-green-600" />
                                  <span className="text-sm font-bold text-green-700">{routeInfo.duration}</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-green-600 mt-1">Calcolo percorso...</p>
                            )}
                          </div>
                        </div>
                        {/* Star rating */}
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-green-500/20">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium text-foreground">{assignedLifterProfile.rating?.toFixed(1) || "4.8"}</span>
                          <span className="text-sm text-muted-foreground">• {assignedLifterProfile.total_reviews || 0} recensioni</span>
                        </div>
                      </div>
                    )}

                    {/* Task header */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-4xl">{categoryEmojis[activeTask.category] || "📍"}</span>
                      <div className="flex-1">
                        <h3 className="font-bold text-foreground text-lg">{activeTask.title}</h3>
                        {getStatusBadge(activeTask.status, getApplicationsForTask(activeTask.id).length > 0)}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{activeTask.published_price}€</p>
                      </div>
                    </div>

                    {/* Proposals alert with Lifter photos */}
                    {activeTask.status === 'in_attesa' && getApplicationsForTask(activeTask.id).length > 0 && (
                      <button
                        onClick={() => handleOpenProposals(activeTask)}
                        className="w-full mb-4 p-4 bg-primary/10 border border-primary/30 rounded-2xl flex items-center justify-between tap-scale"
                      >
                        <div className="flex items-center gap-3">
                          {/* Stacked Lifter photos */}
                          <div className="flex -space-x-3">
                            {getApplicationsForTask(activeTask.id).slice(0, 3).map((app, idx) => (
                              <div 
                                key={app.id}
                                className="w-12 h-12 rounded-full border-2 border-card overflow-hidden bg-muted"
                                style={{ zIndex: 3 - idx }}
                              >
                                {app.lifter_profile?.avatar_url ? (
                                  <img 
                                    src={app.lifter_profile.avatar_url} 
                                    alt="" 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <User className="w-6 h-6 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                            ))}
                            {getApplicationsForTask(activeTask.id).length > 3 && (
                              <div 
                                className="w-12 h-12 rounded-full border-2 border-card bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm"
                              >
                                +{getApplicationsForTask(activeTask.id).length - 3}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">
                              {getApplicationsForTask(activeTask.id).length} Lifter interessat{getApplicationsForTask(activeTask.id).length > 1 ? 'i' : 'o'}
                            </p>
                            <p className="text-sm text-muted-foreground">Tocca per scegliere</p>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                          <ChevronLeft className="w-5 h-5 text-primary-foreground rotate-180" />
                        </div>
                      </button>
                    )}

                    {/* Task details */}
                    <div className="bg-muted rounded-xl p-3 mb-4">
                      <p className="text-sm text-muted-foreground">{activeTask.description}</p>
                    </div>

                    {/* Task Completato button - main CTA for assigned tasks */}
                    {(activeTask.status === 'accettato' || activeTask.status === 'in_arrivo') && activeTask.lifter_id && (
                      <button
                        onClick={handleCompleteTask}
                        className="w-full h-14 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 tap-scale mb-3 shadow-lg"
                      >
                        <Check className="w-6 h-6" />
                        Task Completato ✓
                      </button>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleOpenDetails(activeTask)}
                        className="flex-1 h-12 bg-muted text-foreground rounded-xl font-semibold flex items-center justify-center gap-2 tap-scale"
                      >
                        <Info className="w-5 h-5" />
                        Dettagli
                      </button>
                      {activeTask.lifter_id && (
                        <button 
                          onClick={handleOpenChat}
                          className="flex-1 h-12 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 tap-scale relative"
                        >
                          <MessageCircle className="w-5 h-5" />
                          Chat
                          {unreadCount > 0 && (
                            <span className="absolute -top-2 -right-2 min-w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Edit/Cancel also after acceptance */}
                    {(activeTask.status === 'accettato' || activeTask.status === 'in_arrivo') && (
                      <div className="flex gap-3 mt-3">
                        <button
                          onClick={() => {
                            handleOpenDetails(activeTask);
                            setTimeout(() => handleEditTask(activeTask), 0);
                          }}
                          className="flex-1 h-12 bg-primary/10 text-primary rounded-xl font-semibold flex items-center justify-center gap-2 tap-scale"
                        >
                          <Edit2 className="w-5 h-5" />
                          Modifica
                        </button>
                        <button
                          onClick={() => {
                            handleOpenDetails(activeTask);
                            setTimeout(() => setShowCancelConfirm(true), 0);
                          }}
                          className="flex-1 h-12 bg-destructive text-destructive-foreground rounded-xl font-semibold flex items-center justify-center gap-2 tap-scale"
                        >
                          <Trash2 className="w-5 h-5" />
                          Annulla
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
            <span className="text-6xl mb-4">📭</span>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nessun task in corso
            </h3>
            <p className="text-muted-foreground">
              Pubblica un task per ricevere aiuto
            </p>
          </div>
        )
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 space-y-3">
          {scheduledTasks.length > 0 ? (
            scheduledTasks.map((task) => {
              const taskApps = getApplicationsForTask(task.id);
              return (
                <div
                  key={task.id}
                  className="bg-card rounded-2xl p-4 shadow-card border border-border"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{categoryEmojis[task.category] || "📍"}</span>
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground">{task.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                      <div className="flex items-center gap-2 text-xs">
                        {task.scheduled_at && (
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded-lg font-medium">
                            📅 {formatScheduledDate(task.scheduled_at)}
                          </span>
                        )}
                        {getStatusBadge(task.status, taskApps.length > 0)}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary">{task.published_price}€</p>
                    </div>
                  </div>

                  {/* Proposals button */}
                  {taskApps.length > 0 && (
                    <button
                      onClick={() => handleOpenProposals(task)}
                      className="w-full mt-3 p-3 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-between tap-scale"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📩</span>
                        <p className="font-semibold text-foreground">
                          {taskApps.length} proposta{taskApps.length > 1 ? 'e' : ''} – Scegli Lifter
                        </p>
                      </div>
                      <ChevronLeft className="w-5 h-5 text-primary rotate-180" />
                    </button>
                  )}
                  
                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <button 
                      onClick={() => handleOpenDetails(task)}
                      className="flex-1 h-10 bg-muted text-foreground rounded-xl text-sm font-medium flex items-center justify-center gap-2 tap-scale"
                    >
                      <Info className="w-4 h-4" />
                      Dettagli
                    </button>
                    <button 
                      onClick={() => handleEditTask(task)}
                      className="flex-1 h-10 bg-primary/10 text-primary rounded-xl text-sm font-medium flex items-center justify-center gap-2 tap-scale"
                    >
                      <Edit2 className="w-4 h-4" />
                      Modifica
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-5xl mb-4">📅</span>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nessun task programmato
              </h3>
              <p className="text-muted-foreground text-sm">
                Programma un task per una data futura
              </p>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal (for list view) */}
      {editingTask && viewMode === "list" && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-card w-full max-w-lg rounded-t-3xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Modifica task</h3>
              <button 
                onClick={() => setEditingTask(null)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Descrizione
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full h-24 p-3 bg-muted border border-border rounded-xl text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Prezzo (€)
                </label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full h-12 px-4 bg-muted border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              
              <button 
                onClick={handleSaveEdit}
                className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-semibold tap-scale"
              >
                Salva modifiche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
