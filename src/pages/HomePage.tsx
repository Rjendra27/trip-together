import { Search, SlidersHorizontal, Plus, Sparkles, TrendingUp, Loader2, ShieldCheck, Compass, MapPin, Users, Mountain, Palmtree, Footprints, PartyPopper, Landmark, Backpack, Utensils, Coins, Clock, Star, Flame } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import TripCard from "@/components/TripCard";
import heroImage from "@/assets/hero-travel.jpg";
import { supabase } from "@/integrations/supabase/client";
import { POPULAR_DESTINATIONS, imageForDestination } from "@/lib/destinations";
import { toast } from "sonner";

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
  new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric" });

const CATEGORY_KEYS = [
  { icon: Mountain, key: "adventure" },
  { icon: Palmtree, key: "beach" },
  { icon: Footprints, key: "trekking" },
  { icon: PartyPopper, key: "festival" },
  { icon: Landmark, key: "temple" },
  { icon: Backpack, key: "weekend" },
  { icon: Utensils, key: "food" },
  { icon: Coins, key: "budget" },
];

interface CompanionProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  location: string | null;
  interests: string[] | null;
  verification_badge: boolean | null;
  match?: string;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [trips, setTrips] = useState<DbTrip[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string | null; avatar_url: string | null }>>({});
  const [companions, setCompanions] = useState<CompanionProfile[]>([]);
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

      // Get current authenticated user session
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch actual travel companions from profiles table in real-time
      const { data: compData } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, avatar_url, age, location, interests, is_available, verification_badge")
        .eq("is_available", true)
        .limit(12);

      let dbCompanions = (compData || []) as CompanionProfile[];
      
      // Strict Filter: Do not show self user in travel companions list
      if (user) {
        dbCompanions = dbCompanions.filter(c => c.user_id !== user.id);
      }
      
      // Dynamic match percentage calculator using a stable deterministic hash of the user id
      const getStableMatchPercent = (idStr: string) => {
        let hash = 0;
        for (let i = 0; i < idStr.length; i++) {
          hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        const pct = 82 + Math.abs(hash % 17); // 82% to 98%
        return `${pct}% Match`;
      };

      const finalCompanions = dbCompanions.map(c => ({
        ...c,
        match: getStableMatchPercent(c.user_id || c.id)
      }));

      setCompanions(finalCompanions);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("home-trips")
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredTrips = trips.filter(t => {
    const today = new Date().toISOString().slice(0, 10);
    const isPast = t.end_date < today || (t as any).status === "completed" || (t as any).status === "cancelled";
    if (isPast) return false;
    return t.destination.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen pb-24">
      {/* Hero */}
      <div className="relative h-[440px] overflow-hidden">
        <img src={heroImage} alt="Travel" className="h-full w-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.6))' }} />
        
        {/* Transparent Top Logo */}
        <div className="absolute top-0 left-0 right-0 z-20 px-6 py-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-1.5 text-white font-bold cursor-pointer w-fit" onClick={() => navigate("/")}>
            <Compass className="h-5 w-5 text-primary" />
            <span className="text-sm font-heading font-extrabold tracking-tight">TripTogether</span>
          </div>
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-start px-6 text-center pt-20">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring" }} className="mt-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/20 backdrop-blur-md px-3 py-1 text-xs text-primary-foreground mb-3">
              <Sparkles className="h-3 w-3" /> {t("home.online_count", { count: 1247 })}
            </span>
          </motion.div>
          
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-heading text-3xl sm:text-4xl font-bold text-primary-foreground mb-2 leading-tight">
            Never travel alone again
          </motion.h1>
          
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-primary-foreground/90 text-sm max-w-sm mb-5 font-medium">
            Find trusted companions for unforgettable journeys.
          </motion.p>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col items-center gap-3">
            <div className="flex flex-row items-center gap-3">
              <Button variant="gradient" size="default" className="rounded-full shadow-elevated px-6 text-xs h-10 font-bold" onClick={() => navigate("/trips")}>
                <Compass className="h-4 w-4 mr-1.5" /> Explore Trips
              </Button>
              <Button variant="secondary" size="default" className="rounded-full bg-primary-foreground/25 backdrop-blur-md text-white border border-white/10 hover:bg-primary-foreground/35 px-6 text-xs h-10 font-bold shadow-elevated" onClick={() => navigate("/matches")}>
                <Users className="h-4 w-4 mr-1.5" /> Find Companions
              </Button>
            </div>
            
            <div className="flex items-center gap-1.5 text-[10px] text-primary-foreground/80 mt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              <span>{t("home.trust_line")}</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 -mt-8 relative z-10 max-w-2xl mx-auto w-full">
        <div className="flex gap-3 items-center bg-card/80 backdrop-blur-xl border border-white/[0.08] shadow-elevated rounded-3xl p-3 h-14 md:h-16 transition-all focus-within:ring-2 focus-within:ring-primary/20">
          <Search className="h-5 w-5 text-primary ml-2 shrink-0" />
          <Input 
            placeholder="Search destinations, companions, or trips" 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="border-0 bg-transparent focus-visible:ring-0 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground/75 h-full" 
          />
          <Button size="icon" variant="ghost" className="shrink-0 rounded-2xl h-10 w-10 hover:bg-white/5"><SlidersHorizontal className="h-4.5 w-4.5 text-muted-foreground" /></Button>
        </div>
        
        {/* Destination Suggestions */}
        <div className="flex items-center gap-1.5 px-4 mt-3 text-[10px] text-muted-foreground overflow-x-auto no-scrollbar justify-center sm:justify-start">
          <span className="font-bold text-foreground/70 uppercase tracking-wider shrink-0 mr-1">Suggestions:</span>
          {["Goa", "Manali", "Ladakh", "Kerala", "Coorg"].map(s => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSearch(s);
                toast.success(`Searching for: ${s}`);
              }}
              className="px-2.5 py-0.5 bg-card/45 hover:bg-[#faf8f5] dark:hover:bg-[#1f1d18] border border-border/40 rounded-full transition-all text-foreground/80 hover:text-primary active:scale-95 shrink-0"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 mt-5">
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4">
          {CATEGORY_KEYS.map(cat => {
            const Icon = cat.icon;
            return (
              <motion.button
                key={cat.key}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/trips")}
                className="flex flex-col items-center gap-1.5 shrink-0"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card shadow-card hover:bg-secondary/40 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </span>
                <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{t(`categories.${cat.key}`)}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Popular in India */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-base font-semibold flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-primary" /> {t("home.popular_in_india")}
          </h2>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2 pt-1">
          {POPULAR_DESTINATIONS.map(dest => (
            <motion.div
              key={dest.name}
              whileTap={{ scale: 0.97 }}
              className="relative shrink-0 w-36 h-48 sm:w-40 sm:h-52 rounded-2xl overflow-hidden cursor-pointer shadow-md group"
              onClick={() => navigate(`/trips/create?destination=${encodeURIComponent(dest.name)}`)}
            >
              <img src={`${dest.image}?auto=format&fit=crop&w=400&h=600&q=80`} alt={dest.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-white text-left space-y-0.5">
                <p className="text-xs sm:text-sm font-heading font-extrabold truncate drop-shadow flex items-center gap-1">
                  <span>{dest.emoji}</span> <span>{dest.name}</span>
                </p>
                <div className="flex items-center justify-between text-[9px] text-slate-300 font-medium">
                  <span>{dest.travelers}</span>
                  <span className="text-yellow-500 font-bold flex items-center gap-0.5 bg-black/40 px-1 py-0.5 rounded-md">
                    ★ {dest.rating}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Travel Companions */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-base font-semibold flex items-center gap-1.5">
            <Users className="h-4 w-4 text-primary" /> Travel Companions
          </h2>
          <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => navigate("/matches")}>View Matches &gt;</Button>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 pb-3 pt-1">
          {companions.length === 0 ? (
            <div className="w-full text-center text-muted-foreground py-8 space-y-3 bg-card border border-border/40 rounded-3xl p-6">
              <Users className="h-8 w-8 text-muted-foreground/60 mx-auto" />
              <p className="text-xs font-medium">No other available travel companions found at the moment.</p>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate("/matches")}>
                Find Matches
              </Button>
            </div>
          ) : (
            companions.map((comp) => {
              const name = comp.display_name || "Traveler";
              const age = comp.age || 25;
              const location = comp.location || "India";
              const avatar = comp.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + comp.user_id;
              const interests = comp.interests && comp.interests.length > 0 ? comp.interests : ["Traveler", "Exploring"];
              const matchPercent = comp.match || "85% Match";

              return (
                <motion.div
                  key={comp.id}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ y: -4 }}
                  className="relative shrink-0 w-52 sm:w-56 rounded-3xl bg-card border border-border/40 shadow-sm overflow-hidden flex flex-col cursor-pointer transition-all duration-300 group hover:shadow-md text-left"
                  onClick={() => navigate("/matches")}
                >
                  {/* Photo Cover */}
                  <div className="relative h-44 w-full overflow-hidden">
                    <img 
                      src={avatar.startsWith("http") ? `${avatar}?auto=format&fit=crop&w=400&h=450&q=80` : avatar} 
                      alt={name} 
                      loading="lazy" 
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Match Percentage Overlay Badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className="px-2 py-0.5 bg-[#10b981]/90 backdrop-blur-md text-[9px] font-extrabold text-white rounded-full shadow-sm">
                        {matchPercent}
                      </span>
                    </div>

                    {/* Info Overlay (Name, Age, Location) */}
                    <div className="absolute bottom-2.5 left-3 right-3 text-white text-left space-y-0.5">
                      <h3 className="font-heading font-extrabold text-sm truncate drop-shadow">
                        {name}, {age}
                      </h3>
                      <div className="flex items-center gap-0.5 text-[9px] text-slate-200 font-medium">
                        <MapPin className="h-2.5 w-2.5 text-primary shrink-0" />
                        <span className="truncate">{location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-3 flex-grow flex flex-col justify-between space-y-3 bg-card">
                    {/* Interests HUD */}
                    <div className="flex flex-wrap gap-1">
                      {interests.map((interest) => (
                        <span 
                          key={interest} 
                          className="px-2 py-0.5 bg-secondary/50 border border-border/30 text-[8px] font-bold text-muted-foreground rounded-full"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>

                    {/* Action Button */}
                    <Button 
                      size="sm" 
                      variant="gradient" 
                      className="w-full text-[10px] h-8 rounded-xl font-extrabold font-heading shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/matches");
                      }}
                    >
                      Connect
                    </Button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>


      {/* Trending Trips */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-base font-semibold flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-primary" /> {t("home.trending")}
          </h2>
          <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => navigate("/trips")}>{t("home.see_all")}</Button>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 pb-3 pt-1">
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="relative shrink-0 w-64 h-56 rounded-3xl bg-card border border-border/20 overflow-hidden flex flex-col p-3 space-y-3 animate-pulse">
                <div className="h-32 bg-secondary rounded-2xl w-full" />
                <div className="h-4 bg-secondary rounded w-3/4" />
                <div className="flex justify-between items-center">
                  <div className="h-3 bg-secondary rounded w-1/3" />
                  <div className="h-5 bg-secondary rounded w-1/4" />
                </div>
              </div>
            ))
          ) : filteredTrips.length === 0 ? (
            <div className="w-full text-center text-muted-foreground py-10 space-y-3 bg-card border border-border/40 rounded-3xl p-6">
              <p>{t("home.empty_trips")}</p>
              <Button variant="gradient" size="sm" className="rounded-xl" onClick={() => navigate("/trips/create")}>
                <Plus className="h-4 w-4 mr-1" /> {t("home.create_trip")}
              </Button>
            </div>
          ) : (
            filteredTrips.map((trip) => {
              const profile = profiles[trip.user_id];
              const spotsFilled = trip.spots_filled ?? 0;
              const spotsTotal = trip.spots_needed ?? 1;
              const budget = trip.budget_max != null ? `₹${trip.budget_max.toLocaleString("en-IN")}` : "Flexible";
              
              const diffTime = Math.abs(new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime());
              const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
              const durationText = `${durationDays} ${durationDays === 1 ? "Day" : "Days"}`;
              
              const city = trip.destination.split(",")[0];
              const imageBase = imageForDestination(trip.destination);
              const cleanImageUrl = imageBase.split("?")[0] + "?auto=format&fit=crop&w=500&h=350&q=80";

              return (
                <motion.div
                  key={trip.id}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ y: -4 }}
                  className="relative shrink-0 w-64 rounded-3xl bg-card border border-border/40 shadow-sm overflow-hidden flex flex-col cursor-pointer transition-all duration-300 group hover:shadow-md text-left"
                  onClick={() => navigate("/trips")}
                >
                  <div className="relative h-32 w-full overflow-hidden">
                    <img src={cleanImageUrl} alt={city} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 bg-black/45 backdrop-blur-md text-[9px] font-bold text-white rounded-full uppercase tracking-wider">
                        {trip.trip_type || "Adventure"}
                      </span>
                    </div>
                    
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-0.5 bg-primary-foreground/95 backdrop-blur-md text-[9px] font-bold text-foreground rounded-full flex items-center gap-0.5 shadow-sm">
                        <Clock className="h-2.5 w-2.5 text-primary" /> {durationText}
                      </span>
                    </div>

                    <div className="absolute bottom-2 left-3 right-3 text-white text-left">
                      <h3 className="font-heading font-extrabold text-sm truncate drop-shadow">{city}</h3>
                    </div>
                  </div>

                  <div className="p-3 flex-grow flex flex-col justify-between space-y-2.5 bg-card text-left">
                    <div className="flex items-center gap-1.5">
                      <img 
                        src={profile?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + trip.user_id} 
                        alt={profile?.display_name || "Traveler"} 
                        className="h-5 w-5 rounded-full object-cover border border-border/40" 
                      />
                      <span className="text-[10px] text-muted-foreground truncate font-medium">
                        Hosted by <strong className="text-foreground font-semibold">{profile?.display_name || "Traveler"}</strong>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-medium border-t border-border/40 pt-2">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider">Est. Budget</span>
                        <span className="text-foreground font-bold text-[11px]">{budget}</span>
                      </div>

                      <div className="flex flex-col items-end">
                        <span className="text-[8px] text-muted-foreground font-semibold uppercase tracking-wider">Joined Status</span>
                        <span className="inline-flex items-center gap-0.5 bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-bold text-[9px]">
                          <Users className="h-2.5 w-2.5 mr-0.5 text-primary" /> {spotsFilled}/{spotsTotal}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
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
