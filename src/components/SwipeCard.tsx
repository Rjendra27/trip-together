import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { MapPin, Briefcase, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SwipeCardProps {
  name: string;
  age: number;
  avatar: string;
  bio: string;
  interests: string[];
  destination: string;
  matchPercent: number;
  onSwipe: (direction: "left" | "right") => void;
}

export default function SwipeCard({
  name,
  age,
  avatar,
  bio,
  interests,
  destination,
  matchPercent,
  onSwipe,
}: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  function handleDragEnd(_: any, info: PanInfo) {
    if (info.offset.x > 100) {
      onSwipe("right");
    } else if (info.offset.x < -100) {
      onSwipe("left");
    }
  }

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      style={{ x, rotate }}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      <div className="relative h-full w-full overflow-hidden rounded-3xl bg-card shadow-elevated">
        <img src={avatar} alt={name} className="h-3/5 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" />
        
        {/* Like / Nope overlays */}
        <motion.div
          style={{ opacity: likeOpacity }}
          className="absolute left-6 top-8 rotate-[-20deg] rounded-lg border-4 border-accent px-4 py-2"
        >
          <span className="font-heading text-2xl font-bold text-accent">LIKE</span>
        </motion.div>
        <motion.div
          style={{ opacity: nopeOpacity }}
          className="absolute right-6 top-8 rotate-[20deg] rounded-lg border-4 border-destructive px-4 py-2"
        >
          <span className="font-heading text-2xl font-bold text-destructive">NOPE</span>
        </motion.div>

        {/* Match badge */}
        <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-accent-foreground">
          <Star className="h-3.5 w-3.5 fill-current" />
          <span className="text-xs font-bold">{matchPercent}% Match</span>
        </div>

        {/* Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2">
          <div className="flex items-end gap-2">
            <h2 className="font-heading text-2xl font-bold text-primary-foreground">{name}, {age}</h2>
          </div>
          <div className="flex items-center gap-1.5 text-primary-foreground/80">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">Heading to {destination}</span>
          </div>
          <p className="text-sm text-primary-foreground/70 line-clamp-2">{bio}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {interests.map((tag) => (
              <Badge key={tag} variant="secondary" className="bg-primary-foreground/20 text-primary-foreground border-0 text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
