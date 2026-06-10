import { motion } from "framer-motion";
import { ChevronRight, MessageCircle, MapPin, Clock, Users, Edit2, Trash2, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActiveTaskCardProps {
  task: {
    id: string;
    title: string;
    description?: string;
    category: string;
    status: string;
    published_price: number;
    location_address?: string;
    is_sos?: boolean;
  };
  categoryEmoji: string;
  applicationsCount: number;
  onViewProposals?: () => void;
  onTrackLifter?: () => void;
  onOpenChat?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  in_attesa:  { label: "In attesa",  color: "#BA7517", bg: "#FAEEDA", dot: "#BA7517" },
  accettato:  { label: "In arrivo",  color: "#185FA5", bg: "#E6F1FB", dot: "#378ADD" },
  in_arrivo:  { label: "In arrivo",  color: "#185FA5", bg: "#E6F1FB", dot: "#378ADD" },
  in_corso:   { label: "In corso",   color: "#0F6E56", bg: "#E1F5EE", dot: "#1D9E75" },
  completato: { label: "Completato", color: "#5F5E5A", bg: "#F1EFE8", dot: "#888780" },
};

export function ActiveTaskCard({
  task, categoryEmoji, applicationsCount,
  onViewProposals, onTrackLifter, onOpenChat, onEdit, onCancel
}: ActiveTaskCardProps) {
  const st = STATUS_MAP[task.status] ?? STATUS_MAP.in_attesa;
  const hasApps = applicationsCount > 0;
  const isActive = task.status === 'accettato' || task.status === 'in_arrivo';
  const isWaiting = task.status === 'in_attesa';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-[22px] border overflow-hidden mx-4 mb-3",
        isActive ? "border-blue-200" : hasApps ? "border-orange-200" : "border-gray-100"
      )}
      style={{
        background: isActive
          ? "linear-gradient(135deg, #F0F6FF 0%, #ffffff 100%)"
          : hasApps
          ? "linear-gradient(135deg, #FFF9F6 0%, #ffffff 100%)"
          : "white",
        boxShadow: isActive
          ? "0 4px 20px rgba(56,139,221,0.12)"
          : hasApps
          ? "0 4px 20px rgba(255,90,0,0.10)"
          : "0 2px 8px rgba(0,0,0,0.05)"
      }}
    >
      {/* SOS badge */}
      {task.is_sos && (
        <div className="bg-red-500 px-4 py-1.5 flex items-center gap-2">
          <span className="text-white text-[11px] font-black uppercase tracking-wider">⚡ Urgente</span>
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={cn(
            "w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl flex-shrink-0",
            isActive ? "bg-blue-50" : hasApps ? "bg-orange-50" : "bg-gray-50"
          )}>
            {categoryEmoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-black text-[15px] text-gray-900 tracking-tight leading-tight">{task.title}</h3>
              <span className="font-black text-[17px] text-[#FF5A00] flex-shrink-0">{task.published_price}€</span>
            </div>
            {task.description && (
              <p className="text-[12px] text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
                style={{ background: st.bg, color: st.color, borderColor: st.dot + '40' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: st.dot }} />
                {st.label}
              </span>
              {task.location_address && (
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[140px]">{task.location_address}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* CTA based on status */}
        {isWaiting && hasApps && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onViewProposals}
            className="w-full mb-3 p-3.5 bg-[#FF5A00] rounded-[14px] flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {Array.from({ length: Math.min(applicationsCount, 3) }).map((_, i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-[#FF5A00] bg-orange-200 flex items-center justify-center text-[9px] font-bold text-orange-800">
                    {['AL','CM','RF'][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="text-white font-black text-[14px]">
                  {applicationsCount} Lifter disponibil{applicationsCount === 1 ? 'e' : 'i'}!
                </div>
                <div className="text-white/70 text-[11px]">Tocca per scegliere</div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white" />
          </motion.button>
        )}

        {isWaiting && !hasApps && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-100 rounded-[14px] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="text-[13px] font-bold text-amber-800">In cerca di Lifter...</div>
              <div className="text-[11px] text-amber-600">Riceverai una notifica appena qualcuno si candida</div>
            </div>
          </div>
        )}

        {isActive && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onTrackLifter}
            className="w-full mb-3 p-3.5 bg-blue-500 rounded-[14px] flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <div>
                <div className="text-white font-black text-[14px]">Traccia il tuo Lifter</div>
                <div className="text-white/70 text-[11px]">Vedi posizione in tempo reale</div>
              </div>
            </div>
            <Navigation className="w-5 h-5 text-white" />
          </motion.button>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {isActive && (
            <button onClick={onOpenChat}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 rounded-[12px] text-[13px] font-semibold text-gray-700 active:bg-gray-200">
              <MessageCircle className="w-4 h-4" />
              Chat
            </button>
          )}
          {isWaiting && (
            <>
              <button onClick={onEdit}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gray-100 rounded-[12px] text-[13px] font-semibold text-gray-700 active:bg-gray-200">
                <Edit2 className="w-4 h-4" />
                Modifica
              </button>
              <button onClick={onCancel}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-50 rounded-[12px] text-[13px] font-semibold text-red-500 active:bg-red-100">
                <Trash2 className="w-4 h-4" />
                Annulla
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
