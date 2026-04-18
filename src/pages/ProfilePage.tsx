import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { MapPin, Settings, Shield, Star, Edit, LogOut, Bell, ChevronRight, Lock, CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ReviewsSection from "@/components/ReviewsSection";
import EditProfileDialog from "@/components/EditProfileDialog";
import PhoneVerificationDialog from "@/components/PhoneVerificationDialog";
import { toast } from "sonner";

const PAST_TRIPS = [
  { destination: "Nepal", date: "Mar 2024", image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=200&h=200&fit=crop" },
  { destination: "Thailand", date: "Jan 2024", image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=200&h=200&fit=crop" },
  { destination: "Iceland", date: "Sep 2023", image: "https://images.unsplash.com/photo-1520769945061-0a448c463865?w=200&h=200&fit=crop" },
];

const MENU_ITEMS = [
  { icon: Bell, label: "Notifications", path: "/notifications" },
  { icon: Lock, label: "Privacy & Safety", path: "#" },
  { icon: CreditCard, label: "Premium", path: "#" },
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
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, bio, location, age, interests, avatar_url, phone_number, phone_verified, id_verified, verification_badge")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      toast.error("Failed to load profile");
    } else {
      setProfile(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isVerified = !!(profile.phone_verified || profile.verification_badge);

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
            </div>
            <Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => setEditOpen(true)}>
              <Edit className="h-3 w-3" /> Edit
            </Button>
          </div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-4 mt-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Trips", value: "0" },
            { label: "Matches", value: "0" },
            { label: "Rating", value: "—", icon: Star },
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl bg-card p-3 text-center shadow-card">
              <div className="flex items-center justify-center gap-1">
                <span className="font-heading text-xl font-bold">{stat.value}</span>
                {stat.icon && <stat.icon className="h-4 w-4 text-accent fill-accent" />}
              </div>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
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

        {/* Past trips */}
        <div className="space-y-3">
          <h2 className="font-heading text-sm font-semibold">Past Trips</h2>
          <div className="grid grid-cols-3 gap-2">
            {PAST_TRIPS.map(trip => (
              <div key={trip.destination} className="relative overflow-hidden rounded-xl">
                <img src={trip.image} alt={trip.destination} className="h-28 w-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                <div className="absolute bottom-2 left-2">
                  <p className="text-xs font-semibold text-primary-foreground">{trip.destination}</p>
                  <p className="text-[10px] text-primary-foreground/70">{trip.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <ReviewsSection userId={profile.user_id} canReview={false} />

        {/* Verification */}
        <div className="rounded-2xl bg-card p-4 shadow-card space-y-3">
          <h2 className="font-heading text-sm font-semibold">Verification Status</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm py-1">
              <span className="flex items-center gap-2">
                <span>✉️</span>
                <span className="text-foreground">Email verified</span>
              </span>
              <Shield className="h-4 w-4 text-accent" />
            </div>
            <div className="flex items-center justify-between text-sm py-1">
              <span className="flex items-center gap-2">
                <span>📱</span>
                <span className={profile.phone_verified ? "text-foreground" : "text-muted-foreground"}>
                  {profile.phone_verified ? `Phone verified (${profile.phone_number})` : "Phone verified"}
                </span>
              </span>
              {profile.phone_verified ? (
                <Shield className="h-4 w-4 text-accent" />
              ) : (
                <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" onClick={() => setPhoneOpen(true)}>
                  Verify
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between text-sm py-1">
              <span className="flex items-center gap-2">
                <span>🪪</span>
                <span className={profile.id_verified ? "text-foreground" : "text-muted-foreground"}>ID verified</span>
              </span>
              {profile.id_verified ? (
                <Shield className="h-4 w-4 text-accent" />
              ) : (
                <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg" disabled>
                  Soon
                </Button>
              )}
            </div>
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
        profile={profile}
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
