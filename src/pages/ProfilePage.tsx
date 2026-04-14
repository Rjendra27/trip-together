import { motion } from "framer-motion";
import { MapPin, Settings, Shield, Star, Camera, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const INTERESTS = ["Trekking", "Photography", "Food", "Culture", "Beach", "Nightlife"];
const PAST_TRIPS = [
  { destination: "Nepal", date: "Mar 2024", image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=200&h=200&fit=crop" },
  { destination: "Thailand", date: "Jan 2024", image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=200&h=200&fit=crop" },
  { destination: "Iceland", date: "Sep 2023", image: "https://images.unsplash.com/photo-1520769945061-0a448c463865?w=200&h=200&fit=crop" },
];

export default function ProfilePage() {
  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Header */}
      <div className="relative">
        <div className="h-32 bg-gradient-primary" />
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
                <h1 className="font-heading text-xl font-bold">Jordan Lee</h1>
                <Shield className="h-4 w-4 text-accent" />
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> San Francisco, CA
              </p>
            </div>
            <Button variant="outline" size="icon" className="rounded-xl">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 mt-6 space-y-6"
      >
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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold">About</h2>
            <Button variant="ghost" size="sm">
              <Edit className="h-3 w-3 mr-1" /> Edit
            </Button>
          </div>
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
              <Badge key={interest} variant="secondary" className="rounded-full px-3 py-1">
                {interest}
              </Badge>
            ))}
          </div>
        </div>

        {/* Travel style */}
        <div className="space-y-2">
          <h2 className="font-heading text-sm font-semibold">Travel Style</h2>
          <div className="flex gap-2">
            <Badge className="bg-accent text-accent-foreground border-0 rounded-full px-3 py-1">Standard</Badge>
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
          <h2 className="font-heading text-sm font-semibold">Verification</h2>
          <div className="space-y-2">
            {[
              { label: "Email verified", done: true },
              { label: "Phone verified", done: true },
              { label: "ID verified", done: false },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                {item.done ? (
                  <Shield className="h-4 w-4 text-accent" />
                ) : (
                  <Button variant="outline" size="sm" className="h-7 text-xs">Verify</Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
