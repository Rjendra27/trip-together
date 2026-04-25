import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, MapPin, IndianRupee, Users, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const TRIP_TYPES = ["adventure", "chill", "culture", "trekking", "food", "nightlife", "beach"];

export default function CreateTripPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>("adventure");
  const [submitting, setSubmitting] = useState(false);

  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [spotsNeeded, setSpotsNeeded] = useState("2");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to create a trip.", variant: "destructive" });
      setSubmitting(false);
      navigate("/auth");
      return;
    }

    const { error } = await supabase.from("trips").insert({
      user_id: user.id,
      destination,
      start_date: startDate,
      end_date: endDate,
      budget_min: budgetMin ? parseInt(budgetMin) : 0,
      budget_max: budgetMax ? parseInt(budgetMax) : 10000,
      spots_needed: parseInt(spotsNeeded) || 1,
      trip_type: selectedType,
      description,
    });

    setSubmitting(false);

    if (error) {
      toast({ title: "Failed to create trip", description: error.message, variant: "destructive" });
      return;
    }

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
          <Input placeholder="e.g. Bali, Indonesia" required value={destination} onChange={e => setDestination(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Start Date
            </label>
            <Input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> End Date
            </label>
            <Input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-primary" /> Min (₹)
            </label>
            <Input type="number" min={0} placeholder="5000" value={budgetMin} onChange={e => setBudgetMin(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-primary" /> Max (₹)
            </label>
            <Input type="number" min={0} placeholder="50000" value={budgetMax} onChange={e => setBudgetMax(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Spots
            </label>
            <Input type="number" min={1} max={20} placeholder="2" required value={spotsNeeded} onChange={e => setSpotsNeeded(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Trip Type</label>
          <div className="flex flex-wrap gap-2">
            {TRIP_TYPES.map(type => (
              <Badge
                key={type}
                variant={selectedType === type ? "default" : "outline"}
                className="cursor-pointer transition-all capitalize"
                onClick={() => setSelectedType(type)}
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
          <Textarea placeholder="Tell us about your trip plans..." rows={4} value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <Button type="submit" variant="hero" className="w-full rounded-xl h-12" disabled={submitting}>
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Publishing...</> : "Publish Trip"}
        </Button>
      </motion.form>
    </div>
  );
}
