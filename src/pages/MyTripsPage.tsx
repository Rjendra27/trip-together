import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Bookmark, Plus, Loader2, Plane, Trash2, Copy, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { imageForDestination } from "@/lib/destinations";
import { toast } from "sonner";

interface Trip {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget_min: number | null;
  budget_max: number | null;
  trip_type: string | null;
  spots_needed: number | null;
  spots_filled: number | null;
  user_id: string;
  description: string | null;
}

const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function MyTripsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mine, setMine] = useState<Trip[]>([]);
  const [saved, setSaved] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: m }, { data: bm }] = await Promise.all([
      supabase.from("trips").select("*").eq("user_id", user.id).order("start_date", { ascending: false }),
      supabase.from("bookmarks").select("trip_id").eq("user_id", user.id),
    ]);
    setMine((m || []) as Trip[]);
    const ids = (bm || []).map((b: any) => b.trip_id);
    if (ids.length) {
      const { data: trips } = await supabase.from("trips").select("*").in("id", ids).order("start_date", { ascending: false });
      setSaved((trips || []) as Trip[]);
    } else {
      setSaved([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    fetchAll();
  }, [authLoading, user, navigate, fetchAll]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this trip?")) return;
    const { error } = await supabase.from("trips").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Trip deleted");
    fetchAll();
  };

  const handleDuplicate = async (t: Trip) => {
    if (!user) return;
    const { error } = await supabase.from("trips").insert({
      user_id: user.id,
      destination: t.destination,
      start_date: t.start_date,
      end_date: t.end_date,
      budget_min: t.budget_min ?? 0,
      budget_max: t.budget_max ?? 10000,
      spots_needed: t.spots_needed ?? 2,
      trip_type: t.trip_type ?? "adventure",
      description: t.description ?? "",
    });
    if (error) return toast.error(error.message);
    toast.success("Trip duplicated");
    fetchAll();
  };

  const handleUnsave = async (tripId: string) => {
    if (!user) return;
    await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("trip_id", tripId);
    toast.success("Removed from saved");
    fetchAll();
  };

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-lg px-4 py-3 border-b border-border flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-heading text-lg font-semibold flex-1">My Trips</h1>
        <Button variant="gradient" size="sm" className="rounded-xl" onClick={() => navigate("/trips/create")}>
          <Plus className="h-4 w-4 mr-1" /> New
        </Button>
      </div>

      <div className="p-4">
        <Tabs defaultValue="mine">
          <TabsList className="grid grid-cols-2 w-full rounded-xl">
            <TabsTrigger value="mine" className="rounded-lg">Created ({mine.length})</TabsTrigger>
            <TabsTrigger value="saved" className="rounded-lg">Saved ({saved.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="mine" className="mt-4">
            {loading ? (
              <Loading />
            ) : mine.length === 0 ? (
              <Empty
                icon={Plane}
                title="No trips planned yet"
                hint="Plan your first trip and find buddies who match your vibe."
                cta="Create your first trip"
                onClick={() => navigate("/trips/create")}
              />
            ) : (
              <div className="grid gap-3">
                {mine.map((t) => (
                  <MiniTripCard
                    key={t.id}
                    trip={t}
                    onOpen={() => navigate(`/trips/${t.id}`)}
                    actions={
                      <>
                        <IconBtn label="Edit" onClick={() => navigate(`/trips/create?edit=${t.id}`)}><Pencil className="h-4 w-4" /></IconBtn>
                        <IconBtn label="Duplicate" onClick={() => handleDuplicate(t)}><Copy className="h-4 w-4" /></IconBtn>
                        <IconBtn label="Delete" onClick={() => handleDelete(t.id)} destructive><Trash2 className="h-4 w-4" /></IconBtn>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved" className="mt-4">
            {loading ? (
              <Loading />
            ) : saved.length === 0 ? (
              <Empty
                icon={Bookmark}
                title="Nothing saved yet"
                hint="Bookmark trips from Explore to revisit them later."
                cta="Explore trips"
                onClick={() => navigate("/trips")}
              />
            ) : (
              <div className="grid gap-3">
                {saved.map((t) => (
                  <MiniTripCard
                    key={t.id}
                    trip={t}
                    onOpen={() => navigate(`/trips/${t.id}`)}
                    actions={
                      <>
                        <IconBtn label="Duplicate" onClick={() => handleDuplicate(t)}><Copy className="h-4 w-4" /></IconBtn>
                        <IconBtn label="Unsave" onClick={() => handleUnsave(t.id)} destructive><Bookmark className="h-4 w-4" /></IconBtn>
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function MiniTripCard({ trip, onOpen, actions }: { trip: Trip; onOpen: () => void; actions: React.ReactNode }) {
  const budget = trip.budget_min != null && trip.budget_max != null
    ? `₹${trip.budget_min.toLocaleString("en-IN")}–${trip.budget_max.toLocaleString("en-IN")}`
    : "Flexible";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl bg-card shadow-card border border-border/40"
    >
      <button onClick={onOpen} className="w-full text-left">
        <div className="flex">
          <div className="relative w-28 h-28 shrink-0">
            <img src={imageForDestination(trip.destination)} alt={trip.destination} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/80" />
          </div>
          <div className="flex-1 p-3 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-heading font-semibold truncate">{trip.destination.split(",")[0]}</h3>
              {trip.trip_type && (
                <Badge variant="outline" className="text-[10px] capitalize shrink-0 rounded-full">{trip.trip_type}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{fmt(trip.start_date)} – {fmt(trip.end_date)}</p>
            <p className="text-xs font-medium text-foreground/70 mt-1">{budget}</p>
          </div>
        </div>
      </button>
      <div className="flex items-center justify-end gap-1 px-2 py-1.5 border-t border-border/50 bg-secondary/30">
        {actions}
      </div>
    </motion.div>
  );
}

function IconBtn({ children, onClick, label, destructive }: { children: React.ReactNode; onClick: () => void; label: string; destructive?: boolean }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`h-8 px-2 text-xs ${destructive ? "text-destructive hover:text-destructive" : ""}`}
      title={label}
    >
      {children}
      <span className="ml-1">{label}</span>
    </Button>
  );
}

function Empty({ icon: Icon, title, hint, cta, onClick }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16 px-6">
      <div className="h-20 w-20 mx-auto rounded-3xl bg-gradient-primary flex items-center justify-center shadow-glow mb-5">
        <Icon className="h-9 w-9 text-primary-foreground" />
      </div>
      <h3 className="font-heading text-lg font-bold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-5">{hint}</p>
      <Button variant="gradient" className="rounded-full px-6" onClick={onClick}>{cta}</Button>
    </motion.div>
  );
}

function Loading() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
