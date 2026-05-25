import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Calendar, MapPin, IndianRupee, Users, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { POPULAR_DESTINATIONS, imageForDestination } from "@/lib/destinations";

const TRIP_TYPES = ["adventure", "beach", "trekking", "festival", "temple", "weekend", "food", "culture", "nightlife", "budget"];

export default function CreateTripPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [selectedType, setSelectedType] = useState<string>("adventure");
  const [submitting, setSubmitting] = useState(false);

  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [spotsNeeded, setSpotsNeeded] = useState("2");
  const [description, setDescription] = useState("");

  const editId = params.get("edit");

  useEffect(() => {
    const d = params.get("destination");
    if (d && !editId) setDestination(d);
  }, [params, editId]);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      const { data, error } = await supabase.from("trips").select("*").eq("id", editId).maybeSingle();
      if (error || !data) {
        toast({ title: "Error", description: "Trip not found or failed to load.", variant: "destructive" });
        navigate("/my-trips");
        return;
      }
      setDestination(data.destination);
      setStartDate(data.start_date);
      setEndDate(data.end_date);
      setBudgetMin(data.budget_min?.toString() || "");
      setBudgetMax(data.budget_max?.toString() || "");
      setSpotsNeeded(data.spots_needed?.toString() || "2");
      setSelectedType(data.trip_type || "adventure");
      setDescription(data.description || "");
    })();
  }, [editId, navigate, toast]);

  const previewImage = destination ? imageForDestination(destination) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in.", variant: "destructive" });
      setSubmitting(false);
      navigate("/auth");
      return;
    }

    if (editId) {
      const { error } = await supabase
        .from("trips")
        .update({
          destination,
          start_date: startDate,
          end_date: endDate,
          budget_min: budgetMin ? parseInt(budgetMin) : 0,
          budget_max: budgetMax ? parseInt(budgetMax) : 10000,
          spots_needed: parseInt(spotsNeeded) || 1,
          trip_type: selectedType,
          description,
        })
        .eq("id", editId);

      setSubmitting(false);

      if (error) {
        toast({ title: "Failed to update trip", description: error.message, variant: "destructive" });
        return;
      }

      toast({ title: "Trip Updated!", description: "Your changes have been saved." });
      navigate("/my-trips");
    } else {
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
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      <div className="sticky top-0 z-30 flex items-center gap-3 bg-card/95 backdrop-blur-lg px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-heading text-lg font-semibold">{editId ? "Edit Trip" : t("trip.create")}</h1>
      </div>

      {previewImage && (
        <div className="relative h-40 overflow-hidden">
          <img src={previewImage} alt={destination} className="h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <p className="text-primary-foreground font-heading text-xl font-semibold drop-shadow">{destination}</p>
          </div>
        </div>
      )}

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="p-4 space-y-5"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> {t("trip.destination")}
          </label>
          <Input
            placeholder={t("trip.destination_placeholder")}
            required
            value={destination}
            onChange={e => setDestination(e.target.value)}
            list="popular-destinations"
          />
          <datalist id="popular-destinations">
            {POPULAR_DESTINATIONS.map(d => <option key={d.name} value={d.name} />)}
          </datalist>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {POPULAR_DESTINATIONS.slice(0, 8).map(d => (
              <Badge
                key={d.name}
                variant={destination === d.name ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setDestination(d.name)}
              >
                {d.emoji} {d.name}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> {t("trip.start_date")}
            </label>
            <Input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> {t("trip.end_date")}
            </label>
            <Input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-primary" /> {t("trip.min")}
            </label>
            <Input type="number" min={0} placeholder="5000" value={budgetMin} onChange={e => setBudgetMin(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-primary" /> {t("trip.max")}
            </label>
            <Input type="number" min={0} placeholder="50000" value={budgetMax} onChange={e => setBudgetMax(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> {t("trip.spots")}
            </label>
            <Input type="number" min={1} max={20} placeholder="2" required value={spotsNeeded} onChange={e => setSpotsNeeded(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t("trip.trip_type")}</label>
          <div className="flex flex-wrap gap-2">
            {TRIP_TYPES.map(type => (
              <Badge
                key={type}
                variant={selectedType === type ? "default" : "outline"}
                className="cursor-pointer transition-all capitalize"
                onClick={() => setSelectedType(type)}
              >
                {t(`categories.${type}`, type)}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> {t("trip.description")}
          </label>
          <Textarea placeholder={t("trip.description_placeholder")} rows={4} value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <Button type="submit" variant="hero" className="w-full rounded-xl h-12" disabled={submitting}>
          {submitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {editId ? "Saving..." : t("trip.publishing")}</>
          ) : (
            editId ? "Save Changes" : t("trip.publish")
          )}
        </Button>
      </motion.form>
    </div>
  );
}
