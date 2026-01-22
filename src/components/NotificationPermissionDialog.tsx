import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Bell } from "lucide-react";
import { notificationService } from "@/services/notificationService";

export function NotificationPermissionDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if we've already asked
    const hasAsked = localStorage.getItem('liftome_notification_asked');
    
    if (!hasAsked && 'Notification' in window) {
      // Delay showing the dialog to not overwhelm user
      const timer = setTimeout(() => {
        if (Notification.permission === 'default') {
          setOpen(true);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleAllow = () => {
    // Close dialog immediately - don't block UI
    localStorage.setItem('liftome_notification_asked', 'true');
    setOpen(false);
    
    // Request permission in background (non-blocking)
    // Must be triggered by user gesture, so we call it here but don't await
    notificationService.requestPermission().catch((error) => {
      console.error('Error requesting notification permission:', error);
    });
  };

  const handleDismiss = () => {
    localStorage.setItem('liftome_notification_asked', 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm mx-auto rounded-3xl p-0 overflow-hidden border-0">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/20 mx-auto flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-primary" />
          </div>
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold text-foreground">
              🔔 Attiva le notifiche
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Ricevi avvisi per task vicini, messaggi e aggiornamenti importanti
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Benefits list */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <NotificationBenefit 
              emoji="📍" 
              text="Task vicini a te in tempo reale" 
            />
            <NotificationBenefit 
              emoji="💬" 
              text="Messaggi dai clienti e lifter" 
            />
            <NotificationBenefit 
              emoji="✅" 
              text="Aggiornamenti sulle tue attività" 
            />
            <NotificationBenefit 
              emoji="💰" 
              text="Mance e bonus ricevuti" 
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={handleAllow}
              variant="cta"
              className="w-full h-12 rounded-xl text-base font-semibold"
            >
              Attiva notifiche ✓
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              className="w-full text-muted-foreground"
            >
              Non ora
            </Button>
          </div>

          <p className="text-[11px] text-center text-muted-foreground/60">
            Puoi disattivarle in qualsiasi momento dalle impostazioni
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NotificationBenefit({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-lg">{emoji}</span>
      <span className="text-sm text-foreground">{text}</span>
    </div>
  );
}
