import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Bell } from "lucide-react";
import { useState } from "react";
import { useNotifications, AppNotification } from "@/contexts/NotificationContext";

const getNotificationIcon = (type: AppNotification["type"]) => {
  switch (type) {
    case "task_accepted": return "✅";
    case "message": return "💬";
    case "arriving": return "🚶";
    case "completed": return "✨";
    case "tip": return "🎉";
    case "referral": return "🎁";
    case "new_task": return "📍";
    default: return "🔔";
  }
};

interface NotificationsPanelProps {
  onOpenChat?: (userId: string) => void;
  onOpenTask?: (taskId: string) => void;
}

export function NotificationsPanel({ onOpenChat, onOpenTask }: NotificationsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, onNotificationClick } = useNotifications();

  const handleNotificationClick = (notification: AppNotification) => {
    markAsRead(notification.id);
    
    // Handle navigation based on notification type
    if (notification.type === "message" && notification.data?.chatUserId && onOpenChat) {
      onOpenChat(notification.data.chatUserId);
      setIsOpen(false);
    } else if (notification.data?.taskId && onOpenTask) {
      onOpenTask(notification.data.taskId);
      setIsOpen(false);
    }
    
    onNotificationClick(notification);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className="relative p-2 tap-scale">
          <Bell className="w-6 h-6 text-white" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[340px] sm:w-[400px] p-0 bg-background">
        <SheetHeader className="p-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifiche
            </SheetTitle>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-sm text-primary font-medium tap-scale hover:underline"
              >
                Segna tutte lette
              </button>
            )}
          </div>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {unreadCount} {unreadCount === 1 ? "notifica non letta" : "notifiche non lette"}
            </p>
          )}
        </SheetHeader>
        
        <div className="overflow-y-auto h-[calc(100vh-120px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <span className="text-5xl mb-4">🔔</span>
              <p className="font-medium">Nessuna notifica</p>
              <p className="text-sm">Le tue notifiche appariranno qui</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full p-4 text-left tap-scale transition-all duration-200 hover:bg-accent/50 ${
                    !notification.read ? "bg-primary/5 border-l-4 border-l-primary" : "bg-background"
                  }`}
                >
                  <div className="flex gap-3">
                    <span className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`font-semibold ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0 mt-1.5 animate-pulse" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-2">
                        {notification.time}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
