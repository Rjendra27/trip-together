import { Search, SlidersHorizontal, Plus, Sparkles, TrendingUp, Loader2, ShieldCheck, Users2, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import TripCard from "@/components/TripCard";
import heroImage from "@/assets/hero-travel.jpg";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&h=400&fit=crop";

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

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const CATEGORIES = [
  { emoji: "🏔️", label: "Adventure" },
  { emoji: "🏖️", label: "Beach" },
  { emoji: "🍜", label: "Food" },
  { emoji: "🎭", label: "Culture" },
  { emoji: "🎉", label: "Nightlife" },
  { emoji: "🥾", label: "Trekking" },
];

const RECOMMENDED = [
  { destination: "Bali, Indonesia", image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=300&h=200&fit=crop", matchPercent: 95 },
  { destination: "Tokyo, Japan", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=300&h=200&fit=crop", matchPercent: 88 },
  { destination: "Santorini, Greece", image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=300&h=200&fit=crop", matchPercent: 82 },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [trips, setTrips] = useState<DbTrip[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string | null; avatar_url: string | null }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("trips")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);
      const list = (data || []) as DbTrip[];
      setTrips(list);
      const ids = [...new Set(list.map(t => t.user_id))];
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", ids);
        const map: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
        (profs || []).forEach((p: any) => { map[p.user_id] = p; });
        setProfiles(map);
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("home-trips")
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredTrips = trips.filter(t => t.destination.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen pb-24">
      {/* Hero */}
      <div className="relative h-[420px] overflow-hidden">
        <img src={heroImage} alt="Travel" className="h-full w-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/20 via-foreground/40 to-foreground/80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring" }}>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/20 backdrop-blur-md px-3 py-1 text-xs text-primary-foreground mb-3">
              <Sparkles className="h-3 w-3" /> 1,247 travelers online
            </span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-heading text-3xl sm:text-4xl font-bold text-primary-foreground mb-2 leading-tight">
            Never travel alone again
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-primary-foreground/85 text-sm max-w-sm mb-4">
            Match with verified travelers heading the same way. Plan trips, split costs, make memories.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col items-center gap-2">
            <Button variant="gradient" size="lg" className="rounded-full shadow-elevated" onClick={() => navigate("/matches")}>
              <Heart className="h-4 w-4 mr-1" /> Find Travel Buddy
            </Button>
            <div className="flex items-center gap-1.5 text-[11px] text-primary-foreground/80">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              <span>ID verified · Phone verified · Trusted Traveler badges</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 -mt-6 relative z-10">
        <div className="flex gap-2 items-center bg-card rounded-2xl shadow-elevated p-2">
          <Search className="h-4 w-4 text-muted-foreground ml-2" />
          <Input placeholder="Where do you want to go?" value={search} onChange={e => setSearch(e.target.value)} className="border-0 bg-transparent focus-visible:ring-0 text-sm" />
          <Button size="icon" variant="ghost" className="shrink-0 rounded-xl"><SlidersHorizontal className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 mt-5">
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4">
          {CATEGORIES.map(cat => (
            <motion.button
              key={cat.label}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/trips")}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card shadow-card text-xl">{cat.emoji}</span>
              <span className="text-[10px] font-medium text-muted-foreground">{cat.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Smart Recommendations */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-base font-semibold flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" /> For You
          </h2>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4">
          {RECOMMENDED.map(rec => (
            <motion.div
              key={rec.destination}
              whileTap={{ scale: 0.97 }}
              className="relative shrink-0 w-40 h-24 rounded-2xl overflow-hidden cursor-pointer"
              onClick={() => navigate("/trips")}
            >
              <img src={rec.image} alt={rec.destination} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-xs font-semibold text-primary-foreground truncate">{rec.destination}</p>
                <Badge className="bg-accent/80 text-accent-foreground border-0 text-[9px] mt-0.5">{rec.matchPercent}% match</Badge>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Trending Trips */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-base font-semibold flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-primary" /> Trending Trips
          </h2>
          <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => navigate("/trips")}>See all</Button>
        </div>
        <div className="grid gap-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredTrips.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 space-y-3">
              <p>No trips available yet. Be the first to create one.</p>
              <Button variant="gradient" size="sm" className="rounded-xl" onClick={() => navigate("/trips/create")}>
                <Plus className="h-4 w-4 mr-1" /> Create Trip
              </Button>
            </div>
          ) : (
            filteredTrips.map((trip) => {
              const profile = profiles[trip.user_id];
              const spotsLeft = Math.max(0, (trip.spots_needed ?? 1) - (trip.spots_filled ?? 0));
              const budget = trip.budget_min != null && trip.budget_max != null ? `₹${trip.budget_min.toLocaleString("en-IN")}-${trip.budget_max.toLocaleString("en-IN")}` : "Flexible";
              return (
                <TripCard
                  key={trip.id}
                  destination={trip.destination}
                  startDate={formatDate(trip.start_date)}
                  endDate={formatDate(trip.end_date)}
                  budget={budget}
                  spotsLeft={spotsLeft}
                  tripType={trip.trip_type || "adventure"}
                  imageUrl={FALLBACK_IMG}
                  creatorName={profile?.display_name || "Traveler"}
                  creatorAvatar={profile?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + trip.user_id}
                  onClick={() => navigate("/trips")}
                />
              );
            })
          )}
        </div>
      </div>

      {/* FAB */}
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring" }} className="fixed bottom-24 right-4 z-40">
        <Button variant="gradient" size="icon" className="h-14 w-14 rounded-full shadow-elevated" onClick={() => navigate("/trips/create")}>
          <Plus className="h-6 w-6" />
        </Button>
      </motion.div>
    </div>
  );
}
