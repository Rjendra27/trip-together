import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, ArrowLeft, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReportBlockDialog from "@/components/ReportBlockDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface ChatConversation {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  online_status: boolean | null;
  lastMessage?: string;
  lastTime?: string;
  unread?: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean | null;
}

const conversationId = (a: string, b: string) => [a, b].sort().join("_");
const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function ChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatConversation | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load conversations: matched users
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: matches } = await supabase
        .from("matches")
        .select("user_id, matched_user_id, status")
        .or(`user_id.eq.${user.id},matched_user_id.eq.${user.id}`)
        .eq("status", "accepted");

      const peerIds = Array.from(new Set(
        (matches ?? []).map(m => (m.user_id === user.id ? m.matched_user_id : m.user_id))
      ));
      if (peerIds.length === 0) return setConversations([]);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, online_status")
        .in("user_id", peerIds);

      setConversations(profiles ?? []);
    })();
  }, [user]);

  // Load messages + subscribe realtime
  useEffect(() => {
    if (!user || !selectedChat) return;
    const convId = conversationId(user.id, selectedChat.user_id);

    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });
      setMessages((data as Message[]) ?? []);
    })();

    const channel = supabase
      .channel(`chat:${convId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
        }
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.userId !== user.id) {
          setIsPeerTyping(true);
          setTimeout(() => setIsPeerTyping(false), 2500);
        }
      })
      .subscribe();

    typingChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
    };
  }, [user, selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPeerTyping]);

  const handleTyping = (val: string) => {
    setMessage(val);
    if (!typingChannelRef.current || !user) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id },
    });
  };

  const sendMessage = async () => {
    if (!message.trim() || !user || !selectedChat) return;
    const content = message.trim();
    setMessage("");
    const convId = conversationId(user.id, selectedChat.user_id);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: selectedChat.user_id,
      content,
      conversation_id: convId,
    });
    if (error) {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
      setMessage(content);
    }
  };

  if (selectedChat && user) {
    return (
      <div className="flex flex-col h-screen pb-20">
        <div className="sticky top-0 z-30 flex items-center gap-3 bg-card/95 backdrop-blur-lg px-4 py-3 border-b border-border">
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setSelectedChat(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="relative">
            <img
              src={selectedChat.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedChat.user_id}`}
              alt={selectedChat.display_name || "User"}
              className="h-9 w-9 rounded-full object-cover"
            />
            {selectedChat.online_status && (
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-accent border-2 border-card" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{selectedChat.display_name || "Traveler"}</p>
            <p className="text-xs text-muted-foreground">
              {isPeerTyping ? (
                <span className="text-accent animate-pulse">typing...</span>
              ) : selectedChat.online_status ? "Online" : "Offline"}
            </p>
          </div>
          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setShowReport(true)}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground mt-8">Say hi 👋 to start the conversation</p>
          )}
          {messages.map(msg => {
            const mine = msg.sender_id === user.id;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex", mine ? "justify-end" : "justify-start")}
              >
                <div className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2.5",
                  mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"
                )}>
                  <p className="text-sm">{msg.content}</p>
                  <p className={cn("text-[10px] mt-1", mine ? "text-primary-foreground/60" : "text-muted-foreground")}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </motion.div>
            );
          })}
          {isPeerTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="sticky bottom-20 bg-card border-t border-border p-3">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={e => handleTyping(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
              className="rounded-full"
            />
            <Button variant="gradient" size="icon" className="rounded-full shrink-0" onClick={sendMessage}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ReportBlockDialog open={showReport} onClose={() => setShowReport(false)} userName={selectedChat.display_name || "User"} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-lg px-4 py-3 border-b border-border">
        <h1 className="font-heading text-lg font-semibold">Messages</h1>
      </div>

      {conversations.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">No conversations yet. Match with travelers to start chatting.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {conversations.map((convo, i) => (
            <motion.button
              key={convo.user_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedChat(convo)}
              className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors text-left"
            >
              <div className="relative">
                <img
                  src={convo.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${convo.user_id}`}
                  alt={convo.display_name || "User"}
                  className="h-12 w-12 rounded-full object-cover"
                />
                {convo.online_status && <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-accent border-2 border-card" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{convo.display_name || "Traveler"}</p>
                </div>
                <p className="text-sm text-muted-foreground truncate">Tap to open chat</p>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
