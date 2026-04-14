import { Search, SlidersHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TripCard from "@/components/TripCard";
import heroImage from "@/assets/hero-travel.jpg";

const SAMPLE_TRIPS = [
  {
    destination: "Bali, Indonesia",
    startDate: "Jun 15",
    endDate: "Jun 22",
    budget: "$800-1200",
    spotsLeft: 2,
    tripType: "Adventure",
    imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&h=400&fit=crop",
    creatorName: "Alex M.",
    creatorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
  },
  {
    destination: "Santorini, Greece",
    startDate: "Jul 1",
    endDate: "Jul 8",
    budget: "$1500-2000",
    spotsLeft: 1,
    tripType: "Chill",
    imageUrl: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=600&h=400&fit=crop",
    creatorName: "Sarah K.",
    creatorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
  },
  {
    destination: "Tokyo, Japan",
    startDate: "Aug 10",
    endDate: "Aug 20",
    budget: "$2000-3000",
    spotsLeft: 3,
    tripType: "Culture",
    imageUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&h=400&fit=crop",
    creatorName: "Mike R.",
    creatorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
  },
  {
    destination: "Patagonia, Argentina",
    startDate: "Sep 5",
    endDate: "Sep 15",
    budget: "$1200-1800",
    spotsLeft: 4,
    tripType: "Trekking",
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=400&fit=crop",
    creatorName: "Luna T.",
    creatorAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen pb-24">
      {/* Hero */}
      <div className="relative h-64 overflow-hidden">
        <img src={heroImage} alt="Travel" className="h-full w-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/40 to-foreground/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-heading text-3xl font-bold text-primary-foreground mb-2"
          >
            Find Your Travel Buddy
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-primary-foreground/80 text-sm max-w-xs"
          >
            Connect with travelers heading to the same destination
          </motion.p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 -mt-6 relative z-10">
        <div className="flex gap-2 items-center bg-card rounded-2xl shadow-elevated p-2">
          <Search className="h-4 w-4 text-muted-foreground ml-2" />
          <Input
            placeholder="Search destinations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 bg-transparent focus-visible:ring-0 text-sm"
          />
          <Button size="icon" variant="ghost" className="shrink-0">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold">Trending Trips</h2>
          <Button variant="ghost" size="sm" className="text-primary text-xs">See all</Button>
        </div>
        <div className="grid gap-4">
          {SAMPLE_TRIPS.filter(t => 
            t.destination.toLowerCase().includes(search.toLowerCase())
          ).map((trip, i) => (
            <TripCard key={i} {...trip} />
          ))}
        </div>
      </div>

      {/* FAB */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        className="fixed bottom-24 right-4 z-40"
      >
        <Button
          variant="gradient"
          size="icon"
          className="h-14 w-14 rounded-full"
          onClick={() => navigate("/trips/create")}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </motion.div>
    </div>
  );
}
