import { useEffect, useState } from "react";
import { Check, Ban, Eye } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusColor: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-200",
  reviewing: "bg-primary/10 text-primary border-primary/20",
  resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  dismissed: "bg-muted text-muted-foreground border-border",
};

export default function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    setReports(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: "reviewing" | "resolved" | "dismissed") => {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Report ${status}`);
    load();
  };

  const banUser = async (userId: string, reportId: string) => {
    const { error } = await supabase.from("profiles").update({ is_blocked: true }).eq("user_id", userId);
    if (error) return toast.error(error.message);
    await supabase.from("reports").update({ status: "resolved" }).eq("id", reportId);
    toast.success("User blocked & report resolved");
    load();
  };

  return (
    <AdminLayout title="Reports">
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : reports.length === 0 ? (
        <p className="text-muted-foreground">No reports filed.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-2xl bg-card border border-border p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-sm">Reason: {r.reason}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Reported user: <span className="font-mono">{r.reported_user_id.slice(0, 8)}…</span> · {new Date(r.created_at).toLocaleString()}
                  </p>
                  {r.description && <p className="text-sm text-muted-foreground mt-2">{r.description}</p>}
                </div>
                <Badge variant="outline" className={cn("capitalize", statusColor[r.status ?? "pending"])}>{r.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "reviewing")} className="gap-1">
                  <Eye className="h-3 w-3" /> Review
                </Button>
                <Button size="sm" variant="outline" onClick={() => banUser(r.reported_user_id, r.id)} className="gap-1 text-destructive border-destructive/30">
                  <Ban className="h-3 w-3" /> Block user
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "dismissed")} className="gap-1">
                  Dismiss
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "resolved")} className="gap-1 text-emerald-600 border-emerald-200">
                  <Check className="h-3 w-3" /> Resolve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
