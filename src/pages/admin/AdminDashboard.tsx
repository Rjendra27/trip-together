import { useEffect, useState } from "react";
import { Activity, Flag, MessageSquare, Plane, Shield, Users } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Stats {
  totalUsers: number;
  totalTrips: number;
  activeTrips: number;
  totalMatches: number;
  openReports: number;
  totalMessages: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentReports, setRecentReports] = useState<any[]>([]);

  const load = async () => {
    const [u, t, ta, m, r, msg, rr] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("trips").select("id", { count: "exact", head: true }),
      supabase.from("trips").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("matches").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(5),
    ]);
    setStats({ totalUsers: u.count ?? 0, totalTrips: t.count ?? 0, activeTrips: ta.count ?? 0, totalMatches: m.count ?? 0, openReports: r.count ?? 0, totalMessages: msg.count ?? 0 });
    setRecentReports(rr.data ?? []);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "trips" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const cards = [
    { label: "Total Users", value: stats?.totalUsers, icon: Users, color: "text-primary bg-primary/10" },
    { label: "Total Trips", value: stats?.totalTrips, icon: Plane, color: "text-accent bg-accent/10" },
    { label: "Active Trips", value: stats?.activeTrips, icon: Activity, color: "text-emerald-600 bg-emerald-500/10" },
    { label: "Matches", value: stats?.totalMatches, icon: Shield, color: "text-violet-600 bg-violet-500/10" },
    { label: "Open Reports", value: stats?.openReports, icon: Flag, color: "text-destructive bg-destructive/10" },
    { label: "Messages", value: stats?.totalMessages, icon: MessageSquare, color: "text-amber-600 bg-amber-500/10" },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {cards.map((c) => <div key={c.label} className="rounded-2xl bg-card border border-border p-5 shadow-sm"><div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-3", c.color)}><c.icon className="h-5 w-5" /></div><p className="font-heading text-3xl font-bold">{c.value ?? "—"}</p><p className="text-sm text-muted-foreground">{c.label}</p></div>)}
      </div>
      <div className="rounded-2xl bg-card border border-border p-5">
        <h3 className="font-heading text-sm font-semibold mb-3">Recent Reports</h3>
        {recentReports.length === 0 ? <p className="text-sm text-muted-foreground">No reports yet.</p> : <div className="space-y-2">{recentReports.map((r) => <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0"><div><p className="text-sm font-medium">{r.reason}</p><p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p></div><span className="text-xs px-2 py-1 rounded-full bg-muted">{r.status}</span></div>)}</div>}
      </div>
    </AdminLayout>
  );
}
