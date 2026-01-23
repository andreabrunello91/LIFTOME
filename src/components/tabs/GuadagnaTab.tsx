import { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import { Task } from "@/components/TaskCard";
import { FullProfileModal } from "@/components/FullProfileModal";
import { AcceptedTaskView } from "@/components/AcceptedTaskView";
import { ChatView } from "@/components/ChatView";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { notificationService } from "@/services/notificationService";
import { supabase } from "@/integrations/supabase/client";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = "pk.eyJ1IjoiYnJ1bmUyMiIsImEiOiJjbWo4Yms2bGQwMHAzM2RyMDlhamxidmFvIn0.I9xGBb5ZCgFC5KtahiI3sA";
const RADIUS_KM = 1; // 1km radius

type FilterType = "in-corso" | "programmati";
type ViewMode = "list" | "accepted" | "chat";

interface Position {
  lat: number;
  lng: number;
}

// Calculate distance between two points in meters using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

function createCircleGeoJSON(lng: number, lat: number, radiusKm: number) {
  const points = 64;
  const coords: [number, number][] = [];
  
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = radiusKm * Math.cos(angle) / (111.32 * Math.cos(lat * Math.PI / 180));
    const dy = radiusKm * Math.sin(angle) / 110.574;
    coords.push([lng + dx, lat + dy]);
  }
  coords.push(coords[0]);
  
  return {
    type: "Feature" as const,
    geometry: { type: "Polygon" as const, coordinates: [coords] },
    properties: {},
  };
}

// Map emoji to category
const categoryEmojis: Record<string, string> = {
  "spesa": "🛒",
  "montaggio": "🔧",
  "riparazioni": "🔨",
  "traslochi": "📦",
  "pulizie": "🧹",
  "giardinaggio": "🌱",
  "tech": "💻",
  "altro": "✨",
  "cane": "🐕",
  "fila": "📋",
  "medico": "🏥",
  "testimone": "👰",
  "cena": "🍲",
  "babysitting": "👶",
  "dogsitting": "🐕",
  "accompagnamento": "🚗",
};

export const GuadagnaTab = forwardRef<HTMLDivElement>(function GuadagnaTab(_props, ref) {
  const [filter, setFilter] = useState<FilterType>("in-corso");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sosTasks, setSosTasks] = useState<Task[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<Task[]>([]);
  const [acceptedTask, setAcceptedTask] = useState<Task | null>(null);
  const [userPosition, setUserPosition] = useState<Position | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [hasActiveOraTask, setHasActiveOraTask] = useState(false);
  const [hasActiveClientTask, setHasActiveClientTask] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getUser();
  }, []);

  // Check if lifter has an active "ora" task (as lifter)
  const checkActiveOraTask = useCallback(async () => {
    if (!currentUserId) return;
    
    // Check tasks where lifter is assigned and status is active (not completed)
    const { data: activeTasks } = await supabase
      .from('tasks')
      .select('id, is_scheduled')
      .eq('lifter_id', currentUserId)
      .in('status', ['accettato', 'in_arrivo'])
      .eq('is_scheduled', false);
    
    setHasActiveOraTask((activeTasks?.length || 0) > 0);
  }, [currentUserId]);

  // Check if user has an active task as a client (receiving a lift)
  const checkActiveClientTask = useCallback(async () => {
    if (!currentUserId) return;
    
    // Check tasks where user is client and a lifter is assigned (receiving a lift)
    const { data: clientTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('client_id', currentUserId)
      .in('status', ['accettato', 'in_arrivo']);
    
    setHasActiveClientTask((clientTasks?.length || 0) > 0);
  }, [currentUserId]);

  const fetchMyActiveTask = useCallback(async () => {
    if (!currentUserId) return;

    const { data: dbTask, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("lifter_id", currentUserId)
      .in("status", ["accettato", "in_arrivo"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching active lifter task:", error);
      return;
    }

    if (!dbTask) {
      // DON'T clear acceptedTask if in chat mode - prevents chat from closing
      if (viewMode !== "chat") {
        setAcceptedTask(null);
        if (viewMode === "accepted") setViewMode("list");
      }
      return;
    }

    const { data: clientProfileData } = await supabase.rpc("get_public_profile", {
      profile_user_id: dbTask.client_id,
    });
    const clientProfile = clientProfileData?.[0];

    const taskLat = dbTask.location_lat ? Number(dbTask.location_lat) : undefined;
    const taskLng = dbTask.location_lng ? Number(dbTask.location_lng) : undefined;

    const distance =
      userPosition && taskLat != null && taskLng != null
        ? calculateDistance(userPosition.lat, userPosition.lng, taskLat, taskLng)
        : 0;

    const status: Task["status"] = dbTask.status === "in_arrivo" ? "in_progress" : "accepted";

    const transformed: Task = {
      id: dbTask.id,
      title: dbTask.title,
      emoji: categoryEmojis[dbTask.category?.toLowerCase()] || "✨",
      description: dbTask.description || dbTask.title,
      price: Number(dbTask.published_price),
      distance,
      clientName: clientProfile?.full_name || "Cliente",
      clientAvatar: clientProfile?.avatar_url || undefined,
      rating: clientProfile?.rating ? Number(clientProfile.rating) : 4.5,
      reviewCount: clientProfile?.total_reviews || 0,
      status,
      type: dbTask.is_scheduled ? "programmato" : "ora",
      scheduledAt: dbTask.scheduled_at || undefined,
      lat: taskLat,
      lng: taskLng,
      isSos: dbTask.is_sos,
    };

    setAcceptedTask(transformed);
    // DON'T auto-switch viewMode - let user navigate manually
  }, [currentUserId, userPosition]);

  useEffect(() => {
    checkActiveOraTask();
    checkActiveClientTask();
    fetchMyActiveTask();
  }, [checkActiveOraTask, checkActiveClientTask, fetchMyActiveTask]);

  // When a client accepts a task, automatically open the active task view for the lifter
  // (unless the lifter is already in chat).
  useEffect(() => {
    if (acceptedTask && viewMode === "list") {
      setViewMode("accepted");
    }
  }, [acceptedTask?.id, viewMode]);

  // Listen for in-app notifications (lifter_assigned) to show toast with "Apri mappa" button
  useEffect(() => {
    const handleNotification = (data: { type: string; title: string; message: string; data?: Record<string, unknown> }) => {
      if (data.type === 'lifter_assigned') {
        // Show toast with action button
        toast({
          title: data.title,
          description: data.message,
          action: (
            <button
              onClick={() => {
                fetchMyActiveTask();
                setViewMode("accepted");
              }}
              className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap"
            >
              Apri mappa
            </button>
          ),
          duration: 10000, // Keep visible for 10 seconds
        });
        // Also refresh the active task
        fetchMyActiveTask();
      }
    };

    notificationService.setNotificationCallback(handleNotification);

    return () => {
      notificationService.setNotificationCallback(() => {});
    };
  }, [fetchMyActiveTask]);

  // Fetch unread messages count for accepted task
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!currentUserId || !acceptedTask?.id) {
        setUnreadCount(0);
        return;
      }
      
      const { data, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('task_id', acceptedTask.id)
        .eq('is_read', false)
        .neq('sender_id', currentUserId);
      
      if (!error && data) {
        setUnreadCount(data.length);
      }
    };

    fetchUnreadCount();

    // Subscribe to new messages
    if (acceptedTask?.id) {
      const channel = supabase
        .channel(`messages-unread-lifter-${acceptedTask.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `task_id=eq.${acceptedTask.id}`,
          },
          () => fetchUnreadCount()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUserId, acceptedTask?.id]);

  // Reset unread count when opening chat
  useEffect(() => {
    if (viewMode === 'chat' && acceptedTask?.id && currentUserId) {
      supabase
        .from('messages')
        .update({ is_read: true })
        .eq('task_id', acceptedTask.id)
        .neq('sender_id', currentUserId)
        .then(() => setUnreadCount(0));
    }
  }, [viewMode, acceptedTask?.id, currentUserId]);

  // Fetch tasks from Supabase
  const fetchTasks = useCallback(async () => {
    if (!userPosition || !currentUserId) return;

    try {
      // Fetch available tasks (status = 'in_attesa') - exclude own tasks
      const { data: availableTasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'in_attesa')
        .neq('client_id', currentUserId);

      if (error) {
        console.error('Error fetching tasks:', error);
        return;
      }

      if (!availableTasks || availableTasks.length === 0) {
        setTasks([]);
        setSosTasks([]);
        setScheduledTasks([]);
        return;
      }

      // Get unique client IDs to fetch profiles using secure function
      const clientIds = [...new Set(availableTasks.map(t => t.client_id))];
      
      // Fetch client profiles using security definer function (only returns public data)
      const { data: profiles } = await supabase
        .rpc('get_public_profiles', { profile_user_ids: clientIds });

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Transform and filter tasks by distance
      const transformedTasks: Task[] = availableTasks
        .map(task => {
          const taskLat = task.location_lat ? Number(task.location_lat) : null;
          const taskLng = task.location_lng ? Number(task.location_lng) : null;
          
          // Calculate distance if coordinates exist
          let distance = 9999;
          if (taskLat && taskLng) {
            distance = calculateDistance(userPosition.lat, userPosition.lng, taskLat, taskLng);
          }

          const clientProfile = profileMap.get(task.client_id);

          return {
            id: task.id,
            title: task.title,
            emoji: categoryEmojis[task.category?.toLowerCase()] || "✨",
            description: task.description || task.title,
            price: Number(task.published_price),
            distance,
            clientName: clientProfile?.full_name || "Cliente",
            clientAvatar: clientProfile?.avatar_url || undefined,
            rating: clientProfile?.rating ? Number(clientProfile.rating) : 4.5,
            reviewCount: clientProfile?.total_reviews || 0,
            status: "pending" as const,
            type: task.is_scheduled ? "programmato" as const : "ora" as const,
            scheduledAt: task.scheduled_at || undefined,
            lat: taskLat || undefined,
            lng: taskLng || undefined,
            isSos: task.is_sos,
            sosDeadline: task.is_sos ? new Date(Date.now() + 20 * 60000).toISOString() : undefined,
          };
        })
        .filter(task => task.distance <= RADIUS_KM * 1000); // Filter within radius

      // Separate SOS, immediate, and scheduled tasks
      const sos = transformedTasks.filter(t => t.isSos && t.type === "ora");
      const immediate = transformedTasks.filter(t => !t.isSos && t.type === "ora");
      const scheduled = transformedTasks.filter(t => t.type === "programmato");

      // Sort by distance and take closest 5 for immediate tasks
      const sortedImmediate = immediate.sort((a, b) => a.distance - b.distance).slice(0, 5);
      const sortedSos = sos.sort((a, b) => a.distance - b.distance);
      const sortedScheduled = scheduled.sort((a, b) => a.distance - b.distance);

      setTasks(sortedImmediate);
      setSosTasks(sortedSos);
      setScheduledTasks(sortedScheduled);

    } catch (err) {
      console.error('Error in fetchTasks:', err);
    }
  }, [userPosition, currentUserId]);

  // Get user location and update task with lifter position when active
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setIsLocating(false);
      setUserPosition({ lat: 41.9028, lng: 12.4964 });
      return;
    }

    // Update lifter position directly on the task (client can read it via RLS)
    const updatePositionOnTask = async (lat: number, lng: number) => {
      if (!acceptedTask?.id) return;
      
      try {
        await supabase
          .from('tasks')
          .update({ 
            lifter_location_lat: lat, 
            lifter_location_lng: lng,
            lifter_location_updated_at: new Date().toISOString()
          } as any)
          .eq('id', acceptedTask.id);
      } catch (err) {
        console.error('Failed to update lifter position on task:', err);
      }
    };

    const onSuccess = (position: GeolocationPosition) => {
      const newPos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setUserPosition(newPos);
      setIsLocating(false);
      
      // Update task with lifter position when active
      if (acceptedTask) {
        updatePositionOnTask(newPos.lat, newPos.lng);
      }
    };

    const onError = () => {
      setIsLocating(false);
      setUserPosition({ lat: 41.9028, lng: 12.4964 });
    };

    // Initial position
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 10000,
    });

    // Watch position continuously when lifter has active task
    let watchId: number | null = null;
    if (acceptedTask) {
      watchId = navigator.geolocation.watchPosition(onSuccess, () => {}, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000, // Update every 3 seconds max
      });
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [acceptedTask?.id]);

  // Fetch tasks when position or user changes
  useEffect(() => {
    if (userPosition && currentUserId) {
      fetchTasks();
    }
  }, [userPosition, currentUserId, fetchTasks]);

  // Real-time subscription for tasks - use refs to avoid recreating on every render
  const fetchTasksRef = useRef(fetchTasks);
  const fetchMyActiveTaskRef = useRef(fetchMyActiveTask);
  fetchTasksRef.current = fetchTasks;
  fetchMyActiveTaskRef.current = fetchMyActiveTask;

  useEffect(() => {
    if (!currentUserId) return;

    let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('Task change received:', payload);
          
          // Debounce rapid updates to prevent lag
          if (debounceTimeout) clearTimeout(debounceTimeout);
          debounceTimeout = setTimeout(() => {
            fetchTasksRef.current();
            fetchMyActiveTaskRef.current();
          }, 300);
          
          // Show notification for new tasks
          if (payload.eventType === 'INSERT' && payload.new) {
            const newTask = payload.new as any;
            if (newTask.status === 'in_attesa' && newTask.client_id !== currentUserId) {
              notificationService.notifyNewTaskNearby(
                newTask.title,
                500,
                Number(newTask.published_price)
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  // Auto-refresh every 30 seconds (reduced frequency for better performance)
  useEffect(() => {
    if (!userPosition || !currentUserId) return;

    const interval = setInterval(() => {
      fetchTasksRef.current();
    }, 30000);

    return () => clearInterval(interval);
  }, [userPosition, currentUserId]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !userPosition || map.current || viewMode !== "list") return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [userPosition.lng, userPosition.lat],
      zoom: 15,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: false }),
      "top-right"
    );

    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      "top-right"
    );

    map.current.touchZoomRotate.enable();
    map.current.dragPan.enable();

    map.current.on("load", () => {
      if (!map.current) return;

      map.current.addSource("radius", {
        type: "geojson",
        data: createCircleGeoJSON(userPosition.lng, userPosition.lat, RADIUS_KM),
      });

      map.current.addLayer({
        id: "radius-fill",
        type: "fill",
        source: "radius",
        paint: { "fill-color": "#3b82f6", "fill-opacity": 0.1 },
      });

      map.current.addLayer({
        id: "radius-outline",
        type: "line",
        source: "radius",
        paint: { "line-color": "#3b82f6", "line-width": 2, "line-opacity": 0.4 },
      });
    });

    // User marker
    const userMarkerEl = document.createElement("div");
    userMarkerEl.innerHTML = `
      <div style="width: 20px; height: 20px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>
    `;
    new mapboxgl.Marker({ element: userMarkerEl })
      .setLngLat([userPosition.lng, userPosition.lat])
      .addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [userPosition, viewMode]);

  // Add task markers with real positions
  useEffect(() => {
    if (!map.current || !userPosition || viewMode !== "list") return;

    // Remove existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add SOS tasks markers first (higher priority)
    const sosInRadius = sosTasks.filter(t => t.distance <= RADIUS_KM * 1000);
    sosInRadius.forEach((task) => {
      if (!task.lat || !task.lng) return;

      const markerEl = document.createElement("div");
      markerEl.className = "task-marker sos";
      markerEl.innerHTML = `
        <div style="position: relative; cursor: pointer;">
          <div style="width: 50px; height: 50px; background: white; border: 4px solid #ef4444; border-radius: 50%; overflow: hidden; box-shadow: 0 4px 12px rgba(239,68,68,0.4); animation: pulse 1.5s infinite;">
            ${task.clientAvatar 
              ? `<img src="${task.clientAvatar}" style="width: 100%; height: 100%; object-fit: cover;" />`
              : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 24px; background: #fee2e2;">⚠️</div>`
            }
          </div>
          <div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #ef4444; color: white; font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 8px; white-space: nowrap;">SOS</div>
          <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); background: hsl(21, 100%, 50%); color: white; font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 10px; white-space: nowrap;">${task.price}€</div>
        </div>
      `;

      markerEl.addEventListener("click", () => {
        setSelectedTask(task);
        setShowProfileModal(true);
      });

      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([task.lng, task.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Add regular task markers
    const tasksInRadius = tasks.filter(t => t.distance <= RADIUS_KM * 1000);
    tasksInRadius.forEach((task) => {
      if (!task.lat || !task.lng) return;

      const markerEl = document.createElement("div");
      markerEl.className = "task-marker";
      markerEl.innerHTML = `
        <div style="position: relative; cursor: pointer;">
          <div style="width: 44px; height: 44px; background: white; border: 3px solid hsl(21, 100%, 50%); border-radius: 50%; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
            ${task.clientAvatar 
              ? `<img src="${task.clientAvatar}" style="width: 100%; height: 100%; object-fit: cover;" />`
              : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 22px; background: hsl(21, 100%, 95%);">${task.emoji}</div>`
            }
          </div>
          <div style="position: absolute; top: -6px; right: -6px; background: hsl(21, 100%, 50%); color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            ${task.price}€
          </div>
        </div>
      `;

      markerEl.addEventListener("click", () => {
        setSelectedTask(task);
        setShowProfileModal(true);
      });

      const marker = new mapboxgl.Marker({ element: markerEl })
        .setLngLat([task.lng, task.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [tasks, sosTasks, userPosition, viewMode]);

  const handleApplyToTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId) || 
                 scheduledTasks.find((t) => t.id === taskId) ||
                 sosTasks.find((t) => t.id === taskId);
    
    if (!task || !currentUserId) return;

    // Check if trying to apply for "ora" task when already has one active
    const isOraTask = task.type === "ora";
    if (isOraTask && hasActiveOraTask) {
      toast({
        title: "Hai già un task in corso 😊",
        description: "Completa il tuo task immediato prima di accettarne un altro",
      });
      return;
    }

    try {
      // Check if already applied
      const { data: existingApp } = await supabase
        .from('task_applications')
        .select('id')
        .eq('task_id', taskId)
        .eq('lifter_id', currentUserId)
        .single();

      if (existingApp) {
        toast({
          title: "Già candidato",
          description: "Hai già inviato la tua candidatura per questo task",
        });
        return;
      }

      // Create application (Lifter proposes, client will choose)
      const { error } = await supabase
        .from('task_applications')
        .insert({
          task_id: taskId,
          lifter_id: currentUserId,
          status: 'pending'
        });

      if (error) {
        console.error('Error applying to task:', error);
        toast({
          title: "Errore",
          description: "Impossibile candidarsi al task. Riprova.",
          variant: "destructive",
        });
        return;
      }

      // Update local state - remove from available tasks
      setTasks(tasks.filter((t) => t.id !== taskId));
      setSosTasks(sosTasks.filter((t) => t.id !== taskId));
      setScheduledTasks(scheduledTasks.filter((t) => t.id !== taskId));
      setShowProfileModal(false);
      setSelectedTask(null);
      
      // Send notification to client
      notificationService.showLocalNotification({
        title: "Candidatura inviata! 🎉",
        message: `La tua proposta per "${task.title}" è stata inviata al cliente`,
        type: "task_accepted"
      });
      
      toast({
        title: "Candidatura inviata! 🎉",
        description: `Il cliente riceverà la tua proposta per "${task.title}"`,
      });
    } catch (err) {
      console.error('Error in handleApplyToTask:', err);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowProfileModal(true);
  };

  const handleOpenChat = () => {
    setShowProfileModal(false);
    if (acceptedTask) {
      setViewMode("chat");
    } else if (selectedTask) {
      setAcceptedTask(selectedTask);
      setViewMode("chat");
    }
  };

  // Chat view
  if (viewMode === "chat" && (acceptedTask || selectedTask)) {
    const chatTask = acceptedTask || selectedTask!;
    return (
      <ChatView
        task={chatTask}
        onBack={() => setViewMode(acceptedTask ? "accepted" : "list")}
        currentUserId={currentUserId || undefined}
        taskId={chatTask.id}
      />
    );
  }

  // Accepted task view
  if (viewMode === "accepted" && acceptedTask && userPosition) {
    return (
      <>
        <AcceptedTaskView
          task={acceptedTask}
          userPosition={userPosition}
          onOpenDetails={() => {
            setSelectedTask(acceptedTask);
            setShowProfileModal(true);
          }}
          onOpenChat={() => setViewMode("chat")}
          unreadCount={unreadCount}
        />
        <FullProfileModal
          task={selectedTask}
          open={showProfileModal}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedTask(null);
          }}
          onOpenChat={handleOpenChat}
          isAccepted={true}
        />
      </>
    );
  }

  const tasksInRadius = tasks.filter(t => t.distance <= RADIUS_KM * 1000).slice(0, 5);
  const sosInRadius = sosTasks.filter(t => t.distance <= RADIUS_KM * 1000);

  // Calculate available height (screen - header 70px - nav 60px)
  const contentHeight = "calc(100vh - 70px - 60px)";
  const halfHeight = "calc((100vh - 70px - 60px) / 2)";

  // Block view if user is receiving a lift as client
  if (hasActiveClientTask) {
    return (
      <div className="flex flex-col items-center justify-center px-6 text-center" style={{ height: contentHeight }}>
        <div className="bg-primary/10 rounded-full p-6 mb-6">
          <span className="text-6xl">🚗</span>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-3">
          Stai ricevendo un Lift! 
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xs">
          Hai un Lifter in arrivo. Completa il task attivo prima di accettarne uno nuovo come Lifter 😊
        </p>
        <div className="flex items-center gap-2 text-sm text-primary">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Vai su "I miei Lift" per vedere i dettagli</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: contentHeight }}>
      {/* Filter tabs - fixed at top */}
      <div className="px-4 py-2 bg-background flex-shrink-0">
        <div className="flex gap-2 bg-muted rounded-2xl p-1">
          <button
            onClick={() => setFilter("in-corso")}
            className={cn(
              "flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-200",
              filter === "in-corso"
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground"
            )}
          >
            In corso 🔄
          </button>
          <button
            onClick={() => setFilter("programmati")}
            className={cn(
              "flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all duration-200 relative",
              filter === "programmati"
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground"
            )}
          >
            Programmati 📅
            {scheduledTasks.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {scheduledTasks.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {filter === "in-corso" ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Fixed Map - exactly 50% of content area */}
          <div className="flex-shrink-0 relative bg-muted" style={{ height: halfHeight }}>
            <div ref={mapContainer} className="absolute inset-0" />

            {isLocating && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                <div className="text-center">
                  <span className="text-4xl animate-bounce block mb-2">📍</span>
                  <p className="text-sm font-medium text-foreground">Localizzazione...</p>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 z-10">
              <div className="bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-soft flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-foreground">La mia posizione</span>
              </div>
              <div className="bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-soft flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-xs font-medium text-foreground">Task disponibili</span>
              </div>
            </div>

            <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-soft flex items-center gap-2 z-10">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium text-foreground">Live</span>
            </div>
          </div>

          {/* Scrollable Task List - exactly 50% of content area */}
          <div className="flex-1 overflow-y-auto bg-background" style={{ height: halfHeight }}>
            <div className="px-4 py-3 space-y-3">
              {/* Active task warning */}
              {hasActiveOraTask && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⏳</span>
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                      Hai già un task in corso. Completa quello prima di accettarne un altro immediato 😊
                    </p>
                  </div>
                </div>
              )}

              {/* Info text */}
              {!hasActiveOraTask && tasksInRadius.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  💡 Puoi accettare solo 1 task immediato alla volta
                </p>
              )}
              
              {/* SOS Tasks first (priority) */}
              {sosInRadius.map((task) => (
                <SosTaskCard
                  key={task.id}
                  task={task}
                  onClick={() => handleTaskClick(task)}
                  onAccept={() => handleApplyToTask(task.id)}
                  disabled={hasActiveOraTask}
                />
              ))}
              
              {/* Regular tasks */}
              {tasksInRadius.length > 0 ? (
                tasksInRadius.map((task) => (
                  <TaskCardLarge
                    key={task.id}
                    task={task}
                    onClick={() => handleTaskClick(task)}
                    onAccept={() => handleApplyToTask(task.id)}
                    disabled={hasActiveOraTask}
                  />
                ))
              ) : sosInRadius.length === 0 ? (
                <EmptyState 
                  emoji="🔍" 
                  title="Nessun task nel raggio" 
                  description="Amplia la ricerca o torna più tardi!" 
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">
              📅 Task programmati disponibili
            </h3>
            <span className="text-xs text-primary font-medium">
              ✨ Puoi prenotarne quanti vuoi
            </span>
          </div>
          {scheduledTasks.length > 0 ? (
            scheduledTasks.map((task) => (
              <TaskCardLarge
                key={task.id}
                task={task}
                onClick={() => handleTaskClick(task)}
                onAccept={() => handleApplyToTask(task.id)}
                disabled={false}
                isScheduled={true}
              />
            ))
          ) : (
            <EmptyState 
              emoji="📅" 
              title="Nessun task programmato" 
              description="I task programmati appariranno qui" 
            />
          )}
        </div>
      )}

      {/* Profile Modal */}
      <FullProfileModal
        task={selectedTask}
        open={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedTask(null);
        }}
        onOpenChat={handleOpenChat}
        onApply={handleApplyToTask}
        isAccepted={false}
      />
    </div>
  );
});

// Large horizontal task card with accept button
function TaskCardLarge({ task, onClick, onAccept, disabled = false, isScheduled = false }: { 
  task: Task; 
  onClick: () => void;
  onAccept: () => void;
  disabled?: boolean;
  isScheduled?: boolean;
}) {
  return (
    <div className={cn(
      "bg-card rounded-2xl p-4 shadow-card flex items-center gap-4 transition-all duration-200 hover:shadow-elevated",
      disabled && "opacity-60"
    )}>
      {/* Profile Photo - clickable */}
      <div 
        onClick={onClick}
        className="flex-shrink-0 cursor-pointer"
      >
        <div className="w-14 h-14 rounded-full bg-muted overflow-hidden border-2 border-border">
          {task.clientAvatar ? (
            <img src={task.clientAvatar} alt={task.clientName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl bg-primary/10">
              {task.emoji}
            </div>
          )}
        </div>
      </div>

      {/* Info - clickable */}
      <div 
        onClick={onClick}
        className="flex-1 min-w-0 cursor-pointer"
      >
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-bold text-foreground truncate">{task.clientName}</h3>
        </div>
        <p className="text-sm text-muted-foreground truncate">{task.title}</p>
        <span className="text-sm text-primary font-medium">{task.distance}m</span>
      </div>

      {/* Price */}
      <div className="flex-shrink-0 text-right">
        <span className="text-2xl font-bold text-foreground">{task.price}€</span>
      </div>

      {/* Accept Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onAccept();
        }}
        disabled={disabled}
        className={cn(
          "flex-shrink-0 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors",
          disabled 
            ? "bg-muted text-muted-foreground cursor-not-allowed" 
            : "bg-primary hover:bg-primary/90 text-primary-foreground tap-scale"
        )}
      >
        {isScheduled ? "Prenota 📅" : "Candidati 📩"}
      </button>
    </div>
  );
}

// SOS Urgent task card with red pulsing border
function SosTaskCard({ task, onClick, onAccept, disabled = false }: { 
  task: Task; 
  onClick: () => void;
  onAccept: () => void;
  disabled?: boolean;
}) {
  // Calculate remaining time for countdown
  const getRemainingMinutes = () => {
    if (!task.sosDeadline) return 20;
    const deadline = new Date(task.sosDeadline).getTime();
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((deadline - now) / 60000));
    return remaining;
  };

  return (
    <div 
      className={cn(
        "bg-card rounded-2xl p-4 shadow-card border-2 border-red-500 animate-sos-border relative overflow-hidden",
        disabled && "opacity-60"
      )}
    >
      {/* URGENTE badge */}
      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
        ⚠️ URGENTE
        <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">
          {getRemainingMinutes()}min
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Profile Photo - clickable */}
        <div 
          onClick={onClick}
          className="flex-shrink-0 cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full bg-red-100 overflow-hidden border-3 border-red-500">
            {task.clientAvatar ? (
              <img src={task.clientAvatar} alt={task.clientName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">
                ⚠️
              </div>
            )}
          </div>
        </div>

        {/* Info - clickable */}
        <div 
          onClick={onClick}
          className="flex-1 min-w-0 cursor-pointer"
        >
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-foreground truncate">{task.clientName}</h3>
          </div>
          <p className="text-sm text-muted-foreground truncate">{task.title}</p>
          <span className="text-sm text-red-500 font-medium">{task.distance}m • SOS</span>
        </div>

        {/* Price & Accept */}
        <div className="flex flex-col items-end gap-2">
          <span className="text-2xl font-bold text-red-500">{task.price}€</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) onAccept();
            }}
            disabled={disabled}
            className={cn(
              "px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors",
              disabled 
                ? "bg-muted text-muted-foreground cursor-not-allowed" 
                : "bg-red-500 hover:bg-red-600 text-white tap-scale"
            )}
          >
            Candidati 📩
          </button>
        </div>
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-5xl mb-4">{emoji}</span>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
