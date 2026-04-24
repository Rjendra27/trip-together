import { useEffect, useState } from "react";
import { Ban, Check, Eye, Flag, MessageSquareWarning, Trash2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const statusColor: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-200",
  reviewing: "bg-primary/10 text-primary border-primary/20",
  resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  dismissed: "bg-muted text-muted-foreground border-border",
};

export default function AdminReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [reportsRes, profilesRes, tripsRes, messagesRes] = await Promise.all([
      supabase.from("reports").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("user_id, display_name, is_blocked"),
      supabase.from("trips").select("id, destination, status, user_id"),
      supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (reportsRes.error) toast.error(reportsRes.error.message);
    setReports(reportsRes.data ?? []);
    setProfiles(profilesRes.data ?? []);
    setTrips(tripsRes.data ?? []);
    setMessages(messagesRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-safety-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const nameFor = (userId: string) => profiles.find((p) => p.user_id === userId)?.display_name || `${userId?.slice(0, 8)}…`;
  const tripFor = (tripId: string) => trips.find((t) => t.id === tripId);

  const updateStatus = async (id: string, status: "reviewing" | "resolved" | "dismissed") => {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Report ${status}`);
  };

  const warnUser = async (userId: string, reportId: string) => {
    const { error } = await supabase.from("notifications").insert({ user_id: userId, type: "warning", title: "Safety warning", body: "A moderator reviewed a report involving your account. Please follow TripMate community guidelines." });
    if (error) return toast.error(error.message);
    await updateStatus(reportId, "reviewing");
    toast.success("Warning sent");
  };

  const blockUser = async (userId: string, reportId: string) => {
    const { error } = await supabase.from("profiles").update({ is_blocked: true }).eq("user_id", userId);
    if (error) return toast.error(error.message);
    await supabase.from("reports").update({ status: "resolved" }).eq("id", reportId);
    toast.success("User blocked and report resolved");
  };

  const removeTrip = async (tripId: string, reportId: string) => {
    if (!confirm("Remove this reported trip?")) return;
    const { error } = await supabase.from("trips").delete().eq("id", tripId);
    if (error) return toast.error(error.message);
    await supabase.from("reports").update({ status: "resolved" }).eq("id", reportId);
    toast.success("Reported trip removed");
  };

  const flagMessage = async (message: any) => {
    const { error } = await supabase.from("messages").update({ flagged: !message.flagged, moderation_status: message.flagged ? "ok" : "flagged" } as any).eq("id", message.id);
    if (error) return toast.error(error.message);
    toast.success(message.flagged ? "Message unflagged" : "Message flagged");
  };

  return (
    <AdminLayout title="Reports & Safety">
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-3">
          {loading ? <p className="text-muted-foreground">Loading...</p> : reports.length === 0 ? <p className="text-muted-foreground">No reports filed.</p> : reports.map((r) => {
            const trip = r.reported_trip_id ? tripFor(r.reported_trip_id) : null;
            return (
              <div key={r.id} className="rounded-2xl bg-card border border-border p-5">
                <div className="flex items-start justify-between mb-3 gap-4">
                  <div>
                    <p className="font-medium text-sm">{trip ? `Trip report: ${trip.destination}` : `User report: ${nameFor(r.reported_user_id)}`}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Reason: {r.reason} · {new Date(r.created_at).toLocaleString()}</p>
                    {r.description && <p className="text-sm text-muted-foreground mt-2">{r.description}</p>}
                  </div>
                  <Badge variant="outline" className={cn("capitalize", statusColor[r.status ?? "pending"])}>{r.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "reviewing")} className="gap-1"><Eye className="h-3 w-3" /> Review</Button>
                  {r.reported_user_id && <Button size="sm" variant="outline" onClick={() => warnUser(r.reported_user_id, r.id)} className="gap-1"><Flag className="h-3 w-3" /> Warn user</Button>}
                  {r.reported_user_id && <Button size="sm" variant="outline" onClick={() => blockUser(r.reported_user_id, r.id)} className="gap-1 text-destructive border-destructive/30"><Ban className="h-3 w-3" /> Block user</Button>}
                  {trip && <Button size="sm" variant="outline" onClick={() => removeTrip(trip.id, r.id)} className="gap-1 text-destructive border-destructive/30"><Trash2 className="h-3 w-3" /> Remove content</Button>}
                  <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "dismissed")}>Dismiss</Button>
                  <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "resolved")} className="gap-1 text-emerald-600 border-emerald-200"><Check className="h-3 w-3" /> Resolve</Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl bg-card border border-border overflow-hidden h-fit">
          <div className="p-4 border-b border-border"><h2 className="font-heading font-semibold flex items-center gap-2"><MessageSquareWarning className="h-4 w-4" /> Chat moderation</h2></div>
          <Table>
            <TableHeader><TableRow><TableHead>Message</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {messages.slice(0, 12).map((m) => <TableRow key={m.id}><TableCell><p className="max-w-[220px] truncate text-sm">{m.content}</p><p className="text-xs text-muted-foreground">{nameFor(m.sender_id)} → {nameFor(m.receiver_id)}</p></TableCell><TableCell><Badge variant="outline">{m.flagged ? "Flagged" : "OK"}</Badge></TableCell><TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => flagMessage(m)}>{m.flagged ? "Clear" : "Flag"}</Button></TableCell></TableRow>)}
              {!messages.length && <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">No messages</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
