import { useState, useEffect, useRef, useCallback } from "react";
import { Send, ChevronLeft, CheckCheck, Mic, MicOff, Phone, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
}

interface Task {
  id: string;
  title: string;
  emoji: string;
  price: number;
  clientName: string;
  clientAvatar?: string;
  status?: string;
  category?: string;
}

interface ChatViewProps {
  task: Task;
  currentUserId: string;
  taskId: string;
  onBack: () => void;
}

const QUICK_REPLIES = [
  "Ok, arrivo subito! 👍",
  "Suona al citofono",
  "Grazie mille! 😊",
  "Lascia fuori dalla porta",
  "Ci vediamo tra 5 min",
];

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  accepted:    { bg: "bg-orange-50",  border: "border-orange-200", text: "text-orange-800", dot: "bg-orange-500" },
  in_progress: { bg: "bg-blue-50",    border: "border-blue-200",   text: "text-blue-800",   dot: "bg-blue-500"   },
  completed:   { bg: "bg-green-50",   border: "border-green-200",  text: "text-green-800",  dot: "bg-green-500"  },
  default:     { bg: "bg-gray-50",    border: "border-gray-200",   text: "text-gray-800",   dot: "bg-gray-400"   },
};

const STATUS_LABELS: Record<string, string> = {
  accepted: "Accettata",
  in_progress: "In corso",
  completed: "Completata",
  pending: "In attesa",
};

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function AvatarBubble({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const colors = ["bg-violet-500","bg-emerald-500","bg-rose-500","bg-amber-500","bg-sky-500","bg-indigo-500"];
  const idx = name.charCodeAt(0) % colors.length;
  const sz = size === "sm" ? "w-7 h-7 text-[10px]" : "w-9 h-9 text-[12px]";
  return (
    <div className={cn("rounded-full flex items-center justify-center font-bold text-white flex-shrink-0", colors[idx], sz)}>
      {getInitials(name)}
    </div>
  );
}

export function ChatView({ task, currentUserId, taskId, onBack }: ChatViewProps) {
  const [messages, setMessages]       = useState<Message[]>([]);
  const [newMessage, setNewMessage]   = useState("");
  const [isTyping, setIsTyping]       = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showQR, setShowQR]           = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const statusStyle = STATUS_COLORS[task.status ?? "default"] ?? STATUS_COLORS.default;

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const fetchMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      if (!error) setMessages(data || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  }, [taskId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${taskId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `task_id=eq.${taskId}` },
        payload => {
          const newMsg = payload.new as Message;
          setMessages(prev => prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
          if (newMsg.sender_id !== currentUserId) {
            setIsTyping(false);
            setShowQR(true);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [taskId, currentUserId]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  async function sendMessage(text?: string) {
    const content = (text ?? newMessage).trim();
    if (!content || !currentUserId) return;
    setNewMessage("");
    setShowQR(false);
    try {
      await supabase.from("messages").insert({ task_id: taskId, sender_id: currentUserId, content, is_read: false });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#F7F6F2]">

      {/* ── Header ── */}
      <div className="bg-white px-3 pt-3 pb-3 border-b border-gray-100 flex items-center gap-2.5 shadow-sm">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <AvatarBubble name={task.clientName} size="md" />
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-[15px] text-gray-900 tracking-tight truncate">{task.clientName}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            <span className="text-[12px] font-semibold text-green-600">Online</span>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <Phone className="w-4 h-4 text-gray-600" />
          </button>
          <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* ── Mission strip ── */}
      <div className={cn("flex items-center justify-between px-3.5 py-2.5 border-b", statusStyle.bg, statusStyle.border)}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{task.emoji}</span>
          <div>
            <div className={cn("text-[13px] font-black truncate max-w-[180px]", statusStyle.text)}>{task.title}</div>
            <div className={cn("text-[11px] font-medium", statusStyle.text, "opacity-70")}>€ {task.price}</div>
          </div>
        </div>
        <div className={cn("flex items-center gap-1.5 text-[12px] font-bold", statusStyle.text)}>
          <span className={cn("w-2 h-2 rounded-full", statusStyle.dot)} />
          {STATUS_LABELS[task.status ?? ""] ?? "Attiva"}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1.5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-4">👋</span>
            <p className="text-[15px] font-bold text-gray-700 mb-1">Inizia la conversazione</p>
            <p className="text-[13px] text-gray-400">Scrivi un messaggio a {task.clientName}</p>
          </div>
        ) : (
          messages.map(msg => {
            const isOwn = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={cn("flex items-end gap-2", isOwn ? "justify-end" : "justify-start")}>
                {!isOwn && <AvatarBubble name={task.clientName} size="sm" />}
                <div className={cn("max-w-[75%] flex flex-col", isOwn ? "items-end" : "items-start")}>
                  <div className={cn(
                    "px-3.5 py-2.5 rounded-[18px] text-[14px] leading-relaxed",
                    isOwn
                      ? "bg-[#FF5A00] text-white rounded-br-[5px]"
                      : "bg-white text-gray-900 border border-gray-100 rounded-bl-[5px]"
                  )}>
                    {msg.content}
                  </div>
                  <div className={cn("flex items-center gap-1 mt-1 px-1", isOwn ? "flex-row-reverse" : "")}>
                    <span className="text-[11px] text-gray-400">
                      {new Date(msg.created_at).toLocaleTimeString("it", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isOwn && <CheckCheck className="w-3.5 h-3.5 text-[#FF5A00]" />}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start items-end gap-2">
            <AvatarBubble name={task.clientName} size="sm" />
            <div className="bg-white border border-gray-100 rounded-[18px] rounded-bl-[5px] px-4 py-3">
              <div className="flex gap-1">
                {[0, 150, 300].map(delay => (
                  <span key={delay} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick replies ── */}
      {showQR && messages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-3 py-2 bg-[#F7F6F2] border-t border-gray-100 no-scrollbar">
          {QUICK_REPLIES.map(qr => (
            <button key={qr}
              className="flex-shrink-0 px-3.5 py-2 bg-white border-[1.5px] border-gray-200 rounded-full text-[13px] font-semibold text-gray-800 whitespace-nowrap active:bg-orange-50 active:border-orange-200 active:text-orange-800 transition-all"
              onClick={() => sendMessage(qr)}>
              {qr}
            </button>
          ))}
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="bg-white border-t border-gray-100 px-3 py-2.5 flex items-center gap-2 pb-safe">
        <button
          className={cn("w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
            isRecording ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500")}
          onClick={() => setIsRecording(r => !r)}>
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <Input
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Scrivi un messaggio..."
          className="flex-1 rounded-full bg-gray-100 border-0 h-10 px-4 text-[14px]"
        />

        <Button
          size="icon"
          className="rounded-full h-10 w-10 bg-[#FF5A00] hover:bg-[#E04D00] flex-shrink-0"
          onClick={() => sendMessage()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
