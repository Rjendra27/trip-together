import {
  Search,
  SlidersHorizontal,
  Plus,
  Sparkles,
  TrendingUp,
  Loader2,
  ShieldCheck,
  Compass,
  MapPin,
  Users,
  Calendar,
  IndianRupee,
  Clock,
  ArrowRight,
  Smile,
  Languages,
  Heart,
  ChevronRight,
  UserCheck,
  Sparkle
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import TripCard from "@/components/TripCard";
import { useAuth } from "@/contexts/AuthContext";
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

interface CompanionProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  age: number | null;
  location: string | null;
  interests: string[] | null;
  is_available: boolean;
  verification_badge: boolean | null;
  id_verified: boolean | null;
  languages: string[];
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric" });

const CATEGORIES = [
  { emoji: "🏔️", key: "adventure" },
  { emoji: "🏖️", key: "beach" },
  { emoji: "🥾", key: "trekking" },
  { emoji: "🪔", key: "festival" },
  { emoji: "🛕", key: "temple" },
  { emoji: "🎒", key: "weekend" },
  { emoji: "🍜", key: "food" },
  { emoji: "💸", key: "budget" },
  { emoji: "👥", key: "group" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  // Core Data States
  const [trips, setTrips] = useState<DbTrip[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string | null; avatar_url: string | null; verification_badge: boolean | null; id_verified: boolean | null }>>({});
  const [companions, setCompanions] = useState<CompanionProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Authenticated Dashboard Stats States
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    createdCount: 0,
    matchesCount: 0,
    wishlistCount: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Advanced Filtering States
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [budgetRange, setBudgetRange] = useState<string>("all"); // all, budget (<=5k), medium (5k-15k), premium (15k+)
  const [timeframe, setTimeframe] = useState<string>("all"); // all, soon (next 14d), month (next 30d), future
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Load Main Feed & Profiles
  const loadMainFeed = async () => {
    try {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      const list = (data || []) as DbTrip[];
      setTrips(list);

      const ids = [...new Set(list.map((t) => t.user_id))];
      if (ids.length) {
        const { data: profs, error: profsError } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, verification_badge, id_verified")
          .in("user_id", ids);

        if (profsError) throw profsError;

        const map: Record<string, { display_name: string | null; avatar_url: string | null; verification_badge: boolean | null; id_verified: boolean | null }> = {};
        (profs || []).forEach((p: any) => {
          map[p.user_id] = p;
        });
        setProfiles(map);
      }
    } catch (err: any) {
      console.error("Error loading home feed:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load Dashboard Stats (for logged-in user)
  const loadDashboardStats = async () => {
    if (!user) return;
    setStatsLoading(true);
    try {
      // 1. Get user profile
      const { data: prof, error: profError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profError) throw profError;
      setProfile(prof);

      // 2. Count created trips
      const { count: cCount, error: cErr } = await supabase
        .from("trips")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (cErr) throw cErr;

      // 3. Count accepted matches
      const { count: mCount, error: mErr } = await supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .or(`user_id.eq.${user.id},matched_user_id.eq.${user.id}`)
        .eq("status", "accepted");
      if (mErr) throw mErr;

      // 4. Count bookmarked trips
      const { count: bCount, error: bErr } = await supabase
        .from("bookmarks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (bErr) throw bErr;

      setStats({
        createdCount: cCount || 0,
        matchesCount: mCount || 0,
        wishlistCount: bCount || 0,
      });
    } catch (err: any) {
      console.error("Error loading dashboard stats:", err.message);
    } finally {
      setStatsLoading(false);
    }
  };

  // Load Travel Companions (excluding self)
  const loadCompanions = async () => {
    try {
      let query = supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, bio, age, location, interests, is_available, verification_badge, id_verified, languages")
        .eq("is_available", true)
        .limit(10);

      if (user) {
        query = query.neq("user_id", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCompanions((data || []) as CompanionProfile[]);
    } catch (err: any) {
      console.error("Error loading companions:", err.message);
    }
  };

  // Run on mount and state modifications
  useEffect(() => {
    loadMainFeed();
    loadCompanions();
    if (user) {
      loadDashboardStats();
    } else {
      setProfile(null);
      setStats({ createdCount: 0, matchesCount: 0, wishlistCount: 0 });
    }

    // Subscribe to realtime changes on trips
    const channel = supabase
      .channel("home-trips-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, () => {
        loadMainFeed();
        if (user) loadDashboardStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Compute profile completion percentage
  const profileCompletion = useMemo(() => {
    if (!profile) return 0;
    const fields = [
      profile.display_name,
      profile.bio,
      profile.age,
      profile.location,
      profile.avatar_url,
      profile.cover_url,
      profile.travel_style,
      profile.languages && profile.languages.length > 0,
      profile.interests && profile.interests.length > 0,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [profile]);

  // Filter Trips in-memory
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      // 1. Destination Text Search
      if (search && !trip.destination.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }

      // 2. Travel Style Category
      if (selectedCategory && trip.trip_type !== selectedCategory) {
        return false;
      }

      // 3. Budget Filter logic
      if (budgetRange !== "all") {
        const max = trip.budget_max ?? 0;
        const min = trip.budget_min ?? 0;
        if (budgetRange === "budget") {
          if (max > 5000 || max === 0) return false;
        } else if (budgetRange === "medium") {
          if (max < 5000 || min > 15000) return false;
        } else if (budgetRange === "premium") {
          if (min < 15000 && max < 15000) return false;
        }
      }

      // 4. Timeframe filter logic
      if (timeframe !== "all") {
        const daysDiff = Math.ceil(
          (new Date(trip.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (timeframe === "soon") {
          if (daysDiff < 0 || daysDiff > 14) return false;
        } else if (timeframe === "month") {
          if (daysDiff < 0 || daysDiff > 30) return false;
        } else if (timeframe === "future") {
          if (daysDiff <= 30) return false;
        }
      }

      // 5. Verified Creator filter logic
      if (verifiedOnly) {
        const creator = profiles[trip.user_id];
        const isVerified = !!(creator?.verification_badge || creator?.id_verified);
        if (!isVerified) return false;
      }

      return true;
    });
  }, [trips, search, selectedCategory, budgetRange, timeframe, verifiedOnly, profiles]);

  const clearAllFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setBudgetRange("all");
    setTimeframe("all");
    setVerifiedOnly(false);
    toast.success("Filters cleared successfully!");
  };

  return (
    <div className="min-h-screen pb-28 bg-background relative overflow-x-hidden">
      {/* Decorative Top Glows for High-End Dashboard Styling */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[350px] bg-gradient-radial from-primary/15 via-transparent to-transparent -z-10 blur-3xl pointer-events-none" />
      <div className="absolute -top-[120px] -right-[120px] w-[300px] h-[300px] bg-accent/8 rounded-full -z-10 blur-3xl pointer-events-none" />

      {/* Top Professional Header Canvas */}
      <div className="pt-8 pb-6 px-4 md:px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs text-primary font-semibold mb-2 shadow-sm animate-pulse">
              <Sparkles className="h-3.5 w-3.5" />
              {t("home.online_count", "{{count}} travelers active").replace("{{count}}", "1,247")}
            </span>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {profile ? `Hello, ${profile.display_name?.split("@")[0] || "Traveler"}! 👋` : t("home.headline", "Never travel alone again")}
            </h1>
            <p className="text-muted-foreground text-sm max-w-lg mt-1.5">
              {profile
                ? "Explore matching travel opportunities, verified companions, and manage your trips all in one professional space."
                : t("home.subhead", "Match with verified travelers heading the same way. Plan trips, split costs, make memories.")}
            </p>
          </div>

          {!user && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="gradient"
                size="lg"
                className="rounded-full shadow-glow font-medium text-sm gap-2"
                onClick={() => navigate("/auth")}
              >
                <Compass className="h-4.5 w-4.5" /> Start Exploring
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 space-y-6">
        {/* Dynamic Personal Travel Dashboard (Authenticated User) */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, type: "spring" }}
            className="w-full"
          >
            {statsLoading ? (
              <div className="w-full bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 flex items-center justify-center h-44 shadow-card">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : (
              <div className="relative overflow-hidden w-full bg-gradient-card border border-border/55 rounded-3xl p-5 md:p-6 shadow-card hover:shadow-elevated transition-shadow duration-300">
                {/* Premium Gradient Grid Inside Dashboard */}
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-primary/10 to-transparent -z-10 blur-2xl pointer-events-none" />

                <div className="flex flex-col md:flex-row gap-6 items-stretch justify-between relative z-10">
                  {/* Left Column: Avatar & Profile Completion */}
                  <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start text-center sm:text-left">
                    <div className="relative shrink-0">
                      <img
                        src={profile?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user.id}
                        alt="Profile Avatar"
                        className="h-16 w-16 rounded-2xl object-cover border-2 border-background ring-4 ring-primary/15"
                      />
                      {(profile?.verification_badge || profile?.id_verified) && (
                        <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-1 rounded-lg shadow-card">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 justify-center sm:justify-start">
                        <h2 className="font-heading text-lg font-bold text-foreground tracking-tight truncate">
                          {profile?.display_name || user.email}
                        </h2>
                        {profile?.is_available ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full font-medium text-[10px] w-fit mx-auto sm:mx-0">
                            Available to Travel
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="rounded-full text-[10px] w-fit mx-auto sm:mx-0">
                            Away
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 italic max-w-sm">
                        {profile?.bio || "No bio added yet. Tell travelers about your style!"}
                      </p>

                      {/* Profile Completion Indicator */}
                      <div className="w-full space-y-1 pt-1.5">
                        <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                          <span>Profile Completion</span>
                          <span className="text-primary">{profileCompletion}%</span>
                        </div>
                        <Progress value={profileCompletion} className="h-1.5 bg-secondary/80 [&>div]:bg-gradient-primary" />
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 grow max-w-md items-center justify-center">
                    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-secondary/50 border border-border/40 hover:bg-secondary/70 transition-colors cursor-pointer" onClick={() => navigate("/my-trips")}>
                      <span className="text-xs text-muted-foreground font-medium mb-1">My Trips</span>
                      <span className="font-heading text-xl font-bold text-foreground tracking-tight">{stats.createdCount}</span>
                    </div>

                    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-secondary/50 border border-border/40 hover:bg-secondary/70 transition-colors cursor-pointer" onClick={() => navigate("/matches")}>
                      <span className="text-xs text-muted-foreground font-medium mb-1">Matches</span>
                      <span className="font-heading text-xl font-bold text-foreground tracking-tight">{stats.matchesCount}</span>
                    </div>

                    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-secondary/50 border border-border/40 hover:bg-secondary/70 transition-colors cursor-pointer" onClick={() => navigate("/profile")}>
                      <span className="text-xs text-muted-foreground font-medium mb-1">Wishlist</span>
                      <span className="font-heading text-xl font-bold text-foreground tracking-tight">{stats.wishlistCount}</span>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-row md:flex-col gap-2 items-center justify-center sm:justify-start">
                    <Button
                      variant="gradient"
                      size="sm"
                      className="rounded-xl shadow-glow font-medium text-xs gap-1 w-full"
                      onClick={() => navigate("/trips/create")}
                    >
                      <Plus className="h-4 w-4" /> Create Trip
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl font-medium text-xs w-full bg-background"
                      onClick={() => navigate("/profile")}
                    >
                      View Profile
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Guest Welcome Banner (Unauthenticated User) */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full overflow-hidden bg-gradient-card border border-border/55 rounded-3xl p-6 shadow-card hover:shadow-elevated transition-shadow duration-300 relative"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-radial from-accent/10 to-transparent -z-10 blur-2xl pointer-events-none" />
            <div className="flex flex-col md:flex-row gap-5 items-center justify-between">
              <div className="space-y-1 text-center md:text-left">
                <h2 className="font-heading text-lg font-bold text-foreground flex items-center gap-1.5 justify-center md:justify-start">
                  <UserCheck className="h-5 w-5 text-primary" /> Join 1,200+ Verified Travelers in India
                </h2>
                <p className="text-muted-foreground text-xs max-w-xl">
                  Unlock access to custom traveler match-making, identity-verified trust scores, direct secure messaging, and group cost-splitting features instantly.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" className="rounded-xl text-xs font-semibold bg-background" onClick={() => navigate("/auth")}>
                  Sign In
                </Button>
                <Button variant="gradient" className="rounded-xl text-xs font-semibold shadow-glow" onClick={() => navigate("/auth?mode=signup")}>
                  Register Free
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Premium Multi-Input Search & Advanced Filter Console */}
        <div className="bg-card/75 backdrop-blur-xl border border-border/60 rounded-3xl p-4 md:p-5 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1 flex items-center bg-secondary/50 rounded-2xl px-3 py-1 border border-border/40 focus-within:border-primary/45 transition-colors">
              <Search className="h-4.5 w-4.5 text-muted-foreground mr-2 shrink-0" />
              <Input
                placeholder={t("home.search_placeholder", "Where do you want to go?")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm py-1.5 placeholder:text-muted-foreground/75"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="p-1 rounded-full hover:bg-secondary text-muted-foreground"
                >
                  <Loader2 className="h-3 w-3 animate-spin hidden" />
                  <span className="text-[10px] font-bold">X</span>
                </button>
              )}
            </div>

            {/* Filter Toggle Buttons */}
            <div className="flex gap-2 shrink-0 justify-end">
              <Button
                variant={showFiltersPanel ? "secondary" : "outline"}
                className="rounded-2xl gap-1.5 text-xs font-semibold bg-background border-border/60 py-5"
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filters</span>
                {(budgetRange !== "all" || timeframe !== "all" || verifiedOnly) && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    !
                  </span>
                )}
              </Button>

              {(search || selectedCategory || budgetRange !== "all" || timeframe !== "all" || verifiedOnly) && (
                <Button
                  variant="ghost"
                  className="rounded-2xl text-xs font-semibold text-muted-foreground hover:text-foreground"
                  onClick={clearAllFilters}
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Expanding Filter Panel */}
          <AnimatePresence>
            {showFiltersPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden border-t border-border/45 pt-4 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Budget Ranges */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase flex items-center gap-1">
                      <IndianRupee className="h-3.5 w-3.5 text-primary" /> Budget Preference
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "All Budgets", value: "all" },
                        { label: "Under ₹5k", value: "budget" },
                        { label: "₹5k - ₹15k", value: "medium" },
                        { label: "₹15k+", value: "premium" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setBudgetRange(opt.value)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            budgetRange === opt.value
                              ? "bg-primary text-primary-foreground border-primary shadow-glow"
                              : "bg-secondary/40 text-muted-foreground border-border/40 hover:bg-secondary/70 hover:text-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Timeframe Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> Departure Timing
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "Anytime", value: "all" },
                        { label: "Next 2 Weeks", value: "soon" },
                        { label: "Next 30 Days", value: "month" },
                        { label: "Future Trips", value: "future" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setTimeframe(opt.value)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            timeframe === opt.value
                              ? "bg-primary text-primary-foreground border-primary shadow-glow"
                              : "bg-secondary/40 text-muted-foreground border-border/40 hover:bg-secondary/70 hover:text-foreground"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trust Verified Only Toggle */}
                  <div className="space-y-1.5 flex flex-col justify-start">
                    <label className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase flex items-center gap-1 mb-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Safety & Credibility
                    </label>
                    <button
                      onClick={() => setVerifiedOnly(!verifiedOnly)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all w-fit ${
                        verifiedOnly
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/35 shadow-sm font-bold"
                          : "bg-secondary/40 text-muted-foreground border-border/40 hover:bg-secondary/70"
                      }`}
                    >
                      <ShieldCheck className={`h-4.5 w-4.5 ${verifiedOnly ? "text-emerald-600" : "text-muted-foreground"}`} />
                      <span>Verified Hosts Only</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Travel Category Quick Chips */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pt-1">
            <button
              onClick={() => setSelectedCategory("")}
              className={`shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                selectedCategory === ""
                  ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow"
                  : "bg-background text-muted-foreground border-border/60 hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <span>🌐 All Styles</span>
            </button>
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setSelectedCategory(cat.key)}
                  className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    active
                      ? "bg-gradient-primary text-primary-foreground border-transparent shadow-glow"
                      : "bg-background text-muted-foreground border-border/60 hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span className="capitalize">{t(`categories.${cat.key}`, cat.key)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Verified Spoken-Language Companions Section */}
        {companions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-1.5 tracking-tight">
                  <Sparkle className="h-4.5 w-4.5 text-primary" /> Ideal Travel Companions
                </h3>
                <p className="text-muted-foreground text-xs">
                  Connect with active verified travelers who match your vibe and language.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary-glow font-semibold text-xs gap-0.5"
                onClick={() => navigate("/matches")}
              >
                <span>Find Matches</span> <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 pt-1 -mx-4 px-4">
              {companions.map((comp) => (
                <motion.div
                  key={comp.user_id}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/profile?id=${comp.user_id}`)}
                  className="shrink-0 w-[240px] bg-gradient-card border border-border/50 rounded-2xl p-4 shadow-card hover:shadow-elevated transition-all cursor-pointer space-y-3 flex flex-col justify-between"
                >
                  <div className="flex gap-3 items-start">
                    <div className="relative shrink-0">
                      <img
                        src={comp.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + comp.user_id}
                        alt={comp.display_name || "Companion"}
                        className="h-11 w-11 rounded-xl object-cover border border-background ring-2 ring-primary/10"
                      />
                      {(comp.verification_badge || comp.id_verified) && (
                        <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground p-0.5 rounded-md shadow-card">
                          <ShieldCheck className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-heading font-bold text-sm text-foreground truncate flex items-center gap-1">
                        {comp.display_name?.split("@")[0] || "Traveler"}
                        {comp.age && <span className="font-body text-xs text-muted-foreground font-normal">, {comp.age}</span>}
                      </h4>
                      {comp.location ? (
                        <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3 text-primary/75 shrink-0" />
                          <span className="truncate">{comp.location}</span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-muted-foreground block mt-0.5">Active Buddy</span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-2 min-h-[32px] italic leading-relaxed">
                    "{comp.bio || "Available to partner and explore incredible destinations together."}"
                  </p>

                  <div className="space-y-1.5 pt-1 border-t border-border/35">
                    {/* Languages */}
                    {comp.languages && comp.languages.length > 0 && (
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                        <Languages className="h-3 w-3 shrink-0 text-primary" />
                        <span className="truncate capitalize font-medium">{comp.languages.slice(0, 3).join(", ")}</span>
                      </div>
                    )}
                    {/* Interests */}
                    {comp.interests && comp.interests.length > 0 && (
                      <div className="flex gap-1 overflow-hidden">
                        {comp.interests.slice(0, 2).map((interest, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="bg-secondary/40 text-[9px] text-muted-foreground px-1.5 py-0 rounded-md font-medium capitalize"
                          >
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Popular Gateways Carousel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-1.5 tracking-tight">
              <MapPin className="h-4.5 w-4.5 text-primary" /> {t("home.popular_in_india", "Popular in India")}
            </h3>
          </div>

          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
            {POPULAR_DESTINATIONS.map((dest) => (
              <motion.div
                key={dest.name}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="relative shrink-0 w-44 h-26 rounded-2xl overflow-hidden cursor-pointer shadow-card hover:shadow-elevated transition-shadow duration-300"
                onClick={() => navigate(`/trips?search=${encodeURIComponent(dest.name)}`)}
              >
                <img
                  src={dest.image}
                  alt={dest.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 text-white">
                  <span className="text-[10px] text-white/80 font-bold tracking-wider uppercase block">Gateway</span>
                  <p className="text-xs font-bold truncate flex items-center gap-1">
                    <span>{dest.emoji}</span> <span>{dest.name}</span>
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Professional Filtered Trips Feed Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-1.5 tracking-tight">
                <TrendingUp className="h-4.5 w-4.5 text-primary" />
                {t("home.trending", "Active Trip Opportunities")}
              </h3>
              <p className="text-muted-foreground text-xs">
                Explore plans matching your selected criteria. Verify budgets and details to join.
              </p>
            </div>
            {filteredTrips.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary-glow font-semibold text-xs gap-0.5"
                onClick={() => navigate("/trips")}
              >
                <span>{t("home.see_all", "See All")}</span> <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className="bg-card border border-border/50 rounded-3xl p-4 space-y-4 animate-pulse">
                  <div className="h-48 w-full bg-secondary/80 rounded-2xl" />
                  <div className="h-4 w-2/3 bg-secondary/80 rounded" />
                  <div className="flex gap-2">
                    <div className="h-8 w-8 rounded-full bg-secondary/80" />
                    <div className="h-4 w-1/2 bg-secondary/80 rounded my-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTrips.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center bg-card/65 backdrop-blur-xl border border-border/50 rounded-3xl py-12 px-6 space-y-4 shadow-card max-w-lg mx-auto"
            >
              <div className="mx-auto h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-xl">
                🎒
              </div>
              <div className="space-y-1.5">
                <h4 className="font-heading font-bold text-base text-foreground">No Trips Match Your Filters</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Try adjusting or clearing your search console filters, or be the first traveler to create an adventure!
                </p>
              </div>
              <div className="flex gap-2 items-center justify-center">
                <Button variant="outline" size="sm" className="rounded-xl text-xs font-semibold bg-background" onClick={clearAllFilters}>
                  Clear Filters
                </Button>
                <Button variant="gradient" size="sm" className="rounded-xl text-xs font-semibold shadow-glow" onClick={() => navigate("/trips/create")}>
                  <Plus className="h-4 w-4 mr-1" /> {t("home.create_trip", "Create Trip")}
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {filteredTrips.map((trip) => {
                const profile = profiles[trip.user_id];
                const spotsLeft = Math.max(0, (trip.spots_needed ?? 1) - (trip.spots_filled ?? 0));
                const budget =
                  trip.budget_min != null && trip.budget_max != null
                    ? `₹${trip.budget_min.toLocaleString("en-IN")} - ₹${trip.budget_max.toLocaleString("en-IN")}`
                    : "Flexible";
                const isVerified = !!(profile?.verification_badge || profile?.id_verified);

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
                    creatorName={profile?.display_name?.split("@")[0] || "Traveler"}
                    creatorAvatar={profile?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + trip.user_id}
                    verified={isVerified}
                    onClick={() => navigate(`/trips/${trip.id}`)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button (FAB) for Creating Trip Plans */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        className="fixed bottom-24 right-4 z-40"
      >
        <Button
          variant="gradient"
          size="icon"
          className="h-14 w-14 rounded-full shadow-glow"
          onClick={() => navigate("/trips/create")}
          aria-label="Create new trip plan"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </motion.div>
    </div>
  );
}
