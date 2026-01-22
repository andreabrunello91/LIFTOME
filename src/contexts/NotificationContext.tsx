import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "liftome_notifications_v1";

export interface AppNotification {
  id: string;
  type: "task_accepted" | "message" | "arriving" | "completed" | "tip" | "referral" | "new_task";
  title: string;
  message: string;
  time: string;
  read: boolean;
  data?: {
    taskId?: string;
    chatUserId?: string;
    userId?: string;
  };
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, "id" | "time" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  onNotificationClick: (notification: AppNotification) => void;
  setNotificationHandler: (handler: (notification: AppNotification) => void) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Persist notifications locally so the bell isn't always empty after refresh
const initialNotifications: AppNotification[] = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppNotification[]) : [];
  } catch {
    return [];
  }
})();

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);
  const [clickHandler, setClickHandler] = useState<((notification: AppNotification) => void) | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, 50)));
    } catch {
      // ignore
    }
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback((notification: Omit<AppNotification, "id" | "time" | "read">) => {
    const newNotification: AppNotification = {
      ...notification,
      id: `notif-${Date.now()}`,
      time: "Adesso",
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const onNotificationClick = useCallback((notification: AppNotification) => {
    markAsRead(notification.id);
    if (clickHandler) {
      clickHandler(notification);
    }
  }, [clickHandler, markAsRead]);

  const setNotificationHandler = useCallback((handler: (notification: AppNotification) => void) => {
    setClickHandler(() => handler);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        onNotificationClick,
        setNotificationHandler,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
