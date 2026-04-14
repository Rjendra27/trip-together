import { Search, SlidersHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import TripCard from "@/components/TripCard";

const FILTERS = ["All", "Adventure", "Chill", "Culture", "Trekking", "Food", "Beach"];

const ALL_TRIPS = [
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
    destination: "Machu Picchu, Peru",
    startDate: "Sep 1",
    endDate: "Sep 10",
    budget: "$1000-1500",
    spotsLeft: 5,
    tripType: "Trekking",
    imageUrl: "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=600&h=400&fit=crop",
    creatorName: "Ana P.",
    creatorAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
  },
  {
    destination: "Bangkok, Thailand",
    startDate: "Oct 5",
    endDate: "Oct 12",
    budget: "$500-800",
    spotsLeft: 4,
    tripType: "Food",
    imageUrl: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=600&h=400&fit=crop",
    creatorName: "Tom W.",
    creatorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
  },
];

export default function TripsPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filteredTrips = ALL_TRIPS.filter(trip => {
    const matchesFilter = activeFilter === "All" || trip.tripType === activeFilter;
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
              className="cursor-pointer whitespace-nowrap rounded-full px-3 py-1 transition-all shrink-0"
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </Badge>
          ))}
        </div>
      </div>

      <div className="p-4 grid gap-4">
        {filteredTrips.map((trip, i) => (
          <TripCard key={i} {...trip} />
        ))}
        {filteredTrips.length === 0 && (
          <div className="text-center text-muted-foreground py-16">
            <p>No trips found</p>
          </div>
        )}
      </div>
    </div>
  );
}
