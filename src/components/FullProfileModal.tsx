import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Task } from "@/components/TaskCard";
import { Star, MapPin, Clock, Shield, CheckCircle, MessageCircle, X, Calendar, Award } from "lucide-react";

interface FullProfileModalProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onOpenChat: () => void;
  onApply?: (taskId: string) => void;
  isAccepted?: boolean;
}

export function FullProfileModal({ task, open, onClose, onOpenChat, onApply, isAccepted = false }: FullProfileModalProps) {
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto p-0 rounded-3xl overflow-hidden bg-card border-0 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center z-10"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Profile Header */}
        <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent pt-8 pb-16">
          <div className="flex flex-col items-center">
            {/* Large Profile Photo */}
            <div className="w-28 h-28 rounded-full bg-muted border-4 border-card shadow-xl overflow-hidden">
              {task.clientAvatar ? (
                <img src={task.clientAvatar} alt={task.clientName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-primary/20 to-primary/5">
                  {task.emoji}
                </div>
              )}
            </div>
            
            {/* Name and verification */}
            <h2 className="text-2xl font-bold text-foreground mt-4">{task.clientName}</h2>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 px-2.5 py-1 rounded-full">
                <Shield className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">Verificato</span>
              </div>
              <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-2.5 py-1 rounded-full">
                <Award className="w-4 h-4 text-yellow-600" />
                <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Top Cliente</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="-mt-8 mx-4">
          <div className="bg-card rounded-2xl shadow-lg p-4 flex justify-around">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="text-xl font-bold text-foreground">{task.rating?.toFixed(1) || "4.8"}</span>
              </div>
              <span className="text-xs text-muted-foreground">Rating</span>
            </div>
            <div className="w-px bg-border" />
            <div className="text-center">
              <span className="text-xl font-bold text-foreground">{task.reviewCount || 23}</span>
              <p className="text-xs text-muted-foreground">Recensioni</p>
            </div>
            <div className="w-px bg-border" />
            <div className="text-center">
              <span className="text-xl font-bold text-foreground">47</span>
              <p className="text-xs text-muted-foreground">Task</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Task Details */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="text-lg">{task.emoji}</span>
              Dettagli Task
            </h3>
            <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-lg text-foreground">{task.title}</span>
                <span className="text-2xl font-bold text-primary">{task.price}€</span>
              </div>
              
              <p className="text-muted-foreground text-sm leading-relaxed">
                {task.description}
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-1.5 text-sm">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">{task.distance}m</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-foreground">
                    {task.type === "ora" ? "Immediato" : task.scheduledAt}
                  </span>
                </div>
                {task.scheduledAt && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-foreground">{task.scheduledAt}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Reviews */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">Ultime recensioni</h4>
            <div className="space-y-3">
              <ReviewCard 
                name="Marco P."
                rating={5}
                text="Persona molto gentile e puntuale. Ha comunicato bene durante tutto il processo. Consigliatissimo!"
                date="2 giorni fa"
                avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=Marco"
              />
              <ReviewCard 
                name="Giulia M."
                rating={5}
                text="Ottimo! Tutto perfetto, tornerò sicuramente a richiedere aiuto."
                date="1 settimana fa"
                avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=Giulia"
              />
              <ReviewCard 
                name="Alessandro R."
                rating={4}
                text="Buona esperienza, task completato correttamente."
                date="2 settimane fa"
                avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=Alessandro"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {isAccepted ? (
              <Button
                variant="cta"
                className="flex-1 rounded-xl h-12 text-base font-semibold"
                onClick={onOpenChat}
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Apri Chat
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl h-12"
                  onClick={onOpenChat}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Messaggio
                </Button>
                <Button
                  variant="cta"
                  className="flex-1 rounded-xl h-12 text-base font-semibold"
                  onClick={() => onApply?.(task.id)}
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Candidati
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewCard({ name, rating, text, date, avatar }: { 
  name: string; 
  rating: number; 
  text: string; 
  date: string;
  avatar: string;
}) {
  return (
    <div className="bg-muted/30 rounded-xl p-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex-shrink-0">
          <img src={avatar} alt={name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm text-foreground">{name}</span>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-3 h-3 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`} 
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
          <span className="text-[10px] text-muted-foreground/60 mt-1 block">{date}</span>
        </div>
      </div>
    </div>
  );
}
