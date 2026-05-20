import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bell, Heart, MessageCircle, Plane, Check, Trash2, UserPlus, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

const PREFS_KEY = "tripmate_notif_prefs";
type Prefs = { match_alerts: boolean; message_alerts: boolean; trip_alerts: boolean };
const DEFAULT_PREFS: Prefs = { match_alerts: true, message_alerts: true, trip_alerts: true };

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  related_id: string | null;
  created_at: string;
}

const iconFor = (type: string) => {
  switch (type) {
    case "match": return Heart;
    case "message": return MessageCircle;
    case "join_request": return UserPlus;
    case "join_accepted": return CheckCircle2;
    case "join_rejected": return XCircle;
    default: return Plane;
  }
};
const colorFor = (type: string) => {
  switch (type) {
    case "match": return "text-pink-500 bg-pink-500/10";
    case "message": return "text-primary bg-primary/10";
    case "join_request": return "text-primary bg-primary/10";
    case "join_accepted": return "text-green-600 bg-green-500/10";
    case "join_rejected": return "text-destructive bg-destructive/10";
    default: return "text-accent bg-accent/10";
  }
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) { try { setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) }); } catch {} }
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setNotifications((data || []) as Notification[]);
      setLoading(false);
    };
    load();

    const ch = supabase
      .channel(`notif-page-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notification;
          setNotifications((prev) => [n, ...prev]);
          toast(n.title, { description: n.body || undefined });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notification;
          setNotifications((prev) => prev.map((x) => (x.id === n.id ? n : x)));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const updatePref = (key: keyof Prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    toast.success("Preference saved");
  };

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (!unreadIds.length) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
  };

  const markOne = async (n: Notification) => {
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    }
    if (n.type === "join_request" || n.type === "join_accepted" || n.type === "join_rejected") {
      if (n.type === "join_accepted" || n.type === "join_rejected") {
        if (n.related_id) navigate(`/trips/${n.related_id}`);
      } else {
        navigate("/my-trips");
      }
    } else if (n.type === "message") {
      navigate("/chat");
    } else if (n.type === "match") {
      navigate("/matches");
    }
  };

  const clearAll = async () => {
    setNotifications([]);
    toast.success("Cleared");
    // notifications don't have a DELETE RLS for users; just clear local state.
  };

  const prefItems: { key: keyof Prefs; label: string; desc: string }[] = [
    { key: "match_alerts", label: "Match alerts", desc: "When someone matches with you" },
    { key: "message_alerts", label: "Message alerts", desc: "New chat messages" },
    { key: "trip_alerts", label: "Trip update alerts", desc: "Join requests and trip changes" },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-lg px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
            <h1 className="font-heading text-lg font-semibold flex items-center gap-2 truncate">
              <Bell className="h-5 w-5" /> Notifications
              {unreadCount > 0 && (
                <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">{unreadCount}</span>
              )}
            </h1>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
              <Check className="h-3.5 w-3.5 mr-1" />Read all
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="rounded-2xl bg-card shadow-card divide-y divide-border">
          {prefItems.map((it) => (
            <div key={it.key} className="flex items-center gap-3 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{it.label}</p>
                <p className="text-xs text-muted-foreground">{it.desc}</p>
              </div>
              <Switch checked={prefs[it.key]} onCheckedChange={(v) => updatePref(it.key, v)} />
            </div>
          ))}
        </div>
      </div>

      <h2 className="px-4 pt-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent</h2>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="divide-y divide-border">
          <AnimatePresence initial={false}>
            {notifications.map((n, i) => {
              const Icon = iconFor(n.type);
              return (
                <motion.button
                  key={n.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  onClick={() => markOne(n)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-4 transition-colors text-left active:bg-muted/50",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", colorFor(n.type))}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm font-semibold")}>{n.title}</p>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    {n.body && <p className="text-sm text-muted-foreground line-clamp-2">{n.body}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>

          {notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Bell className="h-12 w-12 mb-3 opacity-30" />
              <p>No notifications yet</p>
              <p className="text-xs mt-1">You'll see join requests and updates here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
