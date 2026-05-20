import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Bookmark, BookmarkCheck, Calendar, Users, IndianRupee, ShieldCheck, Loader2, Trash2, Copy, Pencil, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AIRecommendations from "@/components/AIRecommendations";
import JoinRequestsPanel from "@/components/JoinRequestsPanel";
import { imageForDestination } from "@/lib/destinations";
import { useAuth } from "@/contexts/AuthContext";

interface Trip {
  id: string;
  user_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget_min: number | null;
  budget_max: number | null;
  spots_needed: number | null;
  spots_filled: number | null;
  trip_type: string | null;
  description: string | null;
  women_only: boolean | null;
  verified_only: boolean | null;
}

const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [creator, setCreator] = useState<{ display_name: string | null; avatar_url: string | null; verification_badge: boolean | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [joinStatus, setJoinStatus] = useState<"none" | "pending" | "accepted" | "rejected">("none");
  const [joinBusy, setJoinBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("trips").select("*").eq("id", id).maybeSingle();
      if (error || !data) {
        toast.error("Trip not found");
        navigate("/trips");
        return;
      }
      setTrip(data as Trip);
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, avatar_url, verification_badge")
        .eq("user_id", (data as Trip).user_id)
        .maybeSingle();
      setCreator(prof as any);
      if (user) {
        const { data: bm } = await supabase
          .from("bookmarks")
          .select("id")
          .eq("user_id", user.id)
          .eq("trip_id", id)
          .maybeSingle();
        setBookmarked(!!bm);

        const { data: jr } = await supabase
          .from("trip_join_requests" as any)
          .select("status")
          .eq("trip_id", id)
          .eq("requester_id", user.id)
          .maybeSingle();
        if (jr) setJoinStatus(((jr as any).status) || "none");
      }
      setLoading(false);
    })();
  }, [id, navigate, user]);

  const requestToJoin = async () => {
    if (!user) {
      toast.info("Sign in to request");
      navigate("/auth");
      return;
    }
    if (!trip) return;
    if (trip.user_id === user.id) return;
    setJoinBusy(true);
    const { error } = await supabase.from("trip_join_requests" as any).insert({
      trip_id: trip.id,
      requester_id: user.id,
      trip_owner_id: trip.user_id,
    });
    setJoinBusy(false);
    if (error) {
      if (error.code === "23505") {
        toast.info("You've already requested to join this trip");
        setJoinStatus("pending");
      } else {
        toast.error(error.message);
      }
      return;
    }
    setJoinStatus("pending");
    toast.success("Request sent! The host will be notified.");
  };

  const toggleBookmark = async () => {
    if (!user) {
      toast.info("Sign in to save trips");
      navigate("/auth");
      return;
    }
    if (!trip) return;
    setBookmarkBusy(true);
    if (bookmarked) {
      await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("trip_id", trip.id);
      setBookmarked(false);
      toast.success("Removed from saved");
    } else {
      const { error } = await supabase.from("bookmarks").insert({ user_id: user.id, trip_id: trip.id });
      if (error) toast.error(error.message);
      else { setBookmarked(true); toast.success("Saved to your trips"); }
    }
    setBookmarkBusy(false);
  };

  const duplicateTrip = async () => {
    if (!user || !trip) return;
    const { data, error } = await supabase.from("trips").insert({
      user_id: user.id,
      destination: trip.destination,
      start_date: trip.start_date,
      end_date: trip.end_date,
      budget_min: trip.budget_min ?? 0,
      budget_max: trip.budget_max ?? 10000,
      spots_needed: trip.spots_needed ?? 2,
      trip_type: trip.trip_type ?? "adventure",
      description: trip.description ?? "",
    }).select("id").maybeSingle();
    if (error) return toast.error(error.message);
    toast.success("Trip duplicated");
    if (data?.id) navigate(`/trips/${data.id}`);
  };

  const deleteTrip = async () => {
    if (!trip || !user || trip.user_id !== user.id) return;
    if (!confirm("Delete this trip? This cannot be undone.")) return;
    const { error } = await supabase.from("trips").delete().eq("id", trip.id);
    if (error) return toast.error(error.message);
    toast.success("Trip deleted");
    navigate("/my-trips");
  };

  if (loading || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const isOwner = user?.id === trip.user_id;
  const banner = imageForDestination(trip.destination);
  const spotsLeft = Math.max(0, (trip.spots_needed ?? 1) - (trip.spots_filled ?? 0));
  const budget =
    trip.budget_min != null && trip.budget_max != null
      ? `₹${trip.budget_min.toLocaleString("en-IN")} – ₹${trip.budget_max.toLocaleString("en-IN")}`
      : "Flexible";

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div className="relative h-72 md:h-80 overflow-hidden">
        <img src={banner} alt={trip.destination} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/30 to-transparent" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <Button variant="secondary" size="icon" className="rounded-full backdrop-blur bg-background/70" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full backdrop-blur bg-background/70"
            onClick={toggleBookmark}
            disabled={bookmarkBusy}
            aria-label={bookmarked ? "Unsave" : "Save"}
          >
            {bookmarked ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <Bookmark className="h-5 w-5" />}
          </Button>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute inset-x-4 bottom-4 text-primary-foreground"
        >
          <Badge className="bg-primary-foreground/95 text-foreground border-0 capitalize rounded-full mb-2">
            {trip.trip_type || "trip"}
          </Badge>
          <h1 className="font-heading text-3xl md:text-4xl font-bold leading-tight drop-shadow">
            {trip.destination}
          </h1>
          <p className="text-sm opacity-90 mt-1">{fmt(trip.start_date)} – {fmt(trip.end_date)}</p>
        </motion.div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-6 relative z-10 space-y-4">
        <div className="rounded-2xl bg-card shadow-elevated p-4 border border-border/40">
          <div className="flex items-center gap-3">
            <img
              src={creator?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${trip.user_id}`}
              alt=""
              className="h-11 w-11 rounded-full object-cover ring-2 ring-background"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold truncate">{creator?.display_name || "Traveler"}</span>
                {creator?.verification_badge && (
                  <ShieldCheck className="h-4 w-4 text-primary" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">Trip host</span>
            </div>
            {isOwner && (
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={duplicateTrip} title="Duplicate">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={deleteTrip} title="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
            <Stat icon={Calendar} label={`${Math.max(1, Math.ceil((+new Date(trip.end_date) - +new Date(trip.start_date)) / 86400000))} days`} />
            <Stat icon={IndianRupee} label={budget} />
            <Stat icon={Users} label={`${trip.spots_filled ?? 0}/${trip.spots_needed ?? 1} • ${spotsLeft} left`} />
          </div>

          {trip.description && (
            <p className="text-sm text-foreground/80 mt-4 leading-relaxed whitespace-pre-wrap">{trip.description}</p>
          )}

          <div className="flex gap-2 mt-4">
            {!isOwner && joinStatus === "none" && (
              <Button variant="hero" className="flex-1 rounded-xl" onClick={requestToJoin} disabled={joinBusy || spotsLeft === 0}>
                {joinBusy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {spotsLeft === 0 ? "Trip full" : "Request to Join"}
              </Button>
            )}
            {!isOwner && joinStatus === "pending" && (
              <Button variant="outline" className="flex-1 rounded-xl" disabled>
                <Clock className="h-4 w-4 mr-1.5" /> Request pending
              </Button>
            )}
            {!isOwner && joinStatus === "accepted" && (
              <Button variant="outline" className="flex-1 rounded-xl border-green-500/50 text-green-600 dark:text-green-400" disabled>
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> You're in
              </Button>
            )}
            {!isOwner && joinStatus === "rejected" && (
              <Button variant="outline" className="flex-1 rounded-xl" disabled>
                Request declined
              </Button>
            )}
            {!isOwner && (
              <Button variant="outline" className="rounded-xl" onClick={duplicateTrip}>
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
            )}
            {isOwner && (
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => navigate(`/trips/create?destination=${encodeURIComponent(trip.destination)}`)}>
                <Pencil className="h-4 w-4 mr-1" /> Plan another
              </Button>
            )}
          </div>
        </div>

        {isOwner && <JoinRequestsPanel tripId={trip.id} />}


        <AIRecommendations
          destination={trip.destination}
          tripType={trip.trip_type ?? undefined}
          startDate={trip.start_date}
          endDate={trip.end_date}
          budgetMin={trip.budget_min ?? undefined}
          budgetMax={trip.budget_max ?? undefined}
        />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl bg-secondary/60 px-2.5 py-2 text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="truncate font-medium text-foreground/80">{label}</span>
    </div>
  );
}
