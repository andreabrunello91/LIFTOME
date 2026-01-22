import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { MapPin, Navigation, Search, Calendar, Clock, Loader2 } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { notificationService } from "@/services/notificationService";

const MAPBOX_TOKEN = "pk.eyJ1IjoiYnJ1bmUyMiIsImEiOiJjbWo4Yms2bGQwMHAzM2RyMDlhamxidmFvIn0.I9xGBb5ZCgFC5KtahiI3sA";
const MIN_PRICE = 15;

interface TaskCategory {
  id: string;
  emoji: string;
  title: string;
  defaultDescription: string;
  suggestedPrice: number;
}

const taskCategories: TaskCategory[] = [
  {
    id: "spesa",
    emoji: "🛒",
    title: "Spesa e shopping",
    defaultDescription: "Ho bisogno di aiuto per fare la spesa o portare buste pesanti",
    suggestedPrice: 15,
  },
  {
    id: "babysitting",
    emoji: "👶",
    title: "Baby sitting",
    defaultDescription: "Ho bisogno di una babysitter per poche ore",
    suggestedPrice: 20,
  },
  {
    id: "dogsitting",
    emoji: "🐕",
    title: "Dog sitting",
    defaultDescription: "Ho bisogno di qualcuno che porti a spasso o guardi il mio cane",
    suggestedPrice: 15,
  },
  {
    id: "accompagnamento",
    emoji: "🚗",
    title: "Accompagnamento",
    defaultDescription: "Ho bisogno di accompagnamento dal medico, a scuola o appuntamenti",
    suggestedPrice: 20,
  },
  {
    id: "montaggio",
    emoji: "🔧",
    title: "Montaggio mobili",
    defaultDescription: "Ho bisogno di aiuto per montare mobili (es. IKEA)",
    suggestedPrice: 35,
  },
  {
    id: "riparazioni",
    emoji: "🔨",
    title: "Riparazioni",
    defaultDescription: "Ho bisogno di piccole riparazioni in casa",
    suggestedPrice: 30,
  },
  {
    id: "traslochi",
    emoji: "📦",
    title: "Traslochi",
    defaultDescription: "Ho bisogno di aiuto per spostare oggetti o piccoli traslochi",
    suggestedPrice: 50,
  },
  {
    id: "pulizie",
    emoji: "🧹",
    title: "Pulizie",
    defaultDescription: "Ho bisogno di aiuto per le pulizie di casa o ufficio",
    suggestedPrice: 25,
  },
  {
    id: "giardinaggio",
    emoji: "🌱",
    title: "Giardinaggio",
    defaultDescription: "Ho bisogno di aiuto per la cura del giardino o balcone",
    suggestedPrice: 30,
  },
  {
    id: "tech",
    emoji: "💻",
    title: "Assistenza tech",
    defaultDescription: "Ho bisogno di aiuto con computer, smartphone o dispositivi tecnologici",
    suggestedPrice: 25,
  },
  {
    id: "altro",
    emoji: "✨",
    title: "Altro",
    defaultDescription: "",
    suggestedPrice: 20,
  },
];

type ScheduleType = "ora" | "programmato";
type LocationType = "current" | "custom";

interface Position {
  lat: number;
  lng: number;
  address?: string;
}

export function PubblicaTab() {
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(null);
  const [customTitle, setCustomTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("ora");
  const [locationType, setLocationType] = useState<LocationType>("current");
  const [customAddress, setCustomAddress] = useState("");
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [customPosition, setCustomPosition] = useState<Position | null>(null);
  const [step, setStep] = useState<"select" | "details">("select");
  const [isLocating, setIsLocating] = useState(true);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isSosMode, setIsSosMode] = useState(false);
  const [showSosConfirm, setShowSosConfirm] = useState(false);
  const [isCheckingContent, setIsCheckingContent] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [hasActiveOraTask, setHasActiveOraTask] = useState(false);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  // Check if client already has an active "ora" task
  useEffect(() => {
    const checkActiveOraTask = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: activeTasks } = await supabase
        .from('tasks')
        .select('id')
        .eq('client_id', user.id)
        .eq('is_scheduled', false)
        .in('status', ['in_attesa', 'accettato', 'in_arrivo']);

      setHasActiveOraTask((activeTasks?.length || 0) > 0);
    };

    checkActiveOraTask();

    // Subscribe to task changes to update active status
    const channel = supabase
      .channel('client-tasks-check')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => checkActiveOraTask()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Check if immediate task (ora + current position)
  const isImmediateTask = scheduleType === "ora" && locationType === "current";

  // Price validation
  useEffect(() => {
    if (budget) {
      const price = parseFloat(budget);
      if (price < MIN_PRICE) {
        setPriceError(`Prezzo minimo ${MIN_PRICE} € per garantire qualità`);
      } else {
        setPriceError(null);
      }
    } else {
      setPriceError(null);
    }
  }, [budget]);

  // Get current location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: "La tua posizione attuale",
          });
          setIsLocating(false);
        },
        () => {
          setIsLocating(false);
          setCurrentPosition({
            lat: 45.5416,
            lng: 10.2118,
            address: "Brescia (default)",
          });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Initialize map for custom location
  useEffect(() => {
    if (locationType !== "custom" || !mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    const initialPos = currentPosition || { lat: 45.5416, lng: 10.2118 };
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [initialPos.lng, initialPos.lat],
      zoom: 14,
    });

    marker.current = new mapboxgl.Marker({ color: "#FF5A00", draggable: true })
      .setLngLat([initialPos.lng, initialPos.lat])
      .addTo(map.current);

    marker.current.on("dragend", () => {
      if (marker.current) {
        const lngLat = marker.current.getLngLat();
        setCustomPosition({
          lat: lngLat.lat,
          lng: lngLat.lng,
        });
      }
    });

    map.current.on("click", (e) => {
      if (marker.current) {
        marker.current.setLngLat([e.lngLat.lng, e.lngLat.lat]);
        setCustomPosition({
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
        });
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [locationType, currentPosition]);

  const handleSelectCategory = (category: TaskCategory, fromSos: boolean = false) => {
    setSelectedCategory(category);
    setDescription(category.defaultDescription);
    // For SOS: apply +50% to suggested price
    const basePrice = category.suggestedPrice;
    const finalPrice = fromSos ? Math.ceil(basePrice * 1.5) : basePrice;
    setBudget(finalPrice.toString());
    setCustomTitle("");
    setStep("details");
  };

  const handleBack = () => {
    setStep("select");
    setSelectedCategory(null);
    setIsSosMode(false);
    map.current?.remove();
    map.current = null;
  };

  const handleSosClick = () => {
    setShowSosConfirm(true);
  };

  const handleSosConfirm = () => {
    setShowSosConfirm(false);
    setIsSosMode(true);
    // SOS mode: immediate task, current location
    setScheduleType("ora");
    setLocationType("current");
  };

  const handlePublish = async () => {
    if (!selectedCategory || !budget) return;
    
    const title = selectedCategory.id === "altro" ? customTitle : selectedCategory.title;
    if (selectedCategory.id === "altro" && !customTitle) {
      toast({
        title: "Titolo richiesto",
        description: "Per favore inserisci un titolo per il tuo task",
        variant: "destructive",
      });
      return;
    }

    // Check minimum price
    const totalPrice = parseFloat(budget);
    if (totalPrice < MIN_PRICE) {
      toast({
        title: "Prezzo troppo basso",
        description: `Prezzo minimo ${MIN_PRICE} € per garantire qualità`,
        variant: "destructive",
      });
      return;
    }

    if (scheduleType === "programmato" && (!scheduledDate || !scheduledTime)) {
      toast({
        title: "Data e ora richiesti",
        description: "Per favore seleziona data e ora per il task programmato",
        variant: "destructive",
      });
      return;
    }

    // Content moderation for free-form tasks (custom title/description)
    if (selectedCategory.id === "altro" || description !== selectedCategory.defaultDescription) {
      setIsCheckingContent(true);
      try {
        const { data, error } = await supabase.functions.invoke('content-moderation', {
          body: { title: customTitle, description },
        });

        if (data?.blocked) {
          toast({
            title: "Descrizione non consentita 🚫",
            description: "Usa linguaggio rispettoso 😊",
            variant: "destructive",
          });
          setIsCheckingContent(false);
          return;
        }
      } catch (err) {
        console.error('Moderation check failed:', err);
        // Continue anyway if moderation fails
      }
      setIsCheckingContent(false);
    }

    // Calculate published price (rounded to nearest 0.50€)
    const rawPublished = totalPrice * 0.8;
    const publishedPrice = Math.round(rawPublished * 2) / 2;

    // Get user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Errore",
        description: "Devi essere loggato per pubblicare un task",
        variant: "destructive",
      });
      return;
    }

    // Get position
    const position = locationType === "custom" && customPosition 
      ? customPosition 
      : currentPosition;

    // Create scheduled_at timestamp if scheduled
    let scheduledAt = null;
    if (scheduleType === "programmato" && scheduledDate && scheduledTime) {
      scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
    }

    // Insert task into database
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .insert({
        client_id: user.id,
        title: title,
        description: description,
        category: selectedCategory.id,
        price: totalPrice,
        published_price: publishedPrice,
        status: 'in_attesa',
        is_sos: isSosMode,
        is_scheduled: scheduleType === "programmato",
        scheduled_at: scheduledAt,
        location_lat: position?.lat || null,
        location_lng: position?.lng || null,
        location_address: position?.address || null,
      })
      .select()
      .single();

    if (taskError) {
      console.error('Error creating task:', taskError);
      toast({
        title: "Errore",
        description: "Impossibile pubblicare il task. Riprova.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: isSosMode ? "Task SOS pubblicato! 🚨" : "Task pubblicato! 🎉",
      description: isSosMode 
        ? `"${title}" pubblicato come URGENTE a ${publishedPrice.toFixed(2)}€. Notifica push inviata ai Lifter vicini!`
        : `"${title}" pubblicato a ${publishedPrice.toFixed(2)}€. In attesa di un Lifter...`,
    });

    // Send push notification to nearby Lifters
    if (position?.lat && position?.lng) {
      notificationService.notifyNewTaskNearby(
        title,
        0, // Distance not available here
        publishedPrice,
        { lat: position.lat, lng: position.lng }
      );
    }

    // Reset form
    setStep("select");
    setSelectedCategory(null);
    setDescription("");
    setBudget("");
    setCustomTitle("");
    setLocationType("current");
    setCustomAddress("");
    setScheduledDate("");
    setScheduledTime("");
    setIsSosMode(false);
    map.current?.remove();
    map.current = null;
  };

  const totalPrice = budget ? parseFloat(budget) : 0;
  // Round to nearest 0.50€
  const rawPublished = totalPrice * 0.8;
  const publishedPrice = Math.round(rawPublished * 2) / 2;
  const serviceFee = totalPrice - publishedPrice;

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  if (step === "details" && selectedCategory) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className={cn(
          "px-4 pt-4 pb-2 sticky top-0 z-10",
          isSosMode ? "bg-red-500" : "bg-background"
        )}>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={handleBack}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center tap-scale",
                isSosMode ? "bg-white/20 text-white" : "bg-muted"
              )}
            >
              ←
            </button>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-3xl">{selectedCategory.emoji}</span>
              <h1 className={cn(
                "text-xl font-bold",
                isSosMode ? "text-white" : "text-foreground"
              )}>
                {selectedCategory.title}
              </h1>
            </div>
            {isSosMode && (
              <span className="bg-white text-red-500 px-3 py-1 rounded-full text-xs font-bold">
                ⚠️ SOS
              </span>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-4 pb-36 space-y-5">
          {/* Custom title (only for "Altro") */}
          {selectedCategory.id === "altro" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Titolo del task ✏️
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Es: Aiuto per evento, commissione urgente..."
                className="w-full h-14 px-4 bg-card border border-border rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Descrizione 📝
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrivi di cosa hai bisogno..."
              className="w-full h-24 p-4 bg-card border border-border rounded-2xl text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Quanto vuoi spendere? 💰
            </label>
            <div className="relative">
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder={selectedCategory.suggestedPrice.toString()}
                min={MIN_PRICE}
                className={cn(
                  "w-full h-14 px-4 pr-12 bg-card border rounded-2xl text-foreground text-xl font-bold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50",
                  priceError ? "border-destructive" : "border-border"
                )}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">
                €
              </span>
            </div>

            {/* Price error - only shows when price is below minimum */}
            {priceError && (
              <p className="mt-2 text-sm text-destructive font-medium">
                ❌ {priceError}
              </p>
            )}
            
            {/* AI Price Suggestion Box */}
            <div className="mt-3 px-4 py-3 bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <div>
                  <p className="text-sm font-semibold text-primary">
                    Suggerimento IA: {selectedCategory.suggestedPrice}€
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Basato su task simili nella zona e orario
                  </p>
                </div>
              </div>
            </div>
            
            {budget && parseFloat(budget) >= MIN_PRICE && (
              <div className="mt-3 p-4 bg-card border border-primary/20 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Il tuo budget</span>
                  <span className="font-bold text-foreground">{totalPrice.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Fee di servizio (20%)</span>
                  <span className="text-sm text-muted-foreground">-{serviceFee.toFixed(2)}€</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between items-center">
                  <span className="text-sm font-semibold text-foreground">Task pubblicato a</span>
                  <span className="font-bold text-primary text-lg">{publishedPrice.toFixed(2)}€</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  ✅ Il Lifter riceverà {publishedPrice.toFixed(2)}€ (100% del prezzo pubblicato)
                </p>
              </div>
            )}
          </div>

          {/* Only show position/schedule options if NOT immediate task */}
          {!isImmediateTask && (
            <>
              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Posizione 📍
                </label>
                <div className="flex gap-2 bg-muted rounded-2xl p-1 mb-3">
                  <button
                    onClick={() => setLocationType("current")}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2",
                      locationType === "current"
                        ? "bg-card text-foreground shadow-soft"
                        : "text-muted-foreground"
                    )}
                  >
                    <Navigation className="w-4 h-4" />
                    Posizione attuale
                  </button>
                  <button
                    onClick={() => setLocationType("custom")}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2",
                      locationType === "custom"
                        ? "bg-card text-foreground shadow-soft"
                        : "text-muted-foreground"
                    )}
                  >
                    <MapPin className="w-4 h-4" />
                    Altra posizione
                  </button>
                </div>

                {locationType === "current" ? (
                  <div className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Navigation className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      {isLocating ? (
                        <p className="text-sm text-muted-foreground">Localizzazione in corso...</p>
                      ) : (
                        <>
                          <p className="font-medium text-foreground">La tua posizione</p>
                          <p className="text-xs text-muted-foreground">
                            {currentPosition?.address || "Posizione GPS attiva"}
                          </p>
                        </>
                      )}
                    </div>
                    <span className="text-green-500 text-lg">✓</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={customAddress}
                        onChange={(e) => setCustomAddress(e.target.value)}
                        placeholder="Scrivi l'indirizzo..."
                        className="w-full h-12 pl-12 pr-4 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div 
                      ref={mapContainer}
                      className="w-full h-48 rounded-2xl overflow-hidden border border-border"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Tocca la mappa o trascina il marker per selezionare la posizione
                    </p>
                  </div>
                )}
              </div>

              {/* Schedule type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Quando? ⏰
                </label>
                <div className="flex gap-2 bg-muted rounded-2xl p-1">
                  <button
                    onClick={() => setScheduleType("ora")}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200",
                      scheduleType === "ora"
                        ? "bg-card text-foreground shadow-soft"
                        : "text-muted-foreground"
                    )}
                  >
                    Ora ⚡
                  </button>
                  <button
                    onClick={() => setScheduleType("programmato")}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200",
                      scheduleType === "programmato"
                        ? "bg-card text-foreground shadow-soft"
                        : "text-muted-foreground"
                    )}
                  >
                    Programma 📅
                  </button>
                </div>
              </div>

              {/* Date/Time picker for scheduled tasks */}
              {scheduleType === "programmato" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Seleziona data
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={today}
                      className="w-full h-14 px-4 bg-card border border-border rounded-2xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      <Clock className="w-4 h-4 inline mr-2" />
                      Seleziona ora
                    </label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full h-14 px-4 bg-card border border-border rounded-2xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Escrow info */}
          <div className="p-4 bg-liftome-success/10 border border-liftome-success/30 rounded-2xl">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Pagamento sicuro</h4>
                <p className="text-sm text-muted-foreground">
                  Il pagamento sarà trattenuto in escrow fino al completamento del task. Pagherai solo quando sarai soddisfatto!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Publish button */}
        <div className="fixed bottom-16 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-background via-background to-transparent pt-6 z-20">
          <Button
            onClick={handlePublish}
            variant="cta"
            size="xl"
            className={cn("w-full", isSosMode && "bg-red-500 hover:bg-red-600")}
            disabled={!budget || parseFloat(budget) < MIN_PRICE || (selectedCategory.id === "altro" && !customTitle) || isCheckingContent}
          >
            {isCheckingContent ? (
              <><Loader2 className="w-5 h-5 animate-spin mr-2" />Verifica in corso...</>
            ) : isSosMode ? "Pubblica SOS 🚨" : "Pubblica Task 🚀"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* SOS Confirm Modal */}
      {showSosConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full animate-scale-in">
            <div className="text-center mb-4">
              <span className="text-5xl block mb-3">⚠️</span>
              <h3 className="text-xl font-bold text-foreground mb-2">Task Urgente</h3>
              <p className="text-sm text-muted-foreground">
                Il prezzo sarà maggiorato del <span className="font-bold text-red-500">+50%</span> e una notifica push immediata verrà inviata ai Lifter entro 2km.
              </p>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 mb-4">
              <p className="text-sm text-red-600 dark:text-red-400 text-center">
                Es: Spesa normale 20€ → <span className="font-bold">SOS 30€</span>
                <br />
                <span className="text-xs">(Lifter riceve 24€, fee inclusa)</span>
              </p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowSosConfirm(false)}
                className="flex-1 h-12 bg-muted text-foreground rounded-xl font-semibold tap-scale"
              >
                Annulla
              </button>
              <button 
                onClick={handleSosConfirm}
                className="flex-1 h-12 bg-red-500 text-white rounded-xl font-semibold tap-scale"
              >
                Conferma SOS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quando & Posizione dropdowns - hidden in SOS mode */}
      {!isSosMode && (
        <div className="px-4 pt-3 pb-2 bg-background sticky top-0 z-10">
          <div className="flex gap-3">
            {/* Quando dropdown */}
            <div className="flex-1">
              <select
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
                className="w-full h-10 px-3 bg-card border border-border rounded-xl text-sm text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
              >
                <option value="ora">⚡ Ora</option>
                <option value="programmato">📅 Programma</option>
              </select>
            </div>
            
            {/* Posizione dropdown */}
            <div className="flex-1">
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value as LocationType)}
                className="w-full h-10 px-3 bg-card border border-border rounded-xl text-sm text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
              >
                <option value="current">📍 Posizione attuale</option>
                <option value="custom">🗺️ Altra posizione</option>
              </select>
            </div>
          </div>

          {/* Scheduled date/time picker inline */}
          {scheduleType === "programmato" && (
            <div className="flex gap-3 mt-3">
              <div className="flex-1">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={today}
                  className="w-full h-10 px-3 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex-1">
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full h-10 px-3 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          )}

          {/* Custom location map */}
          {locationType === "custom" && (
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  placeholder="Scrivi l'indirizzo..."
                  className="w-full h-10 pl-10 pr-4 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div 
                ref={mapContainer}
                className="w-full h-32 rounded-xl overflow-hidden border border-border"
              />
            </div>
          )}
        </div>
      )}

      {/* SOS Mode header */}
      {isSosMode && (
        <div className="px-4 pt-3 pb-2 bg-red-500 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <span className="text-2xl">⚠️</span>
              <div>
                <h2 className="font-bold text-lg">Modalità SOS</h2>
                <p className="text-xs opacity-80">Prezzo +50% • Notifica immediata</p>
              </div>
            </div>
            <button 
              onClick={() => setIsSosMode(false)}
              className="text-white bg-white/20 rounded-full px-3 py-1 text-sm font-medium"
            >
              Annulla SOS
            </button>
          </div>
        </div>
      )}

      {/* Category grid */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28">
        {/* Blocked state - already has active "ora" task */}
        {hasActiveOraTask && scheduleType === "ora" && (
          <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⏳</span>
              <div>
                <h3 className="font-bold text-amber-800 dark:text-amber-200">Hai già un task immediato attivo</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Completa quello prima di pubblicarne un altro "Ora". Puoi invece pubblicare un task programmato 📅
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SOS Button - Big red button at top */}
        {!isSosMode && !(hasActiveOraTask && scheduleType === "ora") && (
          <button
            onClick={handleSosClick}
            className="w-full mb-4 p-4 bg-red-500 hover:bg-red-600 rounded-2xl shadow-lg animate-sos-pulse transition-colors tap-scale"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl">⚠️</span>
              <div className="text-left">
                <h3 className="text-white font-bold text-lg">SOS – Aiuto urgente!</h3>
                <p className="text-white/80 text-sm">Prezzo +50%, notifica push immediata</p>
              </div>
            </div>
          </button>
        )}

        {/* Info text for programmati */}
        {scheduleType === "programmato" && (
          <p className="text-xs text-primary text-center mb-3 font-medium">
            ✨ Puoi pubblicare quanti task programmati vuoi
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          {taskCategories.map((category) => {
            const isBlocked = hasActiveOraTask && scheduleType === "ora";
            return (
              <button
                key={category.id}
                onClick={() => !isBlocked && handleSelectCategory(category, isSosMode)}
                disabled={isBlocked}
                className={cn(
                  "rounded-2xl p-4 text-left shadow-card transition-all duration-200 border",
                  isBlocked 
                    ? "opacity-50 cursor-not-allowed bg-muted border-border" 
                    : "bg-card hover:shadow-elevated active:scale-[0.98] tap-scale",
                  isSosMode && !isBlocked
                    ? "border-red-300 dark:border-red-700" 
                    : "border-border"
                )}
              >
                <span className="text-4xl block mb-2">{category.emoji}</span>
                <h3 className="font-semibold text-foreground text-sm">{category.title}</h3>
                <p className={cn(
                  "text-xs mt-1",
                  isSosMode && !isBlocked ? "text-red-500 font-medium" : "text-muted-foreground"
                )}>
                  {isSosMode && !isBlocked
                    ? `SOS ${Math.ceil(category.suggestedPrice * 1.5)}€`
                    : `Da ${category.suggestedPrice}€`
                  }
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
