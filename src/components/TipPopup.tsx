import { useState } from "react";
import { X } from "lucide-react";

interface TipPopupProps {
  taskPrice: number;
  lifterName: string;
  onConfirm: (tipAmount: number) => void;
  onSkip: () => void;
}

export function TipPopup({ taskPrice, lifterName, onConfirm, onSkip }: TipPopupProps) {
  const [tipPercent, setTipPercent] = useState(10);
  
  const tipAmount = Math.round((taskPrice * tipPercent / 100) * 100) / 100;
  
  const getEmoji = () => {
    if (tipPercent <= 3) return "😐";
    if (tipPercent <= 8) return "🙂";
    return "😍";
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
        {/* Emoji */}
        <div className="text-8xl mb-6 animate-bounce">
          {getEmoji()}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-foreground text-center mb-2">
          Grazie per l'aiuto! ❤️
        </h1>

        {/* Subtitle */}
        <p className="text-muted-foreground text-center mb-8">
          Lascia una mancia a {lifterName}
          <br />
          <span className="text-sm">(100% al Lifter, massimo 15%)</span>
        </p>

        {/* Tip amount display */}
        <div className="bg-primary/10 rounded-2xl px-8 py-4 mb-8">
          <p className="text-4xl font-bold text-primary text-center">
            {tipAmount.toFixed(2)}€
          </p>
          <p className="text-sm text-muted-foreground text-center mt-1">
            su {taskPrice}€
          </p>
        </div>

        {/* Slider with emoji markers */}
        <div className="w-full max-w-sm mb-8">
          {/* Emoji markers */}
          <div className="flex justify-between px-2 mb-2">
            <span className="text-2xl">😐</span>
            <span className="text-2xl">🙂</span>
            <span className="text-2xl">😍</span>
          </div>
          
          {/* Slider */}
          <input
            type="range"
            min="0"
            max="15"
            value={tipPercent}
            onChange={(e) => setTipPercent(Number(e.target.value))}
            className="w-full h-3 bg-muted rounded-full appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg"
          />
          
          {/* Percentage markers */}
          <div className="flex justify-between px-1 mt-2">
            <span className="text-xs text-muted-foreground">0%</span>
            <span className="text-xs text-muted-foreground">5%</span>
            <span className="text-xs text-muted-foreground">10%</span>
            <span className="text-xs text-muted-foreground">15%</span>
          </div>
        </div>

        {/* Confirm button */}
        <button
          onClick={() => onConfirm(tipAmount)}
          className="w-full max-w-sm h-14 bg-primary text-primary-foreground rounded-2xl font-bold text-lg tap-scale mb-4"
        >
          {tipAmount > 0 ? `Conferma mancia ${tipAmount.toFixed(2)}€` : "Continua senza mancia"}
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
