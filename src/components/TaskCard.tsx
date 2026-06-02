import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, MessageCircle, Trash2, Edit2, MapPin, Clock, Users, CheckCircle, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface TaskApplication {
  id: string;
  lifter_id: string;
  lifter_profile?: {
    full_name: string;
    avatar_url?: string;
    rating?: number;
  };
}

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description?: string;
    category: string;
    status: string;
    published_price: number;
    location_address?: string;
    scheduled_at?: string;
    is_sos?: boolean;
    is_scheduled?: boolean;
  };
  applications: TaskApplication[];
  categoryEmoji: string;
  onOpenProposals?: () => void;
  onOpenDetails?: () => void;
  onOpenChat?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewActive?: () => void;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string; dot: string; bg: string; border: string; text: string;
}> = {
  in_attesa:  { label: "In attesa",   dot: "bg-amber-400",  bg: "bg-amber-50",  border: "border-amber-200", text: "text-amber-700"  },
  accettato:  { label: "In arrivo",   dot: "bg-blue-500",   bg: "bg-blue-50",   border: "border-blue-200",  text: "text-blue-700"   },
  in_arrivo:  { label: "In arrivo",   dot: "bg-blue-500",   bg: "bg-blue-50",   border: "border-blue-200",  text: "text-blue-700"   },
  in_corso:   { label: "In corso",    dot: "bg-green-500",  bg: "bg-green-50",  border: "border-green-200", text: "text-green-700"  },
  completato: { label: "Completato",  dot: "bg-gray-400",   bg: "bg-gray-50",   border: "border-gray-200",  text: "text-gray-600"   },
  annullato:  { label: "Annullato",   dot: "bg-red-400",    bg: "bg-red-50",    border: "border-red-200",   text: "text-red-600"    },
};

function StatusBadge({ status, hasApps }: { status: string; hasApps?: boolean }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.in_attesa;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border", cfg.bg, cfg.border, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot, status === 'accettato' && "animate-pulse")} />
      {hasApps && status === 'in_attesa' ? `${status === 'in_attesa' ? 'Proposte!' : cfg.label}` : cfg.label}
    </span>
  );
}

function AvatarStack({ apps }: { apps: TaskApplication[] }) {
  const colors = ["bg-violet-500","bg-emerald-500","bg-rose-500","bg-amber-500","bg-sky-500"];
  const shown = apps.slice(0, 3);
  return (
    <div className="flex items-center">
      {shown.map((app, i) => (
        <div key={app.id}
          className={cn("w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0", colors[i % colors.length])}
          style={{ marginLeft: i > 0 ? -8 : 0 }}>
          {app.lifter_profile?.full_name?.[0] ?? "?"}
        </div>
      ))}
      {apps.length > 3 && (
        <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-600 flex-shrink-0" style={{ marginLeft: -8 }}>
          +{apps.length - 3}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TaskCard({
  task, applications, categoryEmoji,
  onOpenProposals, onOpenDetails, onOpenChat,
  onEdit, onDelete, onViewActive,
}: TaskCardProps) {
  const isActive   = ['accettato','in_arrivo','in_corso'].includes(task.status);
  const isWaiting  = task.status === 'in_attesa';
  const isDone     = task.status === 'completato';
  const hasApps    = applications.length > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "rounded-[22px] border overflow-hidden",
        isActive   ? "border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-[0_2px_16px_rgba(59,130,246,0.12)]" :
        hasApps    ? "border-orange-200 bg-gradient-to-br from-orange-50 to-white shadow-[0_2px_16px_rgba(255,90,0,0.1)]" :
        isDone     ? "border-gray-100 bg-white opacity-75" :
        "border-gray-100 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.06)]"
      )}
    >
      {/* SOS Banner */}
      {task.is_sos && (
        <div className="bg-red-500 px-4 py-1.5 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-white" />
          <span className="text-white text-[11px] font-black uppercase tracking-wider">Urgente</span>
        </div>
      )}

      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start gap-3 mb-3">
          <div className={cn(
            "w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl flex-shrink-0",
            isActive ? "bg-blue-100" : hasApps ? "bg-orange-100" : "bg-gray-100"
          )}>
            {categoryEmoji}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-black text-[15px] text-gray-900 tracking-tight leading-tight line-clamp-1">{task.title}</h3>
              <span className="font-black text-[17px] text-[#FF5A00] flex-shrink-0">{task.published_price}€</span>
            </div>
            {task.description && (
              <p className="text-[12px] text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusBadge status={task.status} hasApps={hasApps} />
              {task.location_address && (
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">{task.location_address}</span>
                </span>
              )}
              {task.scheduled_at && (
                <span className="flex items-center gap-1 text-[11px] text-[#FF5A00] font-semibold">
                  <Clock className="w-3 h-3" />
                  {new Date(task.scheduled_at).toLocaleDateString('it', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Applications row */}
        <AnimatePresence>
          {hasApps && isWaiting && (
            <motion.button
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onClick={onOpenProposals}
              className="w-full mb-3 p-3 bg-[#FF5A00] rounded-[14px] flex items-center justify-between active:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-3">
                <AvatarStack apps={applications} />
                <div className="text-left">
                  <div className="text-white font-black text-[14px]">
                    {applications.length} {applications.length === 1 ? 'Lifter' : 'Lifter'} disponibil{applications.length === 1 ? 'e' : 'i'}!
                  </div>
                  <div className="text-white/70 text-[11px]">Tocca per scegliere</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Active task CTA */}
        {isActive && (
          <button
            onClick={onViewActive}
            className="w-full mb-3 p-3 bg-blue-500 rounded-[14px] flex items-center justify-between active:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white font-black text-[14px]">Traccia il tuo Lifter</span>
            </div>
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        )}

        {/* Completed */}
        {isDone && (
          <div className="flex items-center gap-2 mb-3 p-2.5 bg-green-50 rounded-[12px] border border-green-100">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-[12px] font-semibold text-green-700">Completato con successo</span>
          </div>
        )}

        {/* Action buttons */}
        {!isDone && (
          <div className="flex gap-2">
            {isActive && (
              <button
                onClick={onOpenChat}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 rounded-[12px] text-[13px] font-semibold text-gray-700 active:bg-gray-200"
              >
                <MessageCircle className="w-4 h-4" />
                Chat
              </button>
            )}
            {isWaiting && (
              <>
                <button
                  onClick={onEdit}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gray-100 rounded-[12px] text-[13px] font-semibold text-gray-700 active:bg-gray-200"
                >
                  <Edit2 className="w-4 h-4" />
                  Modifica
                </button>
                <button
                  onClick={onDelete}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-50 rounded-[12px] text-[13px] font-semibold text-red-500 active:bg-red-100"
                >
                  <Trash2 className="w-4 h-4" />
                  Elimina
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
