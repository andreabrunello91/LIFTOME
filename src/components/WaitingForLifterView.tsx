import { motion } from "framer-motion";
import { Clock, Sparkles, Search, MapPin, Edit2, Trash2 } from "lucide-react";

interface WaitingForLifterViewProps {
  taskTitle: string;
  taskCategory: string;
  taskPrice: number;
  taskDescription?: string;
  categoryEmoji: string;
  onEdit: () => void;
  onCancel: () => void;
}

export function WaitingForLifterView({
  taskTitle,
  taskCategory,
  taskPrice,
  taskDescription,
  categoryEmoji,
  onEdit,
  onCancel
}: WaitingForLifterViewProps) {
  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col" style={{ top: '70px', bottom: '60px' }}>
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating orbs */}
        <motion.div
          className="absolute w-72 h-72 rounded-full bg-primary/10 blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ top: '10%', left: '-10%' }}
        />
        <motion.div
          className="absolute w-64 h-64 rounded-full bg-primary/5 blur-3xl"
          animate={{
            x: [0, -40, 0],
            y: [0, 40, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ bottom: '20%', right: '-5%' }}
        />
        <motion.div
          className="absolute w-48 h-48 rounded-full bg-green-500/10 blur-3xl"
          animate={{
            x: [0, 30, 0],
            y: [0, 50, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        />
      </div>

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Animated search icon */}
        <motion.div
          className="relative mb-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Outer ring pulse */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/30"
            animate={{
              scale: [1, 1.5, 1.5],
              opacity: [0.5, 0, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
            }}
            style={{ width: 120, height: 120, top: -10, left: -10 }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/20"
            animate={{
              scale: [1, 1.8, 1.8],
              opacity: [0.3, 0, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.5,
            }}
            style={{ width: 120, height: 120, top: -10, left: -10 }}
          />
          
          {/* Main icon container */}
          <motion.div
            className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/30"
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Search className="w-12 h-12 text-primary-foreground" />
            </motion.div>
          </motion.div>

          {/* Floating sparkles */}
          <motion.div
            className="absolute -top-2 -right-2"
            animate={{
              y: [0, -5, 0],
              rotate: [0, 15, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Sparkles className="w-6 h-6 text-yellow-400" />
          </motion.div>
          <motion.div
            className="absolute -bottom-1 -left-3"
            animate={{
              y: [0, 5, 0],
              rotate: [0, -10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3,
            }}
          >
            <Sparkles className="w-5 h-5 text-primary/60" />
          </motion.div>
        </motion.div>

        {/* Text content */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-3 mb-8"
        >
          <h1 className="text-2xl font-bold text-foreground">
            Stiamo cercando un Lifter
          </h1>
          <p className="text-muted-foreground max-w-xs mx-auto">
            La tua richiesta è stata pubblicata. Riceverai una notifica quando un Lifter si candida!
          </p>
        </motion.div>

        {/* Task card preview */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="glass-card rounded-2xl p-5 border border-border/50">
            <div className="flex items-start gap-4">
              <motion.span 
                className="text-4xl"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {categoryEmoji}
              </motion.span>
              <div className="flex-1 text-left">
                <h3 className="font-bold text-foreground text-lg">{taskTitle}</h3>
                {taskDescription && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {taskDescription}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{taskPrice}€</p>
              </div>
            </div>

            {/* Status indicator */}
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-center gap-2">
                <motion.div
                  className="w-2 h-2 rounded-full bg-yellow-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="text-sm text-muted-foreground font-medium">
                  In attesa di proposte...
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Animated dots */}
        <motion.div
          className="flex items-center gap-2 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-primary/40"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.div>

        {/* Timer indicator */}
        <motion.div
          className="flex items-center gap-2 mt-4 text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Clock className="w-4 h-4" />
          <span className="text-sm">Di solito i Lifter rispondono in pochi minuti</span>
        </motion.div>
      </div>

      {/* Bottom action buttons */}
      <motion.div
        className="relative px-6 pb-6 pt-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <div className="flex gap-3">
          <button
            onClick={onEdit}
            className="flex-1 h-14 bg-muted hover:bg-muted/80 text-foreground rounded-2xl font-semibold flex items-center justify-center gap-2 tap-scale transition-colors"
          >
            <Edit2 className="w-5 h-5" />
            Modifica
          </button>
          <button
            onClick={onCancel}
            className="flex-1 h-14 bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-2xl font-semibold flex items-center justify-center gap-2 tap-scale transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            Annulla
          </button>
        </div>
      </motion.div>
    </div>
  );
}
