import { useState } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatConversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
}

const CONVERSATIONS: ChatConversation[] = [
  { id: "1", name: "Emma", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face", lastMessage: "Hey! Are you still going to Bali?", time: "2m", unread: 2, online: true },
  { id: "2", name: "James", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face", lastMessage: "Let's plan the itinerary!", time: "1h", unread: 0, online: true },
  { id: "3", name: "Mia", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face", lastMessage: "That hostel looks great 👍", time: "3h", unread: 0, online: false },
  { id: "4", name: "Carlos", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", lastMessage: "I'll share the photos later", time: "1d", unread: 0, online: false },
];

const SAMPLE_MESSAGES = [
  { id: "1", sender: "them", text: "Hey! Are you still going to Bali in June?", time: "10:30 AM" },
  { id: "2", sender: "me", text: "Yes! I'm so excited. Have you booked flights yet?", time: "10:32 AM" },
  { id: "3", sender: "them", text: "Not yet, looking at flights for June 15. Want to coordinate?", time: "10:33 AM" },
  { id: "4", sender: "me", text: "That's perfect! I was thinking around the same dates 🎉", time: "10:35 AM" },
  { id: "5", sender: "them", text: "Awesome! Let's find a place to stay together too. I found some cool hostels in Canggu", time: "10:36 AM" },
];

export default function ChatPage() {
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(SAMPLE_MESSAGES);

  const selectedConvo = CONVERSATIONS.find(c => c.id === selectedChat);

  if (selectedChat && selectedConvo) {
    return (
      <div className="flex flex-col h-screen pb-20">
        {/* Chat header */}
        <div className="sticky top-0 z-30 flex items-center gap-3 bg-card/95 backdrop-blur-lg px-4 py-3 border-b border-border">
          <Button variant="ghost" size="sm" onClick={() => setSelectedChat(null)}>←</Button>
          <img src={selectedConvo.avatar} alt={selectedConvo.name} className="h-8 w-8 rounded-full object-cover" />
          <div>
            <p className="text-sm font-semibold">{selectedConvo.name}</p>
            <p className="text-xs text-muted-foreground">{selectedConvo.online ? "Online" : "Offline"}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex", msg.sender === "me" ? "justify-end" : "justify-start")}
            >
              <div className={cn(
                "max-w-[75%] rounded-2xl px-4 py-2.5",
                msg.sender === "me"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-secondary text-secondary-foreground rounded-bl-md"
              )}>
                <p className="text-sm">{msg.text}</p>
                <p className={cn(
                  "text-[10px] mt-1",
                  msg.sender === "me" ? "text-primary-foreground/60" : "text-muted-foreground"
                )}>{msg.time}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Input */}
        <div className="sticky bottom-20 bg-card border-t border-border p-3">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && message.trim()) {
                  setMessages(prev => [...prev, {
                    id: String(prev.length + 1),
                    sender: "me",
                    text: message,
                    time: "Now",
                  }]);
                  setMessage("");
                }
              }}
              className="rounded-full"
            />
            <Button
              variant="gradient"
              size="icon"
              className="rounded-full shrink-0"
              onClick={() => {
                if (message.trim()) {
                  setMessages(prev => [...prev, {
                    id: String(prev.length + 1),
                    sender: "me",
                    text: message,
                    time: "Now",
                  }]);
                  setMessage("");
                }
              }}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-lg px-4 py-3 border-b border-border">
        <h1 className="font-heading text-lg font-semibold">Messages</h1>
      </div>

      <div className="divide-y divide-border">
        {CONVERSATIONS.map((convo) => (
          <motion.button
            key={convo.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedChat(convo.id)}
            className="flex w-full items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
          >
            <div className="relative">
              <img src={convo.avatar} alt={convo.name} className="h-12 w-12 rounded-full object-cover" />
              {convo.online && (
                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-accent border-2 border-card" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{convo.name}</p>
                <span className="text-xs text-muted-foreground">{convo.time}</span>
              </div>
              <p className="text-sm text-muted-foreground truncate">{convo.lastMessage}</p>
            </div>
            {convo.unread > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {convo.unread}
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
