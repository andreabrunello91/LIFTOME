import { useState } from "react";
import { Star, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewPopupProps {
  lifterName: string;
  lifterAvatar?: string;
  onSubmit: (rating: number, comment: string) => void;
  onSkip: () => void;
}

export function ReviewPopup({ lifterName, lifterAvatar, onSubmit, onSkip }: ReviewPopupProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const displayRating = hoveredRating ?? rating;

  const getRatingText = () => {
    switch (displayRating) {
      case 1: return "Pessimo 😞";
      case 2: return "Scarso 😕";
      case 3: return "Nella media 😐";
      case 4: return "Buono 🙂";
      case 5: return "Eccellente! 🌟";
      default: return "";
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-[100] flex flex-col">
      {/* Skip button */}
      <button
        onClick={onSkip}
        className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary mb-6">
          {lifterAvatar ? (
            <img src={lifterAvatar} alt={lifterName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-4xl">
              👤
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground text-center mb-2">
          Valuta {lifterName}
        </h1>

        {/* Rating text */}
        <p className="text-lg text-muted-foreground mb-6">
          {getRatingText()}
        </p>

        {/* Stars */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(null)}
              className="tap-scale"
            >
              <Star
                className={cn(
                  "w-12 h-12 transition-all duration-200",
                  star <= displayRating
                    ? "fill-yellow-400 text-yellow-400 scale-110"
                    : "text-muted-foreground/30"
                )}
              />
            </button>
          ))}
        </div>

        {/* Comment input */}
        <div className="w-full max-w-sm mb-8">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Lascia un commento (opzionale)..."
            className="w-full h-24 bg-muted rounded-xl p-4 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Submit button */}
        <button
          onClick={() => onSubmit(rating, comment)}
          className="w-full max-w-sm h-14 bg-primary text-primary-foreground rounded-2xl font-bold text-lg tap-scale mb-4"
        >
          Invia recensione ⭐
        </button>

        {/* Skip link */}
        <button
          onClick={onSkip}
          className="text-muted-foreground text-sm hover:text-foreground transition-colors"
        >
          Salta
        </button>
      </div>
    </div>
  );
}
