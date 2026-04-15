import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, Heart, MessageCircle, Plane, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "match" | "message" | "trip";
  title: string;
  body: string;
  time: string;
  read: boolean;
  avatar?: string;
}

const SAMPLE_NOTIFICATIONS: Notification[] = [
  { id: "1", type: "match", title: "New Match! 🎉", body: "You and Emma both want to go to Bali!", time: "2m ago", read: false, avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face" },
  { id: "2", type: "message", title: "James sent a message", body: "Let's plan the itinerary!", time: "1h ago", read: false, avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face" },
  { id: "3", type: "trip", title: "Trip Update", body: "A new spot opened up for the Bali trip", time: "3h ago", read: true },
  { id: "4", type: "match", title: "Mia liked you!", body: "Swipe right to match with Mia", time: "5h ago", read: true, avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face" },
  { id: "5", type: "trip", title: "Trip Reminder", body: "Your Tokyo trip starts in 5 days", time: "1d ago", read: true },
];

const iconMap = { match: Heart, message: MessageCircle, trip: Plane };
const colorMap = { match: "text-pink-500 bg-pink-500/10", message: "text-primary bg-primary/10", trip: "text-accent bg-accent/10" };

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const clearAll = () => setNotifications([]);

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-lg px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" /> Notifications
          </h1>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={markAllRead}><Check className="h-3.5 w-3.5 mr-1" />Read all</Button>
            <Button variant="ghost" size="sm" onClick={clearAll}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border">
        {notifications.map((n, i) => {
          const Icon = iconMap[n.type];
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn("flex items-start gap-3 px-4 py-4 transition-colors", !n.read && "bg-primary/5")}
            >
              {n.avatar ? (
                <img src={n.avatar} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", colorMap[n.type])}>
                  <Icon className="h-4 w-4" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn("text-sm font-semibold", !n.read && "text-foreground")}>{n.title}</p>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                </div>
                <p className="text-sm text-muted-foreground truncate">{n.body}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
              </div>
            </motion.div>
          );
        })}
        {notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Bell className="h-12 w-12 mb-3 opacity-30" />
            <p>No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
