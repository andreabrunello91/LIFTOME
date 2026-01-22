import { useEffect } from "react";
import { useNotifications, AppNotification } from "@/contexts/NotificationContext";
import { notificationService } from "@/services/notificationService";

function mapType(type: string): AppNotification["type"] {
  switch (type) {
    case "new_message":
      return "message";
    case "task_accepted":
      return "task_accepted";
    case "lifter_arriving":
      return "arriving";
    case "task_completed":
      return "completed";
    case "tip_received":
      return "tip";
    case "referral_completed":
      return "referral";
    case "new_task_nearby":
      return "new_task";
    default:
      return "message";
  }
}

function pickData(raw: any): AppNotification["data"] {
  const d = raw?.data || raw?.additionalData || {};
  return {
    taskId: d.taskId || d.task_id,
    chatUserId: d.chatUserId || d.chat_user_id,
    userId: d.userId || d.user_id,
  };
}

export function NotificationBridge() {
  const { addNotification } = useNotifications();

  useEffect(() => {
    notificationService.setNotificationCallback((incoming: any) => {
      if (!incoming) return;

      addNotification({
        type: mapType(incoming.type),
        title: incoming.title || "Notifica",
        message: incoming.message || "",
        data: pickData(incoming),
      });
    });

    return () => {
      // best-effort cleanup
      notificationService.setNotificationCallback(() => {});
    };
  }, [addNotification]);

  return null;
}
