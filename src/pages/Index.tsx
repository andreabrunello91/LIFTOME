import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Auth } from "@/components/Auth";
import { Onboarding } from "@/components/Onboarding";
import { Header } from "@/components/Header";
import { BottomNav, TabType } from "@/components/BottomNav";
import { GuadagnaTab } from "@/components/tabs/GuadagnaTab";
import { PubblicaTab } from "@/components/tabs/PubblicaTab";
import { MieiLiftTab } from "@/components/tabs/MieiLiftTab";
import { ProfiloTab } from "@/components/tabs/ProfiloTab";
import { NotificationPermissionDialog } from "@/components/NotificationPermissionDialog";
import { notificationService } from "@/services/notificationService";
import { ensureProfileForUser } from "@/services/profileService";
import { useToast } from "@/hooks/use-toast";


const ONBOARDING_KEY = "liftome_onboarding_complete";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("guadagna");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Handle URL tab parameter + "become lifter" intent
  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabType | null;
    const lifterParam = searchParams.get("lifter");
    const intent = localStorage.getItem("liftome_intent");

    if (tabParam && ["guadagna", "pubblica", "miei-lift", "profilo"].includes(tabParam)) {
      setActiveTab(tabParam);
    }

    const shouldBecomeLifter = (lifterParam === "true" || intent === "become_lifter") && !!session;

    if (shouldBecomeLifter) {
      setActiveTab("guadagna");

      const run = async () => {
        try {
          const currentRole = (session?.user?.user_metadata as any)?.role;
          if (currentRole !== "lifter") {
            const { error } = await supabase.auth.updateUser({ data: { role: "lifter" } });
            if (error) throw error;
          }

          toast({
            title: "Ora sei un Lifter! 🎉",
            description: "Guadagna aiutando i tuoi vicini",
          });
        } catch (e) {
          toast({
            title: "Errore",
            description: "Non riesco ad attivare il ruolo Lifter. Riprova.",
            variant: "destructive",
          });
        } finally {
          localStorage.removeItem("liftome_intent");
          const next = new URLSearchParams(searchParams);
          next.delete("lifter");
          setSearchParams(next);
        }
      };

      run();
    }
  }, [searchParams, session, toast, setSearchParams]);

  // Initialize notifications when user logs in (non-blocking)
  useEffect(() => {
    const initNotifications = async (user: Session["user"]) => {
      try {
        // Ensure profile exists so name/photo are always available across the app
        await ensureProfileForUser(user);

        await notificationService.init();
        await notificationService.setUserId(user.id);

        // Get user's location and update for nearby notifications
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              notificationService.updateLocation(
                position.coords.latitude,
                position.coords.longitude
              );
            },
            () => {}
          );
        }
      } catch (error) {
        console.error("Failed to init notifications:", error);
      }
    };

    // Set up auth state listener FIRST (keep callback synchronous to avoid freezes)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      if (event === "SIGNED_IN" && session) {
        const onboardingComplete = localStorage.getItem(ONBOARDING_KEY);
        if (!onboardingComplete) setShowOnboarding(true);

        // Defer any Supabase/async work outside the callback
        setTimeout(() => {
          void initNotifications(session.user);
        }, 0);
      }

      if (event === "SIGNED_OUT") {
        setTimeout(() => {
          void notificationService.logout();
        }, 0);
      }
    });

    // THEN check for existing session (never block loading UI)
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);

        if (session) {
          const onboardingComplete = localStorage.getItem(ONBOARDING_KEY);
          if (!onboardingComplete) setShowOnboarding(true);

          // Fire and forget
          void initNotifications(session.user);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    // After successful auth, check if needs onboarding
    const onboardingComplete = localStorage.getItem(ONBOARDING_KEY);
    if (!onboardingComplete) {
      setShowOnboarding(true);
    }
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShowOnboarding(false);
  };

  // Handle notification clicks
  const handleOpenChat = useCallback((userId: string) => {
    setActiveTab("guadagna");
    toast({
      title: "Apertura chat... 💬",
      description: "Vai alla sezione Guadagna per vedere la chat",
    });
  }, [toast]);

  const handleOpenTask = useCallback((taskId: string) => {
    setActiveTab("miei-lift");
    toast({
      title: "Apertura task... 📋",
      description: "Visualizzazione dettagli task",
    });
  }, [toast]);

  const handleNavigateToMieiLift = useCallback(() => {
    setActiveTab("miei-lift");
  }, []);

  const renderActiveTab = () => {
    switch (activeTab) {
      case "guadagna":
        return <GuadagnaTab />;
      case "pubblica":
        return <PubblicaTab onNavigateToMieiLift={handleNavigateToMieiLift} />;
      case "miei-lift":
        return <MieiLiftTab onOpenChat={handleOpenChat} />;
      case "profilo":
        return <ProfiloTab />;
      default:
        return <GuadagnaTab />;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl animate-bounce-soft block mb-4">🚀</span>
          <h1 className="text-2xl font-bold">
            <span className="text-foreground">Lift</span>
            <span className="text-primary">ome</span>
          </h1>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show auth screen
  if (!session) {
    return (
      <>
        <title>Liftome - Accedi</title>
        <Auth onAuthSuccess={handleAuthSuccess} />
      </>
    );
  }

  // Authenticated but needs onboarding
  if (showOnboarding) {
    return (
      <>
        <title>Liftome - Benvenuto</title>
        <Onboarding onComplete={handleOnboardingComplete} />
      </>
    );
  }

  // Authenticated and onboarding complete
  return (
    <>
      <title>Liftome - Aiuto vicino in 10 minuti</title>

      <div className="min-h-screen bg-background">
        {/* Fixed Header */}
        <Header activeTab={activeTab} onOpenChat={handleOpenChat} onOpenTask={handleOpenTask} />

        {/* Main content with padding for header and nav */}
        <main className="pt-[70px] pb-[55px] h-screen overflow-hidden">
          {renderActiveTab()}
        </main>

        {/* Bottom navigation */}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Notification Permission Dialog - shows once after login */}
      <NotificationPermissionDialog />
    </>
  );
};

export default Index;
