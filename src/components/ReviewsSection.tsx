import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer?: { display_name: string | null; avatar_url: string | null };
}

interface Props {
  userId: string;
  canReview?: boolean;
}

export default function ReviewsSection({ userId, canReview = true }: Props) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSelf = user?.id === userId;

  const load = async () => {
    setLoading(true);
    const { data: rev } = await supabase
      .from("reviews")
      .select("*")
      .eq("reviewed_user_id", userId)
      .order("created_at", { ascending: false });

    const list = (rev ?? []) as Review[];
    if (list.length) {
      const ids = Array.from(new Set(list.map(r => r.reviewer_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", ids);
      const map = new Map((profs ?? []).map(p => [p.user_id, p]));
      list.forEach(r => { r.reviewer = map.get(r.reviewer_id) as Review["reviewer"]; });
    }
    setReviews(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const submit = async () => {
    if (!user) return toast({ title: "Sign in to leave a review", variant: "destructive" });
    setSubmitting(true);
    const { error } = await supabase.from("reviews").upsert(
      { reviewer_id: user.id, reviewed_user_id: userId, rating, comment: comment.trim() || null },
      { onConflict: "reviewer_id,reviewed_user_id,trip_id" }
    );
    setSubmitting(false);
    if (error) return toast({ title: "Could not save review", description: error.message, variant: "destructive" });
    toast({ title: "Review posted", description: "Thanks for sharing your experience!" });
    setShowForm(false);
    setComment("");
    setRating(5);
    load();
  };

  return (
    <div className="rounded-2xl bg-card p-4 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-sm font-semibold">Reviews</h2>
          <div className="flex items-center gap-1 mt-0.5">
            <Star className="h-4 w-4 fill-accent text-accent" />
            <span className="text-sm font-semibold">{avg.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({reviews.length})</span>
          </div>
        </div>
        {canReview && !isSelf && user && (
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setShowForm(s => !s)}>
            {showForm ? "Cancel" : "Write review"}
          </Button>
        )}
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3 border-t border-border pt-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className="p-1"
              >
                <Star className={cn("h-6 w-6 transition-colors", (hover || rating) >= n ? "fill-accent text-accent" : "text-muted-foreground")} />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Share your travel experience with this person..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            className="rounded-xl"
          />
          <Button onClick={submit} disabled={submitting} variant="gradient" className="w-full rounded-xl">
            {submitting ? "Posting..." : "Post review"}
          </Button>
        </motion.div>
      )}

      <div className="space-y-3">
        {loading && <p className="text-xs text-muted-foreground">Loading...</p>}
        {!loading && reviews.length === 0 && (
          <p className="text-xs text-muted-foreground">No reviews yet.</p>
        )}
        {reviews.map(r => (
          <div key={r.id} className="flex gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
            <img
              src={r.reviewer?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.reviewer_id}`}
              alt=""
              className="h-9 w-9 rounded-full object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold truncate">{r.reviewer?.display_name || "Traveler"}</p>
                <div className="flex items-center gap-0.5 shrink-0">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn("h-3 w-3", i < r.rating ? "fill-accent text-accent" : "text-muted-foreground/30")} />
                  ))}
                </div>
              </div>
              {r.comment && <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
