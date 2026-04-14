import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import SwipeCard from "@/components/SwipeCard";
import { useToast } from "@/hooks/use-toast";

const SAMPLE_MATCHES = [
  {
    name: "Emma",
    age: 26,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=800&fit=crop&crop=face",
    bio: "Adventure seeker & food lover. Always planning the next trip!",
    interests: ["Trekking", "Food", "Photography"],
    destination: "Bali",
    matchPercent: 92,
  },
  {
    name: "James",
    age: 28,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=800&fit=crop&crop=face",
    bio: "Digital nomad exploring Southeast Asia. Love meeting new people.",
    interests: ["Culture", "Nightlife", "Beach"],
    destination: "Thailand",
    matchPercent: 87,
  },
  {
    name: "Mia",
    age: 24,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=600&h=800&fit=crop&crop=face",
    bio: "Budget traveler with a passion for local experiences and hidden gems.",
    interests: ["Budget", "Adventure", "Local Food"],
    destination: "Bali",
    matchPercent: 85,
  },
  {
    name: "Carlos",
    age: 30,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=800&fit=crop&crop=face",
    bio: "Photographer and solo traveler. Looking for companions for my next adventure.",
    interests: ["Photography", "Trekking", "Road Trip"],
    destination: "Patagonia",
    matchPercent: 78,
  },
];

export default function MatchesPage() {
  const [cards, setCards] = useState(SAMPLE_MATCHES);
  const { toast } = useToast();

  const handleSwipe = useCallback((direction: "left" | "right") => {
    const current = cards[cards.length - 1];
    if (direction === "right") {
      toast({
        title: "It's a match! 🎉",
        description: `You and ${current.name} are both heading to ${current.destination}!`,
      });
    }
    setCards(prev => prev.slice(0, -1));
  }, [cards, toast]);

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-lg px-4 py-3 border-b border-border">
        <h1 className="font-heading text-lg font-semibold text-center">Find Travel Mates</h1>
      </div>

      <div className="relative mx-4 mt-4" style={{ height: "65vh" }}>
        <AnimatePresence>
          {cards.length > 0 ? (
            cards.map((card, i) => (
              i >= cards.length - 2 && (
                <SwipeCard key={card.name} {...card} onSwipe={handleSwipe} />
              )
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-full flex-col items-center justify-center text-center"
            >
              <p className="text-muted-foreground text-lg mb-4">No more travelers nearby</p>
              <Button variant="outline" onClick={() => setCards(SAMPLE_MATCHES)}>
                <RotateCcw className="h-4 w-4 mr-2" /> Refresh
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {cards.length > 0 && (
        <div className="flex items-center justify-center gap-6 mt-6">
          <Button
            variant="outline"
            size="icon"
            className="h-14 w-14 rounded-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => handleSwipe("left")}
          >
            <X className="h-6 w-6" />
          </Button>
          <Button
            variant="gradient"
            size="icon"
            className="h-16 w-16 rounded-full"
            onClick={() => handleSwipe("right")}
          >
            <Heart className="h-7 w-7" />
          </Button>
        </div>
      )}
    </div>
  );
}
