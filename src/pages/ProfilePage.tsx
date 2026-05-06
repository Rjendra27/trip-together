import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Settings, Shield, Star, Edit, LogOut, Bell, ChevronRight, Lock,
  Loader2, ShieldCheck, Heart, CheckCircle2, Globe, Users, Compass, Wallet,
  PhoneCall, Calendar, Sparkles, BadgeCheck, CircleDot
} from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ReviewsSection from "@/components/ReviewsSection";
import EditProfileDialog from "@/components/EditProfileDialog";
import PhoneVerificationDialog from "@/components/PhoneVerificationDialog";
import { toast } from "sonner";

const MENU_ITEMS = [
  { icon: Bell, label: "Notifications", path: "/notifications" },
  { icon: Lock, label: "Privacy & Safety", path: "#" },
  { icon: Settings, label: "Settings", path: "#" },
];

interface Profile {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  age: number | null;
  interests: string[] | null;
  avatar_url: string | null;
  phone_number: string | null;
  phone_verified: boolean | null;
  id_verified: boolean | null;
  verification_badge: boolean | null;
  is_available: boolean | null;
  languages: string[] | null;
  preferred_group_size: string | null;
  budget_preference: string | null;
  travel_style: string | null;
  created_at: string | null;
}

interface UserContact {
  phone_number: string | null;
  phone_verified: boolean | null;
}

interface TripRow {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  completed: boolean | null;
  user_id: string;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);

  // Stats & trip data
  const [myTrips, setMyTrips] = useState<TripRow[]>([]);
  const [wishlist, setWishlist] = useState<TripRow[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [emergencyCount, setEmergencyCount] = useState(0);
  const [mutualInterests, setMutualInterests] = useState<string[]>([]);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const profileCols = "user_id, display_name, bio, location, age, interests, avatar_url, id_verified, verification_badge, is_available, languages, preferred_group_size, budget_preference, travel_style, created_at";
    const { data, error } = await supabase
      .from("profiles")
      .select(profileCols)
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: contact } = await supabase
      .from("user_contacts")
      .select("phone_number, phone_verified")
      .eq("user_id", user.id)
      .maybeSingle<UserContact>();

    if (error) {
      toast.error("Failed to load profile");
    } else if (!data) {
      const { data: created, error: insertErr } = await supabase
        .from("profiles")
        .insert({ user_id: user.id, display_name: user.email })
        .select(profileCols)
        .maybeSingle();
      if (insertErr) {
        toast.error("Failed to create profile");
      } else if (created) {
        setProfile({
          ...(created as any),
          phone_number: contact?.phone_number ?? null,
          phone_verified: contact?.phone_verified ?? null,
        });
      }
    } else {
      setProfile({
        ...(data as any),
        phone_number: contact?.phone_number ?? null,
        phone_verified: contact?.phone_verified ?? null,
      });
    }
    setLoading(false);
  }, [user]);

  const loadStatsAndTrips = useCallback(async () => {
    if (!user) return;

    // Trips owned by the user
    const { data: trips } = await supabase
      .from("trips")
      .select("id, destination, start_date, end_date, completed, user_id")
      .eq("user_id", user.id)
      .order("start_date", { ascending: false });
    setMyTrips((trips as TripRow[]) ?? []);

    // Bookmarked / wishlist trips
    const { data: bookmarks } = await supabase
      .from("bookmarks")
      .select("trip_id")
      .eq("user_id", user.id);
    const tripIds = (bookmarks ?? []).map((b: any) => b.trip_id);
    if (tripIds.length) {
      const { data: bmTrips } = await supabase
        .from("trips")
        .select("id, destination, start_date, end_date, completed, user_id")
        .in("id", tripIds);
      setWishlist((bmTrips as TripRow[]) ?? []);
    } else {
      setWishlist([]);
    }

    // Match count (accepted matches involving this user)
    const { count: mCount } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(`user_id.eq.${user.id},matched_user_id.eq.${user.id}`)
      .eq("status", "accepted");
    setMatchCount(mCount ?? 0);

    // Reviews received
    const { count: rCount } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("reviewed_user_id", user.id);
    setReviewCount(rCount ?? 0);

    // Emergency contacts present?
    const { count: eCount } = await supabase
      .from("emergency_contacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    setEmergencyCount(eCount ?? 0);
  }, [user]);

  const loadMutualInterests = useCallback(async () => {
    if (!user || !profile?.interests?.length) {
      setMutualInterests([]);
      return;
    }
    // Find accepted matches and intersect interests
    const { data: matches } = await supabase
      .from("matches")
      .select("user_id, matched_user_id")
      .or(`user_id.eq.${user.id},matched_user_id.eq.${user.id}`)
      .eq("status", "accepted");
    const peerIds = (matches ?? [])
      .map((m: any) => (m.user_id === user.id ? m.matched_user_id : m.user_id));
    if (!peerIds.length) {
      setMutualInterests([]);
      return;
    }
    const { data: peers } = await supabase
      .from("profiles")
      .select("interests")
      .in("user_id", peerIds);
    const peerInterests = new Set<string>();
    (peers ?? []).forEach((p: any) => (p.interests ?? []).forEach((i: string) => peerInterests.add(i)));
    const mine = new Set(profile.interests ?? []);
    setMutualInterests([...mine].filter(i => peerInterests.has(i)));
  }, [user, profile?.interests]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    loadProfile();
  }, [authLoading, user, loadProfile, navigate]);

  useEffect(() => {
    if (user) loadStatsAndTrips();
  }, [user, loadStatsAndTrips]);

  useEffect(() => {
    loadMutualInterests();
  }, [loadMutualInterests]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const toggleAvailability = async (next: boolean) => {
    if (!profile) return;
    setAvailabilityBusy(true);
    const prev = profile.is_available;
    setProfile({ ...profile, is_available: next });
    const { error } = await supabase
      .from("profiles")
      .update({ is_available: next })
      .eq("user_id", profile.user_id);
    setAvailabilityBusy(false);
    if (error) {
      setProfile({ ...profile, is_available: prev });
      toast.error("Could not update availability");
    } else {
      toast.success(next ? "You're available to travel" : "Marked as busy");
    }
  };

  const markTripCompleted = async (tripId: string) => {
    const { error } = await supabase.from("trips").update({ completed: true }).eq("id", tripId);
    if (error) {
      toast.error("Could not mark complete");
    } else {
      toast.success("Trip marked completed");
      loadStatsAndTrips();
    }
  };

  if (authLoading || loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcomingTrips = myTrips.filter(t => !t.completed && t.start_date > today);
  const currentTrips = myTrips.filter(t => !t.completed && t.start_date <= today && t.end_date >= today);
  const pastTrips = myTrips.filter(t => t.completed || t.end_date < today);

  const isVerified = !!(profile.phone_verified || profile.verification_badge);
  const profileComplete =
    !!profile.display_name && !!profile.bio && !!profile.location && (profile.interests?.length ?? 0) > 0;

  // Trust Score (0-100): phone 30 + completed trips 30 + reviews 30 + profile completeness 10
  const completedTripsCount = myTrips.filter(t => t.completed || t.end_date < today).length;
  const phoneScore = profile.phone_verified ? 30 : 0;
  const tripsScore = Math.min(completedTripsCount, 3) * 10; // 30 at 3+ trips
  const reviewsScore = Math.min(reviewCount, 3) * 10; // 30 at 3+ reviews
  const completenessScore = profileComplete ? 10 : Math.round(
    ((profile.display_name ? 1 : 0) +
      (profile.bio ? 1 : 0) +
      (profile.location ? 1 : 0) +
      ((profile.interests?.length ?? 0) > 0 ? 1 : 0)) * 2.5
  );
  const trustScore = phoneScore + tripsScore + reviewsScore + completenessScore;
  const trustTier: "New" | "Verified" | "Trusted" =
    trustScore >= 80 ? "Trusted" : trustScore >= 50 ? "Verified" : "New";
  const trustedTraveler = trustTier === "Trusted";

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "—";

  const stats = [
    { label: "Joined", value: myTrips.length.toString(), icon: Compass },
    { label: "Completed", value: pastTrips.length.toString(), icon: CheckCircle2 },
    { label: "Matches", value: matchCount.toString(), icon: Users },
    { label: "Reviews", value: reviewCount.toString(), icon: Star },
  ];

  const formatRange = (s: string, e: string) => {
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${new Date(s).toLocaleDateString(undefined, opts)} – ${new Date(e).toLocaleDateString(undefined, opts)}`;
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="relative">
        <div className="h-36 bg-gradient-primary" />
        <div className="px-4">
          <div className="relative -mt-16 flex items-end gap-4">
            <div className="relative">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name ?? "Profile"}
                  className="h-24 w-24 rounded-2xl border-4 border-card object-cover shadow-elevated"
                />
              ) : (
                <div className="h-24 w-24 rounded-2xl border-4 border-card bg-muted flex items-center justify-center text-3xl shadow-elevated">
                  {(profile.display_name ?? "?").charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card ${
                  profile.is_available ? "bg-emerald-500" : "bg-muted-foreground"
                }`}
                title={profile.is_available ? "Available" : "Busy"}
              >
                <CircleDot className="h-2.5 w-2.5 text-primary-foreground" />
              </span>
            </div>
            <div className="pb-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-xl font-bold truncate">
                  {profile.display_name || "Unnamed"}
                </h1>
                {isVerified && <Shield className="h-4 w-4 text-accent shrink-0" />}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {profile.location || "Add location"}
                {profile.age && <span className="ml-1">· {profile.age}</span>}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Calendar className="h-3 w-3" /> Member since {memberSince}
              </p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => setEditOpen(true)}>
              <Edit className="h-3 w-3" /> Edit
            </Button>
          </div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-4 mt-6 space-y-6">
        {/* Travel Stats */}
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-accent" />
            <h2 className="font-heading text-sm font-semibold">Travel Stats</h2>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {stats.map(stat => (
              <div key={stat.label} className="rounded-xl bg-secondary/40 p-2.5 text-center">
                <stat.icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <div className="font-heading text-lg font-bold leading-none">{stat.value}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Score */}
        <div className="rounded-2xl bg-card p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" />
              <h2 className="font-heading text-sm font-semibold">Trust Score</h2>
            </div>
            <Badge
              variant="outline"
              className={
                trustTier === "Trusted"
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : trustTier === "Verified"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-muted-foreground/30 text-muted-foreground"
              }
            >
              {trustTier}
            </Badge>
          </div>
          <div className="flex items-end gap-3">
            <span className="font-heading text-3xl font-bold leading-none">{trustScore}</span>
            <span className="text-xs text-muted-foreground pb-1">/ 100</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-gradient-primary transition-all"
              style={{ width: `${trustScore}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>📱 Phone +{phoneScore}/30</span>
            <span>✈️ Trips +{tripsScore}/30</span>
            <span>⭐ Reviews +{reviewsScore}/30</span>
            <span>🧑 Profile +{completenessScore}/10</span>
          </div>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-card flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Availability</h3>
            <p className="text-xs text-muted-foreground">
              {profile.is_available ? "Available to travel" : "Busy now"}
            </p>
          </div>
          <Switch
            checked={!!profile.is_available}
            disabled={availabilityBusy}
            onCheckedChange={toggleAvailability}
          />
        </div>

        {/* Bio */}
        <div className="rounded-2xl bg-card p-4 shadow-card space-y-2">
          <h2 className="font-heading text-sm font-semibold">About</h2>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {profile.bio || "No bio yet. Tap Edit to add one."}
          </p>
        </div>

        {/* Interests */}
        <div className="space-y-2">
          <h2 className="font-heading text-sm font-semibold">Interests</h2>
          <div className="flex flex-wrap gap-2">
            {(profile.interests && profile.interests.length > 0) ? (
              profile.interests.map(interest => (
                <Badge key={interest} variant="secondary" className="rounded-full px-3 py-1">{interest}</Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No interests added yet.</p>
            )}
          </div>
        </div>

        {/* Mutual interests */}
        {mutualInterests.length > 0 && (
          <div className="rounded-2xl bg-card p-4 shadow-card space-y-2">
            <h2 className="font-heading text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" /> Mutual Interests with Matches
            </h2>
            <div className="flex flex-wrap gap-2">
              {mutualInterests.map(i => (
                <Badge key={i} className="rounded-full px-3 py-1 bg-accent/10 text-accent border-accent/20" variant="outline">{i}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Travel preferences */}
        <div className="rounded-2xl bg-card p-4 shadow-card space-y-3">
          <h2 className="font-heading text-sm font-semibold flex items-center gap-2">
            <Compass className="h-4 w-4 text-accent" /> Travel Preferences
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <PrefRow icon={Wallet} label="Budget" value={profile.budget_preference || "—"} />
            <PrefRow icon={Compass} label="Style" value={profile.travel_style || "—"} />
            <PrefRow icon={Users} label="Group size" value={profile.preferred_group_size || "—"} />
            <PrefRow icon={Globe} label="Languages" value={(profile.languages?.length ? profile.languages.join(", ") : "—")} />
          </div>
        </div>

        {/* Upcoming Trips */}
        {upcomingTrips.length > 0 && (
          <TripList title="Upcoming Trips" trips={upcomingTrips} formatRange={formatRange} />
        )}

        {/* Current Trips */}
        {currentTrips.length > 0 && (
          <TripList
            title="Current Trips"
            trips={currentTrips}
            formatRange={formatRange}
            actionLabel="Mark completed"
            onAction={markTripCompleted}
          />
        )}

        {/* Past / completed trips */}
        <div className="space-y-3">
          <h2 className="font-heading text-sm font-semibold">Past Trips</h2>
          {pastTrips.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-2xl bg-card p-4 shadow-card">
              No completed trips yet.
            </p>
          ) : (
            <div className="space-y-2">
              {pastTrips.map(t => (
                <div key={t.id} className="rounded-2xl bg-card p-3 shadow-card flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{t.destination}</p>
                    <p className="text-xs text-muted-foreground">{formatRange(t.start_date, t.end_date)}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Completed</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wishlist */}
        <div className="space-y-3">
          <h2 className="font-heading text-sm font-semibold flex items-center gap-2">
            <Heart className="h-4 w-4 text-accent" /> Wishlist
          </h2>
          {wishlist.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-2xl bg-card p-4 shadow-card">
              No saved trips yet. Bookmark trips to plan ahead.
            </p>
          ) : (
            <div className="space-y-2">
              {wishlist.map(t => (
                <div key={t.id} className="rounded-2xl bg-card p-3 shadow-card flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Heart className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{t.destination}</p>
                    <p className="text-xs text-muted-foreground">{formatRange(t.start_date, t.end_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reviews */}
        <ReviewsSection userId={profile.user_id} canReview={false} />

        {/* Verification & trust badges */}
        <div className="rounded-2xl bg-card p-4 shadow-card space-y-3">
          <h2 className="font-heading text-sm font-semibold flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-accent" /> Verification & Trust
          </h2>
          <div className="space-y-2">
            <VerifyRow icon="✉️" label="Email verified" ok={true} />
            <VerifyRow
              icon="📱"
              label={profile.phone_verified ? `Phone verified (${profile.phone_number})` : "Phone verified"}
              ok={!!profile.phone_verified}
              action={!profile.phone_verified ? <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" onClick={() => setPhoneOpen(true)}>Verify</Button> : undefined}
            />
            <VerifyRow icon="🪪" label="ID verified" ok={!!profile.id_verified} action={!profile.id_verified ? <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" disabled>Soon</Button> : undefined} />
            <VerifyRow icon="🧑" label="Profile complete" ok={profileComplete} />
            <VerifyRow icon="🛡️" label="Trusted traveler" ok={trustedTraveler} />
            <VerifyRow
              icon={<PhoneCall className="h-4 w-4" />}
              label={emergencyCount > 0 ? `${emergencyCount} emergency contact${emergencyCount > 1 ? "s" : ""}` : "Emergency contact"}
              ok={emergencyCount > 0}
            />
          </div>
        </div>

        {/* Admin link (only for admins) */}
        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="w-full rounded-2xl bg-gradient-primary text-primary-foreground shadow-elevated px-4 py-3.5 flex items-center gap-3 hover:opacity-90 transition-opacity"
          >
            <ShieldCheck className="h-5 w-5" />
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold">Admin Dashboard</p>
              <p className="text-xs opacity-90">Manage users, trips & reports</p>
            </div>
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Menu */}
        <div className="rounded-2xl bg-card shadow-card overflow-hidden divide-y divide-border">
          {MENU_ITEMS.map(item => (
            <button
              key={item.label}
              onClick={() => item.path !== "#" && navigate(item.path)}
              className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors text-left"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium flex-1">{item.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Sign out */}
        <Button variant="outline" className="w-full rounded-xl h-11 gap-2 text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </motion.div>

      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile as any}
        onSaved={loadProfile}
      />
      <PhoneVerificationDialog
        open={phoneOpen}
        onOpenChange={setPhoneOpen}
        userId={profile.user_id}
        onVerified={loadProfile}
      />
    </div>
  );
}

function PrefRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary/40 p-2.5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <p className="text-sm font-medium mt-1 capitalize truncate">{value}</p>
    </div>
  );
}

function VerifyRow({
  icon, label, ok, action,
}: {
  icon: React.ReactNode; label: string; ok: boolean; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="flex items-center gap-2">
        <span className="w-5 text-center">{icon}</span>
        <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      </span>
      {action ?? (
        ok ? <Shield className="h-4 w-4 text-accent" /> : <span className="text-xs text-muted-foreground">Pending</span>
      )}
    </div>
  );
}

function TripList({
  title, trips, formatRange, actionLabel, onAction,
}: {
  title: string;
  trips: TripRow[];
  formatRange: (s: string, e: string) => string;
  actionLabel?: string;
  onAction?: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-heading text-sm font-semibold">{title}</h2>
      <div className="space-y-2">
        {trips.map(t => (
          <div key={t.id} className="rounded-2xl bg-card p-3 shadow-card flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{t.destination}</p>
              <p className="text-xs text-muted-foreground">{formatRange(t.start_date, t.end_date)}</p>
            </div>
            {actionLabel && onAction && (
              <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg" onClick={() => onAction(t.id)}>
                {actionLabel}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
