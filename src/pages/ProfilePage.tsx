import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  MapPin, Settings, Shield, Star, Edit, LogOut, Bell, ChevronRight, Lock,
  Loader2, ShieldCheck, Heart, CheckCircle2, Globe, Users, Compass, Wallet,
  PhoneCall, Calendar, Sparkles, BadgeCheck, CircleDot, Camera, Mail,
  Award, Clock, Image, MessageCircle
} from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ReviewsSection from "@/components/ReviewsSection";
import EditProfileDialog from "@/components/EditProfileDialog";
import PhoneVerificationDialog from "@/components/PhoneVerificationDialog";
import LanguageSelector from "@/components/LanguageSelector";
import { toast } from "sonner";

const MENU_ITEMS = [
  { icon: Bell, label: "Notifications", path: "/notification-settings" },
  { icon: Lock, label: "Privacy & Safety", path: "/privacy-safety" },
  { icon: Settings, label: "Settings", path: "/settings" },
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
  cover_url: string | null;
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
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user, loading: authLoading, signOut } = useAuth();
  const targetUserId = searchParams.get("id") || user?.id;
  const isOwnProfile = !targetUserId || targetUserId === user?.id;
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
  const [coverUploading, setCoverUploading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"about" | "trips" | "reviews" | "photos">("about");
  const coverFileRef = useRef<HTMLInputElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile picture must be under 5MB");
      return;
    }
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${profile.user_id}/avatar-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);

      // Update avatar URL in public.profiles table
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("user_id", profile.user_id);

      if (updateErr) throw updateErr;

      setProfile({ ...profile, avatar_url: data.publicUrl });
      toast.success("Profile picture updated");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setAvatarUploading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Cover image must be under 5MB");
      return;
    }
    setCoverUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${profile.user_id}/cover-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("covers")
        .upload(path, file, { upsert: true });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from("covers").getPublicUrl(path);

      // Update cover URL in public.profiles table
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ cover_url: data.publicUrl })
        .eq("user_id", profile.user_id);

      if (updateErr) throw updateErr;

      setProfile({ ...profile, cover_url: data.publicUrl });
      toast.success("Cover photo updated");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setCoverUploading(false);
      if (coverFileRef.current) coverFileRef.current.value = "";
    }
  };

  const loadProfile = useCallback(async () => {
    if (!user || !targetUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const profileCols = "user_id, display_name, bio, location, age, interests, avatar_url, id_verified, verification_badge, is_available, languages, preferred_group_size, budget_preference, travel_style, created_at, cover_url, preferred_language";
    const { data, error } = await supabase
      .from("profiles")
      .select(profileCols)
      .eq("user_id", targetUserId)
      .maybeSingle();

    const { data: contact } = await supabase
      .from("user_contacts")
      .select("phone_number, phone_verified")
      .eq("user_id", targetUserId)
      .maybeSingle<UserContact>();

    if (error) {
      toast.error("Failed to load profile");
    } else if (!data && isOwnProfile) {
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
    } else if (data) {
      setProfile({
        ...(data as any),
        phone_number: contact?.phone_number ?? null,
        phone_verified: contact?.phone_verified ?? null,
      });
    } else {
      toast.error("Profile not found");
    }
    setLoading(false);
  }, [user, targetUserId, isOwnProfile]);

  const loadStatsAndTrips = useCallback(async () => {
    if (!user || !targetUserId) return;

    // Trips owned by the user
    const { data: trips } = await supabase
      .from("trips")
      .select("id, destination, start_date, end_date, completed, user_id")
      .eq("user_id", targetUserId)
      .order("start_date", { ascending: false });
    setMyTrips((trips as TripRow[]) ?? []);

    // Bookmarked / wishlist trips
    const { data: bookmarks } = await supabase
      .from("bookmarks")
      .select("trip_id")
      .eq("user_id", targetUserId);
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
      .or(`user_id.eq.${targetUserId},matched_user_id.eq.${targetUserId}`)
      .eq("status", "accepted");
    setMatchCount(mCount ?? 0);

    // Reviews received
    const { count: rCount } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("reviewed_user_id", targetUserId);
    setReviewCount(rCount ?? 0);

    // Emergency contacts present?
    const { count: eCount } = await supabase
      .from("emergency_contacts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", targetUserId);
    setEmergencyCount(eCount ?? 0);
  }, [user, targetUserId]);

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <div className="max-w-md space-y-4">
          <h2 className="font-heading text-2xl font-bold text-foreground">Profile Not Found</h2>
          <p className="text-muted-foreground">
            We couldn't load this profile. This can happen if the user doesn't exist or if there is a database column mismatch.
          </p>
          <Button className="rounded-xl px-6" onClick={() => navigate("/")}>
            Go to Home
          </Button>
        </div>
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
    { label: "Reviews", value: reviewCount.toString(), icon: Star },
  ];

  const formatRange = (s: string, e: string) => {
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${new Date(s).toLocaleDateString(undefined, opts)} – ${new Date(e).toLocaleDateString(undefined, opts)}`;
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Redesigned Cover Banner */}
      <div className="relative h-60 sm:h-76 md:h-84 w-full overflow-hidden rounded-b-[2.5rem] shadow-xl bg-neutral-950">
        {profile.cover_url ? (
          <img
            src={profile.cover_url}
            alt="Profile cover"
            className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
          />
        ) : (
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80"
            alt="Default cover"
            className="h-full w-full object-cover opacity-80"
          />
        )}

        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent z-10" />

        {/* Cover edit button */}
        {isOwnProfile && (
          <button
            type="button"
            onClick={() => coverFileRef.current?.click()}
            disabled={coverUploading}
            className="absolute top-4 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white text-black hover:bg-neutral-100 shadow-xl transition-all border border-neutral-200 cursor-pointer hover:scale-105 active:scale-95"
            title="Edit cover photo"
          >
            {coverUploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-black" />
            ) : (
              <Camera className="h-5 w-5 text-black" />
            )}
          </button>
        )}
      </div>

      {/* Profile Header Block */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5">
            {/* Circular Overlapping Avatar with Edit Button */}
            <div className="relative -mt-20 sm:-mt-24 h-32 w-32 sm:h-40 sm:w-40 rounded-full border-4 border-background bg-card shadow-2xl overflow-hidden group shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name ?? "Profile"}
                  className="h-full w-full object-cover rounded-full"
                />
              ) : (
                <div className="h-full w-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-5xl font-bold text-neutral-500 rounded-full">
                  {(profile.display_name ?? "?").charAt(0).toUpperCase()}
                </div>
              )}

              {/* Direct Avatar Camera Edit Overlay */}
              {isOwnProfile && (
                <button
                  type="button"
                  disabled={avatarUploading}
                  onClick={() => avatarFileRef.current?.click()}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                  title="Upload profile picture"
                >
                  {avatarUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6" />
                  )}
                </button>
              )}


              {/* Status Dot */}
              <span
                className={`absolute bottom-2.5 right-2.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-background z-20 shadow-md ${
                  profile.is_available ? "bg-emerald-500" : "bg-neutral-400"
                }`}
                title={profile.is_available ? "Available" : "Busy"}
              >
                <CircleDot className="h-2.5 w-2.5 text-white" />
              </span>
            </div>

            {/* User Identity Info */}
            <div className="space-y-1.5 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {profile.display_name || "Rajendra Reddy"}
                </h1>
                {isVerified && (
                  <ShieldCheck className="h-5.5 w-5.5 text-emerald-500 fill-emerald-500/10 shrink-0" />
                )}
                {profile.is_available && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/30 gap-1 rounded-full text-[10px] sm:text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t("profile.open_to_travel", "Open to travel")}
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{profile.location || "Hyderabad, India"}</span>
                <span className="opacity-40">•</span>
                <span>{profile.age ? t("profile.age_display", "{{age}} years old", { age: profile.age }) : t("profile.age_display_default", "21 years old")}</span>
              </p>

              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 font-semibold tracking-wide">
                {profile.travel_style || t("profile.default_travel_style", "Weekend Traveler")} • {profile.interests && profile.interests.length > 0 ? profile.interests.slice(0, 2).join(" & ") : "Trekking & Photography"}
              </p>
            </div>
          </div>

          {/* Edit Trigger - Modern LinkedIn Inspired Outlined Button */}
          {isOwnProfile ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              className="rounded-full border-primary/40 text-primary hover:bg-primary hover:text-white transition-all font-semibold gap-1.5 shrink-0 px-5 h-9"
            >
              <Edit className="h-3.5 w-3.5" /> {t("profile.edit", "Edit Profile")}
            </Button>
          ) : (
            <Button
              variant="gradient"
              size="sm"
              onClick={() => navigate("/chat", { state: { selectUserId: targetUserId } })}
              className="rounded-full font-semibold gap-1.5 shrink-0 px-6 h-9 shadow-glow"
            >
              <MessageCircle className="h-4 w-4" /> {t("profile.message", "Message")}
            </Button>
          )}
        </div>

        {/* Trust Badges pill-style row */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {profile.phone_verified && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 text-[10px] sm:text-xs font-semibold">
              <PhoneCall className="h-3 w-3" /> {t("profile.phone_verified", "Phone Verified")}
            </div>
          )}
          {trustedTraveler && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[10px] sm:text-xs font-semibold">
              <Award className="h-3 w-3" /> {t("profile.trusted_traveler", "Trusted Traveler")}
            </div>
          )}
          {profileComplete && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] sm:text-xs font-semibold">
              <CheckCircle2 className="h-3 w-3" /> {t("profile.profile_complete", "Profile Complete")}
            </div>
          )}
        </div>

        {/* Stats grid row */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-card border border-border p-3.5 rounded-2xl flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-xl font-extrabold leading-none">{matchCount}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{t("nav.matches", "Matches")}</div>
            </div>
          </div>

          <div className="bg-card border border-border p-3.5 rounded-2xl flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <Compass className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <div className="text-xl font-extrabold leading-none">{myTrips.length}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{t("profile.trips_created", "Trips Created")}</div>
            </div>
          </div>

          <div className="bg-card border border-border p-3.5 rounded-2xl flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-accent" />
            </div>
            <div>
              <div className="text-xl font-extrabold leading-none">{pastTrips.length}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{t("profile.completed_trips", "Completed")}</div>
            </div>
          </div>

          <div className="bg-card border border-border p-3.5 rounded-2xl flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="h-10 w-10 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
              <Star className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <div className="text-xl font-extrabold leading-none">{reviewCount}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{t("profile.reviews", "Reviews")}</div>
            </div>
          </div>

          <div className="col-span-2 md:col-span-1 bg-card border border-border p-3.5 rounded-2xl flex flex-col justify-center gap-2 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
              <span>{t("profile.trust_score", "Trust Score")}</span>
              <span className="text-primary font-bold">{trustScore}%</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${trustScore}%` }} />
            </div>
          </div>
        </div>

        {/* Stateful Navigation Tab Bar */}
        <div className="mt-8 border-b border-border flex items-center gap-5 sm:gap-8 overflow-x-auto no-scrollbar scroll-smooth">
          <TabButton id="about" label={t("profile.tab_about", "About")} icon={Users} active={activeTab === "about"} onClick={() => setActiveTab("about")} />
          <TabButton id="trips" label={t("nav.trips", "Trips")} icon={Compass} active={activeTab === "trips"} onClick={() => setActiveTab("trips")} />
          <TabButton id="reviews" label={t("profile.reviews", "Reviews")} icon={Star} active={activeTab === "reviews"} onClick={() => setActiveTab("reviews")} />
          <TabButton id="photos" label={t("profile.tab_photos", "Photos")} icon={Image} active={activeTab === "photos"} onClick={() => setActiveTab("photos")} />
        </div>

        {/* Tab Content Display Area */}
        <div className="mt-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
          >
            {activeTab === "about" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                  {/* Bio/About */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="font-heading text-base font-bold flex items-center gap-2">
                      <Sparkles className="h-4.5 w-4.5 text-primary" /> {t("profile.about_me", "About Me")}
                    </h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                      {profile.bio || "Software Developer | Trekking Enthusiast. Passionate about exploring beautiful landscapes, mountain trails, and historical places worldwide. Always open to meeting new travelers, planning exciting group trips, and sharing adventure stories!"}
                    </p>
                  </div>

                  {/* Interests Section */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="font-heading text-base font-bold flex items-center gap-2">
                      <Heart className="h-4.5 w-4.5 text-primary" /> {t("profile.my_interests", "My Interests")}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests && profile.interests.length > 0 ? (
                        profile.interests.map(interest => (
                          <Badge key={interest} variant="secondary" className="rounded-full px-3 py-1 font-medium text-xs">
                            {interest}
                          </Badge>
                        ))
                      ) : (
                        ["Trekking", "Photography", "Camping", "Backpacking", "Culture", "Beaches"].map(interest => (
                          <Badge key={interest} variant="secondary" className="rounded-full px-3 py-1 font-medium text-xs bg-secondary hover:bg-secondary/80 text-secondary-foreground">
                            {interest}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Languages spoken */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="font-heading text-base font-bold flex items-center gap-2">
                      <Globe className="h-4.5 w-4.5 text-primary" /> {t("profile.languages_spoken", "Languages Spoken")}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.languages && profile.languages.length > 0 ? (
                        profile.languages.map(l => (
                          <Badge key={l} variant="outline" className="rounded-full px-3 py-1 text-xs border-primary/20 text-primary bg-primary/5">
                            {l}
                          </Badge>
                        ))
                      ) : (
                        ["English", "Hindi", "Telugu"].map(l => (
                          <Badge key={l} variant="outline" className="rounded-full px-3 py-1 text-xs border-primary/20 text-primary bg-primary/5">
                            {l}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Availability Toggle */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center justify-between">
                    <div className="space-y-1 bg-transparent">
                      <h3 className="font-heading text-sm font-bold">{t("profile.travel_availability", "Travel Availability")}</h3>
                      <p className="text-xs text-muted-foreground">
                        {profile.is_available ? t("profile.active_looking", "Active & looking for companions") : t("profile.inactive_looking", "Not looking for trips right now")}
                      </p>
                    </div>
                    {isOwnProfile ? (
                      <Switch
                        checked={!!profile.is_available}
                        disabled={availabilityBusy}
                        onCheckedChange={toggleAvailability}
                      />
                    ) : (
                      <Badge className={profile.is_available ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/30 gap-1 rounded-full text-xs font-semibold" : "bg-neutral-100 text-neutral-600 border border-neutral-200 rounded-full text-xs font-semibold"}>
                        {profile.is_available ? t("profile.available", "Available") : t("profile.away", "Away")}
                      </Badge>
                    )}
                  </div>

                  {/* Travel Preferences */}
                  <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="font-heading text-base font-bold flex items-center gap-2">
                      <Compass className="h-4.5 w-4.5 text-primary" /> {t("profile.preferences", "Preferences")}
                    </h3>
                    <div className="space-y-3">
                      <PrefBlock icon={Wallet} label={t("profile.budget_style", "Budget style")} value={profile.budget_preference || "Standard"} />
                      <PrefBlock icon={Compass} label={t("profile.preferred_travel_style", "Preferred travel style")} value={profile.travel_style || "Weekend Traveler"} />
                      <PrefBlock icon={Users} label={t("profile.ideal_group_size", "Ideal group size")} value={profile.preferred_group_size || "2-3 travelers"} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "trips" && (
              <div className="space-y-6">
                {/* Planning Goa / Custom Banner */}
                <div className="bg-gradient-sunset text-white p-5 sm:p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-white/90">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      {t("profile.active_travel_plan", "Active Travel Plan")}
                    </div>
                    <h3 className="font-heading text-xl font-black mt-1">{t("profile.planning_headline", "Planning Next Beautiful Expedition")}</h3>
                    <p className="text-xs text-white/80 mt-1 max-w-md leading-relaxed">
                      Currently seeking matching travel companions who are interested in exploring beaches, culture, and mountain landscapes together!
                    </p>
                  </div>
                  <Badge className="bg-white text-neutral-900 border-none font-bold px-4 py-1.5 rounded-full text-xs self-start sm:self-center shadow-md">
                    {t("profile.open_to_invites", "🟢 Open to invites")}
                  </Badge>
                </div>

                {/* Upcoming and Current */}
                {currentTrips.length > 0 && (
                  <TripList
                    title={t("profile.active_trips", "Active Trips")}
                    trips={currentTrips}
                    formatRange={formatRange}
                    actionLabel="Mark completed"
                    onAction={markTripCompleted}
                  />
                )}

                {upcomingTrips.length > 0 ? (
                  <TripList title={t("profile.upcoming_trips", "Upcoming Trips")} trips={upcomingTrips} formatRange={formatRange} />
                ) : (
                  currentTrips.length === 0 && (
                    <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-2 shadow-sm">
                      <Compass className="h-10 w-10 text-muted-foreground mx-auto opacity-60" />
                      <h4 className="font-heading text-sm font-bold">{t("profile.no_upcoming_trips", "No Upcoming Trips Planned")}</h4>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        Explore matching travelers and create trips to make your next journey beautiful and memorable!
                      </p>
                    </div>
                  )
                )}

                {/* Past Trips */}
                <div className="space-y-3">
                  <h4 className="font-heading text-sm font-bold text-neutral-800 dark:text-neutral-200">{t("profile.completed_adventures", "Completed Adventures")}</h4>
                  {pastTrips.length === 0 ? (
                    <p className="text-xs text-muted-foreground rounded-2xl bg-card border border-border p-4 shadow-sm">
                      {t("profile.no_completed_trips", "No completed trips logged yet. Mark active trips complete once you arrive!")}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {pastTrips.map(t => (
                        <div key={t.id} className="rounded-2xl border border-border bg-card p-3.5 shadow-sm flex items-center gap-3.5">
                          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{t.destination}</p>
                            <p className="text-xs text-muted-foreground font-medium">{formatRange(t.start_date, t.end_date)}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] border-emerald-500/20 bg-emerald-500/5 text-emerald-600">Completed</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Wishlist */}
                <div className="space-y-3">
                  <h4 className="font-heading text-sm font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Heart className="h-4.5 w-4.5 text-primary shrink-0" /> {t("profile.saved_wishlist", "Saved Travel Wishlist")}
                  </h4>
                  {wishlist.length === 0 ? (
                    <p className="text-xs text-muted-foreground rounded-2xl bg-card border border-border p-4 shadow-sm">
                      {t("profile.empty_wishlist", "Your travel wishlist is empty. Bookmark interesting group trips to save them here!")}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {wishlist.map(t => (
                        <div key={t.id} className="rounded-2xl border border-border bg-card p-3.5 shadow-sm flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                            <Heart className="h-5 w-5 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{t.destination}</p>
                            <p className="text-xs text-muted-foreground font-medium">{formatRange(t.start_date, t.end_date)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="space-y-4">
                <ReviewsSection userId={profile.user_id} canReview={false} />
              </div>
            )}

            {activeTab === "photos" && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  <PhotoCard url="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80" label="Sunset Beaches, Goa" />
                  <PhotoCard url="https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=400&q=80" label="Mountains, Himachal" />
                  <PhotoCard url="https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=400&q=80" label="Kerala Backwaters" />
                  <PhotoCard url="https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=400&q=80" label="Hampi Temples" />
                  <PhotoCard url="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80" label="Scenic Roadtrips" />
                  <PhotoCard url="https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?auto=format&fit=crop&w=400&q=80" label="Lakes & Nature" />
                  <PhotoCard url="https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=400&q=80" label="Monasteries, Ladakh" />
                  <PhotoCard url="https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=80" label="Camping Hills" />
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Verification list, language options, settings links in discrete bottom section */}
        {isOwnProfile && (
          <div className="mt-12 pt-8 border-t border-border space-y-6">
            
            {/* Admin link (only for admins) */}
            {isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                className="w-full rounded-2xl bg-gradient-primary text-primary-foreground shadow-elevated px-4 py-3.5 flex items-center gap-3 hover:opacity-90 transition-opacity"
              >
                <ShieldCheck className="h-5 w-5" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">{t("profile.admin_dashboard", "Admin Dashboard")}</p>
                  <p className="text-xs opacity-90">{t("profile.admin_subtitle", "Manage users, trips & reports")}</p>
                </div>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Language */}
              <div className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Globe className="h-4 w-4 text-primary" /> {t("profile.language_title", "Language / भाषा")}
                </div>
                <LanguageSelector />
              </div>

              {/* Menu */}
              <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden divide-y divide-border">
                {MENU_ITEMS.map(item => (
                  <button
                    key={item.label}
                    onClick={() => item.path !== "#" && navigate(item.path)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors text-left"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium flex-1">
                      {item.label === "Notifications" ? t("nav.notifications", "Notifications") :
                       item.label === "Privacy & Safety" ? t("profile.privacy_safety", "Privacy & Safety") :
                       item.label === "Settings" ? t("profile.settings", "Settings") :
                       item.label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>

            {/* Sign out */}
            <Button variant="outline" className="w-full rounded-2xl h-11 gap-2 text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground shadow-sm font-semibold" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> {t("profile.sign_out", "Sign Out")}
            </Button>
          </div>
        )}
      </div>

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
      <input
        ref={avatarFileRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarUpload}
        className="hidden"
      />
      <input
        ref={coverFileRef}
        type="file"
        accept="image/*"
        onChange={handleCoverUpload}
        className="hidden"
      />
    </div>
  );
}

function PrefBlock({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/35 border border-border/30">
      <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] text-muted-foreground font-semibold leading-none">{label}</div>
        <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-1 capitalize truncate">{value}</p>
      </div>
    </div>
  );
}

function TabButton({
  id, label, icon: Icon, active, onClick,
}: {
  id: string; label: string; icon: any; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 pb-3.5 border-b-2 text-sm font-bold transition-all relative shrink-0 cursor-pointer ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {active && (
        <motion.div
          layoutId="activeTabUnderline"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
    </button>
  );
}

function PhotoCard({ url, label }: { url: string; label: string }) {
  return (
    <div className="group rounded-2xl overflow-hidden border border-border bg-card shadow-sm hover:shadow-md transition-all relative aspect-square">
      <img
        src={url}
        alt={label}
        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex items-end p-2.5 z-10">
        <p className="text-[10px] sm:text-xs font-bold text-white drop-shadow truncate w-full">{label}</p>
      </div>
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
      <h4 className="font-heading text-sm font-bold text-neutral-800 dark:text-neutral-200">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {trips.map(t => (
          <div key={t.id} className="rounded-2xl border border-border bg-card p-3.5 shadow-sm flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{t.destination}</p>
              <p className="text-xs text-muted-foreground font-medium">{formatRange(t.start_date, t.end_date)}</p>
            </div>
            {actionLabel && onAction && (
              <Button size="sm" variant="outline" className="h-8 text-xs rounded-full border-primary/20 text-primary hover:bg-primary hover:text-white" onClick={() => onAction(t.id)}>
                {actionLabel}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
