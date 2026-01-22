import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    emoji: "🏃",
    title: "Serve una mano?",
    description: "Trova qualcuno vicino a te pronto ad aiutarti subito. Spesa, cane, fila... tutto risolto in 10 minuti!",
    color: "from-primary/20 to-primary/5",
  },
  {
    emoji: "🔒",
    title: "Sicuro al 100%",
    description: "Verifica KYC dell'identità, pagamenti in escrow protetti e recensioni verificate. Sicurezza garantita.",
    color: "from-liftome-success/20 to-liftome-success/5",
  },
  {
    emoji: "💰",
    title: "Guadagna facile",
    description: "Diventa un Lifter! Accetta task vicini nel tuo tempo libero e guadagna in modo semplice e veloce.",
    color: "from-liftome-gold/20 to-liftome-gold/5",
  },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold && currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(currentSlide + 1);
    } else if (info.offset.x > threshold && currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(currentSlide - 1);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Skip button */}
      <div className="flex justify-end p-4 safe-top">
        <button
          onClick={handleSkip}
          className="text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
        >
          Salta
        </button>
      </div>

      {/* Slides */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="text-center w-full max-w-sm cursor-grab active:cursor-grabbing"
          >
            {/* Emoji with gradient background */}
            <div className={`mx-auto w-40 h-40 rounded-full bg-gradient-to-br ${slides[currentSlide].color} flex items-center justify-center mb-8 shadow-soft`}>
              <span className="text-7xl animate-bounce-soft">{slides[currentSlide].emoji}</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-foreground mb-4">
              {slides[currentSlide].title}
            </h1>

            {/* Description */}
            <p className="text-muted-foreground text-lg leading-relaxed">
              {slides[currentSlide].description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Swipe hint */}
        <p className="text-xs text-muted-foreground/60 mt-6">
          Scorri per continuare →
        </p>
      </div>

      {/* Dots and Button */}
      <div className="p-8 safe-bottom space-y-6">
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "w-8 bg-primary"
                  : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {/* CTA Button */}
        <Button
          onClick={handleNext}
          variant="cta"
          size="xl"
          className="w-full"
        >
          {currentSlide === slides.length - 1 ? "Inizia ora 🚀" : "Continua"}
        </Button>
      </div>
    </div>
  );
}
