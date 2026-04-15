import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Settings, Shield, Star, Camera, Edit, LogOut, Bell, ChevronRight, Lock, Phone, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const INTERESTS = ["Trekking", "Photography", "Food", "Culture", "Beach", "Nightlife"];
const PAST_TRIPS = [
  { destination: "Nepal", date: "Mar 2024", image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=200&h=200&fit=crop" },
  { destination: "Thailand", date: "Jan 2024", image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=200&h=200&fit=crop" },
  { destination: "Iceland", date: "Sep 2023", image: "https://images.unsplash.com/photo-1520769945061-0a448c463865?w=200&h=200&fit=crop" },
];

const MENU_ITEMS = [
  { icon: Bell, label: "Notifications", path: "/notifications" },
  { icon: Shield, label: "Verification", path: "#" },
  { icon: Lock, label: "Privacy & Safety", path: "#" },
  { icon: CreditCard, label: "Premium", path: "#" },
  { icon: Settings, label: "Settings", path: "#" },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="relative">
        <div className="h-36 bg-gradient-primary" />
        <div className="px-4">
          <div className="relative -mt-16 flex items-end gap-4">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face"
                alt="Profile"
                className="h-24 w-24 rounded-2xl border-4 border-card object-cover shadow-elevated"
              />
              <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card">
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="pb-1 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-xl font-bold">{user?.user_metadata?.full_name || "Jordan Lee"}</h1>
                <Shield className="h-4 w-4 text-accent" />
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> San Francisco, CA
              </p>
            </div>
            <Button variant="outline" size="sm" className="rounded-xl gap-1">
              <Edit className="h-3 w-3" /> Edit
            </Button>
          </div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-4 mt-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Trips", value: "12" },
            { label: "Matches", value: "47" },
            { label: "Rating", value: "4.8", icon: Star },
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
          <p className="text-sm text-muted-foreground leading-relaxed">
            Adventure enthusiast and amateur photographer. Love meeting people from different cultures
            and sharing travel stories. Currently planning trips to Southeast Asia! 🌏
          </p>
        </div>

        {/* Interests */}
        <div className="space-y-2">
          <h2 className="font-heading text-sm font-semibold">Interests</h2>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map(interest => (
              <Badge key={interest} variant="secondary" className="rounded-full px-3 py-1">{interest}</Badge>
            ))}
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

        {/* Verification */}
        <div className="rounded-2xl bg-card p-4 shadow-card space-y-3">
          <h2 className="font-heading text-sm font-semibold">Verification Status</h2>
          <div className="space-y-2">
            {[
              { label: "Email verified", done: true, icon: "✉️" },
              { label: "Phone verified", done: true, icon: "📱" },
              { label: "ID verified", done: false, icon: "🪪" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between text-sm py-1">
                <span className="flex items-center gap-2">
                  <span>{item.icon}</span>
                  <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                </span>
                {item.done ? (
                  <Shield className="h-4 w-4 text-accent" />
                ) : (
                  <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg">Verify</Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Menu */}
        <div className="rounded-2xl bg-card shadow-card overflow-hidden divide-y divide-border">
          {MENU_ITEMS.map(item => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
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
    </div>
  );
}
