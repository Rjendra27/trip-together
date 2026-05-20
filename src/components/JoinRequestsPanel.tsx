import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ShieldCheck, UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface JoinRequest {
  id: string;
  trip_id: string;
  requester_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  message: string | null;
}
interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  verification_badge: boolean | null;
  location: string | null;
}

export default function JoinRequestsPanel({ tripId }: { tripId: string }) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("trip_join_requests" as any)
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });
    const list = (data || []) as unknown as JoinRequest[];
    setRequests(list);
    const ids = Array.from(new Set(list.map((r) => r.requester_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, verification_badge, location")
        .in("user_id", ids);
      const map: Record<string, Profile> = {};
      (profs || []).forEach((p: any) => (map[p.user_id] = p));
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`tjr-${tripId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trip_join_requests", filter: `trip_id=eq.${tripId}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const respond = async (id: string, status: "accepted" | "rejected") => {
    setBusyId(id);
    const { error } = await supabase
      .from("trip_join_requests" as any)
      .update({ status })
      .eq("id", id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success(status === "accepted" ? "Request accepted" : "Request declined");
  };

  const pending = requests.filter((r) => r.status === "pending");
  const handled = requests.filter((r) => r.status !== "pending");

  if (loading) {
    return (
      <div className="rounded-2xl bg-card border border-border/40 p-6 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border/40 p-6 text-center">
        <UserPlus className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No join requests yet.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">When travelers ask to join, they'll appear here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" /> Join Requests
        </h3>
        {pending.length > 0 && (
          <Badge className="bg-primary text-primary-foreground rounded-full">{pending.length} pending</Badge>
        )}
      </div>

      <AnimatePresence initial={false}>
        {pending.map((r) => {
          const p = profiles[r.requester_id];
          return (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-3 p-4 border-b border-border/40 last:border-0"
            >
              <img
                src={p?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.requester_id}`}
                alt=""
                className="h-11 w-11 rounded-full object-cover ring-2 ring-background"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm truncate">{p?.display_name || "Traveler"}</span>
                  {p?.verification_badge && <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {p?.location || "Wants to join your trip"}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 rounded-full"
                  onClick={() => respond(r.id, "rejected")}
                  disabled={busyId === r.id}
                  aria-label="Reject"
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-full bg-gradient-primary"
                  onClick={() => respond(r.id, "accepted")}
                  disabled={busyId === r.id}
                  aria-label="Accept"
                >
                  {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {handled.length > 0 && (
        <div className="bg-muted/30">
          <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            History
          </p>
          {handled.slice(0, 5).map((r) => {
            const p = profiles[r.requester_id];
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <img
                  src={p?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.requester_id}`}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover opacity-80"
                />
                <span className="flex-1 text-sm truncate">{p?.display_name || "Traveler"}</span>
                <Badge
                  variant="outline"
                  className={
                    r.status === "accepted"
                      ? "border-green-500/40 text-green-600 dark:text-green-400"
                      : "border-destructive/40 text-destructive"
                  }
                >
                  {r.status}
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
