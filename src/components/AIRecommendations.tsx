import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Sun, UtensilsCrossed, Gem, Shield, IndianRupee, Backpack, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  destination: string;
  tripType?: string;
  startDate?: string;
  endDate?: string;
  budgetMin?: number;
  budgetMax?: number;
}

interface NamedItem { name: string; description: string }
interface AIData {
  best_time: string;
  foods: NamedItem[];
  hidden_gems: NamedItem[];
  safety_tips: string[];
  budget_tips: string[];
  packing: string[];
}

const cacheKey = (d: string, t?: string) => `tripmate:ai:${d.toLowerCase()}:${t || ""}`;

export default function AIRecommendations({ destination, tripType, startDate, endDate, budgetMin, budgetMax }: Props) {
  const [data, setData] = useState<AIData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (force = false) => {
    setError(null);
    setLoading(true);
    try {
      if (!force) {
        const cached = sessionStorage.getItem(cacheKey(destination, tripType));
        if (cached) {
          setData(JSON.parse(cached));
          setLoading(false);
          return;
        }
      }
      const { data: res, error: fnErr } = await supabase.functions.invoke("travel-ai", {
        body: { destination, trip_type: tripType, start_date: startDate, end_date: endDate, budget_min: budgetMin, budget_max: budgetMax },
      });
      if (fnErr) throw fnErr;
      if ((res as any)?.error) throw new Error((res as any).error);
      setData(res as AIData);
      sessionStorage.setItem(cacheKey(destination, tripType), JSON.stringify(res));
    } catch (e: any) {
      setError(e?.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (destination) load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, tripType]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
            <Sparkles className="h-4 w-4" />
          </span>
          AI Travel Guide
        </h2>
        <Button variant="ghost" size="sm" onClick={() => load(true)} disabled={loading} className="h-8">
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {loading && !data && <SkeletonGrid />}

      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {data && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-3">
          <Card icon={Sun} title="Best time to visit" tint="accent">
            <p className="text-sm text-foreground/80">{data.best_time}</p>
          </Card>

          <Card icon={UtensilsCrossed} title="Local foods to try" tint="primary">
            <ul className="space-y-2">
              {data.foods.map((f) => (
                <li key={f.name} className="text-sm">
                  <span className="font-semibold text-foreground">{f.name}</span>
                  <span className="text-muted-foreground"> — {f.description}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card icon={Gem} title="Hidden gems" tint="accent">
            <ul className="space-y-2">
              {data.hidden_gems.map((g) => (
                <li key={g.name} className="text-sm">
                  <span className="font-semibold text-foreground">{g.name}</span>
                  <span className="text-muted-foreground"> — {g.description}</span>
                </li>
              ))}
            </ul>
          </Card>

          <div className="grid sm:grid-cols-2 gap-3">
            <Card icon={Shield} title="Safety tips" tint="primary">
              <BulletList items={data.safety_tips} />
            </Card>
            <Card icon={IndianRupee} title="Budget tips" tint="accent">
              <BulletList items={data.budget_tips} />
            </Card>
          </div>

          <Card icon={Backpack} title="Packing checklist" tint="primary">
            <div className="flex flex-wrap gap-1.5">
              {data.packing.map((p) => (
                <span key={p} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground/80">
                  {p}
                </span>
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </section>
  );
}

function Card({ icon: Icon, title, tint, children }: { icon: any; title: string; tint: "primary" | "accent"; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card shadow-card p-4 border border-border/40">
      <div className="flex items-center gap-2 mb-2.5">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${tint === "primary" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="font-heading text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((s, i) => (
        <li key={i} className="text-sm text-foreground/80 flex gap-2">
          <span className="text-primary mt-0.5">•</span>
          <span>{s}</span>
        </li>
      ))}
    </ul>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl bg-card p-4 border border-border/40 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ))}
    </div>
  );
}
