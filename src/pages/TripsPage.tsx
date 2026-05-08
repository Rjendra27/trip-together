import { Search, Plus, Loader2, Compass } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import TripCard from "@/components/TripCard";
import { supabase } from "@/integrations/supabase/client";
import { imageForDestination } from "@/lib/destinations";
import { toast } from "sonner";

const FILTERS = ["All", "adventure", "chill", "culture", "trekking", "food", "beach"];

interface DbTrip {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget_min: number | null;
  budget_max: number | null;
  spots_needed: number | null;
  spots_filled: number | null;
  trip_type: string | null;
  user_id: string;
  created_at: string;
}

interface ProfileLite {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function TripsPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [trips, setTrips] = useState<DbTrip[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const list = (data || []) as DbTrip[];
    setTrips(list);

    const userIds = [...new Set(list.map(t => t.user_id))];
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      const map: Record<string, ProfileLite> = {};
      (profs || []).forEach(p => { map[p.user_id] = p as ProfileLite; });
      setProfiles(map);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTrips();

    const channel = supabase
      .channel("trips-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => {
        fetchTrips();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchTrips]);

  const filteredTrips = trips.filter(trip => {
    const matchesFilter = activeFilter === "All" || (trip.trip_type || "").toLowerCase() === activeFilter.toLowerCase();
    const matchesSearch = trip.destination.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-lg px-4 py-3 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-lg font-semibold">Explore Trips</h1>
          <Button variant="gradient" size="sm" className="rounded-xl" onClick={() => navigate("/trips/create")}>
            <Plus className="h-4 w-4 mr-1" /> Create
          </Button>
        </div>
        <div className="flex gap-2 items-center bg-secondary rounded-xl p-1.5">
          <Search className="h-4 w-4 text-muted-foreground ml-1.5" />
          <Input
            placeholder="Search destinations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 bg-transparent focus-visible:ring-0 text-sm h-8"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          {FILTERS.map(f => (
            <Badge
              key={f}
              variant={activeFilter === f ? "default" : "outline"}
              className="cursor-pointer whitespace-nowrap rounded-full px-3 py-1 transition-all shrink-0 capitalize"
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </Badge>
          ))}
        </div>
      </div>

      <div className="p-4 grid gap-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredTrips.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center py-20 px-6"
          >
            <div className="h-20 w-20 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-glow mb-5">
              <Compass className="h-9 w-9 text-primary-foreground" />
            </div>
            <h3 className="font-heading text-lg font-bold mb-1">No trips here yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-5">
              Be the first to plan a trip and find travel buddies who match your vibe.
            </p>
            <Button variant="gradient" className="rounded-full px-6" onClick={() => navigate("/trips/create")}>
              <Plus className="h-4 w-4 mr-1" /> Create your first trip
            </Button>
          </motion.div>
        ) : (
          filteredTrips.map((trip) => {
            const profile = profiles[trip.user_id];
            const spotsLeft = Math.max(0, (trip.spots_needed ?? 1) - (trip.spots_filled ?? 0));
            const budget =
              trip.budget_min != null && trip.budget_max != null
                ? `₹${trip.budget_min.toLocaleString("en-IN")}-${trip.budget_max.toLocaleString("en-IN")}`
                : "Flexible";
            return (
              <TripCard
                key={trip.id}
                destination={trip.destination}
                startDate={formatDate(trip.start_date)}
                endDate={formatDate(trip.end_date)}
                startISO={trip.start_date}
                budget={budget}
                spotsLeft={spotsLeft}
                spotsTotal={trip.spots_needed ?? undefined}
                spotsFilled={trip.spots_filled ?? 0}
                tripType={trip.trip_type || "adventure"}
                imageUrl={imageForDestination(trip.destination)}
                creatorName={profile?.display_name || "Traveler"}
                creatorAvatar={profile?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + trip.user_id}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
