import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, MapPin, DollarSign, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const TRIP_TYPES = ["Adventure", "Chill", "Culture", "Trekking", "Food", "Nightlife", "Road Trip", "Beach"];

export default function CreateTripPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Trip Created!", description: "Your trip has been published." });
    navigate("/trips");
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="sticky top-0 z-30 flex items-center gap-3 bg-card/95 backdrop-blur-lg px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-heading text-lg font-semibold">Create Trip</h1>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="p-4 space-y-5"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Destination
          </label>
          <Input placeholder="e.g. Bali, Indonesia" required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Start Date
            </label>
            <Input type="date" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> End Date
            </label>
            <Input type="date" required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> Budget
            </label>
            <Input placeholder="$500 - $1000" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> People Needed
            </label>
            <Input type="number" min={1} max={20} placeholder="2" required />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Trip Type</label>
          <div className="flex flex-wrap gap-2">
            {TRIP_TYPES.map(type => (
              <Badge
                key={type}
                variant={selectedTypes.includes(type) ? "default" : "outline"}
                className="cursor-pointer transition-all"
                onClick={() => toggleType(type)}
              >
                {type}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Description
          </label>
          <Textarea placeholder="Tell us about your trip plans..." rows={4} />
        </div>

        <Button type="submit" variant="hero" className="w-full rounded-xl h-12">
          Publish Trip
        </Button>
      </motion.form>
    </div>
  );
}
