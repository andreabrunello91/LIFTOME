import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

export type TabType = "guadagna" | "pubblica" | "miei-lift" | "profilo";

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string; icon: string; activeIcon: string; isSpecial?: boolean }[] = [
  { id: "guadagna",  label: "Guadagna",   icon: "💰", activeIcon: "💰" },
  { id: "pubblica",  label: "Pubblica",   icon: "+",  activeIcon: "+",  isSpecial: true },
  { id: "miei-lift", label: "I miei Lift",icon: "📋", activeIcon: "📋" },
  { id: "profilo",   label: "Profilo",    icon: "👤", activeIcon: "👤" },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 shadow-[0_-1px_0_rgba(0,0,0,0.05)]"
         style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', height: 'calc(60px + env(safe-area-inset-bottom, 0px))' }}>
      <div className="flex justify-around items-center h-[60px] max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          if (tab.isSpecial) {
            return (
              <button key={tab.id} onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 tap-scale border-none bg-transparent cursor-pointer">
                <div className="w-11 h-11 rounded-full bg-[#FF5A00] flex items-center justify-center shadow-[0_4px_12px_rgba(255,90,0,0.4)] -mt-4">
                  <Plus className="w-6 h-6 text-white" strokeWidth={3} />
                </div>
                <span className="text-[10px] font-bold text-[#FF5A00]">{tab.label}</span>
              </button>
            );
          }

          return (
            <button key={tab.id} onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all tap-scale border-none bg-transparent cursor-pointer">
              <span className={cn("text-xl transition-transform duration-200", isActive && "scale-110")}>
                {tab.icon}
              </span>
              <span className={cn("text-[10px] font-semibold transition-colors",
                isActive ? "text-[#FF5A00]" : "text-gray-400")}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-8 h-0.5 bg-[#FF5A00] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
