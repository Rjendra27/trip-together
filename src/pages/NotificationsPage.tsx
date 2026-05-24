import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bell, Heart, MessageCircle, Plane, Check, Trash2, UserPlus, CheckCircle2, XCircle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

// Preferences keys moved to dedicated settings page

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
  const [joinRequests, setJoinRequests] = useState<Record<string, { status: string; requester_id: string }>>({});

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const load = async () => {
      const [{ data: notifs }, { data: reqs }] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("trip_join_requests")
          .select("id, status, requester_id")
          .eq("trip_owner_id", user.id)
      ]);

      setNotifications((notifs || []) as Notification[]);

      const reqMap: Record<string, { status: string; requester_id: string }> = {};
      (reqs || []).forEach((r: any) => {
        reqMap[r.id] = { status: r.status, requester_id: r.requester_id };
      });
      setJoinRequests(reqMap);
      setLoading(false);
    };
    load();

    const ch = supabase
      .channel(`notif-page-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_join_requests" },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const handleAcceptRequest = async (requestId: string, requesterId: string, notificationId: string) => {
    if (!user) return;

    // 1. Update join request status in DB
    const { error: reqError } = await supabase
      .from("trip_join_requests")
      .update({ status: "accepted" as any })
      .eq("id", requestId);

    if (reqError) {
      toast.error(reqError.message);
      return;
    }

    // 2. Mark notification as read
    await supabase.from("notifications").update({ read: true }).eq("id", notificationId);

    // 3. Upsert match record with status 'accepted'
    const { data: existingMatch } = await supabase
      .from("matches")
      .select("*")
      .or(`and(user_id.eq.${user.id},matched_user_id.eq.${requesterId}),and(user_id.eq.${requesterId},matched_user_id.eq.${user.id})`)
      .maybeSingle();

    if (existingMatch) {
      await supabase
        .from("matches")
        .update({ status: "accepted" as any })
        .eq("id", existingMatch.id);
    } else {
      await supabase
        .from("matches")
        .insert({
          user_id: user.id,
          matched_user_id: requesterId,
          status: "accepted" as any,
          match_percent: 90
        });
    }

    toast.success("Trip request accepted! Opening chat...");

    // 4. Navigate directly to /chat with selection state
    navigate("/chat", { state: { selectUserId: requesterId } });
  };

  const handleDeclineRequest = async (requestId: string, notificationId: string) => {
    const { error } = await supabase
      .from("trip_join_requests")
      .update({ status: "rejected" as any })
      .eq("id", requestId);

    if (error) {
      toast.error(error.message);
      return;
    }

    await supabase.from("notifications").update({ read: true }).eq("id", notificationId);
    toast.success("Trip request declined.");
  };

  // Preferences updating moved to dedicated settings page

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

  // Preference items moved to dedicated settings page

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

      {/* Notifications list only (Preferences toggles moved to dedicated Settings page) */}

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
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className={cn(
                    "w-full flex flex-col gap-3 px-4 py-4 border-b border-border",
                    !n.read && "bg-primary/5"
                  )}
                >
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => markOne(n)}
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
                  </div>

                  {/* Render Accept/Decline options if this is a pending join request */}
                  {n.type === "join_request" && n.related_id && joinRequests[n.related_id] && (
                    <div className="pl-13 pr-4">
                      {joinRequests[n.related_id].status === "pending" ? (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            onClick={() => handleAcceptRequest(n.related_id!, joinRequests[n.related_id!].requester_id, n.id)}
                          >
                            <Check className="h-4 w-4" /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 rounded-xl text-destructive border-destructive/20 hover:bg-destructive/10 gap-1"
                            onClick={() => handleDeclineRequest(n.related_id!, n.id)}
                          >
                            <X className="h-4 w-4" /> Decline
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-1 text-xs font-semibold text-muted-foreground flex items-center gap-1.5 bg-secondary/50 px-2.5 py-1.5 rounded-lg w-max">
                          {joinRequests[n.related_id].status === "accepted" ? (
                            <span className="text-emerald-600 flex items-center gap-1">✓ Request Accepted</span>
                          ) : (
                            <span className="text-destructive flex items-center gap-1">✗ Request Declined</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
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
