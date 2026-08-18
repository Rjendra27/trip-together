import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, ArrowLeft, MoreVertical, MessageCircle, CheckCheck, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ReportBlockDialog from "@/components/ReportBlockDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useLocation, useNavigate } from "react-router-dom";

interface ChatConversation {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  online_status: boolean | null;
  lastMessage?: string;
  lastTime?: string;
  fromMe?: boolean;
  unreadCount?: number;
  lastMessageRead?: boolean;
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
const formatListTime = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
};

export default function ChatPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatConversation | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data: matches } = await supabase
      .from("matches")
      .select("user_id, matched_user_id, status")
      .or(`user_id.eq.${user.id},matched_user_id.eq.${user.id}`)
      .eq("status", "accepted");

    const peerIds = Array.from(new Set(
      (matches ?? []).map(m => (m.user_id === user.id ? m.matched_user_id : m.user_id))
    ));
    if (peerIds.length === 0) {
      setConversations([]);
      return;
    }

    const [{ data: profiles }, { data: msgs }, { data: unreadMsgs }] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_url, online_status").in("user_id", peerIds),
      supabase.from("messages")
        .select("sender_id, receiver_id, content, created_at, read")
        .or(`and(sender_id.eq.${user.id},receiver_id.in.(${peerIds.join(",")})),and(receiver_id.eq.${user.id},sender_id.in.(${peerIds.join(",")}))`)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("messages")
        .select("sender_id, id")
        .eq("receiver_id", user.id)
        .eq("read", false),
    ]);

    const lastByPeer = new Map<string, { content: string; created_at: string; fromMe: boolean; read: boolean }>();
    (msgs ?? []).forEach((m: any) => {
      const peer = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!lastByPeer.has(peer)) {
        lastByPeer.set(peer, {
          content: m.content,
          created_at: m.created_at,
          fromMe: m.sender_id === user.id,
          read: !!m.read
        });
      }
    });

    const unreadCountByPeer = new Map<string, number>();
    (unreadMsgs ?? []).forEach((m: any) => {
      unreadCountByPeer.set(m.sender_id, (unreadCountByPeer.get(m.sender_id) || 0) + 1);
    });

    const enriched = (profiles ?? []).map(p => {
      const last = lastByPeer.get(p.user_id);
      return {
        ...(p as ChatConversation),
        lastMessage: last?.content,
        lastTime: last?.created_at,
        fromMe: last?.fromMe,
        unreadCount: unreadCountByPeer.get(p.user_id) || 0,
        lastMessageRead: last?.read,
      };
    }).sort((a, b) => (b.lastTime || "").localeCompare(a.lastTime || ""));

    setConversations(enriched);

    const selectId = location.state?.selectUserId;
    if (selectId) {
      const target = enriched.find(c => c.user_id === selectId);
      if (target) {
        setSelectedChat(prev => prev?.user_id === selectId ? prev : target);
      }
    }
  }, [user, location.state]);

  // Load conversations + last message preview
  useEffect(() => {
    if (!user) return;
    loadConversations();

    // Subscribe to new messages & updates to update the list preview & unread counts in real-time
    const ch = supabase
      .channel("chats-list-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, loadConversations]);

  const markMessagesAsRead = useCallback(async (peerId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("messages")
      .update({ read: true })
      .eq("sender_id", peerId)
      .eq("receiver_id", user.id)
      .eq("read", false);

    if (error) {
      console.error("Error marking messages as read:", error);
    } else {
      loadConversations();
    }
  }, [user, loadConversations]);

  // Mark selected chat messages as read on open or change
  useEffect(() => {
    if (selectedChat?.user_id && user) {
      markMessagesAsRead(selectedChat.user_id);
    }
  }, [selectedChat?.user_id, user, markMessagesAsRead]);

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
          if (m.sender_id === selectedChat.user_id && m.receiver_id === user.id) {
            // Mark as read in DB and locally
            supabase.from("messages").update({ read: true }).eq("id", m.id).then();
            m.read = true;
            markMessagesAsRead(selectedChat.user_id);
          }
          setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages(prev =>
            prev.map(m => (m.id === updatedMsg.id ? { ...m, read: updatedMsg.read } : m))
          );
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
  }, [user, selectedChat, markMessagesAsRead]);

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
    } else {
      loadConversations();
    }
  };

  if (selectedChat && user) {
    return (
      <div className="flex flex-col h-screen pb-20">
        {/* Header */}
        <div className="sticky top-0 z-30 flex items-center gap-3 bg-gradient-primary px-3 py-3 text-primary-foreground shadow-card">
          <Button variant="ghost" size="icon" className="rounded-full text-primary-foreground hover:bg-primary-foreground/15" onClick={() => setSelectedChat(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div
            onClick={() => navigate(`/profile?id=${selectedChat.user_id}`)}
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-90 active:scale-98 transition-all"
            title="View profile"
          >
            <div className="relative shrink-0">
              <img
                src={selectedChat.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedChat.user_id}`}
                alt={selectedChat.display_name || "User"}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-primary-foreground/40"
              />
              {selectedChat.online_status && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{selectedChat.display_name || "Traveler"}</p>
              <p className="text-[11px] text-primary-foreground/85 font-medium">
                {isPeerTyping ? (
                  <span className="animate-pulse">typing…</span>
                ) : selectedChat.online_status ? "Online" : "Last seen recently"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full text-primary-foreground hover:bg-primary-foreground/15" onClick={() => setShowReport(true)}>
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 chat-surface">
          {messages.length === 0 && (
            <div className="flex flex-col items-center text-center pt-12">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <MessageCircle className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm font-medium">Say hi 👋</p>
              <p className="text-xs text-muted-foreground">Break the ice and start planning your trip together.</p>
            </div>
          )}
          {messages.map(msg => {
            const mine = msg.sender_id === user.id;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex", mine ? "justify-end" : "justify-start")}
              >
                <div className={cn(
                  "max-w-[78%] rounded-2xl px-3.5 py-2 shadow-card",
                  mine
                    ? "bg-gradient-primary text-primary-foreground rounded-br-sm"
                    : "bg-card text-foreground rounded-bl-sm border border-border/40"
                )}>
                  <p className="text-sm leading-snug whitespace-pre-wrap break-words">{msg.content}</p>
                  <div className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]",
                    mine ? "text-primary-foreground/75" : "text-muted-foreground"
                  )}>
                    <span>{formatTime(msg.created_at)}</span>
                    {mine && (msg.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                  </div>
                </div>
              </motion.div>
            );
          })}
          {isPeerTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-card border border-border/40 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 shadow-card">
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="sticky bottom-20 bg-card border-t border-border p-3 space-y-2">
          {messages.length === 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {[
                "Hey! Excited about your trip 👋",
                "What's your itinerary?",
                "Want to split costs?",
                "Are you flexible on dates?",
              ].map(s => (
                <button
                  key={s}
                  onClick={() => setMessage(s)}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-border bg-secondary text-secondary-foreground hover:bg-secondary/70 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Message..."
              value={message}
              onChange={e => handleTyping(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
              className="rounded-full bg-secondary/60 border-0 focus-visible:ring-1 focus-visible:ring-primary"
            />
            <Button variant="gradient" size="icon" className="rounded-full shrink-0 shadow-glow" onClick={sendMessage}>
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
        <h1 className="font-heading text-xl font-bold">Chats</h1>
        <p className="text-xs text-muted-foreground">Plan trips with your matches in real time.</p>
      </div>

      {conversations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center px-6 pt-24"
        >
          <div className="h-20 w-20 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-glow mb-5">
            <MessageCircle className="h-9 w-9 text-primary-foreground" />
          </div>
          <h3 className="font-heading text-lg font-bold mb-1">No chats yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Once you match with a traveler, your conversations will land here.
          </p>
        </motion.div>
      ) : (
        <div className="divide-y divide-border/60">
          {conversations.map((convo, i) => (
            <motion.button
              key={convo.user_id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedChat(convo)}
              className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors text-left"
            >
              <div className="relative shrink-0">
                <img
                  src={convo.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${convo.user_id}`}
                  alt={convo.display_name || "User"}
                  className="h-12 w-12 rounded-full object-cover"
                />
                {convo.online_status && (
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("font-semibold text-sm truncate", convo.unreadCount !== undefined && convo.unreadCount > 0 && "text-foreground font-bold")}>
                    {convo.display_name || "Traveler"}
                  </p>
                  <span className={cn("text-[10px] shrink-0", convo.unreadCount !== undefined && convo.unreadCount > 0 ? "text-primary font-bold" : "text-muted-foreground")}>
                    {formatListTime(convo.lastTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {convo.lastMessage && convo.fromMe && (
                      convo.lastMessageRead ? (
                        <span className="text-[10px] text-emerald-500 font-bold shrink-0">Seen</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-semibold shrink-0">Sent</span>
                      )
                    )}
                    <p className={cn("text-xs truncate", convo.unreadCount !== undefined && convo.unreadCount > 0 ? "text-foreground font-semibold" : "text-muted-foreground")}>
                      {convo.lastMessage
                        ? convo.lastMessage
                        : "Tap to start chatting"}
                    </p>
                  </div>
                  {convo.unreadCount !== undefined && convo.unreadCount > 0 && (
                    <span className="shrink-0 flex h-4.5 min-w-[18px] px-1.5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold shadow-glow">
                      {convo.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
