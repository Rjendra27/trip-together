import { MapPin, Calendar, Users, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface TripCardProps {
  destination: string;
  startDate: string;
  endDate: string;
  budget: string;
  spotsLeft: number;
  tripType: string;
  imageUrl: string;
  creatorName: string;
  creatorAvatar: string;
  onClick?: () => void;
}

export default function TripCard({
  destination,
  startDate,
  endDate,
  budget,
  spotsLeft,
  tripType,
  imageUrl,
  creatorName,
  creatorAvatar,
  onClick,
}: TripCardProps) {
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
        <Badge className="absolute left-3 top-3 bg-accent text-accent-foreground border-0">
          {tripType}
        </Badge>
        <div className="absolute bottom-3 left-3">
          <h3 className="font-heading text-lg font-bold text-primary-foreground">{destination}</h3>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <img src={creatorAvatar} alt={creatorName} className="h-6 w-6 rounded-full object-cover" />
          <span className="text-sm text-muted-foreground">{creatorName}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{startDate} - {endDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            <span>{budget}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>{spotsLeft} spots left</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            <span>{destination.split(",")[0]}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
