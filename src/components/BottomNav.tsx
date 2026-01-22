import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

export type TabType = "guadagna" | "pubblica" | "miei-lift" | "profilo";

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string; icon: string; isSpecial?: boolean }[] = [
  { id: "guadagna", label: "Guadagna", icon: "💰" },
  { id: "pubblica", label: "Pubblica", icon: "+", isSpecial: true },
  { id: "miei-lift", label: "I miei Lift", icon: "📋" },
  { id: "profilo", label: "Profilo", icon: "👤" },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[55px] bg-primary/80 backdrop-blur-md safe-bottom z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
      <div className="flex justify-around items-center h-full max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          // Special styling for Pubblica tab
          if (tab.isSpecial) {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 tap-scale"
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md -mt-3">
                  <Plus className="w-6 h-6 text-primary" strokeWidth={3} />
                </div>
                <span className="text-[9px] font-semibold text-white">
                  {tab.label}
                </span>
              </button>
            );
          }
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 tap-scale",
                isActive ? "text-white" : "text-gray-800/70"
              )}
            >
              <span
                className={cn(
                  "text-lg transition-transform duration-200",
                  isActive && "scale-110"
                )}
              >
                {tab.icon}
              </span>
              <span
                className={cn(
                  "text-[9px] font-medium transition-all duration-200",
                  isActive ? "text-white font-semibold" : "text-gray-800/70"
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
