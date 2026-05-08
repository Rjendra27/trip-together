import { Calendar, Users, IndianRupee, ShieldCheck, Flame, Clock, MapPin } from "lucide-react";
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
  const city = destination.split(",")[0];

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-3xl bg-card shadow-card transition-shadow hover:shadow-elevated"
    >
      <div className="relative h-56 overflow-hidden">
        <img
          src={imageUrl}
          alt={destination}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {/* Layered gradient for legibility + warmth */}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/20 mix-blend-soft-light" />

        {/* Top row: type + urgency */}
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <Badge className="bg-primary-foreground/90 text-foreground border-0 backdrop-blur-md capitalize rounded-full font-medium shadow-card">
            {tripType}
          </Badge>
          <div className="flex flex-col gap-1.5 items-end">
            {isFull && (
              <Badge variant="secondary" className="border-0 rounded-full backdrop-blur-md">Full</Badge>
            )}
            {!isFull && isUrgent && (
              <Badge className="bg-destructive text-destructive-foreground border-0 gap-1 rounded-full shadow-card">
                <Flame className="h-3 w-3" /> {spotsLeft} left
              </Badge>
            )}
            {!isFull && isSoon && (
              <Badge className="bg-accent text-accent-foreground border-0 gap-1 rounded-full shadow-card">
                <Clock className="h-3 w-3" /> {daysUntil === 0 ? "Today" : `${daysUntil}d`}
              </Badge>
            )}
          </div>
        </div>

        {/* Bottom: destination */}
        <div className="absolute inset-x-4 bottom-3 text-primary-foreground">
          <div className="flex items-center gap-1 text-[11px] font-medium opacity-90">
            <MapPin className="h-3 w-3" /> India
          </div>
          <h3 className="font-heading text-2xl font-bold leading-tight drop-shadow-sm">{city}</h3>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Creator */}
        <div className="flex items-center gap-2">
          <img src={creatorAvatar} alt={creatorName} className="h-7 w-7 rounded-full object-cover ring-2 ring-background" />
          <span className="text-sm font-medium truncate">{creatorName}</span>
          {verified && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-primary font-semibold rounded-full bg-primary/10 px-1.5 py-0.5">
              <ShieldCheck className="h-3 w-3" /> Verified
            </span>
          )}
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Meta icon={Calendar} label={`${startDate} – ${endDate}`} />
          <Meta icon={IndianRupee} label={budget} />
          <Meta
            icon={Users}
            label={spotsTotal != null ? `${spotsFilled ?? 0}/${spotsTotal} joined` : `${spotsLeft} left`}
          />
        </div>
      </div>
    </motion.article>
  );
}

function Meta({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl bg-secondary/60 px-2 py-1.5 text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="truncate font-medium text-foreground/80">{label}</span>
    </div>
  );
}
