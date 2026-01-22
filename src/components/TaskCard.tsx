import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

export interface Task {
  id: string;
  title: string;
  emoji: string;
  description: string;
  price: number;
  distance: number;
  clientName: string;
  clientAvatar?: string;
  rating?: number;
  reviewCount?: number;
  status: "pending" | "accepted" | "in_progress" | "completed";
  type: "ora" | "programmato";
  scheduledAt?: string;
  // For map positioning
  lat?: number;
  lng?: number;
  // SOS urgent task
  isSos?: boolean;
  sosDeadline?: string;
}

interface TaskCardProps {
  task: Task;
  onAccept?: (taskId: string) => void;
  onClick?: () => void;
  variant?: "horizontal" | "vertical" | "list";
  showAcceptButton?: boolean;
}

export function TaskCard({
  task,
  onAccept,
  onClick,
  variant = "horizontal",
  showAcceptButton = true,
}: TaskCardProps) {
  // List variant for Guadagna tab - clickable card with photo, reviews, distance, description
  if (variant === "list") {
    return (
      <div 
        onClick={onClick}
        className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-4 transition-all duration-200 hover:shadow-elevated active:scale-[0.99] cursor-pointer"
      >
        {/* Profile Photo */}
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
            {task.clientAvatar ? (
              <img
                src={task.clientAvatar}
                alt={task.clientName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl">{task.emoji}</span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-foreground truncate">{task.clientName}</h3>
          </div>
          
          {/* Reviews */}
          <div className="flex items-center gap-1 mb-1">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-medium text-foreground">
              {task.rating?.toFixed(1) || "4.8"}
            </span>
            <span className="text-xs text-muted-foreground">
              ({task.reviewCount || 12} recensioni)
            </span>
            <span className="text-xs text-muted-foreground mx-1">•</span>
            <span className="text-xs font-medium text-primary">{task.distance}m</span>
          </div>
          
          {/* Description */}
          <p className="text-sm text-muted-foreground truncate">{task.description}</p>
        </div>

        {/* Price */}
        <div className="flex flex-col items-end">
          <span className="text-xl font-bold text-foreground">{task.price}€</span>
          <span className="text-[10px] text-muted-foreground">{task.title.split(" ")[0]}</span>
        </div>
      </div>
    );
  }

  if (variant === "horizontal") {
    return (
      <div className="bg-card rounded-2xl p-4 shadow-card flex items-center gap-4 transition-all duration-200 hover:shadow-elevated active:scale-[0.99]">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {task.clientAvatar ? (
              <img
                src={task.clientAvatar}
                alt={task.clientName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl">{task.emoji}</span>
            )}
          </div>
          <span className="absolute -bottom-1 -right-1 text-lg">{task.emoji}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-foreground truncate">{task.clientName}</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {task.distance}m
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate">{task.title}</p>
        </div>

        {/* Price & Button */}
        <div className="flex flex-col items-end gap-2">
          <span className="text-xl font-bold text-foreground">{task.price}€</span>
          {showAcceptButton && onAccept && (
            <Button
              variant="cta"
              size="sm"
              onClick={() => onAccept(task.id)}
              className="text-xs px-4"
            >
              Accetto ✓
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Vertical card variant
  return (
    <div className="bg-card rounded-2xl p-4 shadow-card transition-all duration-200 hover:shadow-elevated active:scale-[0.99]">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          {task.clientAvatar ? (
            <img
              src={task.clientAvatar}
              alt={task.clientName}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <span className="text-xl">{task.emoji}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{task.clientName}</h3>
          <span className="text-xs text-muted-foreground">{task.distance}m</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{task.description}</p>

      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-foreground">{task.price}€</span>
        {showAcceptButton && onAccept && (
          <Button variant="cta" size="sm" onClick={() => onAccept(task.id)}>
            Accetto ✓
          </Button>
        )}
      </div>
    </div>
  );
}

// Status badge component
export function TaskStatusBadge({ status }: { status: Task["status"] }) {
  const config = {
    pending: { label: "In attesa", color: "bg-muted text-muted-foreground" },
    accepted: { label: "Accettato", color: "bg-primary/10 text-primary" },
    in_progress: { label: "In arrivo", color: "bg-liftome-gold/20 text-liftome-gold" },
    completed: { label: "Completato", color: "bg-liftome-success/20 text-liftome-success" },
  };

  const { label, color } = config[status];

  return (
    <span className={cn("px-3 py-1 rounded-full text-xs font-medium", color)}>
      {label}
    </span>
  );
}
