import { MapPin, Calendar, Users, IndianRupee, ShieldCheck, Flame, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface TripCardProps {
  destination: string;
  startDate: string;
  endDate: string;
  budget: string;
  spotsLeft: number;
  spotsTotal?: number;
  spotsFilled?: number;
  tripType: string;
  imageUrl: string;
  creatorName: string;
  creatorAvatar: string;
  verified?: boolean;
  startISO?: string;
  onClick?: () => void;
}

export default function TripCard({
  destination,
  startDate,
  endDate,
  budget,
  spotsLeft,
  spotsTotal,
  spotsFilled,
  tripType,
  imageUrl,
  creatorName,
  creatorAvatar,
  verified,
  startISO,
  onClick,
}: TripCardProps) {
  const daysUntil = startISO
    ? Math.ceil((new Date(startISO).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isUrgent = spotsLeft > 0 && spotsLeft <= 2;
  const isSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 14;
  const isFull = spotsLeft === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-2xl bg-card shadow-card transition-shadow hover:shadow-elevated"
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={imageUrl}
          alt={destination}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
        <Badge className="absolute left-3 top-3 bg-accent text-accent-foreground border-0 capitalize">
          {tripType}
        </Badge>
        <div className="absolute right-3 top-3 flex flex-col gap-1.5 items-end">
          {isFull && <Badge variant="secondary" className="border-0">Full</Badge>}
          {!isFull && isUrgent && (
            <Badge className="bg-destructive text-destructive-foreground border-0 gap-1">
              <Flame className="h-3 w-3" /> {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
            </Badge>
          )}
          {!isFull && isSoon && (
            <Badge className="bg-primary text-primary-foreground border-0 gap-1">
              <Clock className="h-3 w-3" /> {daysUntil === 0 ? "Today" : `In ${daysUntil}d`}
            </Badge>
          )}
        </div>
        <div className="absolute bottom-3 left-3">
          <h3 className="font-heading text-lg font-bold text-primary-foreground">{destination}</h3>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <img src={creatorAvatar} alt={creatorName} className="h-6 w-6 rounded-full object-cover" />
          <span className="text-sm text-muted-foreground truncate">{creatorName}</span>
          {verified && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-primary font-medium">
              <ShieldCheck className="h-3 w-3" /> Verified
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{startDate} - {endDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <IndianRupee className="h-3.5 w-3.5" />
            <span>{budget}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>
              {spotsTotal != null
                ? `${spotsFilled ?? 0}/${spotsTotal} joined`
                : `${spotsLeft} spots left`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{destination.split(",")[0]}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
