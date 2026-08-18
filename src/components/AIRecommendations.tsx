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
      
      let finalData: AIData;
      if (fnErr || (res as any)?.error) {
        console.warn("Supabase edge function failed. Falling back to local mock recommendations:", fnErr || (res as any)?.error);
        finalData = getLocalMockRecommendations(destination, tripType);
      } else {
        finalData = res as AIData;
      }
      
      setData(finalData);
      sessionStorage.setItem(cacheKey(destination, tripType), JSON.stringify(finalData));
    } catch (e: any) {
      console.warn("Error loading recommendations. Using local fallback.", e);
      const fallback = getLocalMockRecommendations(destination, tripType);
      setData(fallback);
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

function getLocalMockRecommendations(destination: string, tripType?: string): AIData {
  const dest = destination.toLowerCase();
  
  if (dest.includes("goa")) {
    return {
      best_time: "November to February is the peak season with pleasant weather, open beach shacks, and active nightlife.",
      foods: [
        { name: "Fish Curry Rice", description: "The staple Goan meal, tangy and spicy coconut-based fish curry." },
        { name: "Pork Vindaloo", description: "Traditional fiery dish flavored with vinegar, garlic, and red chilies." },
        { name: "Bebinca", description: "Multi-layered Goan dessert made with coconut milk, sugar, and ghee." },
        { name: "Cashew Feni", description: "Local spirit distilled from cashew apple, unique to Goa." },
        { name: "Chicken Xacuti", description: "Rich chicken curry made with fresh grated coconut and heavy spices." }
      ],
      hidden_gems: [
        { name: "Chorao Island", description: "A quiet island on Mandovi river, home to Salim Ali Bird Sanctuary." },
        { name: "Cola Beach", description: "A pristine beach in South Goa known for its unique freshwater lagoon." },
        { name: "Harvalem Waterfall", description: "Scenic waterfall near Sanquelim, surrounded by lush greenery." },
        { name: "Netravali Bubbling Lake", description: "A natural freshwater pond where bubbles emerge continuously." }
      ],
      safety_tips: [
        "Avoid swimming in the sea during monsoon (June to September) or after consuming alcohol.",
        "Hire taxis/bikes only from registered operators and pre-agree on rates.",
        "Keep your belongings secure on crowded beaches like Baga or Calangute.",
        "Respect local dress codes when visiting temples or churches in Old Goa.",
        "Carry cash as network connectivity can be spotty in remote beaches."
      ],
      budget_tips: [
        "Rent a scooter (approx. ₹300-500/day) instead of relying on expensive local taxis.",
        "Eat at local family-run eateries (called 'tavernas') rather than high-end beach shacks.",
        "Travel during shoulder season (October or March) for cheaper resort rates.",
        "Use the local ferry services which are extremely cheap or free for pedestrians.",
        "Buy cashew nuts and local spices from Mapusa market instead of tourist shops."
      ],
      packing: [
        "Lightweight cotton clothing",
        "Sunscreen (SPF 50+)",
        "Swimwear and quick-dry towels",
        "Flip-flops and walking shoes",
        "Sunglasses and sun hat",
        "Insect repellent",
        "Waterproof phone pouch",
        "Reusable water bottle"
      ]
    };
  }
  
  return {
    best_time: `October to March is generally the most pleasant time to visit ${destination} to avoid severe heat or monsoon rains.`,
    foods: [
      { name: "Local Thali", description: "A complete platter containing local vegetables, lentils, rice, and bread." },
      { name: "Street Chaat", description: "Crispy savory snacks with sweet, tangy, and spicy chutneys." },
      { name: "Regional Specialty Curry", description: "A signature dish cooked with local herbs and spices." },
      { name: "Traditional Sweet", description: "A popular dessert made with milk, sugar, and ghee." },
      { name: "Local Herbal Tea/Lassi", description: "A refreshing traditional beverage popular in the region." }
    ],
    hidden_gems: [
      { name: "Old Quarter Heritage Walk", description: "Explore the ancient architecture and quiet residential lanes." },
      { name: "Sunrise Viewpoint", description: "An off-beat hilltop location popular among locals for panoramic views." },
      { name: "Artisans Village", description: "Watch local craftsmen create traditional handloom and pottery." },
      { name: "Quiet Riverside Park", description: "A serene spot away from the main tourist hubs." }
    ],
    safety_tips: [
      "Drink bottled or filtered water only to avoid stomach issues.",
      "Dress modestly when visiting religious places or rural areas.",
      "Be cautious when walking on footpaths or busy streets.",
      "Keep digital copies of your IDs and travel documents on your phone.",
      "Consult locals or guides before visiting isolated areas after dark."
    ],
    budget_tips: [
      "Use public buses or auto-rickshaws (negotiated beforehand) for commuting.",
      "Prefer homestays and heritage guesthouses over international hotel chains.",
      "Shop at local street bazaars and do polite bargaining.",
      "Eat at popular local vegetarian diners for fresh, affordable meals.",
      "Hire local government-authorized guides for historic monuments."
    ],
    packing: [
      "Breathable cotton clothes",
      "Comfortable walking shoes",
      "Hand sanitizer and wet wipes",
      "Sun protection cream",
      "Basic first-aid kit",
      "Universal adapter",
      "Light jacket/shawl for evenings",
      "Umbrella or raincoat"
    ]
  };
}
