import { NotificationsPanel } from "./NotificationsPanel";

type TabType = "guadagna" | "pubblica" | "miei-lift" | "profilo";

interface HeaderProps {
  activeTab?: TabType;
  onOpenChat?: (userId: string) => void;
  onOpenTask?: (taskId: string) => void;
}

const TAB_TITLES: Record<TabType, string> = {
  "guadagna": "",
  "pubblica": "Pubblica",
  "miei-lift": "I miei Lift",
  "profilo": "Profilo",
};

export function Header({ activeTab = "guadagna", onOpenChat, onOpenTask }: HeaderProps) {
  const showLiftome = activeTab === "guadagna";
  const tabTitle = TAB_TITLES[activeTab];

  return (
    <header className="fixed top-0 left-0 right-0 h-[70px] bg-black z-50 flex items-center justify-between px-5">
      {showLiftome ? (
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-white">Lift</span>
          <span className="text-primary">ome</span>
        </h1>
      ) : (
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {tabTitle}
        </h1>
      )}
      <NotificationsPanel onOpenChat={onOpenChat} onOpenTask={onOpenTask} />
    </header>
  );
}
