import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Task } from "@/components/TaskCard";
import { ArrowLeft, Send, Mic, MicOff, MoreVertical, CheckCheck, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { notificationService } from "@/services/notificationService";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  is_audio?: boolean;
}

interface ChatViewProps {
  task: Task;
  onBack: () => void;
  currentUserId?: string;
  taskId?: string;
}

export function ChatView({ task, onBack, currentUserId, taskId }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch messages from database
  const fetchMessages = useCallback(async () => {
    if (!taskId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data || []);
    } catch (err) {
      console.error('Error in fetchMessages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription for messages
  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`messages-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            // Avoid duplicates
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUserId || !taskId) return;

    const messageContent = newMessage.trim();
    setNewMessage("");

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          task_id: taskId,
          sender_id: currentUserId,
          content: messageContent,
          is_read: false,
        });

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Errore",
          description: "Impossibile inviare il messaggio",
          variant: "destructive",
        });
        setNewMessage(messageContent);
        return;
      }

      // Send push notification to recipient (other person in chat)
      // Note: We need the task's client_id and lifter_id from the task prop
      const recipientId = currentUserId === (task as any).client_id 
        ? (task as any).lifter_id 
        : (task as any).client_id;
      
      if (recipientId) {
        notificationService.notifyNewMessage(recipientId, task.clientName || "Utente", taskId);
      }
    } catch (err) {
      console.error('Error in handleSend:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    toast({
      title: isRecording ? "Registrazione fermata" : "Registrazione avviata 🎙️",
      description: isRecording ? "Audio non ancora supportato" : "Tieni premuto per registrare",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="p-1">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        
        <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border-2 border-primary">
          {task.clientAvatar ? (
            <img src={task.clientAvatar} alt={task.clientName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg">
              {task.emoji}
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{task.clientName}</h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {isTyping ? (
              <span className="text-primary animate-pulse">sta scrivendo...</span>
            ) : (
              <>
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span>{task.rating?.toFixed(1) || "4.8"}</span>
                <span>• Online</span>
              </>
            )}
          </div>
        </div>

        <button className="p-2 rounded-full hover:bg-muted">
          <MoreVertical className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Task Info Banner */}
      <div className="bg-primary/10 px-4 py-2 flex items-center gap-2">
        <span className="text-lg">{task.emoji}</span>
        <span className="text-sm font-medium text-foreground">{task.title}</span>
        <span className="text-sm text-primary font-bold ml-auto">{task.price}€</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-4xl animate-bounce">💬</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-4xl mb-3">👋</span>
            <p className="text-muted-foreground text-sm">
              Inizia la conversazione con {task.clientName}
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === currentUserId;
            return (
              <div
                key={message.id}
                className={cn("flex", isOwn ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm",
                    isOwn
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card text-foreground rounded-bl-sm"
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                  <div className={cn(
                    "flex items-center gap-1 mt-1",
                    isOwn ? "justify-end" : "justify-start"
                  )}>
                    <span className={cn(
                      "text-[10px]",
                      isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {formatTime(message.created_at)}
                    </span>
                    {isOwn && message.is_read && (
                      <CheckCheck className="w-3.5 h-3.5 text-primary-foreground/70" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-card rounded-2xl px-4 py-3 rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-card border-t border-border px-4 py-3 pb-safe">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleRecording}
            className={cn(
              "p-3 rounded-full transition-colors",
              isRecording ? "bg-red-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Scrivi un messaggio..."
            className="flex-1 rounded-full bg-muted border-0 h-11"
          />
          
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            variant="cta"
            size="icon"
            className="rounded-full h-11 w-11"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}